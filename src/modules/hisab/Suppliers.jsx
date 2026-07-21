/**
 * Udhaar — supplier payables. List every supplier with running balance; open
 * one to see its ledger, add a purchase / payment / adjustment, and export a
 * statement PDF. Suppliers already in your Tally don't belong here.
 */
import { useState } from 'react'
import { Button, Card, FieldLabel, TextInput, NumberInput, DateInput, Select } from '../../core/ui'
import { supplierLedger, rupee, num, dmy } from './logic'
import { supplierPdf } from './pdf'

const today = () => new Date().toISOString().slice(0, 10)

function AddSupplier({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [opening, setOpening] = useState('')
  return (
    <Card className="p-4 space-y-3 border-2 border-[#7a1f2b]/20">
      <div><FieldLabel>Supplier name</FieldLabel><TextInput value={name} autoFocus placeholder="e.g. Sharma Hardware" onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
      <div><FieldLabel>What they supply</FieldLabel><TextInput value={category} placeholder="e.g. Nut-bolt, welding" onChange={(e) => setCategory(e.target.value)} className="mt-1" /></div>
      <div><FieldLabel>Opening balance ₹ (if any)</FieldLabel><NumberInput value={opening} placeholder="0" onChange={(e) => setOpening(e.target.value)} className="mt-1" /></div>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button variant="success" className="flex-1" disabled={!name.trim()} onClick={() => onAdd({ name: name.trim(), category: category.trim(), opening: Number(opening) || 0 })}>Add</Button>
      </div>
    </Card>
  )
}

function AddEntry({ onAdd, onCancel }) {
  const [date, setDate] = useState(today())
  const [kind, setKind] = useState('purchase')
  const [amount, setAmount] = useState('')
  const [particulars, setParticulars] = useState('')
  const save = () => {
    const amt = Number(amount); if (!amt || amt <= 0) return
    const row = { date, particulars: particulars.trim() }
    if (kind === 'purchase') row.purchase = amt
    else if (kind === 'payment') row.payment = amt
    else row.adj = -Math.abs(amt) // adjustment reduces the balance
    onAdd(row)
  }
  return (
    <Card className="p-4 space-y-3 border-2 border-[#7a1f2b]/20">
      <div><FieldLabel>Date</FieldLabel><DateInput value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" /></div>
      <div><FieldLabel>Type</FieldLabel>
        <Select className="mt-1" value={kind} onChange={(e) => setKind(e.target.value)}
          options={[{ value: 'purchase', label: 'Purchase (I bought — adds to owed)' }, { value: 'payment', label: 'Payment (I paid — reduces owed)' }, { value: 'adj', label: 'Adjustment / discount (reduces owed)' }]} />
      </div>
      <div><FieldLabel>Amount ₹</FieldLabel><NumberInput value={amount} placeholder="0" autoFocus onChange={(e) => setAmount(e.target.value)} className="mt-1 text-2xl text-center font-mono" /></div>
      <div><FieldLabel>Note (optional)</FieldLabel><TextInput value={particulars} placeholder="items / bill no." onChange={(e) => setParticulars(e.target.value)} className="mt-1" /></div>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button variant="success" className="flex-1" disabled={!Number(amount)} onClick={save}>Save</Button>
      </div>
    </Card>
  )
}

function SupplierDetail({ supplier, ledger, onBack }) {
  const [adding, setAdding] = useState(false)
  const mine = ledger.list.filter((r) => r.supplierId === supplier.id)
  const { rows, closing } = supplierLedger(mine, supplier.opening || 0)
  const view = [...rows].reverse()
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-[#7a1f2b] font-bold text-sm">‹ All suppliers</button>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-lg text-slate-800">{supplier.name}</div>
            {supplier.category && <div className="text-xs text-slate-400">{supplier.category}</div>}
          </div>
          {rows.length > 0 && <Button size="sm" variant="neutral" onClick={() => supplierPdf(supplier, mine)}>📄 PDF</Button>}
        </div>
        <div className="mt-3 bg-[#7a1f2b] text-white rounded-xl py-3 text-center">
          <div className="text-white/70 text-xs uppercase tracking-wide">Balance payable</div>
          <div className="text-2xl font-extrabold">{rupee(closing)}</div>
        </div>
      </Card>

      {!adding
        ? <Button className="w-full" onClick={() => setAdding(true)}>➕ Add purchase / payment</Button>
        : <AddEntry onCancel={() => setAdding(false)} onAdd={(row) => { ledger.insert({ ...row, supplierId: supplier.id }); setAdding(false) }} />}

      <div className="space-y-1.5">
        {view.map((r) => (
          <Card key={r.id} className="px-4 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{r.particulars || (r.payment ? 'Payment' : r.adj ? 'Adjustment' : 'Purchase')}</div>
              <div className="text-[11px] text-slate-400">{dmy(r.date)}</div>
            </div>
            <div className="text-right">
              {r.purchase ? <span className="font-bold text-slate-800">+{num(r.purchase)}</span> : null}
              {r.payment ? <span className="font-bold text-emerald-600">−{num(r.payment)}</span> : null}
              {r.adj ? <span className="font-bold text-amber-600">{num(r.adj)}</span> : null}
              <div className="text-[11px] text-slate-400">bal {num(r.bal)}</div>
            </div>
            <button onClick={() => { if (confirm('Delete this line?')) ledger.remove(r.id) }} className="text-slate-300 active:text-red-500 text-lg px-1">×</button>
          </Card>
        ))}
        {view.length === 0 && <p className="text-center text-slate-400 text-sm py-6">No entries yet. Add the first purchase.</p>}
      </div>
    </div>
  )
}

export default function Suppliers({ suppliers, ledger }) {
  const [openId, setOpenId] = useState(null)
  const [adding, setAdding] = useState(false)
  const open = suppliers.list.find((s) => s.id === openId)
  if (open) return <SupplierDetail supplier={open} ledger={ledger} onBack={() => setOpenId(null)} />

  const withBal = suppliers.list.map((s) => ({
    ...s, bal: supplierLedger(ledger.list.filter((r) => r.supplierId === s.id), s.opening || 0).closing,
  })).sort((a, b) => b.bal - a.bal)

  return (
    <div className="space-y-3">
      {!adding
        ? <Button size="lg" className="w-full" onClick={() => setAdding(true)}>➕ Naya supplier</Button>
        : <AddSupplier onCancel={() => setAdding(false)} onAdd={(s) => { const row = suppliers.insert(s); setAdding(false); setOpenId(row.id) }} />}

      {withBal.length === 0 && !adding && (
        <Card className="p-6 text-center text-slate-400 text-sm">
          No suppliers yet. Add a supplier you buy from on <b>udhaar</b> (credit) that isn&apos;t already in your Tally.
        </Card>
      )}

      {withBal.map((s) => (
        <Card key={s.id} className="px-4 py-3.5 flex items-center gap-3 active:bg-slate-50" onClick={() => setOpenId(s.id)}>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 truncate">{s.name}</div>
            {s.category && <div className="text-[11px] text-slate-400 truncate">{s.category}</div>}
          </div>
          <div className="text-right">
            <div className="font-extrabold text-[#7a1f2b]">{rupee(s.bal)}</div>
            <div className="text-[10px] text-slate-400">tap to open ›</div>
          </div>
        </Card>
      ))}
    </div>
  )
}
