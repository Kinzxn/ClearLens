import React from "react";
import { motion } from "framer-motion";
import { GitBranch, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

export const RootCausePanel = ({ feature, ksScore, correlation, plainEnglish }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              <CardTitle>Automatic Root Cause</CardTitle>
            </div>
            {feature && <Badge variant="accent">Diagnosed</Badge>}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {feature ? (
            <div className="space-y-3">
              {/* Feature chip */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">Major contributor:</span>
                <Badge variant="mono">{feature}</Badge>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "KS Shift Score", value: ksScore },
                  { label: "Correlation", value: correlation },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col p-3 bg-foundation border border-border rounded-md"
                  >
                    <span className="text-[11px] text-slate-400 mb-0.5">{label}</span>
                    <span className="text-lg font-semibold text-charcoal font-mono">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Plain English */}
              <p className="text-sm text-slate-600 leading-relaxed">{plainEnglish}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="w-5 h-5 border-2 border-border border-t-accent rounded-full"
              />
              <p className="text-xs text-slate-400">
                Gathering sufficient data for KS distribution shift analysis…
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
