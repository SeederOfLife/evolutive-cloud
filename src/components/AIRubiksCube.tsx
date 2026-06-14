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

const S = 36; // half-size → 72px cube

const TRANSFORMS: Record<string, string> = {
  front:  `rotateY(0deg)    translateZ(${S}px)`,
  right:  `rotateY(90deg)   translateZ(${S}px)`,
  back:   `rotateY(180deg)  translateZ(${S}px)`,
  left:   `rotateY(-90deg)  translateZ(${S}px)`,
  top:    `rotateX(90deg)   translateZ(${S}px)`,
  bottom: `rotateX(-90deg)  translateZ(${S}px)`,
};

const FREE_AI = [
  { name: 'Groq',        desc: 'Free · fast · great for code',  url: 'https://console.groq.com/keys',  color: '#F55036' },
  { name: 'Google AI',   desc: 'Free quota · Gemini Flash',      url: 'https://aistudio.google.com',    color: '#4285F4' },
  { name: 'OpenRouter',  desc: 'Free models (Gemini, Llama…)',   url: 'https://openrouter.ai/keys',      color: '#7C3AED' },
  { name: 'Ollama',      desc: 'Local · 100% free · no limit',   url: 'https://ollama.com',              color: '#10B981' },
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
  return (
    <motion.div
      drag
      dragMomentum={false}
      className="fixed bottom-20 right-4 z-[9999] cursor-grab active:cursor-grabbing select-none"
      initial={{ opacity: 0, scale: 0.8, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -8 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
    >
      <style>{`
        @keyframes rubik-spin {
          from { transform: rotateX(-18deg) rotateY(0deg);   }
          to   { transform: rotateX(-18deg) rotateY(360deg); }
        }
        @keyframes face-pulse {
          0%,100% { filter: brightness(1.3) saturate(1.2); }
          50%      { filter: brightness(2.2) saturate(1.9); }
        }
      `}</style>

      <div className="bg-gray-900/96 border border-white/12 rounded-2xl shadow-2xl shadow-black/70 backdrop-blur-md overflow-hidden"
        style={{ width: 230 }}>

        <AnimatePresence mode="wait">
          {allFailed ? (
            <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white">No AI available</p>
                {onDismiss && (
                  <button onClick={onDismiss} className="text-gray-600 hover:text-white transition-colors p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Add a free API key to continue:</p>
              <div className="space-y-1.5">
                {FREE_AI.map(ai => (
                  <a key={ai.name} href={ai.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ai.color }} />
                      <div>
                        <p className="text-[11px] font-semibold text-white">{ai.name}</p>
                        <p className="text-[9px] text-gray-400 leading-tight">{ai.desc}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-2.5 h-2.5 text-gray-600 group-hover:text-white transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>
              {onOpenSettings && (
                <button onClick={onOpenSettings}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-bold transition-colors">
                  <Settings className="w-3 h-3" />Add key in Settings
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div key="cube" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3">

              {/* Mini 3D cube */}
              <div style={{ perspective: 280, width: S * 2, height: S * 2, flexShrink: 0 }}>
                <div style={{
                  width: S * 2, height: S * 2,
                  position: 'relative', transformStyle: 'preserve-3d',
                  animation: 'rubik-spin 3s linear infinite',
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
                        opacity: status === 'failed' ? 0.18 : status === 'trying' ? 1 : status === 'ok' ? 0.8 : 0.48,
                        animation: status === 'trying' ? 'face-pulse 0.75s ease-in-out infinite' : undefined,
                        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, padding: 4,
                        boxSizing: 'border-box',
                        border: isCurrent ? '1.5px solid rgba(255,255,255,0.9)' : '1.5px solid rgba(0,0,0,0.4)',
                      }}>
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <motion.p key={currentProvider ?? 'connecting'}
                  initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] leading-snug">
                  {currentProvider
                    ? <><span className="text-gray-400">Switching → </span><span className="text-cyan-400 font-semibold">{currentProvider}</span></>
                    : <span className="text-gray-500">Connecting…</span>}
                </motion.p>
                <div className="flex flex-wrap gap-1">
                  {attempts.map((a, i) => (
                    <span key={i} className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                      a.status === 'trying' ? 'bg-cyan-500/20 text-cyan-300' :
                      a.status === 'ok'     ? 'bg-green-500/20 text-green-300' :
                                             'bg-white/5 text-gray-600 line-through'
                    }`}>
                      {a.status === 'trying' ? '⟳' : a.status === 'ok' ? '✓' : '✕'} {a.name.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
