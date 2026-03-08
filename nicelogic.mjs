/* ═══════════════════════════════════════════
   NICE LTD (NASDAQ: NICE) — MARKET MODEL LOGIC
   Actuals: FY2022–FY2025, Q1 2025 detail
   9 Product Driver Trees · Projections FY2025–FY2035
   Sources: NICE 20-F Annual Reports, Earnings Presentations, Press Releases
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   ACTUAL FINANCIALS — FY2022, FY2023, FY2024, FY2025
   All figures in $M unless noted. Non-GAAP where specified.
   ═══════════════════════════════════════════ */
export const ACTUALS = {
    group: [
        {
            year: 2022, label: "FY2022",
            rev: 2181, cogs: 684, gp: 1498, gpM: 0.687,
            ngRev: 2181, ngGP: 1604, ngGPM: 0.735, ngOpInc: 626, ngOpM: 0.287, ngNI: 536, ngEPS: 8.10,
            opInc: 335, opM: 0.154, ni: 266, eps: 4.02,
            cloudRev: 1153, cloudPct: 0.53, servicesRev: 725, productRev: 303,
            cashOps: 564, netCash: null,
        },
        {
            year: 2023, label: "FY2023",
            rev: 2378, cogs: 769, gp: 1609, gpM: 0.677,
            ngRev: 2378, ngGP: 1709, ngGPM: 0.719, ngOpInc: 704, ngOpM: 0.296, ngNI: 600, ngEPS: 9.05,
            opInc: 435, opM: 0.183, ni: 338, eps: 5.11,
            cloudRev: 1409, cloudPct: 0.59, servicesRev: 695, productRev: 274,
            cashOps: 563, netCash: null,
        },
        {
            year: 2024, label: "FY2024",
            rev: 2735, cogs: 910, gp: 1826, gpM: 0.668,
            ngRev: 2735, ngGP: 1943, ngGPM: 0.710, ngOpInc: 850, ngOpM: 0.311, ngNI: 728, ngEPS: 11.24,
            opInc: 546, opM: 0.200, ni: 443, eps: 6.76,
            cloudRev: 2002, cloudPct: 0.73, servicesRev: 568, productRev: 165,
            cashOps: 833, netCash: 1163,
        },
        {
            year: 2025, label: "FY2025",
            rev: 2945, cogs: 989, gp: 1956, gpM: 0.664,
            ngRev: 2945, ngGP: 2050, ngGPM: 0.696, ngOpInc: 908, ngOpM: 0.308, ngNI: 779, ngEPS: 12.46,
            opInc: 646, opM: 0.219, ni: 612, eps: 9.67,
            cloudRev: 2244, cloudPct: 0.76, servicesRev: 530, productRev: 171,
            cashOps: 717, netCash: 417, debt: 0,
        },
    ],
    segments: {
        2022: [
            { name: "Customer Engagement", rev: 1769, pct: 0.811 },
            { name: "Financial Crime & Compliance", rev: 412, pct: 0.189 },
        ],
        2023: [
            { name: "Customer Engagement", rev: 1974, pct: 0.830 },
            { name: "Financial Crime & Compliance", rev: 403, pct: 0.170 },
        ],
        2024: [
            { name: "Customer Engagement", rev: 2282, pct: 0.835 },
            { name: "Financial Crime & Compliance", rev: 453, pct: 0.165 },
        ],
        2025: [
            { name: "Customer Engagement", rev: 2470, pct: 0.839 },
            { name: "Financial Crime & Compliance", rev: 475, pct: 0.161 },
        ],
    },
    revenueByModel: {
        2022: { cloud: 1153, services: 725, product: 303 },
        2023: { cloud: 1409, services: 695, product: 274 },
        2024: { cloud: 2002, services: 568, product: 165 },
        2025: { cloud: 2244, services: 530, product: 171 },
    },
    keyMetrics: {
        "FY2024": { cloudARR: 2100, cloudNRR: 1.11, aiInLargeDeals: 0.97, customers: 25000, fortune100: 85, countries: 150, recurringPct: 0.90 },
        "FY2025": { cloudARR: 2400, cloudNRR: 1.09, aiInLargeDeals: 1.00, aiARR: 328, aiARRGrowth: 0.66, cognigyExitARR: 85 },
    },
    consensus2026: { rev_low: 3100, rev_high: 3200, ngEPS_low: 10.85, ngEPS_high: 11.05, ngOpM: 0.255 },
};

/* ═══════════════════════════════════════════
   9 PRODUCT DRIVER TREES
   Calibrated to FY2024 revenue + disclosed metrics
   Categories: CX Cloud, CX Legacy, Financial Crime
   ═══════════════════════════════════════════ */
export const PRODUCTS = [
    {
        id: "cxone_ccaas", name: "CXone Cloud CCaaS", cat: "CX Cloud", color: "#6366f1", tamUnit: "Agent Seats",
        eq: "Seats × annual ARPU",
        bcg: "Core cloud contact center platform — routing, IVR, omnichannel, ACD",
        businessLineExplanation: "CXone is NICE's flagship cloud-native contact center platform, the #1 CCaaS globally by market share. Includes routing, IVR, omnichannel, recording and quality management.",
        quantity: [{ l: "Addressable contact centers globally", v: 350000 }, { l: "Avg agents per center", v: 85 }, { l: "Cloud adoption rate", v: 0.38 }, { l: "Multi-tenant % of cloud", v: 0.72 }, { l: "NICE win rate / share", v: 0.14 }],
        price: [{ l: "Monthly seat ARPU ($)", v: 95 }, { l: "Premium add-on ARPU ($)", v: 22 }, { l: "Annual platform fees ($)", v: 180 }],
        cagr: [{ l: "Base CCaaS market growth", v: 0.08 }, { l: "On-prem → cloud migration", v: 0.04 }, { l: "International expansion", v: 0.02 }, { l: "Large enterprise wins", v: 0.015 }, { l: "Competitive pressure drag", v: -0.025 }],
        anchors: [{ m: "Cloud ARR (Dec 2024)", v: "$2.1B" }, { m: "Cloud NRR (FY2024)", v: "111%" }, { m: "Fortune 100 customers", v: "85+" }, { m: "Countries served", v: "150+" }]
    },
    {
        id: "ai_selfservice", name: "AI & Self-Service", cat: "CX Cloud", color: "#8b5cf6", tamUnit: "AI Seats/Endpoints",
        eq: "Endpoints × annual ARPU",
        bcg: "CXone Mpower — agentic AI, Autopilot, Copilot, Enlighten AI analytics. Fastest-growing segment.",
        businessLineExplanation: "Enlighten AI suite including Autopilot (self-service bots), Copilot (agent assist), Mpower (agentic AI orchestration), and Enlighten Actions/XO. Included in 100% of $1M+ CXone deals.",
        quantity: [{ l: "CXone cloud seat base", v: 1100000 }, { l: "AI module attach rate", v: 0.28 }, { l: "Self-service endpoints", v: 650000 }, { l: "Endpoint AI attach rate", v: 0.18 }, { l: "Premium AI upsell %", v: 0.35 }],
        price: [{ l: "Monthly AI seat ARPU ($)", v: 32 }, { l: "Self-service bot ARPU ($)", v: 18 }, { l: "Annual AI analytics ($)", v: 120 }],
        cagr: [{ l: "Base AI/automation growth", v: 0.12 }, { l: "Agentic AI adoption", v: 0.08 }, { l: "Enterprise AI mandates", v: 0.04 }, { l: "Self-service expansion", v: 0.03 }, { l: "Cannibalization drag", v: -0.02 }],
        anchors: [{ m: "AI ARR (Q4 2025)", v: "$328M" }, { m: "AI ARR YoY growth", v: "+66%" }, { m: "AI in $1M+ deals", v: "100%" }, { m: "AI & Self-Service rev growth Q1", v: "+39% YoY" }]
    },
    {
        id: "wem", name: "Workforce Engagement", cat: "CX Cloud", color: "#a855f7", tamUnit: "Managed Agents",
        eq: "Agents × annual ARPU",
        bcg: "WFM, quality management, performance analytics, speech/text analytics, recording — mission-critical for regulated industries",
        businessLineExplanation: "Workforce management (scheduling, forecasting), quality management, interaction recording, performance management, and employee engagement tools.",
        quantity: [{ l: "Global contact center agents", v: 18000000 }, { l: "WEM software penetration", v: 0.42 }, { l: "Cloud WEM adoption", v: 0.35 }, { l: "Enterprise % (>500 seats)", v: 0.55 }, { l: "NICE share of cloud WEM", v: 0.22 }],
        price: [{ l: "Monthly WEM ARPU ($)", v: 28 }, { l: "Analytics add-on ARPU ($)", v: 12 }, { l: "Annual recording/storage ($)", v: 85 }],
        cagr: [{ l: "Base WEM market growth", v: 0.06 }, { l: "Cloud WEM migration", v: 0.03 }, { l: "AI-driven analytics uplift", v: 0.02 }, { l: "Regulatory tailwinds", v: 0.01 }, { l: "Bundle discount drag", v: -0.015 }],
        anchors: [{ m: "WEM market position", v: "#1 Gartner MQ" }, { m: "Recording market share", v: "~40%" }, { m: "Cloud WEM penetration", v: "~35%" }, { m: "Regulated industry share", v: "High" }]
    },
    {
        id: "cognigy", name: "Cognigy / Agentic AI", cat: "CX Cloud", color: "#ec4899", tamUnit: "Deployments",
        eq: "Deployments × annual ACV",
        bcg: "Conversational & agentic AI — acquired Sep 2025. Multilingual voice/chat bots, standalone + CXone-embedded.",
        businessLineExplanation: "Cognigy.AI platform for conversational and agentic AI — supports 100+ languages, voice and chat automation. Standalone product + deeply integrated into CXone Mpower.",
        quantity: [{ l: "Addressable enterprise CX deployments", v: 120000 }, { l: "Conversational AI adoption", v: 0.15 }, { l: "Multi-language requirement %", v: 0.45 }, { l: "Agentic AI readiness", v: 0.20 }, { l: "NICE/Cognigy win rate", v: 0.06 }],
        price: [{ l: "Monthly base ACV ($)", v: 4500 }, { l: "Volume/overage ARPU ($)", v: 2200 }, { l: "Annual setup/integration ($)", v: 18000 }],
        cagr: [{ l: "Conversational AI market growth", v: 0.15 }, { l: "Agentic AI wave", v: 0.10 }, { l: "CXone cross-sell", v: 0.06 }, { l: "International expansion", v: 0.03 }, { l: "Competition drag", v: -0.04 }],
        anchors: [{ m: "Acquisition price", v: "$827M" }, { m: "Exit ARR target (Dec 2026)", v: "$85M" }, { m: "Languages supported", v: "100+" }, { m: "Gartner recognition", v: "Leader IVA MQ" }]
    },
    {
        id: "onprem_cx", name: "On-Premise CX", cat: "CX Legacy", color: "#f59e0b", tamUnit: "Licences",
        eq: "Licences × annual value",
        bcg: "Declining legacy on-premise CX software licences + associated maintenance. Migrating to CXone cloud.",
        businessLineExplanation: "Legacy on-premises contact center software, maintenance contracts, and licence renewals. Declining as customers migrate to CXone cloud platform.",
        quantity: [{ l: "Installed base licences", v: 2800000 }, { l: "Annual renewal rate", v: 0.82 }, { l: "Cloud migration rate (annual)", v: 0.12 }, { l: "New on-prem sales (shrinking)", v: 0.02 }, { l: "Effective retention", v: 0.72 }],
        price: [{ l: "Monthly maintenance ARPU ($)", v: 14 }, { l: "Support/upgrade ARPU ($)", v: 5 }, { l: "Annual licence value ($)", v: 65 }],
        cagr: [{ l: "Base erosion", v: -0.08 }, { l: "Cloud migration acceleration", v: -0.04 }, { l: "Regulatory hold-backs", v: 0.02 }, { l: "Price escalation", v: 0.01 }, { l: "End-of-life drag", v: -0.02 }],
        anchors: [{ m: "Product rev FY2024", v: "$165M" }, { m: "Product rev FY2025", v: "$171M" }, { m: "On-prem % of total (declining)", v: "~6%" }, { m: "Cloud migration pace", v: "Accelerating" }]
    },
    {
        id: "cx_services", name: "CX Professional Services", cat: "CX Legacy", color: "#eab308", tamUnit: "Engagements",
        eq: "Engagements × avg project value",
        bcg: "Implementation, consulting, training, and managed services for CX platform deployments",
        businessLineExplanation: "Professional services including implementation, system integration, training, and ongoing managed services for CXone and legacy CX platform customers.",
        quantity: [{ l: "Annual CX implementations", v: 8500 }, { l: "Avg duration (months)", v: 4.5 }, { l: "Consultants per engagement", v: 3.2 }, { l: "Managed services attach", v: 0.35 }, { l: "NICE delivery share", v: 0.60 }],
        price: [{ l: "Monthly consultant rate ($)", v: 12000 }, { l: "Managed services monthly ($)", v: 4500 }, { l: "Annual training/support ($)", v: 28000 }],
        cagr: [{ l: "Base services growth", v: -0.02 }, { l: "Cloud simplification", v: -0.04 }, { l: "Partner delivery shift", v: -0.03 }, { l: "AI complexity uplift", v: 0.02 }, { l: "International project growth", v: 0.015 }],
        anchors: [{ m: "Services rev FY2024", v: "$568M" }, { m: "Services rev FY2025", v: "$530M" }, { m: "Services as % of total", v: "~18%" }, { m: "YoY trend", v: "Declining ~7%" }]
    },
    {
        id: "actimize_aml", name: "AML & KYC", cat: "Financial Crime", color: "#22c55e", tamUnit: "Institutions",
        eq: "Institutions × annual licence value",
        bcg: "Anti-money laundering, sanctions screening, customer due diligence, KYC — regulatory-driven recurring revenue",
        businessLineExplanation: "NICE Actimize AML solutions: transaction monitoring, sanctions screening, customer due diligence (CDD/KYC), suspicious activity reporting. #1 market position globally.",
        quantity: [{ l: "Addressable financial institutions", v: 45000 }, { l: "AML software penetration", v: 0.65 }, { l: "Cloud/SaaS adoption", v: 0.30 }, { l: "Tier 1-2 bank concentration", v: 0.40 }, { l: "NICE Actimize share", v: 0.18 }],
        price: [{ l: "Monthly platform ARPU ($)", v: 8500 }, { l: "Transaction volume ARPU ($)", v: 3200 }, { l: "Annual compliance update ($)", v: 25000 }],
        cagr: [{ l: "Regulatory expansion", v: 0.04 }, { l: "Cloud AML migration", v: 0.03 }, { l: "New geography mandates", v: 0.02 }, { l: "AI/ML enhancement", v: 0.015 }, { l: "Budget constraint drag", v: -0.02 }],
        anchors: [{ m: "FCC segment rev FY2024", v: "$453M" }, { m: "FCC segment rev Q3 2025", v: "$119M" }, { m: "FCC YoY growth Q3", v: "+7%" }, { m: "Market position", v: "#1 AML globally" }]
    },
    {
        id: "actimize_fraud", name: "Fraud & Authentication", cat: "Financial Crime", color: "#10b981", tamUnit: "Institutions",
        eq: "Institutions × annual licence value",
        bcg: "Real-time fraud prevention, authentication, account protection — growing with digital payments",
        businessLineExplanation: "Real-time and cross-channel fraud prevention, authentication intelligence, account protection, and payment fraud solutions. Growing with digital banking expansion.",
        quantity: [{ l: "Addressable institutions", v: 35000 }, { l: "Fraud solution penetration", v: 0.55 }, { l: "Real-time scoring adoption", v: 0.40 }, { l: "Digital payment expansion", v: 0.60 }, { l: "NICE Actimize share", v: 0.12 }],
        price: [{ l: "Monthly platform ARPU ($)", v: 6500 }, { l: "Transaction scoring ARPU ($)", v: 2800 }, { l: "Annual model tuning ($)", v: 18000 }],
        cagr: [{ l: "Digital fraud growth", v: 0.05 }, { l: "Real-time scoring demand", v: 0.03 }, { l: "AI/ML model adoption", v: 0.02 }, { l: "Open banking tailwind", v: 0.015 }, { l: "Vendor consolidation drag", v: -0.02 }],
        anchors: [{ m: "Fraud prevention scope", v: "Cross-channel" }, { m: "Authentication analytics", v: "Real-time" }, { m: "Digital payment growth", v: "15%+ CAGR" }, { m: "Key verticals", v: "Banks, Fintechs" }]
    },
    {
        id: "actimize_surv", name: "Surveillance & Compliance", cat: "Financial Crime", color: "#0ea5e9", tamUnit: "Firms",
        eq: "Firms × annual licence value",
        bcg: "Trade surveillance, communications compliance, market abuse detection, regulatory reporting",
        businessLineExplanation: "Trade and communications surveillance, market abuse detection, broker-dealer compliance, and regulatory reporting solutions for capital markets firms.",
        quantity: [{ l: "Addressable broker/dealers + asset mgrs", v: 18000 }, { l: "Surveillance penetration", v: 0.50 }, { l: "Multi-asset coverage", v: 0.35 }, { l: "Comms surveillance attach", v: 0.25 }, { l: "NICE Actimize share", v: 0.15 }],
        price: [{ l: "Monthly platform ARPU ($)", v: 7200 }, { l: "Data/analytics ARPU ($)", v: 3000 }, { l: "Annual regulatory update ($)", v: 22000 }],
        cagr: [{ l: "Regulatory complexity growth", v: 0.035 }, { l: "Comms surveillance demand", v: 0.025 }, { l: "AI/NLP analytics uplift", v: 0.02 }, { l: "Cloud migration", v: 0.015 }, { l: "Market consolidation drag", v: -0.015 }],
        anchors: [{ m: "Capital markets coverage", v: "Global" }, { m: "Comms surveillance", v: "Voice + eComms" }, { m: "Regulatory updates", v: "MiFID II, Dodd-Frank" }, { m: "Key clients", v: "Top 50 banks" }]
    },
];

export const CATS = ["CX Cloud", "CX Legacy", "Financial Crime"];
export const CAT_C = { "CX Cloud": "#8b5cf6", "CX Legacy": "#f59e0b", "Financial Crime": "#22c55e" };
export const PROJ_YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);
export const ALL_YEARS = [2022, 2023, 2024, ...PROJ_YEARS];

/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */
export const fN = n => { if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}B`; return `$${n.toFixed(0)}M`; };
export const fP = n => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
export const fM = n => `${(n * 100).toFixed(1)}%`;
export const cagr = (s, e, n) => s > 0 && e > 0 && n > 0 ? (Math.pow(e / s, 1 / n) - 1) : 0;

export function calcTAM(p) {
    const u = p.quantity.reduce((a, q) => a * q.v, 1);
    const ar = (p.price[0].v + p.price[1].v) * 12 + p.price[2].v;
    const som = (u * ar) / 1e6;
    const shareDriver = p.quantity.find(q => q.l.toLowerCase().includes("share") || q.l.toLowerCase().includes("win rate"));
    const gammaShare = shareDriver ? shareDriver.v : p.quantity[p.quantity.length - 1].v;
    const tam = gammaShare > 0 ? som / gammaShare : 0;
    return { u, ar, tam, som };
}

export function calcCAGR(p) {
    return p.cagr.reduce((s, c) => s + c.v, 0);
}

/* ═══════════════════════════════════════════
   DEFAULT SETTINGS & RESOLVER
   ═══════════════════════════════════════════ */
export const DEFAULT_SETTINGS = {
    prods: PRODUCTS,
    gpM: 0.70,
    opxR: 0.39,
    taxR: 0.21,
    centralCost: 45,
};

export function resolveInitialSettings(input = {}) {
    if (input === null) {
        input = {};
    }
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
