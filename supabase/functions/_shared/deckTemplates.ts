import type { PlannedDeck, DeckSlide, SlideBlock } from "./deckPlanner.ts";
import type { ChartArtifact } from "./chartSpecs.ts";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function pct(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.0%";
  return `${n.toFixed(1)}%`;
}

function renderKpiTiles(rows: any[]): string {
  const items = rows
    .filter((r) => r && typeof r === "object")
    .slice(0, 9)
    .map((r) => {
      const label = esc((r as any).label);
      const value = (r as any).value;
      const formatted =
        label.toLowerCase().includes("roi") ? esc(pct(value)) :
        label.toLowerCase().includes("score") ? esc(String(value)) :
        label.toLowerCase().includes("risk") ? esc(String(value)) :
        typeof value === "number" ? esc(money(value)) : esc(String(value));
      return `<div class="kpi">
        <div class="kpiLabel">${label}</div>
        <div class="kpiValue">${formatted}</div>
      </div>`;
    })
    .join("");
  return `<div class="kpiGrid">${items}</div>`;
}

function blockHtml(block: SlideBlock, chartsById: Record<string, ChartArtifact>): string {
  if (block.kind === "title") {
    return `<div class="titleBlock">
      <div class="deckTitle">${esc(block.title)}</div>
      ${block.subtitle ? `<div class="deckSubtitle">${esc(block.subtitle)}</div>` : ""}
    </div>`;
  }
  if (block.kind === "heroNumbers") {
    const parts: string[] = [];
    if (block.roi != null && Number.isFinite(block.roi))
      parts.push(`<div class="heroNum"><span class="heroVal">${block.roi.toFixed(1)}%</span><span class="heroLabel">ROI</span></div>`);
    if (block.arv != null && block.arv > 0)
      parts.push(`<div class="heroNum"><span class="heroVal">${money(block.arv)}</span><span class="heroLabel">ARV</span></div>`);
    if (block.netProfit != null && block.netProfit > 0)
      parts.push(`<div class="heroNum"><span class="heroVal">${money(block.netProfit)}</span><span class="heroLabel">Profit</span></div>`);
    if (block.location)
      parts.push(`<div class="heroNum heroLocation"><span class="heroVal">${esc(block.location)}</span></div>`);
    return `<div class="heroNumbers">${parts.join("")}</div>`;
  }
  if (block.kind === "roiBox") {
    return `<div class="roiBox">
      <div class="roiNumber">${block.roi.toFixed(1)}%</div>
      <div class="roiLabel">${esc(block.label ?? "Projected ROI")}</div>
    </div>`;
  }
  if (block.kind === "highlightBox") {
    return `<div class="highlightBox">
      <div class="highlightTitle">${esc(block.title)}</div>
      <div class="highlightContent">${esc(block.content)}</div>
    </div>`;
  }
  if (block.kind === "bullets") {
    const bullets = (block.bullets || []).slice(0, 8).map((b) => `<li>${esc(b)}</li>`).join("");
    return `<div class="bullets">
      <div class="blockTitle">${esc(block.title)}</div>
      <ul>${bullets}</ul>
    </div>`;
  }
  if (block.kind === "kpiTiles") {
    const chart = chartsById[block.chartId];
    return `<div class="block">
      ${block.title ? `<div class="blockTitle">${esc(block.title)}</div>` : ""}
      ${renderKpiTiles((chart?.data_rows as any[]) || [])}
    </div>`;
  }
  if (block.kind === "chart") {
    const chart = chartsById[block.chartId];
    const fw = block.fullWidth ? " block-fullWidth" : "";
    return `<div class="block${fw}">
      ${block.title ? `<div class="blockTitle">${esc(block.title)}</div>` : ""}
      <div class="chartBox" data-chart-id="${esc(block.chartId)}"></div>
      ${chart?.warnings?.length ? `<div class="warning">${esc(chart.warnings.join(" "))}</div>` : ""}
    </div>`;
  }
  if (block.kind === "table") {
    const head = `<tr>${block.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
    const body = block.rows
      .slice(0, 12)
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("");
    return `<div class="block block-fullWidth">
      <div class="blockTitle">${esc(block.title)}</div>
      <table class="tbl">${head}${body}</table>
    </div>`;
  }
  if (block.kind === "notes") {
    return `<div class="notes">${esc(block.text)}</div>`;
  }
  return "";
}

function slideHtml(slide: DeckSlide, chartsById: Record<string, ChartArtifact>): string {
  const blocks = slide.blocks.map((b) => blockHtml(b, chartsById)).join("");
  const layoutClass = slide.layout === "titleHook" ? "slide-title slide-titleHook" : `slide-${slide.layout}`;
  return `<section class="slide ${layoutClass}">
    ${slide.layout !== "titleHook" ? `<div class="slideHeader"><div class="slideTitle">${esc(slide.title)}</div></div>` : ""}
    <div class="slideBody">${blocks}</div>
  </section>`;
}

/**
 * Returns an HTML deck that self-renders Vega-Lite charts via CDN `vega-embed`.
 * The caller (browser) can export to PDF (e.g. per-slide jsPDF + html2canvas in businessDeckPdf.js).
 */
export function buildDeckHtml(params: {
  deck: PlannedDeck;
  charts: ChartArtifact[];
  brand?: { primary?: string };
}): string {
  const chartsById: Record<string, ChartArtifact> = {};
  for (const c of params.charts) chartsById[c.id] = c;

  const slides = params.deck.slides.map((s) => slideHtml(s, chartsById)).join("\n");
  const chartPayload = params.charts.reduce((acc, c) => {
    acc[c.id] = { spec: c.spec, data: c.data_rows };
    return acc;
  }, {} as Record<string, unknown>);

  return `<!doctype html>
<html data-deck-version="2" data-layout="slide-structure-logic">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>FlipIQ Deck</title>
    <style>
      :root {
        --primary: ${esc(params.brand?.primary ?? "#EA580C")};
        --primary-rgb: 234, 88, 12;
        --secondary: #C2410C;
        --accent: #FBBF24;
        --dark: #2c3e50;
        --gray: #333;
        --light-gray: #f8f9fa;
        --font-main: Arial, ui-sans-serif, system-ui, sans-serif;
        --font-size-huge: 3.5em;
        --font-size-large: 2.5em;
        --font-size-medium: 2em;
        --font-size-body: 1em;
        --spacing-md: 20px;
        --spacing-lg: 25px;
        --border-radius: 10px;
        --box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { margin:0; font-family: var(--font-main); line-height: 1.6; color: var(--gray); background: linear-gradient(135deg, #0B1220 0%, #1e293b 100%); }
      .deck { padding: 24px; display: flex; flex-direction: column; gap: 20px; max-width: 1320px; margin: 0 auto; }
      .slide { width: 1280px; min-height: 720px; background: #FFFFFF; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); overflow: hidden; position: relative; padding: 40px; }
      .slideHeader { padding: 0 0 20px 0; margin-bottom: 20px; border-bottom: 4px solid var(--primary); }
      .slideTitle { font-size: var(--font-size-large); font-weight: 800; color: var(--dark); letter-spacing: -0.3px; }
      .slideBody { display: grid; gap: var(--spacing-md); }
      .slide-title .slideBody, .slide-titleHook .slideBody { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 24px; text-align: center; }
      .slide-title .slideBody .titleBlock, .slide-titleHook .slideBody .titleBlock { align-items: center; }
      .deckTitle { font-size: var(--font-size-huge); font-weight: 900; color: var(--dark); letter-spacing: -0.8px; }
      .deckSubtitle { font-size: 1.1em; color: #475569; font-weight: 600; }
      .heroNumbers { display: flex; flex-wrap: wrap; justify-content: center; gap: 30px; margin-top: 20px; }
      .heroNum { text-align: center; }
      .heroVal { display: block; font-size: 2em; font-weight: 900; color: var(--primary); }
      .heroLabel { font-size: 0.75em; color: #64748B; text-transform: uppercase; letter-spacing: 1px; }
      .heroLocation .heroVal { font-size: 1.2em; color: var(--dark); }
      .roiBox { background: linear-gradient(135deg, #f39c12, #e67e22); color: white; padding: 30px; border-radius: 15px; text-align: center; box-shadow: var(--box-shadow); }
      .roiNumber { font-size: var(--font-size-huge); font-weight: 900; }
      .roiLabel { font-size: 1em; opacity: 0.95; margin-top: 8px; }
      .highlightBox { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: var(--spacing-lg); border-radius: var(--border-radius); text-align: center; box-shadow: var(--box-shadow); }
      .highlightTitle { font-size: 1.2em; font-weight: 800; margin-bottom: 8px; }
      .highlightContent { font-size: 1em; line-height: 1.5; }
      .notes { font-size: 12px; color: #64748B; margin-top: 14px; }
      .blockTitle { font-size: 1.1em; font-weight: 800; color: var(--dark); margin-bottom: 10px; border-left: 5px solid var(--primary); padding-left: 15px; }
      .bullets ul { margin: 0; padding-left: 22px; color: #334155; font-size: 15px; line-height: 1.6; }
      .kpiGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .kpi { border: 1px solid #E2E8F0; border-radius: 14px; padding: 14px; background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%); }
      .kpiLabel { font-size: 11px; color: #64748B; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; }
      .kpiValue { font-size: 18px; font-weight: 900; color: var(--dark); margin-top: 8px; }
      .chartBox { width: 100%; height: 400px; border: 1px solid #E2E8F0; border-radius: 14px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .warning { font-size: 12px; color: #B45309; margin-top: 8px; background: #fff3cd; padding: 10px; border-radius: 8px; border: 1px solid #ffc107; }
      .tbl { width: 100%; border-collapse: collapse; }
      .tbl th { background: linear-gradient(135deg, var(--dark), #34495e); color: white; padding: 12px 15px; text-align: left; }
      .tbl td { padding: 10px 15px; border-bottom: 1px solid #e2e8f0; }
      .tbl tr:nth-child(even) { background: var(--light-gray); }
      .slide-twoColumn .slideBody { grid-template-columns: 1fr 1fr; }
      .slide-twoColumn .slideBody .block-fullWidth { grid-column: 1 / -1; }
      .slide-oneColumn .slideBody { grid-template-columns: 1fr; }
      .slide-chartFocus .slideBody { grid-template-columns: 1fr; }
      @media print { .slide { page-break-after: always; } }
      /* PDF raster capture: flatter chrome, consistent slide chrome (html2canvas) */
      html.pdf-export body { background: #f1f5f9 !important; }
      html.pdf-export .deck { padding: 16px !important; gap: 0 !important; max-width: none !important; margin: 0 !important; }
      html.pdf-export .slide {
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08) !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        margin-bottom: 0 !important;
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  </head>
  <body>
    <div class="deck">
      ${slides}
    </div>
    <script>
      window.__flipiqCharts = ${JSON.stringify(chartPayload)};
      async function renderAll() {
        const nodes = Array.from(document.querySelectorAll('[data-chart-id]'));
        for (const node of nodes) {
          const id = node.getAttribute('data-chart-id');
          const payload = window.__flipiqCharts[id];
          if (!payload || !payload.spec) {
            node.innerHTML = '<div style="color:#64748B;font-size:13px;">Chart unavailable</div>';
            continue;
          }
          const spec = Object.assign({}, payload.spec);
          spec.data = { values: payload.data || [] };
          try {
            await vegaEmbed(node, spec, { actions: false, renderer: 'svg' });
          } catch (e) {
            node.innerHTML = '<div style="color:#DC2626;font-size:13px;">Chart render failed</div>';
          }
        }
        window.__deckReady = true;
        window.parent?.postMessage({ type: 'flipiq_deck_ready' }, '*');
      }
      renderAll();
    </script>
  </body>
</html>`;
}

