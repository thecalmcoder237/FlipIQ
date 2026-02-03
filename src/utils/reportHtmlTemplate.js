/**
 * Shared HTML report template with Bootstrap 5 and print styles.
 * Used for Rehab Insights export, Intelligence, Rehab, and Comps print reports.
 */

export function escapeHtml(s) {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getReportHead() {
  return `
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"/>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .page-break-before { page-break-before: always; }
      .page-break-after { page-break-after: always; }
    }
    body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .report-header { border-bottom: 3px solid #EA580C; padding-bottom: 0.75rem; margin-bottom: 1.5rem; }
    .report-footer { color: #64748B; font-size: 0.875rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #E2E8F0; }
  </style>`;
}

export function getReportHeader(title, subtitle, date) {
  const d = date || new Date().toLocaleDateString();
  return `
  <header class="report-header">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
      <div>
        <small class="text-uppercase text-muted fw-bold" style="letter-spacing: 0.5px;">FlipIQ</small>
        <h1 class="h3 fw-bold text-dark mb-1">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="text-muted mb-0">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div class="text-muted small">Generated on ${escapeHtml(d)}</div>
    </div>
  </header>`;
}

export function getReportFooter() {
  return `
  <footer class="report-footer text-center">
    FlipIQ &bull; Real Estate Deal Analysis &bull; ${escapeHtml(new Date().toLocaleDateString())}
  </footer>`;
}

/**
 * Wraps content in full HTML document with Bootstrap and print support.
 * @param {string} content - Main body HTML
 * @param {object} options - { title, subtitle, date, autoPrint }
 */
export function wrapReport(content, options = {}) {
  const { title = 'Report', subtitle = '', date, autoPrint = false } = options;
  const header = getReportHeader(title, subtitle, date);
  const footer = getReportFooter();
  const script = autoPrint ? '<script>window.onload = function() { window.print(); }</script>' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>${getReportHead()}
  <title>${escapeHtml(title)}</title>
</head>
<body class="p-4">
  <div class="container-fluid" style="max-width: 900px;">
    ${header}
    <main>${content}</main>
    ${footer}
  </div>
  ${script}
</body>
</html>`;
}
