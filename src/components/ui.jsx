import { Plus, ShoppingBasket, X } from 'lucide-react';
import { useState } from 'react';
import { splitPreferenceTerms } from '../lib/preferences';

// Small, dependency-light UI primitives shared across screens.

export function Logo({ size = 'md', withWordmark = true }) {
  const dims = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const icon = size === 'lg' ? 26 : size === 'sm' ? 16 : 20;
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid ${dims} place-items-center rounded-xl bg-brand-600 text-white shadow-float`}
      >
        <ShoppingBasket size={icon} strokeWidth={2.4} />
      </span>
      {withWordmark && (
        <span className="font-serif text-lg font-extrabold text-ink-900">
          Køb<span className="text-brand-600">Smart</span>
        </span>
      )}
    </div>
  );
}

export function ToggleChip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`chip ${
        active
          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
          : 'border-border bg-white text-ink-500 hover:border-brand-300 hover:text-ink-700'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl border border-border bg-white p-1 shadow-sm ${className}`} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
            value === opt.id ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-900/5 hover:text-ink-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function TagInput({ values = [], onChange, suggestions = [], placeholder = 'Tilføj...', ariaLabel = 'Tilføj element' }) {
  const [input, setInput] = useState('');
  const selectedKeys = new Set(values.map((value) => value.toLocaleLowerCase('da-DK')));
  const available = suggestions
    .filter((suggestion) => !selectedKeys.has(suggestion.toLocaleLowerCase('da-DK')))
    .filter((suggestion) => !input.trim() || suggestion.toLocaleLowerCase('da-DK').includes(input.trim().toLocaleLowerCase('da-DK')))
    .slice(0, 6);

  const add = (raw) => {
    const additions = splitPreferenceTerms(raw);
    if (!additions.length) return;
    onChange(splitPreferenceTerms([...values, ...additions]));
    setInput('');
  };

  const remove = (value) => onChange(values.filter((item) => item !== value));

  return (
    <div>
      <div className="rounded-lg border border-border bg-white p-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10">
        {values.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {values.map((value) => (
              <span key={value} className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white">
                {value}
                <button type="button" onClick={() => remove(value)} aria-label={`Fjern ${value}`} className="rounded-full p-0.5 hover:bg-white/15">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            aria-label={ariaLabel}
            placeholder={placeholder}
            onChange={(event) => {
              const next = event.target.value;
              if (/[,;\n]/.test(next)) add(next);
              else setInput(next);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && input.trim()) {
                event.preventDefault();
                add(input);
              }
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          <button type="button" onClick={() => add(input)} disabled={!input.trim()} aria-label="Tilføj" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand-700 hover:bg-mint disabled:opacity-30">
            <Plus size={16} />
          </button>
        </div>
      </div>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {available.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => add(suggestion)} className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-semibold text-ink-500 hover:border-brand-300 hover:text-brand-700">
              + {suggestion}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-ink-400">Tryk Enter eller komma for at tilføje. Fjern igen med krydset.</p>
    </div>
  );
}

export function ScreenHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="meal-title text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/70 px-6 py-12 text-center shadow-sm">
      {Icon && (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-mint text-brand-600">
          <Icon size={22} />
        </span>
      )}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {children && <p className="mt-1 max-w-xs text-sm text-ink-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Banner({ tone = 'info', children, className = '' }) {
  const tones = {
    info: 'border-brand-200 bg-mint text-brand-800',
    warn: 'border-butter bg-butter/50 text-ink-700',
    error: 'border-tomato/30 bg-tomato/10 text-tomato',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`} role="status">
      {children}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Indlæser"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden p-4">
      <div className="skeleton mb-3 h-5 w-2/3 rounded" />
      <div className="skeleton mb-2 h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
    </div>
  );
}
