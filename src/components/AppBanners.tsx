import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Zap, Cpu, Loader2 } from 'lucide-react';

interface Props {
  aiError: string | null;
  setAiError: (e: string | null) => void;
  isRateLimited: boolean;
  rateLimitCountdown: number;
  maxRateLimitCountdownRef: React.RefObject<number>;
  webLlmProgress: string;
  showNoGPUBanner: boolean;
  setShowNoGPUBanner: (v: boolean) => void;
  isIOS: boolean;
  aiProvider: string;
  onOpenSettings: () => void;
}

export default function AppBanners({
  aiError, setAiError, isRateLimited, rateLimitCountdown, maxRateLimitCountdownRef,
  webLlmProgress, showNoGPUBanner, setShowNoGPUBanner, isIOS, aiProvider, onOpenSettings,
}: Props) {
  return (
    <>
      <AnimatePresence>
        {aiError && !isRateLimited && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`flex-none border-b px-4 py-2.5 flex items-center justify-between overflow-hidden gap-3 ${
              aiError.startsWith('All AI providers exhausted')
                ? 'bg-indigo-950/60 border-indigo-700/30'
                : 'bg-red-900/40 border-red-800'
            }`}
          >
            {aiError.startsWith('All AI providers exhausted') ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-indigo-200 font-medium leading-snug">No AI provider available</p>
                    <p className="text-[11px] text-indigo-400 mt-0.5 leading-snug">
                      Add a free Google Gemini key at aistudio.google.com — takes 30 seconds, no credit card needed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { onOpenSettings(); setAiError(null); }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap"
                  >
                    Open Settings
                  </button>
                  <button onClick={() => setAiError(null)} className="text-indigo-500 hover:text-indigo-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-red-300 truncate">{aiError}</p>
                <button onClick={() => setAiError(null)} className="ml-2 text-red-400 hover:text-red-200 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRateLimited && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-none bg-amber-950/60 border-b border-amber-700/30 px-4 py-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-amber-300 font-medium">
                Gemini rate limit — ready again in{' '}
                <span className="font-black text-amber-200 tabular-nums">{rateLimitCountdown}s</span>
              </p>
              <span className="text-[10px] font-mono text-amber-600 uppercase tracking-widest">20 req/min</span>
            </div>
            <div className="h-1 w-full bg-amber-900/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                animate={{
                  width: (maxRateLimitCountdownRef.current ?? 0) > 0
                    ? `${Math.round((((maxRateLimitCountdownRef.current ?? 0) - rateLimitCountdown) / (maxRateLimitCountdownRef.current ?? 1)) * 100)}%`
                    : '0%',
                }}
                transition={{ duration: 0.9, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {webLlmProgress && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-none bg-indigo-950/80 border-b border-indigo-700/40 px-4 py-3 overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-1.5">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <p className="text-sm text-indigo-300 font-medium">
                Downloading free local AI — one-time setup, ~500MB
              </p>
            </div>
            <p className="text-xs text-indigo-500 font-mono truncate ml-7">{webLlmProgress}</p>
            <div className="h-1 mt-2 w-full bg-indigo-900/40 rounded-full overflow-hidden ml-7" style={{ width: 'calc(100% - 28px)' }}>
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ width: '100%' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNoGPUBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-none bg-indigo-950/60 border-b border-indigo-700/30 px-4 py-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                <p className="text-sm text-indigo-200 leading-snug min-w-0">
                  Add a free Google Gemini key to start — 30 seconds, no credit card needed.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { onOpenSettings(); setShowNoGPUBanner(false); }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap"
                >
                  Add Key
                </button>
                <button onClick={() => setShowNoGPUBanner(false)} className="text-indigo-500 hover:text-indigo-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isIOS && aiProvider === 'web-llm' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-none bg-orange-950/60 border-b border-orange-700/30 px-4 py-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Cpu className="w-4 h-4 text-orange-400 shrink-0" />
                <p className="text-sm text-orange-200 leading-snug min-w-0">
                  Local AI is not supported on iOS Safari. Add a free Gemini key or connect Ollama from your computer.
                </p>
              </div>
              <button
                onClick={onOpenSettings}
                className="shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap"
              >
                Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
