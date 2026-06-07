// Firebase Auth (Google + Email/Password) for KøbSmart.
//
// The web apiKey below is a public client identifier (NOT a secret) — Firebase
// security is enforced by Auth + rules, not by hiding this value.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAZFS_ZGECE_mX00O826gKAoHEPVXvQdqw',
  authDomain: 'kobsmart.firebaseapp.com',
  projectId: 'kobsmart',
  storageBucket: 'kobsmart.firebasestorage.app',
  messagingSenderId: '1007208832150',
  appId: '1:1007208832150:web:7edbd0afdd77a05bf536b7',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Keep the user signed in across reloads/tabs.
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* falls back to in-memory persistence (e.g. strict privacy mode) */
});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/** Subscribe to auth-state changes. Returns an unsubscribe fn. */
export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function emailSignUp({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });
  return cred.user;
}

export function emailSignIn({ email, password }) {
  return signInWithEmailAndPassword(auth, email, password).then((c) => c.user);
}

export function googleSignIn() {
  return signInWithPopup(auth, googleProvider).then((c) => c.user);
}

export function logOut() {
  return signOut(auth);
}

/** Map Firebase error codes to short Danish messages for the UI. */
export function friendlyAuthError(err) {
  const code = err && err.code ? err.code : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Ugyldig e-mailadresse.';
    case 'auth/missing-password':
      return 'Skriv en adgangskode.';
    case 'auth/weak-password':
      return 'Adgangskoden skal være mindst 6 tegn.';
    case 'auth/email-already-in-use':
      return 'Der findes allerede en konto med denne e-mail. Log ind i stedet.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Forkert e-mail eller adgangskode.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google-login blev afbrudt.';
    case 'auth/popup-blocked':
      return 'Pop op blev blokeret — tillad pop op og prøv igen.';
    case 'auth/network-request-failed':
      return 'Netværksfejl — tjek din forbindelse.';
    case 'auth/operation-not-allowed':
      return 'Denne login-metode er ikke aktiveret endnu.';
    default:
      return 'Login mislykkedes. Prøv igen.';
  }
}
