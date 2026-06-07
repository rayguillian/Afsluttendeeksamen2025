import { useEffect, useRef, useState, useMemo } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock,
  ExternalLink,
  Map as MapIcon,
  MapPin,
  Navigation,
  RefreshCw,
  Route as RouteIcon,
  ShoppingBasket,
  Star,
  Store,
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { useNav } from '../../App';
import { useGeolocation } from '../../lib/useGeolocation';
import { planRoute } from '../../lib/api';
import { haversineKm } from '../../lib/geo';
import { TRANSPORT_MODES } from '../../lib/constants';
import { formatPrice, formatDistance, formatDuration } from '../../lib/format';
import { EmptyState, Banner, SegmentedControl, Spinner } from '../ui';
import MapView from '../MapView';

export default function RouteScreen() {
  const { routePreferences, lastPlan, activePlan, toggleBought, setPlanStatus, updateProfile } = useStore();
  const { params, navigate } = useNav();
  const { position, estimated, status } = useGeolocation();

  // The committed active plan is the source of truth; fall back for deep links.
  const recipe =
    activePlan?.recipe ||
    params?.recipe ||
    lastPlan?.recipes?.find((r) => r.id === lastPlan.selectedRecipeId) ||
    lastPlan?.recipes?.[0] ||
    null;
  const ingredientOnly = recipe?.cuisine === 'liste';

  // Bought items disappear from the active route, but remain visible in the
  // checklist. When a store has nothing left to collect, only its route stop
  // disappears and the round trip is recalculated.
  const checked = useMemo(() => new Set(activePlan?.bought || []), [activePlan?.bought]);
  const originalStores = recipe?.stores || EMPTY_STORES;
  const standardItems = recipe?.standardItems || EMPTY_ITEMS;
  const originalItems = useMemo(
    () => originalStores.flatMap((store) => (store.items || []).map((item) => ({ ...item, _store: store.storeName }))),
    [originalStores],
  );
  const stdKey = (item) => `std-${item.name}`;
  const allKeys = [...originalItems.map(itemKey), ...standardItems.map(stdKey)];
  const doneCount = allKeys.filter((key) => checked.has(key)).length;
  const shoppingComplete = allKeys.length > 0 && doneCount === allKeys.length;
  const remainingStandardItems = standardItems.filter((item) => !checked.has(stdKey(item)));
  const rawStores = useMemo(() => {
    const remaining = originalStores
      .map((store) => {
        const items = (store.items || []).filter((item) => !checked.has(itemKey(item)));
        return {
          ...store,
          items,
          subtotal: items.reduce((sum, item) => sum + (item.price || 0), 0),
        };
      })
      .filter((store) => store.items.length);

    // Standard-price items can be picked up at any planned stop. Keep one stop
    // alive until those are collected, even if all its offer items are done.
    if (!remaining.length && remainingStandardItems.length && originalStores.length) {
      return [{ ...originalStores[0], items: [], subtotal: 0 }];
    }
    return remaining;
  }, [checked, originalStores, remainingStandardItems.length]);
  const radiusKm = Number(routePreferences.radiusKm) || 1000;
  const displayStores = useMemo(
    () =>
      originalStores
        .map((store) => {
          const distanceKm = haversineKm(position, { lat: store.lat, lng: store.lng });
          return {
            ...store,
            distanceKm,
            items: (store.items || []).map((item) => ({ ...item, distanceKm })),
          };
        })
        .filter((store) => Number.isFinite(store.distanceKm)),
    [originalStores, position],
  );
  const allStores = useMemo(
    () =>
      rawStores
        .map((store) => {
          const distanceKm = haversineKm(position, { lat: store.lat, lng: store.lng });
          return {
            ...store,
            distanceKm,
            items: (store.items || []).map((item) => ({ ...item, distanceKm })),
          };
        })
        .filter((store) => Number.isFinite(store.distanceKm))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [rawStores, position],
  );
  const inRadiusStores = useMemo(
    () => allStores.filter((store) => store.distanceKm <= radiusKm),
    [allStores, radiusKm],
  );
  const maxStops = routePreferences.maxStops || inRadiusStores.length;
  const stores = useMemo(() => inRadiusStores.slice(0, maxStops), [inRadiusStores, maxStops]);
  const trimmed = inRadiusStores.length > stores.length;
  const outOfRadiusCount = allStores.length - inRadiusStores.length;
  const storeRouteKey = stores.map((store) => store.storeId).join('|');
  const positionKey = `${position.lat.toFixed(4)},${position.lng.toFixed(4)}`;

  const transport = TRANSPORT_MODES.find((t) => t.id === routePreferences.transport) || TRANSPORT_MODES[1];

  const [route, setRoute] = useState({ status: 'idle' });
  const [recalcKey, setRecalcKey] = useState(0);
  const [showCooking, setShowCooking] = useState(false);

  // Keep the full-precision position available to the async routing call while
  // rerouting only when the rounded position key changes.
  const posRef = useRef(position);
  posRef.current = position;

  useEffect(() => {
    if (!stores.length) {
      setRoute({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setRoute({ status: 'loading' });

    (async () => {
      const pos = posRef.current;
      const start = [pos.lng, pos.lat];
      const coordinates = [start, ...stores.map((s) => [s.lng, s.lat]), start];
      try {
        const res = await planRoute({ coordinates, profile: transport.profile });
        if (cancelled) return;
        const ordered = res.order
          .filter((idx) => idx > 0 && idx <= stores.length)
          .map((idx) => stores[idx - 1])
          .filter(Boolean);
        const line = (res.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
        const distanceKm = res.distanceMeters / 1000;
        setRoute({
          status: 'ok',
          provider: res.provider,
          orderedStores: ordered.length ? ordered : stores,
          line,
          distanceKm,
          durationMin: Number.isFinite(res.durationSeconds)
            ? res.durationSeconds / 60
            : (distanceKm / transport.speedKmh) * 60,
        });
      } catch {
        if (cancelled) return;
        // Direct-line fallback — app stays usable without OSRM.
        const distanceKm = directDistanceKm(pos, stores);
        setRoute({
          status: 'fallback',
          orderedStores: stores,
          line: [[pos.lat, pos.lng], ...stores.map((s) => [s.lat, s.lng]), [pos.lat, pos.lng]],
          distanceKm,
          durationMin: (distanceKm / transport.speedKmh) * 60,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recipe?.id, maxStops, transport.id, recalcKey, storeRouteKey, positionKey]);

  useEffect(() => {
    setShowCooking(false);
  }, [recipe?.id]);

  if (!recipe || !originalStores.length) {
    return (
      <div className="animate-fade-in pt-6">
        <EmptyState
          icon={MapIcon}
          title="Ingen rute endnu"
          action={
            <button type="button" className="btn-primary" onClick={() => navigate('plan')}>
              Planlæg et måltid
            </button>
          }
        >
          Planlæg et måltid og vælg en opskrift, så tegner vi den korteste indkøbsrute på åbent kort.
        </EmptyState>
      </div>
    );
  }

  if (!stores.length && !shoppingComplete) {
    return (
      <div className="animate-fade-in pt-6">
        <EmptyState
          icon={MapIcon}
          title="Ingen butikker inden for radius"
          action={
            <button type="button" className="btn-primary" onClick={() => navigate(ingredientOnly ? 'ingredients' : 'plan')}>
              Start ny søgning
            </button>
          }
        >
          Din radius er sat til {formatDistance(radiusKm)}. Planen har {allStores.length} relevante butikker, men de ligger uden for den grænse.
        </EmptyState>
      </div>
    );
  }

  const orderedStores = route.orderedStores || stores;
  const googleMapsUrl = googleMapsDirectionsUrl(position, orderedStores, transport.id);
  const activeOrder = new Map(orderedStores.map((store, index) => [store.storeId, index]));
  const checklistStores = [...displayStores].sort((a, b) => {
    const aOrder = activeOrder.has(a.storeId) ? activeOrder.get(a.storeId) : Number.MAX_SAFE_INTEGER;
    const bOrder = activeOrder.has(b.storeId) ? activeOrder.get(b.storeId) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder || a.distanceKm - b.distanceKm;
  });
  // This number must react to the checklist immediately. Do not derive it from
  // the async route response, which may still contain the previous store list.
  const remainingOfferTotal = originalItems.reduce(
    (sum, item) => checked.has(itemKey(item)) ? sum : sum + (item.price || 0),
    0,
  );
  const remainingTotal = remainingOfferTotal + remainingStandardTotal(remainingStandardItems);
  const originalTotalSaving = displayStores.reduce(
    (sum, store) => sum + store.items.reduce((itemSum, item) => itemSum + (item.saving || 0), 0),
    0,
  );
  const routeStoreIds = new Set(displayStores.map((store) => store.storeId));
  const toggleItem = (it) => toggleBought(itemKey(it));
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="meal-title text-3xl">{ingredientOnly ? 'Billigste prisrute' : 'Indkøbsrute'}</h1>
          <p className="mt-0.5 truncate text-sm text-ink-500">{recipe.name}</p>
        </div>
        <button type="button" onClick={() => setRecalcKey((k) => k + 1)} className="btn-ghost px-2.5">
          <RefreshCw size={16} /> Genberegn
        </button>
      </div>

      {estimated && (
        <Banner tone="info" className="mb-3 flex items-center gap-2">
          <MapPin size={15} className="shrink-0" />
          <span>{status === 'denied' ? 'GPS er slået fra' : 'Henter GPS'} — placering anslået (Aarhus C).</span>
        </Banner>
      )}
      {route.status === 'fallback' && (
        <Banner tone="warn" className="mb-3 flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>Ruteberegning utilgængelig. Viser direkte linjer mellem butikkerne.</span>
        </Banner>
      )}
      {outOfRadiusCount > 0 && (
        <Banner tone="info" className="mb-3 flex items-center gap-2">
          <MapPin size={15} className="shrink-0" />
          <span>
            {outOfRadiusCount} butik{outOfRadiusCount === 1 ? '' : 'ker'} er fravalgt, fordi de ligger uden for din radius på {formatDistance(radiusKm)}.
          </span>
        </Banner>
      )}

      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <span className="text-sm font-semibold text-ink-700">Transport</span>
        <SegmentedControl
          className="w-full max-w-xs"
          options={TRANSPORT_MODES}
          value={routePreferences.transport}
          onChange={(transportId) => updateProfile({ routePreferences: { transport: transportId } })}
        />
      </div>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-secondary mb-3 w-full justify-center"
      >
        <Navigation size={17} /> Åbn ruten i Google Maps <ExternalLink size={14} />
      </a>

      {/* Map — the hero of this screen. Wolt-style: your live dot + store pins. */}
      <div className="relative h-[340px] overflow-hidden rounded-2xl border border-border/80 shadow-hero sm:h-[420px] lg:h-[520px]">
        <MapView userPos={position} stores={orderedStores} routeLine={route.line} className="h-full w-full" />
        <span className="pointer-events-none absolute left-3 top-3 z-[400] inline-flex items-center gap-2 rounded-full bg-brand-700/95 px-3 py-1.5 text-xs font-bold text-white shadow-float backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cream opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cream" />
          </span>
          Dig · {orderedStores.length} {orderedStores.length === 1 ? 'butik' : 'butikker'} nær dig
        </span>
        {route.status === 'loading' && (
          <div className="absolute inset-0 z-[400] grid place-items-center bg-white/40 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-700 shadow">
              <Spinner className="text-brand-600" /> Beregner rute…
            </span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-4 gap-2.5">
        <Summary icon={Store} label="Butikker" value={orderedStores.length} />
        <Summary icon={RouteIcon} label="Rundtur" value={formatDistance(route.distanceKm ?? 0)} />
        <Summary icon={Clock} label={transport.label} value={formatDuration(route.durationMin ?? 0)} />
        <Summary icon={Navigation} label="Tilbage" value={formatPrice(remainingTotal)} />
      </div>
      {originalTotalSaving > 0 && (
        <div className="mt-3 rounded-lg border border-accent-500/25 bg-accent-500/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="block font-semibold text-ink-800">Dokumenteret besparelse</span>
              <span className="mt-0.5 block text-xs text-ink-500">Tilbudsrabat eller prisforskel mod dyrere gyldige match inden for din radius.</span>
            </span>
            <span className="shrink-0 font-extrabold text-accent-600">{formatPrice(originalTotalSaving)}</span>
          </div>
        </div>
      )}

      {trimmed && (
        <p className="mt-3 text-xs text-ink-400">
          Begrænset til de {maxStops} nærmeste butikker fra din søgning (af {allStores.length}).
        </p>
      )}

      {/* Route order + checklist */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="section-label">Butikker og varer</h2>
            <p className="mt-1 text-xs text-ink-500">Markér det, du allerede har hjemme eller har samlet op. Ruten opdateres med det samme.</p>
          </div>
          <span className="text-xs font-semibold text-brand-700">
            {doneCount}/{allKeys.length} samlet op
          </span>
        </div>

        <div className="space-y-4">
          {checklistStores.map((store) => {
            const storeDone = (store.items || []).length > 0 && store.items.every((item) => checked.has(itemKey(item)));
            const routeNumber = activeOrder.has(store.storeId) ? activeOrder.get(store.storeId) + 1 : null;
            return (
            <div key={store.storeId} className={`card overflow-hidden transition-opacity ${storeDone ? 'opacity-55' : ''}`}>
              <div className={`flex items-center gap-3 border-b border-border px-4 py-3 ${storeDone ? 'bg-paper/70' : 'bg-mint/50'}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-extrabold text-white ${storeDone ? 'bg-ink-400' : 'bg-brand-600'}`}>
                  {storeDone ? <Check size={14} /> : routeNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${storeDone ? 'text-ink-400 line-through' : 'text-ink-900'}`}>
                    {storeLabel(store)}
                  </p>
                  <p className="truncate text-xs text-ink-400">
                    {store.address || store.storeName} · {formatDistance(store.distanceKm)}
                    {storeSaving(store) > 0 ? ` · dokumenteret besparelse ${formatPrice(storeSaving(store))}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-bold ${storeDone ? 'text-ink-400 line-through' : 'text-ink-900'}`}>{formatPrice(store.subtotal)}</span>
              </div>
              <ul className="divide-y divide-border">
                {store.items.map((it) => {
                  const isChecked = checked.has(itemKey(it));
                  return (
                    <li key={itemKey(it)}>
                      <button
                        type="button"
                        onClick={() => toggleItem(it)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${
                            isChecked ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-400/40'
                          }`}
                        >
                          {isChecked && <Check size={14} />}
                        </span>
                        <span className={`min-w-0 flex-1 ${isChecked ? 'line-through' : ''}`}>
                          <span className={`block truncate text-sm font-medium ${isChecked ? 'text-ink-400' : 'text-ink-900'}`}>{it.name}</span>
                          <span className={`block truncate text-xs ${isChecked ? 'text-ink-400' : 'text-ink-500'}`}>
                            {it.productName}
                            {it.saving > 0 ? ` · besparelse ${formatPrice(it.saving)}` : ''}
                            {it.discountPercent ? ` · ${Math.round(it.discountPercent)}%` : ''}
                          </span>
                          {isCheapestInRoute(it, recipe, routeStoreIds) && (
                            <span className={`mt-0.5 block text-[11px] font-semibold ${isChecked ? 'text-ink-400' : 'text-brand-700'}`}>
                              Billigste gyldige match i de valgte butikker
                            </span>
                          )}
                        </span>
                        <span className={`shrink-0 text-sm font-semibold ${isChecked ? 'text-ink-400' : 'text-ink-900'}`}>
                          {formatPrice(it.price)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )})}

          {standardItems.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border bg-paper/70 px-4 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink-700 text-white">
                  <ShoppingBasket size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">Tag også med</p>
                  <p className="truncate text-xs text-ink-400">Ikke på tilbud — pris er kun et skøn</p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {standardItems.map((it) => {
                  const isChecked = checked.has(stdKey(it));
                  return (
                    <li key={stdKey(it)}>
                      <button type="button" onClick={() => toggleBought(stdKey(it))} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${isChecked ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-400/40'}`}>
                          {isChecked && <Check size={14} />}
                        </span>
                        <span className={`min-w-0 flex-1 ${isChecked ? 'line-through' : ''}`}>
                          <span className={`block truncate text-sm font-medium ${isChecked ? 'text-ink-400' : 'text-ink-900'}`}>{it.name}</span>
                          <span className="block truncate text-xs text-ink-400">
                            {it.storeId ? `Tag med hos ${storeLabel(displayStores.find((store) => store.storeId === it.storeId) || { storeName: it.storeName })}` : 'Fås i enhver butik'}
                          </span>
                        </span>
                        <span className={`shrink-0 text-right text-sm font-semibold ${isChecked ? 'text-ink-400' : 'text-ink-500'}`}>
                          ~{formatPrice(it.estPrice)}
                          <span className="block text-[10px] uppercase tracking-wide text-ink-400">skøn</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      {shoppingComplete && (
        <section className="mt-6 space-y-4">
          {/* The payoff. Shopping done → loud savings reward → then cook. */}
          <div className="overflow-hidden rounded-2.5xl border border-brand-700 bg-brand-700 p-6 text-center text-white shadow-float">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              <Check size={13} /> Alt samlet op
            </span>
            <p className="mt-4 text-sm font-semibold text-brand-100">Du sparede i aften</p>
            <p className="meal-title mt-1 text-5xl text-white">{formatPrice(originalTotalSaving)}</p>
            <p className="mt-2 text-sm text-brand-100">
              vs. dyreste butik nær dig · {displayStores.length} {displayStores.length === 1 ? 'butik' : 'butikker'} · {formatDistance(directDistanceKm(position, displayStores))}
            </p>
          </div>
          {ingredientOnly ? (
            <button type="button" className="btn-primary w-full justify-center" onClick={() => navigate('ingredients')}>
              <ShoppingBasket size={18} /> Lav ny vareliste
            </button>
          ) : !showCooking ? (
            <button
              type="button"
              className="btn-primary w-full justify-center"
              onClick={() => {
                setShowCooking(true);
                setPlanStatus('cooking');
              }}
            >
              <BookOpen size={18} /> Skal vi lave mad?
            </button>
          ) : (
            <CookingInstructions recipe={recipe} />
          )}
        </section>
      )}
    </div>
  );
}

function Summary({ icon: Icon, label, value }) {
  return (
    <div className="metric-card flex flex-col items-center gap-1 text-center">
      <Icon size={16} className="text-brand-600" />
      <span className="text-sm font-extrabold leading-none text-ink-900">{value}</span>
      <span className="text-[10px] font-medium uppercase text-ink-400">{label}</span>
    </div>
  );
}

function storeSaving(store) {
  return (store.items || []).reduce((sum, item) => sum + (item.saving || 0), 0);
}

function isCheapestInRoute(item, recipe, routeStoreIds) {
  const ingredient = (recipe.ingredients || []).find((entry) => entry.name === item.name);
  const options = (ingredient?.options || []).filter((option) => routeStoreIds.has(option.storeId));
  if (!options.length) return false;
  const cheapest = Math.min(...options.map((option) => Number(option.price)));
  return Number(item.price) <= cheapest;
}

function remainingStandardTotal(items) {
  return items.reduce((sum, item) => sum + (item.estPrice || 0), 0);
}

function storeLabel(store) {
  const chain = String(store.chain || '').trim();
  const name = String(store.storeName || '').trim();
  if (!chain) return name || 'Butik';
  if (!name || name.toLowerCase().includes(chain.toLowerCase())) return name || chain;
  return `${chain} · ${name}`;
}

const itemKey = (it) => it.offerId || `${it.storeId}-${it.name}`;
const EMPTY_STORES = [];
const EMPTY_ITEMS = [];

function directDistanceKm(pos, stores) {
  let total = 0;
  let cur = { lat: pos.lat, lng: pos.lng };
  for (const s of stores) {
    total += haversineKm(cur, { lat: s.lat, lng: s.lng });
    cur = { lat: s.lat, lng: s.lng };
  }
  total += haversineKm(cur, { lat: pos.lat, lng: pos.lng });
  return total;
}

function googleMapsDirectionsUrl(position, stores, transportId) {
  const point = ({ lat, lng }) => `${lat},${lng}`;
  const travelmode = transportId === 'cycling' ? 'bicycling' : transportId === 'walking' ? 'walking' : 'driving';
  const params = new URLSearchParams({
    api: '1',
    origin: point(position),
    destination: point(position),
    travelmode,
    dir_action: 'navigate',
  });
  if (stores.length) params.set('waypoints', stores.map(point).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function CookingInstructions({ recipe }) {
  const sources = recipe.sources?.length
    ? recipe.sources
    : [{ title: 'KøbSmart AI recipe', url: '', difficulty: recipe.difficulty || 'medium' }];

  return (
    <div className="space-y-4">
      {recipe.steps?.length > 0 && (
        <div>
          <h2 className="section-label mb-3">Fremgangsmåde</h2>
          <ol className="card space-y-3 p-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-700">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div>
        <h2 className="section-label mb-3">Kilder og sværhed</h2>
        <div className="card divide-y divide-ink-900/10">
          {sources.map((source, index) => (
            <div key={`${source.title}-${index}`} className="flex items-center justify-between gap-3 p-3.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink-900">{source.title || 'KøbSmart AI recipe'}</span>
                <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                  <Star size={12} className="text-brand-600" />
                  {difficultyRating(source.difficulty || recipe.difficulty)}/5
                  {source.url ? (
                    <>
                      <span>·</span>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-1 font-semibold text-brand-700"
                      >
                        Åbn kilde <ExternalLink size={11} />
                      </a>
                    </>
                  ) : (
                    <span>· Genereret ud fra tilbudsdata</span>
                  )}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function difficultyRating(difficulty) {
  if (difficulty === 'easy') return 5;
  if (difficulty === 'hard') return 2;
  return 3;
}
