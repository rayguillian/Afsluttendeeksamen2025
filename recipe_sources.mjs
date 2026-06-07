import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const CACHE_PATH = process.env.RECIPE_SOURCE_CACHE || join(root, 'data', 'recipe_sources_cache.json');
const CACHE_TTL_MS = Number(process.env.RECIPE_SOURCE_CACHE_HOURS || 24 * 30) * 60 * 60 * 1000;
const LOOKUP_ENABLED = process.env.RECIPE_SOURCE_LOOKUP !== 'false';
const REQUEST_TIMEOUT_MS = Number(process.env.RECIPE_SOURCE_TIMEOUT_MS || 7000);

const RECIPE_DOMAINS = [
  'arla.dk',
  'valdemarsro.dk',
  'madensverden.dk',
  'spisbedre.dk',
  'mambeno.dk',
  'coop.dk',
  'nemlig.com',
  'foetex.dk',
  'bilka.dk',
  'rema1000.dk',
  'lidl.dk',
  'meny.dk',
  'opskrifter.dk',
  'alt.dk',
  'isabellas.dk',
  'saeson-web.dk',
  'meyers.dk',
  'gastromand.dk',
];

const SITEMAP_PROVIDERS = [
  {
    name: 'valdemarsro.dk',
    indexUrl: 'https://www.valdemarsro.dk/sitemap_index.xml',
    sitemapPattern: /\/post-sitemap\d*\.xml$/i,
    recipeUrlPattern: /^https:\/\/www\.valdemarsro\.dk\/[^?#]+\/?$/i,
    maxSitemaps: 4,
  },
  {
    name: 'spisbedre.dk',
    indexUrl: 'https://spisbedre.dk/sitemap.xml',
    sitemapPattern: /\/opskrifter\/sitemap\.xml/i,
    recipeUrlPattern: /^https:\/\/spisbedre\.dk\/opskrifter\/[^?#]+\/?$/i,
    maxSitemaps: 8,
  },
];

const sitemapMemory = new Map();

export async function enrichMealsWithRecipeSources(meals, preferences = {}) {
  if (!Array.isArray(meals) || !meals.length) return [];
  if (!LOOKUP_ENABLED) return meals.map((meal) => withFallbackSource(meal));

  const cache = await readCache();
  let dirty = false;
  const enriched = await Promise.all(
    meals.map(async (meal) => {
      const existing = realSources(meal.sources);
      if (existing.length) return { ...meal, sources: existing };

      const { sources, changed } = await sourcesForMeal(meal, preferences, cache);
      dirty ||= changed;
      return { ...meal, sources: sources.length ? sources : [fallbackSource(meal)] };
    }),
  );

  if (dirty) await writeCache(cache);
  return enriched;
}

async function sourcesForMeal(meal, preferences, cache) {
  const queries = searchQueries(meal, preferences);
  const now = Date.now();

  for (const query of queries) {
    const key = cacheKey(query);
    const cached = cache[key];
    if (cached && now - Number(cached.cachedAt || 0) < CACHE_TTL_MS) {
      return { sources: Array.isArray(cached.sources) ? cached.sources : [], changed: false };
    }

    const sources = await lookupSources(query, meal, preferences);
    cache[key] = { query, cachedAt: now, sources };
    if (sources.length) return { sources, changed: true };
  }

  return { sources: [], changed: false };
}

async function lookupSources(query, meal, preferences) {
  try {
    const results = await searchSitemaps(query, meal);
    if (results.length) return await scrapeResultSources(results, meal, preferences);
  } catch {
    /* fall back to web search */
  }

  try {
    const results = await searchDuckDuckGo(query);
    return await scrapeResultSources(results, meal, preferences);
  } catch {
    return [];
  }
}

async function scrapeResultSources(results, meal, preferences) {
  const sources = [];
  const blocked = blockedSourceTokens(preferences);
  for (const result of results.slice(0, 6)) {
    if (sources.length >= 3) break;
    if (mentionsBlockedSource(result, blocked)) continue;
    const source = await scrapeRecipeSource(result.url, result.title, meal);
    if (mentionsBlockedSource(source, blocked)) continue;
    if (source) sources.push(source);
  }
  return dedupeSources(sources);
}

async function searchSitemaps(query, meal) {
  const tokens = searchTokens(`${query} ${ingredientQuery(meal)}`);
  const candidates = [];
  for (const provider of SITEMAP_PROVIDERS) {
    const urls = await sitemapRecipeUrls(provider);
    for (const url of urls) {
      const score = scoreRecipeUrl(url, tokens);
      if (score > 0) candidates.push({ url, title: titleFromUrl(url), score });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.url.length - b.url.length)
    .slice(0, 8);
}

async function sitemapRecipeUrls(provider) {
  if (sitemapMemory.has(provider.name)) return sitemapMemory.get(provider.name);

  const rootXml = await fetchText(provider.indexUrl, xmlRequestOptions());
  const rootLocs = extractLocs(rootXml);
  const nestedSitemaps = rootLocs
    .filter((url) => provider.sitemapPattern.test(url))
    .slice(0, provider.maxSitemaps);
  const sitemapUrls = nestedSitemaps.length ? nestedSitemaps : [provider.indexUrl];
  const urls = [];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const xml = sitemapUrl === provider.indexUrl ? rootXml : await fetchText(sitemapUrl, xmlRequestOptions());
      urls.push(...extractLocs(xml).filter((url) => provider.recipeUrlPattern.test(url)));
    } catch {
      /* skip one failed sitemap and keep the provider useful */
    }
  }

  const unique = [...new Set(urls)].filter(isAllowedRecipeUrl);
  sitemapMemory.set(provider.name, unique);
  return unique;
}

function scoreRecipeUrl(url, tokens) {
  const slug = normalizeSearchText(new URL(url).pathname);
  if (NON_RECIPE_URL_PARTS.some((part) => slug.includes(part))) return 0;
  const slugTokens = new Set(slug.split(' ').filter(Boolean));
  let score = 0;
  for (const token of tokens) {
    if (slugTokens.has(token)) score += token.length >= 5 ? 4 : 2;
    else if (slug.includes(token) && token.length >= 5) score += 1;
  }
  return score;
}

const NON_RECIPE_URL_PARTS = [
  'boganbefaling',
  'boeger',
  'boger',
  'madplan',
  'ugeplan',
  'kategori',
  'category',
  'tag',
  'tema',
  'artikel',
];

function extractLocs(xml) {
  return [...String(xml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeHtml(match[1]));
}

function xmlRequestOptions() {
  return {
    headers: {
      Accept: 'application/xml,text/xml,text/html',
      'User-Agent': 'Mozilla/5.0 (compatible; KobSmartRecipeSourceBot/1.0)',
    },
  };
}

async function searchDuckDuckGo(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchText(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; KobSmartRecipeSourceBot/1.0)',
    },
  });

  if (/anomaly-modal|challenge-form/i.test(html)) return [];

  const results = [];
  const pattern = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const url = cleanSearchUrl(decodeHtml(match[1]));
    if (!url || !isAllowedRecipeUrl(url)) continue;
    results.push({ url, title: cleanText(match[2]) });
  }
  return dedupeSources(results).slice(0, 8);
}

async function scrapeRecipeSource(url, searchTitle, meal) {
  try {
    const html = await fetchText(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; KobSmartRecipeSourceBot/1.0)',
      },
    });
    const recipe = findRecipeJsonLd(html);
    const title = cleanText(recipe?.name || metaContent(html, 'og:title') || titleTag(html) || searchTitle || hostLabel(url));
    const timeMin = recipeTimeMinutes(recipe);
    const stepCount = recipeStepCount(recipe);
    const ingredientCount = Array.isArray(recipe?.recipeIngredient) ? recipe.recipeIngredient.length : null;
    const difficulty = inferDifficulty({ timeMin, stepCount, ingredientCount }, meal.difficulty);
    const rating = ratingValue(recipe);

    return {
      title: title || hostLabel(url),
      url,
      rating: rating ?? difficultyRating(difficulty),
      difficulty,
      source: hostLabel(url),
    };
  } catch {
    return {
      title: searchTitle || hostLabel(url),
      url,
      rating: difficultyRating(meal.difficulty),
      difficulty: meal.difficulty || 'medium',
      source: hostLabel(url),
    };
  }
}

function searchQueries(meal, preferences) {
  const cuisine = cleanText(meal.cuisine || preferences.cuisine || '');
  const name = cleanText(meal.name || '');
  const ingredients = (meal.ingredients || [])
    .slice(0, 4)
    .map((ingredient) => cleanText(ingredient.name || ''))
    .filter(Boolean)
    .join(' ');
  return [
    `${name} ${cuisine} opskrift dansk`,
    `${ingredients} ${cuisine} opskrift`,
    `${name} opskrift`,
  ]
    .map((query) => query.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((query, index, all) => all.indexOf(query) === index);
}

function ingredientQuery(meal) {
  return (meal.ingredients || [])
    .slice(0, 5)
    .map((ingredient) => cleanText(ingredient.name || ''))
    .filter(Boolean)
    .join(' ');
}

const QUERY_STOP_WORDS = new Set([
  'med',
  'uden',
  'til',
  'for',
  'den',
  'det',
  'der',
  'som',
  'dansk',
  'opskrift',
  'opskrifter',
  'nem',
  'hurtig',
  'frisk',
  'friske',
  'italiensk',
  'dansk',
  'mexicansk',
  'indisk',
  'thai',
  'japansk',
  'kinesisk',
  'vietnamesisk',
]);

function searchTokens(value) {
  return [...new Set(
    normalizeSearchText(value)
      .split(' ')
      .filter((token) => token.length >= 3 && !QUERY_STOP_WORDS.has(token)),
  )];
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFromUrl(value) {
  try {
    const slug = decodeURIComponent(new URL(value).pathname)
      .split('/')
      .filter(Boolean)
      .at(-1) || hostLabel(value);
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return 'Opskrift';
  }
}

function realSources(sources) {
  return (Array.isArray(sources) ? sources : [])
    .filter((source) => source?.url && /^https?:\/\//i.test(source.url))
    .map((source) => ({
      title: source.title || hostLabel(source.url),
      url: source.url,
      rating: source.rating ?? difficultyRating(source.difficulty),
      difficulty: source.difficulty || 'medium',
      source: source.source || hostLabel(source.url),
    }));
}

function blockedSourceTokens(preferences = {}) {
  const raw = normalizeSearchText(
    [
      ...(preferences.dietaryPreferences || []),
      ...(preferences.allergies || []),
      preferences.customAvoids || '',
    ].join(' '),
  );
  const blocked = new Set();
  if (/\b(no pork|no-pork|halal|kosher|svinekod|svinekoed|svin|pork|bacon|skinke|chorizo|salami)\b/.test(raw)) {
    ['svin', 'svinekod', 'svinekoed', 'pork', 'bacon', 'skinke', 'chorizo', 'salami', 'pancetta', 'prosciutto', 'pepperoni'].forEach((token) =>
      blocked.add(token),
    );
  }
  if (/\b(alkohol|alcohol)\b/.test(raw)) {
    ['alkohol', 'alcohol', 'vin', 'hvidvin', 'roedvin', 'portvin', 'cognac', 'rom'].forEach((token) => blocked.add(token));
  }
  return blocked;
}

function mentionsBlockedSource(source, blocked) {
  if (!source || !blocked.size) return false;
  const haystack = normalizeSearchText(`${source.title || ''} ${source.url || ''}`);
  return [...blocked].some((token) => haystack.includes(token));
}

function withFallbackSource(meal) {
  const existing = realSources(meal.sources);
  return { ...meal, sources: existing.length ? existing : [fallbackSource(meal)] };
}

function fallbackSource(meal) {
  return {
    title: 'KøbSmart AI recipe',
    url: '',
    rating: difficultyRating(meal.difficulty),
    difficulty: meal.difficulty || 'medium',
    source: 'generated',
  };
}

async function readCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(await readFile(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function writeCache(cache) {
  await mkdir(dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function findRecipeJsonLd(html) {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    const body = decodeHtml(match[1]).trim();
    const parsed = safeJson(body);
    const recipe = findRecipeNode(parsed);
    if (recipe) return recipe;
  }
  return null;
}

function findRecipeNode(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const type = value['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((item) => String(item).toLowerCase() === 'recipe')) return value;
  if (value['@graph']) return findRecipeNode(value['@graph']);
  return null;
}

function recipeTimeMinutes(recipe) {
  if (!recipe) return null;
  return (
    isoDurationMinutes(recipe.totalTime) ||
    isoDurationMinutes(recipe.cookTime) + isoDurationMinutes(recipe.prepTime) ||
    null
  );
}

function isoDurationMinutes(value) {
  if (!value || typeof value !== 'string') return 0;
  const match = value.match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return 0;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0);
}

function recipeStepCount(recipe) {
  const instructions = recipe?.recipeInstructions;
  if (!instructions) return null;
  if (typeof instructions === 'string') return instructions.split(/\.\s+/).filter(Boolean).length;
  if (!Array.isArray(instructions)) return null;
  let count = 0;
  for (const step of instructions) {
    if (typeof step === 'string') count += 1;
    else if (Array.isArray(step?.itemListElement)) count += step.itemListElement.length;
    else count += 1;
  }
  return count;
}

function inferDifficulty({ timeMin, stepCount, ingredientCount }, fallback = 'medium') {
  let score = 0;
  if (timeMin >= 50) score += 2;
  else if (timeMin >= 30) score += 1;
  if (stepCount >= 9) score += 2;
  else if (stepCount >= 6) score += 1;
  if (ingredientCount >= 12) score += 1;
  if (score >= 4) return 'hard';
  if (score >= 2) return 'medium';
  return fallback || 'easy';
}

function ratingValue(recipe) {
  const rating = recipe?.aggregateRating?.ratingValue || recipe?.aggregateRating?.rating;
  const value = Number(String(rating || '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? Math.min(5, value) : null;
}

function difficultyRating(difficulty = 'medium') {
  if (difficulty === 'easy') return 5;
  if (difficulty === 'hard') return 2;
  return 3;
}

function cleanSearchUrl(value) {
  try {
    const url = new URL(value, 'https://duckduckgo.com');
    const wrapped = url.searchParams.get('uddg');
    return wrapped ? decodeURIComponent(wrapped) : url.href;
  } catch {
    return '';
  }
}

function isAllowedRecipeUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (!RECIPE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) return false;
    if (/\.(pdf|jpg|jpeg|png|webp|gif)$/i.test(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function dedupeSources(sources) {
  const seen = new Set();
  return sources.filter((source) => {
    const key = source.url || source.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  return decodeHtml(html.match(pattern)?.[1] || '');
}

function titleTag(html) {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function cleanText(value) {
  return decodeHtml(String(value || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function cacheKey(query) {
  return normalizeSearchText(query).replace(/ /g, '-');
}

function hostLabel(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'opskrift';
  }
}
