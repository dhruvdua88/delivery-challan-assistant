# Delivery Challan Assistant

A browser-only tool for preparing **GST-compliant delivery challans** for job-work and
other genuine non-supply movements — replacing a fragile macro workbook with a guided,
validated form that generates an editable Word document and a formatted Excel workbook.

Everything runs in your browser. **No company or transaction data leaves your device.**
See [PRIVACY.md](./PRIVACY.md).

> This is a compliance-assistance tool, not a substitute for transaction-specific advice
> from your GST reviewer.

## What it does

- **Classifies the movement first** — Direct job work · Own-branch transfer (different GSTIN) · Other approved non-supply — and **blocks** a zero-tax challan where a tax invoice is legally required (own-branch transfer between distinct persons, Schedule I para 2).
- Keeps **Bill From / Consignor** and **Actual Dispatch From** as separate concepts, and **Consignee** separate from **Ship To**, all the way through validation and both exports.
- Validates before export: GSTIN format + checksum, GSTIN-vs-state match, 6-digit PIN, ≤16-char unique challan number, resolved HSN/UQC, positive values, 12-digit e-way bill number, unresolved-marker (`VERIFY`/`TBD`/`XXX`) blocking, and more.
- Derives the correct **e-way bill transaction type** (`Regular` vs `Bill From – Dispatch From`) and shows a plain-language checklist. It does **not** submit anything to the portal.
- Generates an **editable `.docx`** (A4 landscape) and a **formula-driven `.xlsx`** (Challan + EWB Guide + Dispatch Checklist), a **draft JSON** for local save/re-import, and watermarks output `DRAFT — E-WAY BILL PENDING — NOT FOR DISPATCH` when the EWB is blank.
- Enforces **Section 143** job-work return control (inputs 1 yr / capital goods 3 yr deemed-supply), **ITC-04** reminders, and an **HSN 6-digit** rule that becomes blocking when Company Master marks AATO above Rs 5 cr (Notification 78/2020-CT).
- **Templates & Excel round-trip** — save a challan as a reusable in-browser template (IndexedDB/Dexie) and export/re-import it as a portable Excel workbook with all items intact.
- **Reporting** — a running **challan register** (export to Excel MIS), an **ECharts dashboard** (issued by movement, value split, EWB status, top HSN), and a **Section 143 job-work register** with return-due dates + overdue flags and an **ITC-04 helper** export.
- **Definitive in-app Guide** — cited reference on the delivery-challan concept, which-document decision, e-way bill law, which EWB for a DC, job work, and case law.
- Extras: **print-like preview** with A4-landscape print CSS, **Load sample** generic data, **opt-in draft autosave**, keyboard-navigable stepper and WCAG 2.1 AA focus/announcements.

## Performance & quality

- **Initial load ≈ 80 kB gzip.** Heavy libraries (`docx`, `exceljs`, `xlsx`, `echarts`) and the large views (Guide, Templates, Register, Dashboard) are all `import()`-split and load only on demand. `npm run report` prints a per-chunk gzip report and fails if the entry payload exceeds budget.
- Hot components memoised (`React.memo` + stable callbacks); derived state computed in updates, not effect chains.
- **react-doctor score: 100/100.** Wrapped in an `ErrorBoundary`; opt-in autosave persists on tab-hide rather than every keystroke.
- Live load metrics are shown in-app (Performance API) — measured on your own device.

## Local commands

```bash
npm install
npm run dev        # start the dev server
npm run typecheck  # tsc project build (no emit issues)
npm run test       # unit + export tests (vitest)
npm run build      # production build to dist/
npm run preview    # preview the production build

npx playwright install chromium   # one-time, before the first e2e run
npm run test:e2e   # Playwright end-to-end (builds + previews automatically)
npm run report     # build + per-chunk gzip bundle report (fails over budget)
```

## Deployment (GitHub Pages)

The Vite `base` defaults to `/delivery-challan-assistant/` for a project site. Override at
build time if your repo name differs:

```bash
BASE_PATH=/your-repo-name/ npm run build
```

CI (`.github/workflows/ci.yml`) runs typecheck, tests and build on every push. Pages
deployment (`.github/workflows/deploy-pages.yml`) publishes `dist/` after a green build.

## Privacy & data

Company Master and the challan register live only in this browser's `localStorage`.
Use **Clear saved company data** or **Reset entire app** to remove them. No generated
Word / Excel / JSON files or source PDFs are committed to this repository — see
`.gitignore`.

## Compliance references

Verify these against the law in force before every release:

- CBIC invoice / delivery challan rules — https://cbic-gst.gov.in/gst-invoice-rules.html
- CBIC job-work procedure, Circular 38/12/2018 — https://cbic-gst.gov.in/pdf/circularno-38-cgst.pdf
- NIC e-way bill FAQ (Bill From / Dispatch From) — https://docs.ewaybillgst.gov.in/html/faq.html
- NIC e-way bill transaction-type master codes — https://docs.ewaybillgst.gov.in/apidocs/master-codes-list.html
- NIC e-way bill user manual — https://docs.ewaybillgst.gov.in/Documents/usermanual_ewb.pdf
- NIC e-way bill field mapping — https://docs.ewaybillgst.gov.in/apidocs/version1.02/generate-eway-bill.html

## Licence

MIT — see [LICENSE](./LICENSE).
