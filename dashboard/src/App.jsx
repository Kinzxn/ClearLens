import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./components/ui/Sidebar";
import { ConfidenceBadge } from "./components/ConfidenceBadge";
import { DriftTypeSeparator } from "./components/DriftTypeSeparator";
import { FairnessTradeoffCard } from "./components/FairnessTradeoffCard";
import { ImpactSimulator } from "./components/ImpactSimulator";
import { LiveMetricChart } from "./components/LiveMetricChart";
import { PlainEnglishToggle } from "./components/PlainEnglishToggle";
import { RiskScoreDial } from "./components/RiskScoreDial";
import { RootCausePanel } from "./components/RootCausePanel";
import { AlertInboxPage } from "./components/AlertInboxPage";
import { AuditLogPage } from "./components/AuditLogPage";
import { AnomalyFeedPage } from "./components/AnomalyFeedPage";
import { AnomalyPage as DriftPage } from "./components/AnomalyPage";
import { SettingsPage } from "./components/SettingsPage";
import { MetricsExplorerPage } from "./components/MetricsExplorerPage";
import { Flame, Bell } from "lucide-react";

// ── Animated alert ticker ─────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { severity: "critical", text: "DPD exceeded 20% — CRITICAL alert fired · 4m ago" },
  { severity: "alert",    text: "DIR dropped below 0.80 — ALERT sent to priya@demo-org · 2h ago" },
  { severity: "warning",  text: "Drift slope at 2.5%/day — threshold breach projected in ~14 days" },
];

function AlertTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % TICKER_ITEMS.length), 4500);
    return () => clearInterval(t);
  }, []);
  const item = TICKER_ITEMS[idx];

  return (
    <div className="bg-charcoal h-8 flex items-center overflow-hidden flex-shrink-0">
      <div className="flex items-center gap-2 px-4 flex-shrink-0 border-r border-white/10">
        <Flame className="w-3 h-3 text-red-400 animate-pulse flex-shrink-0" />
        <span className="text-[11px] font-semibold text-white uppercase tracking-wide">Live</span>
      </div>
      <div className="flex-1 overflow-hidden px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`text-[12px] font-medium whitespace-nowrap ${
              item.severity === "critical" ? "text-red-300" :
              item.severity === "alert"    ? "text-amber-200" : "text-slate-300"
            }`}
          >
            {item.text}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Overview page ─────────────────────────────────────────────────────────────
const STATS = [
  { label: "Demographic Parity", value: "23%",   delta: "+2.1%",  up: true  },
  { label: "Disparate Impact",   value: "0.77",  delta: "−0.03",  up: false },
  { label: "Equalized Odds Δ",   value: "0.18",  delta: "+0.04",  up: true  },
  { label: "Decisions / hr",     value: "4,820", delta: "stable", up: null  },
];

function StatBar() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {STATS.map(({ label, value, delta, up }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-border rounded-lg px-4 py-3"
        >
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-charcoal">{value}</span>
            <span className={`text-xs font-medium ${
              up === null ? "text-slate-400" : up ? "text-red-500" : "text-emerald-600"
            }`}>{delta}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function OverviewPage() {
  const handleMetricChoice = (metric) => console.log(`Optimizing: ${metric}`);
  return (
    <>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-charcoal tracking-tight">Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Live fairness telemetry for your AI system. All metrics update in real time via WebSocket.</p>
        <div className="mt-5 h-px bg-border" />
      </div>
      <StatBar />
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-12 md:col-span-4">
          <RiskScoreDial score={63.4} band="HIGH" advice="Alert stakeholders and review decisions from the past 24 hours." />
        </div>
        <div className="col-span-12 md:col-span-8">
          <ConfidenceBadge value={0.23} confidenceInterval={[0.18, 0.28]} sampleSize={340} labelStatus="proxy_approximate" />
        </div>
      </div>
      <div className="mb-4">
        <PlainEnglishToggle
          technicalLabel="Demographic Parity Difference: 0.23 — P(Ŷ=1|A=male) − P(Ŷ=1|A=female) exceeds the 0.10 bias threshold."
          plainLabel="Your system approves one group 23% more often than another — the highest it's ever been."
          defaultMode="plain"
        />
      </div>
      <div className="mb-4">
        <LiveMetricChart orgId="demo-org" metricName="demographic_parity_difference" />
      </div>
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-12 md:col-span-6">
          <ImpactSimulator currentValue={0.08} simulatedValue7d={0.13} projectedBreach="~14 days" driftDirection="worsening" />
        </div>
        <div className="col-span-12 md:col-span-6">
          <DriftTypeSeparator dataDriftPsi={0.08} biasDriftSlope={0.025} classification="likely_model_issue" plainEnglish="Input data is stable, fairness is degrading — likely a model issue." />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <RootCausePanel feature="credit_history_length" ksScore={0.31} correlation={0.44} plainEnglish="Bias increase appears linked to a shift in credit history length distribution." />
        </div>
        <div className="col-span-12 md:col-span-6">
          <FairnessTradeoffCard
            metrics={["Demographic Parity", "Equalized Odds"]}
            explanation="These fairness metrics mathematically conflict when base rates differ across groups."
            recommendation="Choose the metric priority together with legal and community stakeholders."
            tradeoffSimulation="Optimizing Demographic Parity may worsen Equalized Odds by ~8%."
            onChoose={handleMetricChoice}
          />
        </div>
      </div>
    </>
  );
}



// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("overview");
  // Global unread alert count — shared across topbar bell and sidebar
  const [unreadAlerts, setUnreadAlerts] = useState(2);

  const renderPage = () => {
    switch (page) {
      case "overview":  return <OverviewPage />;
      case "anomalies": return <AnomalyFeedPage />;
      case "drift":     return <DriftPage />;
      case "metrics":   return <MetricsExplorerPage />;
      case "alerts":    return <AlertInboxPage />;
      case "audit":     return <AuditLogPage />;
      case "settings":  return <SettingsPage />;
      default:          return <OverviewPage />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-foundation">
      <AlertTicker />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={page} onNavigate={setPage} />

        <main className="flex-1 overflow-auto">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-foundation/90 backdrop-blur border-b border-border h-12 flex items-center px-8 justify-between">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              ClearLens · {page}
            </div>
            <div className="flex items-center gap-4">
              <button
                id="topbar-alerts"
                onClick={() => setPage("alerts")}
                className="relative p-1.5 text-slate-400 hover:text-charcoal transition-colors duration-[120ms]"
                title="Alert Inbox"
              >
                <Bell className="w-4 h-4" />
                <AnimatePresence>
                  {unreadAlerts > 0 && (
                    <motion.span
                      key="dot"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center"
                    >
                      {unreadAlerts}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-400">WebSocket live</span>
              </div>
            </div>
          </div>

          {/* Page content with animated transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="px-8 py-8 max-w-screen-xl mx-auto"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
