import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";
import { MANIFEST_PROVIDERS } from "../constants/appConstants";

const APP_TYPES = ["phone", "desktop", "game", "terminal", "music", "art"] as const;

interface Props {
  newAppType: string;
  setNewAppType: (t: string) => void;
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  canSuggest: boolean;
  isLoading: boolean;
  isBuilding: boolean | string | null;
  isManifesting: boolean;
  aiProvider: string;
  setAiProvider: (p: any) => void;
  setSelectedModel: (m: string) => void;
  activeProvider: string;
  onManifest: () => void;
}

export function BottomBar({
  newAppType, setNewAppType, input, setInput, inputRef,
  canSuggest, isLoading, isBuilding, isManifesting,
  aiProvider, setAiProvider, setSelectedModel, activeProvider, onManifest,
}: Props) {
  const [showDrop, setShowDrop] = useState(false);
  const mobileDropRef = useRef<HTMLDivElement>(null);
  const desktopDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDrop) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!mobileDropRef.current?.contains(t) && !desktopDropRef.current?.contains(t)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showDrop]);

  const switchProvider = (id: string) => {
    setAiProvider(id);
    const p = MANIFEST_PROVIDERS.find(mp => mp.id === id);
    if (p) setSelectedModel(p.model);
    localStorage.setItem("manifest_provider", id);
    setShowDrop(false);
  };

  const active = MANIFEST_PROVIDERS.find(p => p.id === aiProvider) || MANIFEST_PROVIDERS[0];
  const isFallback = activeProvider !== aiProvider;

  const ProviderMenu = () => (
    <AnimatePresence>
      {showDrop && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }} transition={{ duration: 0.1 }}
          className="absolute bottom-full right-0 mb-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50"
        >
          {MANIFEST_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => switchProvider(p.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${aiProvider === p.id ? "bg-indigo-500/20 text-indigo-400" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
              <p.Icon className="w-4 h-4 shrink-0" />{p.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[100] bg-gray-900 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center sm:h-[68px]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>

      {/* App type chips + mobile provider */}
      <div className="flex items-center gap-2 px-3 sm:px-4 pt-2 sm:py-0 sm:shrink-0">
        <div className="flex gap-1.5 overflow-x-auto flex-1 sm:flex-none"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {APP_TYPES.map(type => (
            <button key={type} onClick={() => setNewAppType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${newAppType === type ? "bg-indigo-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"}`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <div ref={mobileDropRef} className="relative shrink-0 sm:hidden">
          <button onClick={() => setShowDrop(v => !v)}
            className="flex items-center justify-center w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-all">
            <active.Icon className="w-4 h-4" />
          </button>
          <ProviderMenu />
        </div>
      </div>

      {/* Input + desktop provider + manifest */}
      <div className="flex items-center gap-2 px-3 sm:px-4 pt-1.5 pb-1 sm:py-0 flex-1 min-w-0">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onManifest()}
          placeholder={`Describe your ${newAppType} app...`}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          name="app-description"
          className="flex-1 min-w-0 min-h-[44px] bg-gray-800 border border-gray-700 rounded-lg px-3 sm:px-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        <div ref={desktopDropRef} className="relative shrink-0 hidden sm:block">
          <button onClick={() => setShowDrop(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-all ${
              isFallback
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                : "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 hover:text-white"
            }`}>
            <active.Icon className="w-3.5 h-3.5" />
            <span className="max-w-[80px] truncate">{isFallback ? activeProvider : active.label}</span>
            {isFallback && <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">↻</span>}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
          <ProviderMenu />
        </div>

        <button onClick={onManifest}
          disabled={!canSuggest || isLoading || !!isBuilding || isManifesting || !input.trim()}
          className="flex items-center gap-2 px-4 h-[44px] bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-all shrink-0">
          {isManifesting || isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span className="hidden sm:inline">MANIFEST</span>
        </button>
      </div>
    </footer>
  );
}
