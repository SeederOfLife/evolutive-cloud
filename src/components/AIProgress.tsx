import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, AlertCircle, Zap } from "lucide-react";

export const AI_STAGES = [
  { label: "Reading",    desc: "Understanding your idea..."     },
  { label: "Planning",   desc: "Decomposing into features..."   },
  { label: "Designing",  desc: "Choosing visual style..."       },
  { label: "Coding",     desc: "Writing components..."          },
  { label: "Reviewing",  desc: "Checking for errors..."         },
  { label: "Optimizing", desc: "Polishing details..."           },
  { label: "Done",       desc: "Your app is ready!"             },
] as const;

export const FIX_STAGES = [
  { label: "Reading Code",     desc: "Scanning current code for issues..."       },
  { label: "Detecting Errors", desc: "Checking braces, App function, imports..." },
  { label: "Root Cause",       desc: "Identifying what broke..."                 },
  { label: "Surgical Fix",     desc: "Rewriting only what's broken..."           },
  { label: "Validating",       desc: "Verifying code balance and structure..."   },
  { label: "Done",             desc: "Fix applied!"                              },
] as const;

export type AIStageIndex  = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type FixStageIndex = 0 | 1 | 2 | 3 | 4 | 5;

const STAGE_PROGRESS: number[] = [0, 15, 30, 45, 75, 85, 95, 100];
const FIX_PROGRESS:   number[] = [0, 20, 40, 60, 85, 96, 100, 100];

interface Props {
  stage:     AIStageIndex;
  error?:    string | null;
  retrying?: boolean;
  label?:    string;
  highZ?:    boolean;
  mode?:     'generate' | 'fix';
  prompt?:   string;
  provider?: string;
}

export function AIProgress({ stage, error, retrying, label, highZ, mode = 'generate', prompt, provider }: Props) {
  const isFix   = mode === 'fix';
  const stages  = isFix ? FIX_STAGES : AI_STAGES;
  const progMap = isFix ? FIX_PROGRESS : STAGE_PROGRESS;

  const [displayed, setDisplayed] = useState<AIStageIndex>(stage);

  useEffect(() => {
    if (displayed >= stage) return;
    const t = setTimeout(() => setDisplayed(s => Math.min(s + 1, stage) as AIStageIndex), 2000);
    return () => clearTimeout(t);
  }, [displayed, stage]);

  useEffect(() => {
    if (stage > displayed) setDisplayed(stage);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeIdx     = Math.min(displayed, stages.length - 1);
  const progressPct = progMap[safeIdx];
  const current     = stages[safeIdx];
  const accentText  = isFix ? 'text-amber-400' : 'text-indigo-400';
  const barClass    = isFix ? 'from-amber-600 to-amber-400' : 'from-indigo-600 to-indigo-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className={`fixed bottom-24 right-4 sm:right-6 ${highZ ? 'z-[9999]' : 'z-[90]'} w-72 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className={`w-1.5 h-1.5 rounded-full ${isFix ? 'bg-amber-400' : 'bg-indigo-400'}`}
          />
          <span className={`text-[9px] font-black uppercase tracking-[4px] ${accentText}`}>
            {retrying ? "Retrying" : (label ?? (isFix ? "Fixing" : "Building"))}
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={progressPct}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-xs font-black tabular-nums ${accentText}`}
          >
            {progressPct}%
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Description */}
      <div className="px-4 pb-2 min-h-[2.5rem]">
        <AnimatePresence mode="wait">
          <motion.p
            key={safeIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={`text-sm font-semibold leading-snug ${error ? 'text-red-400' : 'text-white'}`}
          >
            {error ? error : current.desc}
          </motion.p>
        </AnimatePresence>

        {/* Prompt preview */}
        {prompt && !error && (
          <p className="text-[10px] text-gray-500 mt-1 truncate">"{prompt}"</p>
        )}

        {/* Provider + retry */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {provider && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-gray-500 uppercase tracking-wide">
              <Zap className="w-2.5 h-2.5" />
              {provider}
            </span>
          )}
          {retrying && (
            <span className="text-[10px] text-orange-400/80">Stricter constraints...</span>
          )}
        </div>
      </div>

      {/* Step segments */}
      <div className="px-4 pb-3 flex items-center gap-1">
        {stages.map((s, i) => {
          const isDone    = i < safeIdx;
          const isCurrent = i === safeIdx;
          const isErr     = isCurrent && !!error;
          return (
            <div key={s.label} className="relative group flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-[3px] rounded-full transition-all duration-500 ${
                isErr      ? 'bg-red-500'
                : isDone   ? 'bg-emerald-500'
                : isCurrent ? (isFix ? 'bg-amber-400' : 'bg-indigo-400')
                : 'bg-gray-700'
              }`} />
              {/* Icon under current step */}
              {isDone && <Check className="w-2.5 h-2.5 text-emerald-500" />}
              {isCurrent && !isErr && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className={`w-1 h-1 rounded-full ${isFix ? 'bg-amber-400' : 'bg-indigo-400'}`}
                />
              )}
              {isErr && <AlertCircle className="w-2.5 h-2.5 text-red-400" />}
              {!isDone && !isCurrent && <div className="w-1 h-1" />}
              {/* Hover label */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gray-800 border border-white/10 rounded text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-gray-800">
        <motion.div
          className={`h-full bg-gradient-to-r ${barClass}`}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
