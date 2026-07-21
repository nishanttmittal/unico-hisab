/**
 * UNICO Hisab — factory money register. Single-owner, local-first PWA.
 *   • Kharcha  — daily factory expenses (categorised, advances/material split)
 *   • Udhaar   — supplier payables (per-supplier running ledger)
 * Data lives on THIS device (localStorage). Firebase sync is a later swap
 * (the storage adapter is built for it) — see README.
 */
import { useState } from 'react'
import { PasswordGate } from './core/ui'
import { useCollection } from './core/hooks/useCollection'
import { suppliersRepo, ledgerRepo, expensesRepo } from './modules/hisab/data'
import Home from './modules/hisab/Home'
import Expenses from './modules/hisab/Expenses'
import Suppliers from './modules/hisab/Suppliers'

// Local-device gate. Change here (or ask Claude) — data is on-device, so this
// only stops someone casually opening the app on your phone.
const PASSWORD = ['unico', 'nsp']

const TABS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'kharcha', label: 'Kharcha', icon: '💸' },
  { key: 'udhaar', label: 'Udhaar', icon: '🧾' },
]

function Shell() {
  const [tab, setTab] = useState('home')
  const suppliers = useCollection(suppliersRepo)
  const ledger = useCollection(ledgerRepo)
  const expenses = useCollection(expensesRepo)

  return (
    <div className="min-h-screen bg-[#f8f6f2] pb-20">
      <header className="bg-gradient-to-r from-[#7a1f2b] to-[#5c1420] text-white px-5 no-print"
        style={{ paddingTop: 'calc(0.9rem + env(safe-area-inset-top))', paddingBottom: '0.9rem' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl">₹</div>
          <div>
            <div className="font-bold leading-tight text-lg">UNICO Hisab</div>
            <div className="text-white/70 text-xs">Factory paisa — udhaar &amp; kharcha</div>
          </div>
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
    <PasswordGate password={PASSWORD} title="UNICO Hisab">
      <Shell />
    </PasswordGate>
  )
}
