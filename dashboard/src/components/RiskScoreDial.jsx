import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";

const BAND_CONFIG = {
  CRITICAL: { color: "#EF4444", badge: "danger",  track: "#FEE2E2" },
  HIGH:     { color: "#F97316", badge: "warning",  track: "#FEF3C7" },
  MODERATE: { color: "#F59E0B", badge: "warning",  track: "#FEF3C7" },
  LOW:      { color: "#10B981", badge: "success",  track: "#D1FAE5" },
};

/**
 * Arc/gauge dial rendered with a single SVG arc path.
 * Animates the stroke-dashoffset on mount via Framer Motion.
 */
export const RiskScoreDial = ({ score, band, advice }) => {
  const normalized = Math.max(0, Math.min(100, Number(score ?? 0)));
  const cfg = BAND_CONFIG[band] ?? BAND_CONFIG.LOW;

  // Arc maths: r=52, circumference for a 240° arc
  const R = 52;
  const TOTAL_ARC = 240; // degrees
  const C = 2 * Math.PI * R;
  const arcLen = (TOTAL_ARC / 360) * C;
  const filled = (normalized / 100) * arcLen;
  const GAP = C - arcLen;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Executive Risk Score</CardTitle>
            <Badge variant={cfg.badge}>{band}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-0 gap-4">
          {/* Gauge SVG */}
          <div className="relative w-36 h-28">
            <svg viewBox="0 0 120 90" className="w-full h-full" overflow="visible">
              {/* Track arc */}
              <circle
                cx="60" cy="68" r={R}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="8"
                strokeDasharray={`${arcLen} ${GAP}`}
                strokeDashoffset={arcLen * 0.25}
                strokeLinecap="round"
                transform="rotate(-120 60 68)"
              />
              {/* Value arc — animated */}
              <motion.circle
                cx="60" cy="68" r={R}
                fill="none"
                stroke={cfg.color}
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: arcLen * 0.25 }}
                animate={{
                  strokeDasharray: `${filled} ${C - filled}`,
                  strokeDashoffset: arcLen * 0.25,
                }}
                transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                transform="rotate(-120 60 68)"
              />
            </svg>

            {/* Centre label */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
              <motion.span
                className="text-3xl font-bold leading-none"
                style={{ color: cfg.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {normalized}
              </motion.span>
              <span className="text-[11px] text-slate-400 font-medium">/ 100</span>
            </div>
          </div>

          {/* Advice */}
          <p className="text-xs text-slate-500 text-center leading-relaxed max-w-[180px]">
            {advice}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
