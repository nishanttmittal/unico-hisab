/**
 * UNICO Hisab — factory money register. Single-owner PWA, Firebase-synced.
 *   • Kharcha  — daily factory expenses (categorised, advances/material split)
 *   • Udhaar   — supplier payables (per-supplier running ledger)
 * Google sign-in (owner allowlist); data in Firestore (apps/hisab/*), realtime
 * across devices + offline-capable. No money data in the public bundle.
 */
import { useState } from 'react'
import { HisabProvider, useHisab } from './modules/hisab/cloud'
import AuthGate from './modules/hisab/AuthGate'
import Home from './modules/hisab/Home'
import Expenses from './modules/hisab/Expenses'
import Suppliers from './modules/hisab/Suppliers'

const TABS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'kharcha', label: 'Kharcha', icon: '💸' },
  { key: 'udhaar', label: 'Udhaar', icon: '🧾' },
]

function Shell() {
  const [tab, setTab] = useState('home')
  const { suppliers, ledger, expenses, email, signOut } = useHisab()

  return (
    <div className="min-h-screen bg-[#f8f6f2] pb-20">
      <header className="bg-gradient-to-r from-[#7a1f2b] to-[#5c1420] text-white px-5 no-print"
        style={{ paddingTop: 'calc(0.9rem + env(safe-area-inset-top))', paddingBottom: '0.9rem' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl">₹</div>
          <div className="flex-1">
            <div className="font-bold leading-tight text-lg">UNICO Hisab</div>
            <div className="text-white/70 text-xs">Factory paisa — udhaar &amp; kharcha</div>
          </div>
          <button onClick={signOut} title={email} className="text-white/70 text-xs bg-white/10 rounded-lg px-2.5 py-1.5 font-semibold">Sign out</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {tab === 'home' && <Home suppliers={suppliers} ledger={ledger} expenses={expenses} go={setTab} />}
        {tab === 'kharcha' && <Expenses expenses={expenses} />}
        {tab === 'udhaar' && <Suppliers suppliers={suppliers} ledger={ledger} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex no-print z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-bold ${tab === t.key ? 'text-[#7a1f2b]' : 'text-slate-400'}`}>
            <span className="text-xl">{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <HisabProvider>
      <AuthGate>
        <Shell />
      </AuthGate>
    </HisabProvider>
  )
}
