/**
 * Client-side PDF export via jsPDF + autotable (both already deps).
 * Produces the same two artefacts as the Python engine: a supplier statement
 * and a monthly expense summary — shareable straight to WhatsApp from the phone.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supplierLedger, expenseSummary, num, dmy, fmtMonth } from './logic'

const MAROON = [122, 31, 43]
const GOLD = [201, 162, 75]

function header(doc, title, sub) {
  doc.setFillColor(...MAROON)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('UNICO METAL PRODUCTS', 14, 10)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(title, 14, 16)
  doc.setTextColor(255, 255, 255); doc.setFontSize(8)
  doc.text(sub, 196, 16, { align: 'right' })
  doc.setTextColor(20, 20, 20)
}

export function supplierPdf(supplier, rows) {
  const doc = new jsPDF()
  const { rows: L, closing } = supplierLedger(rows, supplier.opening || 0)
  header(doc, 'Supplier Ledger Statement', `${supplier.name}${supplier.category ? ' — ' + supplier.category : ''}`)
  const body = []
  if (supplier.opening) body.push(['—', 'Opening balance', '', '', num(supplier.opening)])
  L.forEach((r) => body.push([
    dmy(r.date), r.particulars || '',
    r.purchase ? num(r.purchase) : '', r.payment ? num(r.payment) : '', num(r.bal),
  ]))
  autoTable(doc, {
    startY: 28,
    head: [['Date', 'Particulars', 'Purchase', 'Payment', 'Balance']],
    body,
    theme: 'grid',
    headStyles: { fillColor: MAROON, fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 1.6 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
    foot: [['', 'CLOSING BALANCE PAYABLE', '', '', num(closing)]],
    footStyles: { fillColor: MAROON, textColor: 255, fontStyle: 'bold' },
  })
  doc.save(`${supplier.name}-statement.pdf`)
}

export function expensePdf(rows, ym) {
  const doc = new jsPDF()
  const s = expenseSummary(rows)
  header(doc, 'Daily Factory Expenses', fmtMonth(ym))
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...MAROON)
  doc.text(`Total spent: Rs. ${num(s.grand)}`, 14, 30)
  doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal')
  doc.text(`Running Rs.${num(s.running)}   |   Material Rs.${num(s.matTotal)}   |   Advances Rs.${num(s.advTotal)}`, 14, 35)
  autoTable(doc, {
    startY: 40,
    head: [['Category', 'Amount', 'Share']],
    body: s.catList.map((c) => [c.cat, num(c.amount), `${Math.round(c.amount / s.grand * 100)}%`]),
    theme: 'grid', headStyles: { fillColor: MAROON, fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  })
  if (s.advList.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Worker advance (recoverable)', 'Amount']],
      body: s.advList.map((a) => [a.who, num(a.amount)]),
      theme: 'grid', headStyles: { fillColor: GOLD, textColor: 40, fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 1.8 }, columnStyles: { 1: { halign: 'right' } },
    })
  }
  doc.save(`expenses-${ym}.pdf`)
}
