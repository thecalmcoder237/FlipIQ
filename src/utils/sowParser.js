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
 * Extracts timeline estimate from SOW
 */
export function extractSOWTimeline(sowText) {
  if (!sowText || typeof sowText !== 'string') return null;

  const patterns = [
    /timeline[:\s]+(\d+)\s*(?:weeks?|months?)/i,
    /estimated\s*(?:timeline|duration)[:\s]+(\d+)\s*(?:weeks?|months?)/i,
    /completion[:\s]+(\d+)\s*(?:weeks?|months?)/i,
  ];

  for (const pattern of patterns) {
    const match = sowText.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}
