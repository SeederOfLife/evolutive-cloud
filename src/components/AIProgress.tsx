import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, AlertCircle } from "lucide-react";

export const AI_STAGES = [
  { label: "Reading",    desc: "Understanding your idea..."     },
  { label: "Planning",   desc: "Decomposing into features..."   },
  { label: "Designing",  desc: "Choosing visual style..."       },
  { label: "Coding",     desc: "Writing components..."          },
  { label: "Reviewing",  desc: "Checking for errors..."         },
  { label: "Optimizing", desc: "Polishing details..."           },
  { label: "Done",       desc: "Your app is ready!"             },
] as const;

export type AIStageIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Props {
  stage: AIStageIndex;
  error?: string | null;
  retrying?: boolean;
}

export function AIProgress({ stage, error, retrying }: Props) {
  const [displayed, setDisplayed] = useState<AIStageIndex>(stage);

  // Auto-advance displayed stage every 2s up to the real stage
  useEffect(() => {
    if (displayed >= stage) return;
    const t = setTimeout(() => setDisplayed(s => Math.min(s + 1, stage) as AIStageIndex), 2000);
    return () => clearTimeout(t);
  }, [displayed, stage]);

  // Jump forward immediately when real stage advances past displayed
  useEffect(() => {
    if (stage > displayed) setDisplayed(stage);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-gray-950/92 backdrop-blur-sm flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-xs">
        {/* Title */}
        <div className="text-center mb-8">
          <p className="text-[9px] font-black uppercase tracking-[5px] text-indigo-400 mb-2">
            {retrying ? "Retrying" : "Building"}
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={displayed}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-base font-semibold text-white"
            >
              {AI_STAGES[displayed].desc}
            </motion.p>
          </AnimatePresence>
          {retrying && (
            <p className="text-[10px] text-orange-400/80 mt-1">Retrying with stricter constraints...</p>
          )}
        </div>

        {/* Timeline */}
        <div className="relative flex flex-col gap-0">
          {AI_STAGES.map((s, i) => {
            const isDone = i < displayed;
            const isCurrent = i === displayed;
            const isFuture = i > displayed;
            const isErrorStep = isCurrent && !!error;

            return (
              <div key={s.label} className="flex items-start gap-4">
                {/* Left: circle + connector */}
                <div className="flex flex-col items-center">
                  <div className={`relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                    isErrorStep
                      ? "border-red-500 bg-red-500/15"
                      : isDone
                      ? "border-emerald-500 bg-emerald-500/15"
                      : isCurrent
                      ? "border-indigo-400 bg-indigo-500/15"
                      : "border-gray-700 bg-transparent"
                  }`}>
                    {isErrorStep ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    ) : isDone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="w-2.5 h-2.5 rounded-full bg-indigo-400"
                      />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-700" />
                    )}
                  </div>
                  {i < AI_STAGES.length - 1 && (
                    <div className={`w-0.5 h-6 transition-all duration-500 ${isDone ? "bg-emerald-500/40" : "bg-gray-800"}`} />
                  )}
                </div>

                {/* Right: label + desc */}
                <div className="pb-6 min-w-0 flex-1">
                  <p className={`text-xs font-bold transition-colors duration-300 ${
                    isErrorStep ? "text-red-400"
                    : isDone ? "text-emerald-400"
                    : isCurrent ? "text-white"
                    : "text-gray-600"
                  }`}>
                    {s.label}
                  </p>
                  {isCurrent && (
                    <AnimatePresence>
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className={`text-[10px] mt-0.5 leading-snug ${isErrorStep ? "text-red-400/70" : "text-white/40"}`}
                      >
                        {isErrorStep ? error : s.desc}
                      </motion.p>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
