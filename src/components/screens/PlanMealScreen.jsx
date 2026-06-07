import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Clock, ExternalLink, ListChecks, RefreshCw, Sparkles, Store, WifiOff } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useNav } from '../../App';
import { useGeolocation } from '../../lib/useGeolocation';
import { checkHealth, generateRecipes } from '../../lib/api';
import { buildPromptOffers, loadOffers, resolveOffers } from '../../lib/offers';
import { planRecipes } from '../../lib/planner';
import { ALLERGIES, CUISINES, DIETARY_PREFERENCES, ROUTE_PRIORITIES, STORE_CHAINS } from '../../lib/constants';
import { Banner, SkeletonCard, Spinner } from '../ui';
import RecipeCard from '../RecipeCard';
import { formatDuration, formatPrice } from '../../lib/format';
import { mealImage } from '../../lib/mealImages';
import { buildCuisineTargets, cuisineKey, mergeDistinctMeals, missingCuisineTargets, selectAvailableCuisineMix, selectCuisineQuota } from '../../lib/cuisineQuota';
import { recipeRestrictionConflicts } from '../../lib/preferences';

export default function PlanMealScreen() {
  const {
    dietaryPreferences,
    allergies,
    customAvoids,
    pantryItems,
    routePreferences,
    preferredStores,
    lastPlan,
    activePlan,
    setLastPlan,
    startPlan,
    setPlanStatus,
    updateProfile,
  } = useStore();
  const { navigate } = useNav();
  const { position, estimated, status } = useGeolocation();
  const initialRecipes = (lastPlan?.recipes || []).filter(hasPriceData).slice(0, 4);
  const initialCuisines = (lastPlan?.cuisines || (lastPlan?.cuisine ? [lastPlan.cuisine] : []))
    .filter((id) => CUISINES.some((item) => item.id === id))
    .slice(0, 4);

  const [phase, setPhase] = useState('cuisine');
  const [cuisines, setCuisines] = useState(initialCuisines);
  const [tripStores, setTripStores] = useState(preferredStores || []);
  const [tripRadius, setTripRadius] = useState(Number(routePreferences.radiusKm) || 5);
  const [tripMaxStops, setTripMaxStops] = useState(Number(routePreferences.maxStops) || 2);
  const [tripPriority, setTripPriority] = useState(routePreferences.priority || 'balanced');
  const [maxDifficulty, setMaxDifficulty] = useState(2);
  const [maxIngredients, setMaxIngredients] = useState(10);
  const [maxTime, setMaxTime] = useState(45);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [deepseekOk, setDeepseekOk] = useState(null);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingNote, setLoadingNote] = useState('');
  const quotaRotation = useRef(0);
  const canResumeRoute =
    Boolean(activePlan?.recipe) &&
    (activePlan.status === 'shopping' || activePlan.status === 'cooking');

  useEffect(() => {
    checkHealth().then((health) => setDeepseekOk(Boolean(health.deepseek)));
  }, []);

  async function generate() {
    if (!cuisines.length) return;
    setPhase('loading');
    setLoadingStage(0);
    setLoadingNote('');
    setError(null);
    try {
      updateProfile({
        preferredStores: tripStores,
        routePreferences: { radiusKm: tripRadius, maxStops: tripMaxStops, priority: tripPriority },
      });

      const loaded = await loadOffers(position);
      const offers = resolveOffers(loaded, position);
      const nearbyOffers = buildPromptOffers(offers, position, {
        radiusKm: tripRadius,
        preferredStores: tripStores,
        limit: 160,
      });
      setLoadingStage(1);
      const cuisineLabels = cuisines.map((id) => CUISINES.find((item) => item.id === id)?.label || id);
      const cuisineTargets = buildCuisineTargets(cuisineLabels, quotaRotation.current);
      quotaRotation.current += 1;
      const preferences = {
        occasion: 'Aftensmad',
        cuisine: cuisineLabels.join(', '),
        cuisines: cuisineLabels,
        cuisineTargets,
        cuisineIds: cuisines,
        dietaryPreferences: dietaryPreferences.map((id) => DIETARY_PREFERENCES.find((item) => item.id === id)?.label || id),
        allergies: allergies.map((id) => ALLERGIES.find((item) => item.id === id)?.label || id),
        customAvoids,
        pantryItems,
        maxDifficulty: difficultyLabel(maxDifficulty),
        maxIngredients,
        maxTime,
        servings: 2,
        location: position,
        routePreferences: { ...routePreferences, radiusKm: tripRadius, maxStops: tripMaxStops, priority: tripPriority },
        preferredStores: tripStores,
      };

      const validation = { dietaryPreferences, allergies, customAvoids, maxDifficulty, maxIngredients, maxTime };
      let fittingMeals = [];
      let missingTargets = cuisineTargets;
      let rejectionReasons = [];

      for (let attempt = 0; attempt < 3 && missingTargets.length; attempt += 1) {
        const recipeCount = missingTargets.reduce((sum, target) => sum + target.count, 0);
        if (attempt > 0) {
          setLoadingNote(`Kokken tilpasser ${recipeCount} ${recipeCount === 1 ? 'opskrift' : 'opskrifter'} til dine valg`);
        }
        const requestPreferences = {
          ...preferences,
          recipeCount,
          cuisineTargets: missingTargets,
          cuisines: missingTargets.map((target) => target.cuisine),
          cuisine: missingTargets.map((target) => target.cuisine).join(', '),
          existingRecipeNames: fittingMeals.map((meal) => meal.name),
          rejectionReasons,
          repairRequest: attempt > 0,
          repairAttempt: attempt,
        };
        const { meals } = await generateRecipes({ preferences: requestPreferences, nearbyOffers });
        const assessed = assessMeals(meals, validation);
        fittingMeals = mergeDistinctMeals(fittingMeals, assessed.usable);
        rejectionReasons = assessed.rejectionReasons;
        missingTargets = missingCuisineTargets(fittingMeals, cuisineTargets);
        setLoadingStage(2);
      }

      const exactCuisineMix = selectCuisineQuota(fittingMeals, cuisineTargets);
      const constrainedMeals = exactCuisineMix.length
        ? exactCuisineMix
        : selectAvailableCuisineMix(fittingMeals, cuisineTargets, 4);
      if (!constrainedMeals.length) {
        throw Object.assign(new Error('no_recipe_match'), {
          detail: 'Kokken kunne ikke bygge et sikkert forslag lige nu. Prøv at hente forslagene igen.',
        });
      }

      const idByLabel = new Map(cuisines.map((id) => [cuisineKey(CUISINES.find((item) => item.id === id)?.label || id), id]));
      const resolveCuisine = (meal) => idByLabel.get(cuisineKey(meal.cuisine)) || cuisines[0];
      const { recipes: enriched } = await planRecipes({
        meals: constrainedMeals.map((meal, index) => {
          const cuisine = resolveCuisine(meal);
          return { ...meal, id: `${cuisine}-${Date.now()}-${index}`, cuisine };
        }),
        offers,
        userPos: position,
        prefs: {
          radiusKm: tripRadius,
          preferredStores: tripStores,
          priority: tripPriority,
          maxStops: tripMaxStops,
          pantryItems,
        },
        audit: deepseekOk !== false,
      });
      setLoadingStage(3);
      enriched.sort((a, b) => b.matchedCount - a.matchedCount || a.totalEstimate - b.totalEstimate);
      const priced = enriched.filter(hasPriceData).slice(0, 4);
      if (!priced.length) {
        throw Object.assign(new Error('no_price_data'), {
          detail: 'Ingen af opskrifterne kunne matches med priser i den valgte radius. Prøv flere butikker eller en større afstand.',
        });
      }

      setRecipes(priced);
      setLastPlan({
        cuisine: cuisines[0],
        cuisines,
        location: position,
        recipes: priced,
        selectedRecipeId: null,
      });
      setPhase('list');
    } catch (err) {
      const unavailable =
        err.status === 503 ||
        err.message === 'recipe_generation_unavailable' ||
        err.message === 'deepseek_unreachable' ||
        err.message === 'network_unreachable';
      setError({
        type: err.message === 'no_price_data' ? 'no-prices' : unavailable ? 'unavailable' : 'error',
        detail: err.detail || err.message,
      });
      setPhase('shops');
    }
  }

  function openRecipe(recipe) {
    setSelected(recipe);
    setPhase('preview');
  }

  function chooseRecipe(recipe) {
    setLastPlan({ ...lastPlan, cuisine: cuisines[0], cuisines, recipes, selectedRecipeId: recipe.id });
    startPlan(recipe);
    setPlanStatus('shopping');
    navigate('route', { recipe });
  }

  if (phase === 'preview' && selected) {
    return <RecipePreview recipe={selected} onBack={() => setPhase('list')} onChoose={() => chooseRecipe(selected)} />;
  }

  return (
    <div className="animate-fade-in">
      {phase !== 'list' && phase !== 'loading' && <FlowHeader phase={phase} onBack={() => setPhase(previousPhase(phase))} />}

      {error && (
        <Banner tone={error.type === 'error' ? 'error' : 'warn'} className="mx-auto mb-5 flex max-w-2xl items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error.detail}</span>
        </Banner>
      )}
      {deepseekOk === false && phase !== 'list' && (
        <Banner tone="warn" className="mx-auto mb-5 flex max-w-2xl items-center gap-2">
          <WifiOff size={16} className="shrink-0" />
          <span>Opskriftsserveren er offline. Start hele appen med <code className="font-mono">npm run dev</code>.</span>
        </Banner>
      )}

      {phase === 'cuisine' && (
        <Question title="Hvad vil du spise til aftensmads?" subtitle="Vælg op til fire køkkener.">
          {canResumeRoute && (
            <button
              type="button"
              onClick={() => navigate('route')}
              className="btn-secondary mb-5 w-full justify-center"
            >
              <ListChecks size={17} /> Fortsæt indkøbsrute
            </button>
          )}
          <ChoiceGrid>
            {CUISINES.map((item) => {
              const active = cuisines.includes(item.id);
              const disabled = !active && cuisines.length >= 4;
              return (
                <Choice
                  key={item.id}
                  active={active}
                  disabled={disabled}
                  title={item.label}
                  onClick={() => setCuisines((current) => active ? current.filter((id) => id !== item.id) : [...current, item.id].slice(0, 4))}
                />
              );
            })}
          </ChoiceGrid>
          <p className="mt-3 text-center text-xs font-semibold text-ink-500">{cuisines.length}/4 køkkener valgt</p>
          <button
            type="button"
            onClick={() => setPhase('shops')}
            disabled={!cuisines.length}
            className="btn-primary mt-5 w-full justify-center"
          >
            Fortsæt med {cuisines.length || 0} {cuisines.length === 1 ? 'køkken' : 'køkkener'}
          </button>
        </Question>
      )}

      {phase === 'shops' && (
        <Question title="Hvor vil du handle?" subtitle="Vælg butikker og den længste afstand, du vil acceptere.">
          <div className="space-y-6">
            <div>
              <p className="section-label mb-3">Butikskæder</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTripStores([])}
                  className={tripStores.length === 0 ? 'chip border-brand-600 bg-brand-600 text-white' : 'chip border-border bg-white text-ink-600'}
                >
                  Alle kæder
                </button>
                {STORE_CHAINS.map((chain) => {
                  const active = tripStores.includes(chain);
                  return (
                    <button
                      key={chain}
                      type="button"
                      onClick={() => setTripStores((current) => (active ? current.filter((item) => item !== chain) : [...current, chain]))}
                      className={`chip ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-ink-600'}`}
                    >
                      {active && <Check size={13} />} {chain}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="section-label mb-3">Tur</p>
              <div className="space-y-4 rounded-lg border border-border bg-white p-4">
                <Slider
                  label="Fra din placering"
                  value={tripRadius}
                  min={1}
                  max={15}
                  suffix=" km"
                  onChange={setTripRadius}
                />
                <Slider
                  label="Antal stop"
                  value={tripMaxStops}
                  min={1}
                  max={5}
                  suffix=" stop"
                  onChange={setTripMaxStops}
                />
              </div>
              <div className="mt-4">
                <p className="section-label mb-3">Optimér efter</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {ROUTE_PRIORITIES.map((priority) => {
                    const active = tripPriority === priority.id;
                    return (
                      <button
                        key={priority.id}
                        type="button"
                        onClick={() => setTripPriority(priority.id)}
                        aria-pressed={active}
                        className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                          active
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-border bg-white text-ink-700 hover:border-brand-300'
                        }`}
                      >
                        <span className="block text-sm font-bold">{priority.label}</span>
                        <span className={`mt-1 block text-xs ${active ? 'text-white/75' : 'text-ink-500'}`}>{priority.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {estimated && (
                <p className="mt-2 text-xs text-ink-500">
                  {status === 'denied' ? 'GPS er slået fra.' : 'GPS er ikke klar.'} Bruger Aarhus C som udgangspunkt.
                </p>
              )}
            </div>

            <div>
              <p className="section-label mb-3">Opskrift</p>
              <div className="space-y-4 rounded-lg border border-border bg-white p-4">
                <Slider
                  label="Maks. sværhedsgrad"
                  value={maxDifficulty}
                  min={1}
                  max={3}
                  displayValue={difficultyLabel(maxDifficulty)}
                  minLabel="Nem"
                  maxLabel="Udfordrende"
                  onChange={setMaxDifficulty}
                />
                <Slider
                  label="Maks. ingredienser"
                  value={maxIngredients}
                  min={4}
                  max={16}
                  suffix=" ingredienser"
                  onChange={setMaxIngredients}
                />
                <Slider
                  label="Maks. tid"
                  value={maxTime}
                  min={15}
                  max={90}
                  step={5}
                  suffix=" min"
                  onChange={setMaxTime}
                />
              </div>
            </div>

            <button type="button" onClick={generate} disabled={deepseekOk === false} className="btn-primary w-full justify-center">
              <Sparkles size={17} /> Find fire måltider
            </button>
          </div>
        </Question>
      )}

      {phase === 'loading' && (
        <div className="mx-auto max-w-2xl py-10">
          <p className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-brand-800">
            <Spinner className="text-brand-700" /> Bygger dine fire forslag
          </p>
          {loadingNote && <p className="mb-4 text-center text-xs font-semibold text-ink-500">{loadingNote}</p>}
          <LoadingProgress stage={loadingStage} />
          <div className="space-y-3">
            {[0, 1, 2].map((index) => <SkeletonCard key={index} />)}
          </div>
        </div>
      )}

      {phase === 'list' && recipes.length > 0 && (
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="section-label">Aftensmad · {cuisines.map((id) => CUISINES.find((item) => item.id === id)?.label).filter(Boolean).join(', ')}</p>
              <h1 className="meal-title mt-1 text-3xl">{recipes.length} forslag</h1>
            </div>
            <div className="flex gap-2">
              <IconButton label="Ny søgning" onClick={() => setPhase('cuisine')}><ArrowLeft size={16} /></IconButton>
              <IconButton label="Opdater forslag" onClick={generate}><RefreshCw size={16} /></IconButton>
            </div>
          </div>
          <div className="space-y-3">
            {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onClick={() => openRecipe(recipe)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function FlowHeader({ phase, onBack }) {
  const step = phase === 'cuisine' ? 1 : 2;
  return (
    <div className="mx-auto mb-8 flex max-w-2xl items-center justify-between">
      <button type="button" onClick={onBack} disabled={step === 1} className="btn-ghost px-2 disabled:invisible">
        <ArrowLeft size={17} /> Tilbage
      </button>
      <span className="text-xs font-bold uppercase text-ink-400">Trin {step} af 2</span>
    </div>
  );
}

function Question({ title, subtitle, children }) {
  return (
    <section className="mx-auto max-w-2xl py-4">
      <div className="mb-7 text-center">
        <h1 className="meal-title text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function ChoiceGrid({ children }) {
  return <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>;
}

function Choice({ active, disabled, title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex min-h-20 items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:border-border disabled:bg-paper disabled:text-ink-400 ${
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-ink-900 hover:border-brand-300 hover:bg-mint'
      }`}
    >
      <span>
        <span className="block text-base font-bold">{title}</span>
        {hint && <span className={`mt-0.5 block text-xs ${active ? 'text-white/75' : 'text-ink-500'}`}>{hint}</span>}
      </span>
      {active && <Check size={17} />}
    </button>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-white text-ink-700 hover:bg-mint">
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step = 1, suffix = '', displayValue, minLabel, maxLabel, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-ink-700">
        <span>{label}</span>
        <output className="font-extrabold text-ink-900">{displayValue || `${value}${suffix}`}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-brand-600"
      />
      <span className="mt-1 flex justify-between text-[10px] font-semibold text-ink-400">
        <span>{minLabel || `${min}${suffix}`}</span>
        <span>{maxLabel || `${max}${suffix}`}</span>
      </span>
    </label>
  );
}

function LoadingProgress({ stage }) {
  const labels = [
    'Henter butikker og aktuelle priser',
    'Finder opskrifter og kilder',
    'Matcher ingredienser med butikker',
    'Sorterer efter pris, præferencer og rute',
  ];
  return (
    <div className="mb-5 rounded-lg border border-border bg-white p-4">
      {labels.map((label, index) => (
        <div key={label} className={`flex items-center gap-2 py-1.5 text-sm ${index <= stage ? 'text-ink-800' : 'text-ink-400'}`}>
          <span className={`grid h-5 w-5 place-items-center rounded-full border ${index < stage ? 'border-brand-600 bg-brand-600 text-white' : index === stage ? 'border-brand-600 text-brand-600' : 'border-border'}`}>
            {index < stage ? <Check size={12} /> : index === stage ? <Spinner className="h-3 w-3" /> : null}
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}

function RecipePreview({ recipe, onBack, onChoose }) {
  const sources = recipe.sources || [];
  return (
    <div className="mx-auto max-w-3xl animate-fade-in pb-24">
      <button type="button" onClick={onBack} className="btn-ghost mb-4 -ml-2 px-2">
        <ArrowLeft size={17} /> Tilbage til forslag
      </button>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <img src={mealImage(recipe)} alt="" className="h-56 w-full object-cover sm:h-72" />
        <div className="p-5">
          <h1 className="meal-title text-3xl">{recipe.name}</h1>
          {recipe.description && <p className="mt-2 text-sm leading-relaxed text-ink-500">{recipe.description}</p>}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink-600">
            <span>{formatPrice(recipe.totalEstimate)}</span>
            <span className="inline-flex items-center gap-1"><Clock size={14} /> {formatDuration(recipe.time || 0)}</span>
            <span className="inline-flex items-center gap-1"><Store size={14} /> {recipe.stores?.length || 0} butikker</span>
            <span>{difficultyLabel({ easy: 1, medium: 2, hard: 3 }[recipe.difficulty] || 2)}</span>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="section-label mb-3">Ingredienser</h2>
        <div className="rounded-lg border border-border bg-white divide-y divide-border">
          {(recipe.ingredients || []).map((ingredient) => (
            <div key={ingredient.name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-semibold text-ink-900">{ingredient.name}</span>
              <span className="text-ink-500">{ingredient.amount || (ingredient.pantry ? 'Har hjemme' : '')}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="section-label mb-3">Sådan laver du den</h2>
        <ol className="rounded-lg border border-border bg-white divide-y divide-border">
          {(recipe.steps || []).map((step, index) => (
            <li key={`${index}-${step}`} className="flex gap-3 px-4 py-3 text-sm text-ink-700">
              <span className="font-extrabold text-brand-700">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {sources.length > 0 && (
        <section className="mt-6">
          <h2 className="section-label mb-3">Kilder</h2>
          <div className="rounded-lg border border-border bg-white divide-y divide-border">
            {sources.map((source, index) => (
              <a
                key={`${source.title}-${index}`}
                href={source.url || undefined}
                target={source.url ? '_blank' : undefined}
                rel={source.url ? 'noreferrer' : undefined}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink-800"
              >
                <span>{source.title || 'KøbSmart-opskrift'}</span>
                {source.url && <ExternalLink size={14} className="text-brand-600" />}
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[64px] z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-[252px]">
        <button type="button" onClick={onChoose} className="btn-primary mx-auto flex w-full max-w-2xl justify-center">
          <ListChecks size={17} /> Vælg måltid og vis rute
        </button>
      </div>
    </div>
  );
}

function previousPhase(phase) {
  if (phase === 'shops') return 'cuisine';
  return 'cuisine';
}

function difficultyLabel(value) {
  if (value === 1) return 'Nem';
  if (value === 3) return 'Udfordrende';
  return 'Mellem';
}

function recipeFits(meal, { maxDifficulty, maxIngredients, maxTime }) {
  const difficulty = { easy: 1, medium: 2, hard: 3 }[meal.difficulty] || 2;
  return difficulty <= maxDifficulty && (meal.ingredients?.length || 0) <= maxIngredients && (Number(meal.time) || 0) <= maxTime;
}

function hasPriceData(recipe) {
  return Number(recipe.totalEstimate) > 0 && (recipe.stores?.length || 0) > 0 && (recipe.matchedCount || 0) > 0;
}

function assessMeals(meals, { dietaryPreferences, allergies, customAvoids, maxDifficulty, maxIngredients, maxTime }) {
  const usable = [];
  const rejectionReasons = [];
  for (const meal of meals || []) {
    const conflicts = recipeRestrictionConflicts(meal, { dietaryPreferences, allergies, customAvoids });
    const reasons = [];
    if (conflicts.length) reasons.push(`indeholder udelukkede ingredienser: ${conflicts.map((conflict) => conflict.term || conflict.type).join(', ')}`);
    if ((Number(meal.time) || 0) > maxTime) reasons.push(`tager ${meal.time} min; maks er ${maxTime}`);
    if ((meal.ingredients?.length || 0) > maxIngredients) reasons.push(`har ${meal.ingredients.length} ingredienser; maks er ${maxIngredients}`);
    const difficulty = { easy: 1, medium: 2, hard: 3 }[meal.difficulty] || 2;
    if (difficulty > maxDifficulty) reasons.push(`er for svær`);
    if (reasons.length) rejectionReasons.push(`${meal.name || 'Forslag'}: ${reasons.join('; ')}`);
    else usable.push(meal);
  }
  return { usable, rejectionReasons };
}
