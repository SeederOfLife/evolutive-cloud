import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Monitor, Code, FileJson, Loader2, RefreshCw, Zap } from "lucide-react";
import { Suggestion } from "../types";

interface Props {
  showPreview: boolean;
  activeFile: string;
  code: string;
  setCode: (v: string) => void;
  suggestion: Suggestion;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  srcDoc: string;
  deviceFrame: "phone" | "desktop";
  isTruncated: boolean;
  onRefine?: (feedback: string) => Promise<string>;
  isRefining: boolean;
  isFixing: boolean;
  handleSmartFix: (err?: string) => void;
  lastError: string | null;
  runtimeStatus: string;
}

export function PlayerWorkspace({
  showPreview, activeFile, code, setCode, suggestion,
  iframeRef, srcDoc, deviceFrame, isTruncated, onRefine,
  isRefining, isFixing, handleSmartFix, lastError, runtimeStatus,
}: Props) {
  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      {/* EDITOR */}
      <div className={`flex flex-col bg-[#050508] transition-all duration-700 ${showPreview ? "w-0 md:w-[35%] opacity-0 md:opacity-100 hidden md:flex" : "flex-1 opacity-100"}`}>
        <div className="h-12 border-b border-white/5 flex items-center gap-px bg-black/20 shrink-0">
          <div className="h-full px-6 flex items-center gap-3 bg-white/5 border-r border-white/5">
            <Code className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-indigo-100">{activeFile}</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          {activeFile === "src/App.tsx" ? (
            <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
              className="w-full h-full bg-transparent p-4 font-mono text-[13px] text-indigo-100/70 outline-none resize-none leading-relaxed" />
          ) : (
            <div className="p-10 font-mono text-[12px] text-white/40 uppercase tracking-[4px] leading-relaxed">
              <FileJson className="w-10 h-10 mb-6 opacity-20" />
              {JSON.stringify({ id: suggestion.id, status: suggestion.status, created_at: suggestion.created_at, content: suggestion.content }, null, 2)}
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW */}
      <div className={`flex flex-col bg-[#020205] transition-all duration-500 ${showPreview ? "flex-1" : "w-0 opacity-0 overflow-hidden hidden md:flex"}`}>
        <div className="h-12 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0">
          <div className="flex items-center gap-4">
            <Monitor className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] font-black uppercase tracking-[4px] text-white/60">Live Preview</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[4px] text-white/30">{deviceFrame.toUpperCase()} MODE</span>
          </div>
        </div>
        <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden p-2 sm:p-4 lg:p-6">
          <div className={`relative transition-all duration-700 ${
            deviceFrame === "phone"
              ? "w-full max-w-[380px] aspect-[9/19] max-h-full rounded-[2.5rem] sm:rounded-[3.5rem] border-[10px] sm:border-[14px] border-white/10 shadow-[0_60px_120px_rgba(0,0,0,0.6)] bg-black overflow-hidden"
              : "w-full h-full rounded-2xl lg:rounded-[3rem] border border-white/10 bg-black shadow-[0_40px_80px_rgba(0,0,0,0.4)]"
          }`}>
            {deviceFrame === "phone" && (
              <div className="absolute top-0 left-0 w-full h-8 sm:h-10 flex items-center justify-between px-8 sm:px-10 z-10 pointer-events-none">
                <div className="text-[9px] sm:text-[11px] font-black text-white/40 font-mono tracking-tighter">9:41</div>
                <div className="flex gap-1.5 items-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                  </div>
                  <div className="w-5 h-2.5 rounded-[2px] border border-white/20 relative">
                    <div className="absolute top-0.5 left-0.5 bottom-0.5 right-1 bg-white/40 rounded-[1px]" />
                  </div>
                </div>
              </div>
            )}
            <iframe ref={iframeRef} srcDoc={srcDoc}
              className="w-full h-full border-none bg-black" title="app-player"
              sandbox="allow-scripts"
            />
            {deviceFrame === "phone" && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 sm:w-36 h-1.5 bg-white/10 rounded-full z-10 pointer-events-none" />
            )}
          </div>
        </div>
        {!code && (
          <div className="absolute inset-0 bg-[#020205] flex flex-col items-center justify-center p-10 text-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-6" />
            <span className="text-[10px] font-black uppercase tracking-[5px] text-white/40">Awaiting Build</span>
          </div>
        )}
        <div className="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { if (iframeRef.current) iframeRef.current.srcdoc = srcDoc; }}
            className="p-4 bg-white/5 hover:bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl transition-all text-white/40 hover:text-white shadow-2xl hover:scale-110 active:scale-90"
            title="Reload"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <AnimatePresence>
          {isTruncated && onRefine && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-16 left-0 right-0 flex justify-center z-20">
              <button onClick={() => handleSmartFix()} disabled={isRefining || isFixing}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white shadow-xl transition-all active:scale-95">
                {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Fix with AI
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {lastError && onRefine && !isRefining && !isFixing && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-16 left-0 right-0 flex justify-center z-20">
              <button onClick={() => handleSmartFix(lastError ?? undefined)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold text-white shadow-xl transition-all active:scale-95">
                <Zap className="w-4 h-4" />
                Fix with AI
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute bottom-4 left-4 text-[8px] font-mono text-white/10 max-w-[200px] truncate">{runtimeStatus}</div>
      </div>
    </div>
  );
}
