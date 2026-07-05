import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAutoWater } from "../hooks/useAutoWater";
import { AIProgress } from "./AIProgress";
import type { AIStageIndex } from "./AIProgress";
import AIRubiksCube, { type ProviderAttempt } from "./AIRubiksCube";
import { isCodeBalanced } from "../utils/sandboxUtils";
import WaterDialog from "./WaterDialog";
import DiffViewer from "./DiffViewer";
import { LaunchHeader } from "./LaunchHeader";
import { LaunchSandboxBody } from "./LaunchSandboxBody";
import type { Suggestion, AppEvolution } from "../types";

function normalizeError(msg: string): string {
  return msg
    .replace(/\(at [^)]+\)/g, '')
    .replace(/:\d+:\d+/g, '')
    .trim()
    .toLowerCase();
}

function summarizeError(msg: string): string {
  const match = msg.match(/((?:Uncaught\s+)?(?:\w+Error|\w+Exception)[^(]+(?:\([^)]*\))?)/);
  return match ? match[1].replace(/^Uncaught\s+/, '').trim() : msg.substring(0, 80);
}
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
  allApps?: Suggestion[];
  onSwitchWaterApp?: (s: Suggestion) => void;
}

export function LaunchModal({
  suggestion, currentUserId, onClose, onVote, onFork, onToggleVisibility,
  onWater, onAutoWaterChange, isWatering, isFreeProvider, quota, pendingEvolution, onClearEvolution,
  showWaterDialog, setShowWaterDialog, onRefine, onOpenSettings,
  chatProvider, chatProviderOptions, onChatProviderSwitch,
  allApps, onSwitchWaterApp,
}: LaunchModalProps) {
  const [code, setCode] = useState(suggestion.built_code || "");
  const [lastError, setLastError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixStage, setFixStage] = useState<AIStageIndex>(0);
  const [providerAttempts, setProviderAttempts] = useState<ProviderAttempt[]>([]);
  const [allProvidersFailed, setAllProvidersFailed] = useState(false);
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
  const prevErrorBeforeFix = useRef<string | null>(null);
  const afterFixRef = useRef(false);

  const isTruncated = useMemo(() => {
    if (!code) return false;
    const cleaned = code.replace(/^\s*import\b[^;]*?(?:from\s+['"][^'"]+['"])?\s*;?\s*$/gm, '').trim();
    return !isCodeBalanced(cleaned);
  }, [code]);

  const { countdown, done: awDone, isRunning: awRunning, stop: awStop } = useAutoWater(suggestion, onWater);

  const handleCodeError = (msg: string) => {
    setLastError(msg);
    setMessages(prev => {
      const last = prev.at(-1)?.text ?? "";
      if (last.startsWith("⚠️") || last.startsWith("↑") || last.startsWith("↻")) return prev;

      if (afterFixRef.current && prevErrorBeforeFix.current) {
        afterFixRef.current = false;
        const same = normalizeError(msg) === normalizeError(prevErrorBeforeFix.current);
        const text = same
          ? "↻ Same error — the fix didn't work. Try describing the problem differently."
          : `↑ Progress! That error is gone, but a new one appeared: ${summarizeError(msg)}`;
        return [...prev, { role: "ai", text }];
      }
      afterFixRef.current = false;
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
    prevErrorBeforeFix.current = lastError;
    afterFixRef.current = false;
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
          const updated = prev.map(a => a.name === lastLabel ? { ...a, status: 'failed' as const } : a);
          return [...updated, { name: label, status: 'trying' as const }];
        });
        lastLabel = label;
      });
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setFixStage(4);
      setProviderAttempts(prev => prev.map(a => a.name === lastLabel ? { ...a, status: 'ok' as const } : a));
      if (newCode) {
        setCode(newCode);
        setLastError(null);
        await new Promise(r => setTimeout(r, 300));
        setFixStage(5);
        await new Promise(r => setTimeout(r, 300));
        setFixStage(6);
        await new Promise(r => setTimeout(r, 500));
        setMessages(prev => [...prev, { role: "ai", text: "Done — app updated." }]);
        afterFixRef.current = true;
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
    } finally { setIsFixing(false); }
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black flex flex-col" style={{ height: '100dvh' }}>

      <LaunchHeader
        title={title} suggestion={suggestion} currentUserId={currentUserId}
        voted={voted} showVotePop={showVotePop} showChat={showChat}
        showPlan={showPlan} showJourney={showJourney} showRoadmap={showRoadmap}
        isWatering={isWatering} countdown={countdown} awDone={awDone} awRunning={awRunning}
        hasWater={!!onWater && !!setShowWaterDialog} hasRefine={!!onRefine}
        onVote={handleVote} onClose={onClose} onFork={onFork}
        onOpenWaterDialog={() => setShowWaterDialog?.(true)}
        onToggleVisibility={onToggleVisibility}
        setShowChat={setShowChat} setShowPlan={setShowPlan}
        setShowJourney={setShowJourney} setShowRoadmap={setShowRoadmap}
        awStop={awStop}
      />

      <LaunchSandboxBody
        code={code} appType={suggestion.app_type} appId={suggestion.id} onError={handleCodeError}
        isTruncated={isTruncated} isFixing={isFixing} lastError={lastError}
        showChat={showChat} setShowChat={setShowChat} hasRefine={!!onRefine}
        sendMessage={sendMessage} messages={messages}
        desktopChatContainerRef={desktopChatContainerRef}
        mobileChatContainerRef={mobileChatContainerRef}
        chatProvider={chatProvider} chatProviderOptions={chatProviderOptions}
        onChatProviderSwitch={onChatProviderSwitch}
      />

      <AnimatePresence>
        {isFixing && <AIProgress stage={fixStage} label="Fixing" highZ prompt={title} />}
      </AnimatePresence>

      <AnimatePresence>
        {(providerAttempts.length > 1 || allProvidersFailed) && (
          <AIRubiksCube
            currentProvider={providerAttempts.find(a => a.status === 'trying')?.name ?? null}
            attempts={providerAttempts} allFailed={allProvidersFailed}
            onDismiss={() => setAllProvidersFailed(false)} onOpenSettings={onOpenSettings}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWaterDialog && onWater && setShowWaterDialog && (
          <WaterDialog suggestion={suggestion} quota={quota ?? 100} isFree={isFreeProvider ?? false}
            onWater={(focus, depth, note) => { setShowWaterDialog(false); onWater(focus, depth, note); }}
            onClose={() => setShowWaterDialog(false)} onAutoWaterChange={onAutoWaterChange}
            allApps={allApps} onSwitchToApp={s => { setShowWaterDialog(false); onSwitchWaterApp?.(s); }} />
        )}
      </AnimatePresence>

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
