import { useState } from 'react';
import { Mail, User, Lock, ArrowRight, ListChecks, MapPinned, PiggyBank, UtensilsCrossed } from 'lucide-react';
import { useStore } from '../../lib/store';
import { friendlyAuthError } from '../../lib/firebase';
import { Logo, Spinner } from '../ui';
import { mealImage } from '../../lib/mealImages';

// Real auth (Firebase): Google + Email/Password, with a local "guest" fallback
// so reviewers can open the app without an account.
export default function AuthScreen() {
  const { signup, login, loginWithGoogle, continueAsGuest } = useStore();
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const isSignup = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (isSignup && !form.name.trim()) return setError('Skriv dit navn.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Skriv en gyldig e-mail.');
    if (form.password.length < 6) return setError('Adgangskode skal være mindst 6 tegn.');

    setBusy(true);
    try {
      if (isSignup) await signup({ name: form.name, email: form.email, password: form.password });
      else await login({ email: form.email, password: form.password });
      // onAuthStateChanged swaps this screen out on success.
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <aside className="relative hidden min-h-full overflow-hidden bg-brand-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <img
          src={mealImage({ name: 'aftensmad grønt tilbud' })}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-brand-900/[0.7]" />
        <div className="relative">
          <Logo size="lg" withWordmark={false} />
        </div>
        <div className="relative">
          <p className="mb-3 text-sm font-bold uppercase text-mint">KøbSmart</p>
          <h2 className="max-w-lg font-serif text-5xl font-extrabold leading-tight">
            Aftensmad fra dagens tilbud. Ruten følger med.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/[0.82]">
            KøbSmart tager højde for præferencer, pantry og foretrukne butikker, før du får en indkøbsliste og en rundtur.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <Value icon={UtensilsCrossed}>Måltider bygget på dagens tilbud</Value>
            <Value icon={PiggyBank}>Synlig besparelse før du handler</Value>
            <Value icon={MapPinned}>Rundtur på åbent kort</Value>
          </ul>
        </div>
        <p className="relative text-xs text-white/70">Log ind med Google eller e-mail · præferencer gemmes lokalt i din browser.</p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>

          <h1 className="meal-title text-3xl">
            {isSignup ? 'Prøv KøbSmart' : 'Velkommen tilbage'}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {isSignup ? 'Opret en konto, log ind med Google, eller fortsæt som gæst.' : 'Log ind for at fortsætte.'}
          </p>

          <button
            type="button"
            className="btn-secondary mt-7 w-full"
            onClick={onGoogle}
            disabled={busy}
          >
            <GoogleIcon /> Fortsæt med Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-400">
            <span className="h-px flex-1 bg-ink-200" /> eller med e-mail <span className="h-px flex-1 bg-ink-200" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {isSignup && (
              <Field icon={User} label="Navn">
                <input
                  className="input pl-11"
                  placeholder="Dit navn"
                  value={form.name}
                  onChange={set('name')}
                  autoComplete="name"
                />
              </Field>
            )}
            <Field icon={Mail} label="E-mail">
              <input
                className="input pl-11"
                type="email"
                placeholder="dig@eksempel.dk"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
            </Field>
            <Field icon={Lock} label="Adgangskode">
              <input
                className="input pl-11"
                type="password"
                placeholder="••••••"
                value={form.password}
                onChange={set('password')}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </Field>

            {error && (
              <p className="text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? <Spinner /> : <>{isSignup ? 'Opret profil' : 'Log ind'}<ArrowRight size={18} /></>}
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={continueAsGuest}
              disabled={busy}
            >
              <ListChecks size={18} /> Fortsæt uden login
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            {isSignup ? 'Har du allerede en demo-profil?' : 'Ny her?'}{' '}
            <button
              type="button"
              className="font-semibold text-brand-600 hover:text-brand-700"
              onClick={() => {
                setError('');
                setMode(isSignup ? 'login' : 'signup');
              }}
            >
              {isSignup ? 'Log ind' : 'Opret profil'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8.9 20-20 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 36.5 44 31 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        {children}
      </span>
    </label>
  );
}

function Value({ icon: Icon, children }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-white/10">
        <Icon size={16} />
      </span>
      {children}
    </li>
  );
}
