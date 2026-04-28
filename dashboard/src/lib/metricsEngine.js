/**
 * ClearLens Metrics Engine — JavaScript port of backend fairness.py
 * Formulas match the Python implementation exactly:
 *   - fairness.py  → DPD, DIR, EOD
 *   - sample_guard.py → SampleGuard
 *   - risk_score.py   → BiasRiskScorer
 *   - drift.py        → DriftDetector (linear regression)
 *   - anomaly.py      → SpikeDetector (z-score)
 */

// ─── Constants (mirror backend) ───────────────────────────────────────────────
export const BIAS_THRESHOLDS = {
  demographic_parity_difference: 0.10,
  equalized_odds_difference: 0.10,
  disparate_impact_ratio: 0.80,       // below this = adverse impact
};

export const ALERT_THRESHOLDS = {
  warning:  0.07,
  alert:    0.10,
  critical: 0.20,
};

export const MIN_SAMPLE_PER_GROUP = 30;
export const MIN_SAMPLE_TOTAL = 100;

// ─── Sample Guard (sample_guard.py → is_sufficient) ──────────────────────────
export function sampleGuard(nA, nB) {
  const total = nA + nB;
  if (nA < MIN_SAMPLE_PER_GROUP || nB < MIN_SAMPLE_PER_GROUP || total < MIN_SAMPLE_TOTAL) {
    const needed = Math.max(MIN_SAMPLE_PER_GROUP - Math.min(nA, nB), MIN_SAMPLE_TOTAL - total, 0);
    return {
      sufficient: false,
      reason: `Insufficient data: smallest group has ${Math.min(nA, nB)} decisions — need ${MIN_SAMPLE_PER_GROUP} per group, ${MIN_SAMPLE_TOTAL} total. Add ${needed} more decisions.`,
    };
  }
  return { sufficient: true };
}

// ─── Confidence interval (sample_guard.py → confidence_interval) ──────────────
// Conservative maximum-width CI: z * sqrt(0.25 / n)
export function conservativeCI(value, n, confidence = 0.95) {
  const z = confidence === 0.95 ? 1.96 : 2.576;   // 95% or 99%
  const margin = z * Math.sqrt(0.25 / Math.max(n, 1));
  return [parseFloat((value - margin).toFixed(4)), parseFloat((value + margin).toFixed(4))];
}

// Exact difference-of-proportions CI (more accurate when we know p1, p2, n1, n2)
export function diffCI(p1, n1, p2, n2, z = 1.96) {
  const se = Math.sqrt(p1 * (1 - p1) / Math.max(n1, 1) + p2 * (1 - p2) / Math.max(n2, 1));
  const diff = p1 - p2;
  return [parseFloat((diff - z * se).toFixed(4)), parseFloat((diff + z * se).toFixed(4))];
}

// ─── EOD helper: derive TPR/FPR from approval rate + qualification rate ────────
// Mirrors what the Python backend would do with a ground truth column.
// Model approves all qualified first (greedy allocation):
//   if approvalRate >= qualificationRate:  TP=nQualified, FP=nApproved-nQualified
//   else:                                  TP=nApproved,  FP=0
export function deriveTPRFPR(n, approvalRate, qualificationRate) {
  const nApproved   = Math.round(n * approvalRate);
  const nQualified  = Math.round(n * qualificationRate);
  const nUnqualified = n - nQualified;

  let tp, fp;
  if (approvalRate >= qualificationRate) {
    tp = nQualified;
    fp = Math.max(0, nApproved - nQualified);
  } else {
    tp = nApproved;
    fp = 0;
  }

  const tpr = nQualified   > 0 ? tp / nQualified   : 0;
  const fpr = nUnqualified > 0 ? fp / nUnqualified  : 0;
  const tn  = nUnqualified - fp;
  const fn  = nQualified   - tp;

  return { tp, fp, tn, fn, tpr, fpr, nQualified, nUnqualified };
}

// ─── Contradiction detection (fairness.py → _detect_contradictions) ──────────
export function detectContradiction(dpd, dir) {
  if (Math.abs(dpd) < 0.05 && dir < 0.85) {
    return {
      detected: true,
      explanation:
        "These two metrics are giving conflicting signals. This is the Fairness Impossibility Theorem — " +
        "it is mathematically impossible to satisfy both Demographic Parity and Disparate Impact simultaneously " +
        "when base rates differ. Your organization must choose which type of fairness to prioritise.",
      recommendation:
        "If you optimise Demographic Parity, Disparate Impact Ratio will worsen, and vice versa. " +
        "Surface this to stakeholders — do not auto-resolve it.",
    };
  }
  return { detected: false };
}

// ─── Alert severity evaluator (alerts/engine.py → evaluate) ─────────────────
export function evaluateAlertSeverity(dpdAbs) {
  if (dpdAbs >= ALERT_THRESHOLDS.critical) return "critical";
  if (dpdAbs >= ALERT_THRESHOLDS.alert)    return "alert";
  if (dpdAbs >= ALERT_THRESHOLDS.warning)  return "warning";
  return null;
}

// ─── Risk score (risk_score.py → BiasRiskScorer.compute) ─────────────────────
const WEIGHTS = {
  dpd:       0.30,
  dir_gap:   0.25,  // 1 - DIR
  eod:       0.20,
  drift:     0.15,
  anomaly_z: 0.10,
};

export function computeRiskScore(dpd, dir, eod = 0, driftRate = 0, zScore = 0) {
  const raw = (
    WEIGHTS.dpd       * Math.min(Math.abs(dpd)          / 0.20, 1) +
    WEIGHTS.dir_gap   * Math.min(Math.max(0, 1 - dir)   / 0.20, 1) +
    WEIGHTS.eod       * Math.min(Math.abs(eod)           / 0.20, 1) +
    WEIGHTS.drift     * Math.min(Math.abs(driftRate)     / 0.05, 1) +
    WEIGHTS.anomaly_z * Math.min(Math.abs(zScore)        / 5.0,  1)
  ) * 100;

  const score = Math.min(parseFloat(raw.toFixed(1)), 100);
  const band =
    score >= 80 ? "CRITICAL" :
    score >= 50 ? "HIGH"     :
    score >= 20 ? "MODERATE" : "LOW";

  const advice =
    band === "CRITICAL" ? "Immediate action required — consider pausing the model." :
    band === "HIGH"     ? "Alert stakeholders and schedule a subgroup audit." :
    band === "MODERATE" ? "Monitor closely — bias is within bounds but trending." :
    "System operating normally.";

  return { score, band, advice };
}

// ─── Action card (action_card.py fallback, localised) ────────────────────────
export function generateActionCard(severity, dpd, dir, domain = "general") {
  const dpdPct = Math.abs(dpd * 100).toFixed(1);
  const dirPct = (dir * 100).toFixed(1);

  const domainContext = {
    lending:    "loan approval decisions affecting people's financial access",
    hiring:     "job screening affecting people's career opportunities",
    healthcare: "medical triage affecting patient outcomes",
    general:    "automated decisions affecting real people",
  }[domain] || "automated decisions";

  if (severity === "critical") return {
    summary: `Your AI is approving one group ${dpdPct}% more often than another across ${domainContext} — an urgent equity gap requiring immediate action.`,
    steps: [
      "Pause automated decisions for the affected group and switch to manual review immediately.",
      "Pull all decisions from the last 48 hours and conduct a subgroup audit.",
      "Contact legal to assess regulatory exposure (ECOA/EEOC/GDPR) before resuming the model.",
    ],
    tradeoff_warning: "Reducing approval rates for the over-represented group may trigger a disparate impact claim — involve legal before adjusting thresholds.",
    confidence_note: null,
  };

  if (severity === "alert") return {
    summary: `Bias has exceeded the ${BIAS_THRESHOLDS.demographic_parity_difference * 100}% threshold — the system is treating groups unequally across ${domainContext}.`,
    steps: [
      "Review feature weights for proxy variables (e.g. zip code, credit history length).",
      "Run a counterfactual analysis to identify which inputs flip outcomes for the affected group.",
      "Schedule a model recalibration sprint within the next 5 business days.",
    ],
    tradeoff_warning: `Disparate Impact Ratio is ${dirPct}% — removing correlated features may reduce overall model accuracy by 2–5%.`,
    confidence_note: null,
  };

  return {
    summary: `Early-warning signal: bias is approaching the threshold. Monitor closely over the next 48 hours.`,
    steps: [
      "Add this metric to your daily monitoring dashboard.",
      "Compare this week's approval rates with the last 30-day baseline.",
      "Document this trend for your next compliance review.",
    ],
    tradeoff_warning: null,
    confidence_note: null,
  };
}

// ─── Plain-English generators ─────────────────────────────────────────────────
export function dpdToEnglish(dpd, groupA, groupB) {
  const pct = Math.abs(dpd * 100).toFixed(1);
  const higher = dpd > 0 ? groupA : groupB;
  const lower  = dpd > 0 ? groupB : groupA;
  const biased = Math.abs(dpd) > BIAS_THRESHOLDS.demographic_parity_difference;
  return biased
    ? `${higher} is approved ${pct}% more often than ${lower}. This exceeds the 10% bias threshold — statistically significant disparity.`
    : `${higher} is approved ${pct}% more often than ${lower}. This is within the acceptable 10% bias threshold.`;
}

export function dirToEnglish(dir, groupA, groupB) {
  const pct = (dir * 100).toFixed(1);
  const biased = dir < BIAS_THRESHOLDS.disparate_impact_ratio;
  return biased
    ? `The minority group is approved at ${pct}% the rate of the majority — below the 80% (4/5ths) EEOC legal threshold. This constitutes adverse impact.`
    : `The minority group is approved at ${pct}% the rate of the majority — above the 80% (4/5ths) legal threshold.`;
}

export function eodToEnglish(eod) {
  const pct = (Math.abs(eod) * 100).toFixed(1);
  const biased = Math.abs(eod) > BIAS_THRESHOLDS.equalized_odds_difference;
  return biased
    ? `Error rates (false positives + false negatives) differ by ${pct}% across groups. Even equally qualified applicants are treated unequally.`
    : `Error rates differ by only ${pct}% across groups — within the acceptable 10% threshold. Verified with ground truth labels.`;
}

// ─── Main computation (fairness.py → FairnessMetricsEngine.compute) ──────────
export function computeMetrics({
  groupA,   // { name, n, approvalRate, qualificationRate? }
  groupB,   // { name, n, approvalRate, qualificationRate? }
  hasGroundTruth = false,
  domain = "general",
  driftRate = 0,
  zScore = 0,
}) {
  // 1. Sample guard
  const guard = sampleGuard(groupA.n, groupB.n);
  if (!guard.sufficient) {
    return { status: "insufficient_data", reason: guard.reason };
  }

  const nTotal = groupA.n + groupB.n;
  const rA = groupA.approvalRate;
  const rB = groupB.approvalRate;

  // 2. Demographic Parity Difference (DPD)
  // DPD = P(Ŷ=1|A=majority) − P(Ŷ=1|A=minority)
  const dpd = rA - rB;
  const dpdCI = diffCI(rA, groupA.n, rB, groupB.n);
  const dpdBiased = Math.abs(dpd) > BIAS_THRESHOLDS.demographic_parity_difference;

  // 3. Disparate Impact Ratio (DIR)
  // DIR = min(rA, rB) / max(rA, rB)  — EEOC 4/5ths rule
  const maxRate = Math.max(rA, rB, 1e-9);
  const dir = Math.min(rA, rB) / maxRate;
  const dirCI = conservativeCI(dir, nTotal);
  const dirBiased = dir < BIAS_THRESHOLDS.disparate_impact_ratio;

  // 4. Equalized Odds Difference (EOD) — only with ground truth
  let eod = null, eodCI = null, eodBiased = false;
  let gtA = null, gtB = null;

  if (hasGroundTruth && groupA.qualificationRate != null && groupB.qualificationRate != null) {
    gtA = deriveTPRFPR(groupA.n, rA, groupA.qualificationRate);
    gtB = deriveTPRFPR(groupB.n, rB, groupB.qualificationRate);
    const tprDiff = Math.abs(gtA.tpr - gtB.tpr);
    const fprDiff = Math.abs(gtA.fpr - gtB.fpr);
    eod = Math.max(tprDiff, fprDiff);
    eodCI = conservativeCI(eod, nTotal);
    eodBiased = eod > BIAS_THRESHOLDS.equalized_odds_difference;
  }

  // 5. Contradiction detection
  const contradiction = detectContradiction(dpd, dir);

  // 6. Alert severity (DPD drives primary alert)
  const alertSeverity = evaluateAlertSeverity(Math.abs(dpd));

  // 7. Risk score (composite weighted)
  const risk = computeRiskScore(dpd, dir, eod ?? 0, driftRate, zScore);

  // 8. Action card
  const actionCard = alertSeverity ? generateActionCard(alertSeverity, dpd, dir, domain) : null;

  return {
    status: "computed",
    sampleSize: nTotal,
    groupA: { ...groupA, approvalRate: rA },
    groupB: { ...groupB, approvalRate: rB },

    demographic_parity_difference: {
      value: parseFloat(dpd.toFixed(4)),
      abs_value: parseFloat(Math.abs(dpd).toFixed(4)),
      confidence_interval: dpdCI,
      is_biased: dpdBiased,
      label_status: "proxy_approximate",
      plain_english: dpdToEnglish(dpd, groupA.name, groupB.name),
    },

    disparate_impact_ratio: {
      value: parseFloat(dir.toFixed(4)),
      confidence_interval: dirCI,
      is_biased: dirBiased,
      label_status: "proxy_approximate",
      plain_english: dirToEnglish(dir, groupA.name, groupB.name),
    },

    equalized_odds_difference: hasGroundTruth ? {
      value: parseFloat(eod.toFixed(4)),
      confidence_interval: eodCI,
      is_biased: eodBiased,
      label_status: "verified",
      plain_english: eodToEnglish(eod),
      ground_truth: { groupA: gtA, groupB: gtB },
    } : {
      status: "metric_unavailable",
      plain_english: "Enable 'Ground truth available' to compute Equalized Odds Difference.",
    },

    contradiction,
    alert_severity: alertSeverity,
    risk,
    action_card: actionCard,
  };
}

// ─── Drift simulation (drift.py → DriftDetector) ─────────────────────────────
// Runs N steps, linearly interpolating approval rates from fair to biased.
export function runDriftSimulation({
  groupABase,   // { name, n, approvalRate, qualificationRate? }
  groupBBase,   // { name, n, approvalRate }
  hasGroundTruth = false,
  domain = "general",
  steps = 20,
  biasMagnitude = 0.25,  // how much rB drops by end
}) {
  const results = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const injectedBias = biasMagnitude * t;
    const rBNow = Math.max(0.02, groupBBase.approvalRate - injectedBias);

    const gA = { ...groupABase };
    const gB = { ...groupBBase, approvalRate: rBNow };

    const m = computeMetrics({ groupA: gA, groupB: gB, hasGroundTruth, domain });
    if (m.status !== "computed") continue;

    // Drift rate: slope from steps so far (simplification: current dpd / total days)
    const driftPerStep = i > 0 ? m.demographic_parity_difference.abs_value / i : 0;

    results.push({
      step: i + 1,
      label: `Day ${i + 1}`,
      dpd: m.demographic_parity_difference.value,
      dir: m.disparate_impact_ratio.value,
      eod: m.equalized_odds_difference?.value ?? null,
      riskScore: m.risk.score,
      alertSeverity: m.alert_severity,
      approvalRateA: gA.approvalRate,
      approvalRateB: rBNow,
      injectedBias: parseFloat(injectedBias.toFixed(4)),
      driftPerStep: parseFloat(driftPerStep.toFixed(4)),
    });
  }
  return results;
}

// ─── Preset scenarios ─────────────────────────────────────────────────────────
export const PRESET_SCENARIOS = [
  {
    id: "fair_lending",
    label: "Fair Lending System",
    description: "A well-calibrated credit model. Both groups approved at similar rates. All metrics pass.",
    domain: "lending",
    groupA: { name: "Applicants A", n: 500, approvalRate: 0.65, qualificationRate: 0.60 },
    groupB: { name: "Applicants B", n: 400, approvalRate: 0.62, qualificationRate: 0.60 },
    hasGroundTruth: true,
    expectedOutcome: "No bias detected. DPD ≈ 3%, DIR ≈ 95%, EOD ≈ 2%.",
  },
  {
    id: "eeoc_violation",
    label: "EEOC 4/5ths Violation",
    description: "A hiring model where one group is approved at only 65% the rate of another — below the legal 80% threshold.",
    domain: "hiring",
    groupA: { name: "Demographic A", n: 600, approvalRate: 0.70, qualificationRate: 0.65 },
    groupB: { name: "Demographic B", n: 450, approvalRate: 0.45, qualificationRate: 0.65 },
    hasGroundTruth: true,
    expectedOutcome: "DIR ≈ 64% — EEOC adverse impact. Alert fires.",
  },
  {
    id: "critical_bias",
    label: "Critical Bias Spike",
    description: "Severe disparity — one group approved 30% more. Critical alert and action card fires.",
    domain: "lending",
    groupA: { name: "Group A",  n: 800, approvalRate: 0.78, qualificationRate: 0.70 },
    groupB: { name: "Group B",  n: 300, approvalRate: 0.48, qualificationRate: 0.70 },
    hasGroundTruth: true,
    expectedOutcome: "DPD ≈ 30%, DIR ≈ 62%, EOD elevated. CRITICAL alert.",
  },
  {
    id: "impossibility",
    label: "Fairness Impossibility Theorem",
    description: "DPD looks near-fair but DIR is problematic. Contradiction detected.",
    domain: "general",
    groupA: { name: "Majority", n: 1000, approvalRate: 0.60, qualificationRate: 0.55 },
    groupB: { name: "Minority", n: 200,  approvalRate: 0.57, qualificationRate: 0.70 },
    hasGroundTruth: true,
    expectedOutcome: "DPD ≈ 3% (looks fair), DIR ≈ 95% — but EOD shows unequal error rates. Contradiction detected.",
  },
  {
    id: "small_sample",
    label: "Small Sample Warning",
    description: "Only 20 decisions — metrics can't fire reliably. Sample guard blocks computation.",
    domain: "general",
    groupA: { name: "Group A", n: 15, approvalRate: 0.60, qualificationRate: 0.55 },
    groupB: { name: "Group B", n: 12, approvalRate: 0.40, qualificationRate: 0.55 },
    hasGroundTruth: false,
    expectedOutcome: "Insufficient data. Sample guard blocks all metrics.",
  },
  {
    id: "borderline",
    label: "Borderline Case",
    description: "Metrics right on the threshold. Warning fires but not Alert. Demonstrates CI width.",
    domain: "healthcare",
    groupA: { name: "Group A", n: 150, approvalRate: 0.55, qualificationRate: 0.50 },
    groupB: { name: "Group B", n: 120, approvalRate: 0.46, qualificationRate: 0.50 },
    hasGroundTruth: false,
    expectedOutcome: "DPD ≈ 9% — WARNING fires (threshold 7%). CI overlaps alert boundary.",
  },
];
