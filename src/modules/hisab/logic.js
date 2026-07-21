/**
 * UNICO Hisab — pure money logic (no React, no storage). Mirrors the Python
 * engine that built the first PDFs: running supplier balance + categorised
 * monthly expense summary with advances/material split out.
 */

/** Expense categories (dropdown order = rough spend priority). */
export const CATEGORIES = [
  'Transport & Cartage',
  'Material & Tools',
  'Labour & Cleaning',
  'Tea & Food',
  'Worker Advance',
  'Electrical',
  'Water',
  'Fuel',
  'Medicine',
  'Misc',
]

/** Bar / chip colour per category (Tailwind-independent hex, used in PDFs too). */
export const CAT_COLOR = {
  'Transport & Cartage': '#7a1f2b',
  'Material & Tools': '#1f5f7a',
  'Labour & Cleaning': '#8a6d1f',
  'Tea & Food': '#c9852b',
  'Worker Advance': '#a03060',
  'Electrical': '#5a3fa0',
  'Water': '#2e8bbf',
  'Fuel': '#b0553a',
  'Medicine': '#3a8f6a',
  'Misc': '#888888',
}

/** A category is an advance (recoverable) or a material/inventory purchase. */
export const isAdvanceCat = (c) => c === 'Worker Advance'
export const MATERIAL_CATS = new Set(['Material & Tools'])

export const monthOf = (iso) => (iso || '').slice(0, 7) // 'YYYY-MM'

export const fmtMonth = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(m)] || m} ${y}`
}

/**
 * Running balance for one supplier's ledger.
 * purchase adds to what we owe, payment reduces it, adj is a signed correction.
 * Returns rows sorted by date with a `bal` on each, plus the closing balance.
 */
export function supplierLedger(rows, opening = 0) {
  const sorted = [...rows].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || ''))
  let bal = Number(opening) || 0
  const out = sorted.map((r) => {
    bal += (Number(r.purchase) || 0) - (Number(r.payment) || 0) + (Number(r.adj) || 0)
    return { ...r, bal }
  })
  return { rows: out, closing: bal }
}

/** Total outstanding across all suppliers (uses each supplier's opening + ledger). */
export function totalPayable(suppliers, ledgerRows) {
  return suppliers.reduce((sum, s) => {
    const mine = ledgerRows.filter((r) => r.supplierId === s.id)
    return sum + supplierLedger(mine, s.opening || 0).closing
  }, 0)
}

/** Categorised summary of a list of expense rows (already filtered to a period). */
export function expenseSummary(rows) {
  const live = rows.filter((r) => !r.cancelled)
  const cats = {}
  let grand = 0, advTotal = 0, matTotal = 0
  const advByPerson = {}
  for (const e of live) {
    const amt = Number(e.amount) || 0
    grand += amt
    cats[e.cat] = (cats[e.cat] || 0) + amt
    if (e.adv || isAdvanceCat(e.cat)) {
      advTotal += amt
      const who = (e.desc || '').split(' Adv')[0].split(' - ').pop().trim() || e.desc || 'Advance'
      advByPerson[who] = (advByPerson[who] || 0) + amt
    }
    if (e.material || MATERIAL_CATS.has(e.cat)) matTotal += amt
  }
  const catList = Object.entries(cats).map(([cat, amount]) => ({ cat, amount })).sort((a, b) => b.amount - a.amount)
  const advList = Object.entries(advByPerson).map(([who, amount]) => ({ who, amount })).sort((a, b) => b.amount - a.amount)
  return { grand, advTotal, matTotal, running: grand - advTotal - matTotal, catList, advList, count: live.length }
}

export const rupee = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
export const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN')
export const dmy = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${String(y).slice(2)}`
}
