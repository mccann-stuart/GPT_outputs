import { useState, useMemo, useCallback } from "react";
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine
} from "recharts";

const PRODUCTS = [
    {
        id: "phoneline", name: "PhoneLine+ / Placetel", category: "Cloud Communications",
        tamUnit: "Seats / lines", color: "#6366f1",
        coreEq: "Annual TAM = addressable billable seats × effective annual ARPU",
        scope: "Entry-level SME cloud telephony. UK PhoneLine+ plus Germany digital / self-serve Placetel.",
        quantity: [
            { id: "q1", label: "Addressable micro / SMB businesses", value: 5200000, hint: "UK PSTN / single-line replacement + Germany digital SMB" },
            { id: "q2", label: "Sites per business", value: 1.0, hint: "1.0 for single-site microbusinesses", mult: true },
            { id: "q3", label: "Seats / lines per site", value: 1.8, hint: "PhoneLine+ skews lower-seat / single-line", mult: true },
            { id: "q4", label: "Cloud telephony adoption rate", value: 0.12, hint: "Share willing to adopt cloud vs analogue/PBX", pct: true },
            { id: "q5", label: "Gamma reachable share", value: 0.04, hint: "Coverage via channel, digital direct and partner reach", pct: true },
        ],
        price: [
            { id: "p1", label: "Base monthly seat ARPU", value: 8.5, hint: "Lower-cost base vs richer UCaaS", unit: "£/mo" },
            { id: "p2", label: "Add-on ARPU (IVR / WhatsApp / eSIM)", value: 2.0, hint: "New variants lift price over time", unit: "£/mo" },
            { id: "p3", label: "Annualised activation / device rev", value: 18, hint: "Setup, devices, number porting amortised", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "Base SMB site / line growth", value: 0.01 },
            { id: "c2", label: "PSTN switch-off uplift", value: 0.04 },
            { id: "c3", label: "Cloud migration uplift", value: 0.025 },
            { id: "c4", label: "Digital / self-serve penetration", value: 0.02 },
            { id: "c5", label: "Macro / price sensitivity drag", value: -0.015 },
        ],
        drivers: [
            { bucket: "Regulation", driver: "UK PSTN switch-off forces analogue line replacement", dir: "Positive" },
            { bucket: "Macro / mix", driver: "Customers opting for lower-priced cloud solutions", dir: "Mixed" },
            { bucket: "Product", driver: "PhoneLine+ variants (eSIM, WhatsApp, IVR) broaden use cases", dir: "Positive" },
            { bucket: "Route to market", driver: "Portal simplification and digital/direct reach", dir: "Positive" },
            { bucket: "Germany", driver: "Placetel benefits from low cloud penetration", dir: "Positive" },
            { bucket: "Competition", driver: "Cheaper mix can hold revenue growth below unit growth", dir: "Negative" },
        ],
        anchors: [
            { metric: "PhoneLine+ seats", value: "45,000", why: "Current UK microbusiness / single-line scale", src: "S2" },
            { metric: "UK cloud comms net adds (H1 2025)", value: "23,000", why: "Ongoing seat growth in lower-priced UK cloud", src: "S5" },
            { metric: "UK Cloud PBX seats", value: "1,063,000", why: "Total UK cloud PBX base — ceiling reference", src: "S4" },
            { metric: "Germany cloud seats", value: "565,000", why: "German cloud base including Placetel", src: "S2" },
        ],
    },
    {
        id: "horizon", name: "Horizon / STARFACE", category: "Cloud Communications",
        tamUnit: "Seats", color: "#8b5cf6",
        coreEq: "Annual TAM = addressable seats × effective annual ARPU",
        scope: "Core cloud PBX / UCaaS. Gamma Horizon (UK) and STARFACE (Germany); richer feature set, higher ARPU.",
        quantity: [
            { id: "q1", label: "Addressable SMB / mid-market businesses", value: 2800000, hint: "Full cloud PBX rather than basic line replacement" },
            { id: "q2", label: "Employees / users per business", value: 12, hint: "Headcount or active comms users", mult: true },
            { id: "q3", label: "Telephony users as % of employees", value: 0.7, hint: "Not all roles need full voice seat", pct: true },
            { id: "q4", label: "Cloud PBX adoption rate", value: 0.18, hint: "Hardware PBX to cloud + greenfield", pct: true },
            { id: "q5", label: "Gamma reachable share / channel", value: 0.035, hint: "UK channel + Germany partner network", pct: true },
        ],
        price: [
            { id: "p1", label: "Base monthly seat ARPU", value: 12.5, hint: "Core UCaaS / cloud PBX seat price", unit: "£/mo" },
            { id: "p2", label: "Premium feature / AI add-on ARPU", value: 3.5, hint: "AI, analytics, recording, CCaaS", unit: "£/mo" },
            { id: "p3", label: "Annualised devices / prof. services", value: 35, hint: "Handsets, onboarding, implementation", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "Base seat / employment growth", value: 0.01 },
            { id: "c2", label: "Hardware PBX to cloud uplift", value: 0.035 },
            { id: "c3", label: "German cloud underpenetration", value: 0.03 },
            { id: "c4", label: "AI / richer-feature upsell", value: 0.02 },
            { id: "c5", label: "Macro spend drag", value: -0.015 },
        ],
        drivers: [
            { bucket: "Customer need", driver: "Businesses require more complex communications", dir: "Positive" },
            { bucket: "Migration", driver: "Hardware PBX to cloud continues in UK and Germany", dir: "Positive" },
            { bucket: "Germany", driver: "German cloud market underpenetrated — largest in Europe", dir: "Positive" },
            { bucket: "Product", driver: "STARFACE AI features broaden value proposition", dir: "Positive" },
            { bucket: "Route to market", driver: "Seat blocks from sub-scale providers exiting market", dir: "Positive" },
            { bucket: "Macro", driver: "SMEs slowing net seat adds vs H1 2024", dir: "Negative" },
        ],
        anchors: [
            { metric: "UK Cloud PBX seats", value: "1,063,000", why: "Current UK cloud PBX installed base", src: "S4" },
            { metric: "Europe Cloud PBX seats", value: "687,000", why: "European base including Germany", src: "S4" },
            { metric: "Germany cloud seats", value: "565,000", why: "Scale achieved post-acquisition", src: "S2" },
            { metric: "Germany H1 2025 adds", value: "29,000", why: "Pro forma seat adds — current momentum", src: "S2" },
            { metric: "Total cloud seats", value: "1,800,000", why: "Cross-group cloud scale benchmark", src: "S10" },
        ],
    },
    {
        id: "cisco", name: "Cisco Suite / iPECS", category: "Cloud Communications",
        tamUnit: "Users / seats", color: "#a855f7",
        coreEq: "Annual TAM = addressable collaboration users × effective annual ARPU",
        scope: "Third-party collaboration suites. Cisco Collaboration Suite and iPECS — OEM collaboration TAM.",
        quantity: [
            { id: "q1", label: "Addressable collaboration customers", value: 450000, hint: "SME/mid-market open to Cisco/iPECS" },
            { id: "q2", label: "Users per customer", value: 35, hint: "Installed/target seats per deployment", mult: true },
            { id: "q3", label: "Telephony / managed-service attach", value: 0.25, hint: "Subset buying paid telephony / managed services", pct: true },
            { id: "q4", label: "Countries / deployments per customer", value: 1.3, hint: "International customers deploy across countries", mult: true },
            { id: "q5", label: "Gamma partner coverage / win rate", value: 0.008, hint: "Partner count, launch timing, sales productivity", pct: true },
        ],
        price: [
            { id: "p1", label: "Monthly software licence ARPU", value: 15, hint: "Core collaboration / telephony fee", unit: "£/mo" },
            { id: "p2", label: "Voice / managed-service ARPU", value: 5, hint: "Gamma managed layer, calling, support", unit: "£/mo" },
            { id: "p3", label: "Annualised device / implementation", value: 40, hint: "Setup, devices, migrations amortised", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "Base collaboration seat growth", value: 0.02 },
            { id: "c2", label: "Cisco / iPECS channel activation", value: 0.08 },
            { id: "c3", label: "International rollout uplift", value: 0.04 },
            { id: "c4", label: "AI / advanced collaboration", value: 0.02 },
            { id: "c5", label: "Competitive / provisioning drag", value: -0.02 },
        ],
        drivers: [
            { bucket: "Partnerships", driver: "Strong sales of Cisco Collaboration Suite", dir: "Positive" },
            { bucket: "Launch", driver: "Full suite available across Germany, UK and Spain", dir: "Positive" },
            { bucket: "Pipeline", driver: "Spanish partner committed 40k seats over 5 years", dir: "Positive" },
            { bucket: "Execution", driver: "Run-rate >2,000 seats/month by Aug 2025", dir: "Positive" },
            { bucket: "Portal", driver: "Single portal ordering lowers friction", dir: "Positive" },
            { bucket: "Launch risk", driver: "UK full market launch still ramping in 2025", dir: "Mixed" },
        ],
        anchors: [
            { metric: "Cisco Suite users", value: "28,000", why: "Current installed base, up 75% in H1", src: "S10" },
            { metric: "Cisco user growth H1 2025", value: "75%", why: "Strong early platform ramp", src: "S10" },
            { metric: "Spain partner commitment", value: "40,000 seats", why: "Committed over five years", src: "S2" },
            { metric: "Run-rate additions Aug 2025", value: "2,000/mo", why: "Seat velocity improving", src: "S2" },
        ],
    },
    {
        id: "sip", name: "SIP Trunking", category: "Calling",
        tamUnit: "Trunks", color: "#f59e0b",
        coreEq: "Annual TAM = addressable trunks × effective annual ARPU",
        scope: "SIP trunking for traditional hardware PBX and legacy voice, including number hosting and call routing.",
        quantity: [
            { id: "q1", label: "Addressable PBX sites", value: 1800000, hint: "Installed hardware / legacy PBX base" },
            { id: "q2", label: "Sites / branches per customer", value: 2.2, hint: "Branch-heavy customers", mult: true },
            { id: "q3", label: "Trunks per site", value: 4.5, hint: "Concurrent call capacity + spare", mult: true },
            { id: "q4", label: "SIP trunking attach / retention", value: 0.22, hint: "Sites retaining SIP vs migrating to cloud", pct: true },
            { id: "q5", label: "Gamma coverage / win rate", value: 0.045, hint: "Channel, direct and carrier relationships", pct: true },
        ],
        price: [
            { id: "p1", label: "Monthly trunk rental ARPU", value: 4.5, hint: "Recurring fee per trunk / number bundle", unit: "£/mo" },
            { id: "p2", label: "Voice traffic / number hosting ARPU", value: 2.0, hint: "Usage, minutes, ancillary hosting", unit: "£/mo" },
            { id: "p3", label: "Annualised porting / setup rev", value: 8, hint: "Porting, install amortised annually", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "Base site / trunk growth", value: -0.02 },
            { id: "c2", label: "PSTN switch-off replacement", value: 0.02 },
            { id: "c3", label: "Non-Gamma cloud PBX support", value: 0.015 },
            { id: "c4", label: "Europe / Germany retention", value: 0.01 },
            { id: "c5", label: "Hardware PBX to cloud drag", value: -0.04 },
        ],
        drivers: [
            { bucket: "Installed base", driver: "~40% of UK market still has hardware users to move", dir: "Positive" },
            { bucket: "Trend", driver: "Traditional PBX SIP trunks declining in UK and Europe", dir: "Negative" },
            { bucket: "Offset", driver: "SIP trunks for non-Gamma cloud PBX still growing", dir: "Positive" },
            { bucket: "Macro", driver: "Migration pace slowed in H1 2025", dir: "Mixed" },
            { bucket: "Economics", driver: "Migrating SIP to Gamma cloud increases unit GP", dir: "Positive" },
            { bucket: "Rationalisation", driver: "Some SIP customers trimming service to save cost", dir: "Negative" },
        ],
        anchors: [
            { metric: "UK traditional PBX SIP trunks", value: "902,000", why: "UK legacy SIP base, down 3% vs Dec 2024", src: "S4" },
            { metric: "Europe traditional SIP trunks", value: "201,000", why: "European base, down 2%", src: "S4" },
            { metric: "UK SIP for non-Gamma cloud PBX", value: "498,000", why: "Wholesale still growing (+4%)", src: "S4" },
            { metric: "SIP conversions H1 2025", value: "30,000", why: "Pace of conversion to higher-value", src: "S2" },
        ],
    },
    {
        id: "voice", name: "Voice Enablement", category: "Calling",
        tamUnit: "Users", color: "#22c55e",
        coreEq: "Annual TAM = voice-enabled users × effective annual ARPU",
        scope: "Voice enablement for MS Teams, Cisco, Amazon, Genesys. Operator Connect and Direct Routing.",
        quantity: [
            { id: "q1", label: "Addressable UC platform customers", value: 850000, hint: "Teams, Cisco, Amazon, Genesys bases" },
            { id: "q2", label: "Users per customer", value: 45, hint: "Telephony-relevant users", mult: true },
            { id: "q3", label: "Voice-enabled attach rate", value: 0.15, hint: "Subset purchasing full voice enablement", pct: true },
            { id: "q4", label: "Countries / markets per deployment", value: 1.4, hint: "Multinational deployments multiply seats", mult: true },
            { id: "q5", label: "Gamma coverage / partner reach", value: 0.009, hint: "Channel, direct enterprise, hyperscaler", pct: true },
        ],
        price: [
            { id: "p1", label: "Monthly enablement ARPU / user", value: 3.5, hint: "Operator Connect / Direct Routing fee", unit: "£/mo" },
            { id: "p2", label: "Numbering / compliance / managed ARPU", value: 1.5, hint: "Local numbers, admin, analytics", unit: "£/mo" },
            { id: "p3", label: "Annualised provisioning rev / user", value: 10, hint: "Migration effort amortised", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "Base UC platform seat growth", value: 0.03 },
            { id: "c2", label: "Teams / Operator Connect adoption", value: 0.06 },
            { id: "c3", label: "International rollout", value: 0.03 },
            { id: "c4", label: "Hyperscaler / Cisco partnership", value: 0.02 },
            { id: "c5", label: "Competitive price pressure drag", value: -0.02 },
        ],
        drivers: [
            { bucket: "Platform", driver: "MS Teams telephony adoption growing strongly", dir: "Positive" },
            { bucket: "International", driver: "Operator Connect International in 14 countries", dir: "Positive" },
            { bucket: "Execution", driver: "UK H1 2025 Teams adds doubled vs prior year", dir: "Positive" },
            { bucket: "Partnerships", driver: "Voice enablement extends beyond MS to Cisco+", dir: "Positive" },
            { bucket: "Migration", driver: "SIP-to-Teams journey becoming easier", dir: "Positive" },
            { bucket: "Competition", driver: "Native platform economics can compress price", dir: "Negative" },
        ],
        anchors: [
            { metric: "UK MS Teams voice-enabled", value: "523,000", why: "UK installed base, up 12% vs Dec 2024", src: "S4" },
            { metric: "Europe Teams voice-enabled", value: "17,000", why: "European base, up 21%", src: "S4" },
            { metric: "UK H1 2025 adds", value: "56,000", why: "vs 28,000 in H1 2024 — doubled", src: "S2" },
            { metric: "OC International", value: "14 countries", why: "Pan-European capability", src: "S2" },
        ],
    },
    {
        id: "serviceprov", name: "Service Provider", category: "Calling",
        tamUnit: "Trunks / numbers", color: "#10b981",
        coreEq: "Annual TAM = outsourced platform units × effective annual wholesale ARPU",
        scope: "Wholesale carrier services for carriers, operators and platform providers.",
        quantity: [
            { id: "q1", label: "Addressable providers / platforms", value: 350, hint: "UCaaS, CPaaS, CCaaS cloud platforms" },
            { id: "q2", label: "Countries outsourced per provider", value: 4.5, hint: "Each provider may need multiple countries", mult: true },
            { id: "q3", label: "End-users / numbers per provider-country", value: 18000, hint: "Numbers, trunks or end users", mult: true },
            { id: "q4", label: "Outsourced network penetration", value: 0.35, hint: "Some self-build; others outsource", pct: true },
            { id: "q5", label: "Gamma coverage / win rate", value: 0.025, hint: "Partner relationships and country availability", pct: true },
        ],
        price: [
            { id: "p1", label: "Monthly number hosting / trunk ARPU", value: 0.85, hint: "Core recurring wholesale fee", unit: "£/mo" },
            { id: "p2", label: "Traffic / compliance / service ARPU", value: 0.35, hint: "Usage-based + regulatory extras", unit: "£/mo" },
            { id: "p3", label: "Annualised integration / onboarding", value: 2.5, hint: "Onboarding, setup amortised", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "Provider platform growth", value: 0.03 },
            { id: "c2", label: "International expansion", value: 0.04 },
            { id: "c3", label: "Hyperscaler / MQ partner growth", value: 0.025 },
            { id: "c4", label: "New country launches", value: 0.02 },
            { id: "c5", label: "Voice traffic decline / commoditisation", value: -0.025 },
        ],
        drivers: [
            { bucket: "Customer base", driver: "Serves many Gartner MQ service providers", dir: "Positive" },
            { bucket: "Growth vector", driver: "Proposition can grow globally", dir: "Positive" },
            { bucket: "Trading", driver: "Strong growth in SIP for non-Gamma cloud PBX", dir: "Positive" },
            { bucket: "Offset", driver: "Voice traffic is declining", dir: "Negative" },
            { bucket: "Complexity", driver: "Regulation favours outsourcing", dir: "Positive" },
            { bucket: "Route to market", driver: "Expansion beyond UK into Europe and beyond", dir: "Positive" },
        ],
        anchors: [
            { metric: "SP revenue (H1 2025)", value: "£43.5m", why: "Current revenue scale", src: "S5" },
            { metric: "SP gross profit (H1 2025)", value: "£21.3m", why: "Current GP scale", src: "S5" },
            { metric: "Share of Gamma Biz revenue", value: "23%", why: "Materiality within SME/channel", src: "S5" },
            { metric: "Share of Gamma Biz GP", value: "22%", why: "Materiality within SME/channel", src: "S5" },
        ],
    },
    {
        id: "ethernet", name: "Ethernet", category: "Connectivity",
        tamUnit: "Circuits", color: "#3b82f6",
        coreEq: "Annual TAM = addressable circuits × effective annual ARPU",
        scope: "Dedicated fixed connectivity / ethernet for enterprise and multi-site, often with SD-WAN.",
        quantity: [
            { id: "q1", label: "Addressable enterprise / public sites", value: 650000, hint: "Sites needing dedicated/resilient connectivity" },
            { id: "q2", label: "Circuits per site", value: 1.5, hint: "Primary, backup and branch circuits", mult: true },
            { id: "q3", label: "Dedicated-access attach rate", value: 0.35, hint: "Sites needing ethernet vs broadband", pct: true },
            { id: "q4", label: "SD-WAN / managed attach rate", value: 0.2, hint: "Managed overlays increase revenue pool", pct: true },
            { id: "q5", label: "Gamma coverage / win rate", value: 0.03, hint: "Enterprise account coverage", pct: true },
        ],
        price: [
            { id: "p1", label: "Monthly circuit ARPU", value: 185, hint: "Base recurring ethernet", unit: "£/mo" },
            { id: "p2", label: "Managed network / SD-WAN ARPU", value: 45, hint: "Managed overlays, monitoring", unit: "£/mo" },
            { id: "p3", label: "Annualised install / project rev", value: 250, hint: "Implementation amortised", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "Base site / circuit growth", value: 0.01 },
            { id: "c2", label: "SD-WAN / cloud-connectivity", value: 0.03 },
            { id: "c3", label: "Public sector / enterprise wins", value: 0.02 },
            { id: "c4", label: "Fibre availability uplift", value: 0.015 },
            { id: "c5", label: "Price-war drag", value: -0.03 },
        ],
        drivers: [
            { bucket: "Demand", driver: "Multi-site enterprises need resilient connectivity", dir: "Positive" },
            { bucket: "Upsell", driver: "SD-WAN deepens account penetration", dir: "Positive" },
            { bucket: "Competition", driver: "Alt-net price war pressuring renewals", dir: "Negative" },
            { bucket: "Outlook", driver: "Pricing expected to stabilise after nadir", dir: "Positive" },
            { bucket: "Wins", driver: "Utilita and Morrisons show enterprise demand", dir: "Positive" },
            { bucket: "Case study", driver: "Morrisons: 400 supermarkets + 1,200 convenience", dir: "Positive" },
        ],
        anchors: [
            { metric: "Ethernet GP headwind (H1 2025)", value: "£1.0m", why: "Lower-margin renewals", src: "S3" },
            { metric: "FY26 expected GP headwind", value: "£3.0m", why: "Further price pressure", src: "S3" },
            { metric: "Morrisons footprint", value: "400 + 1,200", why: "Large multi-site estate", src: "S8" },
        ],
    },
    {
        id: "broadband", name: "Business Broadband", category: "Connectivity",
        tamUnit: "Lines / circuits", color: "#0ea5e9",
        coreEq: "Annual TAM = addressable broadband lines × effective annual ARPU",
        scope: "SME broadband / FTTP / SoGEA connectivity sold via Gamma channel and partner network.",
        quantity: [
            { id: "q1", label: "Addressable SME sites", value: 4500000, hint: "SME locations rather than employees" },
            { id: "q2", label: "Broadband lines per site", value: 1.1, hint: "Most have one; branch/resilient may have more", mult: true },
            { id: "q3", label: "Fibre broadband adoption rate", value: 0.45, hint: "PSTN switch-off forcing copper to fibre", pct: true },
            { id: "q4", label: "Backup / second-line attach rate", value: 0.08, hint: "Extra backup/secondary lines", pct: true },
            { id: "q5", label: "Gamma coverage / partner reach", value: 0.025, hint: ">1,500 UK channel partners", pct: true },
        ],
        price: [
            { id: "p1", label: "Monthly broadband ARPU", value: 28, hint: "Recurring line rental FTTP/BB", unit: "£/mo" },
            { id: "p2", label: "Managed router / security add-on", value: 6, hint: "Managed hardware, security, support", unit: "£/mo" },
            { id: "p3", label: "Annualised activation rev per line", value: 30, hint: "One-off activation amortised", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "FTTP footprint / availability growth", value: 0.03 },
            { id: "c2", label: "PSTN copper-to-fibre migration", value: 0.025 },
            { id: "c3", label: "Comparison-site / share gain", value: 0.015 },
            { id: "c4", label: "Managed-services attach", value: 0.01 },
            { id: "c5", label: "Fibre margin dilution / price drag", value: -0.025 },
        ],
        drivers: [
            { bucket: "Regulation", driver: "PSTN switch-off forces copper to fibre", dir: "Mixed" },
            { bucket: "Product", driver: "Wide fibre provider choice + comparison site", dir: "Positive" },
            { bucket: "Competition", driver: "Fibre carries lower GP than legacy copper", dir: "Negative" },
            { bucket: "Partnerships", driver: "First wave: BT and PXC on comparison site", dir: "Positive" },
            { bucket: "Cross-sell", driver: "Managed services partially offset margin pressure", dir: "Positive" },
            { bucket: "Timing", driver: "Headwind expected each half until end FY26", dir: "Negative" },
        ],
        anchors: [
            { metric: "H1 2025 GP headwind (copper→fibre)", value: "£1.5m", why: "Fibre migration reduced GP", src: "S5" },
            { metric: "Expected cadence", value: "~£1.5m/half", why: "Similar each half until FY26 end", src: "S2" },
            { metric: "Comparison-site providers", value: "BT, PXC", why: "Expanding supplier choice", src: "S2" },
        ],
    },
    {
        id: "mobile", name: "Mobile / Fusion IoT", category: "Connectivity",
        tamUnit: "SIMs / endpoints", color: "#ec4899",
        coreEq: "Annual TAM = addressable SIMs / endpoints × effective annual ARPU",
        scope: "Business mobile subscriptions plus Fusion IoT for devices, sensors, non-voice PSTN replacements.",
        quantity: [
            { id: "q1", label: "Addressable mobile / IoT endpoints", value: 12000000, hint: "Employee mobile + non-voice devices" },
            { id: "q2", label: "Devices / endpoints per customer", value: 8, hint: "Multiple endpoints per site/vehicle/asset", mult: true },
            { id: "q3", label: "SIM / eSIM penetration", value: 0.25, hint: "Not every device needs a dedicated SIM", pct: true },
            { id: "q4", label: "IoT management / data attach", value: 0.15, hint: "Managed connectivity, control, analytics", pct: true },
            { id: "q5", label: "Gamma coverage / partner reach", value: 0.004, hint: "Channel, enterprise direct, European", pct: true },
        ],
        price: [
            { id: "p1", label: "Monthly SIM ARPU", value: 6.5, hint: "Core recurring mobile / IoT sub", unit: "£/mo" },
            { id: "p2", label: "IoT / management / analytics ARPU", value: 3.0, hint: "Fusion IoT management layer", unit: "£/mo" },
            { id: "p3", label: "Annualised activation / hardware", value: 15, hint: "Devices, provisioning amortised", unit: "£/yr" },
        ],
        cagr: [
            { id: "c1", label: "Business mobile user growth", value: 0.02 },
            { id: "c2", label: "IoT endpoint growth", value: 0.06 },
            { id: "c3", label: "PSTN non-voice replacement", value: 0.03 },
            { id: "c4", label: "eSIM / international deployment", value: 0.015 },
            { id: "c5", label: "Mobile price competition drag", value: -0.02 },
        ],
        drivers: [
            { bucket: "Regulation", driver: "PSTN switch-off creates non-voice replacement market", dir: "Positive" },
            { bucket: "Product", driver: "Fusion IoT launched to UK channel July 2025", dir: "Positive" },
            { bucket: "Use cases", driver: "Lifts, alarms, endpoints — clear targets", dir: "Positive" },
            { bucket: "Proof point", driver: "Already successful with Fusion IoT in Germany", dir: "Positive" },
            { bucket: "Roadmap", driver: "eSIM variant planned for UK and Germany", dir: "Positive" },
            { bucket: "Competition", driver: "Mobile connectivity can commoditise", dir: "Negative" },
        ],
        anchors: [
            { metric: "Fusion IoT launch", value: "1 Jul 2025", why: "Newly opened UK growth vector", src: "S2" },
            { metric: "Enterprise examples", value: "AA / Centrica", why: "Already selling IoT replacement", src: "S2" },
            { metric: "eSIM roadmap", value: "UK + Germany", why: "Improves deployment velocity", src: "S2" },
            { metric: "Mobile enterprise win", value: "Wolverhampton", why: "Enterprise mobile contracts", src: "S3" },
        ],
    },
];

const CATS = ["Cloud Communications", "Calling", "Connectivity"];
const CAT_C = { "Cloud Communications": "#8b5cf6", "Calling": "#22c55e", "Connectivity": "#3b82f6" };
const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

const fN = n => { if (n >= 1e9) return `${(n / 1e9).toFixed(1)}bn`; if (n >= 1e6) return `${(n / 1e6).toFixed(1)}m`; if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`; return n.toFixed(0); };
const fP = n => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

function calcTAM(p) {
    const units = p.quantity.reduce((a, q) => a * q.value, 1);
    const arpu = (p.price[0].value + p.price[1].value) * 12 + p.price[2].value;
    return { units, arpu, tam: (units * arpu) / 1e6 };
}
function calcCAGR(p) { return p.cagr.reduce((s, c) => s + c.value, 0); }

const bg = "#080e1a", crd = "#0f172a", bdr = "#1e293b", t1 = "#e2e8f0", t2 = "#94a3b8", t3 = "#64748b";
const Box = ({ children, style }) => <div style={{ background: crd, borderRadius: 8, border: `1px solid ${bdr}`, padding: 14, marginBottom: 10, ...style }}>{children}</div>;
const Dir = ({ d }) => { const c = d === "Positive" ? "#22c55e" : d === "Negative" ? "#ef4444" : "#f59e0b"; return <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 9, background: `${c}18`, color: c, fontWeight: 600 }}>{d}</span>; };

const NI = ({ value, onChange, step, w }) => (
    <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step || 1}
        style={{ width: w || 85, padding: "3px 5px", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#fbbf24", textAlign: "right", outline: "none" }} />
);

export default function GammaModel() {
    const [tab, setTab] = useState(0);
    const [prods, setProds] = useState(PRODUCTS);
    const [sel, setSel] = useState(0);
    const [gpm, setGpm] = useState(0.49);
    const [opx, setOpx] = useState(0.28);
    const [dna, setDna] = useState(0.04);
    const [tax, setTax] = useState(0.25);

    const uQ = useCallback((pi, qi, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], quantity: [...n[pi].quantity] }; x.quantity[qi] = { ...x.quantity[qi], value: v }; n[pi] = x; return n; }), []);
    const uP = useCallback((pi, qi, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], price: [...n[pi].price] }; x.price[qi] = { ...x.price[qi], value: v }; n[pi] = x; return n; }), []);
    const uC = useCallback((pi, ci, v) => setProds(p => { const n = [...p]; const x = { ...n[pi], cagr: [...n[pi].cagr] }; x.cagr[ci] = { ...x.cagr[ci], value: v }; n[pi] = x; return n; }), []);

    const comp = useMemo(() => prods.map(p => { const r = calcTAM(p); const c = calcCAGR(p); return { ...r, cagr: c, proj: YEARS.map(y => ({ year: y, tam: r.tam * Math.pow(1 + c, y - 2025) })) }; }), [prods]);
    const totalTAM = comp.reduce((s, c) => s + c.tam, 0);

    const pl = useMemo(() => YEARS.map(y => {
        let tot = 0; const row = { year: y };
        prods.forEach((p, i) => { const r = comp[i].tam * Math.pow(1 + comp[i].cagr, y - 2025); row[p.id] = r; tot += r; });
        row.rev = tot; row.gp = tot * gpm; row.opex = tot * opx; row.ebitda = row.gp - row.opex;
        row.ebitdaM = tot > 0 ? row.ebitda / tot : 0; row.dna = tot * dna; row.ebit = row.ebitda - row.dna;
        row.tax = Math.max(0, row.ebit * tax); row.ni = row.ebit - row.tax; row.niM = tot > 0 ? row.ni / tot : 0;
        return row;
    }), [prods, comp, gpm, opx, dna, tax]);

    const TABS = ["Portfolio Summary", "Product Detail", "P&L Projection"];

    return (
        <div style={{ background: bg, color: t1, fontFamily: "'IBM Plex Sans',system-ui,sans-serif", minHeight: "100vh", padding: "10px 12px", fontSize: 13 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${bdr}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg,#6366f1,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff" }}>Γ</div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>Gamma Communications — Market Model Driver Trees</h1>
                    <div style={{ fontSize: 10, color: t2 }}>9 solution lines · H1 2025 framework · LON:GAMA · TAM = Qty × ARPU · Year N = TAM₀ × (1+CAGR)ⁿ</div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 2, marginBottom: 12, background: "#060a14", borderRadius: 6, padding: 3 }}>
                {TABS.map((t, i) => (
                    <button key={t} onClick={() => setTab(i)} style={{ flex: 1, padding: "6px 8px", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: tab === i ? 600 : 400, background: tab === i ? "#3b82f6" : "transparent", color: tab === i ? "#fff" : t2, transition: "all 0.15s" }}>{t}</button>
                ))}
            </div>

            {/* ═══ PORTFOLIO SUMMARY ═══ */}
            {tab === 0 && (<>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    {CATS.map(cat => {
                        const cp = prods.map((p, i) => ({ ...p, i })).filter(p => p.category === cat);
                        const ct = cp.reduce((s, p) => s + comp[p.i].tam, 0);
                        const cc = cp.reduce((s, p) => s + comp[p.i].tam * comp[p.i].cagr, 0) / (ct || 1);
                        return (<Box key={cat} style={{ flex: 1, minWidth: 160, borderTop: `3px solid ${CAT_C[cat]}` }}>
                            <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1 }}>{cat}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: CAT_C[cat], margin: "3px 0" }}>£{ct.toFixed(0)}m</div>
                            <div style={{ fontSize: 10, color: t2 }}>CAGR {fP(cc)} · {cp.length} lines</div>
                        </Box>);
                    })}
                    <Box style={{ flex: 1, minWidth: 160, borderTop: "3px solid #f59e0b" }}>
                        <div style={{ fontSize: 9, color: t2, textTransform: "uppercase", letterSpacing: 1 }}>Total Portfolio TAM</div>
                        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#f59e0b", margin: "3px 0" }}>£{totalTAM.toFixed(0)}m</div>
                        <div style={{ fontSize: 10, color: t2 }}>2035E: £{pl.find(d => d.year === 2035)?.rev.toFixed(0)}m</div>
                    </Box>
                </div>

                <Box>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>TAM Projection by Solution Line (£m)</span>
                        <span style={{ fontSize: 10, color: t2 }}>CAGR-compounded · 2025–2035E</span>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={pl} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                            <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                            <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => [`£${v.toFixed(0)}m`]} labelFormatter={l => `FY${l}E`} />
                            {prods.map(p => <Area key={p.id} type="monotone" dataKey={p.id} stackId="1" fill={p.color} stroke={p.color} fillOpacity={0.75} name={p.name} />)}
                            <ReferenceLine x={2030} stroke="#ffffff20" strokeDasharray="4 4" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Box>

                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Portfolio TAM Driver View</div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead><tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                {["Category", "Solution Line", "TAM Unit", "Units", "ARPU", "TAM (£m)", "CAGR", "Yr3", "Yr5", "Yr10"].map(h => (
                                    <th key={h} style={{ textAlign: ["Category", "Solution Line", "TAM Unit"].includes(h) ? "left" : "right", padding: "5px 5px", color: t2, fontWeight: 500, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {prods.map((p, i) => {
                                    const c = comp[i]; return (
                                        <tr key={p.id} style={{ borderBottom: `1px solid ${bdr}22`, cursor: "pointer" }} onClick={() => { setSel(i); setTab(1); }}>
                                            <td style={{ padding: "4px 5px", color: CAT_C[p.category], fontSize: 10 }}>{p.category}</td>
                                            <td style={{ padding: "4px 5px" }}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: p.color, marginRight: 4, verticalAlign: "middle" }} />{p.name}</td>
                                            <td style={{ padding: "4px 5px", color: t2, fontSize: 10 }}>{p.tamUnit}</td>
                                            <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{fN(c.units)}</td>
                                            <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>£{c.arpu.toFixed(0)}</td>
                                            <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{c.tam.toFixed(0)}</td>
                                            <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace", color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>{fP(c.cagr)}</td>
                                            <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(c.tam * Math.pow(1 + c.cagr, 3)).toFixed(0)}</td>
                                            <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(c.tam * Math.pow(1 + c.cagr, 5)).toFixed(0)}</td>
                                            <td style={{ textAlign: "right", padding: "4px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{(c.tam * Math.pow(1 + c.cagr, 10)).toFixed(0)}</td>
                                        </tr>);
                                })}
                                <tr style={{ borderTop: `2px solid ${bdr}`, fontWeight: 700 }}>
                                    <td colSpan={3} style={{ padding: "5px 5px" }}>Total Portfolio</td>
                                    <td /><td />
                                    <td style={{ textAlign: "right", padding: "5px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{totalTAM.toFixed(0)}</td>
                                    <td />
                                    <td style={{ textAlign: "right", padding: "5px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c) => s + c.tam * Math.pow(1 + c.cagr, 3), 0).toFixed(0)}</td>
                                    <td style={{ textAlign: "right", padding: "5px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c) => s + c.tam * Math.pow(1 + c.cagr, 5), 0).toFixed(0)}</td>
                                    <td style={{ textAlign: "right", padding: "5px 5px", fontFamily: "'JetBrains Mono',monospace" }}>{comp.reduce((s, c) => s + c.tam * Math.pow(1 + c.cagr, 10), 0).toFixed(0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style={{ fontSize: 10, color: t3, marginTop: 6, fontStyle: "italic" }}>Click any row to open the product driver tree →</div>
                </Box>
            </>)}

            {/* ═══ PRODUCT DETAIL ═══ */}
            {tab === 1 && (() => {
                const p = prods[sel], c = comp[sel];
                return (<div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 185, flexShrink: 0 }}>
                        <Box style={{ padding: 8 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: t2, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Solution Lines</div>
                            {prods.map((pr, i) => (
                                <button key={pr.id} onClick={() => setSel(i)} style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", padding: "5px 7px", border: "none", borderRadius: 4, cursor: "pointer", marginBottom: 1, textAlign: "left", background: sel === i ? `${pr.color}20` : "transparent", borderLeft: sel === i ? `3px solid ${pr.color}` : "3px solid transparent", color: sel === i ? t1 : t2, fontSize: 10.5, transition: "all 0.12s" }}>
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: pr.color, flexShrink: 0 }} />
                                    <span style={{ fontWeight: sel === i ? 600 : 400 }}>{pr.name}</span>
                                </button>
                            ))}
                        </Box>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Box style={{ borderTop: `3px solid ${p.color}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <div style={{ fontSize: 9, color: CAT_C[p.category], fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{p.category}</div>
                                    <h2 style={{ margin: "2px 0 3px", fontSize: 16, fontWeight: 700, color: p.color }}>{p.name}</h2>
                                    <div style={{ fontSize: 10, color: t2 }}>{p.scope}</div>
                                    <div style={{ fontSize: 9, color: t3, marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>{p.coreEq}</div>
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
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#f59e0b" }}>1. Quantity Driver Tree</div>
                                {p.quantity.map((q, qi) => (
                                    <div key={q.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, gap: 6 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 10.5, color: t1 }}>{q.label}</div>
                                            <div style={{ fontSize: 8.5, color: t3 }}>{q.hint}</div>
                                        </div>
                                        <NI value={q.value} onChange={v => uQ(sel, qi, v)} step={q.value >= 1e6 ? 100000 : q.value >= 100 ? 10 : q.value >= 1 ? 0.1 : 0.005} w={q.value >= 1e6 ? 95 : 75} />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, marginTop: 2, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                                    <span>Addressable billable units</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#f59e0b" }}>{fN(c.units)}</span>
                                </div>
                            </Box>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#22c55e" }}>Price Driver Tree</div>
                                {p.price.map((pr, pi) => (
                                    <div key={pr.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7, gap: 6 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 10.5, color: t1 }}>{pr.label}</div>
                                            <div style={{ fontSize: 8.5, color: t3 }}>{pr.hint}</div>
                                        </div>
                                        <NI value={pr.value} onChange={v => uP(sel, pi, v)} step={pr.value >= 50 ? 5 : 0.5} w={75} />
                                    </div>
                                ))}
                                <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, marginTop: 2, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                                    <span>Effective annual ARPU</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#22c55e" }}>£{c.arpu.toFixed(0)}</span>
                                </div>
                            </Box>
                        </div>

                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#3b82f6" }}>2. CAGR Build</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                                {p.cagr.map((cv, ci) => (
                                    <div key={cv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, gap: 6 }}>
                                        <div style={{ flex: 1, fontSize: 10.5, color: t1 }}>{cv.label}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <input type="range" min={-0.1} max={0.15} step={0.005} value={cv.value} onChange={e => uC(sel, ci, parseFloat(e.target.value))} style={{ width: 70, accentColor: cv.value >= 0 ? "#22c55e" : "#ef4444" }} />
                                            <span style={{ width: 45, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: cv.value >= 0 ? "#22c55e" : "#ef4444" }}>{(cv.value * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 6, marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>Model CAGR</span>
                                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: c.cagr >= 0 ? "#22c55e" : "#ef4444" }}>{fP(c.cagr)}</span>
                            </div>
                            <div style={{ display: "flex", gap: 14, marginTop: 5, fontSize: 10, color: t2 }}>
                                <span>Yr3: <b style={{ color: t1 }}>£{(c.tam * Math.pow(1 + c.cagr, 3)).toFixed(0)}m</b></span>
                                <span>Yr5: <b style={{ color: t1 }}>£{(c.tam * Math.pow(1 + c.cagr, 5)).toFixed(0)}m</b></span>
                                <span>Yr10: <b style={{ color: t1 }}>£{(c.tam * Math.pow(1 + c.cagr, 10)).toFixed(0)}m</b></span>
                            </div>
                        </Box>

                        <Box>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>TAM Projection</div>
                            <ResponsiveContainer width="100%" height={140}>
                                <AreaChart data={c.proj} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                    <defs><linearGradient id={`g${sel}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={p.color} stopOpacity={0.4} /><stop offset="95%" stopColor={p.color} stopOpacity={0.05} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                    <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                    <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => [`£${v.toFixed(0)}m`]} labelFormatter={l => `FY${l}E`} />
                                    <Area type="monotone" dataKey="tam" stroke={p.color} strokeWidth={2.5} fill={`url(#g${sel})`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>

                        <div style={{ display: "flex", gap: 10 }}>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>3. Key Drivers / Headwinds</div>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                                    <thead><tr style={{ borderBottom: `1px solid ${bdr}` }}>
                                        {["Bucket", "Driver", "Dir."].map(h => <th key={h} style={{ textAlign: "left", padding: "3px 5px", color: t2, fontWeight: 500, fontSize: 9 }}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>{p.drivers.map((d, di) => (
                                        <tr key={di} style={{ borderBottom: `1px solid ${bdr}10` }}>
                                            <td style={{ padding: "3px 5px", color: t2, fontSize: 9, whiteSpace: "nowrap" }}>{d.bucket}</td>
                                            <td style={{ padding: "3px 5px" }}>{d.driver}</td>
                                            <td style={{ padding: "3px 5px" }}><Dir d={d.dir} /></td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </Box>
                            <Box style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>4. Disclosed Anchors (H1 2025)</div>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                                    <thead><tr style={{ borderBottom: `1px solid ${bdr}` }}>
                                        {["Metric", "Value", "Src"].map(h => <th key={h} style={{ textAlign: "left", padding: "3px 5px", color: t2, fontWeight: 500, fontSize: 9 }}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>{p.anchors.map((a, ai) => (
                                        <tr key={ai} style={{ borderBottom: `1px solid ${bdr}10` }}>
                                            <td style={{ padding: "3px 5px", color: t2, fontSize: 9.5 }}>{a.metric}</td>
                                            <td style={{ padding: "3px 5px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: "#fbbf24" }}>{a.value}</td>
                                            <td style={{ padding: "3px 5px", fontSize: 9, color: t3 }}>{a.src}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                                <div style={{ marginTop: 4 }}>{p.anchors.map((a, i) => <div key={i} style={{ fontSize: 8.5, color: t3, marginBottom: 1 }}>{a.src}: {a.why}</div>)}</div>
                            </Box>
                        </div>
                    </div>
                </div>);
            })()}

            {/* ═══ P&L PROJECTION ═══ */}
            {tab === 2 && (<>
                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#f59e0b" }}>Group P&L Assumptions</div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {[{ l: "Blended GP Margin", v: gpm, s: setGpm, mn: 0.2, mx: 0.7 }, { l: "OpEx % Revenue", v: opx, s: setOpx, mn: 0.1, mx: 0.5 }, { l: "D&A % Revenue", v: dna, s: setDna, mn: 0.01, mx: 0.1 }, { l: "Tax Rate", v: tax, s: setTax, mn: 0.15, mx: 0.35 }].map(x => (
                            <div key={x.l} style={{ flex: 1, minWidth: 130 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t2, marginBottom: 2 }}>
                                    <span>{x.l}</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#fbbf24" }}>{(x.v * 100).toFixed(1)}%</span>
                                </div>
                                <input type="range" min={x.mn} max={x.mx} step={0.005} value={x.v} onChange={e => x.s(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#3b82f6" }} />
                            </div>
                        ))}
                    </div>
                </Box>

                <div style={{ display: "flex", gap: 10 }}>
                    <Box style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Revenue & EBITDA (£m)</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <ComposedChart data={pl} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => [`£${v.toFixed(0)}m`]} labelFormatter={l => `FY${l}E`} />
                                <Bar dataKey="rev" fill="#3b82f650" name="Revenue" radius={[2, 2, 0, 0]} />
                                <Line type="monotone" dataKey="ebitda" stroke="#f59e0b" strokeWidth={2} dot={false} name="EBITDA" />
                                <Line type="monotone" dataKey="ni" stroke="#22c55e" strokeWidth={2} dot={false} name="Net Income" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>
                    <Box style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Margin Evolution</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={pl} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={bdr} />
                                <XAxis dataKey="year" tick={{ fill: t2, fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fill: t2, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                                <Tooltip contentStyle={{ background: "#1a2744", border: `1px solid ${bdr}`, borderRadius: 6, fontSize: 11, color: t1 }} formatter={v => [`${(v * 100).toFixed(1)}%`]} labelFormatter={l => `FY${l}E`} />
                                <Line type="monotone" dataKey="ebitdaM" stroke="#f59e0b" strokeWidth={2} dot={false} name="EBITDA Margin" />
                                <Line type="monotone" dataKey="niM" stroke="#22c55e" strokeWidth={2} dot={false} name="Net Margin" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </div>

                <Box>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Modelled Income Statement (£m)</div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace" }}>
                            <thead><tr style={{ borderBottom: `2px solid ${bdr}` }}>
                                <th style={{ textAlign: "left", padding: "5px 5px", fontFamily: "'IBM Plex Sans',sans-serif", color: t2, fontWeight: 500, fontSize: 10 }}>Line Item</th>
                                {YEARS.map(y => <th key={y} style={{ textAlign: "right", padding: "5px 3px", color: t2, fontWeight: 500, fontSize: 9 }}>FY{y}E</th>)}
                            </tr></thead>
                            <tbody>
                                {prods.map((pr, i) => (
                                    <tr key={pr.id} style={{ borderBottom: `1px solid ${bdr}10` }}>
                                        <td style={{ padding: "2px 5px", fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 10, color: t2 }}>
                                            <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 1, background: pr.color, marginRight: 3, verticalAlign: "middle" }} />{pr.name}
                                        </td>
                                        {YEARS.map(y => <td key={y} style={{ textAlign: "right", padding: "2px 3px", fontSize: 10 }}>{pl.find(r => r.year === y)[pr.id].toFixed(0)}</td>)}
                                    </tr>
                                ))}
                                {[
                                    { k: "rev", l: "Total Revenue", b: true, sep: true },
                                    { k: "gp", l: "Gross Profit" },
                                    { k: "opex", l: "OpEx", neg: true },
                                    { k: "ebitda", l: "EBITDA", b: true },
                                    { k: "dna", l: "D&A", neg: true },
                                    { k: "ebit", l: "EBIT" },
                                    { k: "tax", l: "Tax", neg: true },
                                    { k: "ni", l: "Net Income", b: true, hl: true },
                                ].map((r, ri) => (
                                    <tr key={ri} style={{ borderTop: r.sep ? `2px solid ${bdr}` : `1px solid ${bdr}15`, background: r.hl ? "#3b82f608" : "transparent" }}>
                                        <td style={{ padding: "3px 5px", fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: r.b ? 700 : 400, fontSize: 11 }}>{r.l}</td>
                                        {YEARS.map(y => { const v = pl.find(d => d.year === y)[r.k]; return <td key={y} style={{ textAlign: "right", padding: "3px 3px", fontWeight: r.b ? 600 : 400, color: r.neg ? t2 : v < 0 ? "#ef4444" : t1 }}>{v.toFixed(0)}</td>; })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Box>

                <div style={{ display: "flex", gap: 10 }}>
                    {[{ l: "3-Year (→2028)", n: 3 }, { l: "5-Year (→2030)", n: 5 }, { l: "10-Year (→2035)", n: 10 }].map(h => {
                        const s = pl[0], e = pl[h.n]; if (!e) return null;
                        const rc = s.rev > 0 ? Math.pow(e.rev / s.rev, 1 / h.n) - 1 : 0;
                        const nc = s.ni > 0 && e.ni > 0 ? Math.pow(e.ni / s.ni, 1 / h.n) - 1 : null;
                        return (<Box key={h.l} style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#3b82f6" }}>{h.l}</div>
                            {[{ l: "Revenue CAGR", v: fP(rc), c: rc >= 0 ? "#22c55e" : "#ef4444" }, { l: "Net Income CAGR", v: nc !== null ? fP(nc) : "n/a", c: (nc || 0) >= 0 ? "#22c55e" : "#ef4444" }, { l: `FY${2025 + h.n} Revenue`, v: `£${e.rev.toFixed(0)}m`, c: t1 }, { l: `FY${2025 + h.n} Net Income`, v: `£${e.ni.toFixed(0)}m`, c: t1 }].map(x => (
                                <div key={x.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                                    <span style={{ color: t2 }}>{x.l}</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: x.c }}>{x.v}</span>
                                </div>
                            ))}
                        </Box>);
                    })}
                </div>
            </>)}

            <div style={{ marginTop: 10, padding: "6px 10px", background: "#0a0e18", border: `1px solid ${bdr}`, borderRadius: 5 }}>
                <div style={{ fontSize: 8, color: "#f59e0b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Framework Disclaimer</div>
                <div style={{ fontSize: 8.5, color: t3, lineHeight: 1.5 }}>
                    Driver-tree modelling framework based on Gamma's H1 2025 investor presentation (9 solution lines). Inputs are editable assumptions — not externally validated TAM estimates. Disclosed anchors sourced from Interim Results and Investor Presentation for H1 2025. All projections are model-generated. Blue/yellow inputs = editable; black = formulas. Not for distribution.
                </div>
            </div>
        </div>
    );
}
