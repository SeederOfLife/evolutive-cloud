import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Database, MessageCircle, History, ArrowRight,
  Code, FileJson, FolderTree, Settings, ChevronDown, Loader2, Zap,
  FolderDown, FileDown,
} from "lucide-react";
import { Suggestion } from "../types";
import { buildProjectFiles, projectName } from "../services/projectScaffold";
import { saveProjectToFolder, downloadProjectZip, fsAccessSupported } from "../services/exportProject";
import { GithubPushButton } from "./GithubPushButton";

export type CombinedEntry = {
  timestamp: string;
  code: string;
  label: string;
  summary?: string;
  source: "evolution" | "refinement";
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const SIDE_TABS = [
  { id: "files", icon: FolderTree },
  { id: "chat",  icon: MessageCircle },
  { id: "history", icon: History },
  { id: "settings", icon: Settings },
] as const;

type TabId = (typeof SIDE_TABS)[number]["id"];

interface Props {
  suggestion: Suggestion;
  onClose: () => void;
  activeSideTab: TabId;
  setActiveSideTab: (t: TabId) => void;
  isExplorerOpen: boolean;
  setIsExplorerOpen: (v: boolean) => void;
  activeFile: string;
  setActiveFile: (f: string) => void;
  setShowPreview: (v: boolean) => void;
  code: string;
  isSaving: boolean;
  handleSave: () => void;
  chatMessages: { role: "user" | "assistant"; content: string }[];
  isRefining: boolean;
  isFixing: boolean;
  refineInput: string;
  setRefineInput: (v: string) => void;
  handleRefine: () => void;
  handleSmartFix: (err?: string) => void;
  isTruncated: boolean;
  onRefine?: (feedback: string) => Promise<string>;
  combinedHistory: CombinedEntry[];
  isRestoring: boolean;
  handleRestore: (entry: CombinedEntry) => void;
}

export function PlayerSidebar({
  suggestion, onClose, activeSideTab, setActiveSideTab, isExplorerOpen,
  setIsExplorerOpen, activeFile, setActiveFile, setShowPreview,
  code, isSaving, handleSave, chatMessages, isRefining, isFixing,
  refineInput, setRefineInput, handleRefine, handleSmartFix, isTruncated,
  onRefine, combinedHistory, isRestoring, handleRestore,
}: Props) {
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const runExport = async (mode: "folder" | "zip") => {
    try {
      const files = buildProjectFiles(suggestion, code);
      if (mode === "folder") {
        const ok = await saveProjectToFolder(files);
        setExportMsg(ok ? "Saved to folder ✓" : "Folder API unavailable — use .zip");
      } else {
        downloadProjectZip(files, projectName(suggestion));
        setExportMsg("Downloaded .zip ✓");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setExportMsg(`Export failed: ${e.message}`);
    }
    setTimeout(() => setExportMsg(null), 3500);
  };

  return (
    <>
      {/* ACTIVITY BAR */}
      <div className="hidden md:flex w-16 border-r border-white/5 bg-[#020205] flex-col items-center py-6 gap-8 shrink-0 relative z-50">
        <button onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all mb-4">
          <X className="w-5 h-5" />
        </button>
        {SIDE_TABS.map((btn) => (
          <button key={btn.id}
            onClick={() => { setActiveSideTab(btn.id); setIsExplorerOpen(true); }}
            className={`relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all ${activeSideTab === btn.id ? "bg-indigo-500/10 text-indigo-400" : "text-white/20 hover:text-white/60"}`}>
            <btn.icon className="w-5 h-5" />
            {activeSideTab === btn.id && <div className="absolute left-0 w-1 h-4 bg-indigo-500 rounded-r-full" />}
          </button>
        ))}
        <div className="mt-auto">
          <button onClick={handleSave} disabled={isSaving || code === suggestion.built_code}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${code === suggestion.built_code ? "bg-white/5 text-white/10" : "bg-white text-black hover:bg-indigo-500 hover:text-white"}`}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SIDEBAR PANEL */}
      <AnimatePresence>
        {isExplorerOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`border-r border-white/5 bg-[#08080a] flex flex-col overflow-hidden shrink-0 z-40 ${typeof window !== "undefined" && window.innerWidth < 768 ? "fixed inset-0 top-14" : ""}`}
          >
            <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-white/5 shrink-0">
              <div className="flex md:hidden items-center gap-2 mr-2">
                {SIDE_TABS.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveSideTab(tab.id)}
                    className={`p-1.5 rounded-lg transition-all ${activeSideTab === tab.id ? "bg-indigo-500 text-white" : "text-white/20"}`}>
                    <tab.icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[3px] text-white/60 truncate">
                {activeSideTab === "files" ? "File_Explorer" : activeSideTab.toUpperCase()}
              </span>
              <button onClick={() => setIsExplorerOpen(false)} className="ml-auto text-white/20 hover:text-white shrink-0">
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              {activeSideTab === "files" && (
                <div className="px-2 space-y-1">
                  {/* Export the app as a real project folder */}
                  <div className="px-1 pb-2 space-y-1.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => runExport("folder")} disabled={!fsAccessSupported()}
                        title={fsAccessSupported() ? "Save to a local folder you can edit" : "Not supported in this browser — use .zip"}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-indigo-500/40 disabled:opacity-30 transition-all">
                        <FolderDown className="w-3.5 h-3.5" /> Folder
                      </button>
                      <button onClick={() => runExport("zip")}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-indigo-500/40 transition-all">
                        <FileDown className="w-3.5 h-3.5" /> .zip
                      </button>
                    </div>
                    {exportMsg && <p className="text-[9px] text-center text-indigo-300/80 font-mono">{exportMsg}</p>}
                    <GithubPushButton suggestion={suggestion} code={code} />
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-white/40 text-[10px]">
                    <ChevronDown className="w-3 h-3" />
                    <span className="font-bold uppercase tracking-widest">APP_ROOT</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    <div className="flex items-center gap-2 px-3 py-2 text-white/40 text-[9px]">
                      <ChevronDown className="w-3 h-3 text-indigo-500/50" />
                      <span className="font-bold uppercase tracking-widest">src</span>
                    </div>
                    <button onClick={() => { setActiveFile("src/App.tsx"); setShowPreview(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-2 rounded-lg text-[10px] font-medium transition-all ${activeFile === "src/App.tsx" ? "bg-indigo-500/20 text-indigo-400" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                      <Code className="w-3.5 h-3.5" /> App.tsx
                    </button>
                    <button onClick={() => { setActiveFile("metadata.json"); setShowPreview(false); }}
                      className={`w-full flex items-center gap-3 px-6 py-2 rounded-lg text-[10px] font-medium transition-all ${activeFile === "metadata.json" ? "bg-indigo-500/20 text-indigo-400" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                      <FileJson className="w-3.5 h-3.5" /> metadata.json
                    </button>
                  </div>
                </div>
              )}

              {activeSideTab === "chat" && (
                <div className="h-full flex flex-col p-4">
                  {isTruncated && onRefine && (
                    <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col gap-2">
                      <p className="text-[10px] text-amber-300 font-semibold leading-snug">Code was truncated — the app is incomplete.</p>
                      <button onClick={() => handleSmartFix()} disabled={isRefining || isFixing}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-[10px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95">
                        {isFixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        Fix with AI
                      </button>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-2">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[90%] p-4 rounded-2xl text-[11px] leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white/5 border border-white/10 text-white/70"}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isRefining && (
                      <div className="flex items-center gap-3 text-white/30 italic text-[10px]">
                        <Loader2 className="w-3 h-3 animate-spin" /> Building...
                      </div>
                    )}
                  </div>
                  <div className="relative group">
                    <input type="text" value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                      placeholder="App feedback..."
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[11px] outline-none group-focus-within:border-indigo-500/50 transition-all font-medium"
                    />
                    <button onClick={() => handleRefine()}
                      className="absolute right-2 top-2 w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-400 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {activeSideTab === "history" && (
                <div className="px-3 py-2 space-y-2">
                  {combinedHistory.length === 0 ? (
                    <p className="text-[10px] text-white/20 text-center py-8 uppercase tracking-widest">No history yet</p>
                  ) : combinedHistory.map((entry, i) => {
                    const vNum = combinedHistory.length - i;
                    const isEvo = entry.source === "evolution";
                    return (
                      <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2 hover:border-indigo-500/25 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${isEvo ? "bg-cyan-500/15 text-cyan-400" : "bg-indigo-500/15 text-indigo-400"}`}>
                            {isEvo ? "💧 Watered" : "✏️ Refined"}
                          </span>
                          <span className="text-[8px] font-mono text-white/25 shrink-0">v{vNum} · {timeAgo(entry.timestamp)}</span>
                        </div>
                        {(entry.summary || entry.label) && (
                          <p className="text-[10px] text-white/50 leading-snug line-clamp-2">{entry.summary || entry.label}</p>
                        )}
                        <button onClick={() => handleRestore(entry)} disabled={isRestoring}
                          className="w-full py-1.5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5">
                          {isRestoring ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Restore this version
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
