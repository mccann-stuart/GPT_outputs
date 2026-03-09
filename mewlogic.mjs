/* ═══════════════════════════════════════════════════════════════════
   NICE Ltd (NASDAQ: NICE) — UNIFIED MARKET MODEL LOGIC v3.0
   Base year: FY2025 · Currency: USD $m
   11 Product Driver Trees · S-Curve Adoption · FY2022–FY2035 Projections

   Sources:
   - NICE 20-F Annual Reports (FY2022–FY2025)
   - FY2025 Q4 Earnings Presentation (Non-GAAP, AI ARR, RPO)
   - Cognigy Acquisition Investor Presentation ($330B TAM, 15M agents)
   - Q2 2025 Investor Presentation (3 markets + portfolio)
   ═══════════════════════════════════════════════════════════════════ */

export const META = {
    company: "NICE Ltd",
    ticker: "NICE",
    exchange: "NASDAQ",
    baseYear: 2025,
    currency: "USD",
    unit: "$m",
};

/* ═══════════════════════════════════════════
   ACTUAL FINANCIALS — FY2022–FY2025
   GAAP from 20-F; Non-GAAP from earnings deck
   ═══════════════════════════════════════════ */
export const ACTUALS = {
    group: [
        {
            year: 2022, label: "FY2022",
            rev: 2181.3, cloudRev: 1295.3, servicesRev: 650.1, productRev: 235.9,
            cogs: 684, gp: 1498, gpM: 0.687,
            opInc: 335.2, opM: 0.154, ni: 265.9, eps: 4.02,
            adjGp: 1594.6, adjGpM: 0.731, adjOpInc: 625.1, adjOpM: 0.287, adjNI: 506.8, adjEps: 7.62,
            cashOps: 564, netCash: null,
        },
        {
            year: 2023, label: "FY2023",
            rev: 2377.5, cloudRev: 1581.8, servicesRev: 641.4, productRev: 154.3,
            cogs: 768, gp: 1609, gpM: 0.677,
            opInc: 435.2, opM: 0.183, ni: 338.3, eps: 5.11,
            adjGp: 1708.8, adjGpM: 0.719, adjOpInc: 703.8, adjOpM: 0.296, adjNI: 582.7, adjEps: 8.79,
            cashOps: 563, netCash: null,
        },
        {
            year: 2024, label: "FY2024",
            rev: 2735.3, cloudRev: 1984.2, servicesRev: 596.0, productRev: 155.1,
            cogs: 910, gp: 1826, gpM: 0.668,
            opInc: 546.0, opM: 0.200, ni: 442.6, eps: 6.76,
            adjGp: 1942.7, adjGpM: 0.710, adjOpInc: 849.6, adjOpM: 0.311, adjNI: 728.4, adjEps: 11.12,
            cashOps: 833, netCash: 1163,
        },
        {
            year: 2025, label: "FY2025",
            rev: 2945.4, cloudRev: 2238.4, servicesRev: 560.0, productRev: 147.0,
            cogs: 989, gp: 1956, gpM: 0.664,
            opInc: 645.8, opM: 0.219, ni: 612.1, eps: 9.67,
            adjGp: 2049.5, adjGpM: 0.696, adjOpInc: 907.9, adjOpM: 0.308, adjNI: 778.8, adjEps: 12.30,
            cashOps: 717, netCash: 417,
        },
    ],

    segments: {
        2022: [
            { name: "Customer Engagement", rev: 1768.8, opInc: null },
            { name: "Financial Crime & Compliance", rev: 412.5, opInc: null },
        ],
        2023: [
            { name: "Customer Engagement", rev: 1974.1, opInc: 456.8 },
            { name: "Financial Crime & Compliance", rev: 403.4, opInc: 129.0 },
        ],
        2024: [
            { name: "Customer Engagement", rev: 2281.8, opInc: 574.3 },
            { name: "Financial Crime & Compliance", rev: 453.5, opInc: 158.3 },
        ],
        2025: [
            { name: "Customer Engagement", rev: 2460.0, opInc: 665.1 },
            { name: "Financial Crime & Compliance", rev: 485.4, opInc: 166.8 },
        ],
    },

    revenueByModel: {
        2022: { cloud: 1295.3, services: 650.1, product: 235.9 },
        2023: { cloud: 1581.8, services: 641.4, product: 154.3 },
        2024: { cloud: 1984.2, services: 596.0, product: 155.1 },
        2025: { cloud: 2238.4, services: 560.0, product: 147.0 },
    },

    kpis: {
        2024: { cloudARR: 2100, cloudNRR: 1.11, fortune100: 85, customers: 25000, countries: 150, recurringPct: 0.90 },
        2025: {
            cloudARR: 2400, cloudNRR: 1.09,
            aiARR: 328, aiARRYoY: 0.66, aiPctCloud: 0.13,
            rpoTotal: 3674, rpoCloud: 3184, rpoNonCloud: 490,
            cloudBacklogYoY: 0.25, cognigyExitARR: 85,
        },
    },

    consensus2026: { revLow: 3100, revHigh: 3200, adjEpsLow: 10.85, adjEpsHigh: 11.05, adjOpM: 0.255 },
};

/* ═══════════════════════════════════════════
   11 PRODUCT DRIVER TREES
   4 categories · S-Curve adoption parameters
   Calibrated to FY2025 revenue ≈ $2,945m
   ═══════════════════════════════════════════ */
export const PRODUCTS = [
    /* ── CX CLOUD (4 lines) ───────────────── */
    {
        id: "cxone_core",
        name: "CXone — Core CCaaS",
        cat: "CX Cloud",
        color: "#8b5cf6",
        tamUnit: "Agent seats",
        eq: "Agent seats × annual ARPU",
        bcg: "Core cloud CCaaS — routing, IVR, omnichannel, ACD. #1 by market share. Seat growth driven by cloud migration + partner-led enterprise wins.",
        businessLineExplanation: "CXone flagship cloud-native contact center platform. Seat-based subscriptions for enterprise routing/ACD + digital/voice channels. Foundation for all add-on modules.",
        quantity: [
            { l: "Addressable global agents", v: 15000000 },
            { l: "Enterprise / complex share", v: 0.70, isPct: true },
            { l: "CCaaS adoption rate", v: 0.55, isPct: true },
            { l: "NICE share of CCaaS", v: 0.142, isPct: true },
        ],
        price: [
            { l: "Monthly seat subscription ($)", v: 110 },
            { l: "Monthly add-on (voice/digital)", v: 15 },
            { l: "Annual implementation ($)", v: 150 },
        ],
        cagr: [
            { l: "CCaaS migration tailwind", v: 0.06 },
            { l: "Enterprise expansion / GTM", v: 0.03 },
            { l: "Price/mix improvement", v: 0.01 },
            { l: "Macro / procurement drag", v: -0.01 },
        ],
        sCurve: { ceiling: 2200, k: 0.22, enabled: true },
        anchors: [
            { m: "FY2025 total revenue", v: "$2,945m" },
            { m: "FY2025 cloud revenue", v: "$2,238m" },
            { m: "Global agent base", v: "15M agents" },
            { m: "CX/AI TAM framing", v: "$330B (2028)" },
        ],
    },
    {
        id: "cxone_wem",
        name: "CXone — WEM",
        cat: "CX Cloud",
        color: "#a78bfa",
        tamUnit: "Agent seats",
        eq: "Agent seats × annual ARPU",
        bcg: "WEM attaches to core CCaaS at high rates in enterprise. Compliance/recording needs create durable demand. #1 Gartner MQ.",
        businessLineExplanation: "Workforce engagement: WFM, quality management, recording, performance management. Priced per agent seat with analytics add-ons.",
        quantity: [
            { l: "Addressable global agents", v: 15000000 },
            { l: "Enterprise share", v: 0.70, isPct: true },
            { l: "CCaaS adoption rate", v: 0.55, isPct: true },
            { l: "WEM attach rate", v: 0.65, isPct: true },
            { l: "NICE share / win rate", v: 0.142, isPct: true },
        ],
        price: [
            { l: "Monthly WEM modules ($)", v: 50 },
            { l: "Monthly recording/compliance ($)", v: 5 },
            { l: "Annual services ($)", v: 90 },
        ],
        cagr: [
            { l: "Attach expansion", v: 0.03 },
            { l: "Workforce modernisation", v: 0.02 },
            { l: "Seat growth (levered to CCaaS)", v: 0.03 },
            { l: "Price pressure", v: -0.01 },
        ],
        sCurve: { ceiling: 1100, k: 0.20, enabled: true },
        anchors: [
            { m: "WEM market position", v: "#1 Gartner MQ" },
            { m: "Recording market share", v: "~40%" },
            { m: "Cloud WEM penetration", v: "~35%" },
            { m: "Segment: CE (FY2025)", v: "$2,460m" },
        ],
    },
    {
        id: "cxone_ai",
        name: "CXone — AI & Self-Service",
        cat: "CX Cloud",
        color: "#7c3aed",
        tamUnit: "AI-enabled seats",
        eq: "AI-enabled seats × annual ARPU",
        bcg: "AI monetisation shifts spend from labour to software. Includes Enlighten, Autopilot, Copilot, Mpower agentic AI, and Cognigy conversational AI ($827M acq.).",
        businessLineExplanation: "AI capabilities: self-service bots, agent augmentation, agentic orchestration + Cognigy conversational AI. Per-seat + expanding consumption-based pricing.",
        quantity: [
            { l: "Addressable global agents", v: 15000000 },
            { l: "Enterprise share", v: 0.70, isPct: true },
            { l: "CCaaS adoption rate", v: 0.55, isPct: true },
            { l: "AI attach rate (paid modules)", v: 0.35, isPct: true },
            { l: "NICE share / win rate", v: 0.142, isPct: true },
        ],
        price: [
            { l: "Monthly AI subscription ($)", v: 65 },
            { l: "Monthly usage/consumption ($)", v: 15 },
            { l: "Annual implementation ($)", v: 85 },
        ],
        cagr: [
            { l: "AI attach + upsell", v: 0.10 },
            { l: "Consumption expansion", v: 0.08 },
            { l: "Platform adoption tailwind", v: 0.05 },
            { l: "LLM cost / competition drag", v: -0.02 },
        ],
        sCurve: { ceiling: 2800, k: 0.30, enabled: true },
        anchors: [
            { m: "AI ARR (FY2025)", v: "$328m" },
            { m: "AI ARR YoY growth", v: "+66%" },
            { m: "AI % of cloud revenue", v: "13%" },
            { m: "Cognigy acquisition", v: "$827M" },
        ],
    },
    {
        id: "cxone_analytics",
        name: "CXone — Analytics & Orchestration",
        cat: "CX Cloud",
        color: "#6d28d9",
        tamUnit: "Agent seats",
        eq: "Agent seats × annual ARPU",
        bcg: "Orchestration + analytics monetise intent-to-fulfilment workflow layer. Attach grows as enterprises industrialise CX automation beyond the contact centre.",
        businessLineExplanation: "Add-on analytics, knowledge management, journey/workflow orchestration. Per-seat + services pricing. 400+ partner ecosystem, 170+ marketplace apps.",
        quantity: [
            { l: "Addressable global agents", v: 15000000 },
            { l: "Enterprise share", v: 0.70, isPct: true },
            { l: "CCaaS adoption rate", v: 0.55, isPct: true },
            { l: "Analytics/orchestration attach", v: 0.45, isPct: true },
            { l: "NICE share / win rate", v: 0.142, isPct: true },
        ],
        price: [
            { l: "Monthly analytics ($)", v: 25 },
            { l: "Monthly knowledge/journey ($)", v: 5 },
            { l: "Annual services ($)", v: 46 },
        ],
        cagr: [
            { l: "Workflow automation attach", v: 0.06 },
            { l: "Data/AI value capture", v: 0.03 },
            { l: "Seat growth (levered to CCaaS)", v: 0.03 },
            { l: "Bundle dilution", v: -0.01 },
        ],
        sCurve: { ceiling: 800, k: 0.25, enabled: true },
        anchors: [
            { m: "CX platform messaging", v: "Workflows • Agents • Knowledge" },
            { m: "Partner ecosystem", v: "400+ partners" },
            { m: "Marketplace apps", v: "170+" },
            { m: "Partner-involved wins", v: "75%" },
        ],
    },

    /* ── CX LEGACY (2 lines) ──────────────── */
    {
        id: "onprem_cx",
        name: "On-Premise CX",
        cat: "CX Legacy",
        color: "#f59e0b",
        tamUnit: "Licences",
        eq: "Licences × annual maintenance/licence value",
        bcg: "Declining legacy on-prem licences + maintenance. Accelerating migration to CXone cloud.",
        businessLineExplanation: "Legacy on-premises contact center software, maintenance contracts, licence renewals. Structurally declining as customers migrate to CXone.",
        quantity: [
            { l: "Installed base licences", v: 2800000 },
            { l: "Annual renewal rate", v: 0.82, isPct: true },
            { l: "Cloud migration (annual)", v: 0.12, isPct: true },
            { l: "Effective retention", v: 0.72, isPct: true },
        ],
        price: [
            { l: "Monthly maintenance ($)", v: 14 },
            { l: "Monthly support/upgrade ($)", v: 5 },
            { l: "Annual licence value ($)", v: 65 },
        ],
        cagr: [
            { l: "Base erosion", v: -0.08 },
            { l: "Cloud migration acceleration", v: -0.04 },
            { l: "Regulatory hold-backs", v: 0.02 },
            { l: "Price escalation", v: 0.01 },
        ],
        sCurve: { ceiling: 147, k: -0.15, enabled: false },
        anchors: [
            { m: "Product rev FY2024", v: "$155m" },
            { m: "Product rev FY2025", v: "$147m" },
            { m: "On-prem % of total", v: "~5%" },
            { m: "Migration pace", v: "Accelerating" },
        ],
    },
    {
        id: "cx_services",
        name: "CX Professional Services",
        cat: "CX Legacy",
        color: "#eab308",
        tamUnit: "Engagements",
        eq: "Engagements × avg project value",
        bcg: "Implementation, consulting, training for CX deployments. Structurally declining as cloud simplifies delivery and partners absorb more.",
        businessLineExplanation: "Professional services: implementation, integration, training, managed services for CXone and legacy platforms. Revenue declining as cloud reduces complexity.",
        quantity: [
            { l: "Annual CX implementations", v: 8500 },
            { l: "Avg duration (months)", v: 4.5 },
            { l: "Consultants per engagement", v: 3.2 },
            { l: "Managed services attach", v: 0.35, isPct: true },
            { l: "NICE delivery share", v: 0.60, isPct: true },
        ],
        price: [
            { l: "Monthly consultant rate ($)", v: 12000 },
            { l: "Monthly managed services ($)", v: 4500 },
            { l: "Annual training/support ($)", v: 28000 },
        ],
        cagr: [
            { l: "Cloud simplification", v: -0.04 },
            { l: "Partner delivery shift", v: -0.03 },
            { l: "AI complexity uplift", v: 0.02 },
            { l: "International growth", v: 0.015 },
        ],
        sCurve: { ceiling: 560, k: -0.10, enabled: false },
        anchors: [
            { m: "Services rev FY2024", v: "$596m" },
            { m: "Services rev FY2025", v: "$560m" },
            { m: "Services % of total", v: "~19%" },
            { m: "YoY trend", v: "Declining ~6%" },
        ],
    },

    /* ── PUBLIC SAFETY & JUSTICE (2 lines) ── */
    {
        id: "evidencentral",
        name: "Evidencentral — Digital Evidence",
        cat: "Public Safety & Justice",
        color: "#3b82f6",
        tamUnit: "Agencies",
        eq: "Agencies × annual contract value",
        bcg: "Evidence digitisation + AI drives consolidation around cloud platforms. Multi-constituent justice workflows create defensible switching costs.",
        businessLineExplanation: "Cloud digital evidence management for police, prosecution, defence, courts, corrections. Per-agency contracts with storage/AI add-ons.",
        quantity: [
            { l: "Addressable PS&J agencies (global)", v: 30000 },
            { l: "Cloud evidence adoption", v: 0.25, isPct: true },
            { l: "NICE share / win rate", v: 0.20, isPct: true },
        ],
        price: [
            { l: "Monthly platform fee ($)", v: 7083 },
            { l: "Monthly add-ons (storage/AI) ($)", v: 2083 },
            { l: "Annual implementation ($)", v: 10000 },
        ],
        cagr: [
            { l: "Evidence digitisation tailwind", v: 0.04 },
            { l: "Cloud adoption in justice", v: 0.03 },
            { l: "AI attach / storage growth", v: 0.02 },
            { l: "Public procurement drag", v: -0.02 },
        ],
        sCurve: { ceiling: 450, k: 0.20, enabled: true },
        anchors: [
            { m: "Market positioning", v: "'World's #1' platform" },
            { m: "Value chain coverage", v: "Police → Courts" },
            { m: "Justice market", v: "Specialised" },
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
        bcg: "911/112 modernisation + analytics supports durable renewal base. Incremental growth via cloud migrations and AI-enabled workflows.",
        businessLineExplanation: "Emergency communications, investigative/justice workflow tooling for dispatch centres and agencies. Multi-year enterprise contracts.",
        quantity: [
            { l: "Addressable emergency centres (global)", v: 10000 },
            { l: "Modernisation / platform adoption", v: 0.25, isPct: true },
            { l: "NICE share / win rate", v: 0.16, isPct: true },
        ],
        price: [
            { l: "Monthly software/platform ($)", v: 12000 },
            { l: "Monthly analytics/workflow ($)", v: 4000 },
            { l: "Annual implementation ($)", v: 8000 },
        ],
        cagr: [
            { l: "Cloud modernisation", v: 0.03 },
            { l: "AI/analytics attach", v: 0.02 },
            { l: "Installed-base renewal uplift", v: 0.02 },
            { l: "Procurement friction", v: -0.02 },
        ],
        sCurve: { ceiling: 280, k: 0.18, enabled: true },
        anchors: [
            { m: "Award", v: "Best 911 solution" },
            { m: "Market focus", v: "PS&J specialised" },
            { m: "Cross-system integration", v: "Justice system" },
            { m: "Contract nature", v: "Multi-year" },
        ],
    },

    /* ── FINANCIAL CRIME & COMPLIANCE (3 lines) */
    {
        id: "aml",
        name: "Actimize — AML & Case Mgmt",
        cat: "Financial Crime",
        color: "#22c55e",
        tamUnit: "Institutions",
        eq: "Institutions × annual contract value",
        bcg: "Regulatory pressure + rising complexity sustain spend. Differentiation via network analytics and embedded AI. #1 AML globally.",
        businessLineExplanation: "AML, investigations, case management platforms for banks and financial institutions. Enterprise licences + services. #1 market position.",
        quantity: [
            { l: "Addressable Tier 1-3 FIs", v: 2500 },
            { l: "Advanced AML adoption", v: 0.65, isPct: true },
            { l: "NICE share / win rate", v: 0.22, isPct: true },
        ],
        price: [
            { l: "Monthly licence ($)", v: 45000 },
            { l: "Monthly analytics/identity ($)", v: 5000 },
            { l: "Annual services ($)", v: 15000 },
        ],
        cagr: [
            { l: "Regulatory / enforcement intensity", v: 0.03 },
            { l: "AI/analytics upsell", v: 0.02 },
            { l: "International expansion", v: 0.01 },
            { l: "Procurement drag", v: -0.01 },
        ],
        sCurve: { ceiling: 650, k: 0.18, enabled: true },
        anchors: [
            { m: "FC&C segment (FY2025)", v: "$485m" },
            { m: "Market position", v: "#1 AML globally" },
            { m: "Top US bank presence", v: "4/5 top banks" },
            { m: "EU & APAC coverage", v: "10/10 top banks" },
        ],
    },
    {
        id: "fraud",
        name: "Actimize — Fraud & Identity",
        cat: "Financial Crime",
        color: "#16a34a",
        tamUnit: "Institutions",
        eq: "Institutions × annual contract value",
        bcg: "Digital transaction growth + fraud innovation sustain demand. Platform value rises with identity resolution and network effects.",
        businessLineExplanation: "Enterprise fraud management, identity/analytics for banks, fintechs, payments providers. Growing with digital banking expansion.",
        quantity: [
            { l: "Addressable banks/fintech/payments", v: 3000 },
            { l: "Enterprise fraud adoption", v: 0.55, isPct: true },
            { l: "NICE share / win rate", v: 0.20, isPct: true },
        ],
        price: [
            { l: "Monthly licence ($)", v: 38000 },
            { l: "Monthly identity/network ($)", v: 5000 },
            { l: "Annual services ($)", v: 29000 },
        ],
        cagr: [
            { l: "Fraud intensity (digital growth)", v: 0.03 },
            { l: "AI & network analytics upsell", v: 0.03 },
            { l: "Platform expansion", v: 0.01 },
            { l: "Pricing pressure", v: -0.01 },
        ],
        sCurve: { ceiling: 500, k: 0.20, enabled: true },
        anchors: [
            { m: "Scope", v: "Cross-channel fraud" },
            { m: "Authentication", v: "Real-time analytics" },
            { m: "Digital payment growth", v: "15%+ CAGR" },
            { m: "Key verticals", v: "Banks, Fintechs" },
        ],
    },
    {
        id: "markets",
        name: "Actimize — Markets Compliance",
        cat: "Financial Crime",
        color: "#15803d",
        tamUnit: "Institutions",
        eq: "Institutions × annual contract value",
        bcg: "Surveillance & comms compliance are 'must-have'. Vendor consolidation benefits platforms with breadth. MiFID II, Dodd-Frank tailwinds.",
        businessLineExplanation: "Trade surveillance, communications compliance, market abuse detection for investment banks/broker-dealers. Enterprise software + services.",
        quantity: [
            { l: "Addressable IBs / broker-dealers", v: 1200 },
            { l: "Modern surveillance adoption", v: 0.60, isPct: true },
            { l: "NICE share / win rate", v: 0.18, isPct: true },
        ],
        price: [
            { l: "Monthly licence ($)", v: 50000 },
            { l: "Monthly comms/analytics ($)", v: 4500 },
            { l: "Annual services ($)", v: 0 },
        ],
        cagr: [
            { l: "Regulatory intensity", v: 0.02 },
            { l: "Data volumes / analytics", v: 0.02 },
            { l: "Cross-sell within Actimize", v: 0.01 },
            { l: "Budget drag", v: -0.01 },
        ],
        sCurve: { ceiling: 250, k: 0.18, enabled: true },
        anchors: [
            { m: "Global IB coverage", v: "10/10 top IBs" },
            { m: "Comms surveillance", v: "Voice + eComms" },
            { m: "Regulatory drivers", v: "MiFID II, Dodd-Frank" },
            { m: "Cross-sell adjacency", v: "AML/Fraud attach" },
        ],
    },
];

/* ═══════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════ */
export const CATS = ["CX Cloud", "CX Legacy", "Public Safety & Justice", "Financial Crime"];

export const CAT_C = {
    "CX Cloud": "#8b5cf6",
    "CX Legacy": "#f59e0b",
    "Public Safety & Justice": "#3b82f6",
    "Financial Crime": "#22c55e",
};

export const PROJ_YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);
export const ALL_YEARS = [2022, 2023, 2024, ...PROJ_YEARS];

/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */
export const fN = (n) => {
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}B`;
    return `$${n.toFixed(0)}M`;
};
export const fP = (n) => (!Number.isFinite(n) ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`);
export const fM = (n) => (!Number.isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`);
export const cagrFn = (s, e, n) => (s > 0 && e > 0 && n > 0 ? Math.pow(e / s, 1 / n) - 1 : 0);

/* ═══════════════════════════════════════════
   CORE MODEL — TAM / SOM CALCULATION
   ═══════════════════════════════════════════ */
export function calcTAM(p) {
    const u = p.quantity.reduce((a, q) => a * q.v, 1);
    const ar = (p.price[0].v + p.price[1].v) * 12 + p.price[2].v;
    const som = (u * ar) / 1e6;
    const shareDriver = p.quantity.find(
        (q) => q.l.toLowerCase().includes("share") || q.l.toLowerCase().includes("win rate")
    ) || p.quantity[p.quantity.length - 1];
    const share = shareDriver?.v ?? 0;
    const tam = share > 0 ? som / share : 0;
    return { u, ar, tam, som };
}

export function calcCAGR(p) {
    return p.cagr.reduce((s, c) => s + c.v, 0);
}

/* ═══════════════════════════════════════════
   S-CURVE ADOPTION MODEL
   ═══════════════════════════════════════════

   Models product revenue as a logistic function:
     R(t) = L / (1 + exp(-k * (t - t₀)))

   Where:
     L = ceiling (maximum revenue, $m)
     k = steepness of adoption curve
     t₀ = inflection point (solved from base year)

   Calibration: given R(baseYear) = baseSom, solve for t₀:
     t₀ = baseYear + (1/k) × ln(L / baseSom - 1)

   The S-curve naturally produces:
   - Slow initial growth (early adopters)
   - Rapid acceleration through inflection
   - Decelerating growth as market saturates
   ═══════════════════════════════════════════ */

export function calcSCurveT0(baseSom, ceiling, k, baseYear) {
    if (ceiling <= 0 || baseSom <= 0 || baseSom >= ceiling || k === 0) return baseYear;
    return baseYear + (1 / k) * Math.log(ceiling / baseSom - 1);
}

export function projectSCurve(baseSom, sCurve, baseYear, targetYear) {
    if (!sCurve || !sCurve.enabled || !sCurve.ceiling || sCurve.ceiling <= 0) return null;
    const { ceiling, k } = sCurve;
    if (baseSom >= ceiling) return ceiling;
    if (baseSom <= 0) return 0;
    const t0 = calcSCurveT0(baseSom, ceiling, k, baseYear);
    return ceiling / (1 + Math.exp(-k * (targetYear - t0)));
}

/**
 * Compute the instantaneous growth rate of the S-curve at a given year.
 * dR/dt = k × R(t) × (1 - R(t)/L)
 * Returns the growth rate as a fraction (e.g. 0.09 = 9%)
 */
export function sCurveGrowthRate(baseSom, sCurve, baseYear, targetYear) {
    const rev = projectSCurve(baseSom, sCurve, baseYear, targetYear);
    if (rev === null || rev <= 0) return 0;
    const { ceiling, k } = sCurve;
    return k * (1 - rev / ceiling);
}

/**
 * Returns S-curve phase descriptor
 */
export function sCurvePhase(baseSom, sCurve, baseYear, targetYear) {
    const rev = projectSCurve(baseSom, sCurve, baseYear, targetYear);
    if (rev === null) return "n/a";
    const pct = rev / sCurve.ceiling;
    if (pct < 0.10) return "Nascent";
    if (pct < 0.30) return "Early Adoption";
    if (pct < 0.60) return "Rapid Growth";
    if (pct < 0.85) return "Late Growth";
    return "Saturation";
}

/**
 * Full S-curve time series for a product
 */
export function sCurveTimeSeries(baseSom, sCurve, baseYear, years) {
    return years.map((y) => ({
        year: y,
        sCurveRev: projectSCurve(baseSom, sCurve, baseYear, y),
        phase: sCurvePhase(baseSom, sCurve, baseYear, y),
        growthRate: sCurveGrowthRate(baseSom, sCurve, baseYear, y),
        penetration: sCurve.ceiling > 0 ? (projectSCurve(baseSom, sCurve, baseYear, y) ?? 0) / sCurve.ceiling : 0,
    }));
}

/* ═══════════════════════════════════════════
   DEFAULT SETTINGS & RESOLVER
   ═══════════════════════════════════════════ */
export const DEFAULT_SETTINGS = {
    prods: PRODUCTS,
    gpM: 0.696,
    opxR: 0.388,
    taxR: 0.13,
    centralCost: 0,
    useSCurve: true,
};

export function resolveInitialSettings(input = {}) {
    if (input === null) input = {};
    const gpM = Number.isFinite(Number(input.gpM)) ? Number(input.gpM) : DEFAULT_SETTINGS.gpM;
    const opxR = Number.isFinite(Number(input.opxR)) ? Number(input.opxR) : DEFAULT_SETTINGS.opxR;
    const taxR = Number.isFinite(Number(input.taxR)) ? Number(input.taxR) : DEFAULT_SETTINGS.taxR;
    const centralCost = Number.isFinite(Number(input.centralCost)) ? Number(input.centralCost) : DEFAULT_SETTINGS.centralCost;
    const useSCurve = input.useSCurve !== undefined ? Boolean(input.useSCurve) : DEFAULT_SETTINGS.useSCurve;
    const inputProds = Array.isArray(input.prods) ? input.prods : null;
    const prods = inputProds
        ? PRODUCTS.map((defaultProd, index) => {
            const matchingProd = inputProds.find((p) => p?.id === defaultProd.id) || inputProds[index];
            if (!matchingProd) return defaultProd;
            return {
                ...defaultProd,
                ...matchingProd,
                quantity: Array.isArray(matchingProd.quantity) ? matchingProd.quantity : defaultProd.quantity,
                price: Array.isArray(matchingProd.price) ? matchingProd.price : defaultProd.price,
                cagr: Array.isArray(matchingProd.cagr) ? matchingProd.cagr : defaultProd.cagr,
                anchors: Array.isArray(matchingProd.anchors) ? matchingProd.anchors : defaultProd.anchors,
                sCurve: matchingProd.sCurve ?? defaultProd.sCurve,
            };
        })
        : DEFAULT_SETTINGS.prods;
    return { prods, gpM, opxR, taxR, centralCost, useSCurve };
}
