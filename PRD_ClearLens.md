# ClearLens — Product Requirements Document (PRD)
### Real-Time Bias Monitoring for Live AI Systems
**Version:** 1.0 · **Google Solution Challenge 2026** · **Status: APPROVED FOR BUILD**

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Goals](#3-product-vision--goals)
4. [User Personas](#4-user-personas)
5. [System Architecture Overview](#5-system-architecture-overview)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements (NFRs)](#7-non-functional-requirements-nfrs)
8. [Security & Privacy Requirements](#8-security--privacy-requirements)
9. [API Contract Specification](#9-api-contract-specification)
10. [Data Models](#10-data-models)
11. [Fairness Metrics Specification](#11-fairness-metrics-specification)
12. [Alert System Specification](#12-alert-system-specification)
13. [Frontend Component Specification](#13-frontend-component-specification)
14. [Infrastructure & Deployment](#14-infrastructure--deployment)
15. [Build Order & Agent Assignment](#15-build-order--agent-assignment)
16. [Testing & QA Strategy](#16-testing--qa-strategy)
17. [Vulnerability Mitigation Checklist](#17-vulnerability-mitigation-checklist)
18. [Performance SLAs](#18-performance-slas)
19. [Compliance & Regulatory Alignment](#19-compliance--regulatory-alignment)
20. [Demo Day Specification](#20-demo-day-specification)
21. [Open Questions & Decisions](#21-open-questions--decisions)

---

## 1. Executive Summary

**ClearLens** is a real-time, continuous bias monitoring platform for deployed AI systems. Unlike retrospective audit tools, ClearLens watches live decision streams as they happen, computing fairness metrics in real time, detecting sudden spikes **and** slow gradual drift, and firing actionable, AI-powered alerts before harm scales.

> **Core Innovation:** Most bias tools audit the past. ClearLens watches the present.

| Dimension | Target |
|---|---|
| Decision ingestion latency | < 500ms end-to-end |
| Dashboard refresh rate | < 2s (WebSocket push) |
| SDK integration time | < 15 minutes (3-line integration) |
| Uptime SLA | 99.9% |
| Alert false-positive rate | < 5% |
| PII exposure | Zero (scrubbed client-side before transmission) |

---

## 2. Problem Statement

### 2.1 Current State
AI systems make millions of high-stakes decisions daily — loan approvals, job screenings, medical triage, content moderation. Bias in these systems causes measurable, real-world harm.

### 2.2 Existing Tool Failures

| Tool Type | Gap |
|---|---|
| Retrospective audits | Show what went wrong **last month** — harm already occurred |
| Spike-only detectors | Miss "boiling frog" slow drift (1% per day, 30 days = catastrophic) |
| Model cards / datasheets | Static snapshots; don't reflect post-deployment data shift |
| Manual reviews | Expensive, infrequent, non-scalable |

### 2.3 The Boiling Frog Problem
A bias that increases by 1% per day takes 10 days to cause 10% disparity. Spike detectors only fire at the end. ClearLens **catches this at day 3** via rolling trend analysis — giving organizations 7 days of intervention time they didn't have before.

### 2.4 The Fairness Impossibility Theorem (Chouldechova, 2017)
Demographic parity and equalized odds **mathematically cannot both be satisfied simultaneously** when base rates differ across groups. Existing tools either:
- Pick one metric and ignore the others (misleading)
- Do not surface the contradiction (dangerous)

ClearLens always surfaces ALL metrics and explicitly shows contradictions, enabling informed stakeholder decisions.

---

## 3. Product Vision & Goals

### 3.1 Vision Statement
Every organization deploying AI should know — in real time — whether their system is treating all people fairly, and should have the information to act immediately when it isn't.

### 3.2 Product Goals

| Goal | Metric | Target |
|---|---|---|
| Catch bias before harm scales | Time to first alert after drift starts | < 48 hours |
| Enable non-technical users | % alerts actioned by non-data-scientists | > 70% |
| Minimize integration friction | SDK integration time | < 15 min |
| Ensure privacy by architecture | PII in Firestore | Zero bytes |
| Create accountability | % of orgs that acknowledge alerts | > 90% |
| Social impact accessibility | Free tier coverage | NGOs / < 50K decisions/month |

### 3.3 Non-Goals (Explicit Out-of-Scope)
- ClearLens does **not** retrain models (monitoring only)
- ClearLens does **not** enforce compliance (creates accountability trail only)
- ClearLens does **not** store raw decisions (metrics and alerts only)
- ClearLens does **not** resolve the fairness tradeoff (surfaces it; org decides)

---

## 4. User Personas

### Persona 1 — Data Science Lead (Technical User)
**Name:** Priya, ML Engineer at a fintech  
**Goals:** Monitor production models 24/7. Catch regression before it becomes a PR disaster.  
**Pain:** Current dashboards show metrics from last week's batch job.  
**Needs:** Real-time metric charts, drift slopes, anomaly z-scores, raw threshold values.  
**Uses:** Technical mode on all metric cards, API access for custom integrations.

### Persona 2 — Risk & Compliance Officer (Non-Technical User)
**Name:** Marcus, Chief Risk Officer at a bank  
**Goals:** Know whether the AI is compliant. Act on alerts without needing a PhD.  
**Pain:** Can't read a confusion matrix. Doesn't know what "equalized odds" means.  
**Needs:** Plain English summaries, clear action steps, immutable audit trail for regulators.  
**Uses:** Plain English toggle (default), Action Cards, Alert Inbox, Audit Log export.

### Persona 3 — NGO/Small Org Admin (Free Tier)
**Name:** Amara, Director at a hiring-tech NGO  
**Goals:** Ensure their AI screening tool doesn't discriminate by race or gender.  
**Pain:** Zero budget for enterprise AI monitoring tools.  
**Needs:** Free tier, simple setup, mobile-friendly alerts.  
**Uses:** Default dashboard, Firebase Cloud Messaging alerts.

### Persona 4 — System Integrator (Developer)
**Name:** Wei, Backend Developer tasked with SDK integration  
**Goals:** Integrate ClearLens in a sprint with minimal disruption to existing systems.  
**Pain:** Existing monitoring tools require custom schema rewriting.  
**Needs:** 3-line SDK integration, flexible schema mapping, offline buffer for resilience.  
**Uses:** SDK, config JSON, API docs.

---

## 5. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ORGANIZATION MACHINE                            │
│                                                                     │
│   AI System ──► client.log_decision(raw_data)                       │
│                         │                                           │
│                 schema_mapper.py  ← clearlens.config.json           │
│                         │                                           │
│                 pii_scrubber.py  ← presidio-analyzer                │
│                         │                                           │
│                 buffer.py  ← offline queue (SQLite)                 │
│                         │                                           │
└─────────────────────────┼───────────────────────────────────────────┘
                          │ HTTPS + mTLS
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   GOOGLE CLOUD PUB/SUB                              │
│              topic: decision-logs/{org_id}                          │
│              encrypted at rest + in transit                         │
│              ephemeral — messages deleted after processing          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   CLOUD RUN — STREAM PROCESSOR                      │
│                                                                     │
│   Pub/Sub Subscriber → [in-memory processing, never persisted]      │
│           │                                                         │
│   ┌───────┴────────┐                                                │
│   │ fairness.py    │ → Demographic Parity, Disparate Impact,        │
│   │                │   Equalized Odds + Contradiction Detection     │
│   ├───────┴────────┤                                                │
│   │ drift.py       │ → 7-day rolling trend, linear regression,      │
│   │                │   projected threshold breach date              │
│   ├───────┴────────┤                                                │
│   │ anomaly.py     │ → Isolation Forest spike detection             │
│   └───────┬────────┘                                                │
│           │                                                         │
│   alerts/engine.py → 3-tier escalation (WARNING/ALERT/CRITICAL)     │
│           │                                                         │
│   alerts/action_card.py → Gemini 1.5 Flash → plain English steps    │
│           │                                                         │
│   alerts/notifier.py → SendGrid + FCM                               │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ Writes (metrics + alerts only — no raw data)
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   GOOGLE FIRESTORE                                  │
│                                                                     │
│   metrics/{org_id}/{metric_name}/{timestamp}                        │
│   alerts/{org_id}/{alert_id}                                        │
│   audit_trail/{org_id}/{event_id}   ← APPEND ONLY, no deletes      │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ REST API + WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                                   │
│                                                                     │
│   /ws/metrics/{org_id}           → WebSocket push to dashboard      │
│   /api/v1/metrics                → REST query                       │
│   /api/v1/alerts                 → Alert management                 │
│   /api/v1/audit                  → Audit trail                      │
│   /api/v1/ingest  (internal)     → Pub/Sub subscriber               │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   REACT DASHBOARD (Firebase Hosting)                │
│                                                                     │
│   LiveMetricChart ← WebSocket real-time                             │
│   DriftTrendLine ← 7-day visualization                              │
│   AlertBanner ← 3-tier display                                      │
│   ActionCard ← Gemini-generated steps                               │
│   FairnessTradeoffCard ← contradiction surface                      │
│   PlainEnglishToggle ← technical ↔ plain English                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Functional Requirements

### 6.1 SDK Requirements (FR-SDK)

| ID | Requirement | Priority |
|---|---|---|
| FR-SDK-01 | SDK must accept raw org decision dictionaries via `log_decision()` | MUST |
| FR-SDK-02 | SDK must load schema from `clearlens.config.json` and map fields to ClearLens standard format | MUST |
| FR-SDK-03 | SDK must scrub PII **before** any network call, using Presidio Analyzer + Anonymizer | MUST |
| FR-SDK-04 | SDK must drop fields in `FIELDS_TO_ALWAYS_DROP` list unconditionally | MUST |
| FR-SDK-05 | SDK must buffer decisions locally (SQLite) when offline and flush on reconnect | MUST |
| FR-SDK-06 | SDK must publish to Google Cloud Pub/Sub using service account credentials | MUST |
| FR-SDK-07 | SDK integration target: `pip install clearlens-sdk` + 3 lines of code | MUST |
| FR-SDK-08 | SDK must support async publish mode (`async_log_decision()`) | SHOULD |
| FR-SDK-09 | SDK must provide a JavaScript/TypeScript version (identical API surface) | SHOULD |
| FR-SDK-10 | SDK must validate schema config JSON on load and raise descriptive errors | MUST |

### 6.2 Stream Processor Requirements (FR-SP)

| ID | Requirement | Priority |
|---|---|---|
| FR-SP-01 | Processor must subscribe to Pub/Sub and process all incoming decisions | MUST |
| FR-SP-02 | All metric computation must happen **in memory** — no raw decision persistence | MUST |
| FR-SP-03 | Processor must compute ALL metrics in `FairnessMetricsEngine.BIAS_THRESHOLDS` per batch | MUST |
| FR-SP-04 | Processor must detect contradictions using the Fairness Impossibility Theorem logic | MUST |
| FR-SP-05 | `DriftDetector` must use 7-day rolling window with hourly snapshots | MUST |
| FR-SP-06 | Drift detection must require ≥ 48 hours of data before firing drift alerts | MUST |
| FR-SP-07 | Isolation Forest anomaly detector must flag spikes outside 3-sigma band | MUST |
| FR-SP-08 | All results (metrics, drift, anomalies) must be published via WebSocket within 2s | MUST |
| FR-SP-09 | Processor must be stateless — restart-safe with snapshot state in Firestore | SHOULD |

### 6.3 Alert Engine Requirements (FR-AE)

| ID | Requirement | Priority |
|---|---|---|
| FR-AE-01 | Alert engine must evaluate all 3 severity tiers on every metric computation | MUST |
| FR-AE-02 | Every alert must be written to immutable `audit_trail` collection | MUST |
| FR-AE-03 | WARNING alerts must trigger in-app notification only | MUST |
| FR-AE-04 | ALERT severity must trigger in-app + email (SendGrid) | MUST |
| FR-AE-05 | CRITICAL severity must trigger in-app + email + SMS + push (FCM) | MUST |
| FR-AE-06 | Action card must be generated via Gemini 1.5 Flash for all ALERT and CRITICAL levels | MUST |
| FR-AE-07 | Gemini call must have a fallback action card if API fails or response is malformed | MUST |
| FR-AE-08 | Organizations must be able to acknowledge alerts and log `action_taken` | MUST |
| FR-AE-09 | Alert acknowledgement must be recorded in `audit_trail` (org cannot delete or edit it) | MUST |
| FR-AE-10 | Alert deduplication: same metric + same org should not fire again within 1-hour cooldown | SHOULD |

### 6.4 Dashboard Requirements (FR-DASH)

| ID | Requirement | Priority |
|---|---|---|
| FR-DASH-01 | Dashboard must connect via WebSocket and update charts without page refresh | MUST |
| FR-DASH-02 | `LiveMetricChart` must display both current value line AND 7-day rolling average line | MUST |
| FR-DASH-03 | Bias threshold reference line (0.10) must be visible on every chart | MUST |
| FR-DASH-04 | `PlainEnglishToggle` must be present on every metric display; default = plain English | MUST |
| FR-DASH-05 | `FairnessTradeoffCard` must appear ONLY when a contradiction is detected | MUST |
| FR-DASH-06 | `ActionCard` must render Gemini-generated steps and allow user to mark as actioned | MUST |
| FR-DASH-07 | Alert Inbox must support filter by severity, date range, and acknowledge status | MUST |
| FR-DASH-08 | Audit Log page must show all alerts, acknowledgements, and actions for all time | MUST |
| FR-DASH-09 | Settings page must allow threshold customization and notification config | SHOULD |
| FR-DASH-10 | Dashboard must be fully responsive (mobile + tablet + desktop) | MUST |
| FR-DASH-11 | Firebase Auth: Google SSO must be the primary login method | MUST |
| FR-DASH-12 | Organizations must only see their own org's data (RBAC enforced at API level) | MUST |

---

## 7. Non-Functional Requirements (NFRs)

### 7.1 Performance

| NFR | Requirement |
|---|---|
| NFR-PERF-01 | Decision ingest latency (SDK publish → Pub/Sub) | < 500ms p99 |
| NFR-PERF-02 | Stream processing latency (Pub/Sub → metrics computed) | < 3s for batch of 100 |
| NFR-PERF-03 | WebSocket push latency (metric computed → dashboard updated) | < 2s |
| NFR-PERF-04 | Gemini action card generation | < 5s p95 |
| NFR-PERF-05 | Dashboard initial load time | < 3s (LCP) |
| NFR-PERF-06 | API response time | < 200ms p95 for GET endpoints |

### 7.2 Scalability

| NFR | Requirement |
|---|---|
| NFR-SCALE-01 | Pub/Sub must handle 100K decisions/sec (inherited from GCP Pub/Sub) |
| NFR-SCALE-02 | Cloud Run must auto-scale stream processor from 1–20 instances based on load |
| NFR-SCALE-03 | Firestore must handle concurrent writes from ≥ 1000 organizations simultaneously |
| NFR-SCALE-04 | WebSocket server must handle ≥ 10,000 concurrent dashboard connections |

### 7.3 Reliability

| NFR | Requirement |
|---|---|
| NFR-REL-01 | System uptime SLA: 99.9% (< 8.7 hours/year downtime) |
| NFR-REL-02 | SDK offline buffer must preserve decisions for ≥ 72 hours without data loss |
| NFR-REL-03 | Gemini API failure must not block alert delivery (fallback card active) |
| NFR-REL-04 | Pub/Sub message delivery: at-least-once with idempotency in processor |

---

## 8. Security & Privacy Requirements

> **Guiding Principle: Privacy-Preserving by Architecture, Not Policy**
> PII never reaches our servers. This is enforced technically, not promised in a policy.

### 8.1 Data Privacy

| SEC | Requirement | Enforcement Layer |
|---|---|---|
| SEC-PRIV-01 | PII must be scrubbed using Presidio before SDK publishes | SDK (client-side) |
| SEC-PRIV-02 | Fields in `FIELDS_TO_ALWAYS_DROP` must be removed unconditionally | SDK |
| SEC-PRIV-03 | Pub/Sub messages must contain zero identifying personal information | SDK + validation |
| SEC-PRIV-04 | Raw decision dictionaries must NEVER be written to Firestore | Stream processor |
| SEC-PRIV-05 | Only computed metric values and alert records are stored | Architecture rule |
| SEC-PRIV-06 | SDK source code must be open source so orgs can audit what is sent | Open source policy |

### 8.2 Authentication & Authorization

| SEC | Requirement | Implementation |
|---|---|---|
| SEC-AUTH-01 | All API endpoints must require a valid JWT token | FastAPI dependency |
| SEC-AUTH-02 | Firebase Auth (Google SSO) is the identity provider | Firebase Admin SDK |
| SEC-AUTH-03 | JWT must be validated on every request (not cached) | Middleware |
| SEC-AUTH-04 | `org_id` claim in JWT must match the org_id in every data query (row-level security) | Router layer |
| SEC-AUTH-05 | Service-to-service communication (Cloud Run ↔ Firestore) must use Workload Identity | GCP IAM |
| SEC-AUTH-06 | SDK API keys must be scoped per organization and rotatable | Backend |

### 8.3 Network Security

| SEC | Requirement |
|---|---|
| SEC-NET-01 | All traffic must use TLS 1.3 minimum |
| SEC-NET-02 | WebSocket connections must use `wss://` (TLS) only |
| SEC-NET-03 | CORS must be restricted to known dashboard domains |
| SEC-NET-04 | HTTP Strict Transport Security (HSTS) header must be set |
| SEC-NET-05 | Content Security Policy (CSP) headers must be configured on dashboard |
| SEC-NET-06 | API rate limiting: 1000 req/min per org (enforced at Cloud Run level) |

### 8.4 Data Security

| SEC | Requirement |
|---|---|
| SEC-DATA-01 | Firestore data at rest must use Google-managed encryption (AES-256) |
| SEC-DATA-02 | `audit_trail` collection must have Firestore security rules that deny delete and update |
| SEC-DATA-03 | Firestore security rules must restrict read/write to the org's own documents only |
| SEC-DATA-04 | Environment variables (API keys, secrets) must be stored in Google Secret Manager |
| SEC-DATA-05 | SDK API keys must never be logged or included in error messages |

### 8.5 Vulnerability Requirements

| SEC | Requirement | Tool/Method |
|---|---|---|
| SEC-VULN-01 | All Python dependencies must be pinned and scanned with `pip-audit` | CI/CD |
| SEC-VULN-02 | All npm dependencies must be scanned with `npm audit` | CI/CD |
| SEC-VULN-03 | SAST scan must run on every PR (Semgrep or Bandit for Python, ESLint security plugin for JS) | GitHub Actions |
| SEC-VULN-04 | No high or critical CVEs allowed in production dependencies | CI gate |
| SEC-VULN-05 | Container images must be scanned with Trivy before deploy | CI/CD |
| SEC-VULN-06 | Dependency updates must be automated via Dependabot | GitHub |
| SEC-VULN-07 | SQL injection not applicable (Firestore) — NoSQL injection prevented by Pydantic validation | Architecture |
| SEC-VULN-08 | Prompt injection: Gemini prompts must not include raw user data, only computed metrics | action_card.py |

### 8.6 OWASP Top 10 Mitigation

| OWASP Risk | Mitigation in ClearLens |
|---|---|
| A01 Broken Access Control | Row-level security via JWT `org_id` claim; Firestore rules |
| A02 Cryptographic Failures | TLS 1.3 everywhere; GCP-managed encryption; no custom crypto |
| A03 Injection | Pydantic V2 strict validation on all inputs; no raw SQL |
| A04 Insecure Design | Privacy-by-architecture; threat model reviewed pre-build |
| A05 Security Misconfiguration | IaC with Terraform; security rules in code (not console) |
| A06 Vulnerable Components | Pinned deps; `pip-audit`; `npm audit`; Dependabot |
| A07 Auth Failures | Firebase Auth; JWT validation per-request; no session tokens |
| A08 Software/Data Integrity | mTLS on Pub/Sub; SDK open source for auditability |
| A09 Logging Failures | Structured logging; no sensitive data in logs; audit trail |
| A10 SSRF | Gemini API is the only outbound call; URL validation enforced |

---

## 9. API Contract Specification

### 9.1 Base URL
```
Production: https://api.clearlens.io/api/v1
WebSocket:  wss://api.clearlens.io/ws
```

### 9.2 Authentication
```
Header: Authorization: Bearer <firebase_jwt_token>
```

### 9.3 Endpoints

#### Metrics
```
GET  /metrics                          List all metrics for org
GET  /metrics/{metric_name}            Get metric with history
GET  /metrics/{metric_name}/drift      Get drift analysis for metric
GET  /metrics/{metric_name}/anomalies  Get detected anomalies
```

#### Alerts
```
GET    /alerts                         List all alerts (filterable)
GET    /alerts/{alert_id}              Get single alert with action card
PATCH  /alerts/{alert_id}/acknowledge  Acknowledge alert + log action_taken
```

#### Audit
```
GET  /audit                            Full audit trail (paginated)
GET  /audit/export                     Export as CSV for regulators
```

#### WebSocket
```
ws: /ws/metrics/{org_id}              Real-time metric stream
ws: /ws/alerts/{org_id}              Real-time alert stream
```

#### SDK Ingest (internal — not public)
```
POST /internal/ingest                  Called by Pub/Sub push subscription
```

### 9.4 Standard Error Schema
```json
{
  "error": {
    "code": "BIAS_THRESHOLD_EXCEEDED",
    "message": "Human-readable description",
    "request_id": "uuid-v4",
    "timestamp": "ISO8601"
  }
}
```

---

## 10. Data Models

### 10.1 Decision Event (ephemeral — never stored)
```python
class DecisionEvent(BaseModel):
    org_id: str
    decision_value: bool
    sensitive_attribute: str
    sensitive_value: str
    timestamp: datetime
    batch_id: str = Field(default_factory=lambda: str(uuid4()))
    # No PII fields — stripped by SDK before publish
```

### 10.2 Metric Record (stored in Firestore)
```python
class MetricRecord(BaseModel):
    org_id: str
    metric_name: str
    value: float
    is_biased: bool
    plain_english: str
    timestamp: datetime
    window_size: int  # Number of decisions in this computation
    sensitive_attribute: str
```

### 10.3 Alert Record (stored in Firestore)
```python
class AlertRecord(BaseModel):
    alert_id: str = Field(default_factory=lambda: str(uuid4()))
    org_id: str
    severity: Literal["warning", "alert", "critical"]
    metric_name: str
    metric_value: float
    timestamp: datetime
    acknowledged: bool = False
    acknowledged_by: str | None = None
    acknowledged_at: datetime | None = None
    action_taken: str | None = None
    action_card: dict | None = None  # Gemini-generated
```

### 10.4 Audit Trail Entry (append-only, never mutable)
```python
class AuditEntry(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    org_id: str
    event_type: Literal["alert_created", "alert_acknowledged", "action_logged"]
    alert_id: str
    actor: str  # User email from JWT
    timestamp: datetime
    metadata: dict  # Immutable snapshot of alert at time of event
```

---

## 11. Fairness Metrics Specification

### 11.1 Metrics Computed

| Metric | Formula | Bias Threshold | Plain English Template |
|---|---|---|---|
| Demographic Parity Difference | `P(Ŷ=1|A=a) - P(Ŷ=1|A=b)` | > 0.10 | "Group A is approved X% more often than Group B" |
| Disparate Impact Ratio | `min(P(Ŷ=1|A)) / max(P(Ŷ=1|A))` | < 0.80 (4/5ths rule) | "Group A is approved at only X% the rate of Group B" |
| Equalized Odds Difference | `max(TPR diff, FPR diff)` | > 0.10 | "Among qualified applicants, Group A is approved X% less often" |

### 11.2 Contradiction Detection Rules
- If `|DPD| < 0.05` AND `DIR < 0.85` → surface **Fairness Impossibility Theorem** card
- Do NOT auto-resolve; surface for org stakeholder decision
- Contradiction explanation must be in plain English

### 11.3 Drift Detection Specification
- Rolling window: 7 days, hourly snapshots
- Algorithm: Linear regression on metric values over time (OLS)
- Alert condition: `|slope| > 0.02` (2% drift per day)
- Minimum data: 48 hours (48 snapshots) before drift can fire
- Output must include: drift rate, direction, projected breach date
- Plain English: "Bias is slowly worsening at X% per day. At this rate, threshold will be breached in N days."

### 11.4 Anomaly Detection Specification
- Algorithm: Isolation Forest (scikit-learn)
- Training: Rolling 7-day baseline, retrained every 24 hours
- Contamination parameter: 0.05 (5% expected anomaly rate)
- Alert condition: `anomaly_score < -0.5` (definitive outlier)

---

## 12. Alert System Specification

### 12.1 Severity Tiers

| Severity | Threshold | Channels | Color | Action Required |
|---|---|---|---|---|
| WARNING | > 7% disparity | In-app only | `#f59e0b` (amber) | Monitor closely |
| ALERT | > 10% disparity | In-app + Email | `#ef4444` (red) | Review recent decisions |
| CRITICAL | > 20% disparity | In-app + Email + SMS + Push | `#7f1d1d` (dark red) | Consider pausing system |

### 12.2 Alert Deduplication
- Same metric + same org → no repeat alert within 60-minute cooldown
- Severity escalation (WARNING → ALERT) fires immediately regardless of cooldown

### 12.3 Action Card Prompt Contract
The Gemini prompt must:
1. Include: domain context, metric name, metric value, severity
2. NOT include: raw decisions, user names, org name, PII of any kind
3. Output: JSON with `summary` (1 sentence) + `steps` (list of exactly 3 strings)
4. Have a hardcoded fallback if JSON parse fails

---

## 13. Frontend Component Specification

### 13.1 Component Inventory

| Component | File | Key Props | WebSocket? |
|---|---|---|---|
| `LiveMetricChart` | `LiveMetricChart.jsx` | `orgId, metricName` | Yes |
| `DriftTrendLine` | `DriftTrendLine.jsx` | `orgId, metricName, days=7` | No (REST) |
| `AlertBanner` | `AlertBanner.jsx` | `alert, onAcknowledge` | Yes |
| `ActionCard` | `ActionCard.jsx` | `alertId, geminiSteps` | No |
| `FairnessTradeoffCard` | `FairnessTradeoffCard.jsx` | `contradiction, onChoose` | No |
| `PlainEnglishToggle` | `PlainEnglishToggle.jsx` | `technicalLabel, plainLabel, defaultMode` | No |
| `MetricExplainer` | `MetricExplainer.jsx` | `metricName` | No |

### 13.2 PlainEnglishToggle Specification
- Default mode: `"plain"` (always) for new organizations
- Remembers preference in localStorage per org
- Toggle is a pill-shaped switch: `[ Technical | Plain English ]`
- Both modes must exist for every single metric before component ships

### 13.3 FairnessTradeoffCard Specification
- MUST only render when `contradiction.length > 0`
- Cannot be dismissed — it is persistent until org acknowledges the contradiction
- Must have a `onChoose(metric)` callback that logs choice to audit trail
- Must use plain English explanation of the Fairness Impossibility Theorem

### 13.4 State Management
- Global state: Zustand store (`metricsStore.js`)
- WebSocket connection: `useWebSocket.js` hook (auto-reconnects on disconnect)
- Alert state: `useAlerts.js` hook (polls every 30s as WebSocket backup)

### 13.5 Design System Requirements
- Font: Inter (Google Fonts)
- Color mode: Dark mode primary
- Chart library: Recharts
- No Tailwind — use scoped CSS modules or styled-components
- Animations: Framer Motion for alert entrance, chart transitions

---

## 14. Infrastructure & Deployment

### 14.1 Google Cloud Resources

| Resource | Purpose | Config |
|---|---|---|
| Cloud Pub/Sub | Decision log message bus | `decision-logs` topic, per-org subscriptions |
| Cloud Run (stream processor) | Stateless compute, auto-scaled | min=1, max=20, CPU=1, RAM=2GB |
| Cloud Run (FastAPI backend) | API + WebSocket | min=1, max=10, CPU=2, RAM=4GB |
| Google Firestore | Metric + alert storage | Native mode, multi-region (us-central1) |
| Firebase Auth | Identity provider | Google SSO enabled |
| Firebase Hosting | React dashboard | CDN-distributed |
| Google Secret Manager | API keys, JWT secrets | Version-controlled secrets |
| Google Cloud Monitoring | Uptime + latency dashboards | Alerting on < 99.9% uptime |

### 14.2 Infrastructure as Code
All resources must be defined in Terraform:
- `infra/pubsub.tf` — topics, subscriptions, IAM
- `infra/cloudrun.tf` — service definitions, env vars (via Secret Manager refs)
- `infra/firestore.tf` — indexes, security rules

### 14.3 CI/CD Pipeline (GitHub Actions)

```yaml
On PR:
  1. Linting (ruff for Python, ESLint for JS)
  2. Unit tests (pytest + vitest)
  3. SAST scan (Bandit, Semgrep)
  4. Dependency audit (pip-audit, npm audit)
  5. Container scan (Trivy) [for backend]

On merge to main:
  1. Build + push container to Google Artifact Registry
  2. Deploy stream processor to Cloud Run
  3. Deploy FastAPI backend to Cloud Run
  4. Deploy dashboard to Firebase Hosting
  5. Run smoke tests against production
```

### 14.4 Local Development
```bash
docker-compose up  
# Starts: FastAPI backend, Mock Pub/Sub, Firestore emulator, React dev server
```

---

## 15. Build Order & Agent Assignment

Build in this **exact sequence**. Each step is independently testable before the next begins.

| Step | Module | File(s) | Skills Activated | Testable Milestone |
|---|---|---|---|---|
| 1 | SDK Schema Mapper | `sdk/clearlens_sdk/schema_mapper.py` | `clearlens-core`, `python-pro` | Unit test: maps org fields to standard format |
| 2 | SDK PII Scrubber | `sdk/clearlens_sdk/pii_scrubber.py` | `clearlens-core`, `security-auditor`, `python-pro` | Unit test: no PII survives scrub |
| 3 | SDK Buffer | `sdk/clearlens_sdk/buffer.py` | `clearlens-core`, `async-python-patterns` | Unit test: offline → online flush |
| 4 | SDK Client + Pub/Sub | `sdk/clearlens_sdk/client.py` | `clearlens-core`, `fastapi-pro` | Integration: publish + receive on emulator |
| 5 | Fairness Engine | `backend/app/stream/fairness.py` | `clearlens-core`, `ml-pipeline-workflow` | Unit test: known biased dataset → correct flags |
| 6 | Drift Detector | `backend/app/stream/drift.py` | `clearlens-core`, `ml-pipeline-workflow` | Unit test: synthetic drift series → alert at day 3 |
| 7 | Anomaly Detector | `backend/app/stream/anomaly.py` | `clearlens-core`, `ml-pipeline-workflow` | Unit test: spike injection → detected |
| 8 | Alert Engine | `backend/app/alerts/engine.py` | `clearlens-core`, `fastapi-pro` | Unit test: 3-tier thresholds + audit write |
| 9 | Action Card | `backend/app/alerts/action_card.py` | `clearlens-core`, `prompt-engineering-patterns` | Integration: Gemini call + fallback |
| 10 | Firestore Layer | `backend/app/db/firestore.py` | `clearlens-core`, `backend-architect` | Integration: write + read metrics + audit |
| 11 | FastAPI Routers | `backend/app/routers/*.py` | `clearlens-core`, `fastapi-pro`, `api-design-principles` | Integration: all REST endpoints + auth |
| 12 | WebSocket Endpoint | `backend/app/main.py` | `clearlens-core`, `fastapi-pro`, `async-python-patterns` | Integration: WS push from processor to client |
| 13 | Dashboard Foundation | `dashboard/src/store/`, `hooks/` | `clearlens-core`, `react-modernization` | E2E: WS connection + state updates |
| 14 | LiveMetricChart | `dashboard/src/components/LiveMetricChart.jsx` | `clearlens-core`, `react-modernization`, `typescript-pro` | Visual: chart updates in real time |
| 15 | PlainEnglishToggle + FairnessTradeoffCard | Two components | `clearlens-core`, `react-modernization` | Visual: toggle works, card conditional |
| 16 | AlertBanner + ActionCard | Two components | `clearlens-core`, `react-modernization` | Visual: alert renders, steps actionable |
| 17 | Pages (Dashboard, AlertInbox, AuditLog, Settings) | 4 pages | `clearlens-core`, `react-modernization` | Visual: full page flow |
| 18 | Demo Script | `demo/simulate_decisions.py` | `clearlens-core` | Demo: full 3-phase demo runs without errors |
| 19 | Infrastructure as Code | `infra/*.tf` | `cloud-architect`, `cost-optimization` | Terraform plan succeeds |
| 20 | End-to-End Test | CI pipeline | All skills | Full pipeline passes |

### 15.1 Team Member Assignment (4 Members)

**🧑‍💻 Member 1 — SDK Engineer**
- Owns: Steps 1–4 (all of `sdk/`)
- Tell Antigravity: *"Build the ClearLens SDK pii_scrubber, schema_mapper, buffer, and client.py"*
- Skills auto-activated: `clearlens-core` + `security-auditor` + `python-pro` + `async-python-patterns`

**🧑‍💻 Member 2 — Stream Processor Engineer**
- Owns: Steps 5–7 (fairness, drift, anomaly)
- Tell Antigravity: *"Implement the fairness metrics engine, 7-day drift detector, and Isolation Forest anomaly detector"*
- Skills auto-activated: `clearlens-core` + `ml-pipeline-workflow` + `async-python-patterns`

**🧑‍💻 Member 3 — Backend & Alert Engineer**
- Owns: Steps 8–12 (alert engine, action card, Firestore, FastAPI, WebSocket)
- Tell Antigravity: *"Build the 3-tier alert engine, Gemini action card, Firestore layer, FastAPI routers, and WebSocket endpoint"*
- Skills auto-activated: `clearlens-core` + `fastapi-pro` + `prompt-engineering-patterns` + `api-design-principles` + `backend-architect`

**🧑‍💻 Member 4 — Frontend Engineer**
- Owns: Steps 13–17 (full React dashboard)
- Tell Antigravity: *"Build the React dashboard with LiveMetricChart, PlainEnglishToggle, FairnessTradeoffCard, AlertBanner, ActionCard, and all 4 pages"*
- Skills auto-activated: `clearlens-core` + `react-modernization` + `typescript-pro`

**👥 All Members Together** — Steps 18–20 (demo script, infra, E2E tests)

---

## 16. Testing & QA Strategy

### 16.1 Unit Tests (per module, 100% coverage required)

| Module | Framework | Key Test Cases |
|---|---|---|
| `pii_scrubber.py` | pytest | Names, emails, SSNs, phone numbers all scrubbed; clean data passes through |
| `schema_mapper.py` | pytest | All field mappings; missing required field raises error |
| `buffer.py` | pytest | Offline enqueue, reconnect flush, no loss on crash recovery |
| `fairness.py` | pytest | Known biased dataset → `is_biased=True`; fair dataset → `is_biased=False` |
| `drift.py` | pytest | Rising series → `direction="worsening"`; < 48h data → `insufficient_data` |
| `anomaly.py` | pytest | Injected spike → detected; normal values → not flagged |
| `engine.py` (alerts) | pytest | All 3 severity thresholds correctly triggered and written to audit |
| `action_card.py` | pytest | Valid Gemini response → parsed; invalid response → fallback card |
| All API routers | pytest + TestClient | Auth required; org isolation; correct HTTP status codes |

### 16.2 Integration Tests

| Test | Description |
|---|---|
| SDK → Pub/Sub → Processor | End-to-end with Pub/Sub emulator |
| Processor → Firestore | Metric write + read back |
| WebSocket push | Metric computed → dashboard receives within 2s |
| Alert → Notification | CRITICAL alert → all 4 channels fire |
| Gemini fallback | Kill Gemini API → fallback card delivered |

### 16.3 Security Tests

| Test | Tool |
|---|---|
| SAST | Bandit (Python), Semgrep |
| Dependency scan | pip-audit, npm audit |
| Container scan | Trivy |
| JWT bypass attempt | Manual + pytest |
| Org isolation test | pytest: org A cannot see org B's data |
| PII leak test | Send PII in decision → verify zero PII in Pub/Sub |
| Prompt injection | Test Gemini prompt with adversarial metric names |

### 16.4 Performance Tests

| Test | Tool | Pass Criteria |
|---|---|---|
| SDK publish throughput | locust | 1000 decisions/sec per org |
| API response time | locust | p95 < 200ms |
| WebSocket latency | custom | < 2s metric → dashboard |
| Dashboard load time | Lighthouse | LCP < 3s, Performance > 90 |

---

## 17. Vulnerability Mitigation Checklist

> Use this checklist before every production deploy. All items must be ✅ before go-live.

### SDK
- [ ] Presidio version pinned and scanned with `pip-audit`
- [ ] PII scrubber unit test suite passes (100% coverage)
- [ ] SDK API key never written to logs
- [ ] Buffer SQLite file has 0600 permissions (local file security)

### Backend
- [ ] All dependencies in `requirements.txt` pinned to exact versions
- [ ] `pip-audit` reports zero high/critical CVEs
- [ ] Bandit static analysis reports zero high severity issues
- [ ] JWT validation tested against expired, malformed, and wrong-org tokens
- [ ] Org isolation tested: org A query with org B's JWT returns 403
- [ ] Firestore security rules deployed and tested
- [ ] `audit_trail` collection tests: delete blocked, update blocked
- [ ] Rate limiting configured and tested (1000 req/min)
- [ ] CORS restricted to Firebase Hosting domain only
- [ ] All secrets in Google Secret Manager (no plaintext in env or code)

### Frontend
- [ ] `npm audit` reports zero high/critical CVEs
- [ ] CSP headers configured (no `unsafe-inline` without nonce)
- [ ] HSTS header present
- [ ] No sensitive data stored in localStorage (only org preferences)
- [ ] All API calls use HTTPS (wss://)
- [ ] ESLint security plugin passes

### Infrastructure
- [ ] Firestore rules prevent cross-org access
- [ ] Cloud Run services not publicly accessible without auth
- [ ] Pub/Sub subscriptions require service account (not public)
- [ ] Terraform `plan` reviewed before every `apply`
- [ ] Container images scanned with Trivy (zero critical CVEs)
- [ ] Workload Identity enabled (no service account key files)

---

## 18. Performance SLAs

| Metric | SLA | Measurement |
|---|---|---|
| SDK `log_decision()` call time | < 50ms (local, excluding network) | SDK unittest timing |
| Pub/Sub publish latency | < 500ms p99 | Cloud Monitoring |
| Stream processing time | < 3s for 100-decision batch | Stream processor metrics |
| WebSocket push latency | < 2s | E2E integration test |
| API GET endpoints | < 200ms p95 | Cloud Run metrics |
| Gemini action card | < 5s p95 | API latency metric |
| Dashboard LCP | < 3s | Lighthouse CI |
| System uptime | 99.9% | Cloud Monitoring uptime check |

---

## 19. Compliance & Regulatory Alignment

| Framework | How ClearLens Aligns |
|---|---|
| **GDPR** | PII scrubbed before leaving org machine; no personal data stored; right-to-erasure N/A (no personal data) |
| **EU AI Act** | Audit trail supports transparency obligation; bias metrics support high-risk AI system monitoring |
| **CCPA** | No personal information collected or sold |
| **ECOA (US)** | Disparate impact and demographic parity metrics align with ECOA compliance for lending |
| **EEOC (US)** | 4/5ths rule (DIR > 0.80) aligned with EEOC adverse impact guidelines for hiring |
| **HIPAA** | Healthcare domain supported; PII scrubbing prevents PHI transmission |
| **SOC 2 Type II** | Audit trail + access controls + encryption support SOC 2 Security criteria |

---

## 20. Demo Day Specification

### 20.1 Demo Sequence (2 minutes target)

| Phase | Duration | Bias Level | Expected UI Event |
|---|---|---|---|
| Fair System | 0–30s | 0.0 | All metrics green, trend line flat |
| Slow Drift Injection | 30–90s | 0.0 → 0.3 (ramp) | Trend line rises, drift alert fires (~day 3 simulation) |
| Full Bias Spike | 90s+ | 0.8 | CRITICAL alert fires, Gemini action card appears |

### 20.2 Demo Script for Judges

1. **Open live dashboard** — show green metrics. Say: *"Here's a fair system."*
2. **Start `simulate_decisions.py`** — slow bias injection. Say: *"Now bias is creeping in slowly. Watch the trend line."*
3. **Point to drift alert** — Say: *"Our rolling trend detector caught it. A spike detector would have missed this entirely."*
4. **Crank to full bias** — Say: *"Now watch a critical alert fire. The Gemini action card tells the manager exactly what to do — no data science degree required."*
5. **Click action card** — Say: *"Any manager can act on this immediately."*
6. **Click Audit Log** — Say: *"And if they ignore it, this audit trail exists. Accountability is built in."*

### 20.3 Demo Resilience Requirements
- `simulate_decisions.py` must work offline (local Pub/Sub emulator)
- Gemini API must have mock fallback active for demo (pre-generated action card)
- Dashboard must be pre-loaded with 6 hours of historical data for trend visualization
- WebSocket must auto-reconnect in < 5 seconds if dropped

---

## 21. Open Questions & Decisions

> [!IMPORTANT]
> The following decisions must be confirmed by the team before Step 7 of the build order begins.

| # | Question | Options | Impact |
|---|---|---|---|
| OQ-01 | Should drift detection use a fixed 7-day window or user-configurable? | Fixed (simpler) vs Configurable (Settings page) | Affects `DriftDetector.__init__` and Settings page FR |
| OQ-02 | Should the JS SDK be built in Sprint 1 or deferred? | Sprint 1 (more work) vs Post-submission | Affects FR-SDK-09 priority |
| OQ-03 | Should Equalized Odds require ground truth labels? | Yes (needs `y_true` from org) vs No (proxy via approval rate) | Affects schema_mapper and config spec |
| OQ-04 | Should alert cooldown be org-configurable or fixed at 60 minutes? | Fixed (simpler) vs Org-configurable | Affects alert engine and Settings page |
| OQ-05 | Should Firestore indexes be created manually or via Terraform? | Manual (faster) vs IaC (safer) | Affects `infra/firestore.tf` completeness |

> [!WARNING]
> OQ-03 is blocking for the fairness.py implementation. If equalized odds requires ground truth and the org does not provide it, skip that metric and log a `metric_unavailable` event. Do NOT silently compute an incorrect value.

---

*This PRD is the single source of truth for ClearLens development alongside `CLAUDE.md`.*
*Last updated: 2026-03-30 · Google Solution Challenge submission*
