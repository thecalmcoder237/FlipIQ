# AGENTS.md

## Cursor Cloud specific instructions

### Overview

FlipIQ is a React SPA (Vite 7) for real estate deal analysis. The backend is a remote **Supabase** cloud instance (Postgres, Auth, Storage, Edge Functions) — there is no local backend to start. The Supabase URL and anon key are hardcoded in `src/lib/customSupabaseClient.js`, so the app connects to the cloud backend out of the box.

### Node version

The project requires **Node.js 20.x** (pinned in `.nvmrc` to `20.19.1`). Use `nvm` to switch:

```
source ~/.nvm/nvm.sh && nvm use
```

### Scripts (see `package.json`)

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint (flat config in `eslint.config.mjs`) |
| `npm run preview` | Preview production build on port 3000 |

### Lint caveats

- The lint script uses `--max-warnings 0`, so pre-existing warnings (mostly `react-hooks/exhaustive-deps`) cause a non-zero exit. This is a known state of the codebase, not a setup issue.

### Environment variables

- `.env` and `.env.local` contain Supabase credentials and API keys. These are already present in the repo for development.
- The custom Supabase client at `src/lib/customSupabaseClient.js` hardcodes the Supabase URL and anon key, overriding `.env` values.
- Optional API keys (Google Maps, OpenAI, Anthropic, Realie, RentCast, Resend) are configured as Supabase secrets for Edge Functions — the app works without them but some features degrade gracefully.

### Architecture notes

- All backend logic lives in 14 Supabase Edge Functions under `supabase/functions/` (Deno/TypeScript). These are deployed to the remote Supabase project and not run locally.
- Database migrations are in `supabase/migrations/`.
- The `image_search/` directory is an auxiliary Python utility (Poetry) unrelated to the main app flow.
- Vite config (`vite.config.js`) includes several custom plugins under `plugins/` for a visual editor / iframe mode — these are dev-only and load automatically.
