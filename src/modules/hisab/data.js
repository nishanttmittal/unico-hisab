/**
 * UNICO Hisab — data access (local-first via the core repository/storage).
 * Three collections:
 *   suppliers  — { name, category, ref, opening, note }
 *   ledger     — { supplierId, date, particulars, purchase, payment, adj, adjNote }
 *   expenses   — { date, desc, amount, cat, adv, material, note }
 *
 * Ships EMPTY on purpose: the deployed bundle is on a public URL, so NO real
 * money data is baked in. Load your own data on YOUR device via Import (see the
 * ⚙ menu on Home) from a JSON file — that keeps it off the public web.
 */
import { createCollection } from '../../core/db/repository'

export const suppliersRepo = createCollection('suppliers')
export const ledgerRepo = createCollection('ledger')
export const expensesRepo = createCollection('expenses')

/** Export everything as one JSON object (for backup / moving between devices). */
export function exportAll() {
  return {
    app: 'unico-hisab', version: 1, exportedAt: new Date().toISOString(),
    suppliers: suppliersRepo.all(), ledger: ledgerRepo.all(), expenses: expensesRepo.all(),
  }
}

/** Replace all local data from an exported/starter JSON object. */
export function importAll(data) {
  if (!data || data.app !== 'unico-hisab') throw new Error('Not a UNICO Hisab data file')
  suppliersRepo.replaceAll(Array.isArray(data.suppliers) ? data.suppliers : [])
  ledgerRepo.replaceAll(Array.isArray(data.ledger) ? data.ledger : [])
  expensesRepo.replaceAll(Array.isArray(data.expenses) ? data.expenses : [])
}
