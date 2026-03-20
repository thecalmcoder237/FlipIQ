function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function safeString(v) {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

/**
 * Canonical, grounded payload for Action Hub “document generation” actions.
 *
 * IMPORTANT: This payload intentionally passes through the full `deal` object and the
 * computed `metrics` so downstream generators can cite sources precisely and avoid
 * inventing numbers. Any additional derived fields should be computed downstream and
 * included with explicit formulas.
 */
export function buildActionHubAnalysisPayload({
  deal,
  metrics,
  actionType,
  audience,
  recipients,
  userEmail,
  scenarioMode,
  activeScenarioMetrics,
} = {}) {
  if (!deal || !isPlainObject(deal)) {
    throw new Error('buildActionHubAnalysisPayload requires a deal object');
  }

  const dealId = deal.id;
  const propertyIntelligence = deal.propertyIntelligence ?? undefined;
  const rehabSow = deal.rehabSow ?? undefined;
  const scenarios = deal.scenarios ?? undefined;
  const notes = deal.notes ?? undefined;

  return {
    schemaVersion: 'actionhub.analysis.v1',
    generatedAt: new Date().toISOString(),

    actionType: safeString(actionType) ?? 'generateDeck',
    audience: safeString(audience) ?? 'internal',
    recipients: Array.isArray(recipients) ? recipients : [],
    userEmail: safeString(userEmail),

    // Primary identifiers
    dealId,

    // Ground truth inputs
    deal,
    metrics: metrics ?? undefined,
    propertyIntelligence,
    rehabSow,
    scenarios,
    notes,

    // Optional scenario view state from analysis page (used for “current scenario” slides)
    uiScenario: scenarioMode
      ? {
          mode: scenarioMode,
          metrics: activeScenarioMetrics ?? undefined,
        }
      : undefined,
  };
}

