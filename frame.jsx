import { useState } from "react";

const frameworks = [
    {
        id: 1,
        label: "1",
        title: "Customer Need Complexity",
        axis: "Y-axis in the 2×2",
        subtitle: "What does the customer actually require?",
        color: "#1B4D3E",
        accent: "#2E8B6A",
        logic:
            "Segment every support interaction by what the customer needs to get done. Each bucket is mutually exclusive — every ticket falls into exactly one. This reveals which interactions genuinely need local, human presence vs. those that don't.",
        dimensions: [
            {
                name: "Transactional",
                desc: "Status checks, password resets, order tracking, FAQs — no judgment required",
                implication: "Fully centralisable or automatable; no local dependency",
            },
            {
                name: "Procedural",
                desc: "Guided troubleshooting, claims filing, onboarding walkthroughs — follows a script",
                implication: "Centralisable with good tooling and knowledge bases",
            },
            {
                name: "Consultative",
                desc: "Product advice, plan changes, account optimisation — requires context and expertise",
                implication: "Centralisable if agents have deep product training; language/culture matters",
            },
            {
                name: "Relational",
                desc: "Escalations, retention, VIP management, complaints — trust and rapport are critical",
                implication: "Hardest to centralise; local presence may be a genuine differentiator",
            },
        ],
        exhaust:
            "Every inbound interaction maps to exactly one tier. The mix per market tells you how much local presence actually protects.",
    },
    {
        id: 2,
        label: "2",
        title: "Channel Substitutability",
        subtitle: "Can the channel be moved, merged, or removed?",
        color: "#1A3A5C",
        accent: "#3A7BD5",
        logic:
            "For each support channel (WhatsApp, iMessage, voice calls, in-person), assess whether it can be substituted without destroying value. MECE across three levers that together cover every possible action on a channel.",
        dimensions: [
            {
                name: "Automate",
                desc: "Can a bot or self-serve flow handle ≥80% of this channel's volume at acceptable CSAT?",
                implication: "If yes → deflect volume before deciding on location",
            },
            {
                name: "Relocate",
                desc: "Can the human handling of this channel move to a central hub without degrading quality?",
                implication: "Depends on language, time-zone, and regulatory constraints",
            },
            {
                name: "Eliminate",
                desc: "Can the channel be retired entirely and traffic migrated to a remaining channel?",
                implication: "Reduces surface area; only works if customers accept the migration",
            },
        ],
        exhaust:
            "For any given channel, you either automate it, relocate it, or eliminate it (or leave as-is — the null case). These three transformation levers are mutually exclusive and collectively cover all options.",
    },
    {
        id: 3,
        label: "3",
        title: "Centralization Readiness",
        axis: "X-axis in the 2×2",
        subtitle: "Is the market structurally ready to move?",
        color: "#5C1A3A",
        accent: "#C74B7A",
        logic:
            "Even if a market's interactions are simple and channels are substitutable, structural barriers may block centralization. This framework captures every enabling condition — MECE across four domains.",
        dimensions: [
            {
                name: "Regulatory & Legal",
                desc: "Data residency laws, labour regulations, licensing requirements, language mandates",
                implication: "Hard blockers — must be cleared first regardless of business case",
            },
            {
                name: "Technology & Infrastructure",
                desc: "CRM integration, routing capability, telephony setup, knowledge base completeness",
                implication: "Determines timeline and investment required to centralise",
            },
            {
                name: "Talent & Operations",
                desc: "Hub language coverage, training capacity, workforce availability, shift planning",
                implication: "Determines whether the hub can absorb the volume at quality",
            },
            {
                name: "Commercial & Brand Risk",
                desc: "Revenue at risk, competitive differentiation from local presence, customer expectations",
                implication: "Quantifies the downside — the cost of getting it wrong",
            },
        ],
        exhaust:
            "Any barrier to centralisation falls into one of these four buckets. A market is 'ready' only when all four are green.",
    },
];

const quadrants = [
    {
        id: "Q1",
        gridArea: "1 / 1",
        title: "Optimise in Place",
        action: "Automate channels, keep local teams",
        desc: "Customers need high-touch, relational support AND structural barriers block centralization. Focus on channel automation and cost efficiency within the local model.",
        color: "#2E8B6A",
        bg: "#EDF7F1",
        tagX: "Low",
        tagY: "High",
    },
    {
        id: "Q2",
        gridArea: "1 / 2",
        title: "Phased Migration",
        action: "Hub & spoke, staged transition",
        desc: "Customers need high-touch support BUT the market is structurally ready to move. Centralise procedural & transactional tiers first; retain local spokes for relational work.",
        color: "#3A7BD5",
        bg: "#EDF2FA",
        tagX: "High",
        tagY: "High",
    },
    {
        id: "Q3",
        gridArea: "2 / 1",
        title: "Deprioritise or Exit",
        action: "Partner model or self-serve only",
        desc: "Interactions are simple enough to not need local presence, but barriers also prevent efficient centralisation. Shrink investment: self-serve, outsource, or exit.",
        color: "#8B8B8B",
        bg: "#F4F4F4",
        tagX: "Low",
        tagY: "Low",
    },
    {
        id: "Q4",
        gridArea: "2 / 2",
        title: "Full Centralisation",
        action: "Close local, route to hub",
        desc: "Most interactions are transactional/procedural AND the market is ready. Close local presence and centralise all channels into the hub immediately.",
        color: "#C74B7A",
        bg: "#FAF0F4",
        tagX: "High",
        tagY: "Low",
    },
];

export default function App() {
    const [activeTab, setActiveTab] = useState("frameworks");
    const [expandedFw, setExpandedFw] = useState(1);
    const [hoveredQ, setHoveredQ] = useState(null);

    return (
        <div
            style={{
                fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                background: "#FAFAF8",
                minHeight: "100vh",
                color: "#1A1A1A",
            }}
        >
            <link
                href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap"
                rel="stylesheet"
            />

            {/* Header */}
            <div
                style={{
                    background: "linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)",
                    padding: "36px 40px 28px",
                    borderBottom: "3px solid #E8C547",
                }}
            >
                <div style={{ maxWidth: 960, margin: "0 auto" }}>
                    <div
                        style={{
                            fontFamily: "'Fraunces', Georgia, serif",
                            fontSize: 11,
                            letterSpacing: "3px",
                            textTransform: "uppercase",
                            color: "#E8C547",
                            marginBottom: 8,
                        }}
                    >
                        Strategic Decision Frameworks
                    </div>
                    <h1
                        style={{
                            fontFamily: "'Fraunces', Georgia, serif",
                            fontSize: 26,
                            fontWeight: 700,
                            color: "#FFFFFF",
                            margin: 0,
                            lineHeight: 1.25,
                        }}
                    >
                        Centralising Human Support Presence
                    </h1>
                    <p
                        style={{
                            color: "#A0A0A0",
                            fontSize: 13.5,
                            marginTop: 6,
                            marginBottom: 0,
                            maxWidth: 640,
                            lineHeight: 1.5,
                        }}
                    >
                        Three MECE frameworks to structure the analysis, then a synthesised
                        2×2 matrix that combines their outputs into a single decision view
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 40px" }}>
                <div style={{ display: "flex", gap: 0, marginTop: -1 }}>
                    {[
                        { key: "frameworks", label: "Three Frameworks" },
                        { key: "matrix", label: "Synthesised 2×2" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: "14px 28px",
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: "'DM Sans', sans-serif",
                                letterSpacing: "0.4px",
                                border: "none",
                                borderBottom:
                                    activeTab === tab.key
                                        ? "3px solid #E8C547"
                                        : "3px solid transparent",
                                background: activeTab === tab.key ? "#FAFAF8" : "transparent",
                                color: activeTab === tab.key ? "#1A1A1A" : "#888",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 40px 60px" }}>
                {/* FRAMEWORKS TAB */}
                {activeTab === "frameworks" && (
                    <div>
                        {/* Flow selector */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0,
                                marginBottom: 28,
                            }}
                        >
                            {frameworks.map((fw, i) => (
                                <div key={fw.id} style={{ display: "flex", alignItems: "center" }}>
                                    <button
                                        onClick={() => setExpandedFw(fw.id)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "10px 18px",
                                            borderRadius: 8,
                                            border:
                                                expandedFw === fw.id
                                                    ? `2px solid ${fw.accent}`
                                                    : "2px solid #E4E4E0",
                                            background: expandedFw === fw.id ? "#FFF" : "#FAFAF8",
                                            boxShadow:
                                                expandedFw === fw.id
                                                    ? `0 2px 12px ${fw.accent}20`
                                                    : "none",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: "50%",
                                                background: fw.color,
                                                color: "#FFF",
                                                fontSize: 12,
                                                fontWeight: 700,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {fw.label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 12.5,
                                                fontWeight: 600,
                                                color: expandedFw === fw.id ? fw.color : "#888",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {fw.title}
                                        </span>
                                        {fw.axis && (
                                            <span
                                                style={{
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    color: fw.accent,
                                                    background: `${fw.accent}12`,
                                                    border: `1px solid ${fw.accent}28`,
                                                    borderRadius: 999,
                                                    padding: "4px 8px",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {fw.axis}
                                            </span>
                                        )}
                                    </button>
                                    {i < frameworks.length - 1 && (
                                        <span style={{ margin: "0 6px", color: "#CCC", fontSize: 18 }}>
                                            →
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Expanded Detail */}
                        {frameworks
                            .filter((fw) => fw.id === expandedFw)
                            .map((fw) => (
                                <div
                                    key={fw.id}
                                    style={{
                                        background: "#FFF",
                                        borderRadius: 10,
                                        border: `1px solid ${fw.accent}40`,
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            background: `linear-gradient(135deg, ${fw.color} 0%, ${fw.accent} 100%)`,
                                            padding: "20px 28px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 11,
                                                letterSpacing: "2px",
                                                textTransform: "uppercase",
                                                color: "rgba(255,255,255,0.6)",
                                                marginBottom: 4,
                                            }}
                                        >
                                            Framework {fw.label}
                                        </div>
                                        {fw.axis && (
                                            <div
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    padding: "4px 10px",
                                                    borderRadius: 999,
                                                    border: "1px solid rgba(255,255,255,0.22)",
                                                    background: "rgba(255,255,255,0.10)",
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    letterSpacing: "0.8px",
                                                    textTransform: "uppercase",
                                                    color: "#FFF",
                                                    marginBottom: 10,
                                                }}
                                            >
                                                {fw.axis}
                                            </div>
                                        )}
                                        <h2
                                            style={{
                                                fontFamily: "'Fraunces', Georgia, serif",
                                                fontSize: 21,
                                                fontWeight: 700,
                                                color: "#FFF",
                                                margin: 0,
                                            }}
                                        >
                                            {fw.title}
                                        </h2>
                                        <p
                                            style={{
                                                fontSize: 13,
                                                color: "rgba(255,255,255,0.8)",
                                                margin: "6px 0 0",
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {fw.subtitle}
                                        </p>
                                    </div>

                                    <div style={{ padding: "24px 28px" }}>
                                        <p
                                            style={{
                                                fontSize: 13,
                                                color: "#555",
                                                lineHeight: 1.65,
                                                margin: "0 0 20px",
                                            }}
                                        >
                                            {fw.logic}
                                        </p>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns:
                                                    fw.dimensions.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
                                                gap: 12,
                                                marginBottom: 20,
                                            }}
                                        >
                                            {fw.dimensions.map((d, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        padding: 18,
                                                        borderRadius: 8,
                                                        border: `1px solid ${fw.accent}25`,
                                                        background: `${fw.accent}06`,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                            color: fw.color,
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        {d.name}
                                                    </div>
                                                    <p
                                                        style={{
                                                            fontSize: 12,
                                                            color: "#555",
                                                            lineHeight: 1.55,
                                                            margin: "0 0 10px",
                                                        }}
                                                    >
                                                        {d.desc}
                                                    </p>
                                                    <div
                                                        style={{
                                                            fontSize: 11.5,
                                                            color: fw.accent,
                                                            fontWeight: 600,
                                                            borderTop: `1px solid ${fw.accent}20`,
                                                            paddingTop: 8,
                                                            lineHeight: 1.5,
                                                        }}
                                                    >
                                                        → {d.implication}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div
                                            style={{
                                                padding: "12px 16px",
                                                borderRadius: 6,
                                                background: "#F8F8F6",
                                                border: "1px solid #E8E8E4",
                                                fontSize: 12,
                                                color: "#777",
                                                lineHeight: 1.55,
                                            }}
                                        >
                                            <strong style={{ color: "#555" }}>MECE check:</strong>{" "}
                                            {fw.exhaust}
                                        </div>
                                    </div>
                                </div>
                            ))}

                        <p
                            style={{
                                fontSize: 13,
                                color: "#666",
                                lineHeight: 1.65,
                                margin: "20px 0 0",
                                maxWidth: 680,
                            }}
                        >
                            Each framework isolates one lens on the decision. Together they
                            feed the 2×2: Framework 1 determines the Y-axis (need complexity),
                            Framework 2 shapes channel-level actions, and Framework 3
                            determines the X-axis (readiness to centralise).
                        </p>
                    </div>
                )}

                {/* MATRIX TAB */}
                {activeTab === "matrix" && (
                    <div>
                        {/* Matrix */}
                        <div style={{ position: "relative", maxWidth: 700, marginLeft: 48 }}>
                            {/* Y label */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: -42,
                                    top: "50%",
                                    transform: "rotate(-90deg) translateX(-50%)",
                                    transformOrigin: "0 0",
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    letterSpacing: "2px",
                                    textTransform: "uppercase",
                                    color: "#999",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                Customer Need Complexity (Fw 1)
                            </div>

                            {/* Y markers */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: -16,
                                    top: 0,
                                    bottom: 32,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span style={{ fontSize: 10, color: "#BBB", fontWeight: 600 }}>
                                    High
                                </span>
                                <span style={{ fontSize: 10, color: "#BBB", fontWeight: 600 }}>
                                    Low
                                </span>
                            </div>

                            {/* X markers */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 5,
                                }}
                            >
                                <span style={{ fontSize: 10, color: "#BBB", fontWeight: 600 }}>
                                    Low
                                </span>
                                <span style={{ fontSize: 10, color: "#BBB", fontWeight: 600 }}>
                                    High
                                </span>
                            </div>

                            {/* Grid */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gridTemplateRows: "1fr 1fr",
                                    gap: 3,
                                    background: "#D8D8D4",
                                    borderRadius: 10,
                                    overflow: "hidden",
                                    border: "1px solid #D8D8D4",
                                }}
                            >
                                {quadrants.map((q) => (
                                    <div
                                        key={q.id}
                                        onMouseEnter={() => setHoveredQ(q.id)}
                                        onMouseLeave={() => setHoveredQ(null)}
                                        style={{
                                            gridArea: q.gridArea,
                                            background: hoveredQ === q.id ? q.bg : "#FFFFFF",
                                            padding: "24px 22px",
                                            minHeight: 180,
                                            transition: "all 0.25s ease",
                                            borderLeft:
                                                hoveredQ === q.id
                                                    ? `4px solid ${q.color}`
                                                    : "4px solid transparent",
                                            display: "flex",
                                            flexDirection: "column",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                marginBottom: 8,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: "50%",
                                                    background: q.color,
                                                    color: "#FFF",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {q.id}
                                            </span>
                                            <span
                                                style={{
                                                    fontFamily: "'Fraunces', Georgia, serif",
                                                    fontSize: 15.5,
                                                    fontWeight: 700,
                                                    color: q.color,
                                                }}
                                            >
                                                {q.title}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                color: q.color,
                                                marginBottom: 8,
                                                opacity: 0.8,
                                            }}
                                        >
                                            {q.action}
                                        </div>
                                        <p
                                            style={{
                                                fontSize: 12,
                                                color: "#555",
                                                lineHeight: 1.6,
                                                margin: 0,
                                                flex: 1,
                                            }}
                                        >
                                            {q.desc}
                                        </p>
                                        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
                                            <span
                                                style={{
                                                    fontSize: 9.5,
                                                    padding: "3px 9px",
                                                    borderRadius: 20,
                                                    background: `${q.color}10`,
                                                    border: `1px solid ${q.color}30`,
                                                    color: q.color,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Need: {q.tagY}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 9.5,
                                                    padding: "3px 9px",
                                                    borderRadius: 20,
                                                    background: `${q.color}10`,
                                                    border: `1px solid ${q.color}30`,
                                                    color: q.color,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Readiness: {q.tagX}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* X label */}
                            <div
                                style={{
                                    textAlign: "center",
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    letterSpacing: "2px",
                                    textTransform: "uppercase",
                                    color: "#999",
                                    marginTop: 12,
                                }}
                            >
                                Centralisation Readiness (Fw 3)
                            </div>
                        </div>

                        <p
                            style={{
                                fontSize: 13,
                                color: "#666",
                                lineHeight: 1.65,
                                margin: "24px 0 8px 48px",
                                maxWidth: 680,
                            }}
                        >
                            The two axes synthesise the three frameworks:
                        </p>
                        <div style={{ marginBottom: 28, maxWidth: 700, marginLeft: 48 }}>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 16,
                                    fontSize: 12.5,
                                    color: "#444",
                                    lineHeight: 1.6,
                                }}
                            >
                                <div
                                    style={{
                                        flex: 1,
                                        padding: "12px 16px",
                                        background: "#FFF",
                                        borderRadius: 8,
                                        border: "1px solid #E4E4E0",
                                    }}
                                >
                                    <strong style={{ color: "#1A1A1A" }}>Y-axis</strong> —{" "}
                                    <em>Customer Need Complexity</em> (from Framework 1). What
                                    share of interactions are relational/consultative vs.
                                    transactional/procedural?
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        padding: "12px 16px",
                                        background: "#FFF",
                                        borderRadius: 8,
                                        border: "1px solid #E4E4E0",
                                    }}
                                >
                                    <strong style={{ color: "#1A1A1A" }}>X-axis</strong> —{" "}
                                    <em>Centralisation Readiness</em> (from Framework 3). Are
                                    regulatory, tech, talent, and commercial conditions met?
                                </div>
                            </div>
                            <p
                                style={{
                                    fontSize: 12,
                                    color: "#999",
                                    marginTop: 10,
                                    lineHeight: 1.5,
                                }}
                            >
                                Framework 2 (Channel Substitutability) determines <em>how</em>{" "}
                                to execute within whichever quadrant a market lands in.
                            </p>
                        </div>

                        {/* How to use */}
                        <div
                            style={{
                                marginTop: 32,
                                padding: "20px 24px",
                                background: "#FFF",
                                borderRadius: 8,
                                border: "1px solid #E4E4E0",
                                maxWidth: 700,
                                marginLeft: 48,
                            }}
                        >
                            <h4
                                style={{
                                    fontSize: 11,
                                    textTransform: "uppercase",
                                    letterSpacing: "2px",
                                    color: "#999",
                                    margin: "0 0 12px",
                                    fontWeight: 700,
                                }}
                            >
                                How to use
                            </h4>
                            <div style={{ fontSize: 12.5, color: "#555", lineHeight: 1.65 }}>
                                <p style={{ margin: "0 0 8px" }}>
                                    <strong>1.</strong> Score each market on Framework 1 (need
                                    complexity mix) to place it on the Y-axis.
                                </p>
                                <p style={{ margin: "0 0 8px" }}>
                                    <strong>2.</strong> Score each market on Framework 3
                                    (regulatory, tech, talent, commercial readiness) to place it
                                    on the X-axis.
                                </p>
                                <p style={{ margin: 0 }}>
                                    <strong>3.</strong> The quadrant determines the strategic
                                    posture. Then apply Framework 2 (automate / relocate /
                                    eliminate) to each channel within that market to build the
                                    execution plan.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
