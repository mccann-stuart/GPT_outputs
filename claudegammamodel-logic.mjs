/* ═══════════════════════════════════════════
   ACTUAL FINANCIALS — FY2022, FY2023, FY2024, H1 2025
   Sources: Annual Report 2024, Interim Results H1 2025
   ═══════════════════════════════════════════ */
export const ACTUALS = {
    group: [
        { year: 2022, label: "FY2022", rev: 484.6, cogs: 236.9, gp: 247.7, gpM: 0.511, adjEBITDA: 105.1, adjPBT: 87.8, pbt: null, pat: null, eps: 50.6, adjEps: 71.8, netCash: 92.5, cashGenOps: 99.1, recurring: 0.89 },
        { year: 2023, label: "FY2023", rev: 521.7, cogs: 254.5, gp: 267.2, gpM: 0.512, opex: 200.2, exceptional: 16.0, opProfit: 67.0, finInc: 5.4, finExp: 0.9, pbt: 71.5, tax: 17.8, taxRate: 0.25, pat: 53.7, adjEBITDA: 114.3, adjPBT: 97.9, eps: 54.9, adjEps: 75.1, netCash: 134.8, cashGenOps: 123.5, dna: 21.3, dnaBC: 10.0, recurring: 0.89 },
        { year: 2024, label: "FY2024", rev: 579.4, cogs: 279.1, gp: 300.3, gpM: 0.518, opex: 210.0, exceptional: 0, opProfit: 90.3, finInc: 7.1, finExp: 1.8, pbt: 95.6, tax: 25.8, taxRate: 0.27, pat: 69.8, adjEBITDA: 125.5, adjPBT: 111.9, eps: 72.0, adjEps: 85.1, netCash: 153.7, cashGenOps: 116.8, dna: 20.4, dnaBC: 13.4, recurring: 0.89 },
        { year: 2025, label: "H1 2025", period: "H1", rev: 316.6, cogs: 144.6, gp: 172.0, gpM: 0.543, opex: 127.6, exceptional: 7.3, opProfit: 44.4, finInc: 2.0, finExp: 2.9, pbt: 43.5, tax: 11.1, taxRate: 0.26, pat: 32.4, adjEBITDA: 70.9, adjPBT: 61.0, eps: 34.1, adjEps: 47.9, netDebt: 21.6, cashGenOps: 53.1, dna: 15.8, dnaBC: 9.6, recurring: 0.90 },
    ],
    segments: {
        2023: [
            { name: "Gamma Business", rev: 332.2, gp: 176.1, adjEBITDA: 85.0, gpM: 0.530 },
            { name: "Gamma Enterprise", rev: 110.1, gp: 52.6, adjEBITDA: 29.6, gpM: 0.478 },
            { name: "Europe", rev: 79.4, gp: 38.5, adjEBITDA: 10.2, gpM: 0.485 },
            { name: "Central", rev: 0, gp: 0, adjEBITDA: -10.5 },
        ],
        2024: [
            { name: "Gamma Business", rev: 368.9, gp: 194.7, adjEBITDA: 95.0, gpM: 0.528, spRev: 76.3, spGP: 36.3 },
            { name: "Gamma Enterprise", rev: 126.5, gp: 60.2, adjEBITDA: 31.4, gpM: 0.476 },
            { name: "Europe", rev: 84.0, gp: 45.4, adjEBITDA: 11.8, gpM: 0.540, deRev: 54.3, deGP: 26.4 },
            { name: "Central", rev: 0, gp: 0, adjEBITDA: -12.7 },
        ],
        "H1 2025": [
            { name: "Gamma Business", rev: 186.0, gp: 97.4, adjEBITDA: 47.2, gpM: 0.524, spRev: 43.5, spGP: 21.3 },
            { name: "Gamma Enterprise", rev: 66.5, gp: 30.9, adjEBITDA: 15.8, gpM: 0.465 },
            { name: "Germany", rev: 49.1, gp: 34.4, adjEBITDA: 9.4, gpM: 0.701 },
            { name: "Other Europe", rev: 15.0, gp: 9.3, adjEBITDA: 2.4, gpM: 0.620 },
            { name: "Central", rev: 0, gp: 0, adjEBITDA: -3.9 },
        ],
    },
    volumes: {
        "Jun 2024": { ukCloudPBX: 1002, euCloudPBX: 161, deCloudSeats: 38, ukSIPtrad: 968, euSIPtrad: 204, ukSIPcloud: 451, ukTeams: 457, euTeams: 12, ukCCaaS: 40 },
        "Dec 2024": { ukCloudPBX: 1040, euCloudPBX: 434, deCloudSeats: 311, ukSIPtrad: 932, euSIPtrad: 206, ukSIPcloud: 481, ukTeams: 467, euTeams: 14, ukCCaaS: 45 },
        "Jun 2025": { ukCloudPBX: 1063, euCloudPBX: 687, deCloudSeats: 565, ukSIPtrad: 902, euSIPtrad: 201, ukSIPcloud: 498, ukTeams: 523, euTeams: 17, ukCCaaS: 48, ciscoUsers: 28, totalCloud: 1800, phoneLine: 45 },
    },
    consensus2025: { adjEBITDA_low: 139.4, adjEBITDA_high: 143.1, adjEPS_low: 89.9, adjEPS_high: 93.9 },
};

/* ═══════════════════════════════════════════
   9 PRODUCT DRIVER TREES (calibrated to FY2024 + H1 2025 disclosed scale)
   ═══════════════════════════════════════════ */
export const PRODUCTS = [
    {
        id: "phoneline", name: "PhoneLine+ / Placetel", cat: "Cloud Comms", color: "#6366f1", tamUnit: "Seats",
        eq: "Seats × annual ARPU",
        bcg: "PSTN / ISDN: Legacy voice — UK PSTN switch-off 2025-2027",
        businessLine: "Gamma PhoneLine+ / Placetel",
        businessLineExplanation: "Entry-level cloud telephony for micro/SMB (UK PhoneLine+; Germany Placetel)",
        quantity: [{ l: "Addressable micro/SMB businesses", v: 5200000 }, { l: "Sites per business", v: 1.0 }, { l: "Seats per site", v: 1.8 }, { l: "Cloud adoption rate", v: 0.12 }, { l: "Gamma share", v: 0.04 }],
        price: [{ l: "Base monthly ARPU", v: 8.5 }, { l: "Add-on ARPU", v: 2.0 }, { l: "Annual activation", v: 18 }],
        cagr: [{ l: "Base SMB growth", v: 0.015 }, { l: "PSTN switch-off", v: -0.04 }, { l: "Cloud migration", v: 0.025 }, { l: "Digital penetration", v: -0.06 }, { l: "Macro drag", v: -0.015 }],
        anchors: [{ m: "PhoneLine+ seats (Jun 2025)", v: "45k" }, { m: "PhoneLine+ growth H1", v: "+32%" }, { m: "UK cloud net adds H1", v: "23k" }, { m: "PSTN fibre headwind H1", v: "£1.5m GP" }]
    },
    {
        id: "horizon", name: "Horizon / STARFACE", cat: "Cloud Comms", color: "#8b5cf6", tamUnit: "Seats",
        eq: "Seats × annual ARPU",
        bcg: "UCaaS / Horizon: Cloud PBX & unified comms — primary growth engine",
        businessLine: "Gamma Horizon / STARFACE",
        businessLineExplanation: "Core cloud PBX platforms (UK Horizon; Germany STARFACE)",
        quantity: [{ l: "Addressable SMB/mid-market", v: 2800000 }, { l: "Employees per business", v: 12 }, { l: "Telephony % of employees", v: 0.70 }, { l: "Cloud PBX adoption", v: 0.18 }, { l: "Gamma share", v: 0.35 }],
        price: [{ l: "Base monthly ARPU", v: 11.5 }, { l: "Premium/AI add-on", v: 3.2 }, { l: "Annual devices/services", v: 28 }],
        cagr: [{ l: "Base seat growth", v: 0.01 }, { l: "HW PBX→cloud", v: 0.03 }, { l: "DE underpenetration", v: 0.025 }, { l: "AI/feature upsell", v: 0.015 }, { l: "Macro drag", v: -0.01 }],
        anchors: [{ m: "UK Cloud PBX seats", v: "1,063k" }, { m: "Europe Cloud PBX seats", v: "687k" }, { m: "DE cloud seats", v: "565k" }, { m: "DE H1 adds", v: "29k" }]
    },
    {
        id: "cisco", name: "Cisco / iPECS", cat: "Cloud Comms", color: "#a855f7", tamUnit: "Users",
        eq: "Users × annual ARPU",
        bcg: "Managed Services: IT managed services, security, support contracts",
        businessLine: "Cisco (Collaboration Suite) / iPECS",
        businessLineExplanation: "Higher-end collaboration/UCaaS and PBX options (Cisco suite; iPECS)",
        quantity: [{ l: "Addressable collab customers", v: 450000 }, { l: "Users per customer", v: 35 }, { l: "Telephony attach", v: 0.25 }, { l: "Countries per customer", v: 1.3 }, { l: "Gamma win rate", v: 0.0055 }],
        price: [{ l: "Monthly licence ARPU", v: 13 }, { l: "Voice/managed ARPU", v: 4 }, { l: "Annual implementation", v: 30 }],
        cagr: [{ l: "Base collab growth", v: 0.01 }, { l: "Cisco channel activation", v: 0.01 }, { l: "International rollout", v: 0.01 }, { l: "AI/advanced features", v: 0.015 }, { l: "Provisioning drag", v: -0.015 }],
        anchors: [{ m: "Cisco users (Jun 2025)", v: "28k" }, { m: "H1 growth", v: "75%" }, { m: "Spain commitment", v: "40k seats / 5y" }, { m: "Run-rate (Aug 2025)", v: ">2k/mo" }]
    },
    {
        id: "sip", name: "SIP Trunking", cat: "Calling", color: "#f59e0b", tamUnit: "Trunks",
        eq: "Trunks × annual ARPU",
        bcg: "SIP Trunking: Near-term PSTN replacement — peaks then cannibalised by UCaaS/WebRTC",
        businessLine: "Gamma SIP Trunking",
        businessLineExplanation: "SIP trunking for traditional hardware PBX estates (legacy calling base)",
        quantity: [{ l: "Addressable PBX sites", v: 1800000 }, { l: "Sites per customer", v: 2.2 }, { l: "Trunks per site", v: 4.5 }, { l: "SIP attach/retention", v: 0.22 }, { l: "Gamma share", v: 0.35 }],
        price: [{ l: "Monthly trunk ARPU", v: 4.0 }, { l: "Traffic/hosting ARPU", v: 1.5 }, { l: "Annual porting/setup", v: 6 }],
        cagr: [{ l: "Base trunk growth", v: -0.015 }, { l: "PSTN replacement", v: -0.02 }, { l: "Non-Gamma PBX support", v: 0.02 }, { l: "Europe retention", v: 0.005 }, { l: "HW→cloud drag", v: -0.03 }],
        anchors: [{ m: "UK trad PBX SIP (Jun 2025)", v: "902k" }, { m: "EU trad SIP (Jun 2025)", v: "201k" }, { m: "UK non-Gamma cloud SIP", v: "498k" }, { m: "UK SIP PBX (Dec 2024)", v: "932k" }]
    },
    {
        id: "voice", name: "Voice Enablement", cat: "Calling", color: "#22c55e", tamUnit: "Users",
        eq: "Users × annual ARPU",
        bcg: "WebRTC / CPaaS: Programmable comms & browser-native voice/video",
        businessLine: "Gamma Voice Enablement",
        businessLineExplanation: "Enabling voice for platforms like Microsoft Teams / Cisco / Amazon / Genesys",
        quantity: [{ l: "Addressable UC customers", v: 850000 }, { l: "Users per customer", v: 45 }, { l: "Voice attach rate", v: 0.15 }, { l: "Countries per deployment", v: 1.4 }, { l: "Gamma share", v: 0.067 }],
        price: [{ l: "Monthly enablement ARPU", v: 3.0 }, { l: "Numbering/managed ARPU", v: 1.3 }, { l: "Annual provisioning", v: 8 }],
        cagr: [{ l: "Base UC growth", v: 0.025 }, { l: "Teams/OC adoption", v: 0.04 }, { l: "International rollout", v: 0.02 }, { l: "Hyperscaler partnerships", v: 0.01 }, { l: "Price pressure drag", v: -0.015 }],
        anchors: [{ m: "UK Teams users (Jun 2025)", v: "523k" }, { m: "EU Teams users (Jun 2025)", v: "17k" }, { m: "UK H1 adds", v: "56k vs 28k" }, { m: "OC International", v: "14 countries" }]
    },
    {
        id: "sp", name: "Service Provider", cat: "Calling", color: "#10b981", tamUnit: "Numbers/trunks",
        eq: "Units × annual wholesale ARPU",
        bcg: "Managed Services: IT managed services, security, support contracts",
        businessLine: "Gamma Service Provider",
        businessLineExplanation: "Wholesale/carrier services for carriers, operators and platform providers",
        quantity: [{ l: "Addressable providers", v: 650 }, { l: "Countries per provider", v: 5.0 }, { l: "Units per provider-country", v: 16000 }, { l: "Outsource penetration", v: 0.38 }, { l: "Gamma win rate", v: 0.26 }],
        price: [{ l: "Monthly hosting ARPU", v: 0.9 }, { l: "Traffic/compliance ARPU", v: 0.4 }, { l: "Annual integration", v: 2.8 }],
        cagr: [{ l: "Provider platform growth", v: 0.02 }, { l: "International expansion", v: 0.02 }, { l: "Hyperscaler growth", v: 0.015 }, { l: "New country launches", v: 0.015 }, { l: "Voice decline drag", v: -0.015 }],
        anchors: [{ m: "SP revenue H1 2025", v: "£43.5m" }, { m: "SP GP H1 2025", v: "£21.3m" }, { m: "SP revenue FY2024", v: "£76.3m" }, { m: "SP GP FY2024", v: "£36.3m" }]
    },
    {
        id: "ethernet", name: "Ethernet", cat: "Connectivity", color: "#3b82f6", tamUnit: "Circuits",
        eq: "Circuits × annual ARPU",
        bcg: "MPLS / Ethernet: Legacy WAN — migrating to SD-WAN / SASE",
        businessLine: "Gamma Ethernet",
        businessLineExplanation: "Dedicated business connectivity (typically multi-site / enterprise-grade)",
        quantity: [{ l: "Addressable enterprise sites", v: 900000 }, { l: "Circuits per site", v: 1.6 }, { l: "Dedicated attach rate", v: 0.40 }, { l: "SD-WAN attach rate", v: 0.25 }, { l: "Gamma win rate", v: 0.12 }],
        price: [{ l: "Monthly circuit ARPU", v: 170 }, { l: "Managed/SD-WAN ARPU", v: 35 }, { l: "Annual install/project", v: 220 }],
        cagr: [{ l: "Base circuit growth", v: 0.005 }, { l: "SD-WAN uplift", v: -0.035 }, { l: "Enterprise wins", v: 0.01 }, { l: "Fibre availability", v: 0.01 }, { l: "Price-war drag", v: -0.03 }],
        anchors: [{ m: "Ethernet GP headwind H1 2025", v: "£1.0m" }, { m: "FY26 GP headwind", v: "£3.0m" }, { m: "Enterprise win", v: "Morrisons 400+1,200" }, { m: "Enterprise win", v: "Utilita SD-WAN" }]
    },
    {
        id: "broadband", name: "Business Broadband", cat: "Connectivity", color: "#0ea5e9", tamUnit: "Lines",
        eq: "Lines × annual ARPU",
        bcg: "Attached products from other serivces: Business broadband, fibre, security",
        businessLine: "Gamma Business Broadband",
        businessLineExplanation: "SME broadband access products (incl. fibre migration dynamics)",
        quantity: [{ l: "Addressable SME sites", v: 3500000 }, { l: "Lines per site", v: 1.15 }, { l: "Fibre adoption rate", v: 0.62 }, { l: "Backup attach rate", v: 0.16 }, { l: "Gamma share", v: 0.25 }],
        price: [{ l: "Monthly broadband ARPU", v: 24 }, { l: "Managed/security ARPU", v: 5 }, { l: "Annual activation", v: 20 }],
        cagr: [{ l: "FTTP availability growth", v: 0.015 }, { l: "Copper→fibre migration", v: 0.015 }, { l: "Comparison-site share", v: 0.01 }, { l: "Managed attach", v: 0.005 }, { l: "Fibre margin drag", v: -0.02 }],
        anchors: [{ m: "H1 GP headwind (Cu→fibre)", v: "£1.5m" }, { m: "Expected cadence", v: "~£1.5m/half to FY26" }, { m: "Comparison-site providers", v: "BT, PXC" }]
    },
    {
        id: "mobile", name: "Mobile / Fusion IoT", cat: "Connectivity", color: "#ec4899", tamUnit: "SIMs/endpoints",
        eq: "Endpoints × annual ARPU",
        bcg: "Attached products from other serivces: Mobile, IoT, eSIM",
        businessLine: "Gamma Mobile / Fusion IoT",
        businessLineExplanation: "Mobile subscriptions plus IoT connectivity (Fusion IoT)",
        quantity: [{ l: "Addressable endpoints", v: 10000000 }, { l: "Devices per customer", v: 7.5 }, { l: "SIM penetration", v: 0.40 }, { l: "IoT management attach", v: 0.22 }, { l: "Gamma share", v: 0.03 }],
        price: [{ l: "Monthly SIM ARPU", v: 6.0 }, { l: "IoT/analytics ARPU", v: 2.5 }, { l: "Annual activation/HW", v: 12 }],
        cagr: [{ l: "Mobile user growth", v: 0.02 }, { l: "IoT endpoint growth", v: 0.04 }, { l: "PSTN non-voice replace", v: 0.02 }, { l: "eSIM deployment", v: 0.01 }, { l: "Price competition drag", v: -0.015 }],
        anchors: [{ m: "Fusion IoT launch", v: "1 Jul 2025" }, { m: "Enterprise proof", v: "AA / Centrica" }, { m: "eSIM roadmap", v: "UK + DE" }, { m: "Public sector mobile win", v: "Wolverhampton" }]
    },
];

export const CATS = ["Cloud Comms", "Calling", "Connectivity"];
export const CAT_C = { "Cloud Comms": "#8b5cf6", "Calling": "#22c55e", "Connectivity": "#3b82f6" };
export const PROJ_YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);
export const ALL_YEARS = [2022, 2023, 2024, ...PROJ_YEARS];

export const fN = n => { if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}bn`; return `${n.toFixed(0)}m`; };
export const fP = n => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
export const fM = n => `${(n * 100).toFixed(1)}%`;
export const cagr = (s, e, n) => s > 0 && e > 0 && n > 0 ? (Math.pow(e / s, 1 / n) - 1) : 0;

export function calcTAM(p) { const u = p.quantity.reduce((a, q) => a * q.v, 1); const ar = (p.price[0].v + p.price[1].v) * 12 + p.price[2].v; const som = (u * ar) / 1e6; const shareDriver = p.quantity.find(q => q.l.toLowerCase().includes("share") || q.l.toLowerCase().includes("win rate")); const gammaShare = shareDriver ? shareDriver.v : p.quantity[p.quantity.length - 1].v; const tam = gammaShare > 0 ? som / gammaShare : 0; return { u, ar, tam, som }; }
export function calcCAGR(p) { return p.cagr.reduce((s, c) => s + c.v, 0); }

export const DEFAULT_SETTINGS = {
    prods: PRODUCTS,
    gpM: 0.49,
    opxR: 0.33,
    taxR: 0.26,
    centralCost: 26,
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
            if (!matchingProd) {
                return defaultProd;
            }

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
