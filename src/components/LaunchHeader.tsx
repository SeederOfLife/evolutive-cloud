import { AnimatePresence, motion } from "motion/react";
import {
  X, Globe, Lock, MessageSquare, Activity, Layers,
  GitFork, ChevronUp, Droplets, Timer,
} from "lucide-react";
import { ShareMenu } from "./ShareMenu";
import type { Suggestion } from "../types";

interface Props {
  title: string;
  suggestion: Suggestion;
  currentUserId?: string;
  voted: boolean;
  showVotePop: boolean;
  showChat: boolean;
  showPlan: boolean;
  showJourney: boolean;
  showRoadmap: boolean;
  isWatering?: boolean;
  countdown: number | null;
  awDone: number;
  awRunning: boolean;
  hasWater: boolean;
  hasRefine: boolean;
  onVote: () => void;
  onClose: () => void;
  onFork?: () => void;
  onOpenWaterDialog: () => void;
  onToggleVisibility?: (vis: 'public' | 'private') => void;
  setShowChat: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPlan: React.Dispatch<React.SetStateAction<boolean>>;
  setShowJourney: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRoadmap: React.Dispatch<React.SetStateAction<boolean>>;
  awStop: () => void;
}

export function LaunchHeader({
  title, suggestion, currentUserId, voted, showVotePop, showChat,
  showPlan, showJourney, showRoadmap, isWatering,
  countdown, awDone, awRunning, hasWater, hasRefine,
  onVote, onClose, onFork, onOpenWaterDialog, onToggleVisibility,
  setShowChat, setShowPlan, setShowJourney, setShowRoadmap, awStop,
}: Props) {
  const togglePanel = (
    set: React.Dispatch<React.SetStateAction<boolean>>,
    others: React.Dispatch<React.SetStateAction<boolean>>[],
  ) => { others.forEach(s => s(false)); set(p => !p); };

  return (
    <>
      {/* Floating close */}
      <button onClick={onClose} aria-label="Close"
        className="absolute top-3 right-3 z-[9999] w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all active:scale-90 shadow-lg">
        <X className="w-5 h-5" />
      </button>

      {/* Title bar */}
      <div className="flex-none h-14 sm:h-12 bg-gray-900/95 border-b border-gray-800 flex items-center pl-3 pr-16 gap-2 shrink-0">
        <span className="flex-1 text-sm font-semibold text-white truncate min-w-0">
          {title}
          {suggestion.parent_id && (
            <span className="ml-2 text-[10px] text-indigo-400/60 font-mono font-normal hidden sm:inline">
              forked from #{suggestion.parent_id.substring(0, 8)}
            </span>
          )}
        </span>

        {onToggleVisibility && currentUserId && suggestion.user_id === currentUserId && !suggestion.id.startsWith('seed_') && (
          <button onClick={() => onToggleVisibility(suggestion.visibility === 'public' ? 'private' : 'public')}
            title={suggestion.visibility === 'public' ? 'Make private' : 'Make public'}
            className="flex w-8 h-8 rounded-lg items-center justify-center bg-gray-800 text-gray-400 hover:text-white transition-all shrink-0">
            {suggestion.visibility === 'public' ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
          </button>
        )}

        {hasWater && (
          <button onClick={onOpenWaterDialog} disabled={isWatering}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all shrink-0 ${isWatering ? 'bg-cyan-500/20 text-cyan-400 animate-pulse cursor-wait' : 'bg-gray-800 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300'}`}>
            <Droplets className="w-3.5 h-3.5" />{isWatering ? 'Evolving…' : 'Water'}
          </button>
        )}

        {!suggestion.id.startsWith('seed_') && <ShareMenu appId={suggestion.id} appTitle={suggestion.content} />}

        {onFork && (
          <button onClick={onFork} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-gray-800 text-gray-400 hover:text-white transition-all shrink-0">
            <GitFork className="w-3.5 h-3.5" />Fork
          </button>
        )}

        <div className="relative shrink-0">
          <motion.button whileTap={{ scale: 0.85 }} onClick={onVote}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all ${voted ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
            <ChevronUp className="w-3.5 h-3.5" />
            {(suggestion.votes || 0) + (voted ? 1 : 0)}
          </motion.button>
          <AnimatePresence>
            {showVotePop && (
              <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -20 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-black text-indigo-400 pointer-events-none">+1</motion.div>
            )}
          </AnimatePresence>
        </div>

        {suggestion.refinement_questions?.length > 0 && (
          <button onClick={() => togglePanel(setShowJourney, [setShowPlan, setShowRoadmap])}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${showJourney ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="View Build Journey"><Activity className="w-4 h-4" /></button>
        )}
        {suggestion.plan && (
          <button onClick={() => togglePanel(setShowPlan, [setShowJourney, setShowRoadmap])}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${showPlan ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="View Goal Plan"><Layers className="w-4 h-4" /></button>
        )}
        {suggestion.roadmap && (
          <button onClick={() => togglePanel(setShowRoadmap, [setShowPlan, setShowJourney])}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 text-sm ${showRoadmap ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="Growth Roadmap">🌱</button>
        )}
        {hasRefine && (
          <button onClick={() => setShowChat(p => !p)}
            className={`hidden sm:flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${showChat ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="Toggle AI Chat"><MessageSquare className="w-4 h-4" /></button>
        )}
      </div>

      {/* Auto-water countdown bar */}
      <AnimatePresence>
        {awRunning && countdown !== null && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-none overflow-hidden">
            <div className="h-8 bg-cyan-950/60 border-b border-cyan-500/20 flex items-center px-4 gap-2 text-xs">
              <Timer className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-cyan-400">Next watering in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
              {(suggestion.autoWaterTimes ?? 0) > 0 && <span className="text-gray-500">· {awDone}/{suggestion.autoWaterTimes} done</span>}
              <button onClick={awStop} className="ml-auto text-gray-600 hover:text-gray-400 transition-colors"><X className="w-3 h-3" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan panel */}
      <AnimatePresence>
        {showPlan && suggestion.plan && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-indigo-500/15">
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-indigo-400 mb-2">Built from this plan</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                {suggestion.plan.coreNeed && <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Need · </span><span className="text-[10px] text-white/60">{suggestion.plan.coreNeed}</span></div>}
                {suggestion.plan.targetUser && <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">For · </span><span className="text-[10px] text-white/60">{suggestion.plan.targetUser}</span></div>}
                {suggestion.plan.visualStyle && <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Style · </span><span className="text-[10px] text-white/60">{suggestion.plan.visualStyle}</span></div>}
                {suggestion.plan.features.length > 0 && <div className="col-span-2 sm:col-span-3"><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Features · </span><span className="text-[10px] text-white/60">{suggestion.plan.features.join(" · ")}</span></div>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roadmap panel */}
      <AnimatePresence>
        {showRoadmap && suggestion.roadmap && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-emerald-500/15">
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-emerald-400 mb-3 flex items-center gap-1.5">🌱 Growth Roadmap</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[['✅ Growing now', suggestion.roadmap.now, 'text-emerald-400/80'], ['🌱 Next watering', suggestion.roadmap.next, 'text-cyan-400/80'], ['🔮 Future growth', suggestion.roadmap.future, 'text-indigo-400/80']].map(([label, items, cls]) => (
                  <div key={label as string}>
                    <p className={`text-[8px] font-black uppercase tracking-[2px] mb-1.5 ${cls}`}>{label as string}</p>
                    {((items || []) as string[]).map((item, i) => <p key={i} className="text-[10px] text-white/50 leading-relaxed">• {item}</p>)}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journey panel */}
      <AnimatePresence>
        {showJourney && suggestion.refinement_questions && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-indigo-500/15">
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-indigo-400 mb-2">Build Journey</p>
              <div className="space-y-2">
                {suggestion.refinement_questions.map((q, i) => {
                  const answer = suggestion.refinement_answers?.[i];
                  return (
                    <div key={i} className="flex gap-2">
                      <span className={`text-[8px] font-black uppercase shrink-0 mt-0.5 ${q.priority === "Critical" ? "text-red-400/60" : "text-orange-400/60"}`}>{q.priority === "Critical" ? "!" : "↑"}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-white/50">{q.question}</p>
                        {answer ? <p className="text-[10px] text-indigo-300/80 font-medium">→ {answer}</p> : <p className="text-[10px] text-white/20 italic">skipped</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
