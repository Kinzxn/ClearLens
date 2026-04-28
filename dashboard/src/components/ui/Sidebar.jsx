import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Settings,
  TrendingDown,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { id: "overview",   label: "Overview",       icon: Activity,     active: true  },
  { id: "anomalies",  label: "Anomaly Feed",   icon: Zap,          active: false },
  { id: "drift",      label: "Drift Analysis", icon: TrendingDown, active: false },
  { id: "metrics",    label: "Metrics",        icon: BarChart3,    active: false },
  { id: "alerts",     label: "Alert Inbox",    icon: AlertTriangle,active: false },
  { id: "audit",      label: "Audit Log",      icon: ClipboardList,active: false },
  { id: "settings",   label: "Settings",       icon: Settings,     active: false },
];

const SIDEBAR_W_OPEN   = 220;
const SIDEBAR_W_CLOSED = 56;

export function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_W_CLOSED : SIDEBAR_W_OPEN }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex-shrink-0 flex flex-col bg-white border-r border-border h-screen sticky top-0 overflow-hidden"
      style={{ minWidth: collapsed ? SIDEBAR_W_CLOSED : SIDEBAR_W_OPEN }}
    >
      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="flex items-center h-14 px-3 border-b border-border gap-2.5 overflow-hidden">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="brand"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-semibold text-charcoal whitespace-nowrap tracking-tight"
            >
              ClearLens
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 px-1.5 overflow-hidden">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = (activePage ?? "overview") === id;
          return (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => onNavigate?.(id)}
              title={collapsed ? label : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 h-9 rounded-md px-2.5 w-full text-left",
                "transition-[color,background-color] duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "bg-accent-light text-accent font-medium"
                  : "text-slate-500 hover:bg-foundation hover:text-charcoal"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    key={`label-${id}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    className="text-sm whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* active indicator line */}
              {isActive && (
                <motion.span
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Org Badge ─────────────────────────────────────── */}
      <div className="border-t border-border py-3 px-2 overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600">
            DO
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="org-info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col"
              >
                <span className="text-xs font-medium text-charcoal leading-tight whitespace-nowrap">demo-org</span>
                <span className="text-[11px] text-slate-400 leading-tight">live stream</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Collapse toggle ───────────────────────────────── */}
      <button
        id="sidebar-toggle"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "absolute -right-3 top-14 z-10",
          "w-6 h-6 rounded-full bg-white border border-border",
          "flex items-center justify-center",
          "text-slate-400 hover:text-charcoal hover:border-slate-300",
          "transition-[color,border-color] duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        )}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
