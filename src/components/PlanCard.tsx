import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Target, Users, Layers, MousePointer, Palette, CheckCircle, X } from "lucide-react";
import { GoalPlan } from "../types";

interface Props {
  idea: string;
  plan: GoalPlan;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function PlanCard({ idea, plan, onDismiss, autoDismissMs = 3000 }: Props) {
  const [countdown, setCountdown] = useState(Math.round(autoDismissMs / 1000));

  useEffect(() => {
    const interval = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [onDismiss, autoDismissMs]);

  const sections: { icon: React.ReactNode; label: string; value: string | string[] }[] = [
    { icon: <Target className="w-3.5 h-3.5" />, label: "Core Need", value: plan.coreNeed },
    { icon: <Users className="w-3.5 h-3.5" />, label: "For", value: plan.targetUser },
    { icon: <Layers className="w-3.5 h-3.5" />, label: "Features", value: plan.features },
    { icon: <MousePointer className="w-3.5 h-3.5" />, label: "Interactions", value: plan.interactions },
    { icon: <Palette className="w-3.5 h-3.5" />, label: "Visual Style", value: plan.visualStyle },
    { icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Success", value: plan.successCriteria },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-md bg-gray-950 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-indigo-400 mb-1">Goal Plan</p>
              <h3 className="text-sm font-bold text-white leading-snug truncate">{idea}</h3>
            </div>
            <button
              onClick={onDismiss}
              className="shrink-0 w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Plan sections */}
        <div className="px-5 py-4 space-y-3">
          {sections.map(({ icon, label, value }) => {
            if (Array.isArray(value) && value.length === 0) return null;
            return (
              <div key={label} className="flex gap-3">
                <div className="shrink-0 w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mt-0.5">
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[3px] text-white/30 mb-0.5">{label}</p>
                  {Array.isArray(value) ? (
                    <ul className="space-y-0.5">
                      {value.map((v, i) => (
                        <li key={i} className="text-[11px] text-white/70 flex gap-1.5">
                          <span className="text-indigo-400/60">•</span>{v}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-white/70">{value}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 w-24 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
                className="h-full bg-indigo-500 rounded-full"
              />
            </div>
            <span className="text-[9px] font-mono text-white/20">{countdown}s</span>
          </div>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-[3px] text-white transition-all active:scale-95"
          >
            Build Now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
