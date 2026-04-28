import React from "react";
import { motion } from "framer-motion";
import { Database, BrainCircuit } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";

const classificationMap = {
  likely_model_issue:  { label: "Model Issue",   variant: "danger"  },
  likely_data_drift:   { label: "Data Drift",    variant: "warning" },
  mixed_signal:        { label: "Mixed Signal",  variant: "accent"  },
};

const BarRow = ({ label, value, threshold, isHigh }) => {
  const pct = Math.min((value / (threshold * 2)) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-medium font-mono ${isHigh ? "text-red-600" : "text-emerald-600"}`}>
          {value} {isHigh ? "↑ HIGH" : "NORMAL"}
        </span>
      </div>
      <div className="h-1.5 bg-foundation rounded-full border border-border overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isHigh ? "bg-red-400" : "bg-emerald-400"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
};

export const DriftTypeSeparator = ({
  dataDriftPsi,
  biasDriftSlope,
  classification,
  plainEnglish,
}) => {
  const cls = classificationMap[classification] ?? { label: classification, variant: "default" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Drift State Isolation</CardTitle>
            <Badge variant={cls.variant}>{cls.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide font-medium">
                <Database className="w-3 h-3" />
                Data Drift
              </div>
              <BarRow
                label="PSI Score"
                value={dataDriftPsi}
                threshold={0.2}
                isHigh={dataDriftPsi > 0.2}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wide font-medium">
                <BrainCircuit className="w-3 h-3" />
                Bias Drift
              </div>
              <BarRow
                label="Slope / day"
                value={biasDriftSlope}
                threshold={0.02}
                isHigh={Math.abs(biasDriftSlope) > 0.02}
              />
            </div>
          </div>

          {/* Prediction */}
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
              Root Cause Classification
            </p>
            <p className="text-sm text-charcoal">{plainEnglish}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
