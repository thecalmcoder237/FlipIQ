const DEFAULT_REPORTS_BUCKET = 'reports';

function toSafePathPart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function buildDealReportPath({ dealId, type, ext }) {
  const safeDealId = toSafePathPart(dealId || 'unknown');
  const safeType = toSafePathPart(type || 'report');
  const date = new Date().toISOString().split('T')[0];
  const safeExt = toSafePathPart(ext || 'pdf');
  return `deal-reports/${safeDealId}/${safeType}-${date}.${safeExt}`;
}

export function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function uploadReportAndCreateSignedUrl({
  supabase,
  path,
  arrayBuffer,
  contentType,
  bucket = DEFAULT_REPORTS_BUCKET,
  expiresIn = 60 * 60 * 24 * 7, // 7 days
  upsert = true,
}) {
  if (!supabase) throw new Error('Supabase client is required');
  if (!path) throw new Error('Storage path is required');
  if (!arrayBuffer) throw new Error('ArrayBuffer is required');

  const blob = new Blob([arrayBuffer], { type: contentType || 'application/octet-stream' });

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType, upsert });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload report to storage');
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (signedError) {
    throw new Error(signedError.message || 'Failed to create signed URL');
  }

  return { bucket, path, signedUrl: signed?.signedUrl };
}

