import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Zap } from "lucide-react";
import { Suggestion } from "../types";
import { FeedCard } from "./FeedCard";

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
        <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-24 h-24 border border-indigo-500/20 rounded-full flex items-center justify-center">
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
      <div ref={containerRef} className="flex-1 overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory", scrollBehavior: "smooth", scrollbarWidth: "none" }}>
        {items.map((s, idx) => (
          <FeedCard key={s.id} suggestion={s} isActive={idx === activeIndex}
            onPlay={onPlay} onVote={onVote} onBuild={onBuild} />
        ))}
      </div>

      {items.length > 1 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          {items.map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${i === activeIndex ? "w-2 h-6 bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "w-2 h-2 bg-white/20 hover:bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
