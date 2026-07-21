/**
 * Kharcha — daily factory expenses. Add an entry (date · category · amount),
 * see the month's categorised summary, and export a PDF. Advances and material
 * are split out so the running expense is honest.
 */
import { useState, useMemo } from 'react'
import { Button, Card, FieldLabel, Select, NumberInput, DateInput, TextInput } from '../../core/ui'
import { CATEGORIES, CAT_COLOR, isAdvanceCat, expenseSummary, monthOf, fmtMonth, rupee, num, dmy } from './logic'
import { expensePdf } from './pdf'

const today = () => new Date().toISOString().slice(0, 10)

export default function Expenses({ expenses }) {
  const [showAdd, setShowAdd] = useState(false)
  const [date, setDate] = useState(today())
  const [cat, setCat] = useState(CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')

  const months = useMemo(() => {
    const set = new Set(expenses.list.map((e) => monthOf(e.date)).filter(Boolean))
    return [...set].sort().reverse()
  }, [expenses.list])
  const [ym, setYm] = useState(null)
  const activeYm = ym || months[0] || monthOf(today())

  const rows = useMemo(
    () => expenses.list.filter((e) => monthOf(e.date) === activeYm)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')),
    [expenses.list, activeYm],
  )
  const s = expenseSummary(rows)

  const save = () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) return
    expenses.insert({ date, cat, amount: amt, desc: desc.trim(), adv: isAdvanceCat(cat) || undefined, material: cat === 'Material & Tools' || undefined })
    setAmount(''); setDesc(''); setShowAdd(false)
    setYm(monthOf(date))
  }

  return (
    <div className="space-y-3">
      {!showAdd && (
        <Button size="lg" className="w-full" onClick={() => { setDate(today()); setShowAdd(true) }}>➕ Naya kharcha</Button>
      )}

      {showAdd && (
        <Card className="p-4 space-y-3 border-2 border-[#7a1f2b]/20">
          <div><FieldLabel>Date</FieldLabel><DateInput value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" /></div>
          <div><FieldLabel>Category</FieldLabel><Select options={CATEGORIES} value={cat} onChange={(e) => setCat(e.target.value)} className="mt-1" /></div>
          <div><FieldLabel>Amount ₹</FieldLabel><NumberInput value={amount} placeholder="0" autoFocus onChange={(e) => setAmount(e.target.value)} className="mt-1 text-2xl text-center font-mono" /></div>
          <div><FieldLabel>Note (optional)</FieldLabel><TextInput value={desc} placeholder="e.g. 6 chai, porter, petrol…" onChange={(e) => setDesc(e.target.value)} className="mt-1" /></div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="success" className="flex-1" onClick={save} disabled={!Number(amount)}>Save</Button>
          </div>
        </Card>
      )}

      {months.length > 1 && (
        <Select options={months.map((m) => ({ value: m, label: fmtMonth(m) }))} value={activeYm} onChange={(e) => setYm(e.target.value)} />
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{fmtMonth(activeYm)} — total spent</div>
            <div className="text-3xl font-extrabold text-[#7a1f2b]">{rupee(s.grand)}</div>
          </div>
          {s.grand > 0 && <Button size="sm" variant="neutral" onClick={() => expensePdf(rows, activeYm)}>📄 PDF</Button>}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-3">
          {[['Running', s.running], ['Material', s.matTotal], ['Advances', s.advTotal]].map(([l, v]) => (
            <div key={l} className="bg-slate-50 rounded-xl py-2">
              <div className="text-sm font-bold text-slate-700">{rupee(v)}</div><div className="text-[10px] text-slate-500">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {s.catList.map((c) => (
            <div key={c.cat} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLOR[c.cat] || '#888' }} />
              <span className="flex-1 text-slate-700 truncate">{c.cat}</span>
              <span className="font-bold text-slate-800">{num(c.amount)}</span>
              <span className="text-slate-400 text-xs w-9 text-right">{Math.round(c.amount / s.grand * 100)}%</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-1.5">
        <FieldLabel className="px-1">{rows.length} entries</FieldLabel>
        {rows.map((r) => (
          <Card key={r.id} className="px-4 py-2.5 flex items-center gap-3">
            <span className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: CAT_COLOR[r.cat] || '#888' }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{r.desc || r.cat}</div>
              <div className="text-[11px] text-slate-400">{dmy(r.date)} · {r.cat}{r.adv ? ' · advance' : ''}</div>
            </div>
            <div className="font-extrabold text-slate-800">{num(r.amount)}</div>
            <button onClick={() => { if (confirm('Delete this entry?')) expenses.remove(r.id) }} className="text-slate-300 active:text-red-500 text-lg px-1">×</button>
          </Card>
        ))}
      </div>
    </div>
  )
}
