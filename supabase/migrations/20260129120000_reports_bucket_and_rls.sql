-- Create the reports bucket (private) for deal PDFs and packages
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO UPDATE SET name = 'reports', public = false;

-- Allow authenticated users to upload (INSERT) to the reports bucket
CREATE POLICY "Allow authenticated uploads to reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

-- Allow authenticated users to read (SELECT) from reports (needed for createSignedUrl)
CREATE POLICY "Allow authenticated read from reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- Allow authenticated users to update (needed for upsert)
CREATE POLICY "Allow authenticated update in reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reports')
WITH CHECK (bucket_id = 'reports');
