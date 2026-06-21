import { useCallback } from 'react';
import OpenAI from 'openai';
import { addDoc, updateDoc, doc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User } from 'firebase/auth';
import type { Suggestion, EvolutionVersion, AIConfig, AppEvolution } from '../types';
import type { FocusId, DepthId } from '../services/watering';
import { waterApp } from '../services/watering';

interface HandlersInput {
  user: User | null;
  isCreator: boolean;
  suggestions: Suggestion[];
  deleteSuggestion: (id: string) => Promise<void>;
  voteSuggestion: (id: string, votes: number) => void;
  setSeedVotes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  launchTarget: Suggestion | null;
  setLaunchTarget: React.Dispatch<React.SetStateAction<Suggestion | null>>;
  forkTarget: Suggestion | null;
  setForkTarget: React.Dispatch<React.SetStateAction<Suggestion | null>>;
  providerKeys: Record<string, string[]>;
  setProviderKeys: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  aiProvider: string;
  activeProvider: string;
  callUnifiedAI: (prompt: string, onProviderSwitch?: (label: string) => void) => Promise<string>;
  aiConfig: AIConfig & { systemPrompt: string };
  consumeQuota: (amount: number) => void;
  customEndpoint: string;
  setProviderHealth: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isTestingAI: boolean;
  setIsTestingAI: React.Dispatch<React.SetStateAction<boolean>>;
  setTestResponse: React.Dispatch<React.SetStateAction<string | null>>;
  setWateringId: React.Dispatch<React.SetStateAction<string | null>>;
  setPendingEvolution: React.Dispatch<React.SetStateAction<AppEvolution | null>>;
}

export function useAppHandlers({
  user, isCreator, suggestions, deleteSuggestion, voteSuggestion, setSeedVotes,
  launchTarget, setLaunchTarget, forkTarget, setForkTarget,
  providerKeys, setProviderKeys, aiProvider, activeProvider,
  callUnifiedAI, aiConfig, consumeQuota, customEndpoint,
  setProviderHealth, isTestingAI, setIsTestingAI, setTestResponse,
  setWateringId, setPendingEvolution,
}: HandlersInput) {

  const saveApiKeyToAccount = useCallback(async (key: string, provider: string = aiProvider) => {
    const existing = providerKeys[provider] || [];
    const newArr = key ? [key, ...existing.slice(1)] : existing.slice(1);
    const newKeys = { ...providerKeys, [provider]: newArr };
    setProviderKeys(newKeys);
    localStorage.setItem("app_hub_keys", JSON.stringify(newKeys));
    if (provider === "google") localStorage.setItem("evolutive_energy_key", key || "");
    if (user) {
      try {
        await updateDoc(doc(db, "user_profiles", user.uid), { personal_api_key: JSON.stringify(newKeys) });
      } catch (e) { console.error("Error syncing API key:", e); }
    }
  }, [aiProvider, providerKeys, setProviderKeys, user]);

  const handleVote = useCallback((id: string, currentVotes: number) => {
    if (id.startsWith('seed_')) {
      setSeedVotes(prev => ({ ...prev, [id]: (prev[id] !== undefined ? prev[id] : currentVotes) + 1 }));
    } else {
      voteSuggestion(id, currentVotes);
    }
  }, [setSeedVotes, voteSuggestion]);

  const handleDeleteSuggestion = useCallback(async (id: string) => {
    if (id.startsWith('seed_')) return;
    try {
      const target = suggestions.find(s => s.id === id);
      if (target?.user_id && user?.uid && target.user_id !== user.uid && !isCreator) {
        throw new Error("Permission denied.");
      }
      await deleteSuggestion(id);
      if (launchTarget?.id === id) setLaunchTarget(null);
    } catch (err: any) { alert(err.message || "Access Denied."); }
  }, [suggestions, user, isCreator, deleteSuggestion, launchTarget, setLaunchTarget]);

  const handleForkConfirm = useCallback(async (title: string) => {
    if (!forkTarget) return;
    try {
      const newDoc = {
        content: title, app_type: forkTarget.app_type, status: "built", votes: 0,
        energy: forkTarget.energy || 0, user_id: user?.uid || null,
        created_at: new Date().toISOString(),
        built_code: forkTarget.built_code || "", parent_id: forkTarget.id,
      };
      const docRef = await addDoc(collection(db, "suggestions"), newDoc);
      setForkTarget(null);
      setLaunchTarget({ id: docRef.id, ...newDoc } as Suggestion);
    } catch (err: any) { console.error("Fork failed:", err); }
  }, [forkTarget, user, setForkTarget, setLaunchTarget]);

  const handleToggleVisibility = useCallback(async (newVis: 'public' | 'private') => {
    if (!launchTarget || launchTarget.id.startsWith('seed_')) return;
    try {
      await updateDoc(doc(db, "suggestions", launchTarget.id), { visibility: newVis });
      setLaunchTarget(prev => prev ? { ...prev, visibility: newVis } : null);
    } catch (e) { console.error("Visibility update failed:", e); }
  }, [launchTarget, setLaunchTarget]);

  const handleAutoWaterChange = useCallback(async (
    enabled: boolean, interval: number, times: number, focus: string, note: string,
  ) => {
    if (!launchTarget || launchTarget.id.startsWith('seed_')) return;
    const update = {
      autoWaterEnabled: enabled, autoWaterInterval: interval, autoWaterTimes: times,
      autoWaterFocus: focus, autoWaterNote: note,
      autoWater: (enabled ? (interval <= 60 ? 'hourly' : 'daily') : 'off') as 'off' | 'hourly' | 'daily',
    };
    await updateDoc(doc(db, "suggestions", launchTarget.id), update);
    setLaunchTarget(prev => prev ? { ...prev, ...update } : null);
  }, [launchTarget, setLaunchTarget]);

  const handleWaterApp = useCallback(async (focus: FocusId, depth: DepthId, note: string) => {
    if (!launchTarget || launchTarget.id.startsWith('seed_')) return;
    setWateringId(launchTarget.id);
    try {
      const evolution = await waterApp(launchTarget, focus, depth, note, callUnifiedAI);
      const evolutions: AppEvolution[] = [evolution, ...(launchTarget.evolutions ?? [])].slice(0, 20);
      await updateDoc(doc(db, "suggestions", launchTarget.id), { built_code: evolution.code, evolutions });
      setLaunchTarget(prev => prev ? { ...prev, built_code: evolution.code, evolutions } : null);
      if (activeProvider !== 'web-llm') {
        const costs: Record<DepthId, number> = { gentle: 10, balanced: 20, wild: 35 };
        consumeQuota(costs[depth]);
      }
      setPendingEvolution(evolution);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`${launchTarget.content} evolved`, { body: evolution.summary });
      }
    } catch (e) { console.error("Watering failed:", e); }
    finally { setWateringId(null); }
  }, [launchTarget, activeProvider, setWateringId, callUnifiedAI, consumeQuota, setPendingEvolution]);

  const checkHealth = useCallback(async (provider: string) => {
    setProviderHealth(prev => ({ ...prev, [provider]: { ...prev[provider], status: "checking" } }));
    const startTime = Date.now();
    try {
      const key = providerKeys[provider]?.[0];
      if (provider === "google") {
        if (!key) throw new Error("No key");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!res.ok) throw new Error("Request failed");
      } else if (provider === "openai") {
        if (!key) throw new Error("No key");
        await new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true }).models.list();
      } else if (provider === "web-llm") {
        if (!(window as any).navigator.gpu) throw new Error("No WebGPU");
      } else if (provider === "gemini-nano") {
        const w = window as any;
        if (!(w.ai && w.ai.assistant)) throw new Error("No Gemini Nano");
      } else if (provider === "openrouter") {
        if (!key) throw new Error("No key");
        const res = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${key}` } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else if (provider === "custom") {
        await fetch(customEndpoint + "/models", { mode: "no-cors" });
      }
      setProviderHealth(prev => ({ ...prev, [provider]: { status: "online", ping: Date.now() - startTime, tokens: "Available" } }));
    } catch {
      setProviderHealth(prev => ({ ...prev, [provider]: { status: "offline", ping: null, tokens: null } }));
    }
  }, [providerKeys, customEndpoint, setProviderHealth]);

  const handleTestNeuralLink = useCallback(async () => {
    if (isTestingAI) return;
    setIsTestingAI(true);
    setTestResponse(null);
    try {
      const response = await callUnifiedAI("Respond with exactly: 'Connection OK'");
      setTestResponse(response);
      setTimeout(() => setTestResponse(prev => prev === response ? null : prev), 8000);
    } catch (err: any) { setTestResponse(`ERROR: ${err.message}`); }
    finally { setIsTestingAI(false); }
  }, [isTestingAI, setIsTestingAI, setTestResponse, callUnifiedAI]);

  const handleRefine = useCallback(async (
    message: string, currentCode: string, onProviderSwitch?: (label: string) => void,
  ): Promise<string> => {
    const isTruncated = message.includes("incomplete") || message.includes("truncated");
    const isFix = message.startsWith("Fix this error:") || isTruncated;
    const systemPrompt = isFix
      ? "You are fixing broken React code. Return ONLY the corrected function body. No imports. No TypeScript. No markdown. Just working JSX."
      : aiConfig.systemPrompt;
    const taskInstr = isTruncated
      ? "The previous code was truncated. Generate a COMPLETE working version that fits in your response. Simplify if needed.\n\nReturn ONLY the complete App function, no imports, no markdown."
      : isFix
      ? `${message}\n\nReturn ONLY valid JSX, no unterminated strings, no TypeScript syntax, no imports. Function must be named App.`
      : `Apply this change: "${message}"\n\nReturn ONLY the complete updated React component — no markdown, no imports, no TypeScript annotations. Function must be named App and render valid JSX.`;
    const prompt = `${systemPrompt}\n\nCurrent code:\n${currentCode}\n\n${taskInstr}`.trim();
    const raw = await callUnifiedAI(prompt, onProviderSwitch);
    const match = raw.match(/```(?:javascript|typescript|tsx|jsx)?\s?([\s\S]*?)```/);
    const fixed = (match ? match[1] : raw).replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
    if (fixed && launchTarget) {
      const newVersion: EvolutionVersion = {
        code: launchTarget.built_code || currentCode,
        timestamp: new Date().toISOString(),
        prompt: message,
      };
      await updateDoc(doc(db, "suggestions", launchTarget.id), {
        built_code: fixed,
        history: [newVersion, ...(launchTarget.history || [])],
      });
      setLaunchTarget(prev => prev ? { ...prev, built_code: fixed } : null);
    }
    return fixed;
  }, [launchTarget, aiConfig, callUnifiedAI, setLaunchTarget]);

  return {
    saveApiKeyToAccount, handleVote, handleDeleteSuggestion, handleForkConfirm,
    handleToggleVisibility, handleAutoWaterChange, handleWaterApp,
    checkHealth, handleTestNeuralLink, handleRefine,
  };
}
