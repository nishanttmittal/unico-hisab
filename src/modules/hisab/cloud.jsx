/**
 * Firestore-backed state for UNICO Hisab — realtime, multi-device, offline-capable.
 * Exposes the SAME shape the screens already use ({ list, insert, update, remove,
 * replaceAll, refresh }) so Home/Expenses/Suppliers work unchanged. Single owner:
 * anonymous baseline for sync, then Google login gated to the owner allowlist.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onSnapshot, setDoc, deleteDoc, getDocs, writeBatch, collection, addDoc } from 'firebase/firestore'
import { db, paths, ensureSignedIn, watchAuth, signInWithGoogle, signOutUser } from '../../core/db/firebase'
import { makeId } from '../../core/db/repository'

export const OWNER_EMAILS = ['nspenterprises24@gmail.com']
export const isOwnerEmail = (email) => !!email && OWNER_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase())

/** Realtime binding for one collection. Re-subscribes when the signed-in user
 *  changes (anon → Google). Permission-denied leaves the list empty (pre-login). */
function useCloudCollection(collPathFn, docPathFn, authKey) {
  const [list, setList] = useState([])
  useEffect(() => {
    const unsub = onSnapshot(
      collPathFn(),
      (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setList([]),
    )
    return unsub
  }, [authKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    list,
    refresh: () => {}, // realtime — no manual refresh needed
    insert: (rec) => {
      const id = rec.id || makeId('r')
      const now = new Date().toISOString()
      const row = { createdAt: now, updatedAt: now, ...rec, id }
      row.saved = setDoc(docPathFn(id), row)
      return row
    },
    update: (id, patch) => setDoc(docPathFn(id), { ...patch, updatedAt: new Date().toISOString() }, { merge: true }),
    remove: (id) => deleteDoc(docPathFn(id)),
    replaceAll: async (rows) => {
      const ex = await getDocs(collPathFn())
      const b1 = writeBatch(db); ex.forEach((d) => b1.delete(d.ref)); await b1.commit()
      const b2 = writeBatch(db); (rows || []).forEach((r) => { const id = r.id || makeId('r'); b2.set(docPathFn(id), { ...r, id }) }); await b2.commit()
    },
  }
}

const HisabCtx = createContext(null)
export const useHisab = () => useContext(HisabCtx)

export function HisabProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading
  const authKey = user === undefined ? 'loading' : (user?.uid || 'anon')

  useEffect(() => { ensureSignedIn().catch(() => {}) }, [])
  useEffect(() => watchAuth(setUser), [])

  const suppliers = useCloudCollection(paths.suppliers, paths.supplier, authKey)
  const ledger = useCloudCollection(paths.ledger, paths.ledgerDoc, authKey)
  const expenses = useCloudCollection(paths.expenses, paths.expense, authKey)
  const uploads = useCloudCollection(paths.uploads, paths.upload, authKey)

  // Advance-push destinations: welders (apps/welder/welders) + salary workers
  // (att_salary). The owner login can read both; best-effort (empty if denied).
  const email = user && !user.isAnonymous ? (user.email || '') : ''
  const [targets, setTargets] = useState({ welders: [], salary: [] })
  useEffect(() => {
    if (!email) { setTargets({ welders: [], salary: [] }); return }
    let alive = true
    ;(async () => {
      const out = { welders: [], salary: [] }
      try {
        const w = await getDocs(collection(db, 'apps', 'welder', 'welders'))
        out.welders = w.docs.map((d) => ({ name: d.data().name || d.id })).filter((x) => x.name)
      } catch { /* denied/offline */ }
      try {
        const s = await getDocs(collection(db, 'att_salary'))
        out.salary = s.docs.map((d) => ({ code: d.id, name: d.data().name || d.id }))
          .filter((x) => x.name && x.code !== '_config').sort((a, b) => a.name.localeCompare(b.name))
      } catch { /* denied/offline */ }
      if (alive) setTargets(out)
    })()
    return () => { alive = false }
  }, [email]) // eslint-disable-line react-hooks/exhaustive-deps

  const pushAdvance = useCallback((t) => addDoc(collection(db, 'hisab_advance_outbox'), {
    target: t.target, name: t.name || '', code: t.code || '',
    amount: Number(t.amount) || 0, date: t.date || '', note: t.note || '',
    status: 'pending', source: 'hisab', createdAt: new Date().toISOString(),
  }), [])

  const value = {
    user, email,
    signIn: useCallback(() => signInWithGoogle(), []),
    signOut: useCallback(() => signOutUser(), []),
    suppliers, ledger, expenses, uploads,
    advanceTargets: targets, pushAdvance,
  }
  return <HisabCtx.Provider value={value}>{children}</HisabCtx.Provider>
}
