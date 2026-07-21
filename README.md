# UNICO Hisab — factory money register (PWA)

Single-owner, mobile-first PWA for UNICO / NSP factory money:
- **Kharcha** — daily factory expenses, categorised, with **worker advances** and
  **cash material** split out from the running expense.
- **Udhaar** — supplier payables: per-supplier running ledger (purchase / payment /
  adjustment) + statement PDF.

## Stack
Vite + React + Tailwind + `vite-plugin-pwa`, reusing the shared `src/core`
(repository / useCollection / UI kit) from the other UNICO apps. Client-side PDF
via jsPDF. Deploys to GitHub Pages.

```bash
npm install
npm run dev       # local
npm run build     # vite build → dist/
npm run deploy    # gh-pages -d dist --dotfiles --nojekyll
```

## Data & privacy (important)
- **Local-first:** data is stored in the browser (`localStorage`) on the device
  in use — nothing is written to any server.
- The deployed bundle ships **EMPTY on purpose** — GitHub Pages is a public URL,
  so no real money data is baked in.
- Load your own data on your own device via **Home → Import** (a JSON file), and
  keep backups via **Home → Export**. `unico-hisab-starter.json` (the 15–20 Jul
  2026 kharcha) is the first import.
- Access is a light on-device password gate (`src/App.jsx`). Since data never
  leaves the device, this only stops casual access on a shared phone.

## Roadmap
- **Phase 1.5 — Firebase sync:** swap the storage adapter (`src/core/db/storage.js`
  is built for this) so data syncs across devices and is backed up. Needs Google
  login + Firestore rules like the other apps (keeps data off the public bundle).
- **Photo → auto-read:** upload a khata/kharcha photo → OCR/Claude → entries
  (reuse the WhatsApp-bridge OCR pipeline).
- **Tally XML export** into the separate factory-expenses company (needs the
  company + ledger names).
- **Advances → payroll** link (recoverable advances flow into wages).
