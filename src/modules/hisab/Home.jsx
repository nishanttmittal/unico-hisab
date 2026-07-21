/**
 * Home — the money at a glance: total owed to suppliers + this month's spend,
 * with two big buttons into Kharcha (expenses) and Udhaar (suppliers), plus
 * Backup / Import (data lives only on this device).
 */
import { useRef, useState } from 'react'
import { totalPayable, expenseSummary, monthOf, fmtMonth, rupee } from './logic'

export default function Home({ suppliers, ledger, expenses, go }) {
  const owed = totalPayable(suppliers.list, ledger.list)
  const nowYm = expenses.list.length
    ? monthOf([...expenses.list].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].date)
    : ''
  const thisMonth = expenses.list.filter((e) => monthOf(e.date) === nowYm)
  const s = expenseSummary(thisMonth)
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  const doExport = () => {
    const data = { app: 'unico-hisab', version: 1, exportedAt: new Date().toISOString(),
      suppliers: suppliers.list, ledger: ledger.list, expenses: expenses.list }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `unico-hisab-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }
  const doImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!data || data.app !== 'unico-hisab') throw new Error('Not a UNICO Hisab data file')
      if (!confirm('Import will REPLACE all current data with the file. Continue?')) return
      await suppliers.replaceAll(Array.isArray(data.suppliers) ? data.suppliers : [])
      await ledger.replaceAll(Array.isArray(data.ledger) ? data.ledger : [])
      await expenses.replaceAll(Array.isArray(data.expenses) ? data.expenses : [])
      setMsg('✓ Data imported')
    } catch (err) { setMsg('✗ ' + err.message) }
    setTimeout(() => setMsg(''), 3000)
    e.target.value = ''
  }

  const Big = ({ color, label, value, sub, onClick }) => (
    <button onClick={onClick} className="w-full text-left rounded-2xl p-5 text-white shadow-lg active:scale-[0.99] transition" style={{ background: color }}>
      <div className="text-white/80 text-xs uppercase tracking-wide font-bold">{label}</div>
      <div className="text-3xl font-extrabold mt-1">{value}</div>
      {sub && <div className="text-white/80 text-xs mt-1">{sub}</div>}
    </button>
  )

  return (
    <div className="space-y-3">
      <Big color="linear-gradient(135deg,#7a1f2b,#5c1420)" label="Kul Udhaar — I owe suppliers"
        value={rupee(owed)} sub={`${suppliers.list.length} supplier(s) · tap to open`} onClick={() => go('udhaar')} />
      <Big color="linear-gradient(135deg,#1f5f7a,#123c4d)" label={`Kharcha — ${fmtMonth(nowYm) || 'this month'}`}
        value={rupee(s.grand)} sub={`${s.count} entries · tap to open`} onClick={() => go('kharcha')} />

      {s.grand > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">This month breakdown</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Running', s.running, '#7a1f2b'], ['Material', s.matTotal, '#1f5f7a'], ['Advances', s.advTotal, '#0a7d33']].map(([l, v, c]) => (
              <div key={l} className="bg-slate-50 rounded-xl py-2.5">
                <div className="text-base font-extrabold" style={{ color: c }}>{rupee(v)}</div><div className="text-[11px] text-slate-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
          {s.advTotal > 0 && (
            <div className="text-[11px] text-emerald-700 mt-2 font-semibold">💵 ₹{Math.round(s.advTotal).toLocaleString('en-IN')} advances are recoverable — deduct from wages.</div>
          )}
        </div>
      )}

      {suppliers.list.length === 0 && expenses.list.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Empty app — that&apos;s on purpose (nothing on the public web). Start adding kharcha/suppliers, or <b>Import</b> a data file below.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">⚙ Backup / Import (this device only)</div>
        <div className="flex gap-2">
          <button onClick={doExport} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm active:bg-slate-200">⬇ Export backup</button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm active:bg-slate-200">⬆ Import file</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={doImport} className="hidden" />
        </div>
        {msg && <div className="text-xs font-semibold mt-2 text-slate-600">{msg}</div>}
      </div>

      <p className="text-center text-[11px] text-slate-400 pt-1">Data saved on this device. Send a khata/kharcha photo to Claude to add entries fast.</p>
    </div>
  )
}
