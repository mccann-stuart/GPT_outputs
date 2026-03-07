import { useState, useEffect, useRef, useMemo } from "react";

/*
 * ═══════════════════════════════════════════════════════════════════
 * REVERSE-ENGINEERED TRUELAYER PAY BY BANK SAVINGS CALCULATOR
 * ═══════════════════════════════════════════════════════════════════
 *
 * DEDUCED LOGIC (from truelayer.com/payments):
 *
 * The calculator compares the cost of processing payments via
 * traditional card methods vs. Pay by Bank (open banking).
 *
 * INPUTS:
 *   - monthlyPayments:  Number of monthly transactions (default 10,000)
 *   - averageAmount:    Average transaction value in £ (default £50)
 *   - pbbShare:         % of checkout shifted to Pay by Bank (default 10%)
 *
 * DEDUCED FEE BENCHMARKS (industry standard UK rates):
 *
 *   Card payments (blended across debit/credit/international):
 *     - Percentage fee: ~2.50%
 *     - Fixed fee:      ~£0.20 per transaction
 *     → Total on £50 avg txn = £1.45
 *
 *   Pay by Bank:
 *     - Percentage fee: ~0.42%
 *     - Fixed fee:      £0.00
 *     → Total on £50 avg txn = £0.21
 *
 *   Savings per diverted transaction on £50: £1.24
 *
 * FORMULA:
 *   pbbTransactionsPerYear = monthlyPayments × 12 × pbbShare
 *   cardCostPerTxn         = averageAmount × cardRate + cardFixedFee
 *   pbbCostPerTxn          = averageAmount × pbbRate
 *   annualSavings          = pbbTransactionsPerYear × (cardCostPerTxn - pbbCostPerTxn)
 *
 * VERIFICATION:
 *   10,000 × 12 × 0.10 × (£50 × 0.025 + £0.20 - £50 × 0.0042)
 *   = 12,000 × (£1.25 + £0.20 - £0.21)
 *   = 12,000 × £1.24
 *   = £14,880  ✓ (matches the default displayed on truelayer.com)
 *
 * ═══════════════════════════════════════════════════════════════════
 */

// --- Fee constants (deduced industry benchmarks) ---
const CARD_PERCENT_FEE = 0.025;   // 2.50% blended card rate
const CARD_FIXED_FEE = 0.20;    // £0.20 per-transaction fixed fee
const PBB_PERCENT_FEE = 0.0042;  // 0.42% Pay by Bank rate
const PBB_FIXED_FEE = 0.00;    // No fixed fee for PbB

// --- Breakdown of blended card rate (for explainer) ---
const CARD_MIX = [
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

function resolveInitialSettings(input = {}) {
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

function calculateSavings(monthlyPayments, avgAmount, pbbShare) {
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

// --- Animated counter ---
function AnimatedNumber({ value, prefix = "£", duration = 600 }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = ref.current;
    ref.current = value; // update immediately so re-triggers start from correct value
    const end = value;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = Math.round(display).toLocaleString("en-GB");
  return <span>{prefix}{formatted}</span>;
}

// --- Pill selector ---
function PillSelector({ options, value, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 6, flexWrap: "wrap",
    }}>
      {options.map(opt => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "8px 18px",
              borderRadius: 100,
              border: isActive ? "2px solid #1a1a2e" : "2px solid #d0d0d8",
              background: isActive ? "#1a1a2e" : "transparent",
              color: isActive ? "#fff" : "#4a4a5a",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Range slider ---
function SliderInput({ label, value, onChange, min, max, step, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  const inputId = `slider-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8,
      }}>
        <label htmlFor={inputId} style={{
          fontSize: 14, fontWeight: 500, color: "#555", fontFamily: "'DM Sans', sans-serif",
        }}>{label}</label>
        <span style={{
          fontSize: 22, fontWeight: 700, color: "#1a1a2e", fontFamily: "'DM Mono', monospace",
        }}>{format(value)}</span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          height: 6,
          borderRadius: 3,
          appearance: "none",
          background: `linear-gradient(to right, #6c3dff ${pct}%, #e0dfe6 ${pct}%)`,
          cursor: "pointer",
          outline: "none",
        }}
      />
    </div>
  );
}

// --- Main calculator ---
export default function TrueLayerCalculator({ initialSettings = DEFAULT_SETTINGS, onSettingsChange }) {
  const resolvedInitialSettings = useMemo(
    () => resolveInitialSettings(initialSettings),
    [initialSettings]
  );
  const [monthlyPayments, setMonthlyPayments] = useState(resolvedInitialSettings.monthlyPayments);
  const [avgAmount, setAvgAmount] = useState(resolvedInitialSettings.avgAmount);
  const [pbbShare, setPbbShare] = useState(resolvedInitialSettings.pbbShare);
  const [showLogic, setShowLogic] = useState(false);

  const result = useMemo(
    () => calculateSavings(monthlyPayments, avgAmount, pbbShare),
    [monthlyPayments, avgAmount, pbbShare]
  );

  useEffect(() => {
    if (typeof onSettingsChange === "function") {
      onSettingsChange({
        monthlyPayments,
        avgAmount,
        pbbShare,
      });
    }
  }, [monthlyPayments, avgAmount, pbbShare, onSettingsChange]);

  const pbbShareOptions = [
    { value: 0.05, label: "5%" },
    { value: 0.10, label: "10%" },
    { value: 0.25, label: "25%" },
    { value: 0.50, label: "50%" },
    { value: 0.75, label: "75%" },
    { value: 1.00, label: "100%" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1833 40%, #2d1f5e 100%)",
      fontFamily: "'DM Sans', sans-serif",
      padding: "40px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 22px; width: 22px; border-radius: 50%;
          background: #6c3dff; border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(108,61,255,0.4);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          height: 18px; width: 18px; border-radius: 50%;
          background: #6c3dff; border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(108,61,255,0.4);
          cursor: pointer;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(108,61,255,0.3); }
          50%      { box-shadow: 0 0 0 12px rgba(108,61,255,0); }
        }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.15) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        textAlign: "center", maxWidth: 680, marginBottom: 40,
        animation: "fadeUp 0.6s ease-out",
      }}>
        <div style={{
          display: "inline-block",
          background: "rgba(108,61,255,0.15)", border: "1px solid rgba(108,61,255,0.3)",
          borderRadius: 100, padding: "6px 18px", marginBottom: 16,
          fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          Reverse-Engineered Logic
        </div>
        <h1 style={{
          fontSize: 36, fontWeight: 700, color: "#fff", margin: "0 0 12px",
          lineHeight: 1.2,
        }}>
          Pay by Bank Savings Calculator
        </h1>
        <p style={{ fontSize: 16, color: "#9896ab", lineHeight: 1.6, margin: 0 }}>
          Deduced from <span style={{ color: "#a78bfa" }}>truelayer.com/payments</span> — the formula, fee assumptions, and default values that produce the advertised £14,880 figure (10k payments, £50 avg, 10% share).
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 24,
        maxWidth: 960,
        width: "100%",
        animation: "fadeUp 0.8s ease-out",
      }}>
        {/* Left: Inputs */}
        <div className="card-hover" style={{
          background: "#fff", borderRadius: 20, padding: 32,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          transition: "all 0.3s ease",
        }}>
          <h2 style={{
            fontSize: 13, fontWeight: 600, color: "#888", letterSpacing: 1.2,
            textTransform: "uppercase", margin: "0 0 24px",
          }}>Your Details</h2>

          <SliderInput
            label="Monthly Payments"
            value={monthlyPayments}
            onChange={setMonthlyPayments}
            min={100} max={100000} step={100}
            format={v => v.toLocaleString("en-GB")}
          />

          <SliderInput
            label="Average Amount"
            value={avgAmount}
            onChange={setAvgAmount}
            min={5} max={1000} step={5}
            format={v => `£${v.toLocaleString("en-GB")}`}
          />

          <div style={{ marginBottom: 0 }}>
            <label style={{
              fontSize: 14, fontWeight: 500, color: "#555", display: "block", marginBottom: 10,
            }}>Expected Pay by Bank Share</label>
            <PillSelector
              options={pbbShareOptions}
              value={pbbShare}
              onChange={setPbbShare}
            />
          </div>

          <div style={{
            marginTop: 24, padding: 14, background: "#f7f6fb", borderRadius: 12,
            fontSize: 12, color: "#777", lineHeight: 1.6,
          }}>
            Payment method fees are calculated using their respective percentage and fixed fees, weighted by their current checkout mix, to estimate cost savings when a portion shifts to Pay by Bank.
          </div>
        </div>

        {/* Right: Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Big savings number */}
          <div style={{
            background: "linear-gradient(135deg, #6c3dff 0%, #4f1dd4 100%)",
            borderRadius: 20, padding: 32,
            textAlign: "center",
            animation: "pulse 3s infinite",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -60, right: -60,
              width: 180, height: 180, borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
            }} />
            <div style={{
              position: "absolute", bottom: -30, left: -30,
              width: 120, height: 120, borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
            }} />
            <div style={{
              fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12,
            }}>Estimated Annual Savings</div>
            <div style={{
              fontSize: 52, fontWeight: 700, color: "#fff",
              fontFamily: "'DM Mono', monospace",
              position: "relative",
            }}>
              <AnimatedNumber value={result.annualSavings} />
            </div>
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 8,
            }}>
              with Pay by Bank*
            </div>
          </div>

          {/* Breakdown mini-cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Card Cost / Txn", value: `£${result.cardCostPerTxn.toFixed(2)}`, sub: `${(CARD_PERCENT_FEE * 100).toFixed(1)}% + ${(CARD_FIXED_FEE * 100).toFixed(0)}p` },
              { label: "PbB Cost / Txn", value: `£${result.pbbCostPerTxn.toFixed(2)}`, sub: `${(PBB_PERCENT_FEE * 100).toFixed(2)}% flat` },
              { label: "Saving / Txn", value: `£${result.savingsPerTxn.toFixed(2)}`, sub: "per diverted txn" },
              { label: "PbB Txns / Year", value: result.annualPbbTxns.toLocaleString("en-GB"), sub: "diverted annually" },
            ].map((item, i) => (
              <div key={i} className="card-hover" style={{
                background: "#fff", borderRadius: 14, padding: "16px 18px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                transition: "all 0.3s ease",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
                  {item.value}
                </div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Cost comparison bar */}
          <div className="card-hover" style={{
            background: "#fff", borderRadius: 14, padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            transition: "all 0.3s ease",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
              Annual Cost Comparison
            </div>
            {[
              { label: "Current (all cards)", value: result.currentTotalCost, color: "#e74c3c" },
              { label: "With Pay by Bank", value: result.newTotalCost, color: "#6c3dff" },
            ].map((bar, i) => (
              <div key={i} style={{ marginBottom: i === 0 ? 10 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 4 }}>
                  <span>{bar.label}</span>
                  <span style={{ fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                    £{Math.round(bar.value).toLocaleString("en-GB")}
                  </span>
                </div>
                <div style={{ height: 10, background: "#f0eff5", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 5,
                    background: bar.color,
                    width: `${(bar.value / result.currentTotalCost) * 100}%`,
                    transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle logic explanation */}
      <div style={{
        maxWidth: 960, width: "100%", marginTop: 32,
        animation: "fadeUp 1s ease-out",
      }}>
        <button
          onClick={() => setShowLogic(!showLogic)}
          style={{
            width: "100%", padding: "16px 24px",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: showLogic ? "16px 16px 0 0" : 16,
            color: "#c4b5fd", fontSize: 15, fontWeight: 600,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            transition: "all 0.3s ease",
          }}
        >
          <span>Reverse-Engineered Formula & Methodology</span>
          <span style={{
            transform: showLogic ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease", fontSize: 18,
          }}>▼</span>
        </button>

        {showLogic && (
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
            borderTop: "none", borderRadius: "0 0 16px 16px",
            padding: 28, color: "#ccc", fontSize: 14, lineHeight: 1.8,
          }}>
            <h3 style={{ color: "#a78bfa", fontSize: 16, margin: "0 0 16px", fontWeight: 600 }}>
              How We Deduced the Logic
            </h3>

            <p style={{ margin: "0 0 16px" }}>
              The TrueLayer calculator at <code style={{ background: "rgba(108,61,255,0.2)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>truelayer.com/payments</code> shows
              a default result of <strong style={{ color: "#fff" }}>£14,880</strong> with a 10% Pay by Bank share selected.
              By working backwards from this number and cross-referencing TrueLayer's published fee information, we deduced:
            </p>

            <div style={{
              background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 20, marginBottom: 16,
              fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 2,
              borderLeft: "3px solid #6c3dff",
            }}>
              <div style={{ color: "#888", marginBottom: 8 }}>// Assumed defaults</div>
              <div><span style={{ color: "#a78bfa" }}>monthlyPayments</span> = <span style={{ color: "#4ade80" }}>10,000</span></div>
              <div><span style={{ color: "#a78bfa" }}>averageAmount</span>   = <span style={{ color: "#4ade80" }}>£50</span></div>
              <div><span style={{ color: "#a78bfa" }}>pbbShare</span>        = <span style={{ color: "#4ade80" }}>10%</span></div>
              <div style={{ color: "#888", marginTop: 12, marginBottom: 8 }}>// Deduced fee benchmarks</div>
              <div><span style={{ color: "#f9a8d4" }}>cardRate</span>    = <span style={{ color: "#fbbf24" }}>2.50%</span> + <span style={{ color: "#fbbf24" }}>£0.20</span> fixed per txn</div>
              <div><span style={{ color: "#f9a8d4" }}>pbbRate</span>     = <span style={{ color: "#fbbf24" }}>0.42%</span> flat per txn</div>
              <div style={{ color: "#888", marginTop: 12, marginBottom: 8 }}>// Core formula</div>
              <div><span style={{ color: "#a78bfa" }}>annualPbbTxns</span>   = monthlyPayments × 12 × pbbShare</div>
              <div><span style={{ color: "#a78bfa" }}>cardCostPerTxn</span>  = avgAmount × 0.025 + £0.20</div>
              <div><span style={{ color: "#a78bfa" }}>pbbCostPerTxn</span>   = avgAmount × 0.0042</div>
              <div><span style={{ color: "#a78bfa" }}>annualSavings</span>   = annualPbbTxns × (cardCost − pbbCost)</div>
              <div style={{ color: "#888", marginTop: 12, marginBottom: 8 }}>// Verification</div>
              <div>= 10,000 × 12 × 0.10 × (£1.45 − £0.21)</div>
              <div>= 12,000 × £1.24</div>
              <div style={{ color: "#4ade80", fontWeight: 700 }}>= £14,880  ✓</div>
            </div>

            <h3 style={{ color: "#a78bfa", fontSize: 16, margin: "0 0 12px", fontWeight: 600 }}>
              Assumed Card Fee Breakdown (Industry Benchmarks)
            </h3>
            <p style={{ margin: "0 0 12px" }}>
              The blended 2.50% + 20p rate likely represents a weighted mix of:
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%", borderCollapse: "collapse", fontSize: 13,
                fontFamily: "'DM Mono', monospace",
              }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Method", "Mix %", "% Fee", "Fixed", "Cost on £50", "Weighted"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#888", fontWeight: 500, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CARD_MIX.map((m) => {
                    const cost = 50 * m.pctFee + m.fixedFee;
                    const weighted = cost * m.share;
                    return (
                      <tr key={m.method} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px 10px", color: "#ddd" }}>{m.method}</td>
                        <td style={{ padding: "8px 10px", color: "#a78bfa" }}>{(m.share * 100)}%</td>
                        <td style={{ padding: "8px 10px" }}>{(m.pctFee * 100).toFixed(1)}%</td>
                        <td style={{ padding: "8px 10px" }}>{(m.fixedFee * 100).toFixed(0)}p</td>
                        <td style={{ padding: "8px 10px" }}>£{cost.toFixed(2)}</td>
                        <td style={{ padding: "8px 10px", color: "#fbbf24" }}>£{weighted.toFixed(3)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "2px solid rgba(108,61,255,0.4)" }}>
                    <td colSpan={5} style={{ padding: "8px 10px", color: "#a78bfa", fontWeight: 600 }}>Blended Total</td>
                    <td style={{ padding: "8px 10px", color: "#4ade80", fontWeight: 700 }}>
                      £{CARD_MIX.reduce((sum, m) => sum + (50 * m.pctFee + m.fixedFee) * m.share, 0).toFixed(3)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p style={{ margin: "16px 0 0", color: "#888", fontSize: 12, lineHeight: 1.6 }}>
              * The values above are estimates deduced from the calculator output and TrueLayer's published materials.
              Actual rates will vary by merchant, volume, card mix, and negotiated pricing. The original calculator
              states results are "based on the information you provide and industry benchmarks and do not represent an offer or guarantee."
            </p>
          </div>
        )}
      </div>

      <p style={{
        color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 32, textAlign: "center", maxWidth: 600,
      }}>
        This is a reverse-engineered analysis for educational purposes. Not affiliated with TrueLayer.
        Fee assumptions are deduced from publicly available information and may differ from actual rates.
      </p>
    </div>
  );
}
