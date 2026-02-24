/**
 * Format a date string to US Standard (MM/DD/YYYY).
 * Handles ISO format (YYYY-MM-DD), date objects, and existing US-format strings.
 * Returns '—' for null/undefined/empty, and falls back to the original string on parse failure.
 */
export function formatDateUS(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  const s = String(dateStr).trim();

  // ISO date: YYYY-MM-DD (possibly with time component)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
  }

  // Already MM/DD/YYYY or MM-DD-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) {
    return s.replace(/-/g, '/');
  }

  // Try native Date parse as last resort
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}/${dd}/${d.getFullYear()}`;
    }
  } catch {
    // fall through
  }

  return s;
}
