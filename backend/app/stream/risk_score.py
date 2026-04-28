class BiasRiskScorer:
    """
    Composite risk score from weighted fairness signals.
    """
    DEFAULT_WEIGHTS = {
        "demographic_parity_difference": 0.30,
        "disparate_impact_ratio":        0.25,
        "equalized_odds_difference":     0.20,
        "drift_rate":                    0.15,
        "anomaly_z_score":               0.10,
    }

    def compute(self, metrics: dict, drift_rate: float, z_score: float) -> dict:
        dpd  = abs(metrics.get("demographic_parity_difference", {}).get("value", 0))
        dir_ = max(0, 1 - metrics.get("disparate_impact_ratio", {}).get("value", 1))
        eod  = abs(metrics.get("equalized_odds_difference",     {}).get("value", 0))

        raw = (
            self.DEFAULT_WEIGHTS["demographic_parity_difference"] * min(dpd / 0.20, 1) +
            self.DEFAULT_WEIGHTS["disparate_impact_ratio"]        * min(dir_ / 0.20, 1) +
            self.DEFAULT_WEIGHTS["equalized_odds_difference"]     * min(eod / 0.20, 1) +
            self.DEFAULT_WEIGHTS["drift_rate"]     * min(abs(drift_rate) / 0.05, 1) +
            self.DEFAULT_WEIGHTS["anomaly_z_score"] * min(abs(z_score) / 5.0, 1)
        ) * 100

        score = round(min(raw, 100), 1)
        band, label, advice = next(
            (b, l, a) for threshold, b, l, a in
            [(80, "CRITICAL", "CRITICAL", "Immediate action required"),
             (50, "HIGH", "HIGH", "Alert stakeholders"),
             (20, "MODERATE", "MODERATE", "Monitor closely"),
             (0,  "LOW", "LOW", "System operating normally")]
            if score >= threshold
        )

        return {"score": score, "band": band, "advice": advice}
