import { Check, LogOut, RotateCcw, Bookmark } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useNav } from '../../App';
import { DIETARY_PREFERENCES, ALLERGIES } from '../../lib/constants';
import { ScreenHeader, TagInput, ToggleChip } from '../ui';
import { AVOID_SUGGESTIONS, PANTRY_SUGGESTIONS, splitPreferenceTerms } from '../../lib/preferences';

const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export default function ProfileScreen() {
  const {
    user,
    dietaryPreferences,
    allergies,
    customAvoids,
    pantryItems,
    savedRecipes,
    updateProfile,
    logout,
    resetDemo,
  } = useStore();
  const { navigate } = useNav();

  const initials =
    user?.name
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'KS';

  return (
    <div className="animate-fade-in pb-4">
      <ScreenHeader title="Profil" />

      {/* Identity */}
      <div className="surface mb-6 flex items-center gap-4 p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-lg font-extrabold text-white shadow-float">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-ink-900">{user?.name}</p>
          <p className="truncate text-sm text-ink-500">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('saved')}
          className="ml-auto flex shrink-0 flex-col items-center rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-brand-700"
        >
          <span className="flex items-center gap-1 text-lg font-extrabold leading-none">
            <Bookmark size={15} /> {savedRecipes.length}
          </span>
          <span className="text-[10px] font-medium uppercase">Gemt</span>
        </button>
      </div>

      <Section title="Kostpræferencer" hint="Bruges til at filtrere alle opskrifter.">
        <ChipGrid
          options={DIETARY_PREFERENCES}
          selected={dietaryPreferences}
          onToggle={(id) => updateProfile({ dietaryPreferences: toggle(dietaryPreferences, id) })}
        />
      </Section>

      <Section title="Allergier" hint="Vi afviser opskrifter, der indeholder dem. Kontrollér altid emballagens allergenoplysninger.">
        <ChipGrid
          options={ALLERGIES}
          selected={allergies}
          onToggle={(id) => updateProfile({ allergies: toggle(allergies, id) })}
        />
      </Section>

      <Section title="Specifikke begrænsninger" hint="Tilføj ingredienser eller hensyn, vi altid skal udelukke.">
        <TagInput
          values={splitPreferenceTerms(customAvoids)}
          suggestions={AVOID_SUGGESTIONS}
          placeholder="Tilføj noget, du vil undgå"
          ariaLabel="Tilføj specifik begrænsning"
          onChange={(values) => updateProfile({ customAvoids: values.join(', ') })}
        />
      </Section>

      <Section title="Har hjemme" hint="Tilføj ingredienser du allerede har, så de fjernes fra indkøbslisten.">
        <TagInput
          values={pantryItems || []}
          suggestions={PANTRY_SUGGESTIONS}
          placeholder="Tilføj en ingrediens hjemme"
          ariaLabel="Tilføj ingrediens hjemme"
          onChange={(values) => updateProfile({ pantryItems: values })}
        />
      </Section>

      {/* Account */}
      <div className="mt-8 space-y-2.5">
        <button type="button" onClick={logout} className="btn-secondary w-full justify-start">
          <LogOut size={18} /> Log ud
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Nulstil demoen? Alle lokale data slettes.')) resetDemo();
          }}
          className="btn w-full justify-start text-red-600 hover:bg-red-50"
        >
          <RotateCcw size={18} /> Nulstil demo-data
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="mb-6">
      <h2 className="section-label">{title}</h2>
      {hint && <p className="mb-3 mt-0.5 text-xs text-ink-400">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
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
