import { useState, useMemo, useCallback } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine, Legend } from "recharts";

/* ═══════════════════════════════════════════
   ACTUAL FINANCIALS — FY2022, FY2023, FY2024, H1 2025
   Sources: Annual Report 2024, Interim Results H1 2025
   ═══════════════════════════════════════════ */
const ACTUALS = {
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
const PRODUCTS = [
    {
        id: "phoneline", name: "PhoneLine+ / Placetel", cat: "Cloud Comms", color: "#6366f1", tamUnit: "Seats",
        eq: "Seats × annual ARPU",
        quantity: [{ l: "Addressable micro/SMB businesses", v: 5200000 }, { l: "Sites per business", v: 1.0 }, { l: "Seats per site", v: 1.8 }, { l: "Cloud adoption rate", v: 0.12 }, { l: "Gamma share", v: 0.04 }],
        price: [{ l: "Base monthly ARPU", v: 8.5 }, { l: "Add-on ARPU", v: 2.0 }, { l: "Annual activation", v: 18 }],
        cagr: [{ l: "Base SMB growth", v: 0.015 }, { l: "PSTN switch-off", v: 0.035 }, { l: "Cloud migration", v: 0.025 }, { l: "Digital penetration", v: 0.03 }, { l: "Macro drag", v: -0.015 }],
        anchors: [{ m: "PhoneLine+ seats (Jun 2025)", v: "45k" }, { m: "PhoneLine+ growth H1", v: "+32%" }, { m: "UK cloud net adds H1", v: "23k" }, { m: "PSTN fibre headwind H1", v: "£1.5m GP" }]
    },
    {
        id: "horizon", name: "Horizon / STARFACE", cat: "Cloud Comms", color: "#8b5cf6", tamUnit: "Seats",
        eq: "Seats × annual ARPU",
        quantity: [{ l: "Addressable SMB/mid-market", v: 2800000 }, { l: "Employees per business", v: 12 }, { l: "Telephony % of employees", v: 0.70 }, { l: "Cloud PBX adoption", v: 0.18 }, { l: "Gamma share", v: 0.35 }],
        price: [{ l: "Base monthly ARPU", v: 11.5 }, { l: "Premium/AI add-on", v: 3.2 }, { l: "Annual devices/services", v: 28 }],
        cagr: [{ l: "Base seat growth", v: 0.01 }, { l: "HW PBX→cloud", v: 0.03 }, { l: "DE underpenetration", v: 0.025 }, { l: "AI/feature upsell", v: 0.015 }, { l: "Macro drag", v: -0.01 }],
        anchors: [{ m: "UK Cloud PBX seats", v: "1,063k" }, { m: "Europe Cloud PBX seats", v: "687k" }, { m: "DE cloud seats", v: "565k" }, { m: "DE H1 adds", v: "29k" }]
    },
    {
        id: "cisco", name: "Cisco / iPECS", cat: "Cloud Comms", color: "#a855f7", tamUnit: "Users",
        eq: "Users × annual ARPU",
        quantity: [{ l: "Addressable collab customers", v: 450000 }, { l: "Users per customer", v: 35 }, { l: "Telephony attach", v: 0.25 }, { l: "Countries per customer", v: 1.3 }, { l: "Gamma win rate", v: 0.0055 }],
        price: [{ l: "Monthly licence ARPU", v: 13 }, { l: "Voice/managed ARPU", v: 4 }, { l: "Annual implementation", v: 30 }],
        cagr: [{ l: "Base collab growth", v: 0.02 }, { l: "Cisco channel activation", v: 0.07 }, { l: "International rollout", v: 0.03 }, { l: "AI/advanced features", v: 0.015 }, { l: "Provisioning drag", v: -0.015 }],
        anchors: [{ m: "Cisco users (Jun 2025)", v: "28k" }, { m: "H1 growth", v: "75%" }, { m: "Spain commitment", v: "40k seats / 5y" }, { m: "Run-rate (Aug 2025)", v: ">2k/mo" }]
    },
    {
        id: "sip", name: "SIP Trunking", cat: "Calling", color: "#f59e0b", tamUnit: "Trunks",
        eq: "Trunks × annual ARPU",
        quantity: [{ l: "Addressable PBX sites", v: 1800000 }, { l: "Sites per customer", v: 2.2 }, { l: "Trunks per site", v: 4.5 }, { l: "SIP attach/retention", v: 0.22 }, { l: "Gamma share", v: 0.35 }],
        price: [{ l: "Monthly trunk ARPU", v: 4.0 }, { l: "Traffic/hosting ARPU", v: 1.5 }, { l: "Annual porting/setup", v: 6 }],
        cagr: [{ l: "Base trunk growth", v: -0.015 }, { l: "PSTN replacement", v: 0.015 }, { l: "Non-Gamma PBX support", v: 0.02 }, { l: "Europe retention", v: 0.005 }, { l: "HW→cloud drag", v: -0.03 }],
        anchors: [{ m: "UK trad PBX SIP (Jun 2025)", v: "902k" }, { m: "EU trad SIP (Jun 2025)", v: "201k" }, { m: "UK non-Gamma cloud SIP", v: "498k" }, { m: "UK SIP PBX (Dec 2024)", v: "932k" }]
    },
    {
        id: "voice", name: "Voice Enablement", cat: "Calling", color: "#22c55e", tamUnit: "Users",
        eq: "Users × annual ARPU",
        quantity: [{ l: "Addressable UC customers", v: 850000 }, { l: "Users per customer", v: 45 }, { l: "Voice attach rate", v: 0.15 }, { l: "Countries per deployment", v: 1.4 }, { l: "Gamma share", v: 0.067 }],
        price: [{ l: "Monthly enablement ARPU", v: 3.0 }, { l: "Numbering/managed ARPU", v: 1.3 }, { l: "Annual provisioning", v: 8 }],
        cagr: [{ l: "Base UC growth", v: 0.025 }, { l: "Teams/OC adoption", v: 0.04 }, { l: "International rollout", v: 0.02 }, { l: "Hyperscaler partnerships", v: 0.01 }, { l: "Price pressure drag", v: -0.015 }],
        anchors: [{ m: "UK Teams users (Jun 2025)", v: "523k" }, { m: "EU Teams users (Jun 2025)", v: "17k" }, { m: "UK H1 adds", v: "56k vs 28k" }, { m: "OC International", v: "14 countries" }]
    },
    {
        id: "sp", name: "Service Provider", cat: "Calling", color: "#10b981", tamUnit: "Numbers/trunks",
        eq: "Units × annual wholesale ARPU",
        quantity: [{ l: "Addressable providers", v: 650 }, { l: "Countries per provider", v: 5.0 }, { l: "Units per provider-country", v: 16000 }, { l: "Outsource penetration", v: 0.38 }, { l: "Gamma win rate", v: 0.26 }],
        price: [{ l: "Monthly hosting ARPU", v: 0.9 }, { l: "Traffic/compliance ARPU", v: 0.4 }, { l: "Annual integration", v: 2.8 }],
        cagr: [{ l: "Provider platform growth", v: 0.02 }, { l: "International expansion", v: 0.02 }, { l: "Hyperscaler growth", v: 0.015 }, { l: "New country launches", v: 0.015 }, { l: "Voice decline drag", v: -0.015 }],
        anchors: [{ m: "SP revenue H1 2025", v: "£43.5m" }, { m: "SP GP H1 2025", v: "£21.3m" }, { m: "SP revenue FY2024", v: "£76.3m" }, { m: "SP GP FY2024", v: "£36.3m" }]
    },
    {
        id: "ethernet", name: "Ethernet", cat: "Connectivity", color: "#3b82f6", tamUnit: "Circuits",
        eq: "Circuits × annual ARPU",
        quantity: [{ l: "Addressable enterprise sites", v: 900000 }, { l: "Circuits per site", v: 1.6 }, { l: "Dedicated attach rate", v: 0.40 }, { l: "SD-WAN attach rate", v: 0.25 }, { l: "Gamma win rate", v: 0.12 }],
        price: [{ l: "Monthly circuit ARPU", v: 170 }, { l: "Managed/SD-WAN ARPU", v: 35 }, { l: "Annual install/project", v: 220 }],
        cagr: [{ l: "Base circuit growth", v: 0.005 }, { l: "SD-WAN uplift", v: 0.015 }, { l: "Enterprise wins", v: 0.01 }, { l: "Fibre availability", v: 0.01 }, { l: "Price-war drag", v: -0.03 }],
        anchors: [{ m: "Ethernet GP headwind H1 2025", v: "£1.0m" }, { m: "FY26 GP headwind", v: "£3.0m" }, { m: "Enterprise win", v: "Morrisons 400+1,200" }, { m: "Enterprise win", v: "Utilita SD-WAN" }]
    },
    {
        id: "broadband", name: "Business Broadband", cat: "Connectivity", color: "#0ea5e9", tamUnit: "Lines",
        eq: "Lines × annual ARPU",
        quantity: [{ l: "Addressable SME sites", v: 3500000 }, { l: "Lines per site", v: 1.15 }, { l: "Fibre adoption rate", v: 0.62 }, { l: "Backup attach rate", v: 0.16 }, { l: "Gamma share", v: 0.25 }],
        price: [{ l: "Monthly broadband ARPU", v: 24 }, { l: "Managed/security ARPU", v: 5 }, { l: "Annual activation", v: 20 }],
        cagr: [{ l: "FTTP availability growth", v: 0.015 }, { l: "Copper→fibre migration", v: 0.015 }, { l: "Comparison-site share", v: 0.01 }, { l: "Managed attach", v: 0.005 }, { l: "Fibre margin drag", v: -0.02 }],
        anchors: [{ m: "H1 GP headwind (Cu→fibre)", v: "£1.5m" }, { m: "Expected cadence", v: "~£1.5m/half to FY26" }, { m: "Comparison-site providers", v: "BT, PXC" }]
    },
    {
        id: "mobile", name: "Mobile / Fusion IoT", cat: "Connectivity", color: "#ec4899", tamUnit: "SIMs/endpoints",
        eq: "Endpoints × annual ARPU",
        quantity: [{ l: "Addressable endpoints", v: 10000000 }, { l: "Devices per customer", v: 7.5 }, { l: "SIM penetration", v: 0.40 }, { l: "IoT management attach", v: 0.22 }, { l: "Gamma share", v: 0.03 }],
        price: [{ l: "Monthly SIM ARPU", v: 6.0 }, { l: "IoT/analytics ARPU", v: 2.5 }, { l: "Annual activation/HW", v: 12 }],
        cagr: [{ l: "Mobile user growth", v: 0.02 }, { l: "IoT endpoint growth", v: 0.04 }, { l: "PSTN non-voice replace", v: 0.02 }, { l: "eSIM deployment", v: 0.01 }, { l: "Price competition drag", v: -0.015 }],
        anchors: [{ m: "Fusion IoT launch", v: "1 Jul 2025" }, { m: "Enterprise proof", v: "AA / Centrica" }, { m: "eSIM roadmap", v: "UK + DE" }, { m: "Public sector mobile win", v: "Wolverhampton" }]
    },
];

const CATS = ["Cloud Comms", "Calling", "Connectivity"];
const CAT_C = { "Cloud Comms": "#8b5cf6", "Calling": "#22c55e", "Connectivity": "#3b82f6" };
const PROJ_YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);
const ALL_YEARS = [2022, 2023, 2024, ...PROJ_YEARS];

const fN = n => { if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}bn`; return `${n.toFixed(0)}m`; };
const fP = n => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
const fM = n => `${(n * 100).toFixed(1)}%`;
const cagr = (s, e, n) => s > 0 && e > 0 && n > 0 ? (Math.pow(e / s, 1 / n) - 1) : 0;

function calcTAM(p) { const u = p.quantity.reduce((a, q) => a * q.v, 1); const ar = (p.price[0].v + p.price[1].v) * 12 + p.price[2].v; return { u, ar, tam: (u * ar) / 1e6 }; }
function calcCAGR(p) { return p.cagr.reduce((s, c) => s + c.v, 0); }

const bg = "#080e1a", crd = "#0f172a", bdr = "#1e293b", t1 = "#e2e8f0", t2 = "#94a3b8", t3 = "#64748b";
const Box = ({ children, style }) => <div style={{ background: crd, borderRadius: 8, border: `1px solid ${bdr}`, padding: 14, marginBottom: 10, ...style }}>{children}</div>;
const Dir = ({ d }) => { const c = d === "+" ? "#22c55e" : d === "-" ? "#ef4444" : "#f59e0b"; return (<span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: `${c}18`, color: c, fontWeight: 600 }}>{d === "+" ? "↑" : d === "-" ? "↓" : "~"}</span>); };

const NI = ({ value, onChange, step, w }) => (
    <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step || 1}
        style={{ width: w || 80, padding: "3px 5px", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#fbbf24", textAlign: "right", outline: "none" }} />
);

const TABS = ["Actuals & KPIs", "Product Drivers", "Projections & P&L"];

export default function GammaModel() {
    const [tab, setTab] = useState(0);
    const [prods, setProds] = useState(PRODUCTS);
    const [sel, setSel] = useState(0);
    const [gpM, setGpM] = useState(0.543);
    const [opxR, setOpxR] = useState(0.32);
    const [taxR, setTaxR] = useState(0.26);
    const [centralCost, setCentralCost] = useState(26);

    const uQ = useCallback((pi, qi, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], quantity: [...n[pi].quantity] }; x.quantity[qi] = { ...x.quantity[qi], v }; n[pi] = x; return n; }), []);
    const uP = useCallback((pi, qi, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], price: [...n[pi].price] }; x.price[qi] = { ...x.price[qi], v }; n[pi] = x; return n; }), []);
    const uC = useCallback((pi, ci, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], cagr: [...n[pi].cagr] }; x.cagr[ci] = { ...x.cagr[ci], v }; n[pi] = x; return n; }), []);

    const comp = useMemo(() => prods.map(p => { const r = calcTAM(p); const c = calcCAGR(p); return { ...r, cagr: c }; }), [prods]);
    const totalModelTAM = comp.reduce((s, c) => s + c.tam, 0);

    // Build combined actuals + projections P&L
    const plData = useMemo(() => {
        const rows = [];
        // Actuals
        ACTUALS.group.forEach(a => {
            const ann = a.period === "H1" ? 2 : 1;
            rows.push({
                year: a.year, type: a.period === "H1" ? "H1 actual" : "actual",
                rev: a.rev * ann, gp: a.gp * ann, gpM: a.gpM,
                adjEBITDA: a.adjEBITDA * ann, adjPBT: (a.adjPBT || 0) * ann,
                pbt: (a.pbt || 0) * ann, pat: (a.pat || 0) * ann,
                adjEps: a.adjEps * ann, eps: a.eps * ann,
            });
        });
        // Projections 2026-2035
        PROJ_YEARS.slice(1).forEach(y => {
            let totRev = 0;
            prods.forEach((p, i) => { const t = y - 2025; totRev += comp[i].tam * Math.pow(1 + comp[i].cagr, t); });
            const gp = totRev * gpM;
            const opex = totRev * opxR;
            const ebitda = gp - opex - centralCost;
            const dna = totRev * 0.04;
            const ebit = ebitda - dna;
            const pbt = ebit;
            const tax = Math.max(0, pbt * taxR);
            rows.push({ year: y, type: "projected", rev: totRev, gp, gpM, adjEBITDA: ebitda, pbt, pat: pbt - tax });
        });
        return rows;
    }, [prods, comp, gpM, opxR, taxR, centralCost]);

    // Product-level projections
    const prodProj = useMemo(() => prods.map((p, i) => {
        return PROJ_YEARS.map(y => ({ year: y, tam: comp[i].tam * Math.pow(1 + comp[i].cagr, y - 2025) }));
    }), [prods, comp]);

    // Stacked revenue data for chart
    const stackData = useMemo(() => {
        return PROJ_YEARS.map(y => {
            const row = { year: y };
            let tot = 0;
            prods.forEach((p, i) => { const t = y - 2025; const r = comp[i].tam * Math.pow(1 + comp[i].cagr, t); row[p.id] = r; tot += r; });
            row.total = tot;
            return row;
        });
    }, [prods, comp]);

    const a = ACTUALS;

    return (
        <div style={{ background: bg, color: t1, fontFamily: "'IBM Plex Sans',system-ui,sans-serif", minHeight: "100vh", padding: "10px 12px", fontSize: 13 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${bdr}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff" }}>Γ</div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Gamma Communications PLC — Market Model</h1>
                    <div style={{ fontSize: 10, color: t2 }}>FY2022–FY2024 Actuals · H1 2025 · 9-Line Driver Tree Projections · LON:GAMA</div>
                </div>
                <div style={{ fontSize: 10, color: t3, textAlign: "right" }}>
                    <div>FY2024 Rev: £579.4m</div>
                    <div>H1 2025 Rev: £316.6m</div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 2, marginBottom: 12, background: "#060a14", borderRadius: 6, padding: 3 }}>
                {TABS.map((t, i) => (
                    <button key={t} onClick={() => setTab(i)} style={{ flex: 1, padding: "6px 8px", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: tab === i ? 600 : 400, background: tab === i ? "#3b82f6" : "transparent", color: tab === i ? "#fff" : t2, transition: "all 0.15s" }}>{t}</button>
                ))}
            </div>

            {/* ═══ TAB 0: ACTUALS ═══ */}
            {tab === 0 && (<>
                {/* Group P&L headline KPIs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    {[
                        { l: "FY2024 Revenue", v: "£579.4m", d: "+11% YoY", c: "#3b82f6" },
                        { l: "FY2024 Gross Margin", v: "51.8%", d: "+60bps YoY", c: "#22c55e" },
                        { l: "FY2024 Adj. EBITDA", v: "£125.5m", d: "+10% YoY", c: "#f59e0b" },
                        { l: "H1 2025 Revenue", v: "£316.6m", d: "+12% YoY", c: "#8b5cf6" },
                        { l: "H1 2025 Adj. EBITDA", v: "£70.9m", d: "+14% YoY", c: "#ec4899" },
                        { l: "FY2025E Consensus", v: "£139–143m", d: "Adj. EBITDA range", c: "#10b981" },
                    ].map((k, i) => (
                        <Box key={i} style={{ flex: 1, minWidth: 130, borderTop: `3px solid ${k.c}`, textAlign: "center", padding: 10 }}>
                            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 0.8 }}>{k.l}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: k.c, margin: "3px 0" }}>{k.v}</div>
                            <div style={{ fontSize: 10, color: t2 }}>{k.d}</div>
                        </Box>
                    ))}
                </div>

                {/* Actual P&L table */}
                <Box>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Group Income Statement — Actuals (£m)</div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                {["", ..."FY2022,FY2023,FY2024,H1 2025,FY2025E ann.".split(",")].map(h => (
                                    <th key={h} style={{ textAlign: h === "" ? "left" : "right", padding: "5px 6px", color: t2, fontWeight: 500, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {[
                                    { l: "Revenue", k: [484.6, 521.7, 579.4, 316.6, 633.2], b: true },
                                    { l: "Cost of Sales", k: [236.9, 254.5, 279.1, 144.6, 289.2], neg: true },
                                    { l: "Gross Profit", k: [247.7, 267.2, 300.3, 172.0, 344.0], b: true },
                                    { l: "Gross Margin", k: [0.511, 0.512, 0.518, 0.543, 0.543], pct: true },
                                    { l: "Operating Expenses", k: [null, 200.2, 210.0, 127.6, 255.2], neg: true },
                                    { l: "  Exceptional Items", k: [null, 16.0, 0, 7.3, 7.3], indent: true },
                                    { l: "Profit from Operations", k: [null, 67.0, 90.3, 44.4, 88.8] },
                                    { l: "Net Finance", k: [null, 4.5, 5.3, -0.9, -1.8] },
                                    { l: "Profit Before Tax", k: [null, 71.5, 95.6, 43.5, 87.0] },
                                    { l: "Tax", k: [null, 17.8, 25.8, 11.1, 22.2], neg: true },
                                    { l: "Profit After Tax", k: [null, 53.7, 69.8, 32.4, 64.8], b: true },
                                    { l: "", k: [null, null, null, null, null] },
                                    { l: "Adjusted EBITDA", k: [105.1, 114.3, 125.5, 70.9, 141.8], b: true, hl: true },
                                    { l: "Adjusted PBT", k: [87.8, 97.9, 111.9, 61.0, 122.0], b: true },
                                    { l: "Adj. EPS (diluted, pence)", k: [71.8, 75.1, 85.1, 47.9, 95.8] },
                                    { l: "EPS (diluted, pence)", k: [50.6, 54.9, 72.0, 34.1, 68.2] },
                                    { l: "", k: [null, null, null, null, null] },
                                    { l: "Net Cash / (Debt)", k: [92.5, 134.8, 153.7, null, null] },
                                    { l: "Net Debt", k: [null, null, null, 21.6, null] },
                                    { l: "Recurring Revenue %", k: [89, 89, 89, 90, 90], pct2: true },
                                ].map((r, ri) => (
                                    <tr key={ri} style={{ borderBottom: `1px solid ${bdr}15`, background: r.hl ? "#3b82f608" : "transparent" }}>
                                        <td style={{ padding: "3px 6px", fontWeight: r.b ? 700 : 400, fontSize: r.indent ? 10 : 11, color: r.indent ? t3 : t1 }}>{r.l}</td>
                                        {r.k.map((v, vi) => (
                                            <td key={vi} style={{ textAlign: "right", padding: "3px 6px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: r.b ? 600 : 400, color: r.neg ? t2 : v < 0 ? "#ef4444" : t1 }}>
                                                {v === null ? "—" : r.pct ? fM(v) : r.pct2 ? `${v}%` : v.toFixed(1)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>FY2025E annualised = H1 2025 × 2 (simple annualisation). Consensus Adj. EBITDA: £139.4–143.1m. Source: Gamma Annual Report 2024, Interim Results H1 2025.</div>
                </Box>

                {/* Segment performance */}
                <div style={{ display: "flex", gap: 10 }}>
                    <Box style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Segment Performance — FY2024 (£m)</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ borderBottom: `1px solid ${bdr}` }}>
                                {["Segment", "Revenue", "Gross Profit", "GP%", "Adj.EBITDA"].map(h => (
                                    <th key={h} style={{ textAlign: h === "Segment" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 10 }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {a.segments[2024].map((s, i) => (
                                    <tr key={i} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                        <td style={{ padding: "3px 5px", fontWeight: s.name === "Central" ? 400 : 600 }}>{s.name}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{s.rev || "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{s.gp || "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: t2 }}>{s.gpM ? fM(s.gpM) : "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: s.adjEBITDA < 0 ? "#ef4444" : t1 }}>{s.adjEBITDA.toFixed(1)}</td>
                                    </tr>
                                ))}
                                <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                    <td style={{ padding: "4px 5px" }}>Group</td>
                                    <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>579.4</td>
                                    <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>300.3</td>
                                    <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace", color: t2 }}>51.8%</td>
                                    <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>125.5</td>
                                </tr>
                            </tbody>
                        </table>
                    </Box>
                    <Box style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Segment Performance — H1 2025 (£m)</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ borderBottom: `1px solid ${bdr}` }}>
                                {["Segment", "Revenue", "GP", "GP%", "Adj.EBITDA"].map(h => (
                                    <th key={h} style={{ textAlign: h === "Segment" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 10 }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {a.segments["H1 2025"].map((s, i) => (
                                    <tr key={i} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                        <td style={{ padding: "3px 5px", fontWeight: s.name === "Central" ? 400 : 600, color: s.name === "Germany" ? "#8b5cf6" : s.name === "Other Europe" ? "#06b6d4" : t1 }}>{s.name}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{s.rev || "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{s.gp || "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: t2 }}>{s.gpM ? fM(s.gpM) : "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: s.adjEBITDA < 0 ? "#ef4444" : t1 }}>{s.adjEBITDA.toFixed(1)}</td>
                                    </tr>
                                ))}
                                <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                    <td style={{ padding: "4px 5px" }}>Group</td>
                                    <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>316.6</td>
                                    <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>172.0</td>
                                    <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace", color: t2 }}>54.3%</td>
                                    <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>70.9</td>
                                </tr>
                            </tbody>
                        </table>
                    </Box>
                </div>

                {/* Volume metrics */}
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Disclosed Product Volumes ('000s) — Actuals</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                        <thead><tr style={{ borderBottom: `1px solid ${bdr}` }}>
                            {["Metric", "Jun 2024", "Dec 2024", "Jun 2025", "H1 25 Δ"].map(h => (
                                <th key={h} style={{ textAlign: h === "Metric" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 9 }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {[
                                { l: "UK Cloud PBX seats", k: "ukCloudPBX" },
                                { l: "Europe Cloud PBX seats", k: "euCloudPBX" },
                                { l: "  of which Germany", k: "deCloudSeats" },
                                { l: "UK SIP (traditional PBX)", k: "ukSIPtrad", decline: true },
                                { l: "Europe SIP (traditional PBX)", k: "euSIPtrad", decline: true },
                                { l: "UK SIP (non-Gamma cloud PBX)", k: "ukSIPcloud" },
                                { l: "UK Voice-enabled Teams", k: "ukTeams" },
                                { l: "Europe Voice-enabled Teams", k: "euTeams" },
                                { l: "UK CCaaS seats", k: "ukCCaaS" },
                            ].map((r, ri) => {
                                const v = a.volumes;
                                const jun24 = v["Jun 2024"][r.k];
                                const dec24 = v["Dec 2024"][r.k];
                                const jun25 = v["Jun 2025"][r.k];
                                const h1chg = jun25 && dec24 ? ((jun25 - dec24) / dec24 * 100).toFixed(0) + "%" : "—";
                                return (
                                    <tr key={ri} style={{ borderBottom: `1px solid ${bdr}10` }}>
                                        <td style={{ padding: "3px 5px", color: r.l.startsWith("  ") ? t3 : t1, fontSize: r.l.startsWith("  ") ? 10 : 11 }}>{r.l}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{jun24 || "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{dec24 || "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{jun25 || "—"}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: r.decline ? "#ef4444" : "#22c55e" }}>{h1chg}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 10, color: t2 }}>
                        <span>Total Cloud Seats: <b style={{ color: "#8b5cf6" }}>1,800k</b></span>
                        <span>PhoneLine+ Seats: <b style={{ color: "#6366f1" }}>45k</b> (+32% in H1)</span>
                        <span>Cisco Users: <b style={{ color: "#a855f7" }}>28k</b> (+75% in H1)</span>
                    </div>
                </Box>

                {/* Historical chart */}
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Revenue & Adjusted EBITDA — Actuals (£m, full year)</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <ComposedChart data={[{ y: "FY22", rev: 484.6, ebitda: 105.1, gp: 247.7 }, { y: "FY23", rev: 521.7, ebitda: 114.3, gp: 267.2 }, { y: "FY24", rev: 579.4, ebitda: 125.5, gp: 300.3 }, { y: "H1'25×2", rev: 633.2, ebitda: 141.8, gp: 344.0 }]} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                            <XAxis dataKey="y" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                            <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => [`£${v.toFixed(0)}m`]} />
                            <Bar dataKey="rev" fill="#3b82f650" name="Revenue" radius={[2, 2, 0, 0]} />
                            <Line type="monotone" dataKey="gp" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Gross Profit" />
                            <Line type="monotone" dataKey="ebitda" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Adj. EBITDA" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Box>
            </>)}

            {/* ═══ TAB 1: PRODUCT DRIVERS ═══ */}
            {tab === 1 && (() => {
                const p = prods[sel], c = comp[sel];
                return (<div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 175, flexShrink: 0 }}>
                        <Box style={{ padding: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: t2, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>9 Solution Lines</div>
                            {prods.map((pr, i) => (
                                <button key={pr.id} onClick={() => setSel(i)} style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", padding: "5px 7px", border: "none", borderRadius: 4, cursor: "pointer", marginBottom: 1, textAlign: "left", background: sel === i ? `${pr.color}20` : "transparent", borderLeft: sel === i ? `3px solid ${pr.color}` : "3px solid transparent", color: sel === i ? t1 : t2, fontSize: 10, transition: "all 0.12s" }}>
                                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: pr.color, flexShrink: 0 }} />
                                    <span style={{ fontWeight: sel === i ? 600 : 400 }}>{pr.name}</span>
                                </button>
                            ))}
                        </Box>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Box style={{ borderTop: `3px solid ${p.color}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <div style={{ fontSize: 9, color: CAT_C[p.cat], fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{p.cat}</div>
                                    <h2 style={{ margin: "2px 0", fontSize: 16, fontWeight: 700, color: p.color }}>{p.name}</h2>
                                    <div style={{ fontSize: 9, color: t3, fontFamily: "'JetBrains Mono',monospace" }}>{p.eq}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 9, color: t2 }}>Model TAM</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: p.color }}>£{c.tam.toFixed(0)}m</div>
                                    <div style={{ fontSize: 11, color: c.cagr >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>CAGR {fP(c.cagr)}</div>
                                </div>
                            </div>
                        </Box>

                        <div style={{ display: "flex", gap: 10 }}>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#f59e0b" }}>Quantity Tree</div>
                                {p.quantity.map((q, qi) => (
                                    <div key={qi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{q.l}</div>
                                        <NI value={q.v} onChange={v => uQ(sel, qi, v)} step={q.v >= 1e6 ? 100000 : q.v >= 100 ? 5 : q.v >= 1 ? 0.1 : 0.005} w={q.v >= 1e6 ? 95 : 70} />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                                    <span>Billable units</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#f59e0b" }}>{fN(c.u / 1e6)}</span>
                                </div>
                            </Box>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#22c55e" }}>Price Tree</div>
                                {p.price.map((pr, pi) => (
                                    <div key={pi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{pr.l}</div>
                                        <NI value={pr.v} onChange={v => uP(sel, pi, v)} step={pr.v >= 50 ? 5 : 0.5} w={70} />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                                    <span>Annual ARPU</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#22c55e" }}>£{c.ar.toFixed(0)}</span>
                                </div>
                            </Box>
                        </div>

                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#3b82f6" }}>CAGR Build</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                                {p.cagr.map((cv, ci) => (
                                    <div key={ci} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 4 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{cv.l}</div>
                                        <input type="range" min={-0.1} max={0.15} step={0.005} value={cv.v} onChange={e => uC(sel, ci, parseFloat(e.target.value))} style={{ width: 65, accentColor: cv.v >= 0 ? "#22c55e" : "#ef4444" }} />
                                        <span style={{ width: 42, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: cv.v >= 0 ? "#22c55e" : "#ef4444" }}>{(cv.v * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>Model CAGR</span>
                                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>{fP(c.cagr)}</span>
                            </div>
                            <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 10, color: t2 }}>
                                <span>Yr3: <b style={{ color: t1 }}>£{(c.tam * Math.pow(1 + c.cagr, 3)).toFixed(0)}m</b></span>
                                <span>Yr5: <b style={{ color: t1 }}>£{(c.tam * Math.pow(1 + c.cagr, 5)).toFixed(0)}m</b></span>
                                <span>Yr10: <b style={{ color: t1 }}>£{(c.tam * Math.pow(1 + c.cagr, 10)).toFixed(0)}m</b></span>
                            </div>
                        </Box>

                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>TAM Projection</div>
                            <ResponsiveContainer width="100%" height={130}>
                                <AreaChart data={prodProj[sel]} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                    <defs><linearGradient id={`g${sel}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={p.color} stopOpacity={0.4} /><stop offset="95%" stopColor={p.color} stopOpacity={0.05} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                    <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => [`£${v.toFixed(0)}m`]} labelFormatter={l => `FY${l}E`} />
                                    <Area type="monotone" dataKey="tam" stroke={p.color} strokeWidth={2.5} fill={`url(#g${sel})`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>

                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Disclosed Anchors (H1 2025)</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {p.anchors.map((an, ai) => (
                                    <div key={ai} style={{ background: "#1a2744", borderRadius: 6, padding: "6px 10px", flex: "1 1 140px" }}>
                                        <div style={{ fontSize: 9, color: t2 }}>{an.m}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#fbbf24" }}>{an.v}</div>
                                    </div>
                                ))}
                            </div>
                        </Box>
                    </div>
                </div>);
            })()}

            {/* ═══ TAB 2: PROJECTIONS ═══ */}
            {tab === 2 && (<>
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#f59e0b" }}>Projection Assumptions (applied to model TAM)</div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {[{ l: "Blended GP Margin", v: gpM, s: setGpM, mn: 0.4, mx: 0.65 }, { l: "OpEx % Revenue", v: opxR, s: setOpxR, mn: 0.2, mx: 0.45 }, { l: "Tax Rate", v: taxR, s: setTaxR, mn: 0.2, mx: 0.35 }, { l: "Central Costs (£m)", v: centralCost, s: setCentralCost, mn: 10, mx: 40, abs: true }].map(x => (
                            <div key={x.l} style={{ flex: 1, minWidth: 120 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t2, marginBottom: 2 }}>
                                    <span>{x.l}</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#fbbf24" }}>{x.abs ? `£${x.v}m` : fM(x.v)}</span>
                                </div>
                                <input type="range" min={x.mn} max={x.mx} step={x.abs ? 1 : 0.005} value={x.v} onChange={e => x.s(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#3b82f6" }} />
                            </div>
                        ))}
                    </div>
                </Box>

                <Box>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Actuals + Modelled Revenue by Product (£m)</span>
                        <span style={{ fontSize: 10, color: t2 }}>FY22–24 actual bars · FY25E–35E driver-tree projection</span>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={[
                            { year: "FY22", actual: 484.6 }, { year: "FY23", actual: 521.7 }, { year: "FY24", actual: 579.4 }, { year: "H1'25×2", actual: 633.2 },
                            ...stackData.map(d => ({ year: `${d.year}E`, ...d, modelled: d.total }))
                        ]} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                            <XAxis dataKey="year" tick={{ fill: t2, fontSize: 9 }} tickLine={false} />
                            <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => v ? [`£${v.toFixed(0)}m`] : null} labelFormatter={l => l} />
                            <Bar dataKey="actual" fill="#ffffff30" name="Actual Revenue" radius={[2, 2, 0, 0]} />
                            {prods.map(p => <Area key={p.id} type="monotone" dataKey={p.id} stackId="1" fill={p.color} stroke={p.color} fillOpacity={0.7} name={p.name} />)}
                            <ReferenceLine x="2030E" stroke="#ffffff20" strokeDasharray="4 4" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Box>

                {/* Model summary table */}
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Product TAM Summary — Model vs Actual</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                        <thead><tr style={{ borderBottom: `2px solid ${bdr}` }}>
                            {["Product", "TAM £m", "CAGR", "FY28E", "FY30E", "FY35E", "Category"].map(h => (
                                <th key={h} style={{ textAlign: h === "Product" || h === "Category" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 9 }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {prods.map((p, i) => {
                                const c = comp[i]; return (
                                    <tr key={p.id} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                        <td style={{ padding: "3px 5px" }}><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 2, background: p.color, marginRight: 4, verticalAlign: "middle" }} />{p.name}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{c.tam.toFixed(0)}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>{fP(c.cagr)}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(c.tam * Math.pow(1 + c.cagr, 3)).toFixed(0)}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(c.tam * Math.pow(1 + c.cagr, 5)).toFixed(0)}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(c.tam * Math.pow(1 + c.cagr, 10)).toFixed(0)}</td>
                                        <td style={{ padding: "3px 5px", color: CAT_C[p.cat], fontSize: 9 }}>{p.cat}</td>
                                    </tr>);
                            })}
                            <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                <td style={{ padding: "4px 5px" }}>Total Model TAM</td>
                                <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{totalModelTAM.toFixed(0)}</td>
                                <td />
                                <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c) => s + c.tam * Math.pow(1 + c.cagr, 3), 0).toFixed(0)}</td>
                                <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c) => s + c.tam * Math.pow(1 + c.cagr, 5), 0).toFixed(0)}</td>
                                <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c) => s + c.tam * Math.pow(1 + c.cagr, 10), 0).toFixed(0)}</td>
                                <td />
                            </tr>
                        </tbody>
                    </table>
                    <div style={{ fontSize: 10, color: t2, marginTop: 6, display: "flex", gap: 16 }}>
                        <span>FY2024 Actual Revenue: <b style={{ color: "#f59e0b" }}>£579.4m</b></span>
                        <span>Model TAM (base year): <b style={{ color: "#3b82f6" }}>£{totalModelTAM.toFixed(0)}m</b></span>
                        <span>Calibration ratio: <b style={{ color: t1 }}>{(579.4 / totalModelTAM).toFixed(2)}x</b></span>
                    </div>
                </Box>

                {/* Projected P&L */}
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Modelled P&L — Projected (£m)</div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace" }}>
                            <thead><tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                <th style={{ textAlign: "left", padding: "5px 5px", fontFamily: "'IBM Plex Sans',sans-serif", color: t2, fontWeight: 500, fontSize: 9 }}>Line Item</th>
                                {PROJ_YEARS.map(y => <th key={y} style={{ textAlign: "right", padding: "5px 3px", color: t2, fontWeight: 500, fontSize: 9 }}>FY{y}E</th>)}
                            </tr></thead>
                            <tbody>
                                {prods.map((pr, i) => (
                                    <tr key={pr.id} style={{ borderBottom: `1px solid ${bdr}10` }}>
                                        <td style={{ padding: "2px 5px", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 10, color: t2 }}>
                                            <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 1, background: pr.color, marginRight: 3, verticalAlign: "middle" }} />{pr.name}
                                        </td>
                                        {PROJ_YEARS.map(y => <td key={y} style={{ textAlign: "right", padding: "2px 3px", fontSize: 10 }}>{(comp[i].tam * Math.pow(1 + comp[i].cagr, y - 2025)).toFixed(0)}</td>)}
                                    </tr>
                                ))}
                                {[
                                    { k: "rev", l: "Total Revenue", b: true, sep: true },
                                    { k: "gp", l: "Gross Profit" },
                                    { k: "adjEBITDA", l: "Adj. EBITDA", b: true, hl: true },
                                    { k: "pbt", l: "PBT" },
                                    { k: "pat", l: "Net Income", b: true },
                                ].map((r, ri) => {
                                    const getVal = (y) => {
                                        let tot = 0; prods.forEach((p, i) => { tot += comp[i].tam * Math.pow(1 + comp[i].cagr, y - 2025); });
                                        const gp = tot * gpM; const ebitda = gp - tot * opxR - centralCost; const pbt2 = ebitda - tot * 0.04;
                                        return { rev: tot, gp, adjEBITDA: ebitda, pbt: pbt2, pat: pbt2 - Math.max(0, pbt2 * taxR) }[r.k];
                                    };
                                    return (
                                        <tr key={ri} style={{ borderTop: r.sep ? `2px solid ${bdr}` : `1px solid ${bdr}15`, background: r.hl ? "#3b82f608" : "transparent" }}>
                                            <td style={{ padding: "3px 5px", fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: r.b ? 700 : 400, fontSize: 11 }}>{r.l}</td>
                                            {PROJ_YEARS.map(y => { const v = getVal(y); return (<td key={y} style={{ textAlign: "right", padding: "3px 3px", fontWeight: r.b ? 600 : 400, color: v < 0 ? "#ef4444" : t1 }}>{v.toFixed(0)}</td>); })}
                                        </tr>);
                                })}
                            </tbody>
                        </table>
                    </div>
                </Box>

                {/* CAGR summary */}
                <div style={{ display: "flex", gap: 10 }}>
                    {[{ l: "3-Year (→FY2028)", n: 3 }, { l: "5-Year (→FY2030)", n: 5 }, { l: "10-Year (→FY2035)", n: 10 }].map(h => {
                        const revBase = totalModelTAM; const revEnd = comp.reduce((s, c) => s + c.tam * Math.pow(1 + c.cagr, h.n), 0);
                        const rc = cagr(revBase, revEnd, h.n);
                        const getEbitda = (y) => { let tot = 0; prods.forEach((p, i) => { tot += comp[i].tam * Math.pow(1 + comp[i].cagr, y - 2025); }); return tot * gpM - tot * opxR - centralCost; };
                        const eb = getEbitda(2025); const ee = getEbitda(2025 + h.n); const ec = cagr(eb, ee, h.n);
                        return (<Box key={h.l} style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#3b82f6" }}>{h.l}</div>
                            {[{ l: "Revenue CAGR", v: fP(rc), c: rc >= 0 ? "#22c55e" : "#ef4444" }, { l: "EBITDA CAGR", v: fP(ec), c: ec >= 0 ? "#22c55e" : "#ef4444" }, { l: `FY${2025 + h.n}E Revenue`, v: `£${revEnd.toFixed(0)}m`, c: t1 }, { l: `FY${2025 + h.n}E EBITDA`, v: `£${ee.toFixed(0)}m`, c: t1 }].map(x => (
                                <div key={x.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                                    <span style={{ color: t2 }}>{x.l}</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: x.c }}>{x.v}</span>
                                </div>
                            ))}
                        </Box>);
                    })}
                </div>
            </>)}

            <div style={{ marginTop: 10, padding: "6px 10px", background: "#0a0e18", border: `1px solid ${bdr}`, borderRadius: 5 }}>
                <div style={{ fontSize: 8, color: "#f59e0b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Sources & Disclaimer</div>
                <div style={{ fontSize: 8.5, color: t3, lineHeight: 1.5 }}>
                    Actuals: Gamma Annual Report FY2024, Interim Results H1 2025 (9 Sep 2025). Segment data: FY2023 and FY2024 use the legacy 3-segment structure (Business/Enterprise/Europe); H1 2025 uses 5-segment structure (Business/Enterprise/Germany/Other Europe/Central). Product driver trees from Gamma H1 2025 investor presentation (9 solution lines). Projections are model-generated using editable assumptions — not validated TAM estimates or company guidance. FY2025E consensus Adj. EBITDA: £139.4–143.1m, Adj. EPS: 89.9–93.9p. Not investment advice. Not for distribution.
                </div>
            </div>
        </div>
    );
}
