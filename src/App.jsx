import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { UtensilsCrossed, ListChecks, User } from 'lucide-react';
import { useStore } from './lib/store';
import { Logo } from './components/ui';
import AuthScreen from './components/auth/AuthScreen';
import SetupWizard from './components/auth/SetupWizard';
import PlanMealScreen from './components/screens/PlanMealScreen';
import IngredientPlanScreen from './components/screens/IngredientPlanScreen';
import RouteScreen from './components/screens/RouteScreen';
import ProfileScreen from './components/screens/ProfileScreen';

const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);

const NAV_ITEMS = [
  { id: 'plan', label: 'Måltider', icon: UtensilsCrossed },
  { id: 'ingredients', label: 'Varer', icon: ListChecks },
  { id: 'profile', label: 'Profil', icon: User },
];

export default function App() {
  const { user, setupComplete } = useStore();
  const [route, setRoute] = useState('plan');
  const [params, setParams] = useState({});

  const navigate = useCallback((next, nextParams = {}) => {
    setRoute(next);
    setParams(nextParams);
    window.scrollTo({ top: 0 });
  }, []);

  const nav = useMemo(() => ({ route, params, navigate }), [route, params, navigate]);

  // Auth gate → setup gate → app.
  if (!user) return <AuthScreen />;
  if (!setupComplete) return <SetupWizard />;

  return (
    <NavContext.Provider value={nav}>
      <div className="min-h-full lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
        <SideRail active={route} onNavigate={navigate} />
        <div className="min-w-0">
          <TopBar />
          <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            <Screen route={route} />
          </main>
        </div>
        <BottomNav active={route} onNavigate={navigate} />
      </div>
    </NavContext.Provider>
  );
}

function Screen({ route }) {
  switch (route) {
    case 'plan':
      return <PlanMealScreen />;
    case 'ingredients':
      return <IngredientPlanScreen />;
    case 'route':
      return <RouteScreen />;
    case 'profile':
      return <ProfileScreen />;
    default:
      return <PlanMealScreen />;
  }
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-cream/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="lg:hidden">
          <Logo size="sm" />
        </div>
        <div className="hidden min-w-0 lg:block">
          <p className="section-label">KøbSmart demo</p>
          <p className="truncate text-sm font-semibold text-ink-900">Aftensmad fra dagens tilbud. Ruten følger med.</p>
        </div>
      </div>
    </header>
  );
}

function SideRail({ active, onNavigate }) {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-border bg-cream/75 px-4 py-5 backdrop-blur lg:block">
      <div className="flex h-full flex-col">
        <Logo size="md" />
        <nav className="mt-8 space-y-1.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-ink-500 hover:bg-paper hover:text-ink-900'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function BottomNav({ active, onNavigate }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
