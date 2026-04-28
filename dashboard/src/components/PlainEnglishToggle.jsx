import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";

/**
 * Pill-shaped mode toggle: [ Plain English | Technical ]
 * Remembers preference in localStorage per org.
 */
export const PlainEnglishToggle = ({
  technicalLabel,
  plainLabel,
  defaultMode = "plain",
}) => {
  const [mode, setMode] = useState(defaultMode);

  const toggle = (next) => {
    setMode(next);
    try { localStorage.setItem("clearlens.explainMode", next); } catch (_) {}
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metric Explanation</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Pill toggle */}
        <div className="inline-flex p-0.5 bg-foundation border border-border rounded-full mb-4">
          {["plain", "technical"].map((m) => (
            <button
              key={m}
              id={`toggle-${m}`}
              onClick={() => toggle(m)}
              className="relative px-3.5 py-1 text-xs font-medium rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {mode === m && (
                <motion.span
                  layoutId="toggle-pill"
                  className="absolute inset-0 bg-white border border-border rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={[
                  "relative z-10 transition-colors duration-[120ms]",
                  mode === m ? "text-charcoal" : "text-slate-400",
                ].join(" ")}
              >
                {m === "plain" ? "Plain English" : "Technical"}
              </span>
            </button>
          ))}
        </div>

        {/* Content swap with crossfade */}
        <div className="relative min-h-[40px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-sm text-slate-700 leading-relaxed"
            >
              {mode === "plain" ? plainLabel : technicalLabel}
            </motion.p>
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};
