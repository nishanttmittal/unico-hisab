/**
 * Firebase service for UNICO Hisab. Shares the `unico-operations` project under
 * its own namespace so a future combined dashboard can read every app uniformly:
 *   apps/hisab/suppliers/{id}  ← suppliers we owe (udhaar)
 *   apps/hisab/ledger/{id}     ← one purchase / payment / adjustment on a supplier
 *   apps/hisab/expenses/{id}   ← one daily kharcha line
 *   apps/hisab/users/{id}      ← access allowlist
 * Offline-capable (persistent cache) so it works without internet, then syncs.
 */
import { initializeApp } from 'firebase/app'
import {
  initializeFirestore, collection, doc,
  persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore'
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  GoogleAuthProvider, signInWithPopup,
} from 'firebase/auth'
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig'

const APP_NS = 'hisab'

let app = null
let db = null
let auth = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    experimentalAutoDetectLongPolling: true,
  })
  auth = getAuth(app)
}

export { app, db, auth, isFirebaseConfigured, APP_NS }

const coll = (name) => collection(db, 'apps', APP_NS, name)
const cdoc = (name, id) => doc(db, 'apps', APP_NS, name, id)

export const paths = {
  suppliers: () => coll('suppliers'),
  supplier: (id) => cdoc('suppliers', id),
  ledger: () => coll('ledger'),
  ledgerDoc: (id) => cdoc('ledger', id),
  expenses: () => coll('expenses'),
  expense: (id) => cdoc('expenses', id),
  users: () => coll('users'),
  user: (id) => cdoc('users', id),
}

export function ensureSignedIn() {
  return new Promise((resolve, reject) => {
    if (!auth) return reject(new Error('Firebase not configured'))
    // Wait for the first auth state; only take the anonymous baseline when there
    // is truly NO user (never replace a restored Google session — the login loop).
    let triedAnon = false
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user.uid); return }
      if (!triedAnon) { triedAnon = true; signInAnonymously(auth).catch((e) => { unsub(); reject(e) }) }
    })
  })
}

/**
 * Sign in with Google. On an installed home-screen PWA (iOS/Android standalone),
 * a popup can never message back and hangs forever — go straight to full-page
 * redirect there; otherwise try popup and fall back to redirect if it's blocked.
 */
export async function signInWithGoogle() {
  if (!auth) throw new Error('Cloud not configured')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const standalone = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true)
  if (standalone) {
    const { signInWithRedirect } = await import('firebase/auth')
    return signInWithRedirect(auth, provider)
  }
  try {
    return await signInWithPopup(auth, provider)
  } catch (e) {
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/cancelled-popup-request' || e?.code === 'auth/operation-not-supported-in-this-environment') {
      const { signInWithRedirect } = await import('firebase/auth')
      return signInWithRedirect(auth, provider)
    }
    throw e
  }
}

export function signOutUser() { return auth ? auth.signOut() : Promise.resolve() }

export function watchAuth(cb) {
  if (!auth) { cb(null); return () => {} }
  return onAuthStateChanged(auth, cb)
}
