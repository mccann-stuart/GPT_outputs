import { useState, useMemo, useCallback, useEffect } from "react";
import {
    AreaChart, Area,
    ComposedChart, Bar, Line,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from "recharts";

import {
    ACTUALS,
    PRODUCTS,
    CATS,
    CAT_C,
    PROJ_YEARS,
    fP,
    fM,
    calcTAM,
    calcCAGR,
    DEFAULT_SETTINGS as LOGIC_DEFAULT_SETTINGS,
    resolveInitialSettings
} from "./nicelogic.mjs";

export const DEFAULT_SETTINGS = LOGIC_DEFAULT_SETTINGS;

const BASE_YEAR = 2025;
const bg = "#080e1a", crd = "#0f172a", bdr = "#1e293b", t1 = "#e2e8f0", t2 = "#94a3b8", t3 = "#64748b";

const Box = ({ children, style }) => (
    <div style={{ background: crd, borderRadius: 8, border: `1px solid ${bdr}`, padding: 14, marginBottom: 10, ...style }}>
        {children}
    </div>
);

const NI = ({ value, onChange, step, w, isPct }) => (
    <div style={{ position: "relative", width: w || 90 }}>
        <input
            type="number"
            value={isPct ? +(value * 100).toFixed(2) : value}
            onChange={e => {
                const next = parseFloat(e.target.value);
                if (Number.isNaN(next)) {
                    onChange(0);
                    return;
                }
                onChange(isPct ? next / 100 : next);
            }}
            step={step || (isPct ? 0.5 : 1)}
            style={{
                boxSizing: "border-box",
                width: "100%",
                padding: isPct ? "3px 15px 3px 6px" : "3px 6px",
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
        {isPct && (
            <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: "#fbbf24", fontSize: 11, pointerEvents: "none" }}>
                %
            </span>
        )}
    </div>
);

const TABS = ["Market Model, by Product Line", "Projections + P&L", "Actuals & KPIs"];

const fyLabel = (year, isEstimate = false) => `FY${String(year).slice(-2)}${isEstimate ? "E" : ""}`;

const formatAxisRevenue = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(1)}B` : `${Math.round(n).toLocaleString()}`;
};

const formatCalibrationRatio = ratio => {
    if (!Number.isFinite(ratio)) return "n/a";
    if (ratio === 0) return "0x";
    const absRatio = Math.abs(ratio);
    if (absRatio < 0.01) return `${ratio.toFixed(4)}x`;
    if (absRatio < 0.1) return `${ratio.toFixed(3)}x`;
    return `${ratio.toFixed(2)}x`;
};

const formatUnits = units => {
    if (!Number.isFinite(units)) return "—";
    if (units >= 1e6) return `${(units / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
    if (units >= 1e3) return `${(units / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 })}K`;
    return units.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

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

    const uQ = useCallback((pi, qi, v) => setProds(prev => {
        const next = [...prev];
        const prod = { ...next[pi], quantity: [...next[pi].quantity] };
        prod.quantity[qi] = { ...prod.quantity[qi], v };
        next[pi] = prod;
        return next;
    }), []);

    const uP = useCallback((pi, qi, v) => setProds(prev => {
        const next = [...prev];
        const prod = { ...next[pi], price: [...next[pi].price] };
        prod.price[qi] = { ...prod.price[qi], v };
        next[pi] = prod;
        return next;
    }), []);

    const uC = useCallback((pi, ci, v) => setProds(prev => {
        const next = [...prev];
        const prod = { ...next[pi], cagr: [...next[pi].cagr] };
        prod.cagr[ci] = { ...prod.cagr[ci], v };
        next[pi] = prod;
        return next;
    }), []);

    const comp = useMemo(
        () => prods.map(p => ({ ...calcTAM(p), cagr: calcCAGR(p) })),
        [prods]
    );

    const totalModelSOM = useMemo(
        () => comp.reduce((sum, row) => sum + row.som, 0),
        [comp]
    );

    const fy2025ActualRevenue = useMemo(() => {
        const fy = ACTUALS.group.find(x => x.year === BASE_YEAR);
        return fy?.ngRev ?? fy?.rev ?? 0;
    }, []);

    const calibrationRatio = totalModelSOM > 0 ? fy2025ActualRevenue / totalModelSOM : 1;

    const calibratedBaseSom = useMemo(
        () => comp.map(row => row.som * calibrationRatio),
        [comp, calibrationRatio]
    );

    const totalCalibratedSOM = useMemo(
        () => calibratedBaseSom.reduce((sum, v) => sum + v, 0),
        [calibratedBaseSom]
    );

    const prodProj = useMemo(
        () => prods.map((_, i) => PROJ_YEARS.map(year => ({
            year,
            som: calibratedBaseSom[i] * Math.pow(1 + comp[i].cagr, year - BASE_YEAR)
        }))),
        [prods, comp, calibratedBaseSom]
    );

    const stackData = useMemo(() => {
        return PROJ_YEARS.map(year => {
            const row = { year };
            let total = 0;
            prods.forEach((product, i) => {
                const rev = calibratedBaseSom[i] * Math.pow(1 + comp[i].cagr, year - BASE_YEAR);
                row[product.id] = rev;
                total += rev;
            });
            row.total = total;
            return row;
        });
    }, [prods, comp, calibratedBaseSom]);

    const actualPlusModelledData = useMemo(() => ([
        ...ACTUALS.group.map(row => ({ year: fyLabel(row.year), actual: row.ngRev ?? row.rev })),
        ...stackData.map(row => ({ year: fyLabel(row.year, true), ...row, modelled: row.total }))
    ]), [stackData]);

    const projectedPLRows = useMemo(() => {
        return PROJ_YEARS.map(year => {
            const rev = comp.reduce((sum, row, i) => {
                const productRevenue = calibratedBaseSom[i] * Math.pow(1 + row.cagr, year - BASE_YEAR);
                return sum + productRevenue;
            }, 0);
            const gp = rev * gpM;
            const opInc = gp - (rev * opxR) - centralCost;
            const pbt = opInc;
            const tax = Math.max(0, pbt * taxR);
            const ni = pbt - tax;
            return { year, rev, gp, opInc, pbt, ni };
        });
    }, [comp, calibratedBaseSom, gpM, opxR, taxR, centralCost]);

    const productSummaryRows = useMemo(() => {
        return prods.map((product, i) => {
            const baseSom = calibratedBaseSom[i];
            const growth = comp[i].cagr;
            return {
                id: product.id,
                name: product.name,
                cat: product.cat,
                color: product.color,
                baseSom,
                cagr: growth,
                fy28: baseSom * Math.pow(1 + growth, 3),
                fy30: baseSom * Math.pow(1 + growth, 5),
                fy35: baseSom * Math.pow(1 + growth, 10)
            };
        });
    }, [prods, comp, calibratedBaseSom]);

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
                    <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>NICE Ltd — Market Model</h1>
                    <div style={{ fontSize: 10, color: t2 }}>
                        FY2022–FY2025 actuals · 9-line driver tree TAM/SOM · NASDAQ:NICE
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
                                Product Lines ({prods.length})
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
                                <span style={{ color: t2 }}>FY{BASE_YEAR} actual revenue</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>${fy2025ActualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}m</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
                                <span style={{ color: t2 }}>Raw model SOM</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#3b82f6" }}>${totalModelSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}m</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
                                <span style={{ color: t2 }}>Calibration ratio</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#fbbf24" }}>{formatCalibrationRatio(calibrationRatio)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
                                <span style={{ color: t2 }}>Calibrated SOM</span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#22c55e" }}>${totalCalibratedSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}m</span>
                            </div>
                            <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>
                                Calibration anchors projected product SOM to FY{BASE_YEAR} actual revenue.
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
                                            ${c.tam.toLocaleString(undefined, { maximumFractionDigits: 0 })}m
                                        </div>
                                    </div>
                                    <div style={{ padding: "8px 10px", background: "#f8fafc08", borderLeft: `3px solid ${p.color}`, borderRadius: "0 6px 6px 0", minWidth: 180 }}>
                                        <div style={{ fontSize: 9, color: t2 }}>Model SOM (raw / calibrated)</div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: 2 }}>
                                            <span style={{ fontSize: 15, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: p.color }}>
                                                ${c.som.toLocaleString(undefined, { maximumFractionDigits: 0 })}m
                                            </span>
                                            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#22c55e" }}>
                                                ${calibratedBaseSom[sel].toLocaleString(undefined, { maximumFractionDigits: 0 })}m
                                            </span>
                                        </div>
                                        <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>
                                            CAGR {fP(c.cagr)}
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
                                            isPct={Boolean(q.isPct)}
                                            onChange={v => uQ(sel, qi, v)}
                                            step={q.isPct ? 0.5 : (q.v >= 1e6 ? 100000 : q.v >= 1000 ? 100 : q.v >= 10 ? 1 : q.v >= 1 ? 0.01 : 0.005)}
                                            w={q.v >= 1e6 ? 110 : 90}
                                        />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                                    <span>Billable units</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#f59e0b" }}>{formatUnits(c.u)}</span>
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
                                            isPct={Boolean(pr.isPct)}
                                            onChange={v => uP(sel, pi, v)}
                                            step={pr.v >= 10000 ? 500 : pr.v >= 500 ? 25 : pr.v >= 50 ? 5 : 1}
                                            w={100}
                                        />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                                    <span>Annual ARPU / ACV</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#22c55e" }}>${c.ar.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                                            min={-0.15}
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
                                <AreaChart data={prodProj[sel]} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                    <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                        formatter={v => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}m`]}
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
                                { l: "Blended Gross Margin", v: gpM, s: setGpM, mn: 0.55, mx: 0.8, fmt: fM },
                                { l: "OpEx % Revenue", v: opxR, s: setOpxR, mn: 0.2, mx: 0.55, fmt: fM },
                                { l: "Tax Rate", v: taxR, s: setTaxR, mn: 0.05, mx: 0.3, fmt: fM },
                                { l: "Central Costs ($m)", v: centralCost, s: setCentralCost, mn: 0, mx: 200, abs: true }
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
                            <span style={{ fontSize: 11, fontWeight: 800 }}>Actual + Modelled Revenue by Product ($m)</span>
                            <span style={{ fontSize: 10, color: t2 }}>FY22–FY25 actuals · FY25E–FY35E calibrated projections</span>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <ComposedChart data={actualPlusModelledData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatAxisRevenue} />
                                <Tooltip
                                    contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                    formatter={(v, name) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}m`, name]}
                                />
                                <Bar dataKey="actual" fill="#ffffff2b" name="Actual Revenue" radius={[2, 2, 0, 0]} />
                                {prods.map(product => (
                                    <Area key={product.id} type="monotone" dataKey={product.id} stackId="1" fill={product.color} stroke={product.color} fillOpacity={0.65} name={product.name} />
                                ))}
                                <Line type="monotone" dataKey="modelled" stroke="#ffffff" strokeWidth={2} dot={false} name="Modelled Total" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>

                    <Box>
                        <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 8 }}>Product SOM Summary (calibrated)</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                        {[
                                            "Product",
                                            "FY25 SOM",
                                            "CAGR",
                                            "FY28E",
                                            "FY30E",
                                            "FY35E",
                                            "Category"
                                        ].map(h => (
                                            <th key={h} style={{ textAlign: h === "Product" || h === "Category" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 600, fontSize: 9 }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {productSummaryRows.map(row => (
                                        <tr key={row.id} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                            <td style={{ padding: "3px 5px" }}>
                                                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 2, background: row.color, marginRight: 4, verticalAlign: "middle" }} />
                                                {row.name}
                                            </td>
                                            <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                                                {row.baseSom.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: row.cagr >= 0 ? "#22c55e" : "#ef4444" }}>
                                                {fP(row.cagr)}
                                            </td>
                                            <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                                {row.fy28.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                                {row.fy30.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                                {row.fy35.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                            <td style={{ padding: "3px 5px", color: CAT_C[row.cat], fontSize: 9 }}>{row.cat}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                        <td style={{ padding: "4px 5px" }}>Total calibrated SOM</td>
                                        <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                            {totalCalibratedSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td />
                                        <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                            {productSummaryRows.reduce((s, r) => s + r.fy28, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                            {productSummaryRows.reduce((s, r) => s + r.fy30, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                            {productSummaryRows.reduce((s, r) => s + r.fy35, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ fontSize: 10, color: t2, marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap" }}>
                            <span>FY{BASE_YEAR} Actual: <b style={{ color: "#f59e0b" }}>${fy2025ActualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}m</b></span>
                            <span>Raw SOM: <b style={{ color: "#3b82f6" }}>${totalModelSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}m</b></span>
                            <span>Ratio: <b style={{ color: t1 }}>{formatCalibrationRatio(calibrationRatio)}</b></span>
                            <span>Calibrated SOM: <b style={{ color: "#22c55e" }}>${totalCalibratedSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}m</b></span>
                        </div>
                    </Box>

                    <Box>
                        <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 8 }}>Projected P&L ($m)</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace" }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                        <th style={{ textAlign: "left", padding: "5px 5px", fontFamily: "'IBM Plex Sans',sans-serif", color: t2, fontWeight: 600, fontSize: 9 }}>
                                            Line Item
                                        </th>
                                        {PROJ_YEARS.map(y => (
                                            <th key={y} style={{ textAlign: "right", padding: "5px 3px", color: t2, fontWeight: 600, fontSize: 9 }}>
                                                FY{y}E
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { k: "rev", l: "Total Revenue", b: true, sep: true },
                                        { k: "gp", l: "Gross Profit" },
                                        { k: "opInc", l: "Operating Income", b: true, hl: true },
                                        { k: "pbt", l: "PBT" },
                                        { k: "ni", l: "Net Income", b: true }
                                    ].map((row, ri) => (
                                        <tr key={ri} style={{ borderTop: row.sep ? `2px solid ${bdr}` : `1px solid ${bdr}15`, background: row.hl ? "#3b82f610" : "transparent" }}>
                                            <td style={{ padding: "3px 5px", fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: row.b ? 700 : 500, fontSize: 11 }}>
                                                {row.l}
                                            </td>
                                            {projectedPLRows.map(pl => (
                                                <td key={pl.year} style={{ textAlign: "right", padding: "3px 3px", fontWeight: row.b ? 700 : 500, color: pl[row.k] < 0 ? "#ef4444" : t1 }}>
                                                    {pl[row.k].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                            { l: "FY2026E Revenue", v: "$3.1–3.2bn", c: "#06b6d4" }
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
                                        {["", ...ACTUALS.group.map(a => a.label)].map(h => (
                                            <th key={h} style={{ textAlign: h === "" ? "left" : "right", padding: "6px 6px", color: t2, fontWeight: 600, fontSize: 10, whiteSpace: "nowrap" }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { l: "Total revenue", k: "rev" },
                                        { l: "  Cloud revenue", k: "cloudRev", indent: true },
                                        { l: "  Services revenue", k: "servicesRev", indent: true },
                                        { l: "  Product revenue", k: "productRev", indent: true },
                                        { l: "Cost of revenue", k: "cogs", neg: true },
                                        { l: "Gross profit", k: "gp", b: true },
                                        { l: "Gross margin", k: "gpM", pct: true },
                                        { l: "Operating income", k: "opInc", b: true },
                                        { l: "Operating margin", k: "opM", pct: true },
                                        { l: "Net income", k: "ni", b: true },
                                        { l: "Diluted EPS", k: "eps" },
                                        { l: "Operating cash flow", k: "cashOps" }
                                    ].map((r, ri) => (
                                        <tr key={ri} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                            <td style={{ padding: "4px 6px", fontWeight: r.b ? 800 : 500, color: r.indent ? t3 : t1, fontSize: r.indent ? 10 : 11 }}>
                                                {r.l}
                                            </td>
                                            {ACTUALS.group.map((a, i) => {
                                                const v = a[r.k];
                                                return (
                                                    <td key={i} style={{ textAlign: "right", padding: "4px 6px", fontFamily: "'JetBrains Mono',monospace", color: r.neg ? t2 : t1 }}>
                                                        {v === null || v === undefined ? "—" : r.pct ? fM(v) : Number(v).toFixed(r.k === "eps" ? 2 : 0)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>
                            Non‑GAAP highlights (FY2025): Op income $907.9m, EPS $12.30; AI & Self‑Service ARR $328m.
                        </div>
                    </Box>

                    <div style={{ display: "flex", gap: 10, flexDirection: isCompact ? "column" : "row" }}>
                        <Box style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Segment Revenue (GAAP, $m)</div>
                            <ResponsiveContainer width="100%" height={180}>
                                <ComposedChart
                                    data={ACTUALS.group.map(row => {
                                        const segs = ACTUALS.segments[row.year] || [];
                                        const ce = segs.find(s => s.name === "Customer Engagement")?.rev ?? 0;
                                        const fc = segs.find(s => s.name === "Financial Crime & Compliance")?.rev ?? 0;
                                        return {
                                            y: row.label.replace("FY", "FY"),
                                            ce,
                                            fc,
                                            total: row.rev
                                        };
                                    })}
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

                        <Box style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Revenue by Delivery Model ($m)</div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                    <thead>
                                        <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                            {[
                                                "Model",
                                                ...ACTUALS.group.map(a => a.label)
                                            ].map(h => (
                                                <th key={h} style={{ textAlign: h === "Model" ? "left" : "right", padding: "5px 6px", color: t2, fontWeight: 600, fontSize: 10 }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: "Cloud", key: "cloud", color: "#8b5cf6" },
                                            { label: "Services", key: "services", color: "#f59e0b" },
                                            { label: "Product", key: "product", color: "#64748b" }
                                        ].map(row => (
                                            <tr key={row.key} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                                <td style={{ padding: "4px 6px", color: row.color, fontWeight: 700 }}>{row.label}</td>
                                                {ACTUALS.group.map(a => {
                                                    const model = ACTUALS.revenueByModel[a.year];
                                                    const value = model ? model[row.key] : null;
                                                    return (
                                                        <td key={a.year} style={{ textAlign: "right", padding: "4px 6px", fontFamily: "'JetBrains Mono',monospace" }}>
                                                            {value === null || value === undefined ? "—" : Number(value).toFixed(0)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Box>
                    </div>
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
