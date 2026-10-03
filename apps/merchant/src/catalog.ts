/**
 * What the reference merchant sells. Prices are chosen to exercise the demo stipend:
 * reports fit under a 50-cent cap, the dataset deliberately does not.
 */
export interface CatalogItem {
  path: string;
  method: "GET";
  /** Decimal string in whole token units, converted at startup with the token's decimals. */
  price: string;
  title: string;
  description: string;
  tag: "data" | "inference" | "search";
}

export const CATALOG: CatalogItem[] = [
  {
    path: "/reports/:id",
    method: "GET",
    price: "0.40",
    title: "Company report",
    description: "A short synthesized briefing for a public company.",
    tag: "data",
  },
  {
    path: "/quotes/:symbol",
    method: "GET",
    price: "0.10",
    title: "Quote snapshot",
    description: "Latest reference price and a 24h range for a symbol.",
    tag: "data",
  },
  {
    path: "/search",
    method: "GET",
    price: "0.25",
    title: "Filings search",
    description: "Keyword search across recent filings. Query with ?q=.",
    tag: "search",
  },
  {
    path: "/datasets/:id",
    method: "GET",
    price: "5.00",
    title: "Full dataset",
    description: "A bulk export. Priced above a typical per-call cap on purpose.",
    tag: "data",
  },
];

const COMPANIES: Record<string, { name: string; sector: string; summary: string }> = {
  "1": {
    name: "Northwind Robotics",
    sector: "Industrial automation",
    summary:
      "Northwind sells pick-and-place arms to mid-size warehouses. Backlog grew for a third quarter; margin pressure comes from sensor costs.",
  },
  "2": {
    name: "Harbor Grid",
    sector: "Energy storage",
    summary:
      "Harbor Grid operates behind-the-meter batteries for commercial sites and sells capacity into day-ahead markets. Utilization is seasonal.",
  },
  "3": {
    name: "Lumen Bio",
    sector: "Diagnostics",
    summary:
      "Lumen Bio's point-of-care assay is in a second pivotal study. Cash runway is roughly six quarters at the current burn.",
  },
  "42": {
    name: "Tessellate Software",
    sector: "Developer tools",
    summary:
      "Tessellate sells a build cache to large engineering orgs. Net revenue retention above 120%; the risk is a single large customer.",
  },
};

export function reportFor(id: string) {
  const c = COMPANIES[id] ?? {
    name: `Company #${id}`,
    sector: "Unclassified",
    summary: "No analyst coverage yet. Metrics below are modeled from public filings.",
  };
  const seed = [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return {
    id,
    ...c,
    metrics: {
      revenueGrowthPct: 8 + (seed % 23),
      grossMarginPct: 35 + (seed % 40),
      headcount: 40 + ((seed * 7) % 900),
    },
    generatedAt: new Date().toISOString(),
  };
}

export function quoteFor(symbol: string) {
  const s = symbol.toUpperCase();
  const seed = [...s].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 100000;
  const price = 20 + (seed % 480) + (seed % 100) / 100;
  return {
    symbol: s,
    price: Number(price.toFixed(2)),
    low24h: Number((price * 0.985).toFixed(2)),
    high24h: Number((price * 1.012).toFixed(2)),
    asOf: new Date().toISOString(),
  };
}

export function searchFor(q: string) {
  const term = q.trim().toLowerCase();
  const hits = Object.entries(COMPANIES)
    .filter(([, c]) => !term || `${c.name} ${c.sector} ${c.summary}`.toLowerCase().includes(term))
    .map(([id, c]) => ({ id, name: c.name, sector: c.sector, report: `/reports/${id}` }));
  return { query: q, count: hits.length, hits };
}

export function datasetFor(id: string) {
  const rows = Array.from({ length: 50 }, (_, i) => ({
    row: i + 1,
    company: `Company #${(i * 7 + Number(id || 1)) % 97}`,
    value: Number(((i * 13.7) % 100).toFixed(2)),
  }));
  return { id, rows, exportedAt: new Date().toISOString() };
}
