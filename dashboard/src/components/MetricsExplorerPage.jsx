import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import {
  Play, Square, RotateCcw, ChevronRight, Beaker,
  TrendingUp, BookOpen, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import {
  computeMetrics, runDriftSimulation, PRESET_SCENARIOS,
  BIAS_THRESHOLDS, ALERT_THRESHOLDS,
} from "../lib/metricsEngine";
import {
  MetricCard, DIRCard, AlertBanner, MiniRiskDial,
  GroundTruthTable, SampleGuardBlock,
} from "./MetricsResultCards";

// ── Shared slider row ────────────────────────────────────────────────────────
function SliderRow({ label, id, value, onChange, min, max, step, format }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs text-slate-500">{label}</label>
        <span className="text-xs font-mono font-semibold text-charcoal">{format(value)}</span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none bg-slate-200 rounded-full cursor-pointer accent-accent"
      />
    </div>
  );
}

// ── Group config panel ───────────────────────────────────────────────────────
function GroupPanel({ label, color, config, onChange, hasGroundTruth }) {
  const set = (k, v) => onChange({ ...config, [k]: v });
  return (
    <div className={`p-4 rounded-lg border-2 ${color} space-y-3`}>
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${color.includes("indigo") ? "bg-accent" : "bg-emerald-500"}`} />
        <input
          value={config.name}
          onChange={e => set("name", e.target.value)}
          className="text-sm font-semibold text-charcoal bg-transparent border-none outline-none flex-1"
        />
      </div>
      <SliderRow label="Decisions (n)" id={`${label}-n`} value={config.n}
        onChange={v => set("n", v)} min={10} max={2000} step={10}
        format={v => v.toLocaleString()} />
      <SliderRow label="Approval rate" id={`${label}-rate`} value={config.approvalRate}
        onChange={v => set("approvalRate", v)} min={0.01} max={0.99} step={0.01}
        format={v => `${(v * 100).toFixed(0)}%`} />
      {hasGroundTruth && (
        <SliderRow label="Qualification rate" id={`${label}-qual`} value={config.qualificationRate ?? 0.5}
          onChange={v => set("qualificationRate", v)} min={0.01} max={0.99} step={0.01}
          format={v => `${(v * 100).toFixed(0)}%`} />
      )}
    </div>
  );
}

// ── Results panel for Model Tester ──────────────────────────────────────────
function ResultsPanel({ result }) {
  if (!result) return (
    <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl text-slate-400 gap-2">
      <Beaker className="w-8 h-8 opacity-40" />
      <p className="text-sm">Configure your groups and click Run Analysis</p>
    </div>
  );

  if (result.status === "insufficient_data") return <SampleGuardBlock reason={result.reason} />;

  const { demographic_parity_difference: dpd, disparate_impact_ratio: dir,
    equalized_odds_difference: eod, contradiction, alert_severity, action_card, risk,
    groupA, groupB, sampleSize } = result;

  // Comparison bar data
  const barData = [
    { name: groupA.name, rate: parseFloat((groupA.approvalRate * 100).toFixed(1)), fill: "#4F46E5" },
    { name: groupB.name, rate: parseFloat((groupB.approvalRate * 100).toFixed(1)), fill: "#10B981" },
  ];

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="accent">n={sampleSize.toLocaleString()} decisions</Badge>
        <Badge variant="success"><CheckCircle2 className="w-3 h-3" />Sample guard passed</Badge>
        {alert_severity && (
          <Badge variant={alert_severity === "critical" ? "critical" : alert_severity === "alert" ? "danger" : "warning"}>
            {alert_severity.toUpperCase()} alert would fire
          </Badge>
        )}
      </div>

      {/* Risk dial */}
      <MiniRiskDial score={risk.score} band={risk.band} />

      {/* Alert banner */}
      <AlertBanner severity={alert_severity} actionCard={action_card} />

      {/* Contradiction */}
      {contradiction.detected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-purple-50 border border-purple-200 rounded-lg"
        >
          <p className="text-xs font-semibold text-purple-800 mb-1">⚠ Fairness Impossibility Theorem Detected</p>
          <p className="text-xs text-purple-700 leading-relaxed">{contradiction.explanation}</p>
        </motion.div>
      )}

      {/* Approval rate comparison */}
      <Card>
        <CardHeader><CardTitle>Approval Rate Comparison</CardTitle></CardHeader>
        <CardContent className="pt-0 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} />
              <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="4 3"
                label={{ value: "4/5ths", position: "right", fontSize: 9, fill: "#EF4444" }} />
              <Tooltip formatter={(v) => [`${v}%`, "Approval rate"]}
                contentStyle={{ fontSize: 12, border: "1px solid #E2E8F0", borderRadius: 8 }} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Metric cards */}
      <MetricCard title="Demographic Parity Difference"
        metric={dpd} threshold={BIAS_THRESHOLDS.demographic_parity_difference} />
      <DIRCard metric={dir} />
      <MetricCard title="Equalized Odds Difference"
        metric={eod} threshold={BIAS_THRESHOLDS.equalized_odds_difference}
        unavailable={eod?.status === "metric_unavailable"} />

      {/* Confusion matrix */}
      {eod?.ground_truth && <GroundTruthTable eodMetric={eod} groupA={groupA} groupB={groupB} />}
    </div>
  );
}

// ── Model Tester tab ─────────────────────────────────────────────────────────
function ModelTesterTab() {
  const [groupA, setGroupA] = useState({ name: "Group A (Majority)", n: 500, approvalRate: 0.65, qualificationRate: 0.60 });
  const [groupB, setGroupB] = useState({ name: "Group B (Minority)", n: 400, approvalRate: 0.52, qualificationRate: 0.60 });
  const [domain, setDomain] = useState("lending");
  const [hasGroundTruth, setHasGroundTruth] = useState(false);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setResult(computeMetrics({ groupA, groupB, hasGroundTruth, domain }));
      setRunning(false);
    }, 400);
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Config */}
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <Card>
          <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Domain</label>
              <select
                value={domain} onChange={e => setDomain(e.target.value)}
                className="w-full text-sm bg-foundation border border-border rounded-md px-3 py-2 text-charcoal outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="lending">Lending</option>
                <option value="hiring">Hiring</option>
                <option value="healthcare">Healthcare</option>
                <option value="general">General</option>
              </select>
            </div>

            <GroupPanel label="a" color="border-indigo-200"
              config={groupA} onChange={setGroupA} hasGroundTruth={hasGroundTruth} />
            <GroupPanel label="b" color="border-emerald-200"
              config={groupB} onChange={setGroupB} hasGroundTruth={hasGroundTruth} />

            {/* Ground truth toggle */}
            <label className="flex items-center justify-between cursor-pointer py-2 border-t border-border">
              <div>
                <p className="text-sm font-medium text-charcoal">Ground truth available</p>
                <p className="text-xs text-slate-400">Enables Equalized Odds computation</p>
              </div>
              <button
                id="gt-toggle"
                onClick={() => setHasGroundTruth(v => !v)}
                className={`relative w-9 h-5 rounded-full border transition-colors duration-[120ms] ${hasGroundTruth ? "bg-accent border-accent" : "bg-slate-200 border-slate-300"}`}
              >
                <motion.span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                  animate={{ left: hasGroundTruth ? "calc(100% - 18px)" : "2px" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              </button>
            </label>

            <Button id="run-analysis" variant="primary" className="w-full" onClick={run}>
              {running ? (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                  ⟳
                </motion.span>
              ) : <Beaker className="w-4 h-4" />}
              {running ? "Computing…" : "Run Analysis"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="col-span-12 lg:col-span-8">
        <AnimatePresence mode="wait">
          <motion.div key={JSON.stringify(result?.sampleSize)}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}>
            <ResultsPanel result={result} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Drift Simulator tab ──────────────────────────────────────────────────────
const ALERT_COLORS = { critical: "#DC2626", alert: "#EA580C", warning: "#CA8A04", null: "#4F46E5" };

function DriftSimulatorTab() {
  const [steps] = useState(20);
  const [biasMag, setBiasMag] = useState(0.30);
  const [groupASize, setGroupASize] = useState(500);
  const [groupBSize, setGroupBSize] = useState(400);
  const [history, setHistory] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const allSteps = useRef([]);

  const startSim = useCallback(() => {
    allSteps.current = runDriftSimulation({
      groupABase: { name: "Group A", n: groupASize, approvalRate: 0.65, qualificationRate: 0.60 },
      groupBBase: { name: "Group B", n: groupBSize, approvalRate: 0.65 },
      steps, biasMagnitude: biasMag, domain: "lending",
    });
    setHistory([]); setCurrentIdx(-1); setRunning(true);
    let i = 0;
    intervalRef.current = setInterval(() => {
      if (i >= allSteps.current.length) { clearInterval(intervalRef.current); setRunning(false); return; }
      setHistory(prev => [...prev, allSteps.current[i]]);
      setCurrentIdx(i); i++;
    }, 350);
  }, [steps, biasMag, groupASize, groupBSize]);

  const stop = () => { clearInterval(intervalRef.current); setRunning(false); };
  const reset = () => { stop(); setHistory([]); setCurrentIdx(-1); };

  const current = history[currentIdx] ?? null;
  const alertFired = history.find(h => h.alertSeverity != null);
  const alertStep  = alertFired ? allSteps.current.findIndex(s => s.alertSeverity != null) + 1 : null;

  const chartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border border-border rounded-lg p-2.5 text-xs shadow-sm">
        <p className="font-medium text-charcoal mb-1">{d.label}</p>
        <p className="text-slate-500">DPD: <span className="font-mono font-bold text-charcoal">{(d.dpd * 100).toFixed(1)}%</span></p>
        <p className="text-slate-500">DIR: <span className="font-mono">{(d.dir * 100).toFixed(1)}%</span></p>
        {d.alertSeverity && <p className="text-red-500 font-semibold mt-1">⚡ {d.alertSeverity.toUpperCase()}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Drift Simulation — Boiling Frog Demo</CardTitle>
            <div className="flex gap-2">
              <Button id="sim-start" variant="primary" size="sm" onClick={startSim} disabled={running}>
                <Play className="w-3.5 h-3.5" />Start
              </Button>
              <Button id="sim-stop" variant="secondary" size="sm" onClick={stop} disabled={!running}>
                <Square className="w-3.5 h-3.5" />Stop
              </Button>
              <Button id="sim-reset" variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="w-3.5 h-3.5" />Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4">
            <SliderRow label="Bias magnitude (end state)" id="bias-mag"
              value={biasMag} onChange={setBiasMag} min={0.05} max={0.50} step={0.01}
              format={v => `${(v * 100).toFixed(0)}%`} />
            <SliderRow label="Group A decisions" id="sim-na"
              value={groupASize} onChange={setGroupASize} min={100} max={2000} step={50}
              format={v => v.toLocaleString()} />
            <SliderRow label="Group B decisions" id="sim-nb"
              value={groupBSize} onChange={setGroupBSize} min={100} max={2000} step={50}
              format={v => v.toLocaleString()} />
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      {current && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-4"
        >
          {[
            { label: "Day", value: current.label },
            { label: "DPD",      value: `${(current.dpd * 100).toFixed(1)}%`, danger: current.dpd > ALERT_THRESHOLDS.alert },
            { label: "DIR",      value: `${(current.dir * 100).toFixed(1)}%`, danger: current.dir < 0.80 },
            { label: "Risk",     value: `${current.riskScore}`, danger: current.riskScore > 50 },
          ].map(({ label, value, danger }) => (
            <div key={label} className="bg-white border border-border rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400">{label}</p>
              <motion.p key={value} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`text-xl font-semibold font-mono ${danger ? "text-red-600" : "text-charcoal"}`}>
                {value}
              </motion.p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Alert milestone */}
      {alertFired && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-800">
            <span className="font-bold">Alert fired at Day {alertStep}</span> — a spike detector checking daily would have caught this on day {steps}. ClearLens caught it at day {alertStep}.
          </p>
        </motion.div>
      )}

      {/* DPD chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>DPD — Demographic Parity Difference over Time</CardTitle>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent inline-block" />DPD</span>
              <span className="flex items-center gap-1"><span className="w-px h-3 bg-red-400 inline-block" />Bias threshold</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                  interval={Math.floor(history.length / 5)} />
                <YAxis domain={[0, 0.35]} tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip content={chartTooltip} />
                <ReferenceLine y={ALERT_THRESHOLDS.warning} stroke="#CA8A04" strokeDasharray="3 3"
                  label={{ value: "Warning 7%", position: "right", fontSize: 9, fill: "#CA8A04" }} />
                <ReferenceLine y={ALERT_THRESHOLDS.alert} stroke="#EF4444" strokeDasharray="4 3"
                  label={{ value: "Alert 10%", position: "right", fontSize: 9, fill: "#EF4444" }} />
                <ReferenceLine y={ALERT_THRESHOLDS.critical} stroke="#7F1D1D" strokeDasharray="4 3"
                  label={{ value: "Critical 20%", position: "right", fontSize: 9, fill: "#7F1D1D" }} />
                <Line type="monotone" dataKey="dpd" stroke="#4F46E5" strokeWidth={2.5} dot={false}
                  strokeLinecap="round" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {history.length === 0 && (
            <p className="text-center text-slate-400 text-sm mt-4">Press Start to run the simulation</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Scenario Library tab ─────────────────────────────────────────────────────
function ScenarioLibraryTab({ onLoadScenario }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 mb-2">
        Click any scenario to load it into the Model Tester — results computed instantly.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRESET_SCENARIOS.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-charcoal">{s.label}</p>
                  <Badge variant="accent">{s.domain}</Badge>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>
                <div className="p-2 bg-foundation border border-border rounded-md">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Expected outcome</p>
                  <p className="text-xs text-charcoal">{s.expectedOutcome}</p>
                </div>
                <Button
                  id={`load-scenario-${s.id}`}
                  variant="secondary"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => onLoadScenario(s)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  Load & Run
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "tester",   label: "Model Tester",       icon: Beaker     },
  { id: "drift",    label: "Drift Simulator",     icon: TrendingUp },
  { id: "library",  label: "Scenario Library",    icon: BookOpen   },
];

export function MetricsExplorerPage() {
  const [tab, setTab] = useState("tester");
  const [loadedScenario, setLoadedScenario] = useState(null);

  const handleLoadScenario = (scenario) => {
    setLoadedScenario(scenario);
    setTab("tester");
  };

  return (
    <>
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-charcoal tracking-tight">Metrics Explorer</h1>
        <p className="text-sm text-slate-400 mt-1">
          Live fairness computation engine — same formulas as the Python backend. Test any model configuration, run drift simulations, or load preset scenarios.
        </p>
      </div>
      <div className="h-px bg-border mb-6 mt-4" />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => setTab(id)}
            className={[
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors duration-[120ms] border-b-2 -mb-px",
              tab === id
                ? "border-accent text-accent"
                : "border-transparent text-slate-500 hover:text-charcoal",
            ].join(" ")}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "tester"  && <ModelTesterTab loadedScenario={loadedScenario} />}
          {tab === "drift"   && <DriftSimulatorTab />}
          {tab === "library" && <ScenarioLibraryTab onLoadScenario={handleLoadScenario} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
