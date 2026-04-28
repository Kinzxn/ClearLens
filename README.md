# ClearLens 

ClearLens is a real-time AI bias monitoring platform that watches the *present* instead of auditing the *past*. It is designed with a high-end, minimalist professional interface to translate complex bias metrics into actionable, premium user experiences.

This dashboard provides continuous telemetry, alerting, and actionable insights to ensure your models remain fair and compliant with regulations like the EU AI Act, GDPR, and EEOC guidelines.

## How to Use the Dashboard

The ClearLens Dashboard is divided into several purpose-built pages to help you monitor, investigate, and mitigate AI bias.

### 1. Overview
The command center for your AI's fairness health.
*   **Live Telemetry**: View real-time stats for Demographic Parity Difference (DPD), Disparate Impact Ratio (DIR), and Equalized Odds Difference (EOD).
*   **Executive Risk Score**: A composite 0-100 score indicating overall fairness risk.
*   **Plain English Toggle**: Instantly translate dense mathematical metrics into simple, actionable language.
*   **Fairness Tradeoffs**: View detected conflicts (e.g., the Fairness Impossibility Theorem) where optimizing one metric might harm another.

### 2. Anomaly Feed
Designed to catch sudden, severe spikes in bias (e.g., due to an upstream data pipeline failure).
*   **EWMA Control Chart**: Visualizes the 48-hour rolling baseline with 3σ control bounds.
*   **Z-Score Detection**: Highlights specific hours where metrics deviated significantly from the norm.
*   **Investigation**: Click into anomaly cards to view root-cause hints and mark them as resolved.

### 3. Drift Analysis
Designed to catch the "boiling frog" scenario—slow, gradual degradation of fairness over time.
*   **Trend Trajectory**: 7-day OLS area charts showing where the bias is heading, allowing you to catch breaches *before* they hit critical thresholds.
*   **Fairness Radar**: A multidimensional view of your model's health across all tracked metrics.

### 4. Metrics Explorer
An interactive simulation engine using the exact formulas from the ClearLens backend.
*   **Model Tester**: Configure custom groups (size, approval rate, qualification rate) and instantly compute DPD, DIR, EOD, and Risk Scores. This is perfect for "what-if" testing.
*   **Drift Simulator**: Run a 20-step animated simulation injecting gradual bias into a model to see exactly when and how the alerting engine fires.
*   **Scenario Library**: Instantly load preset edge cases (e.g., EEOC 4/5ths Violation, Fairness Impossibility Theorem, Critical Bias Spikes).

### 5. Alert Inbox
Your triage center for actionable bias events.
*   **Gemini Action Cards**: Every alert comes with AI-generated, step-by-step mitigation advice and tradeoff warnings.
*   **Acknowledge Workflow**: Review alerts, input the actions taken by your team, and click "Acknowledge" to securely log the event to the compliance trail.
*   **Export CSV**: Download your current alert state for external reporting.

### 6. Audit Log
An immutable, append-only timeline for regulatory compliance.
*   **Compliance Ready**: Tracks every alert fired, acknowledgment made, and mitigation action logged. 
*   **Accountability**: Essential for SOC 2, EEOC, and EU AI Act audits to prove your organization took timely action when bias was detected.

### 7. Settings
Configure the underlying behavior of the ClearLens engine.
*   **Bias Thresholds**: Adjust the Warning, Alert, and Critical boundaries for your metrics.
*   **Alert Behavior**: Set minimum sample sizes to prevent false alarms on small batches (e.g., 5 decisions) and configure alert cooldowns.
*   **Feature Flags**: Toggle advanced features like Server-side PII Guarding, Confidence Interval display, and delayed Ground Truth ingestion for EOD calculations.
*   **Honest Architecture**: Review the "Known Limitations & Mitigations" panel for a transparent look at how ClearLens handles statistical and architectural edge cases.

---

## Technical Stack

*   **Frontend**: React (Vite), Framer Motion, Recharts, Tailwind CSS.
*   **Backend Engine**: Python (FastAPI), `fairlearn`, `scipy.stats` (for Drift and Z-score).
*   **AI Integration**: Gemini API for plain-english Action Card generation.
