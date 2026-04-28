import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { AlertCircle } from "lucide-react";

export const ConfidenceBadge = ({
  value,
  confidenceInterval,
  sampleSize,
  labelStatus,
}) => {
  const pct = (val) => `${(val * 100).toFixed(1)}%`;
  const ci =
    Array.isArray(confidenceInterval) && confidenceInterval.length === 2
      ? confidenceInterval
      : [value, value];
  const isApprox = labelStatus === "proxy_approximate";
  const margin = Math.abs(ci[1] - value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Signal</CardTitle>
            <Badge variant={isApprox ? "warning" : "success"}>
              {isApprox ? "Approximate" : "Verified"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Main metric display */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-charcoal">{pct(value)}</span>
            <span className="text-sm text-slate-400">± {pct(margin)}</span>
            <span className="text-xs text-slate-400 ml-1">n={sampleSize}</span>
          </div>

          {/* Confidence bar */}
          <div className="h-1.5 bg-foundation rounded-full overflow-hidden border border-border mb-3">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${value * 100 * 5}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ maxWidth: "100%" }}
            />
          </div>

          {isApprox && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                No ground truth labels yet. Value is proxy-approximated.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
