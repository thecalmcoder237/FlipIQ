/**
 * Utility to parse SOW markdown and extract estimated costs
 */

/**
 * Extracts total estimated cost from SOW markdown text
 * Looks for patterns like "Total: $X", "Total Cost: $X", "Estimated Cost: $X", etc.
 */
export function extractSOWTotalCost(sowText) {
  if (!sowText || typeof sowText !== 'string') return null;

  // Patterns to match total cost
  const patterns = [
    /total\s*(?:estimated\s*)?(?:cost|budget|estimate):\s*\$?([\d,]+)/i,
    /total:\s*\$?([\d,]+)/i,
    /estimated\s*(?:total\s*)?(?:cost|budget):\s*\$?([\d,]+)/i,
    /grand\s*total:\s*\$?([\d,]+)/i,
    /overall\s*(?:cost|budget):\s*\$?([\d,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = sowText.match(pattern);
    if (match && match[1]) {
      const cost = parseInt(match[1].replace(/,/g, ''), 10);
      if (!isNaN(cost) && cost > 0) {
        return cost;
      }
    }
  }

  // Try to sum up budget allocation table if present
  const tablePattern = /\|\s*[^|]+\|\s*[^|]+\|\s*\$?([\d,]+)/g;
  let total = 0;
  let match;
  while ((match = tablePattern.exec(sowText)) !== null) {
    const value = parseInt(match[1].replace(/,/g, ''), 10);
    if (!isNaN(value) && value > 0) {
      total += value;
    }
  }

  return total > 0 ? total : null;
}

/**
 * Extracts cost breakdown by category from SOW
 */
export function extractSOWBreakdown(sowText) {
  if (!sowText || typeof sowText !== 'string') return {};

  const breakdown = {};
  
  // Look for budget allocation table
  const lines = sowText.split('\n');
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect table start
    if (line.includes('|') && (line.toLowerCase().includes('trade') || line.toLowerCase().includes('category') || line.toLowerCase().includes('scope'))) {
      inTable = true;
      continue;
    }
    
    // Skip separator rows
    if (inTable && line.includes('---')) continue;
    
    // Parse table rows
    if (inTable && line.includes('|')) {
      const cols = line.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 3) {
        const category = cols[0];
        const costStr = cols[cols.length - 1] || cols[cols.length - 2];
        const cost = parseInt(costStr.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(cost) && cost > 0) {
          breakdown[category] = cost;
        }
      }
    } else if (inTable && !line.includes('|')) {
      inTable = false;
    }
  }

  return breakdown;
}

/**
 * Extracts tier budgets (Budget, Mid-Grade, High-End) from SOW markdown.
 * Looks for a table like "| Finish Level | Total |" with rows for each tier, or
 * lines containing "Budget", "Mid-Grade", "High-End" and a dollar amount.
 * @returns {{ budget: number|null, midGrade: number|null, highEnd: number|null }}
 */
export function extractSOWTierBudgets(sowText) {
  const result = { budget: null, midGrade: null, highEnd: null };
  if (!sowText || typeof sowText !== 'string') return result;

  const parseDollar = (str) => {
    const m = String(str).match(/\$?([\d,]+)/);
    if (!m || !m[1]) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return !isNaN(n) && n > 0 ? n : null;
  };

  const lines = sowText.split('\n');

  // 1. Look for a compact "Finish Level | Total" style table
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('|')) continue;
    const lower = line.toLowerCase();
    if (lower.includes('finish level') && lower.includes('total')) {
      // Parse next non-separator rows for Budget, Mid-Grade, High-End
      for (let j = i + 1; j < lines.length; j++) {
        const row = lines[j].trim();
        if (row.startsWith('|---') || /^-+\s*\|/.test(row)) continue;
        if (!row.includes('|')) break;
        const cols = row.split('|').map((c) => c.trim()).filter(Boolean);
        if (cols.length < 2) continue;
        const label = cols[0].toLowerCase();
        const value = parseDollar(cols[cols.length - 1] || cols[1]);
        if (label.includes('budget') && !label.includes('mid') && !label.includes('high')) {
          if (value != null) result.budget = value;
        } else if (label.includes('mid') && label.includes('grade')) {
          if (value != null) result.midGrade = value;
        } else if (label.includes('high') && label.includes('end')) {
          if (value != null) result.highEnd = value;
        }
      }
      if (result.budget != null || result.midGrade != null || result.highEnd != null) {
        return result;
      }
    }
  }

  // 2. Fallback: scan any line containing tier label + dollar amount
  const tierPatterns = [
    { key: 'budget', regex: /\b(?:budget|investor\s*grade)\s*[:\|]?\s*\$?([\d,]+)/i },
    { key: 'midGrade', regex: /\bmid[- ]?grade\s*[:\|]?\s*\$?([\d,]+)/i },
    { key: 'highEnd', regex: /\bhigh[- ]?end\s*[:\|]?\s*\$?([\d,]+)/i },
  ];
  for (const { key, regex } of tierPatterns) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match && match[1]) {
        const val = parseDollar(match[1]);
        if (val != null) result[key] = val;
        break;
      }
    }
  }

  // Also try table rows that look like "| Budget | $X,XXX |"
  const tableRowRegex = /^\|\s*(Budget|Mid-Grade|Mid Grade|High-End|High End)\s*\|[^|]*\|\s*\$?([\d,]+)\s*\|?\s*$/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(tableRowRegex);
    if (!m) continue;
    const label = m[1].toLowerCase();
    const value = parseDollar(m[2]);
    if (value == null) continue;
    if (label.includes('budget') && !label.includes('mid') && !label.includes('high')) {
      result.budget = value;
    } else if (label.includes('mid')) {
      result.midGrade = value;
    } else if (label.includes('high')) {
      result.highEnd = value;
    }
  }

  return result;
}

/**
 * Extracts timeline estimate from SOW.
 * @returns {{ value: number, unit: 'weeks'|'months' }|null}
 */
export function extractSOWTimeline(sowText) {
  if (!sowText || typeof sowText !== 'string') return null;

  const patterns = [
    /timeline[:\s]+(\d+)\s*(weeks?|months?)/i,
    /estimated\s*(?:timeline|duration|time)[:\s]+(\d+)\s*(weeks?|months?)/i,
    /completion[:\s]+(\d+)\s*(weeks?|months?)/i,
    /(\d+)\s*(weeks?|months?)\s*(?:estimated|timeline|duration)/i,
  ];

  for (const pattern of patterns) {
    const match = sowText.match(pattern);
    if (match && match[1]) {
      const unit = (match[2] || 'weeks').toLowerCase();
      return { value: parseInt(match[1], 10), unit: unit.startsWith('month') ? 'months' : 'weeks' };
    }
  }

  return null;
}

/**
 * Extracts content between a ## header and the next ## or end of text.
 * @param {string} sowText - Full SOW markdown
 * @param {string} headerTitle - Exact header text after ## (e.g. "SOW Remarks")
 * @returns {string|null} Extracted section content (trimmed) or null
 */
function extractSection(sowText, headerTitle) {
  if (!sowText || typeof sowText !== 'string') return null;
  const normalized = headerTitle.toLowerCase().trim();
  const lines = sowText.split('\n');
  let inSection = false;
  const collected = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      const title = headerMatch[1].trim().toLowerCase();
      if (title === normalized) {
        inSection = true;
        collected.length = 0;
        continue;
      }
      if (inSection) break;
      continue;
    }
    if (inSection) collected.push(line);
  }

  const text = collected.join('\n').trim();
  return text.length > 0 ? text : null;
}

/**
 * Extracts the "SOW Remarks" section: what Claude analyzed, noted, and reasons for the SOW.
 * @returns {string|null}
 */
export function extractSOWRemarks(sowText) {
  return extractSection(sowText, 'SOW Remarks') || extractSection(sowText, 'SOW remarks') || extractSection(sowText, 'Analysis Notes');
}

/**
 * Extracts the "Pro Flipper Recommendations" section: value-add and pro flipper advice.
 * @returns {string|null}
 */
export function extractSOWRecommendations(sowText) {
  return extractSection(sowText, 'Pro Flipper Recommendations') || extractSection(sowText, 'Recommendations') || extractSection(sowText, 'Pro Flipper recommendations');
}

const parseDollar = (str) => {
  const m = String(str || '').match(/\$?([\d,]+)/);
  if (!m || !m[1]) return null;
  const n = parseInt(m[1].replace(/,/g, ''), 10);
  return !isNaN(n) && n >= 0 ? n : null;
};

/**
 * Parses line items from SOW markdown. Extracts Item/Cost rows from tables under ## category headers.
 * Returns flat array of { id, category, item, cost } for editing.
 * @param {string} sowText
 * @returns {{ lineItems: Array<{ id: string, category: string, item: string, cost: number }>, tiers: { budget: number|null, midGrade: number|null, highEnd: number|null }, timeline: { value: number, unit: string }|null }}
 */
export function parseSOWLineItems(sowText) {
  const lineItems = [];
  if (!sowText || typeof sowText !== 'string') {
    return { lineItems, tiers: { budget: null, midGrade: null, highEnd: null }, timeline: null };
  }

  const lines = sowText.split('\n');
  let currentCategory = 'General';
  let idCounter = 0;
  let inScopeSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      const title = headerMatch[1].trim();
      if (/scope of work/i.test(title)) {
        inScopeSection = true;
        continue;
      }
      if (/pro flipper|recommendations/i.test(title)) {
        inScopeSection = false;
        continue;
      }
      if (inScopeSection && !/remarks/i.test(title)) {
        currentCategory = title;
      }
      continue;
    }

    if (!inScopeSection || !line.includes('|')) continue;
    const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const first = (cols[0] || '').toLowerCase();
    if (/^-+$/.test(first) || /^item$/i.test(first) || /^est\.?\s*cost$/i.test(first) || /^cost$/i.test(first)) continue;
    if (/^(budget|mid-?grade|high-?end|finish level)$/i.test(first)) continue;

    const costCol = cols[cols.length - 1];
    const cost = parseDollar(costCol);
    if (cost === null && parseDollar(cols[0]) === null) continue;
    const item = cols[0] || 'Line item';
    const costVal = cost != null ? cost : 0;
    lineItems.push({ id: `row-${++idCounter}`, category: currentCategory, item, cost: costVal });
  }

  const tiers = extractSOWTierBudgets(sowText);
  const timeline = extractSOWTimeline(sowText);

  return { lineItems, tiers, timeline };
}

/**
 * Serializes edited line items back into SOW markdown. Replaces Scope of Work tables, updates total and tier table.
 * @param {string} originalSow
 * @param {Array<{ id?: string, category: string, item: string, cost: number }>} lineItems
 * @param {{ budget?: number|null, midGrade?: number|null, highEnd?: number|null }} tierOverrides - new tier values (scaled if partial)
 */
export function serializeSOWWithLineItems(originalSow, lineItems, tierOverrides = {}) {
  if (!originalSow || typeof originalSow !== 'string') return originalSow;
  if (!Array.isArray(lineItems) || lineItems.length === 0) return originalSow;

  const total = lineItems.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const origTiers = extractSOWTierBudgets(originalSow);
  const origMid = origTiers.midGrade || total;
  const scale = origMid > 0 ? total / origMid : 1;

  const newTiers = {
    budget: tierOverrides.budget != null ? tierOverrides.budget : (origTiers.budget != null ? Math.round(origTiers.budget * scale) : Math.round(total * 0.85)),
    midGrade: tierOverrides.midGrade != null ? tierOverrides.midGrade : total,
    highEnd: tierOverrides.highEnd != null ? tierOverrides.highEnd : (origTiers.highEnd != null ? Math.round(origTiers.highEnd * scale) : Math.round(total * 1.15)),
  };

  const categories = [...new Set(lineItems.map((r) => r.category || 'General'))];
  let scopeBody = '';
  for (const cat of categories) {
    const items = lineItems.filter((r) => (r.category || 'General') === cat);
    if (items.length === 0) continue;
    scopeBody += `\n## ${cat}\n\n| Item | Est. Cost |\n|------|----------|\n`;
    for (const row of items) {
      scopeBody += `| ${String(row.item || '').replace(/\|/g, '\\|')} | $${(Number(row.cost) || 0).toLocaleString()} |\n`;
    }
  }

  const timeline = extractSOWTimeline(originalSow);
  const timelineStr = timeline ? `\n- Estimated timeline: ${timeline.value} ${timeline.unit}` : '';

  const newTierTable = `\n| Finish Level | Total |\n|--------------|-------|\n| Budget | $${newTiers.budget.toLocaleString()} |\n| Mid-Grade | $${newTiers.midGrade.toLocaleString()} |\n| High-End | $${newTiers.highEnd.toLocaleString()} |`;
  const scopeReplacement = `## Scope of Work${scopeBody}\n${timelineStr}\n- Total Estimated Cost: $${total.toLocaleString()}${newTierTable}\n`;

  const hasProFlipper = /##\s+Pro Flipper Recommendations/i.test(originalSow);
  const scopePattern = hasProFlipper
    ? /##\s+Scope of Work[\s\S]*?(?=\n##\s+Pro Flipper Recommendations)/i
    : /##\s+Scope of Work[\s\S]*/i;
  const result = originalSow.replace(scopePattern, scopeReplacement);

  return result;
}
