import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Settings } from 'lucide-react';

export interface ProviderAttempt {
  name: string;
  status: 'trying' | 'ok' | 'failed';
}

const FACES = [
  { key: 'front',  match: ['google', 'gemini'],        color: '#4285F4', label: 'Google'     },
  { key: 'right',  match: ['groq'],                    color: '#F55036', label: 'Groq'       },
  { key: 'back',   match: ['openrouter'],               color: '#7C3AED', label: 'OpenRouter' },
  { key: 'left',   match: ['ollama'],                   color: '#10B981', label: 'Ollama'     },
  { key: 'top',    match: ['relay', 'cloud', 'nano'],   color: '#4F46E5', label: 'Relay'      },
  { key: 'bottom', match: ['webllm', 'local', 'openai', 'anthropic'], color: '#64748B', label: 'Other' },
];

const S = 60; // half-size → 120px cube

const TRANSFORMS: Record<string, string> = {
  front:  `rotateY(0deg)    translateZ(${S}px)`,
  right:  `rotateY(90deg)   translateZ(${S}px)`,
  back:   `rotateY(180deg)  translateZ(${S}px)`,
  left:   `rotateY(-90deg)  translateZ(${S}px)`,
  top:    `rotateX(90deg)   translateZ(${S}px)`,
  bottom: `rotateX(-90deg)  translateZ(${S}px)`,
};

const FREE_AI = [
  { name: 'Groq',        desc: 'Free · fast · great for code',  url: 'https://console.groq.com/keys',   color: '#F55036' },
  { name: 'Google AI',   desc: 'Free quota · Gemini Flash',      url: 'https://aistudio.google.com',     color: '#4285F4' },
  { name: 'OpenRouter',  desc: 'Free models (Gemini, Llama…)',   url: 'https://openrouter.ai/keys',       color: '#7C3AED' },
  { name: 'Ollama',      desc: 'Local · 100% free · no limit',   url: 'https://ollama.com',               color: '#10B981' },
];

interface Props {
  currentProvider: string | null;
  attempts: ProviderAttempt[];
  allFailed?: boolean;
  onOpenSettings?: () => void;
}

function matches(providerName: string, keys: string[]): boolean {
  const l = providerName.toLowerCase();
  return keys.some(k => l.includes(k));
}

export default function AIRubiksCube({ currentProvider, attempts, allFailed, onOpenSettings }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <style>{`
        @keyframes rubik-spin {
          from { transform: rotateX(-18deg) rotateY(0deg);   }
          to   { transform: rotateX(-18deg) rotateY(360deg); }
        }
        @keyframes face-pulse {
          0%,100% { filter: brightness(1.3) saturate(1.2); }
          50%      { filter: brightness(2.1) saturate(1.8); }
        }
      `}</style>

      <AnimatePresence mode="wait">
        {allFailed ? (
          <motion.div key="panel"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-[300px] shadow-2xl">
            <p className="text-sm font-bold text-white mb-1">No AI available</p>
            <p className="text-xs text-gray-400 mb-4">Add a free API key to unlock AI generation:</p>
            <div className="space-y-2 mb-4">
              {FREE_AI.map(ai => (
                <a key={ai.name} href={ai.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ai.color }} />
                    <div>
                      <p className="text-xs font-semibold text-white">{ai.name}</p>
                      <p className="text-[10px] text-gray-400">{ai.desc}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
            {onOpenSettings && (
              <button onClick={onOpenSettings}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors">
                <Settings className="w-3.5 h-3.5" />Open Settings to add a key
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="cube" className="flex flex-col items-center gap-8">
            {/* 3D cube */}
            <div style={{ perspective: 480, width: S * 2, height: S * 2 }}>
              <div style={{
                width: S * 2, height: S * 2,
                position: 'relative', transformStyle: 'preserve-3d',
                animation: 'rubik-spin 3.5s linear infinite',
              }}>
                {FACES.map(({ key, match, color }) => {
                  const attempt = attempts.find(a => matches(a.name, match));
                  const isCurrent = currentProvider ? matches(currentProvider, match) : false;
                  const status = isCurrent ? 'trying' : attempt?.status ?? 'idle';
                  return (
                    <div key={key} style={{
                      position: 'absolute', inset: 0,
                      transform: TRANSFORMS[key],
                      background: color,
                      opacity: status === 'failed' ? 0.18 : status === 'trying' ? 1 : status === 'ok' ? 0.8 : 0.5,
                      animation: status === 'trying' ? 'face-pulse 0.75s ease-in-out infinite' : undefined,
                      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: 7,
                      boxSizing: 'border-box',
                      border: isCurrent ? '2px solid rgba(255,255,255,0.9)' : '2px solid rgba(0,0,0,0.35)',
                    }}>
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Provider status */}
            <div className="flex flex-col items-center gap-3">
              <motion.p key={currentProvider ?? 'idle'}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="text-sm text-white">
                {currentProvider
                  ? <>Trying <span className="text-cyan-400 font-semibold">{currentProvider}</span>…</>
                  : <span className="text-gray-500">Connecting to AI…</span>}
              </motion.p>

              {attempts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
                  {attempts.map((a, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      a.status === 'trying' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                      a.status === 'ok'     ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                             'bg-white/5 text-gray-500 border border-white/5 line-through'
                    }`}>
                      {a.status === 'trying' ? '⟳' : a.status === 'ok' ? '✓' : '✕'} {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
