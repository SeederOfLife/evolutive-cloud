import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Zap, ChevronUp } from "lucide-react";
import { Suggestion } from "../types";
import { AppSandbox } from "./AppSandbox";

const TYPE_STYLES: Record<string, { badge: string; glow: string }> = {
  phone:    { badge: "text-pink-400 bg-pink-500/10 border-pink-500/30",         glow: "rgba(236,72,153,0.15)" },
  desktop:  { badge: "text-blue-400 bg-blue-500/10 border-blue-500/30",         glow: "rgba(99,102,241,0.15)" },
  game:     { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", glow: "rgba(16,185,129,0.15)" },
  terminal: { badge: "text-orange-400 bg-orange-500/10 border-orange-500/30",   glow: "rgba(249,115,22,0.15)" },
  music:    { badge: "text-purple-400 bg-purple-500/10 border-purple-500/30",   glow: "rgba(168,85,247,0.15)" },
  art:      { badge: "text-rose-400 bg-rose-500/10 border-rose-500/30",         glow: "rgba(244,63,94,0.15)"  },
};

interface Props {
  suggestion: Suggestion;
  isActive: boolean;
  onPlay: (s: Suggestion) => void;
  onVote: (id: string, votes: number) => void;
  onBuild?: (s: Suggestion) => void;
}

export function FeedCard({ suggestion: s, isActive, onPlay, onVote, onBuild }: Props) {
  const [voted, setVoted] = useState(false);
  const [showVotePop, setShowVotePop] = useState(false);
  const isBuilt = s.status === "built" && !!s.built_code;
  const style = TYPE_STYLES[s.app_type || "desktop"] || TYPE_STYLES.desktop;
  const title = s.content.length > 55 ? s.content.substring(0, 55) + "…" : s.content;

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    setShowVotePop(true);
    onVote(s.id, s.votes || 0);
    setTimeout(() => setShowVotePop(false), 1200);
  };

  return (
    <div className="relative w-full flex flex-col overflow-hidden"
      style={{ scrollSnapAlign: "start", height: "100%", minHeight: "100%" }}>

      {/* Background */}
      <div className="absolute inset-0">
        {isBuilt ? (
          <AppSandbox code={s.built_code!} appType={s.app_type} className="w-full h-full" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#07071a] via-black to-[#03030a]">
            <div className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 40%, ${style.glow} 0%, transparent 65%)` }} />
            <AppMockup appType={s.app_type} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
      </div>

      {/* Top badges */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[3px] border ${style.badge}`}>
            {s.app_type || "desktop"}
          </div>
          {s.user_id === '@evolutive_demo' && (
            <div className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-[2px] border bg-violet-500/10 text-violet-400 border-violet-500/30">DEMO</div>
          )}
        </div>
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[2px] border ${isBuilt ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-white/5 text-white/30 border-white/10"}`}>
          {isBuilt ? "● built" : "◌ pending"}
        </div>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 mt-auto p-4 space-y-3">
        <div>
          <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-white leading-snug">{title}</h2>
          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-1">#{s.id.substring(0, 12)}</p>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Energy</span>
            <span className="text-[9px] font-black text-indigo-400">{s.energy || 0}%</span>
          </div>
          <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${s.energy || 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full" />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative shrink-0">
            <motion.button whileTap={{ scale: 0.85 }} onClick={handleVote}
              className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl border transition-all ${voted ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"}`}>
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="text-[8px] font-black leading-none">{(s.votes || 0) + (voted ? 1 : 0)}</span>
            </motion.button>
            <AnimatePresence>
              {showVotePop && (
                <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -22 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.9 }}
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-black text-indigo-400 pointer-events-none">+1</motion.div>
              )}
            </AnimatePresence>
          </div>

          {isBuilt ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onPlay(s)}
              className="flex-1 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[5px] hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-xl">
              <Play className="w-3.5 h-3.5 fill-current" />Launch
            </motion.button>
          ) : onBuild ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onBuild(s)}
              className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[5px] hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-xl">
              <Zap className="w-3.5 h-3.5" />Build Now
            </motion.button>
          ) : (
            <div className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-white/20 flex items-center justify-center">
              {s.energy || 0}% fueled
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isActive && (
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }}
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-pink-500 to-indigo-500 origin-left" />
        )}
      </AnimatePresence>
    </div>
  );
}

function AppMockup({ appType }: { appType?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
      {appType === "phone" ? (
        <div className="w-40 h-72 rounded-[3rem] border-4 border-white/40 flex flex-col items-center p-4 gap-3">
          <div className="w-10 h-1.5 bg-white/40 rounded-full" />
          <div className="flex-1 w-full bg-white/10 rounded-2xl" />
        </div>
      ) : appType === "game" ? (
        <div className="w-72 h-48 rounded-2xl border-4 border-white/40 flex items-center justify-center">
          <Play className="w-16 h-16 text-white/60" />
        </div>
      ) : appType === "terminal" ? (
        <div className="w-80 h-52 rounded-xl border border-white/20 bg-white/5 p-4 flex flex-col gap-2">
          {[100, 75, 60, 45, 80].map((w, i) => (
            <div key={i} className="h-2 bg-white/20 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : appType === "music" ? (
        <div className="w-80 h-52 rounded-2xl border border-white/20 bg-white/5 p-4 flex flex-col gap-3">
          <div className="flex gap-1 flex-1 items-end">
            {[40, 70, 55, 90, 45, 80, 60, 75, 50, 85].map((h, i) => (
              <div key={i} className="flex-1 bg-white/20 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} className={`flex-1 h-8 rounded-sm ${[2, 4, 7, 9, 11].includes(i) ? "bg-white/10 -mx-0.5 z-10 relative" : "bg-white/25"}`} />
            ))}
          </div>
        </div>
      ) : appType === "art" ? (
        <div className="w-72 h-72 rounded-full border border-white/20 flex items-center justify-center">
          <div className="w-52 h-52 rounded-full border border-white/20 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-2 border-white/30 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-80 h-52 rounded-2xl border-4 border-white/40 flex flex-col p-4 gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === 0 ? "bg-white/40" : "bg-white/20"}`} />
            ))}
          </div>
          <div className="flex-1 bg-white/10 rounded-xl" />
        </div>
      )}
    </div>
  );
}
