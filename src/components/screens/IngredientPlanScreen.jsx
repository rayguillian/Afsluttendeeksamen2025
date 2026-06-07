import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ListChecks, MapPin, Search } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useNav } from '../../App';
import { useGeolocation } from '../../lib/useGeolocation';
import { loadOffers, matchRecipeOffers, parseListText, resolveOffers } from '../../lib/offers';
import { STORE_CHAINS } from '../../lib/constants';
import { Banner, Spinner } from '../ui';

export default function IngredientPlanScreen() {
  const { preferredStores, routePreferences, updateProfile, startPlan, setPlanStatus } = useStore();
  const { navigate } = useNav();
  const { position, estimated, status } = useGeolocation();
  const [phase, setPhase] = useState('items');
  const [text, setText] = useState('');
  const [chains, setChains] = useState(preferredStores || []);
  const [radiusKm, setRadiusKm] = useState(Number(routePreferences.radiusKm) || 5);
  const [maxStops, setMaxStops] = useState(Number(routePreferences.maxStops) || 2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const items = parseListText(text);

  async function buildRoute() {
    if (!items.length) return;
    setBusy(true);
    setError('');
    try {
      updateProfile({
        preferredStores: chains,
        routePreferences: { radiusKm, maxStops },
      });
      const loaded = await loadOffers(position);
      const offers = resolveOffers(loaded, position);
      const plan = matchRecipeOffers(
        {
          id: `ingredients-${Date.now()}`,
          name: 'Mine varer',
          cuisine: 'liste',
          ingredients: items.map((name) => ({ name })),
          steps: [],
          sources: [],
        },
        offers,
        position,
        {
          radiusKm,
          preferredStores: chains,
          maxStops,
          priority: 'price',
          pantryItems: [],
        },
      );
      if (!plan.stores?.length) {
        throw new Error('Ingen af varerne kunne matches med en rigtig butikspris inden for dine valg.');
      }
      startPlan(plan);
      setPlanStatus('shopping');
      navigate('route', { recipe: plan });
    } catch (cause) {
      setError(cause.message || 'Kunne ikke bygge prisruten.');
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-between">
        <button type="button" onClick={() => setPhase('items')} disabled={phase === 'items'} className="btn-ghost px-2 disabled:invisible">
          <ArrowLeft size={17} /> Tilbage
        </button>
        <span className="text-xs font-bold uppercase text-ink-400">Trin {phase === 'items' ? 1 : 2} af 2</span>
      </div>

      {error && (
        <Banner tone="warn" className="mx-auto mb-5 flex max-w-2xl items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </Banner>
      )}

      {phase === 'items' ? (
        <Question title="Hvad skal du købe?" subtitle="Skriv én vare pr. linje. Ingen opskrift nødvendig.">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={9}
            autoFocus
            placeholder={'kyllingebryst\nris\nbroccoli\nkokosmælk'}
            className="input resize-y text-base leading-relaxed"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-ink-500">{items.length} {items.length === 1 ? 'vare' : 'varer'}</span>
            <button type="button" onClick={() => setPhase('params')} disabled={!items.length} className="btn-primary">
              Fortsæt
            </button>
          </div>
        </Question>
      ) : (
        <Question title="Hvor vil du handle?" subtitle="Vi finder den billigste prisrute inden for dine valg.">
          <div className="space-y-6">
            <div>
              <p className="section-label mb-3">Butikskæder</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setChains([])}
                  className={chains.length === 0 ? 'chip border-brand-600 bg-brand-600 text-white' : 'chip border-border bg-white text-ink-600'}
                >
                  Alle kæder
                </button>
                {STORE_CHAINS.map((chain) => {
                  const active = chains.includes(chain);
                  return (
                    <button
                      key={chain}
                      type="button"
                      onClick={() => setChains((current) => active ? current.filter((item) => item !== chain) : [...current, chain])}
                      className={`chip ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-ink-600'}`}
                    >
                      {active && <Check size={13} />} {chain}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-white p-4">
              <Slider label="Fra din placering" value={radiusKm} min={1} max={15} suffix=" km" onChange={setRadiusKm} />
              <Slider label="Maks. antal stop" value={maxStops} min={1} max={5} suffix=" stop" onChange={setMaxStops} />
            </div>
            {estimated && (
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                <MapPin size={13} /> {status === 'denied' ? 'GPS er slået fra.' : 'GPS er ikke klar.'} Bruger Aarhus C.
              </p>
            )}

            <div className="rounded-lg border border-brand-600/20 bg-mint p-4 text-sm text-brand-800">
              <p className="font-bold">Pris først</p>
              <p className="mt-1">Varerne vælges til laveste gyldige pris i de valgte kæder og samles på højst {maxStops} stop.</p>
            </div>

            <button type="button" onClick={buildRoute} disabled={busy} className="btn-primary w-full justify-center">
              {busy ? <Spinner /> : <Search size={17} />} {busy ? 'Sammenligner priser' : 'Find billigste prisrute'}
            </button>
          </div>
        </Question>
      )}
    </div>
  );
}

function Question({ title, subtitle, children }) {
  return (
    <section className="mx-auto max-w-2xl py-4">
      <div className="mb-7 text-center">
        <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-lg border border-brand-600/20 bg-mint text-brand-700">
          <ListChecks size={20} />
        </span>
        <h1 className="meal-title text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Slider({ label, value, min, max, suffix, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-ink-700">
        <span>{label}</span>
        <output className="font-extrabold text-ink-900">{value}{suffix}</output>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full cursor-pointer accent-brand-600" />
      <span className="mt-1 flex justify-between text-[10px] font-semibold text-ink-400">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </span>
    </label>
  );
}
