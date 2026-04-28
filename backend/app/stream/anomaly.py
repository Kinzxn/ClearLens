import numpy as np

class SpikeDetector:
    """
    Lightweight Z-score spike detector.
    Detects metric values that deviate >3 standard deviations from recent mean.
    Replaces Isolation Forest — correct choice for streaming small-window data.
    """

    Z_SCORE_THRESHOLD = 3.0

    def detect(self, current_value: float, history: list[float]) -> dict:
        if len(history) < 48:
            return {"spike_detected": False, "reason": "insufficient_history (requires 48h)"}

        from sklearn.ensemble import IsolationForest
        
        # Reshape for sklearn
        X = np.array(history).reshape(-1, 1)
        model = IsolationForest(contamination=0.05, random_state=42)
        model.fit(X)
        
        # predict returns -1 for outler, 1 for inlier
        prediction = model.predict([[current_value]])[0]
        score = model.decision_function([[current_value]])[0]

        spike_detected = prediction == -1 and score < -0.5

        return {
            "spike_detected": bool(spike_detected),
            "anomaly_score": round(float(score), 3),
            "mean_val": round(float(np.mean(history)), 4),
            "plain_english": (
                "A statistically significant isolated spike was detected "
                "outside the standard 95% rolling distribution band."
            ) if spike_detected else "No anomaly detected.",
        }
