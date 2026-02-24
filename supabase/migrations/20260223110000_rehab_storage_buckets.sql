-- ============================================================
-- Storage buckets for Rehab Project Management
-- ============================================================

-- Rehab progress photos bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rehab-photos', 'rehab-photos', false)
ON CONFLICT (id) DO UPDATE SET name = 'rehab-photos', public = false;

-- Materials receipts + product photos bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials-receipts', 'materials-receipts', false)
ON CONFLICT (id) DO UPDATE SET name = 'materials-receipts', public = false;

-- ============================================================
-- Storage RLS policies — rehab-photos
-- ============================================================

CREATE POLICY "Authenticated upload to rehab-photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'rehab-photos');

CREATE POLICY "Authenticated read rehab-photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'rehab-photos');

CREATE POLICY "Authenticated update rehab-photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'rehab-photos')
  WITH CHECK (bucket_id = 'rehab-photos');

CREATE POLICY "Authenticated delete rehab-photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'rehab-photos');

-- ============================================================
-- Storage RLS policies — materials-receipts
-- ============================================================

CREATE POLICY "Authenticated upload to materials-receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'materials-receipts');

CREATE POLICY "Authenticated read materials-receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'materials-receipts');

CREATE POLICY "Authenticated update materials-receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'materials-receipts')
  WITH CHECK (bucket_id = 'materials-receipts');

CREATE POLICY "Authenticated delete materials-receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'materials-receipts');
