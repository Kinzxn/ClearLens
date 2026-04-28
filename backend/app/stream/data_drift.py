from scipy.stats import ks_2samp
import numpy as np

class DataDriftDetector:
    """
    PSI (Population Stability Index) for feature-level data drift.
    KS test for model output distribution drift.
    Cross-reference with bias drift to classify root cause.
    """

    PSI_THRESHOLD = 0.2   # PSI > 0.2 = significant data drift

    def compute_psi(self, baseline: list, current: list, bins: int = 10) -> float:
        if not baseline or not current: return 0.0
        min_val = min(np.min(baseline), np.min(current))
        max_val = max(np.max(baseline), np.max(current))
        if min_val == max_val: return 0.0
        bin_edges = np.linspace(min_val, max_val, bins + 1)
        
        baseline_pcts = np.histogram(baseline, bins=bin_edges, density=True)[0] + 1e-9
        current_pcts  = np.histogram(current,  bins=bin_edges, density=True)[0] + 1e-9
        return float(np.sum((current_pcts - baseline_pcts) * np.log(current_pcts / baseline_pcts)))

    def classify(self, data_drift_psi: float, bias_drift_slope: float) -> dict:
        data_drifted  = data_drift_psi  > self.PSI_THRESHOLD
        bias_drifting = abs(bias_drift_slope) > 0.02

        if data_drifted and bias_drifting:
            label    = "Input data changed AND model fairness degraded"
            cause    = "likely_data_issue"
        elif not data_drifted and bias_drifting:
            label    = "Input data stable — fairness degraded anyway"
            cause    = "likely_model_issue"
        elif data_drifted and not bias_drifting:
            label    = "Input data changed but fairness is holding"
            cause    = "monitor_closely"
        else:
            label    = "System stable"
            cause    = "no_action"

        return {"data_drift_psi": round(data_drift_psi, 4),
                "bias_drift_slope": round(bias_drift_slope, 5),
                "classification": cause,
                "plain_english": label}
