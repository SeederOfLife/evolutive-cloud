import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Droplets } from 'lucide-react';
import type { Suggestion } from '../types';

const LAST_VISIT_KEY = 'last_visit_at';

function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  suggestions: Suggestion[];
  onOpenApp: (s: Suggestion) => void;
}

export default function WhileYouWereAway({ suggestions, onOpenApp }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const [lastVisit] = useState<string | null>(() => {
    const prev = localStorage.getItem(LAST_VISIT_KEY);
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    return prev;
  });

  const items = useMemo(() => {
    if (!lastVisit) return [];
    const since = new Date(lastVisit).getTime();
    const result: { app: Suggestion; summary: string; focus: string; timestamp: string }[] = [];
    for (const s of suggestions) {
      for (const ev of s.evolutions ?? []) {
        if (new Date(ev.timestamp).getTime() > since) {
          result.push({ app: s, summary: ev.summary, focus: ev.focus, timestamp: ev.timestamp });
        }
      }
    }
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [suggestions, lastVisit]);

  if (items.length === 0 || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320, delay: 0.8 }}
        className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-5 sm:w-80 z-[200]"
      >
        <div className="bg-gray-950/97 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <p className="text-[10px] font-black uppercase tracking-[3px] text-white">
                {items.length} evolution{items.length > 1 ? 's' : ''} while you were away
              </p>
            </div>
            <button onClick={() => setDismissed(true)}
              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-white transition-colors rounded">
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 220, scrollbarWidth: 'none' }}>
            {items.map((item, i) => (
              <button key={i} onClick={() => { onOpenApp(item.app); setDismissed(true); }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"
                  style={{ boxShadow: '0 0 5px rgba(34,211,238,0.7)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">{item.app.content}</p>
                  <p className="text-[10px] text-gray-400 leading-snug mt-0.5 line-clamp-2">{item.summary}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-indigo-400 font-medium">{item.focus}</span>
                    <span className="text-[9px] text-gray-600">{timeAgo(item.timestamp)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
