import assert from "node:assert";

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
    return structuredClone(value);
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

const DEFAULT_SETTINGS = {
    a: 1,
    b: {
        c: 2,
        d: [3, 4]
    }
};

const OVERRIDE = {
    b: {
        d: [5]
    }
};

const merged = deepMerge(DEFAULT_SETTINGS, OVERRIDE);
assert.deepStrictEqual(merged, {
    a: 1,
    b: {
        c: 2,
        d: [5]
    }
});

console.log("Tests pass.");
