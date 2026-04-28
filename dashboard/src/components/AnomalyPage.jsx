import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { TrendingUp, TrendingDown, ArrowRight, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";

// Mock 7-day hourly trend data (simulates DriftDetector output)
function generateDriftData() {
  const data = [];
  let val = 0.04;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h += 4) {
      val = Math.min(0.22, val + (Math.random() * 0.008) + 0.003);
      data.push({
        label: d === 0 ? `Day 1 ${h}:00` : d === 6 ? `Day 7 ${h}:00` : "",
        day: `D${d+1}`,
        hour: h,
        value: parseFloat(val.toFixed(4)),
        ewma: parseFloat((val * 0.9).toFixed(4)),
      });
    }
  }
  return data;
}

const DRIFT_DATA = generateDriftData();

// Radar chart data showing all 3 fairness metric health scores
const RADAR_DATA = [
  { metric: "Dem. Parity",    score: 31 },
  { metric: "Disp. Impact",   score: 48 },
  { metric: "Equal. Odds",    score: 62 },
  { metric: "Drift Rate",     score: 25 },
  { metric: "Anomaly Score",  score: 70 },
];

const CustomAreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg p-3 text-xs shadow-sm">
      <p className="font-medium text-charcoal mb-1">{payload[0]?.payload?.day} h{payload[0]?.payload?.hour}:00</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-mono font-medium text-charcoal">{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

// Animated live counter that ticks up
function LiveCounter({ target, suffix = "", prefix = "" }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const step = target / 40;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setValue(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{value.toLocaleString()}{suffix}</span>;
}

export function AnomalyPage() {
  const latestVal = DRIFT_DATA[DRIFT_DATA.length - 1].value;
  const slope = 0.025; // %/day — matches mock DriftDetector output
  const daysToBreech = Math.ceil((0.10 - 0.08) / slope);

  return (
    <>
      <h1 className="text-xl font-semibold text-charcoal tracking-tight mb-1">
        Drift Analysis
      </h1>
      <p className="text-sm text-slate-400 mb-6">
        7-day rolling bias trend using OLS linear regression. Alert fires when slope &gt; 2%/day.
      </p>
      <div className="h-px bg-border mb-8" />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Current DPD",       value: (latestVal * 100).toFixed(1),  suffix: "%",  up: true  },
          { label: "Daily drift rate",  value: "+2.5",                         suffix: "%/d", up: true  },
          { label: "Threshold breach",  value: `~${daysToBreech}`,             suffix: " days", up: true },
          { label: "Anomalies (7d)",    value: "3",                            suffix: "",   up: null  },
        ].map(({ label, value, suffix, up }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-border rounded-lg px-4 py-3"
          >
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold text-charcoal">{value}{suffix}</span>
              {up === true  && <TrendingUp   className="w-3.5 h-3.5 text-red-500 ml-1" />}
              {up === false && <TrendingDown className="w-3.5 h-3.5 text-emerald-500 ml-1" />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main area chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>7-Day Drift Trajectory</CardTitle>
              <Badge variant="danger">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Worsening
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DRIFT_DATA} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dpdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="ewmaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#F97316" stopOpacity={0.10} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false} tickLine={false}
                    interval={5}
                  />
                  <YAxis
                    domain={[0, 0.25]}
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <ReferenceLine
                    y={0.10}
                    stroke="#EF4444"
                    strokeDasharray="5 4"
                    label={{ value: "Bias threshold 10%", position: "right", fontSize: 9, fill: "#EF4444" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    fill="url(#dpdGrad)"
                    name="DPD"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="ewma"
                    stroke="#F97316"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    fill="url(#ewmaGrad)"
                    name="EWMA trend"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Drift interpretation box */}
            <div className="mt-4 p-3 bg-foundation border border-border rounded-md flex items-start gap-2.5">
              <Activity className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Bias is slowly <strong>worsening</strong> at <strong>2.5% per day</strong>.
                At this rate, the system will breach the critical threshold in approximately{" "}
                <strong className="text-red-600">~{daysToBreech} days</strong>.
                In 7 days, DPD will be approximately <strong>13.0%</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fairness health radar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Fairness Health Radar</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-center">
            <div className="h-56 w-full max-w-sm">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Health Score"
                    dataKey="score"
                    stroke="#4F46E5"
                    fill="#4F46E5"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 ml-6">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Score guide</p>
              {[
                { range: "0–40", label: "Critical",  color: "bg-red-400"    },
                { range: "41–60", label: "Elevated", color: "bg-amber-400"  },
                { range: "61–80", label: "Moderate", color: "bg-yellow-400" },
                { range: "81–100",label: "Healthy",  color: "bg-emerald-400"},
              ].map(({ range, label, color }) => (
                <div key={range} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
                  <span className="font-mono text-[11px]">{range}</span>
                  <span className="text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
