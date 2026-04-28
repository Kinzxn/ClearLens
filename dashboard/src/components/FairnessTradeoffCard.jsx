import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export const FairnessTradeoffCard = ({
  metrics,
  explanation,
  recommendation,
  tradeoffSimulation,
  onChoose,
}) => {
  const [chosen, setChosen] = useState(null);

  const handleChoose = (m) => {
    setChosen(m);
    onChoose?.(m);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-md bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TriangleAlert className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-800">Fairness Impossibility Theorem</CardTitle>
              <p className="text-xs text-red-500 mt-0.5">Tradeoff detected — requires stakeholder decision</p>
            </div>
            <Badge variant="danger" className="ml-auto">Persistent</Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Explanation */}
          <div className="p-3 bg-red-50 border border-red-100 rounded-md">
            <p className="text-sm text-red-800 leading-relaxed">{explanation}</p>
          </div>

          {/* Simulation */}
          <div className="p-3 bg-foundation border border-border rounded-md">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Simulation</p>
            <p className="text-sm text-charcoal">{tradeoffSimulation}</p>
          </div>

          {/* Recommendation */}
          <p className="text-xs text-slate-500 italic">{recommendation}</p>

          {/* Metric choice buttons */}
          <AnimatePresence mode="wait">
            {!chosen ? (
              <motion.div
                key="choices"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-2 pt-1"
              >
                {metrics.map((m) => (
                  <Button
                    key={m}
                    id={`optimize-${m.toLowerCase().replace(/\s+/g, "-")}`}
                    variant="danger"
                    size="sm"
                    onClick={() => handleChoose(m)}
                  >
                    Optimize {m}
                  </Button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-md"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <p className="text-xs text-emerald-700">
                  Choice logged to audit trail:{" "}
                  <span className="font-semibold">Optimize {chosen}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
