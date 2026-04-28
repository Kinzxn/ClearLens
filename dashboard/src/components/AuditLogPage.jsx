import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, Download, AlertTriangle, Flame,
  Info, CheckCircle2, UserCircle, Clock
} from "lucide-react";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

// ── Mock audit trail — matches backend AuditEntry schema ──────────────────
const MOCK_AUDIT = [
  {
    event_id: "e001", event_type: "alert_created",      alert_id: "a001",
    actor: "system",
    timestamp: "2026-04-24T08:12:00Z",
    severity: "critical", metric_name: "demographic_parity_difference", metric_value: 0.23,
  },
  {
    event_id: "e002", event_type: "alert_acknowledged",  alert_id: "a002",
    actor: "priya@demo-org.com",
    timestamp: "2026-04-24T08:55:00Z",
    severity: "alert", metric_name: "disparate_impact_ratio", metric_value: 0.77,
  },
  {
    event_id: "e003", event_type: "action_logged",       alert_id: "a002",
    actor: "priya@demo-org.com",
    timestamp: "2026-04-24T09:10:00Z",
    action_taken: "Scheduled subgroup audit for next Monday.",
    severity: "alert", metric_name: "disparate_impact_ratio", metric_value: 0.77,
  },
  {
    event_id: "e004", event_type: "alert_created",       alert_id: "a003",
    actor: "system",
    timestamp: "2026-04-23T22:10:00Z",
    severity: "warning", metric_name: "demographic_parity_difference", metric_value: 0.09,
  },
  {
    event_id: "e005", event_type: "alert_acknowledged",  alert_id: "a004",
    actor: "marcus@demo-org.com",
    timestamp: "2026-04-23T15:00:00Z",
    severity: "alert", metric_name: "equalized_odds_difference", metric_value: 0.18,
  },
];

const EVENT_CONFIG = {
  alert_created:      { label: "Alert Created",      color: "danger",  icon: AlertTriangle  },
  alert_acknowledged: { label: "Acknowledged",       color: "success", icon: CheckCircle2   },
  action_logged:      { label: "Action Logged",      color: "accent",  icon: ClipboardList  },
};

const SEVERITY_DOT = {
  critical: "bg-red-600",
  alert:    "bg-red-400",
  warning:  "bg-amber-400",
};

function formatTs(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function AuditRow({ entry, index }) {
  const cfg = EVENT_CONFIG[entry.event_type] ?? EVENT_CONFIG.alert_created;
  const Icon = cfg.icon;
  const isSystem = entry.actor === "system";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="relative flex items-start gap-4 pb-6 last:pb-0"
    >
      {/* Timeline line */}
      <div className="absolute left-[19px] top-7 bottom-0 w-px bg-border" />

      {/* Event icon */}
      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${
          cfg.color === "danger"  ? "text-red-500"    :
          cfg.color === "success" ? "text-emerald-500" :
          "text-accent"
        }`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1.5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={cfg.color === "danger" ? "danger" : cfg.color === "success" ? "success" : "accent"}>
                {cfg.label}
              </Badge>
              <span className="text-xs font-mono text-slate-500">{entry.metric_name}</span>
              {entry.metric_value !== undefined && (
                <span className="text-xs font-semibold text-charcoal">
                  {(entry.metric_value * 100).toFixed(1)}%
                </span>
              )}
              {entry.severity && (
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[entry.severity]}`} />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`flex items-center gap-1 text-[11px] ${isSystem ? "text-slate-400" : "text-slate-600"}`}>
                <UserCircle className="w-3 h-3" />
                {isSystem ? "System (auto-generated)" : entry.actor}
              </div>
            </div>
            {entry.action_taken && (
              <p className="text-xs text-slate-700 mt-1.5 bg-foundation border border-border px-2 py-1.5 rounded-md">
                "{entry.action_taken}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {formatTs(entry.timestamp)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AuditLogPage() {
  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-charcoal tracking-tight">Audit Log</h1>
          <p className="text-sm text-slate-400 mt-1">
            Append-only event log of all alerts, acknowledgements, and actions. Immutable for regulatory compliance.
          </p>
        </div>
        <Button id="export-audit" variant="secondary" size="sm">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>
      <div className="h-px bg-border mb-6" />

      {/* Compliance note */}
      <div className="flex items-start gap-2 p-3 bg-accent-light border border-indigo-200 rounded-lg mb-6">
        <ClipboardList className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-xs text-accent leading-relaxed">
          This log is <strong>append-only</strong> — entries cannot be deleted or modified.
          It serves as your immutable accountability trail for GDPR, EU AI Act, ECOA, and SOC 2 compliance.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Events",     value: MOCK_AUDIT.length },
          { label: "Alerts Created",   value: MOCK_AUDIT.filter(e => e.event_type === "alert_created").length },
          { label: "Actions Logged",   value: MOCK_AUDIT.filter(e => e.event_type === "action_logged").length },
        ].map(({ label, value }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white border border-border rounded-lg px-4 py-3"
          >
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-2xl font-semibold text-charcoal mt-0.5">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="py-5">
          {MOCK_AUDIT.map((entry, i) => (
            <AuditRow key={entry.event_id} entry={entry} index={i} />
          ))}
        </CardContent>
      </Card>
    </>
  );
}
