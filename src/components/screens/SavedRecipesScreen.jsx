import { useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { useNav } from '../../App';
import { deriveRecipe } from '../../lib/offers';
import { ScreenHeader, EmptyState } from '../ui';
import RecipeCard from '../RecipeCard';
import RecipeDetail from '../RecipeDetail';

// Saved entries keep everything needed to view + re-route without regenerating.
// deriveRecipe refreshes totals/stores from each ingredient's selected option.
const normalize = (r) => deriveRecipe(r);

export default function SavedRecipesScreen() {
  const { savedRecipes, removeRecipe, updateSavedRecipe } = useStore();
  const { params, navigate } = useNav();
  const [openId, setOpenId] = useState(params?.savedId || null);

  const active = openId ? savedRecipes.find((r) => r.savedId === openId) : null;

  if (active) {
    const recipe = normalize(active);
    const selectOption = (ingredientIndex, offerId) => {
      const ingredients = active.ingredients.map((ing, i) =>
        i === ingredientIndex ? { ...ing, selectedOfferId: offerId } : ing,
      );
      updateSavedRecipe(active.savedId, deriveRecipe({ ...active, ingredients }));
    };
    return (
      <div>
        <RecipeDetail
          recipe={recipe}
          saved
          onBack={() => setOpenId(null)}
          onSave={() => {
            removeRecipe(active.savedId);
            setOpenId(null);
          }}
          onRoute={() => navigate('list', { recipe })}
          onSelectOption={selectOption}
        />
        <p className="px-1 pb-4 text-center text-xs text-ink-400">Tryk på “Gemt” for at fjerne opskriften.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ScreenHeader title="Gemte måltider" subtitle={`${savedRecipes.length} gemt`} />

      {savedRecipes.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Ingen gemte opskrifter"
          action={
            <button type="button" className="btn-primary" onClick={() => navigate('plan')}>
              Planlæg et måltid
            </button>
          }
        >
          Når du gemmer en opskrift, samles navn, ingredienser, butikker og prisestimat her.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {savedRecipes.map((r) => (
            <div key={r.savedId} className="relative">
              <RecipeCard recipe={normalize(r)} onClick={() => setOpenId(r.savedId)} />
              <button
                type="button"
                onClick={() => removeRecipe(r.savedId)}
                aria-label="Fjern opskrift"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
