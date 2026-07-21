/**
 * AuthGate — Google sign-in gated to the owner allowlist (single-owner app).
 * The provider already signs the device in anonymously for offline sync; this
 * requires a real Google login as the owner before showing any money data.
 */
import { useEffect, useState } from 'react'
import { useHisab, isOwnerEmail } from './cloud'

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7a1f2b] to-[#3d0d15] flex flex-col items-center justify-center p-6 text-white text-center"
      style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>{children}</div>
  )
}

export default function AuthGate({ children }) {
  const { user, email, signIn, signOut } = useHisab()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Surface an error from the signInWithRedirect return leg (installed PWA).
  useEffect(() => {
    import('firebase/auth').then(({ getRedirectResult, getAuth }) =>
      getRedirectResult(getAuth()).catch((e) => setErr(e?.message || 'Google sign-in failed — try again')),
    ).catch(() => {})
  }, [])

  const doSignIn = async () => {
    setBusy(true); setErr('')
    try { await signIn() } catch (e) { setErr(e?.message || 'Sign-in failed') } finally { setBusy(false) }
  }

  if (user === undefined) {
    return <Screen><div className="text-2xl">🔐</div><div className="text-sm text-white/70 mt-2">Checking sign-in…</div></Screen>
  }

  // Signed in with Google AND is the owner → render the app.
  if (email && isOwnerEmail(email)) return children

  // Signed in with Google but not the owner.
  if (email && !isOwnerEmail(email)) {
    return (
      <Screen>
        <div className="text-4xl mb-3">🚫</div>
        <h1 className="text-xl font-bold">No access</h1>
        <p className="text-white/70 text-sm mt-2 max-w-xs">{email} is not authorised for UNICO Hisab.</p>
        <button onClick={signOut} className="mt-6 bg-white/15 rounded-xl px-5 py-2.5 font-bold text-sm">Use a different account</button>
      </Screen>
    )
  }

  // Anonymous baseline → sign-in screen.
  return (
    <Screen>
      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-2.5 mb-4 shadow-xl">
        <img src={`${import.meta.env.BASE_URL}unico-logo.png`} alt="UNICO" className="max-w-full max-h-full object-contain" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">UNICO Hisab</h1>
      <p className="text-white/70 text-sm mt-1 mb-8">Sign in to continue</p>
      <button onClick={doSignIn} disabled={busy}
        className="w-full max-w-xs bg-white text-slate-800 rounded-2xl px-6 py-4 font-bold shadow-xl active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-3">
        <span className="text-lg">🟦</span>{busy ? 'Opening…' : 'Sign in with Google'}
      </button>
      {err && <p className="text-red-200 text-xs mt-4 max-w-xs">{err}</p>}
    </Screen>
  )
}
