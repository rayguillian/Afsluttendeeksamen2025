import { ChevronRight, Clock, Store, Tag } from 'lucide-react';
import { formatPrice, formatDuration } from '../lib/format';
import { mealImage } from '../lib/mealImages';

export default function RecipeCard({ recipe, onClick }) {
  const hasPrice = Number(recipe.totalEstimate) > 0 && (recipe.stores?.length || 0) > 0 && (recipe.matchedCount || 0) > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="card group grid w-full overflow-hidden p-0 text-left transition-colors hover:border-brand-300 sm:grid-cols-[150px_minmax(0,1fr)]"
    >
      <div className="relative min-h-36 bg-paper sm:min-h-full">
        <img src={mealImage(recipe)} alt="" className="h-full w-full object-cover" />
        {recipe.totalSaving > 0 && (
          <span className="absolute left-3 top-3 savings-pill">
            <Tag size={12} /> spar {formatPrice(recipe.totalSaving)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="meal-title min-w-0 text-xl">{recipe.name}</h3>
            <ChevronRight size={18} className="mt-1 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          {recipe.description && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">{recipe.description}</p>}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ink-500">
            <span className={hasPrice ? 'font-extrabold text-ink-900' : ''}>{hasPrice ? formatPrice(recipe.totalEstimate) : 'Ingen prisdata'}</span>
            <span className="inline-flex items-center gap-1"><Store size={13} /> {recipe.stores?.length || 0} butikker</span>
            <span className="inline-flex items-center gap-1"><Clock size={13} /> {recipe.time ? formatDuration(recipe.time) : 'hurtig'}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {recipe.dietTags?.slice(0, 2).map((tag) => (
              <span key={tag} className="preference-chip">{tag}</span>
            ))}
            {recipe.homeCount > 0 && <span className="pantry-chip">{recipe.homeCount} hjemme</span>}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-bold text-brand-700">
          <span>Se opskrift og indkøbsplan</span>
          <ChevronRight size={17} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}
