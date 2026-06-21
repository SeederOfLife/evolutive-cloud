
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Suggestion, AppEvolution, EvolutionVersion } from "../types";
import { isCodeBalanced, findAppFunctionEnd } from "../utils/sandboxUtils";
import { AIProgress } from "./AIProgress";
import type { FixStageIndex } from "./AIProgress";
import { buildSrcDoc } from "../sandbox/buildSrcDoc";
import { PlayerSidebar, CombinedEntry } from "./PlayerSidebar";
import { PlayerWorkspace } from "./PlayerWorkspace";

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function ModulePlayer({
  suggestion,
  onClose,
  onSave,
  onRefine,
}: {
  suggestion: Suggestion;
  onClose: () => void;
  onSave?: (code: string) => Promise<void>;
  onRefine?: (feedback: string) => Promise<string>;
}) {
  const [code, setCode] = useState(suggestion.built_code || "");
  const [activeSideTab, setActiveSideTab] = useState<"files" | "chat" | "history" | "settings">("files");
  const [deviceFrame] = useState<"phone" | "desktop">(suggestion.app_type === "phone" ? "phone" : "desktop");
  const [isExplorerOpen, setIsExplorerOpen] = useState(typeof window !== "undefined" && window.innerWidth >= 768);
  const [activeFile, setActiveFile] = useState("src/App.tsx");
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>(
    suggestion.built_code ? [] : [{ role: "user", content: `Initiating application sequence for: ${suggestion.content}` }]
  );
  const [runtimeStatus, setRuntimeStatus] = useState("Initializing...");
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixStage, setFixStage] = useState<FixStageIndex>(0);
  const [fixError, setFixError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (suggestion.built_code && !code) setCode(suggestion.built_code);
  }, [suggestion.built_code]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "EVO_LOG") setRuntimeStatus(e.data.content);
      if (e.data?.type === "EVO_ERROR") { setRuntimeStatus("ERROR: " + e.data.msg); setLastError(e.data.msg); }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => { setLastError(null); }, [code]);

  const combinedHistory = useMemo<CombinedEntry[]>(() => {
    const entries: CombinedEntry[] = [];
    for (const e of (suggestion.evolutions ?? []) as AppEvolution[]) {
      entries.push({ timestamp: e.timestamp, code: e.prevCode, label: [e.focus, e.depth].filter(Boolean).join(" · "), summary: e.summary, source: "evolution" });
    }
    for (const v of (suggestion.history ?? []) as EvolutionVersion[]) {
      entries.push({ timestamp: v.timestamp, code: v.code, label: v.prompt ? v.prompt.substring(0, 60) : "Manual edit", source: "refinement" });
    }
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [suggestion.evolutions, suggestion.history]);

  const cleanCode = useMemo(() => {
    if (!code) return "";
    return code
      .replace(/^import\b.*$/gm, "")
      .replace(/^export\s+default\s+function/gm, "function")
      .replace(/^export\s+default\s+/gm, "")
      .replace(/^export\s+/gm, "")
      .trim();
  }, [code]);

  const isTruncated = useMemo(() => cleanCode ? !isCodeBalanced(cleanCode) : false, [cleanCode]);
  const srcDoc      = useMemo(() => buildSrcDoc(cleanCode), [cleanCode]);

  const handleRestore = async (entry: CombinedEntry) => {
    setIsRestoring(true);
    try { setCode(entry.code); await onSave?.(entry.code); }
    finally { setIsRestoring(false); }
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try { await onSave(code); } catch (err) { console.error("Save failed:", err); } finally { setIsSaving(false); }
  };

  const handleRefine = async (overrideInput?: string) => {
    const prompt = overrideInput ?? refineInput;
    if (!onRefine || !prompt.trim() || isFixing) return;
    setIsRefining(true);
    setChatMessages((prev) => [...prev, { role: "user", content: prompt }]);
    if (!overrideInput) setRefineInput("");
    try {
      const newCode = await onRefine(prompt);
      if (newCode) {
        setCode(newCode);
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Application logic adjusted. System updated." }]);
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Build error: " + (err as any).message }]);
    } finally { setIsRefining(false); }
  };

  const handleSmartFix = async (runtimeErr?: string) => {
    if (!onRefine || isFixing || isRefining) return;
    const currentCode = code;
    setIsFixing(true); setFixError(null);
    try {
      setFixStage(0); await sleep(600);
      setFixStage(1);
      const diagnosis: string[] = [];
      if (!isCodeBalanced(currentCode)) diagnosis.push("unbalanced braces/brackets");
      const endPos = findAppFunctionEnd(currentCode);
      if (endPos === currentCode.length && !currentCode.includes("export default")) diagnosis.push("App function appears truncated or missing closing brace");
      if (!currentCode.includes("return (") && !currentCode.includes("return(")) diagnosis.push("missing return statement in App");
      if (currentCode.length < 200) diagnosis.push("code too short — likely severely truncated");
      if (runtimeErr) diagnosis.push(`runtime error: ${runtimeErr}`);
      await sleep(500);
      setFixStage(2); await sleep(400);
      setFixStage(3);
      const prompt = `The following React app has issues that need fixing.\n\nDETECTED PROBLEMS:\n${
        diagnosis.length ? diagnosis.map((d, i) => `${i + 1}. ${d}`).join("\n") : "Runtime error — code may be structurally complete but has a logic bug"
      }\n\nCURRENT CODE:\n${currentCode}\n\nTASK: Rewrite the complete, working version of this app fixing the detected problems.\nRules:\n- Keep all existing features and design\n- Do NOT truncate — write the full complete code\n- Must have a valid App function with a return statement\n- Must end with: export default App;\n- All braces must be balanced`;
      const result = await onRefine(prompt);
      setFixStage(4);
      const clean = result.replace(/^import\b.*$/gm, "").replace(/^export\s+default\s+function/gm, "function").replace(/^export\s+default\s+/gm, "").replace(/^export\s+/gm, "").trim();
      await sleep(300);
      if (!isCodeBalanced(clean)) { setFixError("Fix produced invalid code (unbalanced braces) — try again"); await sleep(2500); return; }
      const fixEnd = findAppFunctionEnd(clean);
      if (fixEnd === clean.length && !result.includes("export default")) { setFixError("Fix produced truncated code — try again"); await sleep(2500); return; }
      setFixStage(5); setCode(result); await onSave?.(result);
      setChatMessages(prev => [...prev, { role: "assistant" as const, content: "✓ Fix applied successfully." }]);
      await sleep(1500);
    } catch (err: any) {
      setFixError(err.message || "Fix failed"); await sleep(2500);
    } finally { setIsFixing(false); setFixStage(0); setFixError(null); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#050508] text-white overflow-hidden font-sans">
      <div className="flex-1 flex overflow-hidden">
        <PlayerSidebar
          suggestion={suggestion} onClose={onClose}
          activeSideTab={activeSideTab} setActiveSideTab={setActiveSideTab}
          isExplorerOpen={isExplorerOpen} setIsExplorerOpen={setIsExplorerOpen}
          activeFile={activeFile} setActiveFile={setActiveFile}
          setShowPreview={setShowPreview}
          code={code} isSaving={isSaving} handleSave={handleSave}
          chatMessages={chatMessages} isRefining={isRefining} isFixing={isFixing}
          refineInput={refineInput} setRefineInput={setRefineInput}
          handleRefine={handleRefine} handleSmartFix={handleSmartFix}
          isTruncated={isTruncated} onRefine={onRefine}
          combinedHistory={combinedHistory} isRestoring={isRestoring} handleRestore={handleRestore}
        />
        <PlayerWorkspace
          showPreview={showPreview} activeFile={activeFile}
          code={code} setCode={setCode} suggestion={suggestion}
          iframeRef={iframeRef} srcDoc={srcDoc} deviceFrame={deviceFrame}
          isTruncated={isTruncated} onRefine={onRefine}
          isRefining={isRefining} isFixing={isFixing}
          handleSmartFix={handleSmartFix} lastError={lastError} runtimeStatus={runtimeStatus}
        />
      </div>
      <AnimatePresence>
        {isFixing && (
          <AIProgress mode="fix" stage={fixStage as import("./AIProgress").AIStageIndex} error={fixError} highZ prompt={suggestion.content} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
