# FlipIQ

Real estate deal analysis platform for flippers and investors. Analyze deals, model scenarios, track portfolio performance, and generate loan proposals.

## Tech stack

- **Frontend:** React 18, Vite 7, Tailwind CSS, Radix UI, Framer Motion, Recharts
- **Backend / data:** Supabase (auth, Postgres, storage)
- **Deal math:** Custom calculators for acquisition, rehab, holding, selling costs, ROI, and deal score

## Features

- **Deal input & analysis:** Enter property and financial inputs; get total project cost, net profit, ROI, annualized ROI, and deal score
- **Scenario modeling:** Base / Best / Worst case with rehab overrun, hold time, and ARV shift; impact on cost, profit, ROI, and risk
- **Scenario risk tab:** Minimum ARV calculator, adjustable assumptions (rehab overrun %, hold time, ARV shift %), probability-weighted outcomes, market shock and hidden-cost toggles
- **Portfolio dashboard:** Snapshot (total deals, active, closed profitable/unprofitable, pending, avg score, portfolio ROI, cash deployed), filterable/sortable deal grid, deal comparison (2–3 deals side-by-side)
- **Deal funding & contact:** Per-deal funding (amount approved, LTV %, rate, term, source), agent/owner contact (name, phone, email, source type), status (closed/funded and funded terms)
- **Property intelligence:** Optional property details and comps
- **Rehab SOW & budget:** Scope of work and budget tools
- **Loan proposal generator:** Generate loan proposal documents
- **PDF export:** Export analysis and rehab insights to PDF

## Setup

1. Clone the repo.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key (and any other keys you use). **Do not commit `.env` or `.env.local`**; they are listed in `.gitignore`.
4. Run Supabase migrations (see Supabase docs or `supabase/` folder).
5. Start dev server: `npm run dev`

## Scripts

- `npm run dev` — Start Vite dev server (port 3000)
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

## Security

- **Secrets:** Never commit `.env`, `.env.local`, or any file containing API keys, database URLs, or passwords. The `.gitignore` is configured to exclude these. If credentials were ever committed, rotate them immediately in the Supabase dashboard and any other services.

## Project structure

- `src/pages/` — Route pages (DealAnalysisPage, PortfolioDashboard, DealInputForm, etc.)
- `src/components/` — Reusable UI and feature components
- `src/utils/` — Deal calculations, database mapping, risk calculations
- `src/services/` — API and Supabase services
- `supabase/` — Migrations and edge functions

## License

Proprietary. All rights reserved.
