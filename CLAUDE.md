# CLAUDE.md — ClearLens
## The Datadog / Splunk for AI Fairness
### Google Solution Challenge — Agent Coding Guide

---

## 🧭 Project Overview

ClearLens is a **real-time, continuous bias monitoring platform** for deployed AI systems —
monitoring, alerting, root-cause diagnosis, what-if simulation, and compliance reporting
in a single platform. Organizations connect via a lightweight SDK. ClearLens streams decisions,
computes statistically-validated fairness metrics, detects spikes and slow drift, fires
actionable alerts, diagnoses WHY bias happened, and generates regulatory-ready PDF reports.

**Core innovation:** Most bias tools audit the past. ClearLens watches the present,
explains the root cause, simulates the future, and helps you fix it.

**Product positioning:** We are the Datadog / Splunk for AI Fairness.
- **Monitoring** — real-time metrics with confidence intervals
- **Alerts** — 3-tier escalation with suppression
- **Drift detection** — EWMA trend + Z-score spikes
- **Root cause** — automatic feature distribution analysis
- **What-if simulation** — predict impact of policy changes before applying them
- **Compliance reports** — auto-generated PDF for EEOC, GDPR, EU AI Act
- **Public transparency** — opt-in fairness scorecard for external accountability
- **Pre-deployment testing** — bias test before models go live

> **Design philosophy:** Every claim must be *architecturally enforced*, not policy-based.
> Every metric carries a *confidence score*. Every alert is *explainable*.
> Every pattern has a *simulated future impact*. Every org gets a *risk score* executives understand.

---

## 🏗️ Repository Structure

```
clearlens/
├── sdk/                          # Lightweight client SDK (Python + JS)
│   ├── clearlens_sdk/
│   │   ├── __init__.py
│   │   ├── client.py             # Main SDK entry point
│   │   ├── pii_scrubber.py       # PII stripping before any data leaves client
│   │   ├── schema_mapper.py      # Maps custom org schemas to ClearLens format
│   │   ├── payload_validator.py  # [NEW] Pre-flight schema + PII lint before publish
│   │   ├── buffer.py             # Offline buffer for graceful degradation
│   │   └── config.py             # SDK config loader
│   ├── tests/
│   └── pyproject.toml
│
├── backend/                      # FastAPI backend + stream processor
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── routers/
│   │   │   ├── ingest.py         # Decision log ingestion endpoint (+ server-side PII guard)
│   │   │   ├── metrics.py        # Fairness metric query endpoints
│   │   │   ├── alerts.py         # Alert management endpoints
│   │   │   ├── audit.py          # Audit trail endpoints
│   │   │   ├── ground_truth.py   # Delayed ground truth ingestion endpoint
│   │   │   ├── whatif.py         # [NEW] What-If simulator API endpoint
│   │   │   ├── report.py         # [NEW] Compliance PDF report generation endpoint
│   │   │   ├── transparency.py   # [NEW] Public transparency page data endpoint
│   │   │   └── predeployment.py  # [NEW] Synthetic bias test (pre-deployment) endpoint
│   │   ├── stream/
│   │   │   ├── processor.py      # Core stream processing logic (stateful via Redis)
│   │   │   ├── fairness.py       # Fairness metric computations (with confidence intervals)
│   │   │   ├── drift.py          # Rolling trend + slow drift detection (EWMA-based)
│   │   │   ├── anomaly.py        # Spike anomaly detection (Z-score, NOT Isolation Forest)
│   │   │   ├── sample_guard.py   # Minimum sample threshold gating
│   │   │   ├── ground_truth.py   # Reconciles delayed labels with stored metric snapshots
│   │   │   ├── root_cause.py     # [NEW] Auto root cause analysis (KS-test feature shift)
│   │   │   ├── data_drift.py     # [NEW] Data drift vs bias drift separation (PSI + KS test)
│   │   │   └── risk_score.py     # [NEW] Composite Bias Risk Score (0–100)
│   │   ├── alerts/
│   │   │   ├── engine.py         # 3-tier alert escalation + suppression + grouping
│   │   │   ├── notifier.py       # Email / SMS / push notification dispatch
│   │   │   ├── action_card.py    # Gemini-powered action recommendation (with tradeoff simulation)
│   │   │   └── suppressor.py     # [NEW] Alert deduplication, cooldown, and grouping logic
│   │   ├── models/
│   │   │   ├── decision.py       # Decision log Pydantic model (includes model_version field)
│   │   │   ├── metric.py         # Fairness metric model (CI, sample_size, label_status)
│   │   │   ├── alert.py          # Alert model (fingerprint, auto_pause_recommendation)
│   │   │   ├── ground_truth.py   # Ground truth label model
│   │   │   └── risk_score.py     # [NEW] Bias Risk Score model
│   │   ├── db/
│   │   │   ├── firestore.py      # Firestore client + queries
│   │   │   └── redis_state.py    # [NEW] Redis-backed rolling window state store
│   │   └── config.py             # Environment config
│   ├── tests/
│   └── requirements.txt
│
├── dashboard/                    # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Main live monitoring view
│   │   │   ├── AlertInbox.jsx    # Alert management page
│   │   │   ├── AuditLog.jsx      # Full audit trail
│   │   │   └── Settings.jsx      # SDK config, thresholds, notifications
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx              # Main live monitoring view
│   │   │   ├── AlertInbox.jsx             # Alert management page
│   │   │   ├── AuditLog.jsx               # Full audit trail
│   │   │   ├── WhatIfSimulator.jsx        # [NEW] Policy change simulation page
│   │   │   ├── ReportGenerator.jsx        # [NEW] Compliance PDF report page
│   │   │   ├── PreDeployment.jsx          # [NEW] Pre-deployment bias testing page
│   │   │   ├── Transparency.jsx           # [NEW] Public transparency scorecard page
│   │   │   └── Settings.jsx               # SDK config, thresholds, notifications
│   │   ├── components/
│   │   │   ├── LiveMetricChart.jsx        # WebSocket-powered real-time chart
│   │   │   ├── DriftTrendLine.jsx         # 7-day rolling trend visualization
│   │   │   ├── AlertBanner.jsx            # 3-tier alert display
│   │   │   ├── ActionCard.jsx             # Gemini action recommendation + auto-pause advice
│   │   │   ├── FairnessTradeoffCard.jsx   # Contradictory metrics tradeoff UI
│   │   │   ├── PlainEnglishToggle.jsx     # Technical / Plain English mode switch
│   │   │   ├── MetricExplainer.jsx        # Per-metric plain English description
│   │   │   ├── ConfidenceBadge.jsx        # Displays confidence interval + sample size
│   │   │   ├── ImpactSimulator.jsx        # "In 7 days this becomes X% bias"
│   │   │   ├── AlertGroupPanel.jsx        # Grouped + deduplicated alert list
│   │   │   ├── RootCausePanel.jsx         # [NEW] Auto root cause analysis display
│   │   │   ├── RiskScoreDial.jsx          # [NEW] Composite 0–100 Bias Risk Score gauge
│   │   │   ├── DriftTypeSeparator.jsx     # [NEW] Data drift vs bias drift panel
│   │   │   ├── ModelVersionTimeline.jsx   # [NEW] Bias by model version chart
│   │   │   └── IndustryTemplateSelector.jsx # [NEW] Industry preset onboarding
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js   # WebSocket connection management
│   │   │   └── useAlerts.js      # Alert polling and state
│   │   ├── store/
│   │   │   └── metricsStore.js   # Zustand global state
│   │   └── utils/
│   │       ├── metricFormatters.js  # Convert metric numbers to plain English
│   │       └── alertHelpers.js
│   ├── public/
│   └── package.json
│
├── infra/                        # Google Cloud infrastructure
│   ├── pubsub.tf                 # Pub/Sub topic + subscription config
│   ├── cloudrun.tf               # Cloud Run service definitions
│   ├── redis.tf                  # [NEW] Redis (Memorystore) for rolling state
│   └── firestore.tf              # Firestore indexes and rules
│
├── demo/                         # Demo simulation for judges
│   ├── simulate_decisions.py     # Generates fake decision stream with bias slider
│   ├── bias_scenarios.json       # Pre-built bias injection scenarios
│   └── README.md
│
├── docs/
│   ├── architecture.md
│   ├── sdk_integration.md
│   ├── fairness_metrics.md
│   ├── fairness_approximation_notice.md
│   └── compliance_frameworks.md  # [NEW] EEOC / GDPR / EU AI Act mapping
│
├── industry_templates/           # [NEW] Pre-built configs per industry
│   ├── hiring.json
│   ├── lending.json
│   ├── healthcare.json
│   └── insurance.json
│
├── CLAUDE.md                     # ← You are here
└── docker-compose.yml
```

---

## ⚙️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| SDK | Python 3.11 | Lightweight, pip-installable, pandas for local processing |
| Backend | FastAPI + Python | Async, fast, great for streaming |
| Stream Ingestion | Google Cloud Pub/Sub | Scales to millions of msg/sec natively |
| Stream Processing | Cloud Run (always-on) | Serverless, auto-scales |
| Rolling State | Redis (Google Memorystore) | Stateful windowed computation — fixes the stateless contradiction |
| Database | Google Firestore | Real-time listeners, scales horizontally |
| Fairness Metrics | Fairlearn + pandas + scipy | Industry-standard + confidence intervals |
| Anomaly Detection | Z-score + EWMA | Lightweight, streaming-native, stable on small batches |
| AI Explanations | Gemini 1.5 Flash API | Fast, cheap, plain English + tradeoff simulation |
| Frontend | React 18 + Tailwind CSS | Component-based, fast to build |
| Real-time UI | WebSockets (FastAPI) | Push metric updates to dashboard live |
| Notifications | SendGrid (email) + Firebase Cloud Messaging (push) | Multi-channel alert delivery |
| Auth | Firebase Auth | Simple, secure, Google-native |
| Deployment | Google Cloud Run + Firebase Hosting | Serverless, scales to zero |

---

## 🔑 Environment Variables

```bash
# backend/.env
GOOGLE_CLOUD_PROJECT=clearlens-project
PUBSUB_TOPIC_ID=decision-logs
PUBSUB_SUBSCRIPTION_ID=stream-processor-sub
FIRESTORE_COLLECTION_METRICS=metrics
FIRESTORE_COLLECTION_ALERTS=alerts
FIRESTORE_COLLECTION_AUDIT=audit_trail
FIRESTORE_COLLECTION_GROUND_TRUTH=ground_truth_labels
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
FCM_SERVER_KEY=your_fcm_key
JWT_SECRET=your_jwt_secret
ALERT_COOLDOWN_MINUTES=15          # Suppression window per metric per org
MIN_SAMPLE_SIZE=30                 # Minimum decisions before metrics fire

# dashboard/.env
VITE_API_URL=https://your-cloud-run-url
VITE_WS_URL=wss://your-cloud-run-url/ws
VITE_FIREBASE_CONFIG={"apiKey":"..."}
```

---

## 📦 SDK — How It Works

The SDK is what organizations install on their side. It intercepts decisions, scrubs PII,
validates the payload, maps their schema, and publishes to Pub/Sub.

> **Honest integration note:** A 3-line code drop is the *developer experience target*.
> Real enterprise rollout requires schema mapping review, compliance approval, and infra
> onboarding — typically 1–3 weeks. The SDK minimizes the *technical* complexity; the
> organizational complexity is a known factor we document in `sdk_integration.md`.

### Target Integration Experience

```python
from clearlens_sdk import ClearLensClient

client = ClearLensClient(api_key="org_api_key", schema_config="clearlens.config.json")

# Organization calls this every time their AI makes a decision
client.log_decision({
    "loan_approved": True,
    "applicant_age": 34,
    "applicant_gender": "female",
    "applicant_zip": "10001",
    "credit_score": 720,
    "timestamp": "2026-03-30T10:45:00Z"
})
```

### Schema Config File (clearlens.config.json)

```json
{
  "decision_field": "loan_approved",
  "decision_positive_value": true,
  "sensitive_attributes": ["applicant_gender", "applicant_zip"],
  "timestamp_field": "timestamp",
  "proxy_attributes": ["applicant_zip"],
  "domain": "lending"
}
```

### SDK Internal Flow

```
client.log_decision(raw_data)
        │
        ▼
schema_mapper.py        → Maps org fields → ClearLens standard format
        │
        ▼
pii_scrubber.py         → Strips names, emails, SSNs, phone numbers (client-side)
        │
        ▼
payload_validator.py    → Pre-flight PII lint: rejects payload if residual PII detected
        │
        ▼
buffer.py               → Queues locally if offline, flushes on reconnect
        │
        ▼
Pub/Sub publish()       → Sends to Google Cloud Pub/Sub topic
```

---

### pii_scrubber.py — Critical File

```python
import re
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

FIELDS_TO_ALWAYS_DROP = ["name", "full_name", "email", "phone", "ssn", "national_id", "passport"]

def scrub(decision: dict) -> dict:
    """
    Remove PII from decision dict before publishing.
    Always drop known PII fields.
    Run Presidio on string values to catch unexpected PII.
    """
    cleaned = {}
    for key, value in decision.items():
        if key.lower() in FIELDS_TO_ALWAYS_DROP:
            continue
        if isinstance(value, str):
            results = analyzer.analyze(text=value, language="en")
            if results:
                continue  # Drop field entirely if PII detected
        cleaned[key] = value
    return cleaned
```

---

### payload_validator.py — [NEW] Pre-Flight PII Guard (Client-Side)

```python
"""
Acts as a final gate before publish. Even if pii_scrubber.py runs,
this validator double-checks for known PII patterns and rejects the
payload hard (raises exception) rather than silently dropping fields.
This prevents misconfigured or custom scrubbers from leaking PII.
"""
import re
from typing import Any

# Common PII heuristics as a last line of defense
PII_PATTERNS = [
    (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "email"),
    (r"\b\d{10,13}\b", "phone_candidate"),
]

def validate_no_pii(payload: dict) -> None:
    """
    Raises ValueError if residual PII patterns detected in any string field.
    Called by SDK client AFTER pii_scrubber.py — belt-and-suspenders approach.
    """
    for key, value in payload.items():
        if isinstance(value, str):
            for pattern, label in PII_PATTERNS:
                if re.search(pattern, value):
                    raise ValueError(
                        f"PII validation failed: field '{key}' matches pattern '{label}'. "
                        f"Payload rejected. Check your schema_config and pii_scrubber settings."
                    )
```

---

## 📡 Backend — Server-Side PII Guard (ingest.py)

> **Flaw 1 fix:** Client-side scrubbing is our primary layer, but we never trust it blindly.
> The ingest endpoint runs a lightweight server-side PII check as a defense-in-depth measure.
> Payloads that pass the SDK validator but still contain identifiable patterns are rejected
> with a 422 error and an audit log entry. This makes the "PII never reaches server" claim
> *architecturally enforced*, not just policy-based.

```python
# backend/app/routers/ingest.py (key section)

from fastapi import HTTPException
from app.stream.server_pii_guard import server_side_pii_check

@router.post("/ingest")
async def ingest_decision(payload: DecisionPayload, org_id: str):
    # Server-side defense-in-depth PII scan
    pii_flags = server_side_pii_check(payload.dict())
    if pii_flags:
        await audit_trail.log_pii_rejection(org_id, pii_flags)
        raise HTTPException(
            status_code=422,
            detail={
                "error": "PII_DETECTED_SERVER_SIDE",
                "fields": pii_flags,
                "message": "Payload rejected. Update your SDK pii_scrubber configuration.",
            }
        )
    # ... proceed to Pub/Sub publish
```

---

## 📡 Backend — Stream Processor

### ⚠️ STATEFUL DESIGN (Flaw 5 Fix)

The processor is **NOT stateless**. It requires a 7-day rolling window — which is inherently
stateful. We resolve this correctly:

- **Rolling window state** is stored in **Redis (Google Memorystore)** with TTL-keyed hourly buckets
- Cloud Run instances can crash and restart; state survives in Redis
- Each processor instance reads/writes the same Redis keyspace, making horizontal scaling safe
- This is the correct architecture for windowed stream processing without a full Flink/Dataflow setup

```python
# backend/app/db/redis_state.py

import redis.asyncio as redis
import json
from datetime import datetime, timedelta

class RollingWindowStore:
    """
    Redis-backed rolling window for metric history.
    Keys: clearlens:{org_id}:{metric}:{YYYY-MM-DD-HH}
    TTL:  8 days (covers 7-day window with 1-day buffer)
    """

    def __init__(self, redis_url: str):
        self.client = redis.from_url(redis_url)
        self.TTL_SECONDS = 8 * 24 * 3600

    async def append_snapshot(self, org_id: str, metric: str, value: float, ts: datetime):
        key = f"clearlens:{org_id}:{metric}:{ts.strftime('%Y-%m-%d-%H')}"
        bucket = await self.client.get(key)
        values = json.loads(bucket) if bucket else []
        values.append({"value": value, "ts": ts.isoformat()})
        await self.client.set(key, json.dumps(values), ex=self.TTL_SECONDS)

    async def get_window(self, org_id: str, metric: str, days: int = 7) -> list[dict]:
        """Returns all snapshots from the last `days` days."""
        now = datetime.utcnow()
        all_values = []
        for hour_offset in range(days * 24):
            ts = now - timedelta(hours=hour_offset)
            key = f"clearlens:{org_id}:{metric}:{ts.strftime('%Y-%m-%d-%H')}"
            bucket = await self.client.get(key)
            if bucket:
                all_values.extend(json.loads(bucket))
        return sorted(all_values, key=lambda x: x["ts"])
```

---

### Sample Guard — [NEW] Flaw 3 Fix

```python
# backend/app/stream/sample_guard.py
"""
Prevents spurious alerts from tiny sample sizes.
A 40% disparity with 5 decisions is noise. A 12% disparity with 300 decisions is signal.
All metric computation is gated through this module.
"""

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
        Returns (lower, upper) confidence interval for a proportion-based metric.
        Uses Wilson score interval for robustness with small samples.
        """
        z = stats.norm.ppf((1 + confidence) / 2)
        # Wilson score interval approximation for bias metrics
        margin = z * np.sqrt(metric_value * (1 - abs(metric_value)) / max(n_total, 1))
        return (
            round(metric_value - margin, 4),
            round(metric_value + margin, 4)
        )
```

---

### Core Fairness Metrics (fairness.py)

> **Flaw 2 fix — Honest Metric Labeling:**
> Metrics like equalized odds and false positive rates require ground truth labels.
> ClearLens computes **proxy metrics** (demographic parity, disparate impact ratio) from
> decision logs alone. When ground truth labels have been ingested via the delayed label
> endpoint, true equalized odds are computed and labeled as `verified`. Without labels,
> all metrics carry a `"label_status": "proxy_approximate"` field. This is documented
> in `docs/fairness_approximation_notice.md` and shown in the dashboard.

```python
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
    """
    Computes fairness metrics for a batch of decisions.
    Always computes ALL applicable metrics and surfaces contradictions.
    Every metric includes:
      - value (float)
      - confidence_interval (tuple)
      - sample_size (int)
      - is_biased (bool)
      - label_status: "proxy_approximate" | "verified" (ground truth available)
      - plain_english (str)
    Never picks one metric as 'the answer' — that is the org's job.
    """

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
        dpd = demographic_parity_difference(
            df[decision_col], df[decision_col], sensitive_features=df[sensitive_col]
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
            dir_ratio = rates.min() / rates.max()
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
        """
        Detects when satisfying one metric necessarily hurts another.
        Surfaces the Fairness Impossibility Theorem explicitly.
        """
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
```

---

### Delayed Ground Truth Ingestion — [NEW] Flaw 2 Fix

```python
# backend/app/routers/ground_truth.py
"""
Allows organizations to POST outcome labels after the fact.
Example: loan decision made today → outcome (default/no-default) known in 6 months.
When labels arrive, we retroactively compute equalized odds and upgrade metric label_status
from 'proxy_approximate' to 'verified'.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class GroundTruthBatch(BaseModel):
    org_id: str
    labels: list[dict]  # [{decision_id, true_outcome, timestamp}]
    sensitive_attribute: str

@router.post("/ground-truth/ingest")
async def ingest_ground_truth(batch: GroundTruthBatch):
    """
    Stores ground truth labels and triggers metric re-computation
    for the affected time windows. Any metrics that previously showed
    label_status='proxy_approximate' will be re-run as 'verified'
    and re-published to the dashboard via WebSocket.
    """
    await ground_truth_store.save(batch)
    await metric_recompute_queue.enqueue(batch.org_id, batch.labels)
    return {"status": "accepted", "label_count": len(batch.labels)}
```

---

### Drift Detection — THE MOST IMPORTANT MODULE (drift.py)

> **Flaw 4 fix:** Replaced Isolation Forest (heavy ML, unstable on small windows) with
> **Z-score + EWMA (Exponentially Weighted Moving Average)**. EWMA is purpose-built for
> streaming data: it is lightweight, updates in O(1), and handles small windows gracefully.
> It is the industry standard for streaming anomaly detection (used by Netflix, Datadog).

```python
import pandas as pd
import numpy as np
from collections import deque
from datetime import datetime, timedelta
from app.db.redis_state import RollingWindowStore

class DriftDetector:
    """
    Detects SLOW, GRADUAL bias drift — the "boiling frog" problem.
    Uses EWMA for smoothed trend tracking (replaces Isolation Forest).
    State is persisted in Redis — NOT in-memory — to survive restarts.
    """

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

        # EWMA smoothed trend
        df["ewma"] = df["value"].ewm(alpha=self.ewma_alpha, adjust=False).mean()
        slope = self._linear_slope(df["hours_elapsed"], df["ewma"])
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
```

---

### Spike Anomaly Detection — Z-Score (anomaly.py)

> **Flaw 4 fix:** Isolation Forest removed. Z-score is correct for this use case:
> streaming, small windows, low latency. It is statistically sound and explainable.

```python
# backend/app/stream/anomaly.py

import numpy as np

class SpikeDetector:
    """
    Lightweight Z-score spike detector.
    Detects metric values that deviate >3 standard deviations from recent mean.
    Replaces Isolation Forest — correct choice for streaming small-window data.
    """

    Z_SCORE_THRESHOLD = 3.0

    def detect(self, current_value: float, history: list[float]) -> dict:
        if len(history) < 10:
            return {"spike_detected": False, "reason": "insufficient_history"}

        mean = np.mean(history)
        std = np.std(history)

        if std == 0:
            return {"spike_detected": False, "reason": "zero_variance"}

        z_score = (current_value - mean) / std
        spike_detected = abs(z_score) > self.Z_SCORE_THRESHOLD

        return {
            "spike_detected": spike_detected,
            "z_score": round(z_score, 3),
            "mean": round(mean, 4),
            "std": round(std, 4),
            "plain_english": (
                f"This value is {abs(round(z_score, 1))} standard deviations "
                f"{'above' if z_score > 0 else 'below'} the recent average — "
                f"{'a statistical outlier (spike detected)' if spike_detected else 'within normal range'}."
            ) if spike_detected else "No anomaly detected.",
        }
```

---

### Alert Engine — 3-Tier Escalation + Suppression (alerts/engine.py)

> **Flaw 7 fix:** Added alert suppression, cooldown windows, deduplication fingerprints,
> and grouping. Real-time monitoring across multiple metrics will spam users without these.

```python
from enum import Enum
from datetime import datetime, timedelta
import hashlib

class AlertSeverity(Enum):
    WARNING  = "warning"   # Metric drifting — monitor closely
    ALERT    = "alert"     # Threshold crossed — review recent decisions
    CRITICAL = "critical"  # Severe disparity — consider pausing the system

class AlertEngine:
    """
    3-tier alert escalation with suppression, deduplication, and grouping.
    Suppression prevents alert fatigue — same metric/org won't fire again
    within the cooldown window. Fingerprints detect duplicate conditions.
    All alerts permanently logged — the accountability mechanism.
    """

    THRESHOLDS = {
        AlertSeverity.WARNING:  0.07,
        AlertSeverity.ALERT:    0.10,
        AlertSeverity.CRITICAL: 0.20,
    }

    COOLDOWN_MINUTES = 15  # configurable via env

    def evaluate(
        self,
        metric_value: float,
        metric_name: str,
        org_id: str,
        recent_alerts: list[dict],  # alerts fired in last COOLDOWN_MINUTES
    ) -> dict | None:

        severity = None
        for level in [AlertSeverity.CRITICAL, AlertSeverity.ALERT, AlertSeverity.WARNING]:
            if abs(metric_value) >= self.THRESHOLDS[level]:
                severity = level
                break

        if not severity:
            return None

        # --- Suppression: same metric/org/severity within cooldown → skip ---
        fingerprint = self._fingerprint(org_id, metric_name, severity)
        if self._is_suppressed(fingerprint, recent_alerts):
            return None  # Silently suppressed — no spam

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
            "group_key":    f"{org_id}:{severity.value}",  # For UI grouping
        }

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
```

---

### Action Card Generator — With Tradeoff Simulation (alerts/action_card.py)

> **Flaw 8 + INSANE level fix:** The Gemini prompt now includes:
> 1. A recommendation layer (not just "here's a contradiction")
> 2. Simulated tradeoff impact ("If you optimize X, Y will worsen by ~Z%")
> 3. Confidence-aware language when sample size is low

```python
import google.generativeai as genai

DOMAIN_CONTEXT = {
    "lending":    "loan approval decisions affecting people's financial access",
    "hiring":     "job application screening affecting people's career opportunities",
    "healthcare": "medical triage or resource allocation affecting patient outcomes",
    "general":    "automated decisions affecting real people",
}

def generate_action_card(
    alert: dict,
    domain: str = "general",
    drift_result: dict | None = None,
    contradictions: list | None = None,
    confidence_interval: tuple | None = None,
) -> dict:
    """
    Gemini-powered action card with:
    - Plain English alert explanation
    - Concrete 3-step response plan
    - Tradeoff impact simulation ("If you do X, Y worsens")
    - Confidence-aware language
    - Future projection if drift data available
    """

    ci_note = ""
    if confidence_interval:
        ci_note = f"95% confidence interval: ({confidence_interval[0]}, {confidence_interval[1]})"

    drift_note = ""
    if drift_result and drift_result.get("drift_detected"):
        drift_note = (
            f"Drift trajectory: {drift_result.get('plain_english', '')} "
            f"Simulated value in 7 days: {drift_result.get('simulated_7day_impact', 'unknown')}"
        )

    contradiction_note = ""
    if contradictions:
        contradiction_note = (
            "⚠️ CONTRADICTION DETECTED: " + contradictions[0].get("explanation", "")
            + " Recommendation: " + contradictions[0].get("recommendation", "")
        )

    prompt = f"""
    You are a bias monitoring assistant. An alert has fired in a real-time AI system.

    Context:
    - Domain: {DOMAIN_CONTEXT.get(domain, DOMAIN_CONTEXT['general'])}
    - Metric: {alert['metric_name']}
    - Value: {alert['metric_value']} (threshold: 0.10)
    - Severity: {alert['severity']}
    - Statistical confidence: {ci_note or 'not provided'}
    - Drift projection: {drift_note or 'not available'}
    - Fairness conflicts: {contradiction_note or 'none detected'}

    Write a concise action card with:
    1. A 1-sentence summary in plain English (no jargon)
    2. Exactly 3 numbered steps the organization should take RIGHT NOW
    3. ONE tradeoff warning: "If you do X to fix this, Y will likely worsen"
    4. A confidence note if sample size is small

    Format: JSON with keys:
      "summary" (string),
      "steps" (list of 3 strings),
      "tradeoff_warning" (string),
      "confidence_note" (string or null)
    """

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)

    try:
        import json
        return json.loads(response.text)
    except Exception:
        return {
            "summary": "Bias detected. Immediate review recommended.",
            "steps": [
                "Pause new decisions from this system temporarily.",
                "Review the last 200 decisions manually for the affected group.",
                "Contact your data science team to retrain or adjust the model.",
            ],
            "tradeoff_warning": (
                "Reducing approval rates for over-represented groups to achieve parity "
                "may trigger disparate impact claims — involve legal review."
            ),
            "confidence_note": None,
        }
```

---

## 🖥️ Frontend — Key Components

### PlainEnglishToggle.jsx

Every metric has two modes. Non-technical users default to Plain English.

```jsx
<PlainEnglishToggle
  technicalLabel="Demographic Parity Difference: 0.23"
  plainLabel="Your system approves men 23% more often than women for identical applications."
  defaultMode="plain"
/>
```

### ConfidenceBadge.jsx — [NEW]

Every metric displays confidence interval + sample size. Prevents users from acting on noise.

```jsx
<ConfidenceBadge
  value={0.23}
  confidenceInterval={[0.18, 0.28]}
  sampleSize={340}
  labelStatus="proxy_approximate"  // or "verified"
/>
// Renders: "23% ± 5% (n=340) | ⚠️ Approximate — no ground truth yet"
```

### ImpactSimulator.jsx — [NEW]

Answers: "If we don't act, what happens in 7 days?"

```jsx
<ImpactSimulator
  currentValue={0.08}
  simulatedValue7d={0.13}
  projectedBreach="~14 days"
  driftDirection="worsening"
/>
// Renders: "If current drift continues → 13% bias in 7 days (threshold: 10%)"
```

### FairnessTradeoffCard.jsx — Enhanced with Recommendation Layer

> **Flaw 8 fix:** Non-technical users now get a recommendation, not just a contradiction notice.

```jsx
<FairnessTradeoffCard
  metrics={["Demographic Parity", "Equalized Odds"]}
  explanation="These metrics are in mathematical conflict."
  recommendation="Choose which metric aligns with your organization's values and legal obligations."
  tradeoffSimulation="Optimizing Demographic Parity here will worsen Equalized Odds by ~8%"
  onChoose={(metric) => handleMetricPriority(metric)}
/>
```

### LiveMetricChart.jsx

```jsx
const LiveMetricChart = ({ orgId, metricName }) => {
  const { data, isConnected } = useWebSocket(`/ws/metrics/${orgId}/${metricName}`);

  // Two lines: real-time value + 7-day EWMA trend
  return (
    <ResponsiveContainer>
      <LineChart data={data}>
        <Line dataKey="current_value"  stroke="#ef4444" dot={false} name="Current" />
        <Line dataKey="ewma_trend"     stroke="#f97316" strokeDasharray="5 5" name="7-Day EWMA Trend" />
        <Line dataKey="ci_upper"       stroke="#94a3b8" strokeDasharray="2 2" name="95% CI Upper" />
        <Line dataKey="ci_lower"       stroke="#94a3b8" strokeDasharray="2 2" name="95% CI Lower" />
        <ReferenceLine y={0.10} stroke="#dc2626" label="Bias Threshold" />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

## 🗄️ What Gets Stored vs Dropped

> **Flaw 6 fix:** We store anonymized aggregates for debuggability. When an alert fires
> and a user asks "WHY?", we can answer — using aggregated group statistics,
> not raw individual decisions.

```
Raw Decision (org machine)
  └── PII Scrubbed (sdk)
  └── Server-Side PII Validated (ingest.py)
  └── Mapped to standard schema
        │
        ▼
Pub/Sub (in transit — encrypted, ephemeral)
        │
        ▼
Stream Processor (in memory — never persisted raw)
  └── Computes: metric values, drift slopes, alert conditions
  └── Updates: Redis rolling window (metric values by hour, NOT individual decisions)
        │
        ▼
Firestore (ONLY these stored):
  ├── metrics/         → numeric values + CI + sample sizes + timestamps + model_version
  ├── alerts/          → alert records + fingerprints + auto_pause_recommendation
  ├── audit_trail/     → immutable log of every alert + action taken
  ├── group_aggregates/→ per-group approval rates at each snapshot (no individuals)
  ├── ground_truth/    → delayed outcome labels (org-provided, opt-in)
  ├── root_cause/      → [NEW] feature shift analysis snapshots per alert
  ├── risk_scores/     → [NEW] composite Bias Risk Score history per org
  └── model_versions/  → [NEW] metric snapshots keyed by model_version tag
```

**What `group_aggregates` + `root_cause` enables:**
- Alert fires: "Gender bias detected at 23%"
- User clicks "Why?": "Female approval rate was 61%, Male was 84% (n=340)"
- Root cause panel shows: "Largest contributing feature: credit_history_length — distribution shifted by 0.31 KS score after model v1.3 deploy"

---

## 🎭 Demo Simulation — FOR JUDGES

```python
# demo/simulate_decisions.py
"""
Phase 1 (0-30s):  Fair system — all metrics green, confidence intervals shown
Phase 2 (30-90s): Slow drift injected — EWMA trend line bends, drift alert fires with projection
Phase 3 (90s+):   Full bias spike — Z-score fires, CRITICAL alert, Gemini action card
Demo highlight: At every stage, show confidence intervals + sample size badge
"""

import time
import random
from clearlens_sdk import ClearLensClient

client = ClearLensClient(api_key="demo_key", schema_config="demo_config.json")

def generate_decision(bias_level: float = 0.0) -> dict:
    gender = random.choice(["male", "female"])
    credit_score = random.randint(580, 800)
    base_approval = credit_score > 680

    if gender == "female" and random.random() < bias_level:
        approval = False
    else:
        approval = base_approval

    return {
        "loan_approved": approval,
        "applicant_gender": gender,
        "applicant_zip": random.choice(["10001", "10002", "10003"]),
        "credit_score": credit_score,
    }

# Phase 1: 0-30s — fair system (bias_level=0.0)
# Phase 2: 30-90s — slowly ramp bias 0.0→0.3 (drift alert fires, show projection)
# Phase 3: 90s+ — spike to bias_level=0.8 (Z-score spike, CRITICAL alert, action card)
```

**Demo script for judges:**
1. Show live dashboard with green metrics + confidence badges — *"Here's a fair system with statistical proof."*
2. Turn on slow bias injection — *"Now bias is creeping in slowly. Watch the EWMA trend line bend."*
3. Point to drift alert — *"Our trend detector caught it early. It says: 'In 14 days this becomes a crisis.'"*
4. Spot the ImpactSimulator widget — *"It's already simulating where this ends up in 7 days."*
5. Crank to full bias — *"Now watch a critical alert fire. It was caught by our Z-score spike detector."*
6. Click the action card — *"Gemini explains what happened, what to do, AND what the tradeoff is."*

---

## 🔐 Security & Privacy Architecture

### Privacy-Preserving by Architecture — Enforced, Not Policy

| Layer | Mechanism | Trust Model |
|---|---|---|
| Client-side scrubbing | Presidio PII removal in `pii_scrubber.py` | Primary layer |
| Client-side validation | `payload_validator.py` rejects residual PII before send | Belt-and-suspenders |
| Server-side guard | `ingest.py` runs PII patterns check, rejects + logs violations | Defense in depth |
| Open source SDK | Organizations can inspect all code | Zero black-box |
| No raw data stored | Only aggregated metrics in Firestore | Data minimization |
| Audit trail | Immutable — no deletes, even for admins | Accountability |

**Key pitch phrase:** *"PII protection is enforced at three architectural layers, not just promised in a policy document."*

---

## 🚀 Deployment

```bash
# Local development
docker-compose up  # Starts backend + mock Pub/Sub + Firestore emulator + Redis

# Production
gcloud run deploy clearlens-backend --source ./backend
firebase deploy --only hosting  # Dashboard
```

---

## 📋 Build Order for Agents

```
Step 1:  SDK schema_mapper.py + pii_scrubber.py + payload_validator.py
Step 2:  Pub/Sub publisher in SDK client.py
Step 3:  Backend Pub/Sub subscriber + ingest.py (with server-side PII guard)
Step 4:  redis_state.py — RollingWindowStore (stateful windowed state)
Step 5:  sample_guard.py — minimum sample threshold gating
Step 6:  fairness.py — core metrics engine with confidence intervals + label_status
Step 7:  drift.py — EWMA rolling trend detector (Redis-backed, stateful)
Step 8:  anomaly.py — Z-score spike detector (replaces Isolation Forest)
Step 9:  alerts/suppressor.py — cooldown, fingerprint, grouping
Step 10: alerts/engine.py — 3-tier escalation with suppression
Step 11: alerts/action_card.py — Gemini integration with tradeoff simulation
Step 12: ground_truth.py router + reconciliation logic
Step 13: Firestore schema + db/firestore.py (including group_aggregates collection)
Step 14: WebSocket endpoint in main.py
Step 15: React dashboard — LiveMetricChart.jsx (with CI bands)
Step 16: ConfidenceBadge.jsx + ImpactSimulator.jsx
Step 17: PlainEnglishToggle.jsx + FairnessTradeoffCard.jsx (with recommendation layer)
Step 18: AlertBanner.jsx + ActionCard.jsx + AlertGroupPanel.jsx
Step 19: demo/simulate_decisions.py
Step 20: End-to-end integration test
```

---

## 🧠 Things Every Team Member Must Know Before Demo Day

### 1. The Fairness Impossibility Theorem
Demographic parity and equalized odds **mathematically cannot both be satisfied simultaneously**
when base rates differ across groups. Our answer: *"We surface the tradeoff explicitly, simulate
the impact of each choice, and let the organization decide — we don't pretend to resolve it."*

### 2. Privacy-Preserving by Architecture (3 Layers)
PII protection is enforced at client-side scrubbing, client-side validation, AND server-side
rejection. When asked: *"Privacy isn't a policy we wrote — it's enforced at three architectural
layers. A misconfigured SDK gets rejected at the server."*

### 3. The Stateful Processor
The processor uses Redis for rolling window state. It is NOT stateless — that was our original
design flaw. Redis gives us persistence, horizontal scaling, and crash recovery without needing
a full Flink/Kafka Streams setup.

### 4. Metrics Require Sample Sizes
No metric fires until at least 30 decisions per sensitive group. Every metric carries a confidence
interval. Equalized odds are labeled `proxy_approximate` until ground truth labels arrive. This is
honest engineering, and judges will respect it.

### 5. Isolation Forest is Gone
We use Z-score for spikes and EWMA for trends. These are the correct tools for streaming,
small-window data. Isolation Forest was architecturally mismatched — good for batch offline ML,
not real-time streaming windows.

### 6. Alert Fatigue Prevention
Alerts deduplicate by fingerprint, suppress within 15-minute cooldowns, and group by severity.
The dashboard shows grouped alert panels, not a spam feed.

### 7. What Happens When You Ignore an Alert?
*"We cannot force compliance. What we do is make accountability unavoidable. Every alert is
permanently logged with a fingerprint and timestamp. If an org ignores a CRITICAL alert and
harm occurs, that immutable audit trail exists."*

### 8. Scalability One-Liner
*"Pub/Sub handles millions of messages per second. Redis handles thousands of concurrent
window reads. We inherit Google's infrastructure without running a single server ourselves."*

### 9. The "3-Line SDK" Caveat
When asked: *"The SDK is a 3-line code change. Enterprise rollout adds schema mapping and
compliance review — typically 1–3 weeks. We document this honestly in our integration guide."*

### 10. Freemium Answer
Under 50,000 decisions per month is free. That covers most NGOs and small organizations.
This is our social impact commitment.

---

## 📝 Pitch Structure (5 Minutes)

```
0:00 — Hook:     "AI makes millions of decisions every day. Bias can appear at any moment.
                  Most tools show you what went wrong last month.
                  ClearLens tells you what's going wrong right now — with statistical proof."

0:30 — Problem:  Bias in deployed AI. Current tools are retrospective. Slow drift is invisible.
                  Metrics without confidence intervals give false certainty.

1:00 — Solution: Real-time monitoring. SDK integration (3-layer PII enforcement). Redis-backed
                 stateful stream processing. EWMA drift + Z-score spikes. Confidence intervals
                 on every metric. Gemini action cards with tradeoff simulation.

2:00 — DEMO:     Live simulation. Show confidence badges → inject drift → drift alert fires
                 with 7-day projection → show ImpactSimulator → spike → CRITICAL alert →
                 Gemini action card with tradeoff warning.

3:30 — Tech:     SDK → 3-layer PII → Pub/Sub → Redis State → Fairness Engine (with CI) →
                 EWMA Drift + Z-Score Spike → Suppressed Alerts → Dashboard.

4:00 — Impact:   Any organization can now catch bias before it harms thousands of people.
                 Every claim is statistically validated. Freemium for NGOs. Audit trail
                 for accountability.

4:30 — Close:    "We're the first continuous bias monitor that catches what others miss —
                  the slow, invisible drift. We back every claim with confidence intervals.
                  And we make it actionable for anyone, not just data scientists."
```

---

## 📄 Fairness Approximation Notice (docs/fairness_approximation_notice.md)

> Every metric in ClearLens is labeled with its epistemic status:
>
> - **`proxy_approximate`** — Computed from decision logs only. No ground truth labels.
>   These metrics estimate bias patterns but cannot confirm error rate disparities.
>   Use as early warning signals.
>
> - **`verified`** — Computed using organization-provided ground truth outcome labels.
>   These metrics reflect true fairness properties (equalized odds, FPR/FNR disparities).
>   Use for compliance reporting and accountability.
>
> We believe in honest engineering. Approximate metrics are useful — but labeling them
> clearly is what makes ClearLens trustworthy.

---

## 🔬 Feature 1 — Auto Root Cause Analysis (root_cause.py)

When a bias alert fires, the system automatically asks: **why did the bias increase?**

```python
# backend/app/stream/root_cause.py
from scipy.stats import ks_2samp
import pandas as pd

class RootCauseAnalyzer:
    """
    Compares feature distributions between:
      - Last 24h window (bias spiked)
      - Previous 7-day baseline
    Uses Kolmogorov-Smirnov test to detect distribution shift per feature.
    Ranks features by shift magnitude and correlates with outcome disparity.
    """

    def analyze(
        self,
        baseline_df: pd.DataFrame,   # 7-day historical decisions
        recent_df: pd.DataFrame,     # Last 24h decisions
        decision_col: str,
        sensitive_col: str,
        feature_cols: list[str],
    ) -> dict:
        shifts = []
        for feature in feature_cols:
            if feature not in baseline_df.columns:
                continue
            stat, pvalue = ks_2samp(
                baseline_df[feature].dropna(),
                recent_df[feature].dropna()
            )
            # Correlation: does this feature's shift explain outcome disparity?
            disparity_corr = recent_df[[feature, decision_col]].corr().iloc[0, 1]
            shifts.append({
                "feature":       feature,
                "ks_statistic":  round(stat, 4),
                "p_value":       round(pvalue, 4),
                "significant":   pvalue < 0.05,
                "disparity_corr": round(abs(disparity_corr), 4),
                "combined_score": round(stat * abs(disparity_corr), 4),
            })

        shifts.sort(key=lambda x: x["combined_score"], reverse=True)
        top = shifts[0] if shifts else None

        return {
            "top_contributing_feature": top["feature"] if top else None,
            "ks_score": top["ks_statistic"] if top else None,
            "ranked_features": shifts[:5],
            "plain_english": (
                f"Bias increase is primarily driven by '{top['feature']}' showing a "
                f"significant distribution shift (KS={top['ks_statistic']}) compared "
                f"to the 7-day baseline. This feature has the strongest correlation "
                f"with the approval rate disparity."
            ) if top else "Root cause could not be identified — insufficient feature data.",
        }
```

**Dashboard:** `RootCausePanel.jsx` — shown automatically when a bias alert fires.
Displays ranked feature list with KS scores and a plain-English explanation.

---

## 🔬 Feature 2 — What-If Simulator (whatif.py)

Let users simulate policy changes without retraining. Answers: *"What happens if we change the threshold?"*

```python
# backend/app/routers/whatif.py
from pydantic import BaseModel
import pandas as pd
from app.stream.fairness import FairnessMetricsEngine

class WhatIfRequest(BaseModel):
    org_id: str
    scenario: str            # "threshold_change" | "remove_feature" | "rebalance"
    parameter: float | None  # e.g., new threshold value
    feature_to_remove: str | None

@router.post("/whatif/simulate")
async def simulate(req: WhatIfRequest):
    """
    Retrieves stored (decision, prediction_score, sensitive_attr) snapshots
    from the last 7 days. Re-applies the hypothetical policy. Recomputes metrics.
    Returns before/after comparison for: demographic_parity, disparate_impact, equalized_odds.
    No retraining required — works purely on stored prediction scores.
    """
    snapshots = await snapshot_store.get_recent(req.org_id, days=7)
    df = pd.DataFrame(snapshots)

    if req.scenario == "threshold_change" and req.parameter:
        # Re-classify based on new threshold
        df["simulated_decision"] = df["prediction_score"] >= req.parameter
    elif req.scenario == "remove_feature" and req.feature_to_remove:
        # Drop the feature and re-score using stored residual scores
        df["simulated_decision"] = df["residual_score"] >= 0.5
    else:
        df["simulated_decision"] = df["original_decision"]

    engine = FairnessMetricsEngine()
    before = engine.compute(df, "original_decision", "sensitive_attr")
    after  = engine.compute(df, "simulated_decision", "sensitive_attr")

    return {
        "scenario": req.scenario,
        "before": before,
        "after":  after,
        "delta": {
            k: round(
                after.get(k, {}).get("value", 0) - before.get(k, {}).get("value", 0), 4
            )
            for k in ["demographic_parity_difference", "disparate_impact_ratio"]
        },
        "plain_english": (
            f"Changing the threshold from current to {req.parameter} would "
            f"change demographic parity by "
            f"{round(after.get('demographic_parity_difference', {}).get('value', 0) * 100, 1)}%."
        ),
    }
```

**Dashboard:** `WhatIfSimulator.jsx` page — slider for threshold, toggle for feature removal,
before/after metric comparison chart.

---

## 🔬 Feature 3 — Compliance Report Generator (report.py)

Auto-generates a PDF compliance report. Covers EEOC, GDPR, EU AI Act alignment.

```python
# backend/app/routers/report.py
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table

@router.get("/report/{org_id}")
async def generate_report(org_id: str, period_days: int = 30):
    """
    Generates a PDF containing:
      1. Executive Summary — Bias Risk Score, overall status
      2. Metric Snapshots — all fairness metrics with CI for the period
      3. Drift Summary — slope, direction, days to threshold
      4. Alert Log — all alerts fired, severity, acknowledgement status
      5. Audit Trail — immutable action log
      6. Compliance Alignment — EEOC 4/5ths rule, GDPR Art. 22, EU AI Act
      7. Recommendations — Gemini-generated mitigation steps
    """
    data = await firestore.get_report_data(org_id, period_days)
    pdf_bytes = build_pdf(data)  # Uses reportlab
    return Response(content=pdf_bytes, media_type="application/pdf")
```

**Compliance mapping table** (reference for report generator):

| Framework | Relevant Clause | ClearLens Coverage |
|---|---|---|
| EEOC (US) | 4/5ths Adverse Impact Rule | Disparate Impact Ratio metric |
| GDPR Art. 22 | Automated decision-making | Audit trail + alert log |
| EU AI Act | High-risk AI monitoring | Real-time metrics + drift detection |
| NYC Local Law 144 | Bias audit requirement | Annual report export |

**Dashboard:** `ReportGenerator.jsx` — date range picker + "Generate PDF" button.

---

## 🔬 Feature 4 — Model Version Tracking

Bias often appears directly after model updates. Every decision log now carries `model_version`.

```python
# backend/app/models/decision.py  (updated)
class DecisionEvent(BaseModel):
    decision:          bool
    sensitive_attrs:   dict[str, str]
    prediction_score:  float | None = None  # stored for What-If simulator
    model_version:     str = "unknown"       # [NEW] e.g. "v1.3.2"
    timestamp:         datetime
    org_id:            str
```

Metrics stored in Firestore include `model_version`. The dashboard's `ModelVersionTimeline.jsx`
renders a timeline chart showing bias metric values annotated with version deployment events.

**Demo narrative:** *"Bias started increasing at exactly the moment model v1.3 was deployed.
ClearLens detected it 4 hours later."*

---

## 🔬 Feature 5 — Data Drift vs Bias Drift Separation (data_drift.py)

Distinguishes *what changed* from *why fairness changed*:

| Type | Meaning | Detector |
|---|---|---|
| Data drift | Input feature distributions shifted | KS test / PSI |
| Concept drift | Model behaviour changed without input change | Output dist. shift |
| Bias drift | Fairness metrics changed | EWMA on DPD / DIR |

```python
# backend/app/stream/data_drift.py
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
        baseline_pcts = np.histogram(baseline, bins=bins, density=True)[0] + 1e-9
        current_pcts  = np.histogram(current,  bins=bins, density=True)[0] + 1e-9
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
```

**Dashboard:** `DriftTypeSeparator.jsx` — two-panel status card:
```
Data Drift:  Normal  (PSI=0.08)
Bias Drift:  ⬆ Increasing  (slope=0.025/day)
→ Likely model issue, not data issue
```

---

## 🔬 Feature 6 — Industry Templates

Pre-built `schema_config.json` presets for common domains. Lowers onboarding friction.

```json
// industry_templates/hiring.json
{
  "industry": "hiring",
  "decision_field": "hired",
  "decision_positive_value": true,
  "sensitive_attributes": ["gender", "race", "age_group"],
  "proxy_attributes": ["zip_code"],
  "domain": "hiring",
  "compliance_frameworks": ["EEOC", "GDPR"],
  "bias_thresholds": {
    "disparate_impact_ratio": 0.80,
    "demographic_parity_difference": 0.10
  }
}
```

| Template | Sensitive Attributes | Decision Field | Frameworks |
|---|---|---|---|
| `hiring.json` | gender, race, age_group | hired | EEOC, GDPR |
| `lending.json` | race, gender, zip_code | loan_approved | ECOA, GDPR |
| `healthcare.json` | age, disability_status | treatment_approved | ADA, GDPR |
| `insurance.json` | gender, age | premium_tier | EU AI Act |

**Dashboard:** `IndustryTemplateSelector.jsx` — onboarding screen: *"Select your industry → Upload CSV → Done"*.

---

## 🔬 Feature 7 — Public Transparency Page (transparency.py)

Organizations can opt-in to publish a public fairness scorecard.

```
https://transparency.clearlens.ai/{org_slug}
```

Shows:
- Current Bias Risk Score
- Fairness metric status (green / yellow / red)
- Alerts in the last 30 days (count + severity distribution)
- Actions taken (from audit trail)
- Drift trend (improving / stable / worsening)

```python
# backend/app/routers/transparency.py
@router.get("/public/{org_slug}")
async def public_scorecard(org_slug: str):
    """
    Only available if org.transparency_enabled == True (opt-in).
    Returns pre-aggregated, privacy-safe data only — no raw metrics,
    no group breakdowns below minimum threshold.
    """
    org = await firestore.get_org_by_slug(org_slug)
    if not org or not org.transparency_enabled:
        raise HTTPException(404, "Transparency page not enabled")
    return await firestore.get_public_scorecard(org.id)
```

**Social impact pitch:** *"Organizations using ClearLens can choose to publish their fairness
scorecard publicly — creating market pressure for accountability across the entire industry."*

---

## 🔬 Feature 8 — Bias Risk Score (risk_score.py)

A single 0–100 number that executives understand.

```python
# backend/app/stream/risk_score.py

class BiasRiskScorer:
    """
    Composite risk score from weighted fairness signals.
    Weights are domain-configurable — hiring vs lending may differ.
    """

    DEFAULT_WEIGHTS = {
        "demographic_parity_difference": 0.30,
        "disparate_impact_ratio":        0.25,
        "equalized_odds_difference":     0.20,
        "drift_rate":                    0.15,
        "anomaly_z_score":               0.10,
    }

    RISK_BANDS = [
        (80, "CRITICAL",  "Immediate action required — consider pausing the system"),
        (50, "HIGH",      "Alert stakeholders — review recent decisions"),
        (20, "MODERATE",  "Monitor closely — trend analysis recommended"),
        (0,  "LOW",       "System operating within acceptable fairness bounds"),
    ]

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
            [(t, b, l, a) for t, b, l, a in
             [(80, "CRITICAL", "CRITICAL", "Immediate action required"),
              (50, "HIGH", "HIGH", "Alert stakeholders"),
              (20, "MODERATE", "MODERATE", "Monitor closely"),
              (0,  "LOW", "LOW", "System operating normally")]]
            if score >= threshold
        )

        return {"score": score, "band": band, "advice": advice}
```

**Dashboard:** `RiskScoreDial.jsx` — prominent gauge widget at the top of the dashboard.
Executives see one number. Data scientists can expand to see component breakdown.

---

## 🔬 Feature 9 — Auto Pause Recommendation

The `ActionCard` and alert system now include a structured `auto_pause_recommendation` field:

```python
# In alerts/engine.py — attached to every alert output

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
```

| Condition | Auto Recommendation |
|---|---|
| DIR < 0.60 | Pause model |
| Drift > 3%/day | Schedule retrain |
| Equalized odds > 0.20 | Recalibrate threshold |
| Z-score spike > 4σ | Investigate recent batch |

---

## 🔬 Feature 10 — Pre-Deployment Synthetic Bias Testing (predeployment.py)

Before a model goes live, organizations upload predictions and get a bias report.

```python
# backend/app/routers/predeployment.py

@router.post("/predeployment/test")
async def predeployment_test(file: UploadFile, sensitive_col: str, decision_col: str):
    """
    Accepts a CSV of model predictions + sensitive attributes.
    Runs full fairness metric suite.
    Returns a pre-deployment bias report — no live data needed.
    This covers the PRE-deployment lifecycle, not just post-deployment monitoring.
    """
    df = pd.read_csv(file.file)
    engine = FairnessMetricsEngine()
    results = engine.compute(df, decision_col, sensitive_col)
    risk = BiasRiskScorer().compute(results, drift_rate=0, z_score=0)
    return {
        "status":    "pre_deployment_test_complete",
        "metrics":   results,
        "risk_score": risk,
        "recommendation": (
            "Safe to deploy" if risk["score"] < 20
            else "Bias detected — address before deployment"
        ),
    }
```

**Dashboard:** `PreDeployment.jsx` — CSV upload → instant bias report → Go/No-Go recommendation.

**Product positioning:** *"ClearLens covers the full lifecycle: bias testing before deployment,
bias monitoring after deployment. One platform. One dashboard."*

---

## 🏆 Product Maturity Roadmap

| Stage | What's Built | Positioning |
|---|---|---|
| ✅ Monitoring | Real-time metrics, EWMA drift, Z-score spikes | Hackathon project |
| ✅ Diagnosis | Root cause analysis (KS test feature shift) | Research project |
| ✅ Mitigation | What-If simulator, auto-pause recommendations | Industry tool |
| ✅ Compliance | PDF reports, EEOC/GDPR/EU AI Act alignment | Startup product |
| ✅ Lifecycle | Pre-deployment testing + post-deployment monitoring | Platform product |
| ✅ Accountability | Public transparency page, immutable audit trail | Social impact platform |

---

## 📋 Updated Build Order for Agents

```
Phase 1 — Core Pipeline (existing)
Step 1:  SDK: schema_mapper + pii_scrubber + payload_validator
Step 2:  Pub/Sub publisher + server-side ingest with PII guard
Step 3:  redis_state.py — RollingWindowStore
Step 4:  sample_guard.py — minimum sample gating
Step 5:  fairness.py — metrics with CI + label_status
Step 6:  drift.py — EWMA (Redis-backed)
Step 7:  anomaly.py — Z-score spike
Step 8:  alerts/engine.py + suppressor.py
Step 9:  alerts/action_card.py — Gemini + tradeoff simulation
Step 10: ground_truth.py router
Step 11: Firestore schema
Step 12: WebSocket endpoint

Phase 2 — Intelligence Layer (new additions)
Step 13: root_cause.py — KS-test feature shift analyzer
Step 14: data_drift.py — PSI data drift + classification
Step 15: risk_score.py — Composite 0–100 Bias Risk Score
Step 16: decision.py model update — add model_version field
Step 17: whatif.py router — threshold/feature simulation
Step 18: predeployment.py router — CSV upload + bias test
Step 19: report.py router — PDF compliance report
Step 20: transparency.py router — public scorecard

Phase 3 — Dashboard UI
Step 21: LiveMetricChart.jsx (CI bands + EWMA line)
Step 22: RiskScoreDial.jsx + ConfidenceBadge.jsx
Step 23: RootCausePanel.jsx + DriftTypeSeparator.jsx
Step 24: ModelVersionTimeline.jsx
Step 25: WhatIfSimulator.jsx page
Step 26: ReportGenerator.jsx page
Step 27: PreDeployment.jsx page
Step 28: Transparency.jsx page
Step 29: IndustryTemplateSelector.jsx
Step 30: AlertGroupPanel.jsx + PlainEnglishToggle.jsx
Step 31: demo/simulate_decisions.py (full 3-phase)
Step 32: End-to-end integration test
```

---

*This document is the single source of truth for ClearLens development.
Every agent working on this project should read this file first and refer back to it constantly.*

---

Installed all the agents in the main directory — use all of them accordingly and go through each section before implementing any module.