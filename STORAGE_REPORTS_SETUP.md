# Reports Storage Bucket Setup

Deal Action Hub uploads generated PDFs (Full Analysis, Loan Proposal) to Supabase Storage so emails can include a download link. If you see **403 Unauthorized** or **"new row violates row-level security policy"** when using Notify Team or Generate Loan Proposal, the `reports` bucket or its RLS policies are missing.

## Option 1: Run the migration via CLI (recommended)

From the project root:

```bash
npx supabase db push
```

**If you see:** `Cannot find project ref. Have you run supabase link?` or `open supabase\.temp\profile: The system cannot find the path specified`:

1. **Initialize Supabase** (creates `supabase/config.toml` and expected layout):
   ```bash
   npx supabase init
   ```
2. **Link your remote project** (use your project ref from [Supabase Dashboard](https://supabase.com/dashboard) → project URL or Settings → General):
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   When prompted, enter your database password.
3. Run again:
   ```bash
   npx supabase db push
   ```

## Option 1b: Apply the migration manually (no CLI link needed)

In **Supabase Dashboard → SQL Editor**, run the contents of `supabase/migrations/20260129120000_reports_bucket_and_rls.sql`. This creates the `reports` bucket and RLS policies without using the CLI.

## Option 2: Configure in Dashboard

1. **Storage → New bucket**  
   - Name: `reports`  
   - Public: **No**

2. **Storage → reports → Policies → New policy**  
   - **Insert**: Allow authenticated users to upload (`bucket_id = 'reports'`).  
   - **Select**: Allow authenticated users to read (for signed URLs).  
   - **Update**: Allow authenticated users to update (for upsert).

## After setup

- **Notify Team** and **Generate Loan Proposal** will upload the PDF to `reports/deal-reports/{dealId}/...` and include a signed download link in the email.  
- If the bucket still doesn’t exist or RLS blocks the upload, the app falls back to sending the email with the PDF attached only (no link).
