import { useEffect, useMemo } from 'react';
import { Check, Home, ListChecks, Route as RouteIcon, ShoppingBasket, Tag, Undo2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useNav } from '../../App';
import { deriveRecipe } from '../../lib/offers';
import { formatDistance, formatPrice } from '../../lib/format';
import { EmptyState } from '../ui';

// LISTE = "decide". Group the basket by store, let the user remove anything they
// already have at home (price recalcs live), then hand off to the route to shop.
// The "bought" checklist lives in RouteScreen — one checklist, one place.
export default function ShoppingListScreen() {
  const { activePlan, lastPlan, startPlan, updatePlanRecipe, setPlanStatus } = useStore();
  const { params, navigate } = useNav();

  // Resolve the meal for this screen and make sure it's the committed active plan.
  const incoming =
    params?.recipe ||
    lastPlan?.recipes?.find((r) => r.id === lastPlan.selectedRecipeId) ||
    lastPlan?.recipes?.[0] ||
    null;

  useEffect(() => {
    if (incoming) startPlan(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.id]);

  const recipe = activePlan?.recipe || incoming;
  const stores = recipe?.stores || [];

  const pantryItems = useMemo(() => (recipe?.ingredients || []).filter((ing) => ing.pantry), [recipe]);
  const standardItems = recipe?.standardItems || [];

  if (!recipe) {
    return (
      <div className="animate-fade-in pt-6">
        <EmptyState
          icon={ListChecks}
          title="Ingen indkøbsliste endnu"
          action={
            <button type="button" className="btn-primary" onClick={() => navigate('plan')}>
              Find måltid
            </button>
          }
        >
          Vælg et måltid, så samler vi varer, pantry og tilbud i en indkøbsliste.
        </EmptyState>
      </div>
    );
  }

  if (!stores.length && !pantryItems.length && !standardItems.length) {
    return (
      <div className="animate-fade-in pt-6">
        <EmptyState
          icon={ListChecks}
          title="Ingen prisdata til dette måltid"
          action={
            <button type="button" className="btn-primary" onClick={() => navigate('plan')}>
              Find andet måltid
            </button>
          }
        >
          Opskriften har ingen matchede tilbud i din radius, så vi kan ikke lave en ærlig indkøbsplan endnu.
        </EmptyState>
      </div>
    );
  }

  const buyCount = stores.reduce((n, s) => n + (s.items?.length || 0), 0) + standardItems.length;
  const totalSaving = stores.reduce(
    (sum, store) => sum + (store.items || []).reduce((inner, item) => inner + (item.saving || 0), 0),
    0,
  );

  // Flip an ingredient between "buy it" and "har hjemme". Re-derives baskets +
  // totals so the price/route reflect the choice immediately. Reversible.
  function toggleHaveAtHome(name) {
    const ingredients = recipe.ingredients.map((ing) => {
      if (ing.name !== name) return ing;
      if (ing.pantry) {
        const restored = ing._savedOptions || ing.options || [];
        return { ...ing, pantry: false, options: restored, selectedOfferId: restored[0]?.offerId ?? null, _savedOptions: undefined };
      }
      return { ...ing, pantry: true, _savedOptions: ing.options, options: [], selectedOfferId: null };
    });
    updatePlanRecipe(deriveRecipe({ ...recipe, ingredients }));
  }

  function startRoute() {
    setPlanStatus('shopping');
    navigate('route', { recipe });
  }

  return (
    <div className="animate-fade-in pb-36">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="section-label">Indkøbsliste</p>
          <h1 className="meal-title mt-1 text-3xl">{recipe.name}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {buyCount} {buyCount === 1 ? 'vare' : 'varer'} at købe · {pantryItems.length} har hjemme
          </p>
        </div>
        {totalSaving > 0 && (
          <span className="savings-pill" title="Sammenlignet med dyreste butik nær dig">
            Spar {formatPrice(totalSaving)}
          </span>
        )}
      </div>

      <p className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <Home size={13} /> Tryk på en vare du allerede har hjemme — så ryger den af listen og prisen falder.
      </p>

      <section className="space-y-4">
        {stores.map((store, index) => {
          const storeSaving = (store.items || []).reduce((sum, item) => sum + (item.saving || 0), 0);
          return (
            <div key={store.storeId} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border bg-mint/50 px-4 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-600 text-xs font-extrabold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{store.storeName}</p>
                  <p className="truncate text-xs text-ink-500">
                    {store.address || store.chain} · {formatDistance(store.distanceKm)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold text-ink-900">{formatPrice(store.subtotal)}</p>
                  {storeSaving > 0 && <p className="text-[11px] font-bold text-accent-600">spar {formatPrice(storeSaving)}</p>}
                </div>
              </div>

              <ul className="divide-y divide-border">
                {(store.items || []).map((item) => (
                  <li key={itemKey(item)}>
                    <button
                      type="button"
                      onClick={() => toggleHaveAtHome(item.name)}
                      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper/60"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-border bg-white text-ink-400 transition-colors group-hover:border-brand-400 group-hover:text-brand-600">
                        <Home size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">{item.name}</span>
                        <span className="block truncate text-xs text-ink-500">
                          {item.productName}
                          {item.quantity ? ` · ${item.quantity}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-extrabold text-ink-900">{formatPrice(item.price)}</span>
                        {item.saving > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-600">
                            <Tag size={10} /> {formatPrice(item.saving)}
                            {item.discountPercent ? ` · ${Math.round(item.discountPercent)}%` : ''}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {pantryItems.length > 0 && (
        <section className="mt-5 rounded-lg border border-butter bg-butter/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Check size={16} className="text-ink-700" />
            <h2 className="text-sm font-bold text-ink-900">Har hjemme — taget af listen</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {pantryItems.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => toggleHaveAtHome(item.name)}
                className="pantry-chip transition-colors hover:bg-butter"
                title="Læg tilbage på listen"
              >
                {item.name}
                {item.amount ? <span className="font-normal text-ink-500">{item.amount}</span> : null}
                <Undo2 size={11} className="text-ink-400" />
              </button>
            ))}
          </div>
        </section>
      )}

      {standardItems.length > 0 && (
        <section className="mt-5 rounded-2xl border border-border/80 bg-paper/60 p-4">
          <div className="mb-1 flex items-center gap-2">
            <ShoppingBasket size={16} className="text-ink-700" />
            <h2 className="text-sm font-bold text-ink-900">Tag også med</h2>
          </div>
          <p className="mb-3 text-xs text-ink-500">Ikke på tilbud denne uge, så vi har ikke en butikspris. Tag dem med hvor du alligevel handler — prisen er kun et skøn.</p>
          <ul className="divide-y divide-border/70">
            {standardItems.map((item) => (
              <li key={item.name}>
                <button
                  type="button"
                  onClick={() => toggleHaveAtHome(item.name)}
                  className="group flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-border bg-white text-ink-400 transition-colors group-hover:border-brand-400 group-hover:text-brand-600">
                    <Home size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">{item.name}</span>
                    <span className="block truncate text-xs text-ink-500">
                      {item.storeName ? `Tag med hos ${item.storeName}` : 'Fås i enhver butik'}
                      {item.amount ? ` · ${item.amount}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold text-ink-500">~{formatPrice(item.estPrice)}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-ink-400">skøn</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[64px] z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:bottom-0 lg:left-[252px]">
        <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto] items-center gap-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-ink-500">I alt</p>
              <p className="text-base font-extrabold text-ink-900">{formatPrice(recipe.totalEstimate)}</p>
            </div>
            <div>
              <p className="font-semibold text-ink-500">Sparet</p>
              <p className="text-base font-extrabold text-accent-600">{formatPrice(totalSaving)}</p>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={startRoute} disabled={!stores.length}>
            <RouteIcon size={18} /> Start rute
          </button>
        </div>
      </div>
    </div>
  );
}

const itemKey = (item) => item.offerId || `${item.storeId}-${item.name}`;
