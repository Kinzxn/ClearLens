import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, ComposedChart, Line, Scatter,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { Zap, AlertTriangle, CheckCircle2, ShieldAlert, Info, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

// ── Generate EWMA control chart data with injected spikes ──────────────────
function buildEwmaData() {
  const data = [];
  let ewma = 0.07;
  const alpha = 0.15;
  const mean = 0.075;
  const std = 0.012;
  const spikePts = new Set([12, 28, 41]);

  for (let i = 0; i < 48; i++) {
    const isSpike = spikePts.has(i);
    const raw = isSpike
      ? mean + std * (3.5 + Math.random())   // spike: >3σ
      : mean + std * (Math.random() * 2 - 1); // normal noise
    ewma = alpha * raw + (1 - alpha) * ewma;
    const zScore = (raw - mean) / std;

    data.push({
      t: `h${i}`,
      value: parseFloat(raw.toFixed(4)),
      ewma: parseFloat(ewma.toFixed(4)),
      upper: parseFloat((mean + 3 * std).toFixed(4)),
      lower: parseFloat((mean - 3 * std).toFixed(4)),
      z: parseFloat(zScore.toFixed(2)),
      spike: isSpike ? raw : null,
      label: i % 8 === 0 ? `h${i}` : "",
    });
  }
  return data;
}

const CHART_DATA = buildEwmaData();

const SPIKES = [
  {
    id: "s1", hour: "h12", metric: "demographic_parity_difference",
    z_score: 3.8, value: 0.113,
    mean: 0.075, std: 0.012,
    plain_english: "Sudden spike: DPD jumped 3.8 standard deviations above the 48-hour rolling mean in a single hour — likely an upstream data quality event.",
    root_cause_hint: "Correlates with a batch job that completed at h11 — check data pipeline for sampling bias.",
    resolved: true,
  },
  {
    id: "s2", hour: "h28", metric: "disparate_impact_ratio",
    z_score: -3.5, value: 0.048,
    mean: 0.075, std: 0.012,
    plain_english: "Anomalous DROP in DIR — approval rate for minority group fell sharply. This is a negative spike, equally concerning.",
    root_cause_hint: "No upstream event detected. Model version v1.4.2 deployed at h27 — possible threshold regression.",
    resolved: false,
  },
  {
    id: "s3", hour: "h41", metric: "demographic_parity_difference",
    z_score: 4.1, value: 0.124,
    plain_english: "Largest spike in the monitoring window. DPD at 4.1σ above mean. Alert fired immediately.",
    root_cause_hint: "Correlates with feature distribution shift in `credit_history_length` (KS score: 0.31).",
    resolved: false,
  },
];

// Z-score bar chart colours
function zColor(z) {
  const a = Math.abs(z);
  if (a > 4) return "#7f1d1d";
  if (a > 3) return "#EF4444";
  if (a > 2) return "#F97316";
  return "#94A3B8";
}

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (!payload.spike) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#EF4444" fillOpacity={0.2} stroke="#EF4444" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={3} fill="#EF4444" />
    </g>
  );
};

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-border rounded-lg p-3 text-xs shadow-sm min-w-[160px]">
      <p className="font-medium text-charcoal mb-2">{d.t}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4"><span className="text-slate-400">Value</span><span className="font-mono font-medium">{(d.value * 100).toFixed(2)}%</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-400">EWMA</span><span className="font-mono">{(d.ewma * 100).toFixed(2)}%</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-400">Z-score</span>
          <span className={`font-mono font-bold ${Math.abs(d.z) > 3 ? "text-red-500" : "text-slate-600"}`}>{d.z}σ</span>
        </div>
        {d.spike && <div className="mt-1 pt-1 border-t border-border text-red-500 font-medium">⚡ Spike detected</div>}
      </div>
    </div>
  );
};

function SpikeCard({ spike, index }) {
  const [expanded, setExpanded] = useState(false);
  const [resolved, setResolved] = useState(spike.resolved);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.07 }}
      className={`border rounded-lg overflow-hidden bg-white ${resolved ? "border-border opacity-60" : "border-red-200"}`}
    >
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-foundation transition-colors duration-[120ms]"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono ${
          Math.abs(spike.z_score) > 4 ? "bg-red-100 text-red-700 border border-red-200" :
          Math.abs(spike.z_score) > 3 ? "bg-red-50 text-red-600 border border-red-100" :
          "bg-amber-50 text-amber-600 border border-amber-100"
        }`}>
          {spike.z_score > 0 ? "+" : ""}{spike.z_score}σ
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={Math.abs(spike.z_score) > 3 ? "danger" : "warning"}>
              {Math.abs(spike.z_score) > 3 ? "Spike" : "Elevated"}
            </Badge>
            <span className="text-xs font-mono text-slate-500">{spike.metric}</span>
            <span className="text-xs font-semibold text-charcoal">{(spike.value * 100).toFixed(1)}%</span>
            <span className="text-xs text-slate-400">@ {spike.hour}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{spike.plain_english}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {resolved
            ? <Badge variant="success"><CheckCircle2 className="w-3 h-3" />Resolved</Badge>
            : <Badge variant="danger">Active</Badge>
          }
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.15 }}>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-3 bg-foundation space-y-3">
              {/* Z-score visual */}
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-2">Z-Score magnitude</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full border border-border overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: zColor(spike.z_score) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(Math.abs(spike.z_score) / 5 * 100, 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-sm font-bold font-mono text-red-500 flex-shrink-0">{spike.z_score}σ</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0σ normal</span><span>2σ elevated</span><span>3σ spike</span><span>5σ extreme</span>
                </div>
              </div>

              {/* Plain English */}
              <p className="text-sm text-charcoal leading-relaxed">{spike.plain_english}</p>

              {/* Root cause hint */}
              <div className="flex items-start gap-2 p-2.5 bg-white border border-border rounded-md">
                <Info className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Root Cause Hint</p>
                  <p className="text-xs text-slate-700">{spike.root_cause_hint}</p>
                </div>
              </div>

              {/* CTA */}
              {!resolved && (
                <div className="flex gap-2 pt-1">
                  <Button
                    id={`resolve-${spike.id}`}
                    size="sm"
                    variant="primary"
                    onClick={() => setResolved(true)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Resolved
                  </Button>
                  <Button id={`investigate-${spike.id}`} size="sm" variant="secondary">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Investigate
                  </Button>
                </div>
              )}
              {resolved && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />Spike resolved — logged to audit trail.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AnomalyFeedPage() {
  const activeSpikes = SPIKES.filter(s => !s.resolved).length;

  return (
    <>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold text-charcoal tracking-tight flex items-center gap-2">
            Anomaly Feed
            {activeSpikes > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">{activeSpikes}</span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Z-score spike detection using a 48-hour EWMA rolling baseline. Fires when value exceeds ±3σ from the mean.
          </p>
        </div>
        <Badge variant="accent" className="flex-shrink-0 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          EWMA · Z-score
        </Badge>
      </div>

      {/* Algorithm callout — addresses Flaw 4 */}
      <div className="flex items-start gap-2 p-3 bg-accent-light border border-indigo-200 rounded-lg mb-6 mt-3">
        <Info className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-xs text-accent leading-relaxed">
          <strong>Algorithm:</strong> EWMA (α=0.15) with 3σ control limits — not Isolation Forest.
          Chosen because it's lightweight, stable on small streaming windows, and doesn't require model training.
          Isolation Forest is reserved for batch re-evaluation only.
        </p>
      </div>
      <div className="h-px bg-border mb-6" />

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Spikes (48h)",      value: "3",     sub: "2 active" },
          { label: "Max Z-score",        value: "4.1σ",  sub: "h41 — critical" },
          { label: "EWMA baseline",      value: "7.5%",  sub: "DPD rolling avg" },
          { label: "Control limit (3σ)", value: "11.1%", sub: "Upper bound" },
        ].map(({ label, value, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-border rounded-lg px-4 py-3"
          >
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-xl font-semibold text-charcoal mt-0.5">{value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* EWMA control chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>EWMA Control Chart — 48h Window</CardTitle>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent inline-block" />EWMA</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-300 inline-block border-dashed" />3σ bounds</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Spike</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={CHART_DATA} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false} tickLine={false}
                    domain={[0.03, 0.16]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {/* Upper 3σ control limit */}
                  <ReferenceLine y={0.111} stroke="#E2E8F0" strokeDasharray="4 3" label={{ value: "+3σ", position: "right", fontSize: 9, fill: "#94A3B8" }} />
                  {/* Lower 3σ control limit */}
                  <ReferenceLine y={0.039} stroke="#E2E8F0" strokeDasharray="4 3" label={{ value: "−3σ", position: "right", fontSize: 9, fill: "#94A3B8" }} />
                  {/* Mean line */}
                  <ReferenceLine y={0.075} stroke="#CBD5E1" strokeDasharray="2 4" />
                  {/* Raw value */}
                  <Line dataKey="value" stroke="#CBD5E1" strokeWidth={1} dot={false} name="Raw value" />
                  {/* EWMA */}
                  <Line dataKey="ewma" stroke="#4F46E5" strokeWidth={2} dot={false} name="EWMA" />
                  {/* Spike dots */}
                  <Scatter dataKey="spike" fill="#EF4444" shape={<CustomDot />} name="Spike" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Spike feed */}
      <h2 className="text-sm font-semibold text-charcoal mb-3">Detected Spikes</h2>
      <div className="space-y-2">
        {SPIKES.map((spike, i) => (
          <SpikeCard key={spike.id} spike={spike} index={i} />
        ))}
      </div>
    </>
  );
}
