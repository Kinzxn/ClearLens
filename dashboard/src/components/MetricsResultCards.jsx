import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Flame, Info, CheckCircle2, ShieldAlert, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { BIAS_THRESHOLDS, ALERT_THRESHOLDS } from "../lib/metricsEngine";

// ── Animated metric value counter ─────────────────────────────────────────────
export function AnimatedValue({ value, format = (v) => v, className = "" }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {format(value)}
    </motion.span>
  );
}

// ── Confidence interval bar ───────────────────────────────────────────────────
export function CIBar({ value, ci, threshold, higherIsBetter = false }) {
  if (!ci) return null;
  const range = 0.5;
  const toX = (v) => Math.max(0, Math.min(100, ((v + range / 2) / range) * 100));
  const valX = toX(value);
  const lo = toX(ci[0]);
  const hi = toX(ci[1]);
  const thrX = toX(threshold);
  const biased = higherIsBetter ? value < threshold : Math.abs(value) > threshold;

  return (
    <div className="mt-2">
      <div className="relative h-2 bg-slate-100 rounded-full border border-border overflow-hidden">
        {/* CI band */}
        <div
          className="absolute top-0 h-full bg-indigo-100 rounded-full"
          style={{ left: `${lo}%`, width: `${Math.max(0, hi - lo)}%` }}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-0 h-full w-px bg-red-400"
          style={{ left: `${thrX}%` }}
        />
        {/* Value marker */}
        <motion.div
          className={`absolute top-0 h-full w-1 rounded-full ${biased ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ left: `${valX}%` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>CI [{(ci[0] * 100).toFixed(1)}%</span>
        <span className="text-red-400">threshold {(threshold * 100).toFixed(0)}%</span>
        <span>{(ci[1] * 100).toFixed(1)}%]</span>
      </div>
    </div>
  );
}

// ── Single metric result card ─────────────────────────────────────────────────
export function MetricCard({ title, metric, threshold, higherIsBetter = false, unavailable = false }) {
  if (unavailable || metric?.status === "metric_unavailable") {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 p-3 bg-foundation border border-border rounded-md">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-500">{metric?.plain_english ?? "Enable ground truth to compute."}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const val = metric.value;
  const biased = metric.is_biased;
  const severity = biased
    ? (higherIsBetter
        ? (val < ALERT_THRESHOLDS.critical ? "critical" : val < ALERT_THRESHOLDS.alert ? "alert" : "warning")
        : (Math.abs(val) >= ALERT_THRESHOLDS.critical ? "critical" : Math.abs(val) >= ALERT_THRESHOLDS.alert ? "alert" : "warning"))
    : null;

  return (
    <Card className={biased ? "border-red-200" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant={metric.label_status === "verified" ? "success" : "mono"}>
              {metric.label_status === "verified" ? "Verified" : "Proxy"}
            </Badge>
            {biased
              ? <Badge variant={severity === "critical" ? "critical" : severity === "alert" ? "danger" : "warning"}>Biased</Badge>
              : <Badge variant="success">✓ Fair</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Value */}
        <div className="flex items-baseline gap-2">
          <AnimatedValue
            value={val}
            format={(v) => (Math.abs(v) * 100).toFixed(2) + "%"}
            className={`text-3xl font-semibold font-mono ${biased ? "text-red-600" : "text-charcoal"}`}
          />
          {metric.confidence_interval && (
            <span className="text-xs text-slate-400">
              ±{((metric.confidence_interval[1] - metric.confidence_interval[0]) / 2 * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="relative h-1.5 bg-slate-100 rounded-full border border-border overflow-hidden">
            <motion.div
              className={`absolute left-0 top-0 h-full rounded-full ${biased ? "bg-red-400" : "bg-emerald-400"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.abs(val) * 400, 100)}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Threshold line */}
            <div
              className="absolute top-0 h-full w-px bg-red-300"
              style={{ left: `${Math.min(threshold * 400, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0%</span>
            <span className="text-red-400">threshold {(threshold * 100).toFixed(0)}%</span>
            <span>25%+</span>
          </div>
        </div>

        {/* CI bar */}
        {metric.confidence_interval && (
          <CIBar value={val} ci={metric.confidence_interval} threshold={threshold} higherIsBetter={higherIsBetter} />
        )}

        {/* Plain english */}
        <div className={`p-2.5 rounded-md border text-xs leading-relaxed ${biased ? "bg-red-50 border-red-100 text-red-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}>
          {metric.plain_english}
        </div>
      </CardContent>
    </Card>
  );
}

// ── DIR metric card (higher = better) ────────────────────────────────────────
export function DIRCard({ metric }) {
  if (!metric) return null;
  const val = metric.value;
  const biased = metric.is_biased;

  return (
    <Card className={biased ? "border-red-200" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Disparate Impact Ratio</CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="mono">Proxy</Badge>
            {biased
              ? <Badge variant="danger">Adverse Impact</Badge>
              : <Badge variant="success">✓ Legal</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-baseline gap-2">
          <AnimatedValue
            value={val}
            format={(v) => (v * 100).toFixed(1) + "%"}
            className={`text-3xl font-semibold font-mono ${biased ? "text-red-600" : "text-charcoal"}`}
          />
          <span className="text-xs text-slate-400">of majority rate</span>
        </div>

        <div>
          <div className="relative h-1.5 bg-slate-100 rounded-full border border-border overflow-hidden">
            <motion.div
              className={`absolute left-0 top-0 h-full rounded-full ${biased ? "bg-red-400" : "bg-emerald-400"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(val * 100, 100)}%` }}
              transition={{ duration: 0.6 }}
            />
            <div className="absolute top-0 h-full w-px bg-red-300" style={{ left: "80%" }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0%</span>
            <span className="text-red-400">4/5ths legal line 80%</span>
            <span>100%</span>
          </div>
        </div>

        <div className={`p-2.5 rounded-md border text-xs leading-relaxed ${biased ? "bg-red-50 border-red-100 text-red-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}>
          {metric.plain_english}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Alert banner ──────────────────────────────────────────────────────────────
export function AlertBanner({ severity, actionCard }) {
  if (!severity) return null;

  const config = {
    critical: { icon: Flame,         bg: "bg-red-50",   border: "border-red-200",   text: "text-red-800",  label: "CRITICAL",  iconColor: "text-red-600" },
    alert:    { icon: AlertTriangle, bg: "bg-red-50",   border: "border-orange-200", text: "text-orange-800",label: "ALERT",    iconColor: "text-orange-500" },
    warning:  { icon: Info,          bg: "bg-amber-50", border: "border-amber-200",  text: "text-amber-800", label: "WARNING",  iconColor: "text-amber-500" },
  }[severity];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${config.bg} ${config.border} p-4 space-y-3`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
        <span className={`text-sm font-semibold ${config.text}`}>
          Alert Engine: {config.label}
        </span>
        <Badge variant={severity === "critical" ? "critical" : severity === "alert" ? "danger" : "warning"}>
          Would fire in production
        </Badge>
      </div>
      {actionCard && (
        <div className="space-y-2">
          <p className={`text-sm ${config.text} leading-relaxed`}>{actionCard.summary}</p>
          <div className="space-y-1.5">
            {actionCard.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-white border border-current text-[10px] font-bold flex items-center justify-center mt-0.5 text-slate-500">{i + 1}</span>
                <p className={`text-xs ${config.text}`}>{step}</p>
              </div>
            ))}
          </div>
          {actionCard.tradeoff_warning && (
            <div className="flex items-start gap-1.5 pt-1">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 italic">{actionCard.tradeoff_warning}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Risk score dial (mini) ────────────────────────────────────────────────────
export function MiniRiskDial({ score, band }) {
  const color = band === "CRITICAL" ? "#DC2626" : band === "HIGH" ? "#EA580C" : band === "MODERATE" ? "#CA8A04" : "#16A34A";
  const r = 40, cx = 50, cy = 50;
  const circ = Math.PI * r;
  const fill = (score / 100) * circ;

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-border rounded-lg">
      <svg width="80" height="50" viewBox="0 0 100 60">
        <path d={`M 10 50 A ${r} ${r} 0 0 1 90 50`} fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
        <motion.path
          d={`M 10 50 A ${r} ${r} 0 0 1 90 50`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - fill }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        <text x="50" y="48" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <div>
        <p className="text-xs text-slate-400">Risk Score</p>
        <p className="text-lg font-semibold text-charcoal">{band}</p>
      </div>
    </div>
  );
}

// ── Ground truth detail table ─────────────────────────────────────────────────
export function GroundTruthTable({ eodMetric, groupA, groupB }) {
  if (!eodMetric?.ground_truth) return null;
  const gtA = eodMetric.ground_truth.groupA;
  const gtB = eodMetric.ground_truth.groupB;

  const rows = [
    { label: "True Positives (TP)", a: gtA.tp, b: gtB.tp },
    { label: "False Positives (FP)", a: gtA.fp, b: gtB.fp },
    { label: "True Negatives (TN)", a: gtA.tn, b: gtB.tn },
    { label: "False Negatives (FN)", a: gtA.fn, b: gtB.fn },
    { label: "TPR (Recall)", a: (gtA.tpr * 100).toFixed(1) + "%", b: (gtB.tpr * 100).toFixed(1) + "%" },
    { label: "FPR (Fall-out)", a: (gtA.fpr * 100).toFixed(1) + "%", b: (gtB.fpr * 100).toFixed(1) + "%" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Confusion Matrix (Equalized Odds)</CardTitle></CardHeader>
      <CardContent className="pt-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-slate-400 font-medium">Metric</th>
              <th className="text-right py-2 text-slate-400 font-medium">{groupA.name}</th>
              <th className="text-right py-2 text-slate-400 font-medium">{groupB.name}</th>
              <th className="text-right py-2 text-slate-400 font-medium">Δ Gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, a, b }) => {
              const numA = parseFloat(String(a));
              const numB = parseFloat(String(b));
              const diff = isNaN(numA) || isNaN(numB) ? null : Math.abs(numA - numB);
              return (
                <tr key={label} className="border-b border-border last:border-0">
                  <td className="py-2 text-charcoal">{label}</td>
                  <td className="py-2 text-right font-mono text-charcoal">{a}</td>
                  <td className="py-2 text-right font-mono text-charcoal">{b}</td>
                  <td className={`py-2 text-right font-mono font-medium ${diff && diff > 5 ? "text-red-500" : "text-slate-400"}`}>
                    {diff != null ? (typeof a === "string" && a.includes("%") ? `${diff.toFixed(1)}%` : diff.toFixed(0)) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Sample guard warning ──────────────────────────────────────────────────────
export function SampleGuardBlock({ reason }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50 gap-3 text-center px-6"
    >
      <ShieldAlert className="w-8 h-8 text-amber-500" />
      <p className="text-sm font-semibold text-amber-800">Sample Guard: Insufficient Data</p>
      <p className="text-xs text-amber-700 leading-relaxed">{reason}</p>
      <p className="text-[11px] text-amber-600 italic">Increase sample sizes to unlock metric computation.</p>
    </motion.div>
  );
}
