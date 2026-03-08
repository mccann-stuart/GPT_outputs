import { useState, useMemo, useCallback, useEffect } from "react";
import {
    AreaChart, Area,
    ComposedChart, Bar, Line,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from "recharts";

import {
    META,
    ACTUALS,
    PRODUCTS,
    CATS,
    CAT_C,
    PROJ_YEARS,
    fN,
    fP,
    fM,
    calcTAM,
    calcCAGR,
    DEFAULT_SETTINGS as LOGIC_DEFAULT_SETTINGS,
    resolveInitialSettings
} from "./nice-model-logic.mjs";

export const DEFAULT_SETTINGS = LOGIC_DEFAULT_SETTINGS;

const bg = "#080e1a", crd = "#0f172a", bdr = "#1e293b", t1 = "#e2e8f0", t2 = "#94a3b8", t3 = "#64748b";

const Box = ({ children, style }) => (
    <div style={{ background: crd, borderRadius: 8, border: `1px solid ${bdr}`, padding: 14, marginBottom: 10, ...style }}>
        {children}
    </div>
);

const NI = ({ value, onChange, step, w }) => (
    <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step || 1}
        style={{
            width: w || 90,
            padding: "3px 6px",
            fontSize: 11,
            fontFamily: "'JetBrains Mono',monospace",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 4,
            color: "#fbbf24",
            textAlign: "right",
            outline: "none"
        }}
    />
);

const TABS = ["Market Model, by Product Line", "Projections", "Actuals & KPIs"];

export default function NiceModel({ initialSettings = DEFAULT_SETTINGS, onSettingsChange }) {
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
        const update = () => setIsCompact(window.innerWidth <= 900);
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => {
        if (typeof onSettingsChange === "function") {
            onSettingsChange({ prods, gpM, opxR, taxR, centralCost });
        }
    }, [prods, gpM, opxR, taxR, centralCost, onSettingsChange]);

    const uQ = useCallback((pi, qi, v) => setProds(p => {
        const n = [...p];
        const x = { ...n[pi], quantity: [...n[pi].quantity] };
        x.quantity[qi] = { ...x.quantity[qi], v };
        n[pi] = x;
        return n;
    }), []);

    const uP = useCallback((pi, qi, v) => setProds(p => {
        const n = [...p];
        const x = { ...n[pi], price: [...n[pi].price] };
        x.price[qi] = { ...x.price[qi], v };
        n[pi] = x;
        return n;
    }), []);

    const uC = useCallback((pi, ci, v) => setProds(p => {
        const n = [...p];
        const x = { ...n[pi], cagr: [...n[pi].cagr] };
        x.cagr[ci] = { ...x.cagr[ci], v };
        n[pi] = x;
        return n;
    }), []);

    const comp = useMemo(
        () => prods.map(p => ({ ...calcTAM(p), cagr: calcCAGR(p) })),
        [prods]
    );

    const totalModelSOM = comp.reduce((s, c) => s + c.som, 0);
    const fy25 = ACTUALS.group.find(x => x.year === META.baseYear);

    const stackData = useMemo(() => {
        return PROJ_YEARS.map(y => {
            const row = { year: y };
            let tot = 0;
            prods.forEach((p, i) => {
                const t = y - META.baseYear;
                const r = comp[i].som * Math.pow(1 + comp[i].cagr, t);
                row[p.id] = r;
                tot += r;
            });
            row.total = tot;
            return row;
        });
    }, [prods, comp]);

    const p = prods[sel];
    const c = comp[sel];

    return (
        <div style={{
            background: bg, color: t1, fontFamily: "'IBM Plex Sans',system-ui,sans-serif",
            minHeight: "100vh", padding: isCompact ? "8px" : "10px 12px", fontSize: 13, overflowX: "hidden"
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${bdr}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff" }}>
                    N
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{META.company} — Market Model</h1>
                    <div style={{ fontSize: 10, color: t2 }}>
                        FY2023–FY2025 actuals · 9-line driver tree TAM/SOM · {META.exchange}:{META.ticker}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, marginBottom: 12, background: "#060a14", borderRadius: 6, padding: 3, overflowX: isCompact ? "auto" : "visible" }}>
                {TABS.map((t, i) => (
                    <button
                        key={t}
                        onClick={() => setTab(i)}
                        style={{
                            flex: 1, padding: "6px 8px", border: "none", borderRadius: 5, cursor: "pointer",
                            fontSize: 11, fontWeight: tab === i ? 600 : 400,
                            background: tab === i ? "#3b82f6" : "transparent",
                            color: tab === i ? "#fff" : t2
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* TAB 0: PRODUCT DRIVERS */}
            {tab === 0 && (
                <div style={{ display: "flex", gap: 10, flexDirection: isCompact ? "column" : "row" }}>
                    {/* Left nav */}
                    <div style={{ width: isCompact ? "100%" : 210, flexShrink: 0 }}>
                        <Box style={{ padding: 10 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: t2, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                                Product Lines (9)
                            </div>
                            {CATS.map(cat => (
                                <div key={cat} style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 9, color: CAT_C[cat], fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 }}>
                                        {cat}
                                    </div>
                                    {prods.map((pr, i) => pr.cat === cat && (
                                        <button
                                            key={pr.id}
                                            onClick={() => setSel(i)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: 6, width: "100%",
                                                padding: "6px 8px", border: "none", borderRadius: 5, cursor: "pointer",
                                                marginBottom: 3, textAlign: "left",
                                                background: sel === i ? `${pr.color}20` : "transparent",
                                                borderLeft: sel === i ? `3px solid ${pr.color}` : "3px solid transparent",
                                                color: sel === i ? t1 : t2,
                                                fontSize: 10
                                            }}
                                        >
                                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: pr.color }} />
                                            <span style={{ fontWeight: sel === i ? 600 : 400 }}>{pr.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </Box>

                        <Box style={{ padding: 10 }}>
                            <div style={{ fontSize: 10, color: t2, marginBottom: 6 }}>Model calibration</div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                <span style={{ color: t2 }}>FY{META.baseYear} actual revenue</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{fy25 ? `$${fy25.rev.toFixed(0)}m` : "—"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
                                <span style={{ color: t2 }}>Model SOM (sum)</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#3b82f6" }}>${totalModelSOM.toFixed(0)}m</span>
                            </div>
                            <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>
                                Default driver trees are tuned so total SOM ≈ FY{META.baseYear} revenue.
                            </div>
                        </Box>
                    </div>

                    {/* Main panel */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Box style={{ borderTop: `3px solid ${p.color}` }}>
                            <div style={{ fontSize: 9, color: CAT_C[p.cat], fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                                {p.cat}
                            </div>
                            <h2 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: p.color }}>{p.name}</h2>
                            <div style={{ fontSize: 9, color: t3, fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>{p.eq}</div>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                                <div style={{ flex: 1, minWidth: 240 }}>
                                    {p.businessLineExplanation && (
                                        <div style={{ padding: "8px 10px", background: "#f8fafc08", borderLeft: `3px solid ${p.color}`, borderRadius: "0 6px 6px 0", fontSize: 10 }}>
                                            <span style={{ fontWeight: 700, color: p.color }}>Business line:</span>{" "}
                                            <span style={{ color: t1 }}>{p.businessLineExplanation}</span>
                                        </div>
                                    )}
                                    {p.bcg && (
                                        <div style={{ padding: "8px 10px", background: "#f8fafc08", borderLeft: `3px solid #10b981`, borderRadius: "0 6px 6px 0", fontSize: 10, marginTop: 8 }}>
                                            <span style={{ fontWeight: 700, color: "#10b981" }}>Hypothesis:</span>{" "}
                                            <span style={{ color: t1 }}>{p.bcg}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <div style={{ padding: "8px 10px", background: "#f8fafc08", borderLeft: `3px solid ${t3}`, borderRadius: "0 6px 6px 0", minWidth: 140 }}>
                                        <div style={{ fontSize: 9, color: t2 }}>Model TAM</div>
                                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: t2, marginTop: 2 }}>
                                            ${c.tam.toFixed(0)}m
                                        </div>
                                    </div>
                                    <div style={{ padding: "8px 10px", background: "#f8fafc08", borderLeft: `3px solid ${p.color}`, borderRadius: "0 6px 6px 0", minWidth: 160 }}>
                                        <div style={{ fontSize: 9, color: t2 }}>Model SOM</div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: 2 }}>
                                            <span style={{ fontSize: 16, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: p.color }}>
                                                ${c.som.toFixed(0)}m
                                            </span>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>
                                                CAGR {fP(c.cagr)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Box>

                        <div style={{ display: "flex", gap: 10, flexDirection: isCompact ? "column" : "row" }}>
                            {/* Quantity */}
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: "#f59e0b" }}>Quantity Tree</div>
                                {p.quantity.map((q, qi) => (
                                    <div key={qi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5, color: t1 }}>{q.l}</div>
                                        <NI
                                            value={q.v}
                                            onChange={v => uQ(sel, qi, v)}
                                            step={q.v >= 1e6 ? 100000 : q.v >= 1000 ? 100 : q.v >= 10 ? 1 : q.v >= 1 ? 0.01 : 0.005}
                                            w={q.v >= 1e6 ? 110 : 90}
                                        />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                                    <span>Billable units</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#f59e0b" }}>{fN(c.u / 1e6)}</span>
                                </div>
                            </Box>

                            {/* Price */}
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: "#22c55e" }}>Price Tree</div>
                                {p.price.map((pr, pi) => (
                                    <div key={pi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5, color: t1 }}>{pr.l}</div>
                                        <NI
                                            value={pr.v}
                                            onChange={v => uP(sel, pi, v)}
                                            step={pr.v >= 10000 ? 500 : pr.v >= 500 ? 25 : pr.v >= 50 ? 5 : 1}
                                            w={100}
                                        />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                                    <span>Annual ARPU / ACV</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#22c55e" }}>${c.ar.toFixed(0)}</span>
                                </div>
                            </Box>
                        </div>

                        {/* CAGR */}
                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: "#3b82f6" }}>CAGR Build</div>
                            <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: isCompact ? "8px 0" : "0 14px" }}>
                                {p.cagr.map((cv, ci) => (
                                    <div key={ci} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{cv.l}</div>
                                        <input
                                            type="range"
                                            min={-0.1}
                                            max={0.2}
                                            step={0.005}
                                            value={cv.v}
                                            onChange={e => uC(sel, ci, parseFloat(e.target.value))}
                                            style={{ width: 80 }}
                                        />
                                        <span style={{ width: 52, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: cv.v >= 0 ? "#22c55e" : "#ef4444" }}>
                                            {(cv.v * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 800 }}>Model CAGR</span>
                                <span style={{ fontSize: 15, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>
                                    {fP(c.cagr)}
                                </span>
                            </div>
                        </Box>

                        {/* SOM projection chart */}
                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>SOM Projection (selected line)</div>
                            <ResponsiveContainer width="100%" height={140}>
                                <AreaChart
                                    data={PROJ_YEARS.map(y => ({
                                        year: y,
                                        som: c.som * Math.pow(1 + c.cagr, y - META.baseYear),
                                    }))}
                                    margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                    <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                        formatter={v => [`$${Number(v).toFixed(0)}m`]}
                                        labelFormatter={l => `FY${l}E`}
                                    />
                                    <Area type="monotone" dataKey="som" stroke={p.color} strokeWidth={2.5} fill={`${p.color}33`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>

                        {/* Anchors */}
                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Anchors</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {p.anchors.map((an, ai) => (
                                    <div key={ai} style={{ background: "#1a2744", borderRadius: 6, padding: "7px 10px", flex: "1 1 160px" }}>
                                        <div style={{ fontSize: 9, color: t2 }}>{an.m}</div>
                                        <div style={{ fontSize: 13, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: "#fbbf24" }}>{an.v}</div>
                                    </div>
                                ))}
                            </div>
                        </Box>
                    </div>
                </div>
            )}

            {/* TAB 1: PROJECTIONS */}
            {tab === 1 && (
                <>
                    <Box>
                        <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 8 }}>Projection Assumptions</div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            {[
                                { l: "Blended Gross Margin", v: gpM, s: setGpM, mn: 0.55, mx: 0.80, fmt: fM },
                                { l: "OpEx % Revenue", v: opxR, s: setOpxR, mn: 0.20, mx: 0.55, fmt: fM },
                                { l: "Tax Rate", v: taxR, s: setTaxR, mn: 0.05, mx: 0.25, fmt: fM },
                                { l: "Central Costs ($m)", v: centralCost, s: setCentralCost, mn: 0, mx: 200, abs: true },
                            ].map(x => (
                                <div key={x.l} style={{ flex: 1, minWidth: 160 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t2, marginBottom: 3 }}>
                                        <span>{x.l}</span>
                                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#fbbf24" }}>
                                            {x.abs ? `$${x.v.toFixed(0)}m` : x.fmt(x.v)}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={x.mn}
                                        max={x.mx}
                                        step={x.abs ? 1 : 0.005}
                                        value={x.v}
                                        onChange={e => x.s(parseFloat(e.target.value))}
                                        style={{ width: "100%" }}
                                    />
                                </div>
                            ))}
                        </div>
                    </Box>

                    <Box>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 800 }}>Modelled Revenue by Product ($m)</span>
                            <span style={{ fontSize: 10, color: t2 }}>FY{META.baseYear} base · FY{META.baseYear + 1}E–FY{META.baseYear + 10}E projections</span>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <ComposedChart data={stackData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                    formatter={v => [`$${Number(v).toFixed(0)}m`]}
                                    labelFormatter={l => `FY${l}E`}
                                />
                                {prods.map(p => (
                                    <Area key={p.id} type="monotone" dataKey={p.id} stackId="1" fill={p.color} stroke={p.color} fillOpacity={0.65} name={p.name} />
                                ))}
                                <Line type="monotone" dataKey="total" stroke="#ffffff" strokeWidth={2} dot={false} name="Total" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>
                </>
            )}

            {/* TAB 2: ACTUALS */}
            {tab === 2 && (
                <>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        {[
                            { l: "FY2025 Revenue", v: "$2,945m", c: "#3b82f6" },
                            { l: "FY2025 Cloud Revenue", v: "$2,238m", c: "#8b5cf6" },
                            { l: "FY2025 Non‑GAAP Op Income", v: "$908m", c: "#f59e0b" },
                            { l: "FY2025 Non‑GAAP EPS", v: "$12.30", c: "#22c55e" },
                            { l: "AI & Self‑Service ARR", v: "$328m", c: "#7c3aed" },
                            { l: "RPO (Dec 2025)", v: "$3,674m", c: "#06b6d4" },
                        ].map((k, i) => (
                            <Box key={i} style={{ flex: 1, minWidth: 150, borderTop: `3px solid ${k.c}`, textAlign: "center", padding: 10 }}>
                                <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 0.8 }}>{k.l}</div>
                                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: k.c, margin: "3px 0" }}>{k.v}</div>
                            </Box>
                        ))}
                    </div>

                    <Box>
                        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Income Statement (GAAP, $m)</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                        {["", "FY2023", "FY2024", "FY2025"].map(h => (
                                            <th key={h} style={{ textAlign: h === "" ? "left" : "right", padding: "6px 6px", color: t2, fontWeight: 600, fontSize: 10, whiteSpace: "nowrap" }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { l: "Total revenue", k: ["rev"] },
                                        { l: "  Cloud revenue", k: ["cloudRev"], indent: true },
                                        { l: "  Services revenue", k: ["servicesRev"], indent: true },
                                        { l: "  Product revenue", k: ["productRev"], indent: true },
                                        { l: "Cost of revenue", k: ["cogs"], neg: true },
                                        { l: "Gross profit", k: ["gp"], b: true },
                                        { l: "Gross margin", k: ["gpM"], pct: true },
                                        { l: "Operating income", k: ["opInc"], b: true },
                                        { l: "Operating margin", k: ["opM"], pct: true },
                                        { l: "Net income", k: ["pat"], b: true },
                                        { l: "Diluted EPS", k: ["eps"] },
                                        { l: "Operating cash flow", k: ["cashGenOps"] },
                                    ].map((r, ri) => (
                                        <tr key={ri} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                            <td style={{ padding: "4px 6px", fontWeight: r.b ? 800 : 500, color: r.indent ? t3 : t1, fontSize: r.indent ? 10 : 11 }}>
                                                {r.l}
                                            </td>
                                            {ACTUALS.group.map((a, i) => {
                                                const key = r.k[0];
                                                const v = a[key];
                                                return (
                                                    <td key={i} style={{ textAlign: "right", padding: "4px 6px", fontFamily: "'JetBrains Mono',monospace", color: r.neg ? t2 : t1 }}>
                                                        {v === null || v === undefined ? "—" : r.pct ? fM(v) : Number(v).toFixed(key === "eps" ? 2 : 0)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>
                            Non‑GAAP highlights (FY2025): Op income $908m, EPS $12.30; AI & Self‑Service ARR $328m; RPO $3.7bn (see earnings deck).
                        </div>
                    </Box>

                    <Box>
                        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Segment Revenue (GAAP, $m)</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <ComposedChart
                                data={[
                                    { y: "FY23", ce: 1974, fc: 403, total: 2378 },
                                    { y: "FY24", ce: 2282, fc: 453, total: 2735 },
                                    { y: "FY25", ce: 2460, fc: 485, total: 2945 },
                                ]}
                                margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="y" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                    formatter={v => [`$${Number(v).toFixed(0)}m`]}
                                />
                                <Bar dataKey="total" fill="#ffffff25" name="Total" />
                                <Line type="monotone" dataKey="ce" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Customer Engagement" />
                                <Line type="monotone" dataKey="fc" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Financial Crime & Compliance" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>
                </>
            )}

            <div style={{ marginTop: 10, padding: "8px 10px", background: "#0a0e18", border: `1px solid ${bdr}`, borderRadius: 6 }}>
                <div style={{ fontSize: 8, color: "#f59e0b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    Disclaimer
                </div>
                <div style={{ fontSize: 9, color: t3, lineHeight: 1.5 }}>
                    Driver-tree TAM/SOM model is illustrative and uses editable assumptions; not validated market sizing or investment advice.
                </div>
            </div>
        </div>
    );
}