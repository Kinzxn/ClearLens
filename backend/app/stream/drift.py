import pandas as pd
import numpy as np
from collections import deque
from datetime import datetime, timedelta
from app.db.redis_state import RollingWindowStore

class DriftDetector:
    def __init__(self, window_days: int = 7, alert_slope_threshold: float = 0.02):
        self.window_days = window_days
        self.alert_slope_threshold = alert_slope_threshold  # 2% drift per day = alert
        self.ewma_alpha = 0.1  # Smoothing factor — lower = slower response, more stable

    async def detect_drift(
        self,
        org_id: str,
        metric: str,
        store: RollingWindowStore,
    ) -> dict:
        history = await store.get_window(org_id, metric, days=self.window_days)

        if len(history) < 48:  # 48 hourly snapshots = 2 days minimum
            return {"drift_detected": False, "reason": "insufficient_data"}

        df = pd.DataFrame(history)
        df["ts"] = pd.to_datetime(df["ts"])
        df = df.sort_values("ts")
        df["hours_elapsed"] = (df["ts"] - df["ts"].min()).dt.total_seconds() / 3600

        from scipy.stats import linregress
        res = linregress(df["hours_elapsed"], df["value"])
        slope = res.slope if not np.isnan(res.slope) else 0.0
        daily_slope = slope * 24

        drift_detected = abs(daily_slope) > self.alert_slope_threshold

        result = {
            "drift_detected": drift_detected,
            "daily_drift_rate": round(daily_slope, 5),
            "direction": "worsening" if daily_slope > 0 else "improving",
            "window_days": self.window_days,
            "data_points": len(df),
        }

        if drift_detected:
            current = df["value"].iloc[-1]
            days_to_threshold = (0.10 - current) / daily_slope if daily_slope != 0 else None

            if days_to_threshold and days_to_threshold > 0:
                projected_value_7d = current + (daily_slope * 7)
                result["projected_threshold_breach"] = f"~{abs(round(days_to_threshold, 1))} days"
                result["simulated_7day_impact"] = round(projected_value_7d, 4)
                result["plain_english"] = (
                    f"Bias is slowly {result['direction']} at "
                    f"{abs(round(daily_slope * 100, 2))}% per day. "
                    f"At this rate, the system will breach the critical threshold in "
                    f"{result['projected_threshold_breach']}. "
                    f"In 7 days, this metric will be approximately "
                    f"{round(projected_value_7d * 100, 1)}%."
                )
            else:
                result["projected_threshold_breach"] = "already breached"

        return result

    def _linear_slope(self, x: pd.Series, y: pd.Series) -> float:
        n = len(x)
        denom = n * (x**2).sum() - x.sum()**2
        return (n * (x * y).sum() - x.sum() * y.sum()) / denom if denom != 0 else 0.0
