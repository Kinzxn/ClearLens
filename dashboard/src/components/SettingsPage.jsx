import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Save, Bell, Mail, MessageSquare, Smartphone, Monitor, Info, ShieldCheck, AlertTriangle, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

// ── Reusable Slider ────────────────────────────────────────────────────────────
function ThresholdSlider({ id, label, description, value, onChange, min, max, step, format, warnAbove, goodBelow }) {
  const pct = ((value - min) / (max - min)) * 100;
  const isWarn = warnAbove ? value >= warnAbove : goodBelow ? value <= goodBelow : false;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor={id} className="text-sm font-medium text-charcoal">{label}</label>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
        <span className={`text-sm font-semibold font-mono px-2 py-0.5 rounded-md border ${isWarn ? "text-red-600 bg-red-50 border-red-200" : "text-charcoal bg-foundation border-border"}`}>
          {format(value)}
        </span>
      </div>
      <div className="relative h-2">
        <div className="absolute inset-0 bg-slate-100 rounded-full border border-border" />
        <motion.div
          className={`absolute left-0 top-0 h-full rounded-full ${isWarn ? "bg-red-400" : "bg-accent"}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.15 }}
        />
        <input
          id={id}
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 10 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ── Toggle switch ───────────────────────────────────────────────────────────
function Toggle({ id, label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-charcoal cursor-pointer">{label}</label>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-9 h-5 rounded-full border transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
          checked ? "bg-accent border-accent" : "bg-slate-200 border-slate-300"
        }`}
      >
        <motion.span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? "calc(100% - 18px)" : "2px" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

// ── Toast notification ────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => setTimeout(onDone, 2000)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-charcoal text-white px-4 py-2.5 rounded-lg border border-white/10 shadow-lg"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

// ── Flaw callout card ─────────────────────────────────────────────────────────
function FlawMitigation({ flaw, mitigation, status }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-md border ${
      status === "mitigated" ? "bg-emerald-50 border-emerald-200" :
      status === "partial"   ? "bg-amber-50 border-amber-200" :
      "bg-red-50 border-red-200"
    }`}>
      <span className={`flex-shrink-0 text-sm ${
        status === "mitigated" ? "text-emerald-600" :
        status === "partial"   ? "text-amber-600" :
        "text-red-500"
      }`}>
        {status === "mitigated" ? "✓" : status === "partial" ? "~" : "!"}
      </span>
      <div>
        <p className={`text-xs font-semibold ${
          status === "mitigated" ? "text-emerald-800" :
          status === "partial"   ? "text-amber-800" :
          "text-red-800"
        }`}>{flaw}</p>
        <p className="text-xs text-slate-600 mt-0.5">{mitigation}</p>
      </div>
      <Badge
        variant={status === "mitigated" ? "success" : status === "partial" ? "warning" : "danger"}
        className="ml-auto flex-shrink-0"
      >
        {status === "mitigated" ? "Fixed" : status === "partial" ? "Partial" : "Known"}
      </Badge>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function SettingsPage() {
  // ── Threshold state ────────────────────────────────────────────────────────
  const [warnThreshold,     setWarnThreshold]     = useState(7);
  const [alertThreshold,    setAlertThreshold]    = useState(10);
  const [criticalThreshold, setCriticalThreshold] = useState(20);
  const [minSampleSize,     setMinSampleSize]     = useState(100);
  const [cooldownMinutes,   setCooldownMinutes]   = useState(15);

  // ── Notification channels ──────────────────────────────────────────────────
  const [emailEnabled,  setEmailEnabled]  = useState(true);
  const [smsEnabled,    setSmsEnabled]    = useState(false);
  const [pushEnabled,   setPushEnabled]   = useState(true);
  const [inAppEnabled,  setInAppEnabled]  = useState(true);

  // ── Feature flags ──────────────────────────────────────────────────────────
  const [plainEnglishDefault, setPlainEnglishDefault] = useState(true);
  const [serverPiiGuard,      setServerPiiGuard]      = useState(true);
  const [confidenceIntervals, setConfidenceIntervals] = useState(true);
  const [alertGrouping,       setAlertGrouping]       = useState(true);
  const [groundTruthIngestion,setGroundTruthIngestion]= useState(false);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => setToastMsg(msg);
  const handleSave = () => {
    // Validate thresholds are ordered
    if (warnThreshold >= alertThreshold || alertThreshold >= criticalThreshold) {
      showToast("⚠ Thresholds must be ordered: Warning < Alert < Critical");
      return;
    }
    showToast("Settings saved — changes take effect on next metric computation.");
  };
  const handleReset = () => {
    setWarnThreshold(7); setAlertThreshold(10); setCriticalThreshold(20);
    setMinSampleSize(100); setCooldownMinutes(15);
    showToast("Thresholds reset to defaults.");
  };

  return (
    <>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold text-charcoal tracking-tight">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure bias thresholds, notification channels, and platform-wide feature flags.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button id="settings-reset" variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5" />
            Reset defaults
          </Button>
          <Button id="settings-save" variant="primary" size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />
            Save changes
          </Button>
        </div>
      </div>
      <div className="h-px bg-border mb-8 mt-4" />

      <div className="grid grid-cols-12 gap-6">
        {/* ── Left column ── */}
        <div className="col-span-12 lg:col-span-7 space-y-6">

          {/* Bias Thresholds */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bias Alert Thresholds</CardTitle>
                <Badge variant="accent">Applies to all metrics</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              <ThresholdSlider
                id="threshold-warning"
                label="Warning threshold"
                description="In-app notification only. Triggers early-watch alerts."
                value={warnThreshold} onChange={setWarnThreshold}
                min={2} max={15} step={0.5}
                format={v => `${v}%`}
                warnAbove={alertThreshold}
              />
              <ThresholdSlider
                id="threshold-alert"
                label="Alert threshold"
                description="In-app + email. Bias has exceeded acceptable levels."
                value={alertThreshold} onChange={setAlertThreshold}
                min={5} max={25} step={0.5}
                format={v => `${v}%`}
                warnAbove={criticalThreshold}
              />
              <ThresholdSlider
                id="threshold-critical"
                label="Critical threshold"
                description="In-app + email + SMS + push. Consider pausing the model immediately."
                value={criticalThreshold} onChange={setCriticalThreshold}
                min={10} max={50} step={1}
                format={v => `${v}%`}
              />

              {/* Visual threshold preview */}
              <div className="pt-2">
                <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-2">Threshold preview</p>
                <div className="relative h-3 bg-slate-100 rounded-full border border-border overflow-hidden">
                  <div className="absolute left-0 top-0 h-full bg-emerald-400 rounded-full" style={{ width: `${warnThreshold / 50 * 100}%` }} />
                  <div className="absolute top-0 h-full bg-amber-400" style={{ left: `${warnThreshold / 50 * 100}%`, width: `${(alertThreshold - warnThreshold) / 50 * 100}%` }} />
                  <div className="absolute top-0 h-full bg-red-400" style={{ left: `${alertThreshold / 50 * 100}%`, width: `${(criticalThreshold - alertThreshold) / 50 * 100}%` }} />
                  <div className="absolute top-0 right-0 h-full bg-red-700" style={{ left: `${criticalThreshold / 50 * 100}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span className="text-emerald-600">0 → {warnThreshold}% healthy</span>
                  <span className="text-amber-600">warn</span>
                  <span className="text-red-500">alert</span>
                  <span className="text-red-700">critical 50%+</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Behaviour */}
          <Card>
            <CardHeader>
              <CardTitle>Alert Behaviour</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-5">
              <ThresholdSlider
                id="min-sample"
                label="Minimum sample size before alerts"
                description="Addresses Flaw 3: prevents false alerts from tiny batches (e.g. 5 decisions)."
                value={minSampleSize} onChange={setMinSampleSize}
                min={20} max={500} step={10}
                format={v => `${v} decisions`}
              />
              <ThresholdSlider
                id="cooldown"
                label="Alert cooldown window"
                description="Addresses Flaw 7: same metric + org won't fire again within this window."
                value={cooldownMinutes} onChange={setCooldownMinutes}
                min={5} max={120} step={5}
                format={v => `${v} min`}
              />
              <div className="border-t border-border pt-4">
                <Toggle
                  id="alert-grouping"
                  label="Alert grouping"
                  description="Batch concurrent alerts from the same metric into a single notification."
                  checked={alertGrouping}
                  onChange={setAlertGrouping}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-border">
              {[
                { id: "notif-inapp",  icon: Monitor,        label: "In-app",       description: "Always active — cannot be disabled.",    checked: inAppEnabled,  onChange: () => {},          disabled: true  },
                { id: "notif-email",  icon: Mail,           label: "Email (SendGrid)", description: "Alert + Critical severity levels.",  checked: emailEnabled,  onChange: setEmailEnabled,   disabled: false },
                { id: "notif-push",   icon: Smartphone,     label: "Push (FCM)",   description: "Critical severity only.",               checked: pushEnabled,   onChange: setPushEnabled,    disabled: false },
                { id: "notif-sms",    icon: MessageSquare,  label: "SMS",          description: "Critical severity only. Costs apply.", checked: smsEnabled,    onChange: setSmsEnabled,     disabled: false },
              ].map(({ id, icon: Icon, label, description, checked, onChange, disabled }) => (
                <div key={id} className={`flex items-start justify-between gap-4 py-3 ${disabled ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-foundation border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-charcoal">{label}</p>
                      <p className="text-xs text-slate-400">{description}</p>
                    </div>
                  </div>
                  <button
                    id={id}
                    disabled={disabled}
                    role="switch"
                    aria-checked={checked}
                    onClick={() => !disabled && onChange(!checked)}
                    className={`relative flex-shrink-0 w-9 h-5 rounded-full border transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                      disabled ? "cursor-not-allowed" : "cursor-pointer"
                    } ${checked ? "bg-accent border-accent" : "bg-slate-200 border-slate-300"}`}
                  >
                    <motion.span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                      animate={{ left: checked ? "calc(100% - 18px)" : "2px" }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="col-span-12 lg:col-span-5 space-y-6">

          {/* Feature Flags */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-border">
              <Toggle id="plain-english-default" label="Plain English default" description="New users see plain-language explanations first." checked={plainEnglishDefault} onChange={setPlainEnglishDefault} />
              <Toggle id="server-pii-guard" label="Server-side PII guard" description="Flaw 1 fix: reject payloads containing PII patterns at the API gateway, not just the SDK." checked={serverPiiGuard} onChange={setServerPiiGuard} />
              <Toggle id="confidence-intervals" label="Show confidence intervals" description="Flaw 3 fix: display 95% CI on every metric value." checked={confidenceIntervals} onChange={setConfidenceIntervals} />
              <Toggle id="ground-truth-ingestion" label="Delayed ground truth ingestion" description="Flaw 2 fix: enables Equalized Odds via optional label upload 24–72h after decisions." checked={groundTruthIngestion} onChange={setGroundTruthIngestion} />
            </CardContent>
          </Card>

          {/* Architecture Honesty Panel — all 10 flaws */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <CardTitle>Known Limitations & Mitigations</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <p className="text-xs text-slate-400 mb-3">Transparent engineering: every known weakness and what we do about it.</p>
              <FlawMitigation
                flaw="PII may reach server if SDK is bypassed"
                mitigation="Server-side PII guard (above) rejects payloads with PII patterns at the API level."
                status="partial"
              />
              <FlawMitigation
                flaw="Equalized odds needs ground truth labels"
                mitigation="Metric is clearly labelled 'proxy_approximate' when no labels exist. Ground truth ingestion flag above."
                status="mitigated"
              />
              <FlawMitigation
                flaw="Small samples cause false alerts (noise)"
                mitigation={`Minimum sample threshold (currently ${minSampleSize} decisions) + 95% CI before any alert fires.`}
                status="mitigated"
              />
              <FlawMitigation
                flaw="Isolation Forest is too heavy for streaming"
                mitigation="Replaced with EWMA + Z-score (see Anomaly Feed). Isolation Forest deferred to batch."
                status="mitigated"
              />
              <FlawMitigation
                flaw="7-day rolling window requires state"
                mitigation="State stored in Redis (RollingWindowStore). Processor is stateless between restarts."
                status="mitigated"
              />
              <FlawMitigation
                flaw="No raw decisions → hard to debug root cause"
                mitigation="Anonymized aggregates (group counts, rates) stored. Root cause panel uses KS shift scores."
                status="partial"
              />
              <FlawMitigation
                flaw="Alert fatigue from multiple metrics"
                mitigation={`${cooldownMinutes}-min cooldown + alert grouping ${alertGrouping ? "(active)" : "(disabled)"} suppresses duplicates.`}
                status="mitigated"
              />
              <FlawMitigation
                flaw="Fairness tradeoff UX is dangerous for non-technical users"
                mitigation="FairnessTradeoffCard blocks dismiss, shows simulation, logs choice to audit trail."
                status="mitigated"
              />
              <FlawMitigation
                flaw="3-line SDK claim is unrealistic in enterprise"
                mitigation="SDK is 3 lines for devs; schema mapping, compliance, and infra are separate steps."
                status="partial"
              />
              <FlawMitigation
                flaw="No feedback loop — system doesn't learn"
                mitigation="Threshold tuning (this page) feeds back to alert engine. Auto-tuning not implemented."
                status="partial"
              />
            </CardContent>
          </Card>

          {/* Org info */}
          <Card>
            <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[
                { label: "Org ID",   value: "demo-org"   },
                { label: "Domain",   value: "lending"    },
                { label: "Tier",     value: "Free (NGO)" },
                { label: "SDK key",  value: "sk-demo-••••••••" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="text-xs font-mono text-charcoal">{value}</span>
                </div>
              ))}
              <Button id="rotate-sdk-key" variant="secondary" size="sm" className="w-full mt-1">
                Rotate SDK Key
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
      </AnimatePresence>
    </>
  );
}
