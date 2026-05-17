import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Zap, ChevronUp, Maximize2, X, Loader2 } from "lucide-react";
import { Suggestion } from "../types";
import { AppSandbox } from "./AppSandbox";

const TYPE_STYLES: Record<string, { badge: string; glow: string }> = {
  phone:    { badge: "text-pink-400 bg-pink-500/10 border-pink-500/30",    glow: "rgba(236,72,153,0.15)" },
  desktop:  { badge: "text-blue-400 bg-blue-500/10 border-blue-500/30",    glow: "rgba(99,102,241,0.15)" },
  game:     { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", glow: "rgba(16,185,129,0.15)" },
  terminal: { badge: "text-orange-400 bg-orange-500/10 border-orange-500/30", glow: "rgba(249,115,22,0.15)" },
};

interface Props {
  suggestions: Suggestion[];
  onPlay: (s: Suggestion) => void;
  onVote: (id: string, votes: number) => void;
  onBuild?: (s: Suggestion) => void;
}

export function ScrollFeed({ suggestions, onPlay, onVote, onBuild }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = suggestions.filter(s => s.status !== "deleted" && !s.is_deleted);

  const scrollTo = useCallback((index: number) => {
    if (!containerRef.current) return;
    const h = containerRef.current.clientHeight;
    containerRef.current.scrollTo({ top: index * h, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const newIdx = Math.round(scrollTop / clientHeight);
    if (newIdx !== activeIndex) setActiveIndex(newIdx);
  }, [activeIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-24 h-24 border border-indigo-500/20 rounded-full flex items-center justify-center"
        >
          <Zap className="w-8 h-8 text-indigo-500/40" />
        </motion.div>
        <div className="space-y-2">
          <p className="text-white/20 font-black uppercase tracking-[8px] text-sm">No apps yet</p>
          <p className="text-white/10 font-mono text-[10px] uppercase tracking-widest">Manifest your first idea below</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex">
      {/* Scrollable feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll"
        style={{
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(99,102,241,0.3) transparent",
        }}
      >
        {items.map((s, idx) => (
          <FeedCard
            key={s.id}
            suggestion={s}
            isActive={idx === activeIndex}
            onPlay={onPlay}
            onVote={onVote}
            onBuild={onBuild}
          />
        ))}
      </div>

      {/* Side nav dots */}
      {items.length > 1 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-2 h-6 bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                  : "w-2 h-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedCard({
  suggestion: s,
  isActive,
  onPlay,
  onVote,
  onBuild,
}: {
  suggestion: Suggestion;
  isActive: boolean;
  onPlay: (s: Suggestion) => void;
  onVote: (id: string, votes: number) => void;
  onBuild?: (s: Suggestion) => void;
}) {
  const [livePreview, setLivePreview] = useState(false);
  const [voted, setVoted] = useState(false);
  const isBuilt = s.status === "built" && !!s.built_code;
  const style = TYPE_STYLES[s.app_type || "desktop"] || TYPE_STYLES.desktop;

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    onVote(s.id, s.votes || 0);
  };

  return (
    <div
      className="relative w-full flex flex-col overflow-hidden"
      style={{ scrollSnapAlign: "start", height: "100%", minHeight: "100%" }}
    >
      {/* Background */}
      <div className="absolute inset-0">
        {isBuilt && livePreview ? (
          <AppSandbox code={s.built_code!} appType={s.app_type} className="w-full h-full" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#07071a] via-black to-[#03030a]">
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${style.glow} 0%, transparent 65%)`,
              }}
            />
            <AppMockup appType={s.app_type} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* Top badges */}
      <div className="relative z-10 flex items-center justify-between p-5 md:p-6">
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[3px] border ${style.badge}`}>
          {s.app_type || "desktop"}
        </div>
        <div
          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[2px] border ${
            isBuilt
              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              : "bg-white/5 text-white/30 border-white/10"
          }`}
        >
          {isBuilt ? "● built" : "◌ pending"}
        </div>
      </div>

      {/* Bottom info panel */}
      <div className="relative z-10 mt-auto p-5 md:p-6 space-y-3">
        {/* Title + id */}
        <div>
          <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white leading-snug line-clamp-2">
            {s.content}
          </h2>
          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-1">
            #{s.id.substring(0, 12)}
          </p>
        </div>

        {/* Energy bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Energy</span>
            <span className="text-[9px] font-black text-indigo-400">{s.energy || 0}%</span>
          </div>
          <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${s.energy || 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"
            />
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-2 items-center">
          {/* Vote */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleVote}
            className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-xl border transition-all shrink-0 ${
              voted
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
            }`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black leading-none">{(s.votes || 0) + (voted ? 1 : 0)}</span>
          </motion.button>

          {/* Preview toggle for built apps */}
          {isBuilt && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setLivePreview((p) => !p)}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                livePreview
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
              }`}
              title="Toggle live preview"
            >
              {livePreview ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </motion.button>
          )}

          {/* Main CTA */}
          {isBuilt ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onPlay(s)}
              className="flex-1 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[5px] hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Launch App
            </motion.button>
          ) : onBuild ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onBuild(s)}
              className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[5px] hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              <Zap className="w-3.5 h-3.5" />
              Build Now
            </motion.button>
          ) : (
            <div className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-white/20 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5" />
              {s.energy || 0}% fueled
            </div>
          )}
        </div>
      </div>

      {/* Active indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-pink-500 to-indigo-500 origin-left"
          />
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
      ) : (
        <div className="w-80 h-52 rounded-2xl border-4 border-white/40 flex flex-col p-4 gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/40" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
          </div>
          <div className="flex-1 bg-white/10 rounded-xl" />
        </div>
      )}
    </div>
  );
}
