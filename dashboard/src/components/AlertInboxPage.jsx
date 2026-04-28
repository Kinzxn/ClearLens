import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckCircle2, Clock, Filter, ChevronDown,
  AlertTriangle, Flame, Info, Mail,
  MessageSquare, Smartphone, Monitor, Download
} from "lucide-react";
import { Card, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

// ── Initial alert data ────────────────────────────────────────────────────────
const INITIAL_ALERTS = [
  {
    alert_id: "a001",
    severity: "critical",
    metric_name: "demographic_parity_difference",
    metric_value: 0.23,
    timestamp: "2026-04-24T08:12:00Z",
    acknowledged: false,
    acknowledged_by: null,
    channels: ["in_app", "email", "sms", "push"],
    action_card: {
      summary: "Your AI is approving one demographic group 23% more than another — an urgent equity gap.",
      steps: [
        "Immediately pause automated decisions for the affected group and switch to manual review.",
        "Pull the last 500 decisions and run a subgroup audit by the data science team.",
        "Contact legal to assess ECOA/EEOC exposure before resuming the model.",
      ],
      tradeoff_warning: "Reducing majority-group approvals to achieve parity may trigger a disparate impact claim — involve legal before adjusting thresholds.",
      confidence_note: "n=340, 95% CI [18%, 28%]. Signal is statistically significant.",
    },
    actioned: false,
    action_taken: null,
  },
  {
    alert_id: "a002",
    severity: "alert",
    metric_name: "disparate_impact_ratio",
    metric_value: 0.77,
    timestamp: "2026-04-24T06:45:00Z",
    acknowledged: true,
    acknowledged_by: "priya",
    channels: ["in_app", "email"],
    action_card: {
      summary: "The least-approved group is being approved at only 77% the rate of the most-approved group — below the legal 80% threshold.",
      steps: [
        "Review feature weights for proxy variables (e.g. zip code, credit history length).",
        "Run a counterfactual analysis to identify which input changes flip outcomes for the affected group.",
        "Schedule a model recalibration sprint within the next 5 business days.",
      ],
      tradeoff_warning: "Removing correlated features may reduce overall model accuracy by 2–5%.",
      confidence_note: null,
    },
    actioned: true,
    action_taken: "Scheduled subgroup audit for next Monday.",
  },
  {
    alert_id: "a003",
    severity: "warning",
    metric_name: "demographic_parity_difference",
    metric_value: 0.09,
    timestamp: "2026-04-23T22:10:00Z",
    acknowledged: false,
    acknowledged_by: null,
    channels: ["in_app"],
    action_card: null,
    actioned: false,
    action_taken: null,
  },
  {
    alert_id: "a004",
    severity: "alert",
    metric_name: "equalized_odds_difference",
    metric_value: 0.18,
    timestamp: "2026-04-23T14:30:00Z",
    acknowledged: true,
    acknowledged_by: "marcus",
    channels: ["in_app", "email"],
    action_card: {
      summary: "Qualified applicants from the minority group are approved 18% less often than equally-qualified majority-group applicants.",
      steps: [
        "Audit threshold calibration — check if decision cutoffs differ across groups.",
        "Compare TPR and FPR across groups to identify which error type drives the gap.",
        "Engage an external fairness auditor for a formal equalized odds assessment.",
      ],
      tradeoff_warning: "Equalizing error rates may require group-specific thresholds, which can conflict with demographic parity.",
      confidence_note: "Ground truth labels verified. n=812 decisions.",
    },
    actioned: false,
    action_taken: null,
  },
];

const SEVERITY_CONFIG = {
  critical: { icon: Flame,         label: "Critical", variant: "critical" },
  alert:    { icon: AlertTriangle, label: "Alert",    variant: "danger"   },
  warning:  { icon: Info,          label: "Warning",  variant: "warning"  },
};

const CHANNEL_ICONS = {
  in_app: { icon: Monitor,      label: "In-app" },
  email:  { icon: Mail,         label: "Email"  },
  sms:    { icon: MessageSquare,label: "SMS"    },
  push:   { icon: Smartphone,   label: "Push"   },
};

function formatTimeAgo(dateStr) {
  const now = new Date();
  const diffMs = now - new Date(dateStr);
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH > 24) return `${Math.floor(diffH / 24)}d ago`;
  if (diffH > 0) return `${diffH}h ago`;
  return `${Math.floor(diffMs / 60000)}m ago`;
}

// ── Single alert row ──────────────────────────────────────────────────────────
function AlertRow({ alert, onAcknowledge, onExpand, expanded }) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  const Icon = cfg.icon;
  const [actionText, setActionText] = useState("");
  const [showActionInput, setShowActionInput] = useState(false);

  const handleAck = () => {
    if (showActionInput && actionText.trim()) {
      onAcknowledge(alert.alert_id, actionText.trim());
      setShowActionInput(false);
    } else {
      setShowActionInput(true);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`border rounded-lg overflow-hidden bg-white transition-colors duration-[120ms] ${
        alert.acknowledged ? "border-border" : "border-slate-300"
      }`}
    >
      {/* Row header */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-foundation transition-colors duration-[120ms]"
        onClick={() => onExpand(alert.alert_id)}
      >
        <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
          alert.severity === "critical" ? "bg-red-50 border border-red-200" :
          alert.severity === "alert"    ? "bg-red-50 border border-red-100" :
          "bg-amber-50 border border-amber-100"
        }`}>
          <Icon className={`w-3.5 h-3.5 ${
            alert.severity === "critical" ? "text-red-600" :
            alert.severity === "alert"    ? "text-red-500" : "text-amber-500"
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            <span className="text-xs font-mono text-slate-500">{alert.metric_name}</span>
            <span className="text-xs font-semibold text-charcoal">{(alert.metric_value * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />{formatTimeAgo(alert.timestamp)}
            </span>
            {alert.acknowledged ? (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />Acknowledged by {alert.acknowledged_by}
              </span>
            ) : (
              <span className="text-[11px] text-red-500 font-medium animate-pulse">Needs action</span>
            )}
          </div>
        </div>

        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        </motion.div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-3 bg-foundation space-y-3">
              {alert.action_card ? (
                <>
                  {/* Gemini label */}
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                    Gemini Action Card
                  </p>
                  <p className="text-sm text-charcoal leading-relaxed">{alert.action_card.summary}</p>

                  {/* Numbered steps */}
                  <div className="space-y-2">
                    {alert.action_card.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-light text-accent text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tradeoff */}
                  {alert.action_card.tradeoff_warning && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">{alert.action_card.tradeoff_warning}</p>
                    </div>
                  )}

                  {/* Confidence note */}
                  {alert.action_card.confidence_note && (
                    <p className="text-[11px] text-slate-400 italic">{alert.action_card.confidence_note}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Action card not generated for Warning-level alerts. Escalates automatically if metric exceeds Alert threshold.
                </p>
              )}

              {/* Channels */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-400">Sent via:</span>
                {(alert.channels ?? ["in_app"]).map(ch => {
                  const c = CHANNEL_ICONS[ch];
                  if (!c) return null;
                  const ChIcon = c.icon;
                  return (
                    <span key={ch} className="flex items-center gap-1 text-[11px] text-slate-500">
                      <ChIcon className="w-3 h-3" />{c.label}
                    </span>
                  );
                })}
              </div>

              {/* Acknowledge section */}
              {!alert.acknowledged ? (
                <div className="border-t border-border pt-3 space-y-2">
                  <AnimatePresence>
                    {showActionInput && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <label className="text-xs text-slate-500 font-medium">
                          Describe action taken (required):
                        </label>
                        <input
                          autoFocus
                          value={actionText}
                          onChange={e => setActionText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAck()}
                          placeholder="e.g. Paused automated decisions, notified compliance team…"
                          className="w-full mt-1.5 px-3 py-2 text-sm bg-white border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors duration-[120ms]"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex gap-2">
                    <Button
                      id={`ack-${alert.alert_id}`}
                      size="sm"
                      variant="primary"
                      onClick={handleAck}
                      disabled={showActionInput && !actionText.trim()}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {showActionInput ? "Confirm & log to audit trail" : "Acknowledge"}
                    </Button>
                    {showActionInput && (
                      <Button
                        id={`ack-cancel-${alert.alert_id}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowActionInput(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : alert.action_taken ? (
                <div className="border-t border-border pt-3 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700">
                    <span className="font-medium">Action logged:</span> {alert.action_taken}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Export CSV helper ─────────────────────────────────────────────────────────
function exportCSV(alerts) {
  const rows = [
    ["alert_id", "severity", "metric_name", "metric_value", "timestamp", "acknowledged", "acknowledged_by", "action_taken"],
    ...alerts.map(a => [
      a.alert_id, a.severity, a.metric_name,
      (a.metric_value * 100).toFixed(2) + "%",
      a.timestamp,
      a.acknowledged ? "yes" : "no",
      a.acknowledged_by ?? "",
      a.action_taken ?? "",
    ]),
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "clearlens_alerts.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function AlertInboxPage() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [expanded, setExpanded] = useState("a001");
  const [filter, setFilter] = useState("all");

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  const handleAcknowledge = (alertId, actionTaken) => {
    setAlerts(prev => prev.map(a =>
      a.alert_id === alertId
        ? { ...a, acknowledged: true, acknowledged_by: "you", actioned: true, action_taken: actionTaken }
        : a
    ));
  };

  const filtered = alerts.filter(a => {
    if (filter === "unacknowledged") return !a.acknowledged;
    if (filter === "critical")       return a.severity === "critical";
    return true;
  });

  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold text-charcoal tracking-tight flex items-center gap-2">
            Alert Inbox
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold"
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Bias alerts with Gemini action cards. Acknowledge to log action to the audit trail.
          </p>
        </div>
        <Button id="export-alerts-csv" variant="secondary" size="sm" onClick={() => exportCSV(alerts)}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>
      <div className="h-px bg-border mb-6 mt-4" />

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-5">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        {[
          { id: "all",            label: "All alerts" },
          { id: "unacknowledged", label: `Needs action (${unreadCount})` },
          { id: "critical",       label: "Critical only" },
        ].map(f => (
          <button
            key={f.id}
            id={`filter-${f.id}`}
            onClick={() => setFilter(f.id)}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors duration-[120ms]",
              filter === f.id
                ? "bg-charcoal text-white"
                : "bg-white border border-border text-slate-500 hover:border-slate-300 hover:text-charcoal",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map(alert => (
            <AlertRow
              key={alert.alert_id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onExpand={toggleExpand}
              expanded={expanded === alert.alert_id}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-40 border border-dashed border-border rounded-lg gap-2"
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <p className="text-slate-400 text-sm">
              {filter === "unacknowledged" ? "All caught up — no unacknowledged alerts." : "No alerts match this filter."}
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
}
