# Data Retention System Setup

## Overview
The application now includes automatic data retention that deletes generated data (photos, SOW, comps) after 2 weeks to manage storage costs and maintain data hygiene.

## What Gets Deleted After 2 Weeks

1. **Uploaded Photos**: All property photos older than 2 weeks are removed from Supabase Storage
2. **Generated SOW**: Scope of Work documents are cleared from the database
3. **Property Intelligence**: Property intelligence data is cleared
4. **Comparable Sales**: Recent comps data is cleared

## Setup Instructions

### 1. Deploy the Cleanup Edge Function

The cleanup function is located at:
```
c:\Users\Jesse - Joel\Downloads\cleanup-old-data\
```

Deploy it to Supabase:

```bash
cd "c:\Users\Jesse - Joel\Downloads\cleanup-old-data"
supabase functions deploy cleanup-old-data
```

### 2. Set Up Scheduled Execution

You have two options for running the cleanup:

#### Option A: Supabase Cron (Recommended)
Add a cron job in your Supabase dashboard:

1. Go to Database → Cron Jobs
2. Create a new cron job:
   - **Name**: `cleanup_old_data`
   - **Schedule**: `0 2 * * *` (runs daily at 2 AM)
   - **SQL Command**:
   ```sql
   SELECT net.http_post(
     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-old-data',
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
     ),
     body := '{}'::jsonb
   );
   ```

#### Option B: External Cron Service
Use a service like:
- **Vercel Cron** (if hosting on Vercel)
- **GitHub Actions** (scheduled workflows)
- **AWS EventBridge** / **CloudWatch Events**
- **cron-job.org** (free external service)

Example cron job configuration:
```bash
# Run daily at 2 AM
0 2 * * * curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-old-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### 3. Environment Variables

The edge function requires:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin access)

These are automatically available in Supabase Edge Functions, but verify they're set.

### 4. Testing

Test the cleanup function manually:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-old-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "deletedCount": 15,
  "cutoffDate": "2026-01-13T00:00:00.000Z"
}
```

## Important Notes

1. **Irreversible**: Deleted data cannot be recovered. Ensure users understand this policy.
2. **2-Week Window**: Data is deleted 14 days after the deal's `updated_at` timestamp.
3. **Active Deals**: If a deal is updated within 2 weeks, its data is preserved.
4. **Storage Costs**: This helps manage Supabase Storage costs by removing old photos.

## Customization

To change the retention period, modify the `cleanup-old-data/index.ts` file:

```typescript
// Change from 14 days to 30 days
twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 30);
```

## Monitoring

Check Supabase Edge Function logs to monitor cleanup execution:
1. Go to Edge Functions → `cleanup-old-data` → Logs
2. Review execution history and any errors
