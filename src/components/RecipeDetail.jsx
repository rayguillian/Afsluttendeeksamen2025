import { useState } from 'react';
import { ArrowLeft, Clock, Users, Bookmark, BookmarkCheck, Store, Check, AlertCircle, ChevronDown, Tag, MapPin, PiggyBank, ExternalLink, CircleDollarSign, Home, ListChecks, Route } from 'lucide-react';
import { selectedOption } from '../lib/offers';
import { formatPrice, formatDuration, formatDistance } from '../lib/format';
import { mealImage } from '../lib/mealImages';
import { Banner } from './ui';

export default function RecipeDetail({ recipe, onBack, onSave, onRoute, saved = false, onSelectOption }) {
  return (
    <div className="animate-fade-in pb-24">
      <button type="button" onClick={onBack} className="btn-ghost mb-3 -ml-2 px-2">
        <ArrowLeft size={18} /> Tilbage
      </button>

      <div className="surface overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_0.78fr]">
          <div className="flex flex-col justify-between gap-6 p-5">
            <div>
              <span className="w-fit rounded-md bg-mint px-2.5 py-1 text-xs font-bold text-brand-700">{recipe.cuisine === 'liste' ? 'Indkøbsliste' : 'Måltidsbevis'}</span>
              <h1 className="meal-title mt-4 text-4xl">{recipe.name}</h1>
              {recipe.description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-500">{recipe.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.dietTags?.map((tag) => (
                  <span key={tag} className="preference-chip">{tag}</span>
                ))}
                {recipe.homeCount > 0 && <span className="pantry-chip">{recipe.homeCount} fra hjemmet</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <HeroStat icon={CircleDollarSign} label="Pris" value={formatPrice(recipe.totalEstimate)} />
              <HeroStat icon={Tag} label="Sparet" value={formatPrice(recipe.totalSaving)} accent />
              <HeroStat icon={Clock} label="Tid" value={recipe.time ? formatDuration(recipe.time) : 'hurtig'} />
              <HeroStat icon={Users} label="Personer" value={recipe.servings || 2} />
            </div>
          </div>
          <div className="relative min-h-72 bg-paper">
            <img src={mealImage(recipe)} alt="" className="h-full w-full object-cover" />
            {recipe.totalSaving > 0 && (
              <span className="absolute right-4 top-4 rounded-lg bg-white/95 px-3 py-2 text-sm font-extrabold text-accent-600 shadow-card">
                Spar {formatPrice(recipe.totalSaving)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border border-t border-border text-center">
          <Stat label="Estimat" value={formatPrice(recipe.totalEstimate)} />
          <Stat label="Besparelse" value={formatPrice(recipe.totalSaving)} accent />
          <Stat label="Fundet" value={`${recipe.matchedCount}/${recipe.totalCount}`} />
        </div>
        {recipe.totalSaving > 0 && <SavingsTracker recipe={recipe} />}
      </div>

      {recipe.matchedCount === 0 && (
        <Banner tone="warn" className="mt-4">
          Ingen af ingredienserne kunne findes i butikkerne i nærheden. Du kan stadig gemme opskriften.
        </Banner>
      )}

      <ProofSection recipe={recipe} />

      {/* Ingredients */}
      <section className="mt-6">
        <h2 className="section-label mb-3">Dagens tilbudsmatch</h2>
        <div className="card divide-y divide-border">
          {recipe.ingredients.map((ing, i) => (
            <IngredientRow
              key={i}
              ingredient={ing}
              onSelect={onSelectOption ? (offerId) => onSelectOption(i, offerId) : null}
            />
          ))}
        </div>
      </section>

      {/* How it cooks — shown BEFORE you commit, so you know what you're in for.
          (Hidden for a plain ingredient list — there's no recipe to cook.) */}
      {recipe.cuisine !== 'liste' && <CookSteps recipe={recipe} />}

      {/* Stores */}
      {recipe.stores?.length > 0 && (
        <section className="mt-6">
          <h2 className="section-label mb-3">Rutevalg</h2>
          <SmartRouteChoice stores={recipe.stores} />
        </section>
      )}

      <RecipeSources recipe={recipe} />

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-[64px] z-20 border-t border-ink-900/10 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:bottom-0 lg:left-[252px]">
        <div className="mx-auto flex max-w-2xl gap-3">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className={saved ? 'btn-secondary' : 'btn-secondary'}
              aria-pressed={saved}
            >
              {saved ? <BookmarkCheck size={18} className="text-brand-600" /> : <Bookmark size={18} />}
              {saved ? 'Gemt' : 'Gem'}
            </button>
          )}
          {onRoute && (
            <button type="button" onClick={onRoute} className="btn-primary flex-1" disabled={!recipe.stores?.length}>
              <ListChecks size={18} /> Lav indkøbsplan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="px-2 py-3">
      <p className={`text-base font-extrabold ${accent ? 'text-accent-600' : 'text-ink-900'}`}>{value}</p>
      <p className="text-[11px] font-medium uppercase text-ink-400">{label}</p>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-lg border border-border bg-cream px-3 py-3">
      <Icon size={15} className={accent ? 'text-accent-600' : 'text-brand-700'} />
      <p className={`mt-2 text-base font-extrabold ${accent ? 'text-accent-600' : 'text-ink-900'}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase text-ink-500">{label}</p>
    </div>
  );
}

function ProofSection({ recipe }) {
  const pantry = recipe.ingredients.filter((ing) => ing.pantry);
  const matched = recipe.ingredients.filter((ing) => selectedOption(ing));
  const standard = recipe.standardItems || [];
  const bestDeals = matched
    .map((ing) => ({ ingredient: ing, option: selectedOption(ing) }))
    .filter(({ option }) => option?.saving > 0)
    .sort((a, b) => b.option.saving - a.option.saving)
    .slice(0, 3);

  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="card p-4">
        <h2 className="section-label mb-3">Hvorfor dette måltid?</h2>
        <p className="text-sm leading-relaxed text-ink-600">
          {recipe.matchedCount} af {recipe.totalCount} ingredienser matcher butikker i din radius.
          {recipe.totalSaving > 0 ? ` Dagens tilbud trækker cirka ${formatPrice(recipe.totalSaving)} fra normalprisen.` : ' Prisen holdes samlet og synlig før du handler.'}
          {pantry.length > 0 ? ` ${pantry.length} ingrediens${pantry.length === 1 ? '' : 'er'} er allerede markeret som hjemme.` : ''}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <ProofMetric icon={Tag} label="Tilbud" value={bestDeals.length || matched.length} />
          <ProofMetric icon={Home} label="Hjemme" value={pantry.length} />
          <ProofMetric icon={Store} label="Butikker" value={recipe.stores?.length || 0} />
        </div>
      </div>

      <div className="card p-4">
        <h2 className="section-label mb-3">Største tilbud</h2>
        {bestDeals.length === 0 ? (
          <p className="text-sm text-ink-500">Ingen tydelige rabatter i denne plan, men priserne er stadig matchet mod aktuelle varer.</p>
        ) : (
          <div className="space-y-2.5">
            {bestDeals.map(({ ingredient, option }) => (
              <div key={`${ingredient.name}-${option.offerId}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink-900">{ingredient.name}</span>
                  <span className="block truncate text-xs text-ink-500">{option.chain} · {option.productName}</span>
                </span>
                <span className="shrink-0 font-extrabold text-accent-600">{formatPrice(option.saving)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(pantry.length > 0 || standard.length > 0) && (
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {pantry.length > 0 && <IngredientMiniList title="Du har allerede" tone="pantry" items={pantry} />}
          {standard.length > 0 && <IngredientMiniList title="Tag også med · skøn" tone="standard" items={standard} />}
        </div>
      )}
    </section>
  );
}

function IngredientMiniList({ title, tone, items }) {
  const cls = tone === 'pantry' ? 'border-butter bg-butter/50' : 'border-border/80 bg-paper/60';
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item.name} className={tone === 'pantry' ? 'pantry-chip' : 'inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-semibold text-ink-700'}>
            {item.name}
            {tone === 'standard' && item.estPrice != null && <span className="font-normal text-ink-400">~{formatPrice(item.estPrice)}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProofMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-cream p-3">
      <Icon size={14} className="text-brand-700" />
      <p className="mt-1 text-lg font-extrabold text-ink-900">{value}</p>
      <p className="text-[10px] font-semibold uppercase text-ink-500">{label}</p>
    </div>
  );
}

function SmartRouteChoice({ stores }) {
  const totalSaving = stores.reduce((sum, store) => sum + store.items.reduce((inner, item) => inner + (item.saving || 0), 0), 0);
  const weakest = [...stores]
    .map((store) => ({
      ...store,
      saving: store.items.reduce((sum, item) => sum + (item.saving || 0), 0),
    }))
    .sort((a, b) => a.saving - b.saving)[0];

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <span className="icon-tile h-10 w-10">
            <Route size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-900">Bedste værdi-rute</p>
            <p className="mt-1 text-sm text-ink-500">
              {stores.length} butik{stores.length === 1 ? '' : 'ker'} samler {stores.reduce((sum, store) => sum + store.items.length, 0)} varer og sparer {formatPrice(totalSaving)}.
            </p>
          </div>
        </div>
      </div>

      {weakest && stores.length > 1 && weakest.saving <= 8 && (
        <div className="rounded-lg border border-butter bg-butter/50 p-4 text-sm text-ink-700">
          <p className="font-bold text-ink-900">Smart forslag</p>
          <p className="mt-1">Vil du springe {weakest.storeName} over? Den sparer kun {formatPrice(weakest.saving)} ekstra på denne plan.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {stores.map((store, index) => {
          const saving = store.items.reduce((sum, item) => sum + (item.saving || 0), 0);
          return (
            <div key={store.storeId} className="card flex items-center gap-3 p-3.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-600 text-xs font-extrabold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{store.storeName}</p>
                <p className="truncate text-xs text-ink-500">
                  {store.items.length} varer · {formatDistance(store.distanceKm)}
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold text-ink-900">{formatPrice(store.subtotal)}</span>
                {saving > 0 && <span className="text-[11px] font-bold text-accent-600">spar {formatPrice(saving)}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SavingsTracker({ recipe }) {
  const before = recipe.totalEstimate + recipe.totalSaving;
  const pct = before > 0 ? Math.min(100, Math.round((recipe.totalSaving / before) * 100)) : 0;
  return (
    <div className="border-t border-ink-900/10 px-5 py-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-ink-500">Samlet rabat</span>
        <span className="font-bold text-brand-700">
          {formatPrice(recipe.totalSaving)} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-paper">
        <div className="h-full rounded bg-accent-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// One ingredient: the picked store + price, plus a price-vs-distance comparison
// (e.g. cheaper at Lidl vs closer at REMA) the shopper can switch between.
function IngredientRow({ ingredient, onSelect }) {
  const [showAll, setShowAll] = useState(false);
  const options = ingredient.options || [];
  const sel = selectedOption(ingredient);
  const matched = options.length > 0;
  const pantry = Boolean(ingredient.pantry);
  const standard = Boolean(ingredient.standard);

  const cheapest = matched ? options.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const nearest = matched ? options.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a)) : null;
  // Worth offering a quick price-vs-distance toggle only when they differ.
  const showCompare = matched && onSelect && cheapest.offerId !== nearest.offerId;

  return (
    <div className="p-3.5">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
            matched || pantry || standard ? 'bg-brand-50 text-brand-600' : 'bg-black/5 text-ink-400'
          }`}
        >
          {matched || pantry || standard ? <Check size={15} /> : <AlertCircle size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">
            {ingredient.name}
            {ingredient.amount && <span className="ml-1.5 font-normal text-ink-400">{ingredient.amount}</span>}
          </p>
          {pantry ? (
            <p className="truncate text-xs font-semibold text-brand-700">Har hjemme</p>
          ) : sel ? (
            <p className="truncate text-xs text-ink-500">
              {sel.productName} · {sel.chain} · {formatDistance(sel.distanceKm)}
            </p>
          ) : standard ? (
            <p className="truncate text-xs text-ink-500">Ikke på tilbud — pris er kun et skøn</p>
          ) : (
            <p className="text-xs text-ink-400">Ingen pris fundet i nærheden</p>
          )}
        </div>
        {pantry && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-brand-700">0 kr.</p>
            <p className="text-[11px] text-ink-400">hjemme</p>
          </div>
        )}
        {standard && !pantry && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-ink-500">~{formatPrice(ingredient.estPrice)}</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-400">skøn</p>
          </div>
        )}
        {sel && !pantry && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-ink-900">{formatPrice(sel.price)}</p>
            {sel.onSale ? (
              <p className="text-[11px] text-brand-700">
                spar {formatPrice(sel.saving)}
                {sel.discountPercent ? ` · ${Math.round(sel.discountPercent)}%` : ''}
              </p>
            ) : (
              <p className="text-[11px] text-ink-400">normalpris</p>
            )}
          </div>
        )}
      </div>

      {/* Quick price-vs-distance choice */}
      {showCompare && (
        <div className="mt-2.5 grid grid-cols-2 gap-2 pl-10">
          <StoreChip
            icon={PiggyBank}
            label="Billigst"
            option={cheapest}
            active={sel.offerId === cheapest.offerId}
            onClick={() => onSelect(cheapest.offerId)}
          />
          <StoreChip
            icon={MapPin}
            label="Tættest"
            option={nearest}
            active={sel.offerId === nearest.offerId}
            onClick={() => onSelect(nearest.offerId)}
          />
        </div>
      )}

      {/* All stores */}
      {matched && onSelect && options.length > 1 && (
        <div className="pl-10">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <ChevronDown size={13} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
            {showAll ? 'Skjul' : `Alle ${options.length} butikker`}
          </button>
          {showAll && (
            <ul className="mt-2 space-y-1.5">
              {options.map((o) => {
                const active = sel.offerId === o.offerId;
                return (
                  <li key={o.offerId}>
                    <button
                      type="button"
                      onClick={() => onSelect(o.offerId)}
                      className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                        active ? 'border-brand-500 bg-brand-50' : 'border-ink-400/20 bg-white hover:border-brand-300'
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border-2 ${
                          active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-400/40'
                        }`}
                      >
                        {active && <Check size={10} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-ink-900">{o.productName}</span>
                        <span className="block truncate text-[11px] text-ink-400">
                          {o.chain} · {formatDistance(o.distanceKm)}
                          {o.offerId === cheapest.offerId && ' · billigst'}
                          {o.offerId === nearest.offerId && ' · tættest'}
                        </span>
                      </span>
                      {o.onSale && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-accent-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-600">
                          <Tag size={9} /> spar {formatPrice(o.saving)}
                        </span>
                      )}
                      <span className="shrink-0 text-xs font-bold text-ink-900">{formatPrice(o.price)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CookSteps({ recipe }) {
  const steps = recipe.steps || [];
  const diff = recipe.difficulty || 'medium';
  const diffLabel = diff === 'easy' ? 'Nem' : diff === 'hard' ? 'Svær' : 'Mellem';
  return (
    <section className="mt-6">
      <h2 className="section-label mb-3">Sådan laver du den</h2>
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="preference-chip"><Clock size={12} /> {recipe.time ? formatDuration(recipe.time) : 'hurtig'}</span>
          <span className="preference-chip">Sværhed: {diffLabel}</span>
          <span className="preference-chip"><Users size={12} /> {recipe.servings || 2} pers.</span>
        </div>
        {steps.length > 0 ? (
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-700">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-500">Den fulde fremgangsmåde vises, når du har handlet ind — eller åbn kilden nedenfor.</p>
        )}
      </div>
    </section>
  );
}

function RecipeSources({ recipe }) {
  const sources = recipe.sources?.length
    ? recipe.sources
    : [{ title: 'KøbSmart AI recipe', url: '', rating: difficultyRating(recipe.difficulty), difficulty: recipe.difficulty || 'medium' }];
  return (
    <section className="mt-6">
      <h2 className="section-label mb-3">Kilder</h2>
      <div className="card divide-y divide-ink-900/10">
        {sources.map((source, index) => (
          <div key={`${source.title}-${index}`} className="flex items-center justify-between gap-3 p-3.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink-900">{source.title || 'KøbSmart AI recipe'}</span>
              <span className="text-xs text-ink-400">
                {source.source || (source.url ? 'opskriftskilde' : 'Genereret ud fra tilbudsdata')} · sværhed {source.difficulty || recipe.difficulty || 'medium'}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  Åbn <ExternalLink size={11} />
                </a>
              )}
              <span className="text-xs font-bold text-brand-700">{difficultyRating(source.difficulty || recipe.difficulty)}/5</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function difficultyRating(difficulty) {
  if (difficulty === 'easy') return 5;
  if (difficulty === 'hard') return 2;
  return 3;
}

function StoreChip({ icon: Icon, label, option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
        active ? 'border-brand-500 bg-brand-50' : 'border-ink-400/20 bg-white hover:border-brand-300'
      }`}
    >
      <Icon size={15} className={active ? 'text-brand-600' : 'text-ink-400'} />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase text-ink-400">{label}</span>
        <span className="block truncate text-xs font-bold text-ink-900">
          {formatPrice(option.price)}
          <span className="ml-1 font-normal text-ink-400">{option.chain}</span>
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-ink-400">{formatDistance(option.distanceKm)}</span>
    </button>
  );
}
