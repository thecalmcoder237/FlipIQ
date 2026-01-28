# FlipIQ

**Real Estate Deal Analysis Platform powered by PAVEL REI**

FlipIQ is a comprehensive real estate investment analysis tool that helps investors make smarter, data-driven decisions on house flip deals. The platform provides AI-powered insights, professional reports, risk assessment, and comprehensive scenario modeling.

## Features

- **AI-Powered Deal Analysis** - Instant insights powered by advanced AI
- **Professional Reports** - Lender-ready documents in seconds
- **Risk Assessment** - Comprehensive scenario modeling with probability-weighted outcomes
- **Fast & Accurate** - Real-time market data and comparable sales
- **70% Rule Analysis** - Calculate Maximum Allowable Offer (MAO)
- **Scenario Risk Modeling** - Dynamic probability-weighted risk analysis
- **Market Intelligence** - Real-time market strength analysis
- **Rehab SOW Generation** - AI-powered scope of work from property photos
- **Deal Action Hub** - Team notifications, loan proposals, and package exports

## Technology Stack

- **Frontend**: React 18, Vite, React Router DOM
- **UI Components**: Radix UI, Tailwind CSS, Framer Motion
- **Charts**: Recharts
- **PDF Generation**: jsPDF, jspdf-autotable
- **Backend**: Supabase (Authentication, Database, Edge Functions, Storage)
- **AI Services**: 
  - Anthropic Claude (Haiku 3.5) for analysis and SOW generation
  - OpenAI GPT-4o for market analysis and loan proposals
- **Deployment**: Vite build, Supabase hosting

## Getting Started

### Prerequisites

- Node.js 18+ (see `.nvmrc` for exact version)
- npm or yarn
- Supabase account and project
- Claude API key
- OpenAI API key (optional, for market analysis)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd flipiq
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Add API keys (configured in Supabase Edge Functions):
     - `CLAUDE_API_KEY` (set in Supabase Secrets)
     - `OPENAI_API_KEY` (set in Supabase Secrets, optional)
     - `RESEND_API_KEY` (set in Supabase Secrets, for email notifications)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Edge Functions Setup

FlipIQ uses Supabase Edge Functions for secure API calls. Deploy the following functions:

1. **send-claude-request** - Claude AI requests (comps, market analysis)
2. **fetch-property-intelligence** - Property data gathering
3. **generate-rehab-sow** - Rehab SOW generation from photos
4. **send-openai-request** - OpenAI GPT-4o requests (optional)
5. **send-deal-summary** - Email notifications (requires Resend API key)
6. **generate-loan-proposal** - PDF loan proposal generation
7. **export-deal-package** - Deal package ZIP export
8. **cleanup-old-data** - Automated data retention (runs every 2 weeks)

See individual setup documentation:
- `EDGE_FUNCTIONS_UPDATE.md` - Edge function configuration
- `DATA_RETENTION_SETUP.md` - Data retention policy setup
- `DEAL_ACTION_HUB_SETUP.md` - Action hub functions setup

## Project Structure

```
flipiq/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components (Radix UI)
│   │   └── ...          # Feature components
│   ├── contexts/        # React contexts (Auth)
│   ├── lib/             # Utilities and clients
│   ├── pages/           # Page components
│   ├── services/        # API services
│   └── utils/           # Utility functions
├── public/              # Static assets
│   └── assets/          # Images, logos
├── edge-functions/      # Supabase Edge Functions (if in repo)
└── package.json
```

## Key Features

### Deal Analysis
- Comprehensive financial breakdown
- Deal quality scoring
- ARV sensitivity analysis
- Property intelligence gathering
- Market strength assessment

### Rehab Insights
- Property specifications
- Photo upload and analysis
- AI-generated SOW from visual analysis
- Budget comparison
- Export functionality

### Scenario Risk Model
- ARV solver
- Adjustable assumptions (rehab overrun, hold time, ARV shift)
- Probability curves
- Market shock scenarios
- Hidden cost radar
- Timeline collision analysis
- Top 3 threats identification

### Deal Action Hub
- Team notifications via email
- Loan proposal generation (PDF)
- Full deal package export (ZIP)

## Environment Variables

Required in Supabase Edge Functions (set via `supabase secrets set`):
- `CLAUDE_API_KEY` - Anthropic Claude API key
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `RESEND_API_KEY` - Resend API key for emails (optional)

Frontend environment variables (in `.env`):
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your hosting platform (Vercel, Netlify, etc.)

3. Ensure environment variables are set in your hosting platform

4. Deploy Edge Functions to Supabase:
```bash
supabase functions deploy <function-name>
```

## Data Retention

All generated data (photos, SOW, property intelligence, comps) is automatically deleted after 2 weeks via the `cleanup-old-data` Edge Function. Set up a cron job in Supabase to run this function periodically.

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact: pavelrei.123@gmail.com

---

**FlipIQ powered by PAVEL REI** - Making smarter real estate investment decisions.
