import { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Leaf, ShieldAlert, Store, Route, Home } from 'lucide-react';
import { useStore } from '../../lib/store';
import {
  DIETARY_PREFERENCES,
  ALLERGIES,
  STORE_CHAINS,
  TRANSPORT_MODES,
  ROUTE_PRIORITIES,
  DEFAULT_ROUTE_PREFERENCES,
} from '../../lib/constants';
import { Logo, TagInput, ToggleChip, SegmentedControl } from '../ui';
import { AVOID_SUGGESTIONS, PANTRY_SUGGESTIONS } from '../../lib/preferences';

const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export default function SetupWizard() {
  const { user, completeSetup } = useStore();
  const [step, setStep] = useState(0);
  const [dietary, setDietary] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [customAvoids, setCustomAvoids] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [route, setRoute] = useState({ ...DEFAULT_ROUTE_PREFERENCES });

  const steps = [
    {
      icon: Leaf,
      title: 'Dine kostpræferencer',
      subtitle: 'Vi bruger dem til at filtrere alle opskrifter. Du kan ændre dem senere.',
      body: (
        <ChipGrid
          options={DIETARY_PREFERENCES}
          selected={dietary}
          onToggle={(id) => setDietary((p) => toggle(p, id))}
        />
      ),
    },
    {
      icon: ShieldAlert,
      title: 'Allergier',
      subtitle: 'Disse ingredienser udelades altid fra dine opskrifter.',
      body: (
        <div className="space-y-4">
          <ChipGrid
            options={ALLERGIES}
            selected={allergies}
            onToggle={(id) => setAllergies((p) => toggle(p, id))}
          />
          <div>
            <span className="label">Andet du ikke kan spise</span>
            <TagInput
              values={customAvoids}
              onChange={setCustomAvoids}
              suggestions={AVOID_SUGGESTIONS}
              placeholder="Tilføj noget, du vil undgå"
              ariaLabel="Tilføj specifik begrænsning"
            />
          </div>
        </div>
      ),
    },
    {
      icon: Home,
      title: 'Hvad har du allerede?',
      subtitle: 'Skriv ingredienser du ofte har hjemme. Vi trækker dem fra indkøbslisten.',
      body: (
        <div>
          <span className="label">Ingredienser hjemme</span>
          <TagInput
            values={pantryItems}
            onChange={setPantryItems}
            suggestions={PANTRY_SUGGESTIONS}
            placeholder="Tilføj en ingrediens hjemme"
            ariaLabel="Tilføj ingrediens hjemme"
          />
        </div>
      ),
    },
    {
      icon: Store,
      title: 'Foretrukne butikker',
      subtitle: 'Vælg de kæder du helst handler i. Vi prioriterer deres tilbud.',
      body: (
        <ChipGrid
          options={STORE_CHAINS.map((c) => ({ id: c, label: c }))}
          selected={stores}
          onToggle={(id) => setStores((p) => toggle(p, id))}
        />
      ),
    },
    {
      icon: Route,
      title: 'Sådan handler du',
      subtitle: 'Styrer hvordan vi planlægger din indkøbsrute.',
      body: <RouteStep route={route} setRoute={setRoute} />,
    },
  ];

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const next = () => {
    if (isLast) {
      completeSetup({
        dietaryPreferences: dietary,
        allergies,
        customAvoids: customAvoids.join(', '),
        pantryItems,
        preferredStores: stores,
        routePreferences: route,
      });
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo size="sm" />
        <span className="text-sm font-medium text-ink-400">
          Trin {step + 1} af {steps.length}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-8 flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-brand-600' : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div key={step} className="flex-1 animate-fade-in">
        <span className="icon-tile mb-4 h-12 w-12">
          <current.icon size={24} />
        </span>
        <h1 className="meal-title text-3xl">
          {step === 0 ? `Hej ${user?.name?.split(' ')[0] || 'der'} ` : ''}
          {current.title}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">{current.subtitle}</p>
        <div className="mt-6">{current.body}</div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft size={18} /> Tilbage
          </button>
        )}
        <button type="button" className="btn-primary flex-1" onClick={next}>
          {isLast ? (
            <>
              Færdig <Check size={18} />
            </>
          ) : (
            <>
              Fortsæt <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
      {step < steps.length - 1 && (
        <button
          type="button"
          onClick={next}
          className="mx-auto mt-3 text-sm font-medium text-ink-400 hover:text-ink-700"
        >
          Spring over
        </button>
      )}
    </div>
  );
}

function ChipGrid({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => (
        <ToggleChip key={opt.id} active={selected.includes(opt.id)} onClick={() => onToggle(opt.id)}>
          {selected.includes(opt.id) && <Check size={14} />}
          {opt.label}
        </ToggleChip>
      ))}
    </div>
  );
}

function RouteStep({ route, setRoute }) {
  return (
    <div className="space-y-6">
      <div>
        <span className="label">Transport</span>
        <SegmentedControl
          className="w-full"
          options={TRANSPORT_MODES}
          value={route.transport}
          onChange={(transport) => setRoute((r) => ({ ...r, transport }))}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label mb-0">Radius</span>
          <span className="text-sm font-semibold text-brand-700">{route.radiusKm} km</span>
        </div>
        <input
          type="range"
          min="1"
          max="15"
          step="1"
          value={route.radiusKm}
          onChange={(e) => setRoute((r) => ({ ...r, radiusKm: Number(e.target.value) }))}
          className="w-full accent-brand-600"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label mb-0">Maks. antal butikker</span>
          <span className="text-sm font-semibold text-brand-700">{route.maxStops}</span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={route.maxStops}
          onChange={(e) => setRoute((r) => ({ ...r, maxStops: Number(e.target.value) }))}
          className="w-full accent-brand-600"
        />
      </div>

      <div>
        <span className="label">Prioritet</span>
        <div className="grid gap-2.5">
          {ROUTE_PRIORITIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRoute((r) => ({ ...r, priority: p.id }))}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                route.priority === p.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-ink-400/20 bg-white hover:border-brand-300'
              }`}
            >
              <span
                className={`mt-0.5 grid h-5 w-5 place-items-center rounded border-2 ${
                  route.priority === p.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-400/40'
                }`}
              >
                {route.priority === p.id && <Check size={12} />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink-900">{p.label}</span>
                <span className="block text-xs text-ink-500">{p.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
