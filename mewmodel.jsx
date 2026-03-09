import { useState, useMemo, useCallback, useEffect } from "react";
import {
    AreaChart, Area, ComposedChart, Bar, Line,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend,
    LineChart
} from "recharts";

import {
    ACTUALS, PRODUCTS, CATS, CAT_C, PROJ_YEARS,
    fN, fP, fM, cagrFn,
    calcTAM, calcCAGR, projectSCurve, sCurveTimeSeries, sCurvePhase, sCurveGrowthRate,
    DEFAULT_SETTINGS as LOGIC_DEFAULT_SETTINGS,
    resolveInitialSettings
} from "./mewlogic.mjs";

export const DEFAULT_SETTINGS = LOGIC_DEFAULT_SETTINGS;

const BASE_YEAR = 2025;
const bg = "#080e1a", crd = "#0f172a", bdr = "#1e293b";
const t1 = "#e2e8f0", t2 = "#94a3b8", t3 = "#64748b";
const acc = "#fbbf24";

/* ── Shared Components ───────────────────── */
const Box = ({ children, style }) => (
    <div style={{ background: crd, borderRadius: 8, border: `1px solid ${bdr}`, padding: 14, marginBottom: 10, ...style }}>
        {children}
    </div>
);

const NI = ({ value, onChange, step, w, isPct }) => (
    <div style={{ position: "relative", width: w || 80 }}>
        <input type="number"
            value={isPct ? +(value * 100).toFixed(2) : value}
            onChange={e => {
                const v = parseFloat(e.target.value);
                onChange(!isNaN(v) ? (isPct ? v / 100 : v) : 0);
            }}
            step={step || (isPct ? 0.5 : 1)}
            style={{
                boxSizing: "border-box", width: "100%",
                padding: isPct ? "3px 16px 3px 5px" : "3px 5px",
                fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                background: "#1e293b", border: "1px solid #334155",
                borderRadius: 4, color: acc, textAlign: "right", outline: "none"
            }}
        />
        {isPct && <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: acc, fontSize: 11, pointerEvents: "none" }}>%</span>}
    </div>
);

const PhaseTag = ({ phase }) => {
    const colors = {
        "Nascent": "#94a3b8", "Early Adoption": "#3b82f6",
        "Rapid Growth": "#22c55e", "Late Growth": "#f59e0b", "Saturation": "#ef4444", "n/a": "#64748b"
    };
    return (
        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: `${colors[phase] || "#64748b"}20`, color: colors[phase] || "#64748b", fontWeight: 600, letterSpacing: 0.3 }}>
            {phase}
        </span>
    );
};

const TABS = ["Market Model", "S-Curve Dashboard", "Projections + P&L", "Actuals & KPIs"];

const fyLabel = (year, est = false) => `FY${String(year).slice(-2)}${est ? "E" : ""}`;
const fmtAxis = v => Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(1)}B` : `${Math.round(v).toLocaleString()}`;
const fmtRatio = r => !Number.isFinite(r) ? "n/a" : r === 0 ? "0x" : Math.abs(r) < 0.1 ? `${r.toFixed(3)}x` : `${r.toFixed(2)}x`;
const fmtUnits = u => {
    if (!Number.isFinite(u)) return "—";
    if (u >= 1e6) return `${(u / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
    if (u >= 1e3) return `${(u / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 })}K`;
    return u.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

/* ── Main Component ──────────────────────── */
export default function NICEModel({ initialSettings = DEFAULT_SETTINGS, onSettingsChange }) {
    const resolved = useMemo(() => resolveInitialSettings(initialSettings), [initialSettings]);

    const [tab, setTab] = useState(0);
    const [prods, setProds] = useState(resolved.prods);
    const [sel, setSel] = useState(0);
    const [gpM, setGpM] = useState(resolved.gpM);
    const [opxR, setOpxR] = useState(resolved.opxR);
    const [taxR, setTaxR] = useState(resolved.taxR);
    const [centralCost, setCentralCost] = useState(resolved.centralCost);
    const [useSCurve, setUseSCurve] = useState(resolved.useSCurve);
    const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth <= 900);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const h = () => setCompact(window.innerWidth <= 900);
        h(); window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);

    useEffect(() => {
        if (typeof onSettingsChange === "function")
            onSettingsChange({ prods, gpM, opxR, taxR, centralCost, useSCurve });
    }, [prods, gpM, opxR, taxR, centralCost, useSCurve, onSettingsChange]);

    const uQ = useCallback((pi, qi, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], quantity: [...n[pi].quantity] }; x.quantity[qi] = { ...x.quantity[qi], v }; n[pi] = x; return n; }), []);
    const uP = useCallback((pi, qi, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], price: [...n[pi].price] }; x.price[qi] = { ...x.price[qi], v }; n[pi] = x; return n; }), []);
    const uC = useCallback((pi, ci, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], cagr: [...n[pi].cagr] }; x.cagr[ci] = { ...x.cagr[ci], v }; n[pi] = x; return n; }), []);
    const uSC = useCallback((pi, key, v) => setProds(p => { const n = [...p]; n[pi] = { ...n[pi], sCurve: { ...n[pi].sCurve, [key]: v } }; return n; }), []);

    /* ── Computed values ────────────────────── */
    const comp = useMemo(() => prods.map(p => ({ ...calcTAM(p), cagr: calcCAGR(p) })), [prods]);
    const totalModelSOM = useMemo(() => comp.reduce((s, c) => s + c.som, 0), [comp]);
    const fy2025Rev = useMemo(() => {
        const fy = ACTUALS.group.find(x => x.year === BASE_YEAR);
        return fy?.rev ?? 0;
    }, []);
    const calRatio = totalModelSOM > 0 ? fy2025Rev / totalModelSOM : 1;
    const calBaseSom = useMemo(() => comp.map(c => c.som * calRatio), [comp, calRatio]);
    const totalCalSOM = useMemo(() => calBaseSom.reduce((s, v) => s + v, 0), [calBaseSom]);

    /* ── Projection: both CAGR and S-curve ── */
    const projData = useMemo(() => {
        return PROJ_YEARS.map(year => {
            const row = { year };
            let totalCagr = 0, totalSCurve = 0;
            prods.forEach((p, i) => {
                const t = year - BASE_YEAR;
                const cagrRev = calBaseSom[i] * Math.pow(1 + comp[i].cagr, t);
                const sCurveRev = projectSCurve(calBaseSom[i], p.sCurve, BASE_YEAR, year);
                row[`${p.id}_cagr`] = cagrRev;
                row[`${p.id}_sc`] = sCurveRev ?? cagrRev;
                row[p.id] = useSCurve && sCurveRev !== null ? sCurveRev : cagrRev;
                totalCagr += cagrRev;
                totalSCurve += (sCurveRev ?? cagrRev);
            });
            row.totalCagr = totalCagr;
            row.totalSCurve = totalSCurve;
            row.total = useSCurve ? totalSCurve : totalCagr;
            return row;
        });
    }, [prods, comp, calBaseSom, useSCurve]);

    const actualPlusModelled = useMemo(() => ([
        ...ACTUALS.group.map(r => ({ year: fyLabel(r.year), actual: r.rev })),
        ...projData.map(r => ({ year: fyLabel(r.year, true), ...r, modelled: r.total }))
    ]), [projData]);

    /* ── S-Curve per product ────────────────── */
    const sCurveData = useMemo(() => {
        return prods.map((p, i) => sCurveTimeSeries(calBaseSom[i], p.sCurve, BASE_YEAR, PROJ_YEARS));
    }, [prods, calBaseSom]);

    /* ── P&L projection ─────────────────────── */
    const plRows = useMemo(() => {
        return PROJ_YEARS.map(year => {
            const d = projData.find(r => r.year === year);
            const rev = d?.total ?? 0;
            const gp = rev * gpM;
            const opInc = gp - rev * opxR - centralCost;
            const pbt = opInc;
            const ni = pbt - Math.max(0, pbt * taxR);
            return { year, rev, gp, gpM, opInc, pbt, ni };
        });
    }, [projData, gpM, opxR, taxR, centralCost]);

    const p = prods[sel], c = comp[sel];

    /* ═══════════════════════════════════════ */
    return (
        <div style={{
            background: bg, color: t1, fontFamily: "'IBM Plex Sans',system-ui,sans-serif",
            minHeight: "100vh", padding: compact ? "8px" : "10px 14px", fontSize: 13, overflowX: "hidden"
        }}>
            {/* ── Header ──────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${bdr}` }}>
                <div style={{ width: 34, height: 34, borderRadius: 7, background: "linear-gradient(135deg,#8b5cf6,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: -1 }}>Ni</div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>NICE Ltd — Market Model</h1>
                    <div style={{ fontSize: 10, color: t2 }}>FY2022–FY2025 Actuals · 11 Driver Trees · S-Curve Adoption · NASDAQ:NICE</div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: useSCurve ? "#22c55e" : t3, cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={useSCurve} onChange={e => setUseSCurve(e.target.checked)} style={{ accentColor: "#22c55e" }} />
                    S-Curve Mode
                </label>
            </div>

            {/* ── Tabs ────────────────────────── */}
            <div style={{ display: "flex", gap: 2, marginBottom: 12, background: "#060a14", borderRadius: 6, padding: 3, overflowX: compact ? "auto" : "visible" }}>
                {TABS.map((t, i) => (
                    <button key={t} onClick={() => setTab(i)} style={{
                        flex: 1, padding: "6px 8px", border: "none", borderRadius: 5, cursor: "pointer",
                        fontSize: 11, fontWeight: tab === i ? 600 : 400, whiteSpace: "nowrap",
                        background: tab === i ? "#6366f1" : "transparent",
                        color: tab === i ? "#fff" : t2
                    }}>{t}</button>
                ))}
            </div>

            {/* ═══ TAB 0: MARKET MODEL ═══ */}
            {tab === 0 && (
                <div style={{ display: "flex", gap: 10, flexDirection: compact ? "column" : "row" }}>
                    {/* Nav */}
                    <div style={{ width: compact ? "100%" : 190, flexShrink: 0 }}>
                        <Box style={{ padding: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: t2, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                                Product Lines ({prods.length})
                            </div>
                            {CATS.map(cat => (
                                <div key={cat} style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 9, color: CAT_C[cat], fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{cat}</div>
                                    {prods.map((pr, i) => pr.cat === cat && (
                                        <button key={pr.id} onClick={() => setSel(i)} style={{
                                            display: "flex", alignItems: "center", gap: 5, width: "100%",
                                            padding: "4px 6px", border: "none", borderRadius: 4, cursor: "pointer",
                                            marginBottom: 1, textAlign: "left",
                                            background: sel === i ? `${pr.color}20` : "transparent",
                                            borderLeft: sel === i ? `3px solid ${pr.color}` : "3px solid transparent",
                                            color: sel === i ? t1 : t2, fontSize: 10
                                        }}>
                                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: pr.color, flexShrink: 0 }} />
                                            <span style={{ fontWeight: sel === i ? 600 : 400 }}>{pr.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </Box>

                        <Box style={{ padding: 10 }}>
                            <div style={{ fontSize: 10, color: t2, marginBottom: 6, fontWeight: 600 }}>Calibration</div>
                            {[
                                { l: "FY25 actual", v: `$${fy2025Rev.toLocaleString(undefined, { maximumFractionDigits: 0 })}m`, c: acc },
                                { l: "Raw model SOM", v: `$${totalModelSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}m`, c: "#3b82f6" },
                                { l: "Ratio", v: fmtRatio(calRatio), c: t1 },
                                { l: "Calibrated SOM", v: `$${totalCalSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}m`, c: "#22c55e" },
                            ].map(r => (
                                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginTop: 3 }}>
                                    <span style={{ color: t2 }}>{r.l}</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: r.c }}>{r.v}</span>
                                </div>
                            ))}
                        </Box>
                    </div>

                    {/* Main Panel */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Box style={{ borderTop: `3px solid ${p.color}` }}>
                            <div style={{ fontSize: 9, color: CAT_C[p.cat], fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{p.cat}</div>
                            <h2 style={{ margin: "2px 0", fontSize: 16, fontWeight: 700, color: p.color }}>{p.name}</h2>
                            <div style={{ fontSize: 9, color: t3, fontFamily: "'JetBrains Mono',monospace" }}>{p.eq}</div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                                {p.businessLineExplanation && (
                                    <div style={{ flex: "2 1 250px", padding: "6px 10px", background: "#f8fafc08", borderLeft: `3px solid #10b981`, borderRadius: "0 4px 4px 0", fontSize: 10 }}>
                                        <span style={{ fontWeight: 600, color: "#10b981" }}>Business:</span> {p.businessLineExplanation}
                                    </div>
                                )}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "1 1 200px" }}>
                                    <div style={{ padding: "6px 10px", background: "#f8fafc08", borderLeft: `3px solid ${t3}`, borderRadius: "0 4px 4px 0", flex: 1 }}>
                                        <div style={{ fontSize: 9, color: t2 }}>Model TAM</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: t2, marginTop: 2 }}>{fN(c.tam)}</div>
                                    </div>
                                    <div style={{ padding: "6px 10px", background: "#f8fafc08", borderLeft: `3px solid ${p.color}`, borderRadius: "0 4px 4px 0", flex: 1 }}>
                                        <div style={{ fontSize: 9, color: t2 }}>Calibrated SOM</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: p.color, marginTop: 2 }}>{fN(calBaseSom[sel])}</div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: c.cagr >= 0 ? "#22c55e" : "#ef4444", marginTop: 1 }}>CAGR {fP(c.cagr)}</div>
                                    </div>
                                    {p.sCurve?.enabled && (
                                        <div style={{ padding: "6px 10px", background: "#f8fafc08", borderLeft: "3px solid #ec4899", borderRadius: "0 4px 4px 0", flex: 1 }}>
                                            <div style={{ fontSize: 9, color: t2 }}>S-Curve Phase</div>
                                            <div style={{ marginTop: 3 }}><PhaseTag phase={sCurvePhase(calBaseSom[sel], p.sCurve, BASE_YEAR, BASE_YEAR)} /></div>
                                            <div style={{ fontSize: 9, color: t3, marginTop: 2 }}>Ceiling: {fN(p.sCurve.ceiling)}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Box>

                        {/* Quantity + Price trees */}
                        <div style={{ display: "flex", gap: 10, flexDirection: compact ? "column" : "row" }}>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#f59e0b" }}>Quantity Tree</div>
                                {p.quantity.map((q, qi) => (
                                    <div key={qi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{q.l}</div>
                                        <NI value={q.v} onChange={v => uQ(sel, qi, v)} isPct={q.isPct}
                                            step={q.v >= 1e6 ? 100000 : q.v >= 100 ? 5 : q.isPct ? 0.005 : 0.01}
                                            w={q.v >= 1e6 ? 95 : 75} />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                                    <span>Billable units</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#f59e0b" }}>{fmtUnits(c.u)}</span>
                                </div>
                            </Box>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#22c55e" }}>Price Tree</div>
                                {p.price.map((pr, pi) => (
                                    <div key={pi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{pr.l}</div>
                                        <NI value={pr.v} onChange={v => uP(sel, pi, v)}
                                            step={pr.v >= 10000 ? 500 : pr.v >= 500 ? 25 : 5} w={90} />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                                    <span>Annual ARPU / ACV</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#22c55e" }}>${c.ar.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            </Box>
                        </div>

                        {/* CAGR + S-Curve config */}
                        <div style={{ display: "flex", gap: 10, flexDirection: compact ? "column" : "row" }}>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#3b82f6" }}>CAGR Build</div>
                                {p.cagr.map((cv, ci) => (
                                    <div key={ci} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5 }}>{cv.l}</div>
                                        <input type="range" min={-0.15} max={0.20} step={0.005} value={cv.v}
                                            onChange={e => uC(sel, ci, parseFloat(e.target.value))} style={{ width: 70, accentColor: "#6366f1" }} />
                                        <span style={{ width: 46, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: cv.v >= 0 ? "#22c55e" : "#ef4444" }}>
                                            {(cv.v * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                                    <span>Model CAGR</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>{fP(c.cagr)}</span>
                                </div>
                            </Box>

                            {p.sCurve && (
                                <Box style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "#ec4899" }}>S-Curve Parameters</div>
                                        <label style={{ fontSize: 10, color: p.sCurve.enabled ? "#ec4899" : t3, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                            <input type="checkbox" checked={p.sCurve.enabled} onChange={e => uSC(sel, "enabled", e.target.checked)} style={{ accentColor: "#ec4899" }} />
                                            Enabled
                                        </label>
                                    </div>
                                    {[
                                        { l: "Ceiling ($M)", k: "ceiling", mn: 50, mx: 5000, step: 25, fmt: v => `$${v.toLocaleString()}M` },
                                        { l: "Steepness (k)", k: "k", mn: 0.05, mx: 0.60, step: 0.01, fmt: v => v.toFixed(2) },
                                    ].map(x => (
                                        <div key={x.k} style={{ marginBottom: 8 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t2, marginBottom: 2 }}>
                                                <span>{x.l}</span>
                                                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#ec4899" }}>{x.fmt(p.sCurve[x.k])}</span>
                                            </div>
                                            <input type="range" min={x.mn} max={x.mx} step={x.step} value={p.sCurve[x.k]}
                                                onChange={e => uSC(sel, x.k, parseFloat(e.target.value))}
                                                style={{ width: "100%", accentColor: "#ec4899" }} disabled={!p.sCurve.enabled} />
                                        </div>
                                    ))}
                                    {p.sCurve.enabled && (
                                        <div style={{ fontSize: 9, color: t3, borderTop: `1px solid ${bdr}`, paddingTop: 6 }}>
                                            S-curve models logistic adoption: revenue approaches ceiling as market saturates, naturally dampening growth over time.
                                        </div>
                                    )}
                                </Box>
                            )}
                        </div>

                        {/* SOM Projection chart */}
                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>SOM Projection — {p.name}</div>
                            <ResponsiveContainer width="100%" height={140}>
                                <ComposedChart data={PROJ_YEARS.map(y => {
                                    const t = y - BASE_YEAR;
                                    const cagrRev = calBaseSom[sel] * Math.pow(1 + c.cagr, t);
                                    const scRev = projectSCurve(calBaseSom[sel], p.sCurve, BASE_YEAR, y);
                                    return { year: y, cagr: cagrRev, sCurve: scRev, ceiling: p.sCurve?.ceiling ?? null };
                                })} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                    <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                        formatter={v => v !== null ? [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}M`] : null}
                                        labelFormatter={l => `FY${l}E`} />
                                    <Area type="monotone" dataKey="cagr" stroke={p.color} strokeWidth={1.5} fill={`${p.color}20`} strokeDasharray="4 4" name="CAGR" />
                                    {p.sCurve?.enabled && <Area type="monotone" dataKey="sCurve" stroke="#ec4899" strokeWidth={2.5} fill="#ec489920" name="S-Curve" />}
                                    {p.sCurve?.enabled && <ReferenceLine y={p.sCurve.ceiling} stroke="#ec489940" strokeDasharray="6 3" label={{ value: `Ceiling: ${fN(p.sCurve.ceiling)}`, fill: "#ec489980", fontSize: 9, position: "right" }} />}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Box>

                        {/* Anchors */}
                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Disclosed Anchors</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {p.anchors.map((an, ai) => (
                                    <div key={ai} style={{ background: "#1a2744", borderRadius: 6, padding: "6px 10px", flex: "1 1 140px" }}>
                                        <div style={{ fontSize: 9, color: t2 }}>{an.m}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: acc }}>{an.v}</div>
                                    </div>
                                ))}
                            </div>
                        </Box>
                    </div>
                </div>
            )}

            {/* ═══ TAB 1: S-CURVE DASHBOARD ═══ */}
            {tab === 1 && (
                <>
                    {/* Overall S-curve comparison */}
                    <Box>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>S-Curve vs CAGR — Total Revenue ($M)</span>
                            <span style={{ fontSize: 10, color: t2 }}>Logistic adoption model vs constant-rate compound growth</span>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <ComposedChart data={projData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
                                <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                    formatter={v => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}M`]}
                                    labelFormatter={l => `FY${l}E`} />
                                <Area type="monotone" dataKey="totalCagr" stroke="#6366f1" strokeWidth={2} fill="#6366f120" strokeDasharray="6 3" name="CAGR Model" />
                                <Area type="monotone" dataKey="totalSCurve" stroke="#ec4899" strokeWidth={2.5} fill="#ec489920" name="S-Curve Model" />
                                <ReferenceLine y={fy2025Rev} stroke="#ffffff20" strokeDasharray="4 4" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* Per-product S-curve phase matrix */}
                    <Box>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Product Adoption Lifecycle Matrix</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                        {["Product", "FY25 SOM", "Ceiling", "Penetration", "Phase (FY25)", "Phase (FY30)", "Phase (FY35)", "CAGR", "S-Curve FY30E", "CAGR FY30E"].map(h => (
                                            <th key={h} style={{ textAlign: ["Product"].includes(h) ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 9, whiteSpace: "nowrap" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {prods.map((pr, i) => {
                                        const baseSom = calBaseSom[i];
                                        const sc = pr.sCurve;
                                        const scRev30 = projectSCurve(baseSom, sc, BASE_YEAR, 2030);
                                        const cagrRev30 = baseSom * Math.pow(1 + comp[i].cagr, 5);
                                        const pen = sc?.ceiling > 0 ? baseSom / sc.ceiling : 0;
                                        return (
                                            <tr key={pr.id} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                                <td style={{ padding: "3px 5px" }}>
                                                    <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 2, background: pr.color, marginRight: 4, verticalAlign: "middle" }} />
                                                    {pr.name}
                                                </td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{baseSom.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: sc?.enabled ? "#ec4899" : t3 }}>{sc?.enabled ? fN(sc.ceiling) : "Off"}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{sc?.enabled ? fM(pen) : "—"}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px" }}><PhaseTag phase={sCurvePhase(baseSom, sc, BASE_YEAR, 2025)} /></td>
                                                <td style={{ textAlign: "right", padding: "3px 5px" }}><PhaseTag phase={sCurvePhase(baseSom, sc, BASE_YEAR, 2030)} /></td>
                                                <td style={{ textAlign: "right", padding: "3px 5px" }}><PhaseTag phase={sCurvePhase(baseSom, sc, BASE_YEAR, 2035)} /></td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: comp[i].cagr >= 0 ? "#22c55e" : "#ef4444" }}>{fP(comp[i].cagr)}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: "#ec4899" }}>{scRev30 !== null ? scRev30.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{cagrRev30.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                        <td style={{ padding: "4px 5px" }}>Total</td>
                                        <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{totalCalSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td /><td /><td /><td /><td /><td />
                                        <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace", color: "#ec4899" }}>
                                            {prods.reduce((s, pr, i) => s + (projectSCurve(calBaseSom[i], pr.sCurve, BASE_YEAR, 2030) ?? (calBaseSom[i] * Math.pow(1 + comp[i].cagr, 5))), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                            {comp.reduce((s, c, i) => s + calBaseSom[i] * Math.pow(1 + c.cagr, 5), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Box>

                    {/* Individual S-curves grid */}
                    <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: 10 }}>
                        {prods.filter(pr => pr.sCurve?.enabled).map((pr, idx) => {
                            const i = prods.indexOf(pr);
                            const data = sCurveData[i];
                            return (
                                <Box key={pr.id} style={{ borderTop: `2px solid ${pr.color}` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: pr.color }}>{pr.name}</span>
                                        <PhaseTag phase={data?.[0]?.phase ?? "n/a"} />
                                    </div>
                                    <ResponsiveContainer width="100%" height={100}>
                                        <AreaChart data={data} margin={{ top: 2, right: 8, left: 0, bottom: 2 }}>
                                            <XAxis dataKey="year" tick={{ fill: t3, fontSize: 9 }} tickLine={false} />
                                            <YAxis tick={{ fill: t3, fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, pr.sCurve.ceiling * 1.05]} />
                                            <Area type="monotone" dataKey="sCurveRev" stroke="#ec4899" strokeWidth={2} fill="#ec489918" />
                                            <ReferenceLine y={pr.sCurve.ceiling} stroke="#ec489930" strokeDasharray="4 2" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: "flex", gap: 12, fontSize: 9, color: t2, marginTop: 2 }}>
                                        <span>Ceiling: <b style={{ color: "#ec4899" }}>{fN(pr.sCurve.ceiling)}</b></span>
                                        <span>FY30E: <b style={{ color: t1 }}>{fN(data?.[5]?.sCurveRev ?? 0)}</b></span>
                                        <span>Penetration FY30: <b style={{ color: t1 }}>{fM(data?.[5]?.penetration ?? 0)}</b></span>
                                    </div>
                                </Box>
                            );
                        })}
                    </div>

                    {/* Penetration waterfall */}
                    <Box>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Market Penetration Over Time (% of Ceiling)</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={PROJ_YEARS.map(y => {
                                const row = { year: y };
                                prods.forEach((pr, i) => {
                                    if (pr.sCurve?.enabled && pr.sCurve.ceiling > 0) {
                                        const scRev = projectSCurve(calBaseSom[i], pr.sCurve, BASE_YEAR, y);
                                        row[pr.id] = scRev !== null ? (scRev / pr.sCurve.ceiling) * 100 : null;
                                    }
                                });
                                return row;
                            })} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                                <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                    formatter={v => v !== null ? [`${Number(v).toFixed(1)}%`] : null}
                                    labelFormatter={l => `FY${l}E`} />
                                {prods.filter(pr => pr.sCurve?.enabled).map(pr => (
                                    <Line key={pr.id} type="monotone" dataKey={pr.id} stroke={pr.color} strokeWidth={2} dot={{ r: 2 }} name={pr.name} />
                                ))}
                                <ReferenceLine y={50} stroke="#ffffff15" strokeDasharray="4 4" label={{ value: "50% penetration", fill: "#ffffff30", fontSize: 9, position: "right" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </>
            )}

            {/* ═══ TAB 2: PROJECTIONS + P&L ═══ */}
            {tab === 2 && (
                <>
                    {/* Assumptions */}
                    <Box>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#f59e0b" }}>Projection Assumptions</div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            {[
                                { l: "Blended GP Margin (NG)", v: gpM, s: setGpM, mn: 0.55, mx: 0.80 },
                                { l: "OpEx % Revenue", v: opxR, s: setOpxR, mn: 0.30, mx: 0.50 },
                                { l: "Tax Rate", v: taxR, s: setTaxR, mn: 0.05, mx: 0.30 },
                                { l: "Central Costs ($M)", v: centralCost, s: setCentralCost, mn: 0, mx: 100, abs: true },
                            ].map(x => (
                                <div key={x.l} style={{ flex: 1, minWidth: 130 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t2, marginBottom: 2 }}>
                                        <span>{x.l}</span>
                                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: acc }}>{x.abs ? `$${x.v}M` : fM(x.v)}</span>
                                    </div>
                                    <input type="range" min={x.mn} max={x.mx} step={x.abs ? 1 : 0.005} value={x.v}
                                        onChange={e => x.s(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#6366f1" }} />
                                </div>
                            ))}
                        </div>
                    </Box>

                    {/* Revenue chart */}
                    <Box>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>Actual + Modelled Revenue ($M)</span>
                            <span style={{ fontSize: 10, color: t2 }}>FY22–25 actuals · FY25E–35E {useSCurve ? "S-curve" : "CAGR"} projection</span>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <ComposedChart data={actualPlusModelled} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="year" tick={{ fill: t2, fontSize: 9 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickFormatter={fmtAxis} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                    formatter={(v, name) => v != null ? [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}M`, name] : null} />
                                <Bar dataKey="actual" fill="#ffffff25" name="Actual Revenue" radius={[2, 2, 0, 0]} />
                                {prods.map(pr => <Area key={pr.id} type="monotone" dataKey={pr.id} stackId="1" fill={pr.color} stroke={pr.color} fillOpacity={0.65} name={pr.name} />)}
                                <Line type="monotone" dataKey="modelled" stroke="#ffffff" strokeWidth={2} dot={false} name="Modelled Total" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* Product SOM table */}
                    <Box>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Product SOM Summary</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                        {["Product", "FY25 SOM", "CAGR", "FY28E", "FY30E", "FY35E", "Cat"].map(h => (
                                            <th key={h} style={{ textAlign: ["Product", "Cat"].includes(h) ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 9 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {prods.map((pr, i) => {
                                        const bs = calBaseSom[i];
                                        const g = comp[i].cagr;
                                        const sc = pr.sCurve;
                                        const getFY = y => useSCurve && sc?.enabled ? (projectSCurve(bs, sc, BASE_YEAR, y) ?? bs * Math.pow(1 + g, y - BASE_YEAR)) : bs * Math.pow(1 + g, y - BASE_YEAR);
                                        return (
                                            <tr key={pr.id} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                                <td style={{ padding: "3px 5px" }}><span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 2, background: pr.color, marginRight: 4, verticalAlign: "middle" }} />{pr.name}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{bs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", color: g >= 0 ? "#22c55e" : "#ef4444" }}>{fP(g)}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{getFY(2028).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{getFY(2030).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                <td style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{getFY(2035).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                <td style={{ padding: "3px 5px", color: CAT_C[pr.cat], fontSize: 9 }}>{pr.cat}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                        <td style={{ padding: "4px 5px" }}>Total</td>
                                        <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{totalCalSOM.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td />
                                        {[2028, 2030, 2035].map(y => (
                                            <td key={y} style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                                {prods.reduce((s, pr, i) => {
                                                    const bs = calBaseSom[i];
                                                    const g = comp[i].cagr;
                                                    return s + (useSCurve && pr.sCurve?.enabled ? (projectSCurve(bs, pr.sCurve, BASE_YEAR, y) ?? bs * Math.pow(1 + g, y - BASE_YEAR)) : bs * Math.pow(1 + g, y - BASE_YEAR));
                                                }, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </td>
                                        ))}
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Box>

                    {/* P&L */}
                    <Box>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Projected P&L ($M)</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace" }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                        <th style={{ textAlign: "left", padding: "5px 5px", fontFamily: "'IBM Plex Sans',sans-serif", color: t2, fontWeight: 500, fontSize: 9 }}>Line Item</th>
                                        {PROJ_YEARS.map(y => <th key={y} style={{ textAlign: "right", padding: "5px 3px", color: t2, fontWeight: 500, fontSize: 9 }}>FY{y}E</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { k: "rev", l: "Total Revenue", b: true, sep: true },
                                        { k: "gp", l: "Gross Profit" },
                                        { k: "opInc", l: "Operating Income", b: true, hl: true },
                                        { k: "pbt", l: "PBT" },
                                        { k: "ni", l: "Net Income", b: true },
                                    ].map((r, ri) => (
                                        <tr key={ri} style={{ borderTop: r.sep ? `2px solid ${bdr}` : `1px solid ${bdr}15`, background: r.hl ? "#6366f108" : "transparent" }}>
                                            <td style={{ padding: "3px 5px", fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: r.b ? 700 : 400, fontSize: 11 }}>{r.l}</td>
                                            {plRows.map(pl => (
                                                <td key={pl.year} style={{ textAlign: "right", padding: "3px 3px", fontWeight: r.b ? 600 : 400, color: pl[r.k] < 0 ? "#ef4444" : t1 }}>
                                                    {pl[r.k].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Box>

                    {/* CAGR summary cards */}
                    <div style={{ display: "flex", gap: 10, flexDirection: compact ? "column" : "row" }}>
                        {[{ l: "3-Year (→FY2028)", n: 3 }, { l: "5-Year (→FY2030)", n: 5 }, { l: "10-Year (→FY2035)", n: 10 }].map(h => {
                            const endRev = plRows.find(r => r.year === 2025 + h.n)?.rev ?? 0;
                            const endOpInc = plRows.find(r => r.year === 2025 + h.n)?.opInc ?? 0;
                            const rc = cagrFn(totalCalSOM, endRev, h.n);
                            const baseOpInc = plRows[0]?.opInc ?? 0;
                            const oc = cagrFn(baseOpInc, endOpInc, h.n);
                            return (
                                <Box key={h.l} style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#6366f1" }}>{h.l}</div>
                                    {[
                                        { l: "Revenue CAGR", v: fP(rc), c: rc >= 0 ? "#22c55e" : "#ef4444" },
                                        { l: "OpInc CAGR", v: fP(oc), c: oc >= 0 ? "#22c55e" : "#ef4444" },
                                        { l: `FY${2025 + h.n}E Revenue`, v: fN(endRev), c: t1 },
                                        { l: `FY${2025 + h.n}E OpInc`, v: fN(endOpInc), c: t1 },
                                    ].map(x => (
                                        <div key={x.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                                            <span style={{ color: t2 }}>{x.l}</span>
                                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: x.c }}>{x.v}</span>
                                        </div>
                                    ))}
                                </Box>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ═══ TAB 3: ACTUALS & KPIs ═══ */}
            {tab === 3 && (
                <>
                    {/* KPI cards */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                        {[
                            { l: "FY2025 Revenue", v: "$2,945M", d: "+8% YoY", c: "#6366f1" },
                            { l: "FY2025 NG OpInc", v: "$908M", d: "30.8% margin", c: "#f59e0b" },
                            { l: "FY2025 Cloud Rev", v: "$2,238M", d: "76% of total", c: "#8b5cf6" },
                            { l: "AI ARR (Q4 '25)", v: "$328M", d: "+66% YoY", c: "#ec4899" },
                            { l: "FY2026E Guidance", v: "$3.1–3.2B", d: "Consensus", c: "#10b981" },
                            { l: "Net Cash", v: "$417M", d: "Debt-free", c: "#22c55e" },
                        ].map((k, i) => (
                            <Box key={i} style={{ flex: 1, minWidth: 120, borderTop: `3px solid ${k.c}`, textAlign: "center", padding: 10 }}>
                                <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 0.8 }}>{k.l}</div>
                                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: k.c, margin: "3px 0" }}>{k.v}</div>
                                <div style={{ fontSize: 10, color: t2 }}>{k.d}</div>
                            </Box>
                        ))}
                    </div>

                    {/* Actual P&L */}
                    <Box>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Income Statement — GAAP & Non-GAAP ($M)</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                        {["", ...ACTUALS.group.map(a => a.label)].map(h => (
                                            <th key={h} style={{ textAlign: h === "" ? "left" : "right", padding: "5px 6px", color: t2, fontWeight: 500, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { l: "Total Revenue", k: "rev", b: true },
                                        { l: "  Cloud Revenue", k: "cloudRev" },
                                        { l: "  Services Revenue", k: "servicesRev" },
                                        { l: "  Product Revenue", k: "productRev" },
                                        { l: "Cloud % of Total", k: "_cloudPct", pct: true },
                                        { l: "Gross Profit (GAAP)", k: "gp" },
                                        { l: "Gross Margin (GAAP)", k: "gpM", pct: true },
                                        { l: "Operating Income (GAAP)", k: "opInc", b: true },
                                        { l: "Operating Margin (GAAP)", k: "opM", pct: true },
                                        { l: "Net Income (GAAP)", k: "ni", b: true },
                                        { l: "EPS (GAAP, diluted)", k: "eps" },
                                        { l: "", k: "_spacer" },
                                        { l: "Adj Gross Margin (NG)", k: "adjGpM", pct: true },
                                        { l: "Adj Operating Income (NG)", k: "adjOpInc", b: true, hl: true },
                                        { l: "Adj Operating Margin (NG)", k: "adjOpM", pct: true },
                                        { l: "Adj EPS (NG)", k: "adjEps" },
                                        { l: "", k: "_spacer2" },
                                        { l: "Cash Flow from Ops", k: "cashOps" },
                                        { l: "Net Cash", k: "netCash" },
                                    ].map((r, ri) => (
                                        <tr key={ri} style={{ borderBottom: `1px solid ${bdr}15`, background: r.hl ? "#6366f108" : "transparent" }}>
                                            <td style={{ padding: "3px 6px", fontWeight: r.b ? 700 : 400, fontSize: r.l.startsWith("  ") ? 10 : 11, color: r.l.startsWith("  ") ? t3 : t1 }}>{r.l}</td>
                                            {ACTUALS.group.map((a, ai) => {
                                                let v;
                                                if (r.k === "_cloudPct") v = a.cloudRev && a.rev ? a.cloudRev / a.rev : null;
                                                else if (r.k === "_spacer" || r.k === "_spacer2") v = null;
                                                else v = a[r.k];
                                                return (
                                                    <td key={ai} style={{ textAlign: "right", padding: "3px 6px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: r.b ? 600 : 400, color: v != null && v < 0 ? "#ef4444" : t1 }}>
                                                        {v == null ? "—" : r.pct ? fM(v) : typeof v === "number" && Math.abs(v) < 20 ? v.toFixed(2) : typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ fontSize: 9, color: t3, marginTop: 6 }}>FY2025 reflects Cognigy acquisition (closed Sep 2025, $827M). All debt fully repaid Q3 2025.</div>
                    </Box>

                    {/* Segments + Delivery */}
                    <div style={{ display: "flex", gap: 10, flexDirection: compact ? "column" : "row" }}>
                        <Box style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Revenue by Segment ($M)</div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${bdr}` }}>
                                        {["Segment", ...ACTUALS.group.map(a => a.label)].map(h => (
                                            <th key={h} style={{ textAlign: h === "Segment" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 10 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {["Customer Engagement", "Financial Crime & Compliance"].map(seg => (
                                        <tr key={seg} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                            <td style={{ padding: "3px 5px", fontWeight: 600, color: seg.includes("Customer") ? "#8b5cf6" : "#22c55e" }}>{seg}</td>
                                            {ACTUALS.group.map(a => {
                                                const s = ACTUALS.segments[a.year]?.find(x => x.name === seg);
                                                return <td key={a.year} style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{s ? s.rev.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                        <Box style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Revenue by Model ($M)</div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${bdr}` }}>
                                        {["Model", ...ACTUALS.group.map(a => a.label)].map(h => (
                                            <th key={h} style={{ textAlign: h === "Model" ? "left" : "right", padding: "4px 5px", color: t2, fontWeight: 500, fontSize: 10 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { l: "Cloud", c: "#8b5cf6", k: "cloud" },
                                        { l: "Services", c: "#f59e0b", k: "services" },
                                        { l: "Product", c: "#64748b", k: "product" },
                                    ].map(r => (
                                        <tr key={r.k} style={{ borderBottom: `1px solid ${bdr}15` }}>
                                            <td style={{ padding: "3px 5px", fontWeight: 600, color: r.c }}>{r.l}</td>
                                            {ACTUALS.group.map(a => (
                                                <td key={a.year} style={{ textAlign: "right", padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace" }}>
                                                    {ACTUALS.revenueByModel[a.year]?.[r.k]?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "—"}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    </div>

                    {/* Historical chart */}
                    <Box>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Revenue & Non-GAAP Operating Income ($M)</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <ComposedChart data={ACTUALS.group.map(a => ({ y: a.label, rev: a.rev, opInc: a.adjOpInc, gp: a.adjGp }))} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="y" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }}
                                    formatter={v => v != null ? [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}M`] : null} />
                                <Bar dataKey="rev" fill="#6366f140" name="Revenue" radius={[2, 2, 0, 0]} />
                                <Line type="monotone" dataKey="gp" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Gross Profit (NG)" />
                                <Line type="monotone" dataKey="opInc" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="OpInc (NG)" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* Key metrics */}
                    <Box>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Key Performance Metrics</div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 10, color: t2 }}>
                            {[
                                { l: "Cloud ARR (Dec 2024)", v: "$2.1B", c: "#8b5cf6" },
                                { l: "Cloud NRR", v: "109%", c: "#6366f1" },
                                { l: "AI ARR (Q4 2025)", v: "$328M", c: "#ec4899" },
                                { l: "AI ARR Growth", v: "+66% YoY", c: "#22c55e" },
                                { l: "RPO (Total)", v: "$3.7B", c: "#3b82f6" },
                                { l: "RPO (Cloud)", v: "$3.2B", c: "#8b5cf6" },
                                { l: "Customers", v: "25,000+", c: t1 },
                                { l: "Fortune 100", v: "85+", c: "#f59e0b" },
                                { l: "Recurring %", v: "~90%", c: "#10b981" },
                                { l: "Countries", v: "150+", c: "#0ea5e9" },
                            ].map(k => (
                                <span key={k.l}>{k.l}: <b style={{ color: k.c }}>{k.v}</b></span>
                            ))}
                        </div>
                    </Box>
                </>
            )}

            {/* ── Disclaimer ──────────────────── */}
            <div style={{ marginTop: 10, padding: "6px 10px", background: "#0a0e18", border: `1px solid ${bdr}`, borderRadius: 5 }}>
                <div style={{ fontSize: 8, color: "#f59e0b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Sources & Disclaimer</div>
                <div style={{ fontSize: 8.5, color: t3, lineHeight: 1.5 }}>
                    Actuals: NICE 20-F (FY2022–2025), Q4 2025 Earnings, Cognigy Investor Deck. 11-line driver tree model with S-curve logistic adoption overlays. S-curves model market saturation as revenue approaches product ceilings via logistic functions. FY2025 includes Cognigy ($827M, Sep 2025). FY2026E consensus: $3.1–3.2B revenue. Not investment advice or validated TAM.
                </div>
            </div>
        </div>
    );
}
