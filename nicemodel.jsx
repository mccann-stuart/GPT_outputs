import { useState, useMemo, useCallback, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine, Legend } from "recharts";

import {
    ACTUALS,
    PRODUCTS,
    CATS,
    CAT_C,
    PROJ_YEARS,
    ALL_YEARS,
    fN,
    fP,
    fM,
    cagr,
    calcTAM,
    calcCAGR,
    DEFAULT_SETTINGS as LOGIC_DEFAULT_SETTINGS,
    resolveInitialSettings
} from "./nicelogic.mjs";

export const DEFAULT_SETTINGS = LOGIC_DEFAULT_SETTINGS;

const bg = "#080e1a", crd = "#0f172a", bdr = "#1e293b", t1 = "#e2e8f0", t2 = "#94a3b8", t3 = "#64748b";
const Box = ({ children, style }) => <div style={{ background: crd, borderRadius: 8, border: `1px solid ${bdr}`, padding: 14, marginBottom: 10, ...style }}>{children}</div>;
const Dir = ({ d }) => { const c = d === "+" ? "#22c55e" : d === "-" ? "#ef4444" : "#f59e0b"; return (<span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: `${c}18`, color: c, fontWeight: 600 }}>{d === "+" ? "↑" : d === "-" ? "↓" : "~"}</span>); };

const NI = ({ value, onChange, step, w, isPct }) => (
    <div style={{ position: "relative", width: w || 80 }}>
        <input type="number"
            value={isPct ? +(value * 100).toFixed(2) : value}
            onChange={e => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) onChange(isPct ? val / 100 : val);
                else onChange(0);
            }}
            step={step || (isPct ? 1 : 1)}
            style={{ boxSizing: "border-box", width: "100%", padding: isPct ? "3px 15px 3px 5px" : "3px 5px", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#fbbf24", textAlign: "right", outline: "none" }}
        />
        {isPct && <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: "#fbbf24", fontSize: 11, pointerEvents: "none" }}>%</span>}
    </div>
);

const TABS = ["Market Model, by Product Line", "Projections + P&L", "Actuals & KPIs"];
const fyLabel = (year, isEstimate = false) => `FY${String(year).slice(-2)}${isEstimate ? "E" : ""}`;
const formatAxisRevenue = value => (Math.abs(value) >= 1e3 ? `${(value / 1e3).toFixed(1)}B` : `${Math.round(value).toLocaleString()}`);
const formatCalibrationRatio = ratio => {
    if (!Number.isFinite(ratio)) return "n/a";
    if (ratio === 0) return "0x";
    const absRatio = Math.abs(ratio);
    if (absRatio < 0.01) return `${ratio.toFixed(4)}x`;
    if (absRatio < 0.1) return `${ratio.toFixed(3)}x`;
    return `${ratio.toFixed(2)}x`;
};

export default function NICEModel({ initialSettings = DEFAULT_SETTINGS, onSettingsChange }) {
    const resolvedInitialSettings = useMemo(
        () => resolveInitialSettings(initialSettings),
        [initialSettings]
    );

    const [tab, setTab] = useState(0);
    const [prods, setProds] = useState(resolvedInitialSettings.prods);
    const [sel, setSel] = useState(0);
    const [gpM, setGpM] = useState(resolvedInitialSettings.gpM);
    const [opxR, setOpxR] = useState(resolvedInitialSettings.opxR);
    const [taxR, setTaxR] = useState(resolvedInitialSettings.taxR);
    const [centralCost, setCentralCost] = useState(resolvedInitialSettings.centralCost);
    const [isCompact, setIsCompact] = useState(() => typeof window !== "undefined" && window.innerWidth <= 900);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const updateCompactMode = () => setIsCompact(window.innerWidth <= 900);
        updateCompactMode();
        window.addEventListener("resize", updateCompactMode);
        return () => window.removeEventListener("resize", updateCompactMode);
    }, []);

    useEffect(() => {
        if (typeof onSettingsChange === "function") {
            onSettingsChange({ prods, gpM, opxR, taxR, centralCost });
        }
    }, [prods, gpM, opxR, taxR, centralCost, onSettingsChange]);

    const uQ = useCallback((pi, qi, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], quantity: [...n[pi].quantity] }; x.quantity[qi] = { ...x.quantity[qi], v }; n[pi] = x; return n; }), []);
    const uP = useCallback((pi, qi, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], price: [...n[pi].price] }; x.price[qi] = { ...x.price[qi], v }; n[pi] = x; return n; }), []);
    const uC = useCallback((pi, ci, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], cagr: [...n[pi].cagr] }; x.cagr[ci] = { ...x.cagr[ci], v }; n[pi] = x; return n; }), []);

    const comp = useMemo(() => prods.map(p => { const r = calcTAM(p); const c = calcCAGR(p); return { ...r, cagr: c }; }), [prods]);
    const totalModelSOM = comp.reduce((s, c) => s + c.som, 0);
    const fy2025ActualRevenue = ACTUALS.group.find(x => x.year === 2025)?.ngRev ?? ACTUALS.group.find(x => x.year === 2025)?.rev ?? 0;
    const calibrationRatio = totalModelSOM > 0 ? fy2025ActualRevenue / totalModelSOM : 1;
    const calibratedBaseSom = useMemo(() => comp.map(c => c.som * calibrationRatio), [comp, calibrationRatio]);
    const totalCalibratedSOM = calibratedBaseSom.reduce((s, value) => s + value, 0);

    // Build combined actuals + projections P&L
    const plData = useMemo(() => {
        const rows = [];
        ACTUALS.group.forEach(a => {
            rows.push({
                year: a.year, type: "actual",
                rev: a.ngRev, gp: a.ngGP, gpM: a.ngGPM,
                ngOpInc: a.ngOpInc, ngOpM: a.ngOpM,
                ni: a.ngNI, eps: a.ngEPS,
            });
        });
        PROJ_YEARS.slice(1).forEach(y => {
            let totRev = 0;
            comp.forEach((c, i) => { const t = y - 2025; totRev += calibratedBaseSom[i] * Math.pow(1 + c.cagr, t); });
            const gp = totRev * gpM;
            const opex = totRev * opxR;
            const opInc = gp - opex - centralCost;
            const pbt = opInc;
            const tax = Math.max(0, pbt * taxR);
            rows.push({ year: y, type: "projected", rev: totRev, gp, gpM, ngOpInc: opInc, pbt, ni: pbt - tax });
        });
        return rows;
    }, [comp, calibratedBaseSom, gpM, opxR, taxR, centralCost]);

    // Product-level projections
    const prodProj = useMemo(() => prods.map((p, i) => (
        PROJ_YEARS.map(y => ({ year: y, som: calibratedBaseSom[i] * Math.pow(1 + comp[i].cagr, y - 2025) }))
    )), [prods, comp, calibratedBaseSom]);

    // Stacked revenue data for chart
    const stackData = useMemo(() => {
        return PROJ_YEARS.map(y => {
            const row = { year: y };
            let tot = 0;
            prods.forEach((p, i) => { const t = y - 2025; const r = calibratedBaseSom[i] * Math.pow(1 + comp[i].cagr, t); row[p.id] = r; tot += r; });
            row.total = tot;
            return row;
        });
    }, [prods, comp, calibratedBaseSom]);

    const actualPlusModelledData = useMemo(() => ([
        ...ACTUALS.group.map(row => ({ year: fyLabel(row.year), actual: row.ngRev ?? row.rev })),
        ...stackData.map(d => ({ year: fyLabel(d.year, true), ...d, modelled: d.total }))
    ]), [stackData]);

    const a = ACTUALS;

    return (
        <div style={{ background: bg, color: t1, fontFamily: "'IBM Plex Sans',system-ui,sans-serif", minHeight: "100vh", padding: isCompact ? "8px 8px" : "10px 12px", fontSize: 13, overflowX: "hidden" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${bdr}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: -1 }}>Ni</div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>NiCE Ltd — Market Model</h1>
                    <div style={{ fontSize: 10, color: t2 }}>FY2022–FY2025 Actuals · 9-Line Driver Tree Projections · NASDAQ:NICE</div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 2, marginBottom: 12, background: "#060a14", borderRadius: 6, padding: 3, overflowX: isCompact ? "auto" : "visible" }}>
                {TABS.map((t, i) => (
                    <button key={t} onClick={() => setTab(i)} style={{ flex: 1, padding: "6px 8px", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: tab === i ? 600 : 400, background: tab === i ? "#6366f1" : "transparent", color: tab === i ? "#fff" : t2, transition: "all 0.15s" }}>{t}</button>
                ))}
            </div>

            {/* ═══ TAB 2: ACTUALS ═══ */}
            {tab === 2 && (<>
                {/* Group P&L headline KPIs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    {[
                        { l: "FY2025 Revenue", v: "$2,945M", d: "+8% YoY", c: "#6366f1" },
                        { l: "FY2025 Non-GAAP GM", v: "69.6%", d: "Non-GAAP basis", c: "#22c55e" },
                        { l: "FY2025 Non-GAAP OpInc", v: "$908M", d: "30.8% margin", c: "#f59e0b" },
                        { l: "FY2025 Cloud Rev", v: "$2,244M", d: "+13% YoY, 76% of total", c: "#8b5cf6" },
                        { l: "AI ARR (Q4 2025)", v: "$328M", d: "+66% YoY", c: "#ec4899" },
                        { l: "FY2026E Guidance", v: "$3.1–3.2B", d: "Revenue range", c: "#10b981" },
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
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Group Income Statement — Non-GAAP Actuals ($M)</div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                {["", ..."FY2022,FY2023,FY2024,FY2025".split(",")].map(h => (
                                    <th key={h} style={{ textAlign: h === "" ? "left" : "right", padding: "5px 6px", color: t2, fontWeight: 500, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {[
                                    { l: "Total Revenue", k: [2181, 2378, 2735, 2945], b: true },
                                    { l: "  Cloud Revenue", k: [1153, 1409, 2002, 2244] },
                                    { l: "  Services Revenue", k: [725, 695, 568, 530] },
                                    { l: "  Product Revenue", k: [303, 274, 165, 171] },
                                    { l: "Cloud % of Total", k: [0.53, 0.59, 0.73, 0.76], pct: true },
                                    { l: "", k: [null, null, null, null] },
                                    { l: "Gross Profit (Non-GAAP)", k: [1604, 1709, 1943, 2050], b: true },
                                    { l: "Gross Margin (Non-GAAP)", k: [0.735, 0.719, 0.710, 0.696], pct: true },
                                    { l: "Operating Income (Non-GAAP)", k: [626, 704, 850, 908], b: true, hl: true },
                                    { l: "Operating Margin (Non-GAAP)", k: [0.287, 0.296, 0.311, 0.308], pct: true },
                                    { l: "Net Income (Non-GAAP)", k: [536, 600, 728, 779], b: true },
                                    { l: "EPS (Non-GAAP, diluted)", k: [8.10, 9.05, 11.24, 12.46] },
                                    { l: "", k: [null, null, null, null] },
                                    { l: "GAAP Operating Income", k: [335, 435, 546, 646] },
                                    { l: "GAAP Net Income", k: [266, 338, 443, 612], b: true },
                                    { l: "GAAP EPS (diluted)", k: [4.02, 5.11, 6.76, 9.67] },
                                    { l: "", k: [null, null, null, null] },
                                    { l: "Cash Flow from Operations", k: [564, 563, 833, 717] },
                                    { l: "Net Cash & Investments", k: [null, null, 1163, 417] },
                                ].map((r, ri) => (
                                    <tr key={ri} style={{ borderBottom: `1px solid ${bdr}15`, background: r.hl ? "#6366f108" : "transparent" }}>
                                        <td style={{ padding: "3px 6px", fontWeight: r.b ? 700 : 400, fontSize: r.l.startsWith("  ") ? 10 : 11, color: r.l.startsWith("  ") ? t3 : t1 }}>{r.l}</td>
                                        {r.k.map((v, vi) => (
                                            <td key={vi} style={{ textAlign: "right", padding: "3px 6px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: r.b ? 600 : 400, color: v !== null && v < 0 ? "#ef4444" : t1 }}>
                                                {v === null ? "—" : r.pct ? fM(v) : typeof v === "number" && v < 20 ? v.toFixed(2) : typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>FY2025 reflects Cognigy acquisition (closed Sep 2025, $827M). All debt fully repaid Q3 2025. Source: NICE 20-F, Earnings Presentations, Press Releases.</div>
                </Box>

                {/* Segment performance */}
                <div style={{ display: "flex", gap: 10, flexDirection: isCompact ? "column" : "row" }}>
                    <Box style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Revenue by Segment ($M)</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ borderBottom: `1px solid ${bdr}` }}>
                                {["Segment", "FY2022", "FY2023", "FY2024", "FY2025"].map(h => (
                                    <th key={h} style={{ textAlign: h === "Segment" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 10 }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {["Customer Engagement", "Financial Crime & Compliance"].map((seg) => (
                                    <tr key={seg} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                        <td style={{ padding: "3px 5px", fontWeight: 600, color: seg.includes("Customer") ? "#8b5cf6" : "#22c55e" }}>{seg}</td>
                                        {[2022, 2023, 2024, 2025].map(y => {
                                            const s = a.segments[y]?.find(x => x.name === seg);
                                            return <td key={y} style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{s ? s.rev.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</td>;
                                        })}
                                    </tr>
                                ))}
                                <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                    <td style={{ padding: "4px 5px" }}>Total</td>
                                    {[2181, 2378, 2735, 2945].map((v, i) => (
                                        <td key={i} style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{v}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </Box>
                    <Box style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Revenue by Delivery Model ($M)</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ borderBottom: `1px solid ${bdr}` }}>
                                {["Model", "FY2022", "FY2023", "FY2024", "FY2025"].map(h => (
                                    <th key={h} style={{ textAlign: h === "Model" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 10 }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {[
                                    { l: "Cloud (SaaS)", c: "#8b5cf6", k: "cloud" },
                                    { l: "Services", c: "#f59e0b", k: "services" },
                                    { l: "Product (On-Prem)", c: "#64748b", k: "product" },
                                ].map(r => (
                                    <tr key={r.k} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                        <td style={{ padding: "3px 5px", fontWeight: 600, color: r.c }}>{r.l}</td>
                                        {[2022, 2023, 2024, 2025].map(y => (
                                            <td key={y} style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{a.revenueByModel[y][r.k]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                </div>

                {/* Key metrics */}
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Key Performance Metrics</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 10, color: t2 }}>
                        <span>Cloud ARR (Dec 2024): <b style={{ color: "#8b5cf6" }}>$2.1B</b></span>
                        <span>Cloud NRR: <b style={{ color: "#6366f1" }}>109%</b></span>
                        <span>AI ARR (Q4 2025): <b style={{ color: "#ec4899" }}>$328M</b></span>
                        <span>AI ARR Growth: <b style={{ color: "#22c55e" }}>+66% YoY</b></span>
                        <span>Customers: <b style={{ color: t1 }}>25,000+</b></span>
                        <span>Fortune 100: <b style={{ color: "#f59e0b" }}>85+</b></span>
                        <span>Recurring %: <b style={{ color: "#10b981" }}>~90%</b></span>
                        <span>Countries: <b style={{ color: "#0ea5e9" }}>150+</b></span>
                    </div>
                </Box>

                {/* Historical chart */}
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Revenue & Non-GAAP Operating Income — Actuals ($M)</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <ComposedChart data={[
                            { y: "FY22", rev: 2181, opInc: 626, gp: 1604 },
                            { y: "FY23", rev: 2378, opInc: 704, gp: 1709 },
                            { y: "FY24", rev: 2735, opInc: 850, gp: 1943 },
                            { y: "FY25", rev: 2945, opInc: 908, gp: 2050 },
                        ]} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                            <XAxis dataKey="y" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                            <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}M`]} />
                            <Bar dataKey="rev" fill="#6366f150" name="Revenue" radius={[2, 2, 0, 0]} />
                            <Line type="monotone" dataKey="gp" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Gross Profit (NG)" />
                            <Line type="monotone" dataKey="opInc" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Operating Income (NG)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Box>
            </>)}

            {/* ═══ TAB 0: PRODUCT DRIVERS ═══ */}
            {tab === 0 && (() => {
                const p = prods[sel], c = comp[sel];
                return (<div style={{ display: "flex", gap: 10, flexDirection: isCompact ? "column" : "row" }}>
                    <div style={{ width: isCompact ? "100%" : 175, flexShrink: 0 }}>
                        <Box style={{ padding: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: t2, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>9 Product Lines</div>
                            {CATS.map(cat => (
                                <div key={cat} style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 9, color: CAT_C[cat], fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, marginLeft: 2 }}>{cat}</div>
                                    {prods.map((pr, i) => pr.cat === cat && (
                                        <button key={pr.id} onClick={() => setSel(i)} style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", padding: "5px 7px", border: "none", borderRadius: 4, cursor: "pointer", marginBottom: 1, textAlign: "left", background: sel === i ? `${pr.color}20` : "transparent", borderLeft: sel === i ? `3px solid ${pr.color}` : "3px solid transparent", color: sel === i ? t1 : t2, fontSize: 10, transition: "all 0.12s" }}>
                                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: pr.color, flexShrink: 0 }} />
                                            <span style={{ fontWeight: sel === i ? 600 : 400 }}>{pr.name}</span>
                                        </button>
                                    ))}
                                </div>
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
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "stretch", marginTop: 8 }}>
                                <div style={{ flex: 1, minWidth: 250, marginRight: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {p.businessLineExplanation && (
                                        <div style={{ padding: "6px 10px", background: "#f8fafc08", borderLeft: `3px solid #10b981`, borderRadius: "0 4px 4px 0", fontSize: 10, color: t1, display: "inline-block", maxWidth: 420 }}>
                                            <span style={{ fontWeight: 600, color: "#10b981", marginRight: 4 }}>Business Line:</span>
                                            {p.businessLineExplanation}
                                        </div>
                                    )}
                                    {p.bcg && (
                                        <div style={{ padding: "6px 10px", background: "#f8fafc08", borderLeft: `3px solid #6366f1`, borderRadius: "0 4px 4px 0", fontSize: 10, color: t1, display: "inline-block", maxWidth: 400 }}>
                                            <span style={{ fontWeight: 600, color: "#6366f1", marginRight: 4 }}>Thesis:</span>
                                            {p.bcg}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexShrink: 0, flexWrap: isCompact ? "wrap" : "nowrap", width: isCompact ? "100%" : "auto" }}>
                                    <div style={{ padding: "6px 10px", background: "#f8fafc08", borderLeft: `3px solid ${t3}`, borderRadius: "0 4px 4px 0", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 90 }}>
                                        <div style={{ fontSize: 9, color: t2 }}>Model TAM</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: t2, marginTop: 2 }}>${c.tam.toLocaleString(undefined, { maximumFractionDigits: 0 })}M</div>
                                    </div>
                                    <div style={{ padding: "6px 10px", background: "#f8fafc08", borderLeft: `3px solid ${p.color}`, borderRadius: "0 4px 4px 0", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 100 }}>
                                        <div style={{ fontSize: 9, color: t2 }}>Model SOM</div>
                                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
                                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: p.color }}>${c.som.toLocaleString(undefined, { maximumFractionDigits: 0 })}M</span>
                                            <span style={{ fontSize: 10, color: c.cagr >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>CAGR {fP(c.cagr)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Box>

                        <div style={{ display: "flex", gap: 10, flexDirection: isCompact ? "column" : "row" }}>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#f59e0b" }}>Quantity Tree</div>
                                {p.quantity.map((q, qi) => (
                                    <div key={qi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{q.l}</div>
                                        <NI value={q.v} onChange={v => uQ(sel, qi, v)} step={q.v >= 1e6 ? 100000 : q.v >= 100 ? 5 : q.v >= 1 ? 0.1 : 0.005} w={q.v >= 1e6 ? 95 : 70} isPct={q.isPct} />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                                    <span>Billable units</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#f59e0b" }}>{c.u >= 1e6 ? `${(c.u / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M` : c.u >= 1e3 ? `${(c.u / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 })}K` : c.u.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            </Box>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#22c55e" }}>Price Tree</div>
                                {p.price.map((pr, pi) => (
                                    <div key={pi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{pr.l}</div>
                                        <NI value={pr.v} onChange={v => uP(sel, pi, v)} step={pr.v >= 50 ? 5 : 0.5} w={70} isPct={pr.isPct} />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                                    <span>Annual ARPU</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#22c55e" }}>${c.ar.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            </Box>
                        </div>

                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#6366f1" }}>CAGR Build</div>
                            <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: isCompact ? "6px 0" : "0 16px" }}>
                                {p.cagr.map((cv, ci) => (
                                    <div key={ci} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 4 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{cv.l}</div>
                                        <input type="range" min={-0.15} max={0.20} step={0.005} value={cv.v} onChange={e => uC(sel, ci, parseFloat(e.target.value))} style={{ width: 65, accentColor: cv.v >= 0 ? "#22c55e" : "#ef4444" }} />
                                        <span style={{ width: 42, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: cv.v >= 0 ? "#22c55e" : "#ef4444" }}>{(cv.v * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>Model CAGR</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {(c.cagr > 0.30 || c.cagr < -0.15) && <span style={{ fontSize: 9, color: "#f59e0b", padding: "2px 4px", background: "#f59e0b20", borderRadius: 4, fontWeight: 600 }}>⚠ Unrealistic</span>}
                                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>{fP(c.cagr)}</span>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 10, color: t2, flexWrap: "wrap" }}>
                                <span>Yr3: <b style={{ color: t1 }}>${(c.som * Math.pow(1 + c.cagr, 3)).toLocaleString(undefined, { maximumFractionDigits: 0 })}M</b></span>
                                <span>Yr5: <b style={{ color: t1 }}>${(c.som * Math.pow(1 + c.cagr, 5)).toLocaleString(undefined, { maximumFractionDigits: 0 })}M</b></span>
                                <span>Yr10: <b style={{ color: t1 }}>${(c.som * Math.pow(1 + c.cagr, 10)).toLocaleString(undefined, { maximumFractionDigits: 0 })}M</b></span>
                            </div>
                        </Box>

                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>SOM Projection</div>
                            <ResponsiveContainer width="100%" height={130}>
                                <AreaChart data={prodProj[sel]} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                    <defs><linearGradient id={`g${sel}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={p.color} stopOpacity={0.4} /><stop offset="95%" stopColor={p.color} stopOpacity={0.05} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                    <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}M`]} labelFormatter={l => `FY${l}E`} />
                                    <Area type="monotone" dataKey="som" stroke={p.color} strokeWidth={2.5} fill={`url(#g${sel})`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>

                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Disclosed Anchors</div>
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

            {/* ═══ TAB 1: PROJECTIONS ═══ */}
            {tab === 1 && (<>
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#f59e0b" }}>Projection Assumptions (applied to model SOM)</div>
                    <div style={{ display: "flex", gap: isCompact ? 12 : 20, flexWrap: "wrap" }}>
                        {[{ l: "Blended GP Margin (NG)", v: gpM, s: setGpM, mn: 0.55, mx: 0.80 }, { l: "OpEx % Revenue", v: opxR, s: setOpxR, mn: 0.30, mx: 0.50 }, { l: "Tax Rate", v: taxR, s: setTaxR, mn: 0.15, mx: 0.30 }, { l: "Central/Corp Costs ($M)", v: centralCost, s: setCentralCost, mn: 20, mx: 80, abs: true }].map(x => (
                            <div key={x.l} style={{ flex: 1, minWidth: 120 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t2, marginBottom: 2 }}>
                                    <span>{x.l}</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#fbbf24" }}>{x.abs ? `$${x.v}M` : fM(x.v)}</span>
                                </div>
                                <input type="range" min={x.mn} max={x.mx} step={x.abs ? 1 : 0.005} value={x.v} onChange={e => x.s(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#6366f1" }} />
                            </div>
                        ))}
                    </div>
                </Box>

                <Box>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Actuals + Modelled Revenue by Product ($M)</span>
                        <span style={{ fontSize: 10, color: t2 }}>FY22–25 actual bars · FY25E–35E driver-tree projection</span>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={actualPlusModelledData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                            <XAxis dataKey="year" tick={{ fill: t2, fontSize: 9 }} tickLine={false} />
                            <YAxis tick={{ fill: t2, fontSize: 10 }} tickFormatter={formatAxisRevenue} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                formatter={(value, name) => (value === null || value === undefined ? null : [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}M`, name])}
                                labelFormatter={label => label}
                            />
                            <Bar dataKey="actual" fill="#ffffff30" name="Actual Revenue" radius={[2, 2, 0, 0]} />
                            {prods.map(p => <Area key={p.id} type="monotone" dataKey={p.id} stackId="1" fill={p.color} stroke={p.color} fillOpacity={0.7} name={p.name} />)}
                            <ReferenceLine x={fyLabel(2030, true)} stroke="#ffffff20" strokeDasharray="4 4" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Box>

                {/* Model summary table */}
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Product SOM Summary — Model</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                        <thead><tr style={{ borderBottom: `2px solid ${bdr}` }}>
                            {["Product", "SOM $M (FY25-cal)", "CAGR", "FY28E", "FY30E", "FY35E", "Category"].map(h => (
                                <th key={h} style={{ textAlign: h === "Product" || h === "Category" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 9 }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {prods.map((p, i) => {
                                const c = comp[i];
                                const baseSom = calibratedBaseSom[i];
                                return (
                                    <tr key={p.id} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                        <td style={{ padding: "3px 5px" }}><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 2, background: p.color, marginRight: 4, verticalAlign: "middle" }} />{p.name}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{baseSom.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>{fP(c.cagr)}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(baseSom * Math.pow(1 + c.cagr, 3)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(baseSom * Math.pow(1 + c.cagr, 5)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(baseSom * Math.pow(1 + c.cagr, 10)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td style={{ padding: "3px 5px", color: CAT_C[p.cat], fontSize: 9 }}>{p.cat}</td>
                                    </tr>);
                            })}
                            <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                <td style={{ padding: "4px 5px" }}>Total Calibrated SOM</td>
                                <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{totalCalibratedSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td />
                                <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c, i) => s + calibratedBaseSom[i] * Math.pow(1 + c.cagr, 3), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c, i) => s + calibratedBaseSom[i] * Math.pow(1 + c.cagr, 5), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c, i) => s + calibratedBaseSom[i] * Math.pow(1 + c.cagr, 10), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                <td />
                            </tr>
                        </tbody>
                    </table>
                    <div style={{ fontSize: 10, color: t2, marginTop: 6, display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span>FY2025 Actual Revenue: <b style={{ color: "#f59e0b" }}>${fy2025ActualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}M</b></span>
                        <span>Raw Model SOM (base year): <b style={{ color: "#6366f1" }}>${totalModelSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}M</b></span>
                        <span>Calibration ratio: <b style={{ color: t1 }}>{formatCalibrationRatio(calibrationRatio)}</b></span>
                        <span>Calibrated SOM (base year): <b style={{ color: "#22c55e" }}>${totalCalibratedSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}M</b></span>
                    </div>
                </Box>

                {/* Projected P&L */}
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Modelled P&L — Projected ($M)</div>
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
                                        {PROJ_YEARS.map(y => <td key={y} style={{ textAlign: "right", padding: "2px 3px", fontSize: 10 }}>{(calibratedBaseSom[i] * Math.pow(1 + comp[i].cagr, y - 2025)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>)}
                                    </tr>
                                ))}
                                {[
                                    { k: "rev", l: "Total Revenue", b: true, sep: true },
                                    { k: "gp", l: "Gross Profit" },
                                    { k: "ngOpInc", l: "Operating Income (NG)", b: true, hl: true },
                                    { k: "pbt", l: "PBT" },
                                    { k: "ni", l: "Net Income", b: true },
                                ].map((r, ri) => {
                                    const getVal = (y) => {
                                        let tot = 0; comp.forEach((c, i) => { tot += calibratedBaseSom[i] * Math.pow(1 + c.cagr, y - 2025); });
                                        const gp = tot * gpM; const opInc = gp - tot * opxR - centralCost; const pbt2 = opInc;
                                        return { rev: tot, gp, ngOpInc: opInc, pbt: pbt2, ni: pbt2 - Math.max(0, pbt2 * taxR) }[r.k];
                                    };
                                    return (
                                        <tr key={ri} style={{ borderTop: r.sep ? `2px solid ${bdr}` : `1px solid ${bdr}15`, background: r.hl ? "#6366f108" : "transparent" }}>
                                            <td style={{ padding: "3px 5px", fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: r.b ? 700 : 400, fontSize: 11 }}>{r.l}</td>
                                            {PROJ_YEARS.map(y => { const v = getVal(y); return (<td key={y} style={{ textAlign: "right", padding: "3px 3px", fontWeight: r.b ? 600 : 400, color: v < 0 ? "#ef4444" : t1 }}>{v.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>); })}
                                        </tr>);
                                })}
                            </tbody>
                        </table>
                    </div>
                </Box>

                {/* CAGR summary */}
                <div style={{ display: "flex", gap: 10, flexDirection: isCompact ? "column" : "row" }}>
                    {[{ l: "3-Year (→FY2028)", n: 3 }, { l: "5-Year (→FY2030)", n: 5 }, { l: "10-Year (→FY2035)", n: 10 }].map(h => {
                        const revBase = totalCalibratedSOM; const revEnd = comp.reduce((s, c, i) => s + calibratedBaseSom[i] * Math.pow(1 + c.cagr, h.n), 0);
                        const rc = cagr(revBase, revEnd, h.n);
                        const getOpInc = (y) => { let tot = 0; comp.forEach((c, i) => { tot += calibratedBaseSom[i] * Math.pow(1 + c.cagr, y - 2025); }); return tot * gpM - tot * opxR - centralCost; };
                        const ob = getOpInc(2025); const oe = getOpInc(2025 + h.n); const oc = cagr(ob, oe, h.n);
                        return (<Box key={h.l} style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#6366f1" }}>{h.l}</div>
                            {[{ l: "Revenue CAGR", v: fP(rc), c: rc >= 0 ? "#22c55e" : "#ef4444" }, { l: "OpInc CAGR", v: fP(oc), c: oc >= 0 ? "#22c55e" : "#ef4444" }, { l: `FY${2025 + h.n}E Revenue`, v: `$${revEnd.toLocaleString(undefined, { maximumFractionDigits: 0 })}M`, c: t1 }, { l: `FY${2025 + h.n}E OpInc`, v: `$${oe.toLocaleString(undefined, { maximumFractionDigits: 0 })}M`, c: t1 }].map(x => (
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
                    Actuals: NICE 20-F Annual Reports (FY2022–FY2024), FY2025 Earnings Release (Feb 2026), Quarterly Earnings Presentations. Revenue by segment: Customer Engagement (~84%) and Financial Crime & Compliance (~16%). Revenue by model: Cloud, Services, Product. FY2025 includes Cognigy acquisition (closed Sep 2025, $827M). Product driver trees are model-generated using editable assumptions — not validated TAM estimates or company guidance. FY2026E consensus: Revenue $3.1–3.2B, Non-GAAP EPS $10.85–$11.05. Not investment advice. Not for distribution.
                </div>
            </div>
        </div>
    );
}
