from enum import Enum
from datetime import datetime, timedelta
import hashlib

class AlertSeverity(Enum):
    WARNING  = "warning"   
    ALERT    = "alert"     
    CRITICAL = "critical"  

AUTO_PAUSE_RULES = [
    {"condition": lambda m: m.get("disparate_impact_ratio", {}).get("value", 1) < 0.60,
     "recommendation": "pause_model",
     "plain_english":  "DIR below 0.6 — EEOC 4/5ths rule severely violated. Pause the model."},
    {"condition": lambda m, d: abs(d.get("daily_drift_rate", 0)) > 0.03,
     "recommendation": "trigger_retrain",
     "plain_english":  "Drift exceeds 3%/day. Schedule model retraining within 48 hours."},
    {"condition": lambda m: m.get("equalized_odds_difference", {}).get("value", 0) > 0.20,
     "recommendation": "recalibrate_threshold",
     "plain_english":  "Equalized odds gap >20%. Recalibrate decision threshold per group."},
]

class AlertEngine:
    THRESHOLDS = {
        AlertSeverity.WARNING:  0.07,
        AlertSeverity.ALERT:    0.10,
        AlertSeverity.CRITICAL: 0.20,
    }

    COOLDOWN_MINUTES = 15

    def evaluate(
        self,
        metric_value: float,
        metric_name: str,
        org_id: str,
        recent_alerts: list[dict],
        metric_results: dict | None = None,
        drift_results: dict | None = None
    ) -> dict | None:

        severity = None
        for level in [AlertSeverity.CRITICAL, AlertSeverity.ALERT, AlertSeverity.WARNING]:
            if abs(metric_value) >= self.THRESHOLDS[level]:
                severity = level
                break

        if not severity:
            return None

        fingerprint = self._fingerprint(org_id, metric_name, severity)
        if self._is_suppressed(fingerprint, recent_alerts):
            return None

        alert = {
            "org_id":       org_id,
            "severity":     severity.value,
            "metric_name":  metric_name,
            "metric_value": metric_value,
            "fingerprint":  fingerprint,
            "timestamp":    datetime.utcnow().isoformat(),
            "acknowledged": False,
            "action_taken": None,
            "channels":     self._channels(severity),
            "group_key":    f"{org_id}:{severity.value}",
        }
        
        m = metric_results or {}
        if "contradictions" in m and m["contradictions"]:
            alert["contradictions"] = m["contradictions"]
        
        m = metric_results or {}
        d = drift_results or {}
        for rule in AUTO_PAUSE_RULES:
            try:
                if rule["condition"].__code__.co_argcount == 1:
                    match = rule["condition"](m)
                else:
                    match = rule["condition"](m, d)
                if match:
                    alert["auto_pause_recommendation"] = {
                        "recommendation": rule["recommendation"],
                        "plain_english": rule["plain_english"]
                    }
                    break
            except Exception:
                continue

        return alert

    def _fingerprint(self, org_id: str, metric: str, severity: AlertSeverity) -> str:
        raw = f"{org_id}:{metric}:{severity.value}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def _is_suppressed(self, fingerprint: str, recent_alerts: list[dict]) -> bool:
        cutoff = datetime.utcnow() - timedelta(minutes=self.COOLDOWN_MINUTES)
        return any(
            a["fingerprint"] == fingerprint
            and datetime.fromisoformat(a["timestamp"]) > cutoff
            for a in recent_alerts
        )

    def _channels(self, severity: AlertSeverity) -> list:
        return {
            AlertSeverity.WARNING:  ["in_app"],
            AlertSeverity.ALERT:    ["in_app", "email"],
            AlertSeverity.CRITICAL: ["in_app", "email", "sms", "push"],
        }[severity]
