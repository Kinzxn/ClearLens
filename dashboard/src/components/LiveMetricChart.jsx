import React from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";

// Mock websocket stream for local UI preview
const mockData = [
  { ts: "10:00", current_value: 0.06, ewma_trend: 0.05, ci_upper: 0.08, ci_lower: 0.03 },
  { ts: "11:00", current_value: 0.07, ewma_trend: 0.055, ci_upper: 0.09, ci_lower: 0.04 },
  { ts: "12:00", current_value: 0.08, ewma_trend: 0.061, ci_upper: 0.10, ci_lower: 0.05 },
  { ts: "13:00", current_value: 0.09, ewma_trend: 0.068, ci_upper: 0.11, ci_lower: 0.06 },
  { ts: "14:00", current_value: 0.11, ewma_trend: 0.075, ci_upper: 0.13, ci_lower: 0.07 },
  { ts: "15:00", current_value: 0.12, ewma_trend: 0.084, ci_upper: 0.14, ci_lower: 0.08 },
  { ts: "16:00", current_value: 0.10, ewma_trend: 0.088, ci_upper: 0.12, ci_lower: 0.07 },
];

const useWebSocket = () => ({ data: mockData, isConnected: true });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg p-3 text-xs shadow-sm">
      <p className="font-medium text-charcoal mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-charcoal">{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export const LiveMetricChart = ({ orgId, metricName }) => {
  const { data, isConnected } = useWebSocket(`/ws/metrics/${orgId}/${metricName}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Metric Trend</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{metricName}</p>
            </div>
            <Badge variant={isConnected ? "success" : "danger"}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
              {isConnected ? "Live" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="ts"
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 0.16]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={0.10}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{ value: "Threshold 10%", position: "right", fontSize: 10, fill: "#EF4444" }}
                />
                <Line dataKey="current_value" stroke="#4F46E5" strokeWidth={2} dot={false} name="Current" />
                <Line dataKey="ewma_trend" stroke="#F97316" strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="7-Day EWMA" />
                <Line dataKey="ci_upper" stroke="#CBD5E1" strokeWidth={1} strokeDasharray="2 3" dot={false} name="95% CI Upper" />
                <Line dataKey="ci_lower" stroke="#CBD5E1" strokeWidth={1} strokeDasharray="2 3" dot={false} name="95% CI Lower" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
            {[
              { color: "#4F46E5", label: "Current value", solid: true },
              { color: "#F97316", label: "7-Day EWMA trend", solid: false },
              { color: "#CBD5E1", label: "95% Confidence interval", solid: false },
              { color: "#EF4444", label: "Bias threshold (10%)", solid: false },
            ].map(({ color, label, solid }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-5"
                  style={{
                    background: solid ? color : "transparent",
                    borderTop: solid ? "none" : `1.5px dashed ${color}`,
                  }}
                />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
