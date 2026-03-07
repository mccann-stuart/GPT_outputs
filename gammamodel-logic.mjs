// --- S-Curve / Logistic function ---
export const logistic = (t, L, k, t0) => L / (1 + Math.exp(-k * (t - t0)));

// --- Inverse logistic for decline ---
export const declineLogistic = (t, initialShare, floorShare, k, t0) => {
    const range = initialShare - floorShare;
    return floorShare + range / (1 + Math.exp(k * (t - t0)));
};
