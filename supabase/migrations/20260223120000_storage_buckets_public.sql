-- Make storage buckets public so getPublicUrl() works and uploaded images display
UPDATE storage.buckets SET public = true WHERE id = 'rehab-photos';
UPDATE storage.buckets SET public = true WHERE id = 'materials-receipts';
