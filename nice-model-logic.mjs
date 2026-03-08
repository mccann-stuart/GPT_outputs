/* ═══════════════════════════════════════════
   NICE Ltd (NASDAQ: NICE) — MODEL LOGIC
   Base year: FY2025 (year ended 31 Dec 2025)
   Currency: USD $m unless otherwise stated

   Key sources used for calibration (public):
   - FY2025 Annual Report / Form 20-F Binder (income statement, revenue mix, segment revenue)
     https://resources.nice.com/wp-content/uploads/2026/02/Annual-Report-2025-20-F-Binder.pdf
   - FY2025 Q4 Earnings Presentation (non-GAAP highlights, AI ARR, RPO/backlog)
     https://resources.nice.com/wp-content/uploads/2026/02/NICE-Earnings-Presentation-2025-Q4-FINAL.pdf
   - Cognigy acquisition investor presentation (15M agents, $330B TAM framing)
     https://resources.nice.com/wp-content/uploads/2025/07/NiCE-to-Acquire-Cognigy-Investor-Presentation-FINAL-1.pdf
   - Q2 2025 investor presentation (3 markets + portfolio outline)
     https://resources.nice.com/wp-content/uploads/2025/08/NiCE-Investors-Presentation-Q2-2025-FINAL.pdf

   Notes:
   - Revenue is GAAP; many profitability lines below include both GAAP and “adj/Non-GAAP” when available.
   - Product driver trees are editable assumptions; not company guidance.
   ═══════════════════════════════════════════ */

export const META = {
  company: "NICE Ltd",
  ticker: "NICE",
  exchange: "NASDAQ",
  baseYear: 2025,
  currency: "USD",
  unit: "$m",
};

/* ═══════════════════════════════════════════
   ACTUAL FINANCIALS — FY2023–FY2025
   (GAAP from 20-F; non-GAAP highlights from Q4’25 deck)
   ═══════════════════════════════════════════ */
export const ACTUALS = {
  group: [
    // FY2023 (GAAP)
    {
      year: 2023,
      label: "FY2023",
      rev: 2377.5,
      cloudRev: 1581.8,
      servicesRev: 641.4,
      productRev: 154.3,
      cogs: 768.2,
      gp: 1609.3,
      gpM: 1609.3 / 2377.5,
      opEx: 1174.1,
      opInc: 435.2,
      opM: 435.2 / 2377.5,
      pbt: 457.7,
      tax: 119.4,
      pat: 338.3,
      eps: 5.11, // diluted EPS (GAAP)
      cashGenOps: 561.4, // Net cash provided by operating activities
      // Non-GAAP fields not filled for FY2023 (leave null / user can add)
      adjOpInc: null,
      adjOpM: null,
      adjEps: null,
    },

    // FY2024
    {
      year: 2024,
      label: "FY2024",
      rev: 2735.3,
      cloudRev: 1984.2,
      servicesRev: 596.0,
      productRev: 155.1,
      cogs: 909.5,
      gp: 1825.7,
      gpM: 1825.7 / 2735.3,
      opEx: 1279.8,
      opInc: 546.0,
      opM: 546.0 / 2735.3,
      pbt: 604.8,
      tax: 162.2,
      pat: 442.6,
      eps: 6.76, // diluted EPS (GAAP)
      cashGenOps: 832.6,
      // Non-GAAP (Q4’25 press materials / deck reference points)
      adjGp: 1942.7,     // non-GAAP gross profit
      adjGpM: 0.710,     // non-GAAP gross margin
      adjOpInc: 849.6,   // non-GAAP operating income
      adjOpM: 0.311,     // non-GAAP operating margin
      adjEps: 11.12,     // non-GAAP diluted EPS
    },

    // FY2025
    {
      year: 2025,
      label: "FY2025",
      rev: 2945.4,
      cloudRev: 2238.4,
      servicesRev: 560.0,
      productRev: 147.0,
      cogs: 989.3,
      gp: 1956.1,
      gpM: 1956.1 / 2945.4,
      opEx: 1310.4,
      opInc: 645.8,
      opM: 645.8 / 2945.4,
      pbt: 704.0,
      tax: 91.9,
      pat: 612.1,
      eps: 9.67, // diluted EPS (GAAP)
      cashGenOps: 716.5,
      // Non-GAAP (Q4’25 earnings presentation)
      adjOpInc: 908.0,
      adjOpM: 0.308,
      adjEps: 12.30,
      // Balance-sheet anchor (press release)
      netCash: 417.4, // cash + cash equivalents + short-term investments; no debt
    },
  ],

  // Reportable segments (20-F segment note)
  // Revenue ($m) and Operating Income ($m)
  segments: {
    2023: [
      { name: "Customer Engagement", rev: 1974.1, opInc: 456.8 },
      { name: "Financial Crime & Compliance", rev: 403.4, opInc: 129.0 },
      { name: "Not allocated", rev: 0.0, opInc: -150.6 },
    ],
    2024: [
      { name: "Customer Engagement", rev: 2281.8, opInc: 574.3 },
      { name: "Financial Crime & Compliance", rev: 453.5, opInc: 158.3 },
      { name: "Not allocated", rev: 0.0, opInc: -186.7 },
    ],
    2025: [
      { name: "Customer Engagement", rev: 2460.0, opInc: 665.1 },
      { name: "Financial Crime & Compliance", rev: 485.4, opInc: 166.8 },
      { name: "Not allocated", rev: 0.0, opInc: -186.2 },
    ],
  },

  // “Operational anchors” (primarily Q4’25 earnings deck; editable)
  kpis: {
    2025: {
      aiSelfServiceARR: 328,  // $m
      aiArrYoY: 0.66,         // +66% YoY
      aiAsPctCloudRev: 0.13,  // 13% of total cloud revenue
      rpo_total: 3674,        // $m
      rpo_cloud: 3184,        // $m
      rpo_nonCloud: 490,      // $m
      cloudBacklogYoY: 0.25,  // +25% YoY (deck callout)
      cloudBacklogYoY_exCognigy: 0.22,
    },
  },
};

/* ═══════════════════════════════════════════
   9 PRODUCT DRIVER TREES (calibrated to FY2025 total revenue ≈ $2,945m)
   Structure follows the provided template:
   - quantity: multiplicative factors ending with a share/win-rate driver
   - price: (base monthly + add-on monthly) × 12 + annual activation/implementation
   - calcTAM() interprets “SOM” as the modelled NICE revenue for that product
   ═══════════════════════════════════════════ */
export const PRODUCTS = [
  /* ─────────────────────────────
     CUSTOMER EXPERIENCE (CXone)
     ───────────────────────────── */
  {
    id: "cxone_core",
    name: "CXone — Core CCaaS",
    cat: "Customer Experience",
    color: "#8b5cf6",
    tamUnit: "Agent seats",
    eq: "Agent seats × annual ARPU",
    bcg: "Core CCaaS subscription (routing + omnichannel) remains the monetisation anchor; seat growth driven by cloud migration and partner-led enterprise wins.",
    businessLine: "CXone (core subscription)",
    businessLineExplanation:
      "Seat-based CCaaS subscriptions for enterprise contact centres; core routing/ACD plus digital + voice channels (platform foundation for add-ons).",
    quantity: [
      { l: "Addressable contact centre agents (global)", v: 15000000 },
      { l: "Enterprise / complex-contact share of agents", v: 0.70 },
      { l: "CCaaS adoption rate", v: 0.55 },
      { l: "NICE share of CCaaS seats", v: 0.142 },
    ],
    price: [
      { l: "Base monthly subscription (per agent)", v: 110 },
      { l: "Add-on monthly (voice/digital packaging)", v: 15 },
      { l: "Annual implementation & success fees", v: 150 },
    ],
    cagr: [
      { l: "CCaaS migration tailwind", v: 0.06 },
      { l: "Enterprise expansion / partner GTM", v: 0.03 },
      { l: "Price/mix (bundles, premium tiers)", v: 0.01 },
      { l: "Macro / procurement friction", v: -0.01 },
    ],
    anchors: [
      { m: "FY2025 total revenue", v: "$2,945m" },
      { m: "FY2025 cloud revenue", v: "$2,238m" },
      { m: "Global agent base reference", v: "15M agents" },
      { m: "CX/AI TAM framing", v: "$330B TAM (2028)" },
    ],
  },

  {
    id: "cxone_wem",
    name: "CXone — Workforce Engagement (WEM)",
    cat: "Customer Experience",
    color: "#a78bfa",
    tamUnit: "Agent seats",
    eq: "Agent seats × annual ARPU",
    bcg: "WEM attaches to core CCaaS at high rates in enterprise; share benefits from platform standardisation and compliance/recording needs.",
    businessLine: "CXone WEM (WFM/QM/recording)",
    businessLineExplanation:
      "Workforce engagement management modules (workforce management, quality management, recording, performance) priced largely per agent seat.",
    quantity: [
      { l: "Addressable contact centre agents (global)", v: 15000000 },
      { l: "Enterprise / complex-contact share of agents", v: 0.70 },
      { l: "CCaaS adoption rate", v: 0.55 },
      { l: "WEM attach rate on CCaaS seats", v: 0.65 },
      { l: "NICE share / win rate", v: 0.142 },
    ],
    price: [
      { l: "Base monthly WEM modules (per agent)", v: 50 },
      { l: "Add-on monthly (recording/compliance)", v: 5 },
      { l: "Annual services/enablement", v: 90 },
    ],
    cagr: [
      { l: "Attach expansion (WEM penetration)", v: 0.03 },
      { l: "Workforce modernisation", v: 0.02 },
      { l: "Seat growth levered to CCaaS", v: 0.03 },
      { l: "Price pressure (competition)", v: -0.01 },
    ],
    anchors: [
      { m: "Segment: Customer Engagement (FY2025)", v: "$2,460m" },
      { m: "Partner-led wins (qualitative)", v: "High partner involvement" },
      { m: "Cloud mix continues rising", v: "Cloud is majority of revenue" },
      { m: "Platform cross-sell motion", v: "Core → add-ons" },
    ],
  },

  {
    id: "cxone_ai",
    name: "CXone — AI & Self‑Service",
    cat: "Customer Experience",
    color: "#7c3aed",
    tamUnit: "AI-enabled seats",
    eq: "AI-enabled seats × annual ARPU",
    bcg: "AI monetisation shifts spend from labour to software; consumption and orchestration expand ARPU over time as containment rises from low single digits.",
    businessLine: "Enlighten / Autopilot / Conversational AI (incl. Cognigy)",
    businessLineExplanation:
      "AI capabilities across self-service, agent augmentation and orchestration (incl. Cognigy conversational AI). Monetisation via per-seat and expanding consumption-based elements.",
    quantity: [
      { l: "Addressable contact centre agents (global)", v: 15000000 },
      { l: "Enterprise / complex-contact share of agents", v: 0.70 },
      { l: "CCaaS adoption rate", v: 0.55 },
      { l: "AI attach rate (paid AI modules)", v: 0.35 },
      { l: "NICE share / win rate", v: 0.142 },
    ],
    price: [
      { l: "Base monthly AI subscription (per seat)", v: 65 },
      { l: "Usage / consumption component (avg/month)", v: 15 },
      { l: "Annual implementation/guardrails", v: 85 },
    ],
    cagr: [
      { l: "AI attach + upsell", v: 0.10 },
      { l: "Consumption expansion", v: 0.08 },
      { l: "Platform adoption tailwind", v: 0.05 },
      { l: "Model/LLM cost headwinds", v: -0.02 },
    ],
    anchors: [
      { m: "AI & Self‑Service ARR (FY2025)", v: "$328m" },
      { m: "AI ARR YoY growth", v: "+66%" },
      { m: "AI as % of cloud revenue", v: "13%" },
      { m: "AI market adoption reference", v: "~5% contained" },
    ],
  },

  {
    id: "cxone_analytics",
    name: "CXone — Analytics & Workflow Orchestration",
    cat: "Customer Experience",
    color: "#6d28d9",
    tamUnit: "Agent seats",
    eq: "Agent seats × annual ARPU",
    bcg: "Orchestration + analytics monetise the ‘intent-to-fulfilment’ workflow layer; attach grows as enterprises industrialise CX automation beyond the contact centre.",
    businessLine: "Analytics / Knowledge / Orchestration Studio",
    businessLineExplanation:
      "Add-on analytics, knowledge, journey/workflow orchestration and operational tooling, typically priced per seat plus services.",
    quantity: [
      { l: "Addressable contact centre agents (global)", v: 15000000 },
      { l: "Enterprise / complex-contact share of agents", v: 0.70 },
      { l: "CCaaS adoption rate", v: 0.55 },
      { l: "Analytics/orchestration attach rate", v: 0.45 },
      { l: "NICE share / win rate", v: 0.142 },
    ],
    price: [
      { l: "Base monthly analytics/orchestration (per seat)", v: 25 },
      { l: "Add-on monthly (knowledge/journey)", v: 5 },
      { l: "Annual services/enablement", v: 46 },
    ],
    cagr: [
      { l: "Attach expansion (workflow automation)", v: 0.06 },
      { l: "Data/AI value capture", v: 0.03 },
      { l: "Seat growth levered to CCaaS", v: 0.03 },
      { l: "Bundle dilution", v: -0.01 },
    ],
    anchors: [
      { m: "CX platform messaging", v: "Workflows • Agents • Knowledge" },
      { m: "CX partner ecosystem (slide)", v: "400+ partners" },
      { m: "Marketplace apps (slide)", v: "170+ apps" },
      { m: "Wins involving partners (slide)", v: "75%" },
    ],
  },

  /* ─────────────────────────────
     PUBLIC SAFETY & JUSTICE
     ───────────────────────────── */
  {
    id: "evidencentral",
    name: "Evidencentral — Digital Evidence Management",
    cat: "Public Safety & Justice",
    color: "#3b82f6",
    tamUnit: "Agencies",
    eq: "Agencies × annual contract value",
    bcg: "Evidence digitisation + AI drives consolidation around cloud platforms; multi-constituent justice workflows create defensible switching costs.",
    businessLine: "Evidencentral (cloud evidence platform)",
    businessLineExplanation:
      "Cloud digital evidence management across police, prosecution, defence, courts and corrections; typically contracted per agency/cluster with storage and AI add-ons.",
    quantity: [
      { l: "Addressable public safety/justice agencies (global)", v: 30000 },
      { l: "Cloud evidence platform adoption rate", v: 0.25 },
      { l: "NICE share / win rate", v: 0.20 },
    ],
    price: [
      { l: "Base monthly platform fee (per agency)", v: 7083 },   // ~85k/year
      { l: "Monthly add-ons (storage/AI)", v: 2083 },            // ~25k/year
      { l: "Annual implementation", v: 10000 },
    ],
    cagr: [
      { l: "Evidence digitisation tailwind", v: 0.04 },
      { l: "Cloud adoption in justice", v: 0.03 },
      { l: "AI attach / storage growth", v: 0.02 },
      { l: "Budget cycles / public procurement", v: -0.02 },
    ],
    anchors: [
      { m: "Positioning (investor deck)", v: "‘World’s #1’ platform" },
      { m: "Value chain coverage", v: "Police → Courts" },
      { m: "Justice market highlighted", v: "Specialised market" },
      { m: "Cross-entity workflow", v: "Connected system" },
    ],
  },

  {
    id: "emergency",
    name: "Emergency Comms & Investigations",
    cat: "Public Safety & Justice",
    color: "#2563eb",
    tamUnit: "Dispatch centres",
    eq: "Centres × annual contract value",
    bcg: "911/112 modernisation + analytics supports durable renewal base; incremental growth via cloud migrations and AI-enabled workflows.",
    businessLine: "Emergency communications / investigations",
    businessLineExplanation:
      "Emergency communications and investigative/justice workflow tooling sold to dispatch centres and agencies; typically contracted as multi-year enterprise software + services.",
    quantity: [
      { l: "Addressable emergency communication centres (global)", v: 10000 },
      { l: "Modernisation / platform adoption rate", v: 0.25 },
      { l: "NICE share / win rate", v: 0.16 },
    ],
    price: [
      { l: "Base monthly software/platform (per centre)", v: 12000 }, // 144k/year
      { l: "Monthly add-ons (analytics/workflow)", v: 4000 },         // 48k/year
      { l: "Annual implementation", v: 8000 },
    ],
    cagr: [
      { l: "Cloud modernisation", v: 0.03 },
      { l: "AI/analytics attach", v: 0.02 },
      { l: "Installed-base renewal uplift", v: 0.02 },
      { l: "Procurement friction", v: -0.02 },
    ],
    anchors: [
      { m: "Award (investor deck)", v: "Best 911 solution" },
      { m: "Market labelled as specialised", v: "PS&J focus" },
      { m: "Cross-system integration", v: "Justice system" },
      { m: "Recurring nature", v: "Multi-year contracts" },
    ],
  },

  /* ─────────────────────────────
     FINANCIAL CRIME & COMPLIANCE (Actimize)
     ───────────────────────────── */
  {
    id: "aml",
    name: "Actimize — AML & Case Management",
    cat: "Financial Crime & Compliance",
    color: "#22c55e",
    tamUnit: "Institutions",
    eq: "Institutions × annual contract value",
    bcg: "Regulatory pressure + rising complexity sustain spend; differentiation via network analytics and embedded AI increases wallet share per institution.",
    businessLine: "Actimize AML / investigations",
    businessLineExplanation:
      "Anti-money laundering, investigations and case management platforms sold to banks and financial institutions (enterprise licences + services).",
    quantity: [
      { l: "Addressable Tier 1–3 financial institutions", v: 2500 },
      { l: "Advanced AML platform adoption rate", v: 0.65 },
      { l: "NICE share / win rate", v: 0.22 },
    ],
    price: [
      { l: "Base monthly licence (per institution)", v: 45000 },
      { l: "Add-on monthly (analytics/identity)", v: 5000 },
      { l: "Annual services (integration/ops)", v: 15000 },
    ],
    cagr: [
      { l: "Regulatory / enforcement intensity", v: 0.03 },
      { l: "AI/analytics upsell", v: 0.02 },
      { l: "International expansion", v: 0.01 },
      { l: "Procurement/budget drag", v: -0.01 },
    ],
    anchors: [
      { m: "Segment: FC&C (FY2025)", v: "$485m" },
      { m: "Portfolio includes AML", v: "Actimize suite" },
      { m: "Top bank presence (slide)", v: "4/5 top US banks" },
      { m: "Top bank presence (slide)", v: "10/10 EU & APAC" },
    ],
  },

  {
    id: "fraud",
    name: "Actimize — Fraud & Identity",
    cat: "Financial Crime & Compliance",
    color: "#16a34a",
    tamUnit: "Institutions",
    eq: "Institutions × annual contract value",
    bcg: "Digital transaction growth + fraud innovation sustain demand; platform value rises with identity resolution and network effects.",
    businessLine: "Actimize EFM / fraud",
    businessLineExplanation:
      "Enterprise fraud management and related identity/analytics capabilities for banks, fintechs and payments providers.",
    quantity: [
      { l: "Addressable banks/fintech/payments providers", v: 3000 },
      { l: "Enterprise fraud platform adoption rate", v: 0.55 },
      { l: "NICE share / win rate", v: 0.20 },
    ],
    price: [
      { l: "Base monthly licence (per institution)", v: 38000 },
      { l: "Add-on monthly (identity/network)", v: 5000 },
      { l: "Annual services", v: 29000 },
    ],
    cagr: [
      { l: "Fraud intensity (digital growth)", v: 0.03 },
      { l: "AI & network analytics upsell", v: 0.03 },
      { l: "Platform expansion", v: 0.01 },
      { l: "Pricing pressure", v: -0.01 },
    ],
    anchors: [
      { m: "Portfolio includes EFM", v: "Actimize suite" },
      { m: "Market leadership callouts", v: "Analyst recognition" },
      { m: "Large bank footprint", v: "Top-bank coverage" },
      { m: "Segment growth lever", v: "Upsell/attach" },
    ],
  },

  {
    id: "markets",
    name: "Actimize — Markets Compliance",
    cat: "Financial Crime & Compliance",
    color: "#15803d",
    tamUnit: "Institutions",
    eq: "Institutions × annual contract value",
    bcg: "Surveillance and communications compliance remain ‘must-have’; consolidation around fewer vendors benefits platforms with breadth and scale.",
    businessLine: "Financial markets compliance",
    businessLineExplanation:
      "Trade surveillance, communications compliance and related controls for investment banks/broker-dealers.",
    quantity: [
      { l: "Addressable investment banks / broker-dealers", v: 1200 },
      { l: "Modern surveillance adoption rate", v: 0.60 },
      { l: "NICE share / win rate", v: 0.18 },
    ],
    price: [
      { l: "Base monthly licence (per institution)", v: 50000 },
      { l: "Add-on monthly (communications + analytics)", v: 4500 },
      { l: "Annual services", v: 0 },
    ],
    cagr: [
      { l: "Regulatory intensity", v: 0.02 },
      { l: "Data volumes / analytics", v: 0.02 },
      { l: "Cross-sell within Actimize", v: 0.01 },
      { l: "Budget drag", v: -0.01 },
    ],
    anchors: [
      { m: "Portfolio includes markets compliance", v: "Actimize suite" },
      { m: "Top global IB coverage (slide)", v: "10/10" },
      { m: "Recurring licensing", v: "Enterprise software" },
      { m: "Cross-sell adjacency", v: "AML/Fraud attach" },
    ],
  },
];

export const CATS = ["Customer Experience", "Financial Crime & Compliance", "Public Safety & Justice"];

export const CAT_C = {
  "Customer Experience": "#8b5cf6",
  "Financial Crime & Compliance": "#22c55e",
  "Public Safety & Justice": "#3b82f6",
};

export const PROJ_YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);
export const ALL_YEARS = [2023, 2024, 2025, ...PROJ_YEARS.filter(y => y > 2025)];

/* ─────────────────────────────
   Formatting helpers
   ───────────────────────────── */
export const fN = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}bn`;
  return `${n.toFixed(0)}m`;
};

export const fP = (n) => {
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
};

export const fM = (n) => {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
};

export const cagr = (s, e, n) => (s > 0 && e > 0 && n > 0 ? (Math.pow(e / s, 1 / n) - 1) : 0);

/* ─────────────────────────────
   Core model calculations
   ───────────────────────────── */
export function calcTAM(p) {
  // Billable units (already includes share/win-rate factor inside quantity tree)
  const u = p.quantity.reduce((a, q) => a * q.v, 1);

  // Annual ARPU / ACV
  const ar = (p.price[0].v + p.price[1].v) * 12 + p.price[2].v;

  // SOM in $m
  const som = (u * ar) / 1e6;

  // TAM in $m (remove the share/win-rate factor)
  const shareDriver =
    p.quantity.find(q => q.l.toLowerCase().includes("share") || q.l.toLowerCase().includes("win rate")) ||
    p.quantity[p.quantity.length - 1];

  const share = shareDriver?.v ?? 0;
  const tam = share > 0 ? som / share : 0;

  return { u, ar, tam, som };
}

export function calcCAGR(p) {
  return p.cagr.reduce((s, c) => s + c.v, 0);
}

/* ─────────────────────────────
   Default projection settings
   - gpM and opxR are “blended” and intentionally simple
   - centralCost kept for compatibility with the template
   ───────────────────────────── */
export const DEFAULT_SETTINGS = {
  prods: PRODUCTS,
  gpM: 0.696,  // aligns to FY2025 non-GAAP gross margin (approx)
  opxR: 0.388, // rough: gross margin - operating margin (FY2025)
  taxR: 0.13,  // FY2025 GAAP effective tax approx (simple)
  centralCost: 0,
};

export function resolveInitialSettings(input = {}) {
  if (input === null) input = {};

  const gpM = Number.isFinite(Number(input.gpM)) ? Number(input.gpM) : DEFAULT_SETTINGS.gpM;
  const opxR = Number.isFinite(Number(input.opxR)) ? Number(input.opxR) : DEFAULT_SETTINGS.opxR;
  const taxR = Number.isFinite(Number(input.taxR)) ? Number(input.taxR) : DEFAULT_SETTINGS.taxR;
  const centralCost = Number.isFinite(Number(input.centralCost)) ? Number(input.centralCost) : DEFAULT_SETTINGS.centralCost;

  const inputProds = Array.isArray(input.prods) ? input.prods : null;

  const prods = inputProds
    ? PRODUCTS.map((defaultProd, index) => {
      const matchingProd = inputProds.find(p => p?.id === defaultProd.id) || inputProds[index];
      if (!matchingProd) return defaultProd;

      return {
        ...defaultProd,
        ...matchingProd,
        quantity: Array.isArray(matchingProd.quantity) ? matchingProd.quantity : defaultProd.quantity,
        price: Array.isArray(matchingProd.price) ? matchingProd.price : defaultProd.price,
        cagr: Array.isArray(matchingProd.cagr) ? matchingProd.cagr : defaultProd.cagr,
        anchors: Array.isArray(matchingProd.anchors) ? matchingProd.anchors : defaultProd.anchors,
      };
    })
    : DEFAULT_SETTINGS.prods;

  return { prods, gpM, opxR, taxR, centralCost };
}