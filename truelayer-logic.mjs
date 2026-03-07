// --- Fee constants (deduced industry benchmarks) ---
export const CARD_PERCENT_FEE = 0.025;   // 2.50% blended card rate
export const CARD_FIXED_FEE = 0.20;    // £0.20 per-transaction fixed fee
export const PBB_PERCENT_FEE = 0.0042;  // 0.42% Pay by Bank rate
export const PBB_FIXED_FEE = 0.00;    // No fixed fee for PbB

// --- Breakdown of blended card rate (for explainer) ---
export const CARD_MIX = [
  { method: "UK Debit Cards", share: 0.45, pctFee: 0.015, fixedFee: 0.10 },
  { method: "UK Credit Cards", share: 0.25, pctFee: 0.025, fixedFee: 0.20 },
  { method: "International Cards", share: 0.15, pctFee: 0.045, fixedFee: 0.30 },
  { method: "Digital Wallets / Other", share: 0.15, pctFee: 0.035, fixedFee: 0.40 },
];

export const DEFAULT_SETTINGS = {
  monthlyPayments: 10000,
  avgAmount: 50,
  pbbShare: 0.10,
};

export function resolveInitialSettings(input = {}) {
  // Handle null input
  if (input === null) {
    input = {};
  }
  const monthlyPayments = Number.isFinite(Number(input.monthlyPayments))
    ? Number(input.monthlyPayments)
    : DEFAULT_SETTINGS.monthlyPayments;
  const avgAmount = Number.isFinite(Number(input.avgAmount))
    ? Number(input.avgAmount)
    : DEFAULT_SETTINGS.avgAmount;
  const pbbShare = Number.isFinite(Number(input.pbbShare))
    ? Number(input.pbbShare)
    : DEFAULT_SETTINGS.pbbShare;

  return { monthlyPayments, avgAmount, pbbShare };
}

export function calculateSavings(monthlyPayments, avgAmount, pbbShare) {
  const annualPbbTxns = monthlyPayments * 12 * pbbShare;
  const annualNonPbbTxns = monthlyPayments * 12 * (1 - pbbShare);

  const cardCostPerTxn = avgAmount * CARD_PERCENT_FEE + CARD_FIXED_FEE;
  const pbbCostPerTxn = avgAmount * PBB_PERCENT_FEE + PBB_FIXED_FEE;

  const currentTotalCost = monthlyPayments * 12 * cardCostPerTxn;
  const newTotalCost = annualNonPbbTxns * cardCostPerTxn + annualPbbTxns * pbbCostPerTxn;
  const annualSavings = currentTotalCost - newTotalCost;

  return {
    annualSavings,
    annualPbbTxns,
    cardCostPerTxn,
    pbbCostPerTxn,
    savingsPerTxn: cardCostPerTxn - pbbCostPerTxn,
    currentTotalCost,
    newTotalCost,
  };
}
