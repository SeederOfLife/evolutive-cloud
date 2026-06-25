import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, X, Settings } from 'lucide-react';

export interface ProviderAttempt {
  name: string;
  status: 'trying' | 'ok' | 'failed';
}

const FACES = [
  { key: 'front',  match: ['google', 'gemini'],                       color: '#4285F4' },
  { key: 'right',  match: ['groq'],                                    color: '#F55036' },
  { key: 'back',   match: ['openrouter'],                              color: '#7C3AED' },
  { key: 'left',   match: ['ollama'],                                  color: '#10B981' },
  { key: 'top',    match: ['relay', 'cloud', 'nano'],                  color: '#4F46E5' },
  { key: 'bottom', match: ['webllm', 'local', 'openai', 'anthropic'], color: '#64748B' },
];

const S = 32; // half-size → 64px cube

const TRANSFORMS: Record<string, string> = {
  front:  `rotateY(0deg)    translateZ(${S}px)`,
  right:  `rotateY(90deg)   translateZ(${S}px)`,
  back:   `rotateY(180deg)  translateZ(${S}px)`,
  left:   `rotateY(-90deg)  translateZ(${S}px)`,
  top:    `rotateX(90deg)   translateZ(${S}px)`,
  bottom: `rotateX(-90deg)  translateZ(${S}px)`,
};

const FREE_AI = [
  { name: 'Groq',       desc: 'Free · fast · great for code',  url: 'https://console.groq.com/keys', color: '#F55036' },
  { name: 'Google AI',  desc: 'Free quota · Gemini Flash',      url: 'https://aistudio.google.com',   color: '#4285F4' },
  { name: 'OpenRouter', desc: 'Free models (Gemini, Llama…)',   url: 'https://openrouter.ai/keys',     color: '#7C3AED' },
  { name: 'Ollama',     desc: 'Local · 100% free · no limit',   url: 'https://ollama.com',             color: '#10B981' },
];

interface Props {
  currentProvider: string | null;
  attempts: ProviderAttempt[];
  allFailed?: boolean;
  onDismiss?: () => void;
  onOpenSettings?: () => void;
}

function matchFace(name: string, keys: string[]): boolean {
  const l = name.toLowerCase();
  return keys.some(k => l.includes(k));
}

export default function AIRubiksCube({ currentProvider, attempts, allFailed, onDismiss, onOpenSettings }: Props) {
  const activeColor = FACES.find(f => currentProvider && matchFace(currentProvider, f.match))?.color ?? '#6366F1';

  return (
    <motion.div
      drag
      dragMomentum={false}
      className="fixed bottom-20 right-4 z-[9999] cursor-grab active:cursor-grabbing select-none"
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 12 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
    >
      <style>{`
        @keyframes rubik-spin {
          from { transform: rotateX(-20deg) rotateY(0deg); }
          to   { transform: rotateX(-20deg) rotateY(360deg); }
        }
        @keyframes face-pulse {
          0%,100% { filter: brightness(1.4) saturate(1.3); }
          50%      { filter: brightness(2.5) saturate(2.2); }
        }
        @keyframes dot-blink {
          0%,80%,100% { opacity: 0.2; } 40% { opacity: 1; }
        }
      `}</style>

      <div
        className="bg-gray-950/96 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden"
        style={{ width: 218 }}
      >
        <AnimatePresence mode="wait">
          {allFailed ? (
            /* ── ALL FAILED panel ── */
            <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-white">No AI available</p>
                </div>
                {onDismiss && (
                  <button onClick={onDismiss}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Add a free API key to continue:</p>

              <div className="space-y-1.5">
                {FREE_AI.map(ai => (
                  <a key={ai.name} href={ai.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/12 transition-all group">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ai.color, boxShadow: `0 0 6px ${ai.color}60` }} />
                      <div>
                        <p className="text-[11px] font-bold text-white">{ai.name}</p>
                        <p className="text-[9px] text-gray-500 leading-tight">{ai.desc}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-2.5 h-2.5 text-gray-600 group-hover:text-white transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>

              {onOpenSettings && (
                <button onClick={onOpenSettings}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-bold transition-colors shadow-lg shadow-indigo-500/20">
                  <Settings className="w-3 h-3" /> Add key in Settings
                </button>
              )}
            </motion.div>
          ) : (
            /* ── CONNECTING / ROUTING widget ── */
            <motion.div key="cube" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Top bar */}
              <div className="flex items-center justify-between px-3 pt-2.5 pb-0">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-[3px] items-center">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1 h-1 rounded-full bg-cyan-400"
                        style={{ animation: `dot-blink 1.2s ${d}ms ease-in-out infinite` }} />
                    ))}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[3px] text-gray-500">AI Routing</span>
                </div>
                {onDismiss && (
                  <button onClick={onDismiss}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Cube + status */}
              <div className="flex items-center gap-3 px-3 py-3">
                {/* 3D cube with radial glow */}
                <div style={{ position: 'relative', width: S * 2, height: S * 2, flexShrink: 0, perspective: 260 }}>
                  <div style={{
                    position: 'absolute',
                    inset: -14,
                    background: `radial-gradient(circle, ${activeColor}40 0%, transparent 68%)`,
                    transition: 'background 0.6s ease',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    width: S * 2, height: S * 2,
                    position: 'relative', transformStyle: 'preserve-3d',
                    animation: 'rubik-spin 3.5s linear infinite',
                  }}>
                    {FACES.map(({ key, match, color }) => {
                      const attempt = attempts.find(a => matchFace(a.name, match));
                      const isCurrent = currentProvider ? matchFace(currentProvider, match) : false;
                      const status = isCurrent ? 'trying' : attempt?.status ?? 'idle';
                      return (
                        <div key={key} style={{
                          position: 'absolute', inset: 0,
                          transform: TRANSFORMS[key],
                          background: color,
                          opacity: status === 'failed' ? 0.10 : status === 'trying' ? 1 : status === 'ok' ? 0.72 : 0.30,
                          animation: status === 'trying' ? 'face-pulse 0.8s ease-in-out infinite' : undefined,
                          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, padding: 4,
                          boxSizing: 'border-box',
                          border: isCurrent ? `2px solid rgba(255,255,255,0.95)` : '1.5px solid rgba(0,0,0,0.35)',
                          borderRadius: 3,
                        }}>
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 1 }} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Provider status */}
                <div className="flex-1 min-w-0 space-y-2">
                  <motion.div key={currentProvider ?? 'idle'}
                    initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }}>
                    {currentProvider ? (
                      <p className="text-[10px] leading-snug">
                        <span className="text-gray-500">trying </span>
                        <span className="font-bold" style={{ color: activeColor }}>{currentProvider}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-600 italic">Connecting…</p>
                    )}
                  </motion.div>

                  <div className="flex flex-wrap gap-1">
                    {attempts.map((a, i) => (
                      <span key={i} className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all ${
                        a.status === 'trying' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        a.status === 'ok'     ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                                               'bg-white/4 text-gray-700 border border-white/5 line-through decoration-gray-700'
                      }`}>
                        {a.status === 'trying' ? '◎' : a.status === 'ok' ? '✓' : '✕'} {a.name.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
