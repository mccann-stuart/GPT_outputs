import { performance } from "perf_hooks";

const OPEX_ASSUMPTIONS = {
    fixedCostBase: 145,
    fixedCostGrowth: 0.025,
    variableCostRatio: 0.18,
    dAndA: 32,
    dAndAGrowth: 0.03,
    interestExpense: 8,
    taxRate: 0.25
};

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
    }
};

const DEFAULT_SETTINGS = {
    products: DEFAULT_PRODUCTS,
    opex: OPEX_ASSUMPTIONS
};

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function customDeepClone(value) {
    if (Array.isArray(value)) {
        return value.map(customDeepClone);
    }
    if (isPlainObject(value)) {
        const copy = {};
        Object.keys(value).forEach((key) => {
            copy[key] = customDeepClone(value[key]);
        });
        return copy;
    }
    return value;
}

function nativeDeepClone(value) {
    return structuredClone(value);
}

function jsonClone(value) {
    return JSON.parse(JSON.stringify(value));
}

const ITERATIONS = 100000;

let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    customDeepClone(DEFAULT_SETTINGS);
}
let customTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    nativeDeepClone(DEFAULT_SETTINGS);
}
let nativeTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    jsonClone(DEFAULT_SETTINGS);
}
let jsonTime = performance.now() - start;

console.log(`Custom deepClone: ${customTime.toFixed(2)} ms`);
console.log(`Native structuredClone: ${nativeTime.toFixed(2)} ms`);
console.log(`JSON clone: ${jsonTime.toFixed(2)} ms`);
