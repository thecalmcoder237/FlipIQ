/**
 * Netlify serverless function for shared deal link previews.
 * Returns HTML with Open Graph and Twitter Card meta tags so that
 * WhatsApp, Slack, LinkedIn, etc. show a rich preview when the link is shared.
 *
 * Route: /deal/share/:token (via Netlify redirect)
 */

const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'WhatsApp',
  'Slack',
  'Twitterbot',
  'LinkedInBot',
  'TelegramBot',
  'Discordbot',
  'Pinterest',
  'Googlebot',
  'bingbot',
];

function isBot(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot.toLowerCase()));
}

function escapeHtml(str) {
  if (str == null || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return '$' + Math.round(Number(n)).toLocaleString();
}

exports.handler = async (event) => {
  const token = event.queryStringParameters?.token?.trim();
  if (!token) {
    return {
      statusCode: 302,
      headers: { Location: '/' },
      body: '',
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  let deal = null;
  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/get-shared-deal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data?.deal) deal = data.deal;
    } catch (err) {
      console.error('deal-share-preview: fetch deal error', err);
    }
  }

  const userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || '';
  const host = event.headers['x-forwarded-host'] || event.headers.host || '';
  const protocol = event.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const baseUrl = host ? `${protocol}://${host}` : '';
  const pageUrl = `${baseUrl}/deal/share/${token}`;

  let title = 'FlipIQ - Real Estate Deal Analysis';
  let description = 'View this deal analysis on FlipIQ.';
  let imageUrl = baseUrl ? `${baseUrl}/assets/flipiq-logo.png` : '';

  if (deal) {
    const addr = deal.address || 'Deal';
    const purchase = formatCurrency(deal.purchase_price ?? deal.purchasePrice);
    const arv = formatCurrency(deal.arv);
    const netProfit = formatCurrency(deal.net_profit ?? deal.netProfit);
    const score = deal.deal_score ?? deal.dealScore ?? deal.score ?? '—';

    title = `${escapeHtml(addr)} | FlipIQ Deal Analysis`;
    description = [
      `ARV: ${arv}`,
      `Purchase: ${purchase}`,
      `Net Profit: ${netProfit}`,
      `Score: ${score}/100`,
    ].join(' • ');
  }

  const metaTags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    imageUrl && `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta property="og:site_name" content="FlipIQ" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    imageUrl && `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
  ]
    .filter(Boolean)
    .join('\n    ');

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    ${metaTags}
    <link rel="icon" type="image/png" href="/assets/flipiq-logo.png" />
    <link rel="apple-touch-icon" href="/assets/flipiq-logo.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

  if (isBot(userAgent)) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html,
    };
  }

  const indexUrl = baseUrl ? `${baseUrl}/` : '/';
  let indexHtml = html;
  try {
    const indexRes = await fetch(indexUrl, {
      headers: { 'User-Agent': userAgent },
    });
    if (indexRes.ok) {
      let raw = await indexRes.text();
      raw = raw.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
      const metaInsert = `    ${metaTags}\n    `;
      const headClose = raw.indexOf('</head>');
      if (headClose !== -1) {
        indexHtml = raw.slice(0, headClose) + metaInsert + raw.slice(headClose);
      }
    }
  } catch (err) {
    console.error('deal-share-preview: fetch index error', err);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: indexHtml,
  };
};
