import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  CircleDollarSign,
  Clock,
  Database,
  Home,
  ListChecks,
  MapPin,
  Route,
  Store,
  UtensilsCrossed,
  WifiOff,
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { checkHealth } from '../../lib/api';
import { loadOffers } from '../../lib/offers';
import { buildStarterPlan } from '../../lib/starterMeals';
import { useGeolocation } from '../../lib/useGeolocation';
import { ALLERGIES, DIETARY_PREFERENCES } from '../../lib/constants';
import { formatDate, formatPrice } from '../../lib/format';
import { mealImage } from '../../lib/mealImages';
import { useNav } from '../../App';
import { EmptyState, Spinner } from '../ui';

export default function HomeScreen() {
  const {
    user,
    savedRecipes,
    lastPlan,
    dietaryPreferences,
    allergies,
    customAvoids,
    pantryItems,
    routePreferences,
    preferredStores,
    setLastPlan,
  } = useStore();
  const { navigate } = useNav();
  const { position } = useGeolocation();
  const [deepseekOk, setDeepseekOk] = useState(null);
  const [offerMeta, setOfferMeta] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const seededRef = useRef(false);

  useEffect(() => {
    checkHealth().then((h) => setDeepseekOk(Boolean(h.deepseek)));
    loadOffers(position).then(({ meta }) => setOfferMeta(meta)).catch(() => {});
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'der';
  const recipes = (lastPlan?.recipes || []).filter(hasPriceData);

  // First-run instant value: if there's no plan yet, price the built-in starter
  // meals against today's offers so Home opens on real meals, not an empty hero.
  useEffect(() => {
    if (recipes.length > 0 || seededRef.current) return;
    seededRef.current = true;
    setSeeding(true);
    buildStarterPlan(position, {
      radiusKm: routePreferences.radiusKm,
      preferredStores,
      priority: routePreferences.priority,
      maxStops: routePreferences.maxStops,
      pantryItems,
    })
      .then((starter) => {
        if (starter.length) setLastPlan({ cuisine: 'starter', recipes: starter, selectedRecipeId: null });
      })
      .catch(() => {})
      .finally(() => setSeeding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes.length]);
  const selectedRecipe = recipes.find((r) => r.id === lastPlan?.selectedRecipeId) || recipes[0] || null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label">{greeting()} {firstName}</p>
          <h1 className="meal-title mt-1 max-w-xl text-4xl">Aftensmad fra dagens tilbud</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500">
            Vi matcher dine præferencer, det du har hjemme, butikkernes tilbud og en rundtur der giver mening.
          </p>
        </div>
        <button type="button" onClick={() => navigate('plan')} className="btn-primary self-start lg:self-auto">
          <UtensilsCrossed size={17} /> Find måltid
        </button>
      </div>

      <PreferenceRow
        dietaryPreferences={dietaryPreferences}
        allergies={allergies}
        customAvoids={customAvoids}
        pantryItems={pantryItems}
        preferredStores={preferredStores}
        routePreferences={routePreferences}
      />

      {seeding && !selectedRecipe ? (
        <div className="hero-card flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
          <Spinner className="text-white" />
          <p className="meal-title text-2xl text-white">Vi finder dagens måltider…</p>
          <p className="text-sm text-brand-100">Matcher opskrifter mod dagens tilbud nær dig.</p>
        </div>
      ) : (
        <DailyDealCard recipe={selectedRecipe} onPlan={() => navigate(selectedRecipe ? 'list' : 'plan', selectedRecipe ? { recipe: selectedRecipe } : {})} />
      )}

      {deepseekOk === false && (
        <button
          type="button"
          onClick={() => navigate('plan')}
          className="flex w-full items-center gap-3 rounded-lg border border-butter bg-butter/50 px-4 py-3 text-left text-sm text-ink-700"
        >
          <WifiOff size={17} className="shrink-0" />
          <span><span className="font-semibold">Opskriftsgenerering er offline.</span> Sæt DEEPSEEK_API_KEY for at slå den til.</span>
        </button>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="section-label">Flere forslag til i aften</h2>
            {recipes.length > 0 && (
              <button type="button" onClick={() => navigate('plan')} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                Se alle
              </button>
            )}
          </div>
          {recipes.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="Ingen måltider endnu"
              action={
                <button type="button" onClick={() => navigate('plan')} className="btn-primary">
                  Find dagens muligheder
                </button>
              }
            >
              Vælg et køkken, så finder KøbSmart opskrifter med dagens tilbud.
            </EmptyState>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recipes.slice(0, 4).map((recipe, index) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => navigate('plan', { recipeId: recipe.id })}
                  className="card overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:border-brand-300"
                >
                  <div className="aspect-[4/2.4] bg-paper">
                    <img src={mealImage(recipe)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3.5">
                    <span className="savings-pill mb-2">{mealCategory(index)}</span>
                    <h3 className="meal-title truncate text-xl">{recipe.name}</h3>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-extrabold text-ink-900">{formatPrice(recipe.totalEstimate)}</span>
                      <span className="text-xs font-bold text-accent-600">spar {formatPrice(recipe.totalSaving)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-ink-500">
                      <span>{recipe.matchedCount}/{recipe.totalCount} match</span>
                      <span>{recipe.stores?.length || 0} stop</span>
                      {recipe.time ? <span>{recipe.time} min</span> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <DailySavingsWidget recipe={selectedRecipe} savedRecipes={savedRecipes} />
          <OfferPulse offerMeta={offerMeta} />
        </aside>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-label">Gemte måltider</h2>
          {savedRecipes.length > 0 && (
            <button type="button" onClick={() => navigate('saved')} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              Se alle
            </button>
          )}
        </div>

        {savedRecipes.length === 0 ? (
          <EmptyState icon={Bookmark} title="Ingen gemte måltider endnu">
            Gem en opskrift, når den passer til din uge.
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {savedRecipes.slice(0, 2).map((recipe) => (
              <button
                key={recipe.savedId}
                type="button"
                onClick={() => navigate('saved', { savedId: recipe.savedId })}
                className="card flex items-center gap-3 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300"
              >
                <img src={mealImage(recipe)} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-900">{recipe.name}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-500">
                    <Bookmark size={11} /> {formatDate(recipe.savedAt)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-extrabold text-ink-900">{formatPrice(recipe.totalEstimate)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DailyDealCard({ recipe, onPlan }) {
  if (!recipe) {
    return (
      <button
        type="button"
        onClick={onPlan}
        className="hero-card group grid min-h-[280px] overflow-hidden text-left transition-all hover:-translate-y-0.5 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="flex flex-col justify-between gap-6 p-6">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Dagens bedste aftensmad
          </span>
          <div>
            <h2 className="meal-title max-w-md text-4xl text-white">Find et måltid der passer til tilbuddene i dag</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-brand-100">
              KøbSmart viser pris, besparelse, pantry-match og rundtur før du handler.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-white transition-transform group-hover:translate-x-1">
            Se forslag <ArrowRight size={16} />
          </span>
        </div>
        <div className="min-h-52 bg-brand-800">
          <img src={mealImage({ name: 'aftensmad grønt tilbud' })} alt="" className="h-full w-full object-cover" />
        </div>
      </button>
    );
  }

  return (
    <section className="hero-card grid overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex flex-col justify-between gap-6 p-6">
        <div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Dagens bedste aftensmad
          </span>
          <h2 className="meal-title mt-4 text-4xl text-white">{recipe.name}</h2>
          {recipe.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-brand-100">{recipe.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <HeroMetric icon={CircleDollarSign} label="Pris" value={formatPrice(recipe.totalEstimate)} onDark />
          <HeroMetric icon={TagLike} label="Sparet" value={formatPrice(recipe.totalSaving)} onDark accent />
          <HeroMetric icon={Route} label="Rute" value={`${recipe.stores?.length || 0} stop`} onDark />
          <HeroMetric icon={Clock} label="Tid" value={recipe.time ? `${recipe.time} min` : 'hurtig'} onDark />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
            {recipe.matchedCount}/{recipe.totalCount} ingredienser matchet
          </span>
          {recipe.homeCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
              {recipe.homeCount} fra hjemmet
            </span>
          )}
        </div>

        <button type="button" onClick={onPlan} className="btn-cream w-full justify-center sm:w-fit">
          <ListChecks size={18} /> Lav indkøbsplan
        </button>
      </div>
      <div className="relative min-h-64 bg-brand-800">
        <img src={mealImage(recipe)} alt="" className="h-full w-full object-cover" />
        {recipe.totalSaving > 0 && (
          <span className="savings-pill absolute right-4 top-4 text-sm">Spar {formatPrice(recipe.totalSaving)}</span>
        )}
      </div>
    </section>
  );
}

function PreferenceRow({ dietaryPreferences, allergies, customAvoids, pantryItems, preferredStores, routePreferences }) {
  const labels = [
    ...dietaryPreferences.map((id) => DIETARY_PREFERENCES.find((p) => p.id === id)?.label).filter(Boolean),
    ...allergies.map((id) => ALLERGIES.find((a) => a.id === id)?.label).filter(Boolean),
  ];
  const custom = String(customAvoids || '').trim();
  if (custom) labels.push(custom);
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {labels.slice(0, 5).map((label) => (
        <span key={label} className="preference-chip">{label}</span>
      ))}
      {pantryItems?.length > 0 && <span className="pantry-chip"><Home size={12} /> {pantryItems.length} hjemme</span>}
      <span className="preference-chip"><Store size={12} /> {preferredStores?.length || 'Alle'} butikker</span>
      <span className="preference-chip"><MapPin size={12} /> {routePreferences.radiusKm} km radius</span>
    </div>
  );
}

function DailySavingsWidget({ recipe, savedRecipes }) {
  return (
    <div className="card p-4">
      <p className="section-label">Besparelseswallet</p>
      <p className="mt-2 text-3xl font-extrabold text-accent-600">{formatPrice(recipe?.totalSaving || 0)}</p>
      <p className="mt-1 text-sm text-ink-500">På næste indkøbsplan</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border bg-paper/70 p-2.5">
          <p className="font-bold text-ink-900">{savedRecipes.length}</p>
          <p className="text-ink-500">gemte</p>
        </div>
        <div className="rounded-lg border border-border bg-paper/70 p-2.5">
          <p className="font-bold text-ink-900">{recipe?.stores?.length || 0}</p>
          <p className="text-ink-500">stop</p>
        </div>
      </div>
    </div>
  );
}

function OfferPulse({ offerMeta }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Database size={17} className="text-brand-700" />
        <p className="text-sm font-bold text-ink-900">Tilbudspuls</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-500">
        {offerMeta
          ? `${offerMeta.offer_count?.toLocaleString('da-DK') || 0} varer fra ${offerMeta.store_count || 0} butikker. Opdateres én gang dagligt.`
          : 'Henter dagens tilbudsdata.'}
      </p>
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value, accent, onDark }) {
  if (onDark) {
    return (
      <div className="rounded-xl border border-white/15 bg-white/10 p-3">
        <Icon size={16} className={accent ? 'text-accent-400' : 'text-brand-100'} />
        <p className={`mt-2 text-base font-extrabold ${accent ? 'text-accent-400' : 'text-white'}`}>{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-100/80">{label}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <Icon size={16} className={accent ? 'text-accent-600' : 'text-brand-700'} />
      <p className={`mt-2 text-base font-extrabold ${accent ? 'text-accent-600' : 'text-ink-900'}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</p>
    </div>
  );
}

function TagLike(props) {
  return <CircleDollarSign {...props} />;
}

function mealCategory(index) {
  return ['Billigst', 'Hurtigst', 'Mindst rute', 'Mest protein'][index] || 'Familievenlig';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 10) return 'Godmorgen';
  if (h < 17) return 'God dag';
  return 'God aften';
}

function hasPriceData(recipe) {
  return Number(recipe?.totalEstimate) > 0 && (recipe?.stores?.length || 0) > 0 && (recipe?.matchedCount || 0) > 0;
}
