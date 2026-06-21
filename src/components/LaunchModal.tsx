import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronUp, X, Globe, Lock, MessageSquare, Activity, Layers,
  GitFork, Loader2, Droplets, Zap, Timer,
} from "lucide-react";
import { useAutoWater } from "../hooks/useAutoWater";
import { AppSandbox } from "./AppSandbox";
import { AIProgress } from "./AIProgress";
import type { AIStageIndex } from "./AIProgress";
import AIRubiksCube, { type ProviderAttempt } from "./AIRubiksCube";
import { isCodeBalanced } from "../utils/sandboxUtils";
import WaterDialog from "./WaterDialog";
import DiffViewer from "./DiffViewer";
import { ShareMenu } from "./ShareMenu";
import { ChatInputBar, ChatMessages } from "./ChatPanel";
import type { Suggestion, AppEvolution } from "../types";
import type { FocusId, DepthId } from "../services/watering";

interface LaunchModalProps {
  suggestion: Suggestion;
  currentUserId?: string;
  onClose: () => void;
  onVote: (id: string, votes: number) => void;
  onFork?: () => void;
  onToggleVisibility?: (vis: 'public' | 'private') => void;
  onWater?: (focus: FocusId, depth: DepthId, note: string) => void;
  onAutoWaterChange?: (enabled: boolean, interval: number, times: number, focus: string, note: string) => void;
  isWatering?: boolean;
  isFreeProvider?: boolean;
  quota?: number;
  pendingEvolution?: AppEvolution | null;
  onClearEvolution?: () => void;
  showWaterDialog?: boolean;
  setShowWaterDialog?: (v: boolean) => void;
  onRefine?: (message: string, code: string, onProviderSwitch?: (label: string) => void) => Promise<string>;
  onOpenSettings?: () => void;
  chatProvider?: string;
  chatProviderOptions?: { id: string; label: string }[];
  onChatProviderSwitch?: (id: string) => void;
}

export function LaunchModal({
  suggestion, currentUserId, onClose, onVote, onFork, onToggleVisibility,
  onWater, onAutoWaterChange, isWatering, isFreeProvider, quota, pendingEvolution, onClearEvolution,
  showWaterDialog, setShowWaterDialog, onRefine, onOpenSettings,
  chatProvider, chatProviderOptions, onChatProviderSwitch,
}: LaunchModalProps) {
  const [code, setCode] = useState(suggestion.built_code || "");
  const [lastError, setLastError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixStage, setFixStage] = useState<AIStageIndex>(0);
  const [providerAttempts, setProviderAttempts] = useState<ProviderAttempt[]>([]);
  const [allProvidersFailed, setAllProvidersFailed] = useState(false);

  const isTruncated = useMemo(() => {
    if (!code) return false;
    const cleaned = code
      .replace(/^\s*import\b[^;]*?(?:from\s+['"][^'"]+['"])?\s*;?\s*$/gm, '')
      .trim();
    return !isCodeBalanced(cleaned);
  }, [code]);
  const { countdown, done: awDone, isRunning: awRunning, stop: awStop } = useAutoWater(suggestion, onWater);

  const [voted, setVoted] = useState(false);
  const [showVotePop, setShowVotePop] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const desktopChatContainerRef = useRef<HTMLDivElement>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement>(null);
  const sendMessageRef = useRef<(msg: string) => void>(() => {});

  const handleCodeError = (msg: string) => {
    setLastError(msg);
    setMessages(prev => {
      if (prev.at(-1)?.text.startsWith("⚠️")) return prev;
      return [...prev, { role: "ai", text: `⚠️ ${msg}` }];
    });
    setShowChat(true);
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "EVO_ERROR") handleCodeError(e.data.msg);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const scrollToBottom = (el: HTMLDivElement | null) => {
      if (!el) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) el.scrollTop = el.scrollHeight;
    };
    scrollToBottom(desktopChatContainerRef.current);
    scrollToBottom(mobileChatContainerRef.current);
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text?.trim() || !onRefine || isFixing) return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsFixing(true);
    setFixStage(0);
    setProviderAttempts([]);
    setAllProvidersFailed(false);
    let lastLabel = '';
    const t1 = setTimeout(() => setFixStage(1), 700);
    const t2 = setTimeout(() => setFixStage(2), 1800);
    const t3 = setTimeout(() => setFixStage(3), 3500);
    try {
      const newCode = await onRefine(text, code, (label) => {
        setProviderAttempts(prev => {
          const updated = prev.map(a =>
            a.name === lastLabel ? { ...a, status: 'failed' as const } : a
          );
          return [...updated, { name: label, status: 'trying' as const }];
        });
        lastLabel = label;
      });
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setFixStage(4);
      setProviderAttempts(prev =>
        prev.map(a => a.name === lastLabel ? { ...a, status: 'ok' as const } : a)
      );
      if (newCode) {
        setCode(newCode);
        setLastError(null);
        await new Promise(r => setTimeout(r, 300));
        setFixStage(5);
        await new Promise(r => setTimeout(r, 300));
        setFixStage(6);
        await new Promise(r => setTimeout(r, 500));
        setMessages(prev => [...prev, { role: "ai", text: "Done — app updated." }]);
      }
    } catch (e: any) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      if (e.message?.includes('All AI providers exhausted')) {
        setAllProvidersFailed(true);
        setMessages(prev => [...prev, { role: "ai", text: "⚡ No AI available — add a free Groq or Google key in Settings and try again." }]);
        setShowChat(true);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: "Error: " + e.message }]);
      }
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => { sendMessageRef.current = sendMessage; }); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    setShowVotePop(true);
    onVote(suggestion.id, suggestion.votes || 0);
    setTimeout(() => setShowVotePop(false), 1200);
  };

  const title = suggestion.content.length > 45 ? suggestion.content.substring(0, 45) + "…" : suggestion.content;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black flex flex-col"
      style={{ height: '100dvh' }}
    >
      {/* Floating close button */}
      <button onClick={onClose} aria-label="Close"
        className="absolute top-3 right-3 z-[9999] w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all active:scale-90 shadow-lg">
        <X className="w-5 h-5" />
      </button>

      {/* Title bar */}
      <div className="flex-none h-14 sm:h-12 bg-gray-900/95 border-b border-gray-800 flex items-center pl-3 pr-16 gap-2 shrink-0">
        <span className="flex-1 text-sm font-semibold text-white truncate min-w-0">
          {title}
          {suggestion.parent_id && <span className="ml-2 text-[10px] text-indigo-400/60 font-mono font-normal hidden sm:inline">forked from #{suggestion.parent_id.substring(0, 8)}</span>}
        </span>

        {onToggleVisibility && currentUserId && suggestion.user_id === currentUserId && !suggestion.id.startsWith('seed_') && (
          <button onClick={() => onToggleVisibility(suggestion.visibility === 'public' ? 'private' : 'public')}
            title={suggestion.visibility === 'public' ? 'Make private' : 'Make public'}
            className="flex w-8 h-8 rounded-lg items-center justify-center bg-gray-800 text-gray-400 hover:text-white transition-all shrink-0">
            {suggestion.visibility === 'public' ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
          </button>
        )}

        {onWater && setShowWaterDialog && (
          <button onClick={() => setShowWaterDialog(true)} title="Water this app — evolve it with AI" disabled={isWatering}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all shrink-0 ${isWatering ? 'bg-cyan-500/20 text-cyan-400 animate-pulse cursor-wait' : 'bg-gray-800 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300'}`}>
            <Droplets className="w-3.5 h-3.5" />
            {isWatering ? 'Evolving…' : 'Water'}
          </button>
        )}

        {!suggestion.id.startsWith('seed_') && <ShareMenu appId={suggestion.id} appTitle={suggestion.content} />}

        {onFork && (
          <button onClick={onFork} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-gray-800 text-gray-400 hover:text-white transition-all shrink-0">
            <GitFork className="w-3.5 h-3.5" />Fork
          </button>
        )}

        <div className="relative shrink-0">
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleVote}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all ${voted ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
            <ChevronUp className="w-3.5 h-3.5" />
            {(suggestion.votes || 0) + (voted ? 1 : 0)}
          </motion.button>
          <AnimatePresence>
            {showVotePop && (
              <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -20 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-black text-indigo-400 pointer-events-none">+1</motion.div>
            )}
          </AnimatePresence>
        </div>

        {suggestion.refinement_questions && suggestion.refinement_questions.length > 0 && (
          <button onClick={() => { setShowJourney(p => !p); setShowPlan(false); setShowRoadmap(false); }}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${showJourney ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="View Build Journey">
            <Activity className="w-4 h-4" />
          </button>
        )}

        {suggestion.plan && (
          <button onClick={() => { setShowPlan(p => !p); setShowJourney(false); setShowRoadmap(false); }}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${showPlan ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="View Goal Plan">
            <Layers className="w-4 h-4" />
          </button>
        )}

        {suggestion.roadmap && (
          <button onClick={() => { setShowRoadmap(p => !p); setShowPlan(false); setShowJourney(false); }}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 text-sm ${showRoadmap ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="Growth Roadmap">🌱</button>
        )}

        {onRefine && (
          <button onClick={() => setShowChat(p => !p)}
            className={`hidden sm:flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${showChat ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="Toggle AI Chat">
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Auto-water countdown bar */}
      <AnimatePresence>
        {awRunning && countdown !== null && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex-none overflow-hidden">
            <div className="h-8 bg-cyan-950/60 border-b border-cyan-500/20 flex items-center px-4 gap-2 text-xs">
              <Timer className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-cyan-400">
                Next watering in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </span>
              {(suggestion.autoWaterTimes ?? 0) > 0 && (
                <span className="text-gray-500">· {awDone}/{suggestion.autoWaterTimes} done</span>
              )}
              <button onClick={awStop} className="ml-auto text-gray-600 hover:text-gray-400 transition-colors" title="Stop auto-water">
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan panel */}
      <AnimatePresence>
        {showPlan && suggestion.plan && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-indigo-500/15">
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-indigo-400 mb-2">Built from this plan</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                {suggestion.plan.coreNeed && <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Need · </span><span className="text-[10px] text-white/60">{suggestion.plan.coreNeed}</span></div>}
                {suggestion.plan.targetUser && <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">For · </span><span className="text-[10px] text-white/60">{suggestion.plan.targetUser}</span></div>}
                {suggestion.plan.visualStyle && <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Style · </span><span className="text-[10px] text-white/60">{suggestion.plan.visualStyle}</span></div>}
                {suggestion.plan.features.length > 0 && <div className="col-span-2 sm:col-span-3"><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Features · </span><span className="text-[10px] text-white/60">{suggestion.plan.features.join(" · ")}</span></div>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roadmap panel */}
      <AnimatePresence>
        {showRoadmap && suggestion.roadmap && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-emerald-500/15">
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-emerald-400 mb-3 flex items-center gap-1.5">🌱 Growth Roadmap</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[2px] text-emerald-400/80 mb-1.5">✅ Growing now</p>
                  {(suggestion.roadmap.now || []).map((item, i) => <p key={i} className="text-[10px] text-white/60 leading-relaxed">• {item}</p>)}
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[2px] text-cyan-400/80 mb-1.5">🌱 Next watering</p>
                  {(suggestion.roadmap.next || []).map((item, i) => <p key={i} className="text-[10px] text-white/40 leading-relaxed">• {item}</p>)}
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[2px] text-indigo-400/80 mb-1.5">🔮 Future growth</p>
                  {(suggestion.roadmap.future || []).map((item, i) => <p key={i} className="text-[10px] text-white/30 leading-relaxed">• {item}</p>)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journey panel */}
      <AnimatePresence>
        {showJourney && suggestion.refinement_questions && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-indigo-500/15">
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-indigo-400 mb-2">Build Journey</p>
              <div className="space-y-2">
                {suggestion.refinement_questions.map((q, i) => {
                  const answer = suggestion.refinement_answers?.[i];
                  return (
                    <div key={i} className="flex gap-2">
                      <span className={`text-[8px] font-black uppercase shrink-0 mt-0.5 ${q.priority === "Critical" ? "text-red-400/60" : "text-orange-400/60"}`}>
                        {q.priority === "Critical" ? "!" : "↑"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-white/50">{q.question}</p>
                        {answer ? <p className="text-[10px] text-indigo-300/80 font-medium">→ {answer}</p> : <p className="text-[10px] text-white/20 italic">skipped</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative min-w-0">
          <AppSandbox code={code} appType={suggestion.app_type} className="absolute inset-0 w-full h-full" onError={handleCodeError} />

          {/* Truncation overlay — amber, prominent, centered */}
          <AnimatePresence>
            {isTruncated && !isFixing && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-[500] bg-black/50 backdrop-blur-sm pointer-events-none"
              >
                <div className="flex flex-col items-center gap-3 pointer-events-auto px-6 text-center">
                  <p className="text-xs font-bold text-amber-300 max-w-[220px] leading-snug">
                    Code was truncated — app is incomplete
                  </p>
                  <button
                    onClick={() => sendMessage("The generated code was truncated (incomplete). Please generate a COMPLETE working version. Simplify the design if needed to fit within your response limit.")}
                    className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 rounded-xl text-sm font-bold text-black shadow-2xl transition-all active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    Fix with AI
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Runtime error button — red, bottom */}
          <AnimatePresence>
            {!isTruncated && lastError && !isFixing && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-4 left-0 right-0 flex justify-center z-[9999] pointer-events-none">
                <button
                  onClick={() => sendMessage(`Fix this runtime error: ${lastError}`)}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold text-white shadow-xl transition-all active:scale-95">
                  <Zap className="w-4 h-4" />Fix with AI
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile chat FAB */}
          {onRefine && (
            <button onClick={() => setShowChat(p => !p)}
              className={`sm:hidden absolute bottom-4 right-4 z-20 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90 ${showChat ? "bg-indigo-600 text-white" : "bg-gray-900/80 backdrop-blur-sm border border-white/10 text-white"}`}>
              <MessageSquare className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Desktop side chat */}
        <div className="hidden sm:flex shrink-0">
          <AnimatePresence>
            {showChat && onRefine && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                className="flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden">
                <div className="flex-none px-4 py-2.5 border-b border-gray-800 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-[3px] text-white/50">AI Chat</span>
                  {isFixing && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                </div>
                <ChatMessages messages={messages} containerRef={desktopChatContainerRef} />
                <ChatInputBar lastError={lastError} isFixing={isFixing} onSend={sendMessage}
                  aiProvider={chatProvider} providerOptions={chatProviderOptions} onProviderSwitch={onChatProviderSwitch} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* AIProgress — main loading overlay */}
      <AnimatePresence>
        {isFixing && <AIProgress stage={fixStage} label="Fixing" highZ prompt={title} />}
      </AnimatePresence>

      {/* Rubik's cube popup — only when switching providers or all failed */}
      <AnimatePresence>
        {(providerAttempts.length > 1 || allProvidersFailed) && (
          <AIRubiksCube
            currentProvider={providerAttempts.find(a => a.status === 'trying')?.name ?? null}
            attempts={providerAttempts}
            allFailed={allProvidersFailed}
            onDismiss={() => setAllProvidersFailed(false)}
            onOpenSettings={onOpenSettings}
          />
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet chat */}
      <AnimatePresence>
        {showChat && onRefine && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="sm:hidden absolute bottom-0 left-0 right-0 z-[200] flex flex-col bg-gray-950 rounded-t-2xl border-t border-gray-800 shadow-2xl overflow-hidden"
            style={{ height: "70%" }}>
            <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-gray-700" /></div>
            <div className="flex-none px-4 py-2 border-b border-gray-800 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[3px] text-white/50">AI Chat</span>
              <div className="flex items-center gap-2">
                {isFixing && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                <button onClick={() => setShowChat(false)} className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <ChatMessages messages={messages} containerRef={mobileChatContainerRef} />
            <ChatInputBar lastError={lastError} isFixing={isFixing} onSend={sendMessage}
              aiProvider={chatProvider} providerOptions={chatProviderOptions} onProviderSwitch={onChatProviderSwitch} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Water dialog */}
      <AnimatePresence>
        {showWaterDialog && onWater && setShowWaterDialog && (
          <WaterDialog suggestion={suggestion} quota={quota ?? 100} isFree={isFreeProvider ?? false}
            onWater={(focus, depth, note) => { setShowWaterDialog(false); onWater(focus, depth, note); }}
            onClose={() => setShowWaterDialog(false)}
            onAutoWaterChange={onAutoWaterChange} />
        )}
      </AnimatePresence>

      {/* Diff viewer */}
      <AnimatePresence>
        {pendingEvolution && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-xl h-[70vh] flex flex-col overflow-hidden shadow-2xl"
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}>
              <DiffViewer
                evolution={pendingEvolution}
                onApply={() => { setCode(pendingEvolution.code); onClearEvolution?.(); }}
                onRevert={async () => {
                  if (pendingEvolution.prevCode) await onWater?.('ux' as FocusId, 'gentle' as DepthId, 'Revert to previous version');
                  onClearEvolution?.();
                }}
                onRetry={() => { onClearEvolution?.(); setShowWaterDialog?.(true); }}
                onApplyAndFix={() => {
                  setCode(pendingEvolution.code);
                  onClearEvolution?.();
                  // Short delay so code state propagates before sendMessage reads it
                  setTimeout(() => sendMessageRef.current(
                    "The generated code was truncated (incomplete). Please generate a COMPLETE working version. Simplify the design if needed."
                  ), 100);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
