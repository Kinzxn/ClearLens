from scipy import stats
import numpy as np

MIN_SAMPLE_PER_GROUP = 30  # Configurable via env

class SampleGuard:

    def is_sufficient(self, group_counts: dict) -> tuple[bool, str]:
        """
        Returns (ready, reason) tuple.
        All sensitive groups must have >= MIN_SAMPLE_PER_GROUP decisions.
        """
        insufficient = [
            g for g, n in group_counts.items() if n < MIN_SAMPLE_PER_GROUP
        ]
        if insufficient:
            smallest = min(group_counts.values())
            needed = MIN_SAMPLE_PER_GROUP - smallest
            return False, (
                f"Insufficient data: groups {insufficient} need {needed} more decisions "
                f"before metrics are statistically meaningful."
            )
        return True, "sufficient"

    def confidence_interval(
        self, metric_value: float, n_total: int, confidence: float = 0.95
    ) -> tuple[float, float]:
        """
        Returns a conservative (maximum-width) confidence interval bound
        applicable to percentage differences and rates when exact p1/p2 variances are unpassed.
        """
        z = stats.norm.ppf((1 + confidence) / 2)
        # Conservative upper bound variance for any proportion p(1-p) <= 0.25
        margin = z * np.sqrt(0.25 / max(n_total, 1))
        return (
            round(metric_value - margin, 4),
            round(metric_value + margin, 4)
        )
