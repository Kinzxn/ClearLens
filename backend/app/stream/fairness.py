import pandas as pd
import numpy as np
from scipy import stats
from fairlearn.metrics import (
    demographic_parity_difference,
    equalized_odds_difference,
    selection_rate
)
from app.stream.sample_guard import SampleGuard

class FairnessMetricsEngine:
    BIAS_THRESHOLDS = {
        "demographic_parity_difference": 0.10,
        "equalized_odds_difference":     0.10,
        "disparate_impact_ratio":        0.80,
    }

    def __init__(self):
        self.guard = SampleGuard()

    def compute(
        self,
        df: pd.DataFrame,
        decision_col: str,
        sensitive_col: str,
        ground_truth_col: str | None = None,
    ) -> dict:

        group_counts = df.groupby(sensitive_col).size().to_dict()
        sufficient, reason = self.guard.is_sufficient(group_counts)

        if not sufficient:
            return {
                "status": "insufficient_data",
                "reason": reason,
                "sample_sizes": group_counts,
                "plain_english": reason,
            }

        n_total = len(df)
        results = {"status": "computed", "sample_size": n_total}

        # --- Demographic Parity ---
        # Passing zeros for y_true as DPD only evaluates y_pred
        dummy_y_true = np.zeros_like(df[decision_col])
        dpd = demographic_parity_difference(
            dummy_y_true, df[decision_col], sensitive_features=df[sensitive_col]
        )
        ci = self.guard.confidence_interval(dpd, n_total)
        results["demographic_parity_difference"] = {
            "value": round(dpd, 4),
            "confidence_interval": ci,
            "sample_size": n_total,
            "is_biased": abs(dpd) > self.BIAS_THRESHOLDS["demographic_parity_difference"],
            "label_status": "proxy_approximate",  # does not require ground truth
            "plain_english": self._dpd_to_english(dpd, sensitive_col),
        }

        # --- Disparate Impact Ratio ---
        rates = df.groupby(sensitive_col)[decision_col].mean()
        if len(rates) >= 2:
            max_rate = max(rates.max(), 1e-9) # prevent ZeroDivisionError
            dir_ratio = rates.min() / max_rate
            ci_dir = self.guard.confidence_interval(dir_ratio, n_total)
            results["disparate_impact_ratio"] = {
                "value": round(dir_ratio, 4),
                "confidence_interval": ci_dir,
                "sample_size": n_total,
                "is_biased": dir_ratio < self.BIAS_THRESHOLDS["disparate_impact_ratio"],
                "label_status": "proxy_approximate",
                "plain_english": self._dir_to_english(dir_ratio, rates),
            }

        # --- Equalized Odds (only when ground truth available) ---
        if ground_truth_col and ground_truth_col in df.columns:
            eod = equalized_odds_difference(
                df[ground_truth_col], df[decision_col],
                sensitive_features=df[sensitive_col]
            )
            ci_eod = self.guard.confidence_interval(eod, n_total)
            results["equalized_odds_difference"] = {
                "value": round(eod, 4),
                "confidence_interval": ci_eod,
                "sample_size": n_total,
                "is_biased": abs(eod) > self.BIAS_THRESHOLDS["equalized_odds_difference"],
                "label_status": "verified",  # ground truth was provided
                "plain_english": self._eod_to_english(eod, sensitive_col),
            }
        else:
            results["equalized_odds_difference"] = {
                "status": "metric_unavailable",
                "plain_english": "Awaiting ground truth labels to compute this metric."
            }

        # --- Contradiction detection ---
        results["contradictions"] = self._detect_contradictions(results)

        return results

    def _dpd_to_english(self, dpd: float, attribute: str) -> str:
        pct = abs(round(dpd * 100, 1))
        direction = "more" if dpd > 0 else "less"
        return (
            f"The majority group is approved {pct}% {direction} often "
            f"than minority groups based on {attribute}. "
            f"⚠️ This is a proxy metric — does not require ground truth labels."
        )

    def _eod_to_english(self, eod: float, attribute: str) -> str:
        pct = abs(round(eod * 100, 1))
        return (
            f"The error rates (false positives + false negatives) differ by {pct}% "
            f"across groups in {attribute}. ✅ Verified — based on actual outcome labels."
        )

    def _dir_to_english(self, ratio: float, rates: pd.Series) -> str:
        pct = round(ratio * 100, 1)
        return (
            f"The least-approved group receives decisions at {pct}% the rate of the "
            f"most-approved group. (4/5ths rule: below 80% suggests adverse impact.)"
        )

    def _detect_contradictions(self, results: dict) -> list:
        contradictions = []
        dpd = results.get("demographic_parity_difference", {}).get("value", 0)
        dir_val = results.get("disparate_impact_ratio", {}).get("value", 1)

        if abs(dpd) < 0.05 and dir_val < 0.85:
            contradictions.append({
                "metrics": ["demographic_parity_difference", "disparate_impact_ratio"],
                "explanation": (
                    "These two metrics are giving conflicting signals. "
                    "This is a known mathematical property called the Fairness Impossibility Theorem — "
                    "it is not always possible to satisfy both simultaneously. "
                    "Your organization must choose which type of fairness to prioritize "
                    "based on your domain and the communities you serve."
                ),
                "recommendation": (
                    "If you optimize Demographic Parity, Disparate Impact Ratio will worsen. "
                    "If you optimize Disparate Impact Ratio, Demographic Parity may increase. "
                    "Surface this tradeoff to stakeholders — do not auto-resolve it."
                ),
            })
        return contradictions
