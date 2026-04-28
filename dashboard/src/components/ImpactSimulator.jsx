import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";

export const ImpactSimulator = ({
  currentValue,
  simulatedValue7d,
  projectedBreach,
  driftDirection,
}) => {
  const isWorsening = driftDirection === "worsening";
  const Icon = isWorsening ? TrendingUp : driftDirection === "improving" ? TrendingDown : Minus;
  const pct = (v) => `${(v * 100).toFixed(1)}%`;

  // How far along is current vs simulated (for the bar)
  const maxVal = Math.max(simulatedValue7d, 0.2);
  const currentPct = (currentValue / maxVal) * 100;
  const simulatedPct = (simulatedValue7d / maxVal) * 100;
  const thresholdPct = (0.1 / maxVal) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Impact Simulator</CardTitle>
            <Badge variant={isWorsening ? "danger" : "success"}>
              <Icon className="w-3 h-3" />
              {driftDirection}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Projection bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Now ({pct(currentValue)})</span>
              <span>7-day projection ({pct(simulatedValue7d)})</span>
            </div>
            <div className="relative h-2 bg-foundation rounded-full border border-border overflow-visible">
              {/* current */}
              <motion.div
                className="absolute top-0 left-0 h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${currentPct}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* simulated overlay */}
              <motion.div
                className="absolute top-0 left-0 h-full rounded-full bg-red-400 opacity-30"
                initial={{ width: 0 }}
                animate={{ width: `${simulatedPct}%` }}
                transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* threshold marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-red-400 rounded-full"
                style={{ left: `${thresholdPct}%` }}
              />
            </div>
            <div className="flex justify-end mt-1">
              <span className="text-[11px] text-red-400">— bias threshold (10%)</span>
            </div>
          </div>

          {/* Projected breach */}
          {projectedBreach && (
            <div className="flex items-center gap-2 p-2.5 bg-foundation border border-border rounded-md">
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-600">
                At current rate, bias threshold breached in{" "}
                <span className={`font-semibold ${isWorsening ? "text-red-600" : "text-charcoal"}`}>
                  {projectedBreach}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
