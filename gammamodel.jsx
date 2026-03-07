import { useState, useMemo, useCallback, useEffect } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart } from "recharts";

// --- S-Curve / Logistic function ---
const logistic = (t, L, k, t0) => L / (1 + Math.exp(-k * (t - t0)));

// --- Inverse logistic for decline ---
const declineLogistic = (t, initialShare, floorShare, k, t0) => {
    const range = initialShare - floorShare;
    return floorShare + range / (1 + Math.exp(k * (t - t0)));
};

const CURRENT_YEAR = 2025;
const YEARS = Array.from({ length: 21 }, (_, i) => CURRENT_YEAR + i);

const DEFAULT_PRODUCTS = {
    pstn: {
        name: "PSTN / ISDN",
        type: "decline",
        color: "#ef4444",
        rev2024: 82,
        margin: 0.38,
        params: { initialShare: 1.0, floorShare: 0.02, k: 0.55, t0: 2028 },
        desc: "Legacy voice — UK PSTN switch-off 2025-2027"
    },
    sip: {
        name: "SIP Trunking",
        type: "growth_then_plateau",
        color: "#f59e0b",
        rev2024: 145,
        margin: 0.42,
        params: { peakShare: 1.55, k: 0.4, t0: 2027, decayAfter: 2033, decayK: 0.15 },
        desc: "Near-term PSTN replacement — peaks then cannibalised by UCaaS/WebRTC"
    },
    ucaas: {
        name: "UCaaS / Horizon",
        type: "growth",
        color: "#22c55e",
        rev2024: 195,
        margin: 0.52,
        params: { ceiling: 3.2, k: 0.35, t0: 2029 },
        desc: "Cloud PBX & unified comms — primary growth engine"
    },
    webrtc: {
        name: "WebRTC / CPaaS",
        type: "growth",
        color: "#3b82f6",
        rev2024: 28,
        margin: 0.58,
        params: { ceiling: 8.5, k: 0.3, t0: 2032 },
        desc: "Programmable comms & browser-native voice/video"
    },
    mpls: {
        name: "MPLS / Ethernet",
        type: "decline",
        color: "#a855f7",
        rev2024: 110,
        margin: 0.35,
        params: { initialShare: 1.0, floorShare: 0.08, k: 0.35, t0: 2031 },
        desc: "Legacy WAN — migrating to SD-WAN / SASE"
    },
    sdwan: {
        name: "SD-WAN / SASE",
        type: "growth",
        color: "#06b6d4",
        rev2024: 35,
        margin: 0.48,
        params: { ceiling: 5.5, k: 0.38, t0: 2030 },
        desc: "Software-defined networking — replacing MPLS"
    },
    mobile: {
        name: "Mobile / IoT",
        type: "growth",
        color: "#ec4899",
        rev2024: 42,
        margin: 0.3,
        params: { ceiling: 3.8, k: 0.28, t0: 2031 },
        desc: "MVNO & connected devices"
    },
    managed: {
        name: "Managed Services",
        type: "growth",
        color: "#84cc16",
        rev2024: 58,
        margin: 0.45,
        params: { ceiling: 2.8, k: 0.32, t0: 2029 },
        desc: "IT managed services, security, support contracts"
    }
};

const OPEX_ASSUMPTIONS = {
    fixedCostBase: 145,
    fixedCostGrowth: 0.025,
    variableCostRatio: 0.18,
    dAndA: 32,
    dAndAGrowth: 0.03,
    interestExpense: 8,
    taxRate: 0.25
};

export const DEFAULT_SETTINGS = {
    products: DEFAULT_PRODUCTS,
    opex: OPEX_ASSUMPTIONS
};

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
    if (Array.isArray(value)) {
        return value.map(deepClone);
    }
    if (isPlainObject(value)) {
        const copy = {};
        Object.keys(value).forEach((key) => {
            copy[key] = deepClone(value[key]);
        });
        return copy;
    }
    return value;
}

function deepMerge(defaultValue, overrideValue) {
    if (overrideValue === undefined) {
        return deepClone(defaultValue);
    }
    if (isPlainObject(defaultValue) && isPlainObject(overrideValue)) {
        const merged = {};
        const keys = new Set([...Object.keys(defaultValue), ...Object.keys(overrideValue)]);
        keys.forEach((key) => {
            merged[key] = deepMerge(defaultValue[key], overrideValue[key]);
        });
        return merged;
    }
    return deepClone(overrideValue);
}

function computeRevMultiplier(product, year) {
    const t = year;
    const p = product.params;
    if (product.type === "decline") {
        return declineLogistic(t, p.initialShare, p.floorShare, p.k, p.t0);
    }
    if (product.type === "growth") {
        return logistic(t, p.ceiling, p.k, p.t0);
    }
    if (product.type === "growth_then_plateau") {
        const growthPhase = logistic(t, p.peakShare, p.k, p.t0);
        if (t > p.decayAfter) {
            const dt = t - p.decayAfter;
            const decay = 1 - 0.45 * (1 - Math.exp(-p.decayK * dt));
            return growthPhase * decay;
        }
        return growthPhase;
    }
    return 1;
}

function cagr(start, end, years) {
    if (start <= 0 || end <= 0 || years <= 0) return 0;
    return (Math.pow(end / start, 1 / years) - 1) * 100;
}

const fmt = (n) => {
    const isNeg = n < 0;
    const abs = Math.abs(n);
    const prefix = isNeg ? "-£" : "£";
    return abs >= 1000 ? `${prefix}${(abs / 1000).toFixed(1)}bn` : `${prefix}${abs.toFixed(0)}m`;
};
const fmtPct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtMargin = (n) => `${(n * 100).toFixed(1)}%`;

const TABS = ["Dashboard", "Product Curves", "P&L Model", "Assumptions"];

const SliderParam = ({ label, value, min, max, step, onChange, unit = "" }) => (
    <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
            <span>{label}</span>
            <span style={{ color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{typeof value === "number" ? (step < 1 ? value.toFixed(2) : value.toFixed(0)) : value}{unit}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#3b82f6", height: 4 }} />
    </div>
);

export default function GammaModel({ initialSettings = DEFAULT_SETTINGS, onSettingsChange }) {
    const resolvedInitialSettings = useMemo(
        () => deepMerge(DEFAULT_SETTINGS, initialSettings),
        [initialSettings]
    );
    const [activeTab, setActiveTab] = useState(0);
    const [products, setProducts] = useState(() => deepClone(resolvedInitialSettings.products));
    const [opex, setOpex] = useState(() => deepClone(resolvedInitialSettings.opex));
    const [selectedProduct, setSelectedProduct] = useState("ucaas");

    const updateParam = useCallback((key, param, val) => {
        setProducts(prev => ({
            ...prev,
            [key]: { ...prev[key], params: { ...prev[key].params, [param]: val } }
        }));
    }, []);

    const updateProduct = useCallback((key, field, val) => {
        setProducts(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: val }
        }));
    }, []);

    // Compute all yearly data
    const yearlyData = useMemo(() => {
        return YEARS.map(year => {
            const row = { year };
            let totalRev = 0;
            let weightedMargin = 0;
            Object.entries(products).forEach(([key, prod]) => {
                const mult = computeRevMultiplier(prod, year);
                const rev = prod.rev2024 * mult;
                row[key] = rev;
                row[`${key}_margin`] = prod.margin;
                row[`${key}_gp`] = rev * prod.margin;
                totalRev += rev;
                weightedMargin += rev * prod.margin;
            });
            row.totalRev = totalRev;
            row.blendedMargin = totalRev > 0 ? weightedMargin / totalRev : 0;
            row.grossProfit = weightedMargin;

            const yearsFromBase = year - CURRENT_YEAR;
            row.fixedCosts = opex.fixedCostBase * Math.pow(1 + opex.fixedCostGrowth, yearsFromBase);
            row.variableCosts = totalRev * opex.variableCostRatio;
            row.totalOpex = row.fixedCosts + row.variableCosts;
            row.ebitda = row.grossProfit - row.totalOpex;
            row.ebitdaMargin = totalRev > 0 ? row.ebitda / totalRev : 0;
            row.dAndA = opex.dAndA * Math.pow(1 + opex.dAndAGrowth, yearsFromBase);
            row.ebit = row.ebitda - row.dAndA;
            row.interestExpense = opex.interestExpense;
            row.pbt = row.ebit - row.interestExpense;
            row.tax = Math.max(0, row.pbt * opex.taxRate);
            row.netIncome = row.pbt - row.tax;
            row.netMargin = totalRev > 0 ? row.netIncome / totalRev : 0;
            return row;
        });
    }, [products, opex]);

    const dataByYear = useMemo(() => Object.fromEntries(yearlyData.map(d => [d.year, d])), [yearlyData]);

    const baseYear = yearlyData[0];
    const y2030 = dataByYear[2030];
    const y2035 = dataByYear[2035];
    const y2040 = dataByYear[2040];
    const y2045 = yearlyData[yearlyData.length - 1];

    const revCAGR2030 = cagr(baseYear.totalRev, y2030.totalRev, 5);
    const revCAGR2040 = cagr(baseYear.totalRev, y2040.totalRev, 15);
    const niCAGR2030 = baseYear.netIncome > 0 && y2030.netIncome > 0 ? cagr(baseYear.netIncome, y2030.netIncome, 5) : null;
    const niCAGR2040 = baseYear.netIncome > 0 && y2040.netIncome > 0 ? cagr(baseYear.netIncome, y2040.netIncome, 15) : null;

    useEffect(() => {
        if (typeof onSettingsChange === "function") {
            onSettingsChange({
                products: deepClone(products),
                opex: deepClone(opex)
            });
        }
    }, [products, opex, onSettingsChange]);

    // Styles
    const bg = "#0c1222";
    const cardBg = "#111b2e";
    const border = "#1e2d4a";
    const textPrimary = "#e2e8f0";
    const textSecondary = "#94a3b8";
    const accent = "#3b82f6";

    const cardStyle = {
        background: cardBg, borderRadius: 8, border: `1px solid ${border}`,
        padding: 16, marginBottom: 12
    };

    const kpiStyle = (color = accent) => ({
        ...cardStyle,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minWidth: 120, flex: 1, borderTop: `3px solid ${color}`
    });

    return (
        <div style={{
            background: bg, color: textPrimary, fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
            minHeight: "100vh", padding: "12px 16px", fontSize: 13, lineHeight: 1.5,
            maxWidth: 1200, margin: "0 auto"
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>Γ</div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px" }}>Gamma Communications PLC</h1>
                            <span style={{ fontSize: 11, color: textSecondary }}>Product Exposure & S-Curve Scenario Model · LON:GAMA</span>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: textSecondary }}>
                    <div>Base Year: FY2024E</div>
                    <div>Horizon: 2025–2045</div>
                </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "#0a0f1a", borderRadius: 6, padding: 3 }}>
                {TABS.map((t, i) => (
                    <button key={t} onClick={() => setActiveTab(i)} style={{
                        flex: 1, padding: "8px 10px", border: "none", borderRadius: 5, cursor: "pointer",
                        fontSize: 12, fontWeight: activeTab === i ? 600 : 400, transition: "all 0.2s",
                        background: activeTab === i ? accent : "transparent",
                        color: activeTab === i ? "#fff" : textSecondary
                    }}>{t}</button>
                ))}
            </div>

            {/* ==================== DASHBOARD ==================== */}
            {activeTab === 0 && (
                <div>
                    {/* KPI Row */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                        {[
                            { label: "FY2025E Rev", value: fmt(baseYear.totalRev), sub: "Total Group", color: accent },
                            { label: "FY2030E Rev", value: fmt(y2030.totalRev), sub: `CAGR ${fmtPct(revCAGR2030)}`, color: revCAGR2030 >= 0 ? "#22c55e" : "#ef4444" },
                            { label: "FY2040E Rev", value: fmt(y2040.totalRev), sub: `CAGR ${fmtPct(revCAGR2040)}`, color: revCAGR2040 >= 0 ? "#22c55e" : "#ef4444" },
                            { label: "EBITDA Margin '30", value: fmtMargin(y2030.ebitdaMargin), sub: `vs ${fmtMargin(baseYear.ebitdaMargin)} today`, color: "#f59e0b" },
                            { label: "Net Income '40", value: fmt(y2040.netIncome), sub: niCAGR2040 !== null ? `CAGR ${fmtPct(niCAGR2040)}` : "n/a", color: "#a855f7" }
                        ].map((kpi, i) => (
                            <div key={i} style={kpiStyle(kpi.color)}>
                                <div style={{ fontSize: 10, color: textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{kpi.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: kpi.color }}>{kpi.value}</div>
                                <div style={{ fontSize: 10, color: textSecondary, marginTop: 2 }}>{kpi.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Stacked area — revenue by product */}
                    <div style={cardStyle}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                            <span>Revenue by Product Line (£m)</span>
                            <span style={{ fontSize: 10, color: textSecondary }}>Stacked Area · S-Curve Driven</span>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={yearlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={border} />
                                <XAxis dataKey="year" tick={{ fill: textSecondary, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: textPrimary }}
                                    formatter={(v) => [`£${v.toFixed(0)}m`]} labelFormatter={(l) => `FY${l}E`} />
                                {Object.entries(products).map(([key, p]) => (
                                    <Area key={key} type="monotone" dataKey={key} stackId="1" fill={p.color} stroke={p.color}
                                        fillOpacity={0.7} name={p.name} />
                                ))}
                                <ReferenceLine x={2030} stroke="#ffffff30" strokeDasharray="4 4" label={{ value: "2030", fill: textSecondary, fontSize: 10 }} />
                                <ReferenceLine x={2040} stroke="#ffffff30" strokeDasharray="4 4" label={{ value: "2040", fill: textSecondary, fontSize: 10 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* EBITDA & Net Income */}
                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ ...cardStyle, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>EBITDA & Net Income (£m)</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <ComposedChart data={yearlyData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                                    <XAxis dataKey="year" tick={{ fill: textSecondary, fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fill: textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: textPrimary }}
                                        formatter={(v) => [`£${v.toFixed(0)}m`]} labelFormatter={(l) => `FY${l}E`} />
                                    <Bar dataKey="ebitda" fill="#3b82f680" name="EBITDA" radius={[2, 2, 0, 0]} />
                                    <Line type="monotone" dataKey="netIncome" stroke="#22c55e" strokeWidth={2} dot={false} name="Net Income" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ ...cardStyle, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Margin Evolution (%)</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={yearlyData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                                    <XAxis dataKey="year" tick={{ fill: textSecondary, fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fill: textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                                    <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: textPrimary }}
                                        formatter={(v) => [`${(v * 100).toFixed(1)}%`]} labelFormatter={(l) => `FY${l}E`} />
                                    <Line type="monotone" dataKey="blendedMargin" stroke="#f59e0b" strokeWidth={2} dot={false} name="Gross Margin" />
                                    <Line type="monotone" dataKey="ebitdaMargin" stroke="#3b82f6" strokeWidth={2} dot={false} name="EBITDA Margin" />
                                    <Line type="monotone" dataKey="netMargin" stroke="#22c55e" strokeWidth={2} dot={false} name="Net Margin" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Revenue mix snapshot table */}
                    <div style={cardStyle}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Revenue Mix Snapshot (£m)</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${border}` }}>
                                        <th style={{ textAlign: "left", padding: "6px 8px", color: textSecondary, fontWeight: 500 }}>Product</th>
                                        {[2025, 2028, 2030, 2035, 2040, 2045].map(y => (
                                            <th key={y} style={{ textAlign: "right", padding: "6px 8px", color: textSecondary, fontWeight: 500 }}>FY{y}E</th>
                                        ))}
                                        <th style={{ textAlign: "right", padding: "6px 8px", color: textSecondary, fontWeight: 500 }}>CAGR→30</th>
                                        <th style={{ textAlign: "right", padding: "6px 8px", color: textSecondary, fontWeight: 500 }}>CAGR→40</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(products).map(([key, p]) => {
                                        const vals = [2025, 2028, 2030, 2035, 2040, 2045].map(y => dataByYear[y]?.[key] || 0);
                                        const c30 = cagr(vals[0], vals[2], 5);
                                        const c40 = cagr(vals[0], vals[4], 15);
                                        return (
                                            <tr key={key} style={{ borderBottom: `1px solid ${border}22` }}>
                                                <td style={{ padding: "5px 8px" }}>
                                                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: p.color, marginRight: 6 }} />
                                                    {p.name}
                                                </td>
                                                {vals.map((v, i) => (
                                                    <td key={i} style={{ textAlign: "right", padding: "5px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                                                        {v.toFixed(0)}
                                                    </td>
                                                ))}
                                                <td style={{ textAlign: "right", padding: "5px 8px", fontFamily: "'JetBrains Mono', monospace", color: c30 >= 0 ? "#22c55e" : "#ef4444" }}>{fmtPct(c30)}</td>
                                                <td style={{ textAlign: "right", padding: "5px 8px", fontFamily: "'JetBrains Mono', monospace", color: c40 >= 0 ? "#22c55e" : "#ef4444" }}>{fmtPct(c40)}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ borderTop: `2px solid ${border}`, fontWeight: 700 }}>
                                        <td style={{ padding: "6px 8px" }}>Total Group</td>
                                        {[2025, 2028, 2030, 2035, 2040, 2045].map(y => {
                                            const d = dataByYear[y];
                                            return <td key={y} style={{ textAlign: "right", padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace" }}>{d.totalRev.toFixed(0)}</td>;
                                        })}
                                        <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace", color: revCAGR2030 >= 0 ? "#22c55e" : "#ef4444" }}>{fmtPct(revCAGR2030)}</td>
                                        <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "'JetBrains Mono', monospace", color: revCAGR2040 >= 0 ? "#22c55e" : "#ef4444" }}>{fmtPct(revCAGR2040)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== PRODUCT CURVES ==================== */}
            {activeTab === 1 && (
                <div>
                    <div style={{ display: "flex", gap: 12 }}>
                        {/* Product selector */}
                        <div style={{ ...cardStyle, width: 220, flexShrink: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Product Lines</div>
                            {Object.entries(products).map(([key, p]) => (
                                <button key={key} onClick={() => setSelectedProduct(key)} style={{
                                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px",
                                    border: "none", borderRadius: 5, cursor: "pointer", marginBottom: 3, textAlign: "left",
                                    background: selectedProduct === key ? `${p.color}20` : "transparent",
                                    borderLeft: selectedProduct === key ? `3px solid ${p.color}` : "3px solid transparent",
                                    color: selectedProduct === key ? textPrimary : textSecondary, fontSize: 12, transition: "all 0.15s"
                                }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                                    <span style={{ fontWeight: selectedProduct === key ? 600 : 400 }}>{p.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Curve detail */}
                        <div style={{ flex: 1 }}>
                            {(() => {
                                const prod = products[selectedProduct];
                                const curveData = YEARS.map(year => {
                                    const mult = computeRevMultiplier(prod, year);
                                    return { year, revenue: prod.rev2024 * mult, multiplier: mult };
                                });

                                return (
                                    <>
                                        <div style={cardStyle}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: prod.color }}>{prod.name}</h3>
                                                    <p style={{ margin: "4px 0 0", fontSize: 11, color: textSecondary }}>{prod.desc}</p>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: textSecondary }}>FY2024E Base Rev</div>
                                                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>£{prod.rev2024}m</div>
                                                </div>
                                            </div>
                                            <ResponsiveContainer width="100%" height={220}>
                                                <AreaChart data={curveData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                                                    <defs>
                                                        <linearGradient id={`grad-${selectedProduct}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={prod.color} stopOpacity={0.4} />
                                                            <stop offset="95%" stopColor={prod.color} stopOpacity={0.05} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={border} />
                                                    <XAxis dataKey="year" tick={{ fill: textSecondary, fontSize: 10 }} tickLine={false} />
                                                    <YAxis tick={{ fill: textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} />
                                                    <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${border}`, borderRadius: 6, fontSize: 11, color: textPrimary }}
                                                        formatter={(v, name) => name === "revenue" ? [`£${v.toFixed(0)}m`, "Revenue"] : [`${v.toFixed(2)}x`, "Multiplier"]}
                                                        labelFormatter={l => `FY${l}E`} />
                                                    <Area type="monotone" dataKey="revenue" stroke={prod.color} strokeWidth={2.5} fill={`url(#grad-${selectedProduct})`} name="revenue" />
                                                    <ReferenceLine x={2030} stroke="#ffffff25" strokeDasharray="4 4" />
                                                    <ReferenceLine x={2040} stroke="#ffffff25" strokeDasharray="4 4" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* S-curve parameters */}
                                        <div style={cardStyle}>
                                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                                                <span>S-Curve Parameters</span>
                                                <span style={{ fontSize: 10, color: textSecondary, fontStyle: "italic" }}>
                                                    {prod.type === "decline" ? "Inverse Logistic Decline" : prod.type === "growth" ? "Logistic Growth" : "Growth → Plateau → Decay"}
                                                </span>
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                                                <SliderParam label="Base Revenue (£m)" value={prod.rev2024} min={5} max={400} step={5}
                                                    onChange={v => updateProduct(selectedProduct, "rev2024", v)} unit="m" />
                                                <SliderParam label="Gross Margin" value={prod.margin} min={0.1} max={0.75} step={0.01}
                                                    onChange={v => updateProduct(selectedProduct, "margin", v)} />

                                                {prod.type === "decline" && <>
                                                    <SliderParam label="Decline Steepness (k)" value={prod.params.k} min={0.1} max={1.2} step={0.05}
                                                        onChange={v => updateParam(selectedProduct, "k", v)} />
                                                    <SliderParam label="Inflection Year (t₀)" value={prod.params.t0} min={2025} max={2040} step={1}
                                                        onChange={v => updateParam(selectedProduct, "t0", v)} />
                                                    <SliderParam label="Floor Share" value={prod.params.floorShare} min={0} max={0.3} step={0.01}
                                                        onChange={v => updateParam(selectedProduct, "floorShare", v)} />
                                                </>}

                                                {prod.type === "growth" && <>
                                                    <SliderParam label="Ceiling Multiplier" value={prod.params.ceiling} min={1} max={15} step={0.5}
                                                        onChange={v => updateParam(selectedProduct, "ceiling", v)} unit="x" />
                                                    <SliderParam label="Growth Steepness (k)" value={prod.params.k} min={0.1} max={0.8} step={0.05}
                                                        onChange={v => updateParam(selectedProduct, "k", v)} />
                                                    <SliderParam label="Inflection Year (t₀)" value={prod.params.t0} min={2025} max={2040} step={1}
                                                        onChange={v => updateParam(selectedProduct, "t0", v)} />
                                                </>}

                                                {prod.type === "growth_then_plateau" && <>
                                                    <SliderParam label="Peak Multiplier" value={prod.params.peakShare} min={1} max={4} step={0.05}
                                                        onChange={v => updateParam(selectedProduct, "peakShare", v)} unit="x" />
                                                    <SliderParam label="Growth Steepness (k)" value={prod.params.k} min={0.1} max={0.8} step={0.05}
                                                        onChange={v => updateParam(selectedProduct, "k", v)} />
                                                    <SliderParam label="Growth Inflection" value={prod.params.t0} min={2025} max={2035} step={1}
                                                        onChange={v => updateParam(selectedProduct, "t0", v)} />
                                                    <SliderParam label="Decay Onset" value={prod.params.decayAfter} min={2028} max={2042} step={1}
                                                        onChange={v => updateParam(selectedProduct, "decayAfter", v)} />
                                                    <SliderParam label="Decay Rate" value={prod.params.decayK} min={0.05} max={0.5} step={0.05}
                                                        onChange={v => updateParam(selectedProduct, "decayK", v)} />
                                                </>}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== P&L MODEL ==================== */}
            {activeTab === 2 && (
                <div>
                    <div style={cardStyle}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Modelled Income Statement (£m)</div>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${border}` }}>
                                        <th style={{ textAlign: "left", padding: "6px 8px", color: textSecondary, fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif" }}>Line Item</th>
                                        {[2025, 2027, 2028, 2030, 2032, 2035, 2038, 2040, 2043, 2045].map(y => (
                                            <th key={y} style={{ textAlign: "right", padding: "6px 6px", color: textSecondary, fontWeight: 500, fontSize: 10 }}>FY{y}E</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { key: "totalRev", label: "Revenue", bold: true },
                                        { key: "grossProfit", label: "Gross Profit" },
                                        { key: "blendedMargin", label: "  Gross Margin %", isPct: true, indent: true },
                                        { key: "totalOpex", label: "Total OpEx", negative: true },
                                        { key: "ebitda", label: "EBITDA", bold: true },
                                        { key: "ebitdaMargin", label: "  EBITDA Margin %", isPct: true, indent: true },
                                        { key: "dAndA", label: "D&A", negative: true },
                                        { key: "ebit", label: "EBIT" },
                                        { key: "interestExpense", label: "Interest", negative: true },
                                        { key: "pbt", label: "Profit Before Tax" },
                                        { key: "tax", label: "Tax", negative: true },
                                        { key: "netIncome", label: "Net Income", bold: true, highlight: true },
                                        { key: "netMargin", label: "  Net Margin %", isPct: true, indent: true }
                                    ].map((row, ri) => {
                                        const years = [2025, 2027, 2028, 2030, 2032, 2035, 2038, 2040, 2043, 2045];
                                        return (
                                            <tr key={ri} style={{
                                                borderBottom: `1px solid ${border}22`,
                                                background: row.highlight ? `${accent}08` : "transparent"
                                            }}>
                                                <td style={{
                                                    padding: "5px 8px", paddingLeft: row.indent ? 24 : 8,
                                                    fontFamily: "'IBM Plex Sans', sans-serif",
                                                    fontWeight: row.bold ? 700 : 400,
                                                    color: row.indent ? textSecondary : textPrimary,
                                                    fontSize: row.indent ? 10 : 11
                                                }}>{row.label.trim()}</td>
                                                {years.map(y => {
                                                    const d = dataByYear[y];
                                                    const val = d[row.key] || 0;
                                                    const formattedVal = row.isPct ?
                                                        `${(val * 100).toFixed(1)}%` :
                                                        (val < 0 ? `(${Math.abs(val).toFixed(0)})` : (row.negative && val > 0 ? `(${val.toFixed(0)})` : val.toFixed(0)));
                                                    return (
                                                        <td key={y} style={{
                                                            textAlign: "right", padding: "5px 6px", fontSize: 11,
                                                            fontWeight: row.bold ? 600 : 400,
                                                            color: row.isPct ? textSecondary : (val < 0 && !row.negative ? "#ef4444" : textPrimary)
                                                        }}>
                                                            {formattedVal}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CAGR summary cards */}
                    <div style={{ display: "flex", gap: 12 }}>
                        {[
                            { horizon: "2025–2030 (5yr)", revCagr: revCAGR2030, niCagr: niCAGR2030, ebitdaStart: baseYear.ebitdaMargin, ebitdaEnd: y2030.ebitdaMargin },
                            { horizon: "2025–2035 (10yr)", revCagr: cagr(baseYear.totalRev, y2035.totalRev, 10), niCagr: baseYear.netIncome > 0 && y2035.netIncome > 0 ? cagr(baseYear.netIncome, y2035.netIncome, 10) : null, ebitdaStart: baseYear.ebitdaMargin, ebitdaEnd: y2035.ebitdaMargin },
                            { horizon: "2025–2040 (15yr)", revCagr: revCAGR2040, niCagr: niCAGR2040, ebitdaStart: baseYear.ebitdaMargin, ebitdaEnd: y2040.ebitdaMargin }
                        ].map((block, i) => (
                            <div key={i} style={{ ...cardStyle, flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10, color: accent }}>{block.horizon}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: textSecondary, fontSize: 11 }}>Revenue CAGR</span>
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: block.revCagr >= 0 ? "#22c55e" : "#ef4444" }}>{fmtPct(block.revCagr)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: textSecondary, fontSize: 11 }}>Net Income CAGR</span>
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: (block.niCagr || 0) >= 0 ? "#22c55e" : "#ef4444" }}>{block.niCagr !== null ? fmtPct(block.niCagr) : "n/a"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: textSecondary, fontSize: 11 }}>EBITDA Margin Δ</span>
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: block.ebitdaEnd >= block.ebitdaStart ? "#22c55e" : "#ef4444" }}>
                                            {((block.ebitdaEnd - block.ebitdaStart) * 100).toFixed(1)}bps
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ==================== ASSUMPTIONS ==================== */}
            {activeTab === 3 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={cardStyle}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: accent }}>Cost Structure</div>
                        <SliderParam label="Fixed Cost Base (£m)" value={opex.fixedCostBase} min={50} max={300} step={5}
                            onChange={v => setOpex(prev => ({ ...prev, fixedCostBase: v }))} unit="m" />
                        <SliderParam label="Fixed Cost Annual Growth" value={opex.fixedCostGrowth} min={0} max={0.1} step={0.005}
                            onChange={v => setOpex(prev => ({ ...prev, fixedCostGrowth: v }))} />
                        <SliderParam label="Variable Cost Ratio (% of Rev)" value={opex.variableCostRatio} min={0.05} max={0.4} step={0.01}
                            onChange={v => setOpex(prev => ({ ...prev, variableCostRatio: v }))} />
                    </div>
                    <div style={cardStyle}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: accent }}>Below EBITDA</div>
                        <SliderParam label="D&A Base (£m)" value={opex.dAndA} min={10} max={80} step={2}
                            onChange={v => setOpex(prev => ({ ...prev, dAndA: v }))} unit="m" />
                        <SliderParam label="D&A Annual Growth" value={opex.dAndAGrowth} min={0} max={0.1} step={0.005}
                            onChange={v => setOpex(prev => ({ ...prev, dAndAGrowth: v }))} />
                        <SliderParam label="Interest Expense (£m)" value={opex.interestExpense} min={0} max={30} step={1}
                            onChange={v => setOpex(prev => ({ ...prev, interestExpense: v }))} unit="m" />
                        <SliderParam label="Tax Rate" value={opex.taxRate} min={0.15} max={0.35} step={0.01}
                            onChange={v => setOpex(prev => ({ ...prev, taxRate: v }))} />
                    </div>
                    <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: "#f59e0b" }}>Key Model Assumptions & Notes</div>
                        <div style={{ fontSize: 11, color: textSecondary, lineHeight: 1.7 }}>
                            <p style={{ margin: "0 0 8px" }}><strong style={{ color: textPrimary }}>PSTN / ISDN:</strong> UK Openreach PSTN switch-off programme targets completion by Jan 2027. Modelled as inverse logistic decline from FY2024 base with configurable floor (residual managed migration / legacy contracts).</p>
                            <p style={{ margin: "0 0 8px" }}><strong style={{ color: textPrimary }}>SIP Trunking:</strong> Near-term beneficiary of PSTN migration. Growth-then-plateau S-curve reflects initial demand surge followed by cannibalisation as enterprises move to UCaaS/WebRTC-native architectures.</p>
                            <p style={{ margin: "0 0 8px" }}><strong style={{ color: textPrimary }}>UCaaS / Horizon:</strong> Gamma's core cloud comms platform. Logistic growth curve assumes continued SME/mid-market penetration across UK & European markets (Netherlands, Germany, Spain via Epsilon).</p>
                            <p style={{ margin: "0 0 8px" }}><strong style={{ color: textPrimary }}>WebRTC / CPaaS:</strong> High-ceiling growth from low base. Represents programmable communications, embedded voice/video, and API-driven revenue. Highest margin product line.</p>
                            <p style={{ margin: "0 0 8px" }}><strong style={{ color: textPrimary }}>MPLS / Ethernet:</strong> Legacy networking declining as SD-WAN and SASE gain traction. Slower decline than PSTN given longer enterprise WAN contract cycles.</p>
                            <p style={{ margin: "0 0 8px" }}><strong style={{ color: textPrimary }}>SD-WAN / SASE:</strong> Direct MPLS replacement with higher margins. Growth curve tracks enterprise digital transformation adoption.</p>
                            <p style={{ margin: "0 0 8px" }}><strong style={{ color: textPrimary }}>Mobile / IoT:</strong> MVNO and connected device revenues. Moderate growth, lower margin — volume play.</p>
                            <p style={{ margin: "0 0 0" }}><strong style={{ color: textPrimary }}>Managed Services:</strong> Recurring IT managed services, security, and support contracts. Steady growth with strong margin contribution.</p>
                        </div>
                    </div>
                    <div style={{ ...cardStyle, gridColumn: "1 / -1", background: "#0d1424", borderColor: "#f59e0b30" }}>
                        <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Disclaimer</div>
                        <div style={{ fontSize: 10, color: textSecondary, lineHeight: 1.6 }}>
                            This is a scenario modelling tool for illustrative purposes only. Revenue base figures are estimates derived from publicly available Gamma Communications PLC annual reports and consensus estimates. All forward projections are model-generated based on user-configurable S-curve assumptions and do not represent forecasts, guidance, or investment advice. Actual results will differ materially. Not for distribution.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
