import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { DEFAULT_ROUTE_PREFERENCES } from './constants';
import { watchAuth, emailSignUp, emailSignIn, googleSignIn, logOut } from './firebase';

// localStorage namespace for per-browser profile/preferences state. Account
// identity comes from Firebase Auth (Google / Email-Password); guests are local.
const STORAGE_KEY = 'kobsmart:v1';

const EMPTY_STATE = {
  version: 1,
  user: null, // { id, name, email, createdAt }
  setupComplete: false,
  dietaryPreferences: [], // string[] of DIETARY_PREFERENCES ids
  allergies: [], // string[] of ALLERGIES ids
  customAvoids: '', // free-text dietary restrictions, e.g. "sesame, alcohol"
  pantryItems: [], // ingredients the user already has at home
  routePreferences: { ...DEFAULT_ROUTE_PREFERENCES },
  preferredStores: [], // string[] of chain names
  savedRecipes: [], // [{ id, name, cuisine, ingredients, stores, totalEstimate, totalSaving, savedAt }]
  lastPlan: null, // { cuisine, recipes, selectedRecipeId, location, createdAt } — DISCOVERY layer (disposable suggestions)
  activePlan: null, // EXECUTION layer — the one meal the user committed to: { recipe, status, bought[], startedAt }
};

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_STATE,
      ...parsed,
      routePreferences: { ...DEFAULT_ROUTE_PREFERENCES, ...(parsed.routePreferences || {}) },
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(readState);
  const hydrated = useRef(false);

  // Persist after first render (avoid clobbering on initial mount).
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode — demo keeps running from memory */
    }
  }, [state]);

  const patch = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...(typeof updates === 'function' ? updates(prev) : updates) }));
  }, []);

  // Firebase Auth is the source of truth for real accounts. Guests stay local.
  useEffect(() => {
    const unsub = watchAuth((fbUser) => {
      if (fbUser) {
        setState((prev) => ({
          ...prev,
          user: {
            id: fbUser.uid,
            name:
              fbUser.displayName ||
              prev.user?.name ||
              (fbUser.email ? fbUser.email.split('@')[0] : 'Bruger'),
            email: fbUser.email || '',
            photoURL: fbUser.photoURL || null,
            provider: fbUser.providerData?.[0]?.providerId || 'password',
            createdAt: prev.user?.createdAt || Date.now(),
          },
        }));
      } else {
        // Signed out of Firebase: keep an active guest session, clear real users.
        setState((prev) => (prev.user && prev.user.guest ? prev : { ...prev, user: null }));
      }
    });
    return unsub;
  }, []);

  const actions = useMemo(
    () => ({
      /** Email/password signup. onAuthStateChanged sets the user; setup runs once. */
      async signup({ name, email, password }) {
        await emailSignUp({ name, email, password });
        patch({ setupComplete: false }); // a fresh account always runs setup
      },

      /** Email/password login. */
      async login({ email, password }) {
        await emailSignIn({ email, password });
      },

      /** Google login (popup). */
      async loginWithGoogle() {
        await googleSignIn();
      },

      /** Anonymous tester flow — no account, local-only state. */
      continueAsGuest() {
        patch({
          user: { id: `guest-${uuid()}`, name: 'Gæst', email: '', guest: true, createdAt: Date.now() },
          setupComplete: true,
        });
      },

      async logout() {
        try {
          await logOut();
        } catch {
          /* ignore network errors on sign-out */
        }
        patch({ user: null });
      },

      completeSetup({ dietaryPreferences, allergies, customAvoids, pantryItems, routePreferences, preferredStores }) {
        patch((prev) => ({
          dietaryPreferences: dietaryPreferences ?? prev.dietaryPreferences,
          allergies: allergies ?? prev.allergies,
          customAvoids: customAvoids ?? prev.customAvoids,
          pantryItems: pantryItems ?? prev.pantryItems,
          routePreferences: { ...prev.routePreferences, ...(routePreferences || {}) },
          preferredStores: preferredStores ?? prev.preferredStores,
          setupComplete: true,
        }));
      },

      updateProfile(updates) {
        patch((prev) => ({
          ...('dietaryPreferences' in updates ? { dietaryPreferences: updates.dietaryPreferences } : {}),
          ...('allergies' in updates ? { allergies: updates.allergies } : {}),
          ...('customAvoids' in updates ? { customAvoids: updates.customAvoids } : {}),
          ...('pantryItems' in updates ? { pantryItems: updates.pantryItems } : {}),
          ...('preferredStores' in updates ? { preferredStores: updates.preferredStores } : {}),
          routePreferences: { ...prev.routePreferences, ...(updates.routePreferences || {}) },
        }));
      },

      setLastPlan(plan) {
        patch({ lastPlan: plan ? { ...plan, createdAt: Date.now() } : null });
      },

      // ---- ACTIVE PLAN (execution layer) ----
      // The flow's spine. One committed meal carried across Liste → Rute → Cook.
      // status: 'planning' (deciding/list) → 'shopping' (route) → 'cooking' → 'done'.

      /** Commit a recipe to the active flow. Keeps progress if re-entering the same meal. */
      startPlan(recipe) {
        patch((prev) => {
          if (prev.activePlan?.recipe?.id === recipe.id) {
            return { activePlan: { ...prev.activePlan, recipe } };
          }
          return { activePlan: { recipe, status: 'planning', bought: [], startedAt: Date.now() } };
        });
      },

      /** Replace the plan's recipe (e.g. after a pantry/store recalc) without losing progress. */
      updatePlanRecipe(recipe) {
        patch((prev) => (prev.activePlan ? { activePlan: { ...prev.activePlan, recipe } } : {}));
      },

      setPlanStatus(status) {
        patch((prev) => (prev.activePlan ? { activePlan: { ...prev.activePlan, status } } : {}));
      },

      /** Mark/unmark an item as bought (during shopping). Shared across screens. */
      toggleBought(key) {
        patch((prev) => {
          if (!prev.activePlan) return {};
          const set = new Set(prev.activePlan.bought || []);
          set.has(key) ? set.delete(key) : set.add(key);
          return { activePlan: { ...prev.activePlan, bought: [...set] } };
        });
      },

      clearPlan() {
        patch({ activePlan: null });
      },

      saveRecipe(recipe) {
        const id = recipe.savedId || uuid();
        const entry = {
          savedId: id,
          id: recipe.id,
          name: recipe.name,
          cuisine: recipe.cuisine,
          dietTags: recipe.dietTags || [],
          time: recipe.time,
          servings: recipe.servings,
          description: recipe.description,
          steps: recipe.steps || [],
          sources: recipe.sources || [],
          ingredients: recipe.ingredients || [],
          stores: recipe.stores || [],
          matchedCount: recipe.matchedCount ?? (recipe.ingredients || []).filter((i) => i.matched).length,
          totalCount: recipe.totalCount ?? (recipe.ingredients || []).length,
          totalEstimate: recipe.totalEstimate || 0,
          totalSaving: recipe.totalSaving || 0,
          homeCount: recipe.homeCount || 0,
          savedAt: Date.now(),
        };
        patch((prev) => ({ savedRecipes: [entry, ...prev.savedRecipes.filter((r) => r.savedId !== id)] }));
        return id;
      },

      /** Update a saved recipe in place (e.g. after swapping a store option). */
      updateSavedRecipe(savedId, recipe) {
        patch((prev) => ({
          savedRecipes: prev.savedRecipes.map((r) => (r.savedId === savedId ? { ...r, ...recipe, savedId } : r)),
        }));
      },

      removeRecipe(savedId) {
        patch((prev) => ({ savedRecipes: prev.savedRecipes.filter((r) => r.savedId !== savedId) }));
      },

      resetDemo() {
        localStorage.removeItem(STORAGE_KEY);
        setState({ ...EMPTY_STATE });
      },
    }),
    [patch],
  );

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
