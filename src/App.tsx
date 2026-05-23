/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronUp, X, Search, Zap, Play, Sparkles, Loader2,
  Settings, Activity, Trash2, LogOut, Globe, Cpu, ChevronDown, User,
  MessageSquare, ArrowRight, GitFork, Layers
} from "lucide-react";
import OpenAI from "openai";
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc,
  doc, where, limit, getDocs
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { Suggestion, Advice, ProjectConfig, EvolutionVersion, GoalPlan } from "./types";
import { AppSandbox } from "./components/AppSandbox";
import { EvolutiveSeed, ModuleNode, Nebula, OrbitRing } from "./components/ThreeWorld";
import { ScrollFeed } from "./components/ScrollFeed";
import { useQuota } from "./hooks/useQuota";
import { useAuth } from "./hooks/useAuth";
import { useAI } from "./hooks/useAI";
import { useSuggestions } from "./hooks/useSuggestions";
import { AGENT_SYSTEM_PROMPTS, AGENT_GUIDELINES, AppType } from "./services/agentSkills";
import { SEED_APPS } from "./services/seedApps";
import { decomposeGoal } from "./services/decomposer";
import { PlanCard } from "./components/PlanCard";

const MANIFEST_PROVIDERS = [
  { id: "google",    label: "Google Gemini", Icon: Globe,    model: "gemini-3-flash-preview" },
  { id: "openai",    label: "OpenAI GPT-4",  Icon: Zap,      model: "gpt-4o" },
  { id: "anthropic", label: "Claude",         Icon: Sparkles, model: "claude-sonnet-4-20250514" },
  { id: "web-llm",   label: "Free Local AI",  Icon: Cpu,      model: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC" },
] as const;

const HERO_PHRASES = [
  "What will you build today?",
  "Games, tools, art, music — anything.",
  "Describe it. We build it.",
  "Turn imagination into code.",
];

const ONBOARDING_STEPS = [
  {
    title: "Welcome to Evolutive",
    body: "Turn any idea into a working app — games, tools, art, music — in seconds.",
    note: "Free local AI is active by default. No API key needed to start.",
  },
  {
    title: "Describe your idea",
    body: "Type anything in the bar below — specific or vague. We'll build it into an interactive, animated app.",
    note: null,
  },
  {
    title: "Explore the galaxy",
    body: "Each app you build becomes an orbiting node in space. Click any glowing orb to launch it.",
    note: null,
  },
];

export default function App() {
  const { quota: apiQuota, consume: consumeQuota } = useQuota();
  const {
    user, userProfile, authError, isAuthLoading,
    signInWithEmail, signInWithGoogle, signInWithGithub, logout,
  } = useAuth();
  const {
    aiProvider, setAiProvider,
    selectedModel, setSelectedModel,
    providerKeys, setProviderKeys,
    aiConfig, setAiConfig,
    customEndpoint, setCustomEndpoint,
    forceCloud, setForceCloud,
    aiError, setAiError,
    activeProvider,
    isRateLimited,
    rateLimitCountdown,
    webLlmProgress,
    call: callUnifiedAI,
  } = useAI();
  const { suggestions, deleteSuggestion, voteSuggestion } = useSuggestions();

  // View / modal state
  const [view, setView] = useState<'galaxy' | 'feed' | 'hub'>('galaxy');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // App state
  const [input, setInput] = useState("");
  const [newAppType, setNewAppType] = useState<AppType>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const [launchTarget, setLaunchTarget] = useState<Suggestion | null>(null);
  const [forkTarget, setForkTarget] = useState<Suggestion | null>(null);
  const [isManifesting, setIsManifesting] = useState(false);
  const [manifestingStep, setManifestingStep] = useState("");
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'built' | 'pending' | 'mine'>('all');
  const [isInitializing, setIsInitializing] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showProviderDrop, setShowProviderDrop] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const providerDropRef = useRef<HTMLDivElement>(null);
  const [providerHealth, setProviderHealth] = useState<
    Record<string, { status: 'online' | 'offline' | 'checking' | null; ping: number | null; tokens: string | null }>
  >({});
  const maxRateLimitCountdown = useRef(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('evolutive_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [seedVotes, setSeedVotes] = useState<Record<string, number>>({});
  const [pendingPlan, setPendingPlan] = useState<{ idea: string; plan: GoalPlan; onContinue: () => void } | null>(null);

  const userApiKey = useMemo(() => providerKeys[aiProvider] || "", [providerKeys, aiProvider]);

  // Track the peak countdown value for progress bar
  useEffect(() => {
    if (isRateLimited && rateLimitCountdown > maxRateLimitCountdown.current) {
      maxRateLimitCountdown.current = rateLimitCountdown;
    }
    if (!isRateLimited) {
      maxRateLimitCountdown.current = 0;
    }
  }, [isRateLimited, rateLimitCountdown]);

  // Rotate hero phrases every 4 seconds
  useEffect(() => {
    const id = setInterval(() => setHeroIndex(i => (i + 1) % HERO_PHRASES.length), 4000);
    return () => clearInterval(id);
  }, []);

  // Merge seed apps into suggestions when Firestore has no built apps or user is a guest
  const allSuggestions = useMemo(() => {
    const hasBuilt = suggestions.filter(s => s.status === 'built').length > 0;
    if (user && hasBuilt) return suggestions;
    return [
      ...SEED_APPS.map(s => ({ ...s, votes: seedVotes[s.id] !== undefined ? seedVotes[s.id] : s.votes })),
      ...suggestions,
    ];
  }, [user, suggestions, seedVotes]);

  useEffect(() => {
    if (!showProviderDrop) return;
    const handleClick = (e: MouseEvent) => {
      if (providerDropRef.current && !providerDropRef.current.contains(e.target as Node)) {
        setShowProviderDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showProviderDrop]);

  // Expose globals for sandbox
  useEffect(() => {
    const w = window as any;
    w.React = React;
    w.ReactDOM = {
      createRoot: (container: HTMLElement) => (window as any).ReactDOMClient.createRoot(container),
      render: (element: any, container: HTMLElement) => {
        const root = (window as any).ReactDOMClient.createRoot(container);
        root.render(element);
      },
    };
    import("react-dom/client").then((m) => { w.ReactDOMClient = m; });
    w.Motion = { motion, AnimatePresence };
    w.THREE = THREE;
  }, []);

  // Sync provider keys from profile
  useEffect(() => {
    if (!userProfile?.personal_api_key) return;
    try {
      const cloudKeys = JSON.parse(userProfile.personal_api_key);
      setProviderKeys((prev) => {
        const merged = { ...prev, ...cloudKeys };
        localStorage.setItem("app_hub_keys", JSON.stringify(merged));
        return merged;
      });
    } catch {
      setProviderKeys((prev) => {
        const merged = { ...prev, google: userProfile.personal_api_key as string };
        localStorage.setItem("app_hub_keys", JSON.stringify(merged));
        return merged;
      });
    }
  }, [userProfile]);

  // Clear keys on logout
  useEffect(() => {
    if (!user) {
      setProviderKeys({});
      localStorage.removeItem("app_nexus_keys");
      localStorage.removeItem("evolutive_energy_key");
    }
  }, [user]);

  // Default filter to mine when signed in
  useEffect(() => {
    if (user?.uid) setFilterType("mine");
  }, [user]);

  // Firestore listeners
  useEffect(() => {
    let mounted = true;
    const initTimeout = setTimeout(() => setIsInitializing(false), 5000);

    const qSuggestions = query(collection(db, "suggestions"), orderBy("votes", "desc"));
    const unsubSuggestions = onSnapshot(
      qSuggestions,
      (snapshot) => {
        let foundConfig = false;
        snapshot.forEach((docSnap) => {
          const s = { id: docSnap.id, ...docSnap.data() } as Suggestion;
          if (s.status === "system_config") {
            foundConfig = true;
            try {
              const config = JSON.parse(s.content || "{}") as ProjectConfig;
              setIsFinalized(!!config.is_finalized);
              setCreatorId(config.creator_id || "");
            } catch (_) {}
          }
        });
        if (!foundConfig && user?.uid && mounted) {
          const config: ProjectConfig = { creator_id: user.uid, is_finalized: false, project_name: "Initial Phase" };
          addDoc(collection(db, "suggestions"), {
            content: JSON.stringify(config),
            status: "system_config",
            user_id: user.uid,
            created_at: new Date().toISOString(),
          });
        }
        setIsInitializing(false);
        clearTimeout(initTimeout);
      },
      () => { setIsInitializing(false); clearTimeout(initTimeout); }
    );

    const qAdvice = query(collection(db, "advice"), orderBy("created_at", "asc"));
    const unsubAdvice = onSnapshot(qAdvice, (snapshot) => {
      const newAdvice: Advice[] = [];
      snapshot.forEach((docSnap) => newAdvice.push({ id: docSnap.id, ...docSnap.data() } as Advice));
      setAdvice(newAdvice);
    });

    return () => {
      mounted = false;
      unsubSuggestions();
      unsubAdvice();
      clearTimeout(initTimeout);
    };
  }, [user?.uid]);

  const saveApiKeyToAccount = async (key: string, provider: string = aiProvider) => {
    const newKeys = { ...providerKeys, [provider]: key };
    setProviderKeys(newKeys);
    localStorage.setItem("app_hub_keys", JSON.stringify(newKeys));
    if (provider === "google") localStorage.setItem("evolutive_energy_key", key);
    if (user) {
      try {
        await updateDoc(doc(db, "user_profiles", user.uid), { personal_api_key: JSON.stringify(newKeys) });
      } catch (e) {
        console.error("Error syncing API key:", e);
      }
    }
  };

  const handleToggleFinalize = async () => {
    if (!user || user.uid !== creatorId) return;
    try {
      const q = query(collection(db, "suggestions"), where("status", "==", "system_config"), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, "suggestions", snap.docs[0].id);
        const config = JSON.parse(snap.docs[0].data().content || "{}") as ProjectConfig;
        config.is_finalized = !isFinalized;
        await updateDoc(docRef, { content: JSON.stringify(config) });
      }
    } catch (e) {
      console.error("Finalize error:", e);
    }
  };

  const isCreator = !!user?.uid && (user.uid === creatorId || !creatorId || creatorId === "");
  const canSuggest = isFinalized || isCreator;

  const displaySuggestions = useMemo(() => {
    return allSuggestions
      .filter((s) => s.status !== "system_config" && s.status !== "deleted" && !s.is_deleted)
      .filter((s) => {
        const matchesSearch = s.content.toLowerCase().includes(searchQuery.toLowerCase());
        let matchesCategory = true;
        if (filterType === "built") matchesCategory = s.status === "built";
        if (filterType === "pending") matchesCategory = s.status === "pending";
        if (filterType === "mine") matchesCategory = s.user_id === user?.uid;
        return matchesSearch && matchesCategory;
      });
  }, [allSuggestions, searchQuery, filterType, user]);

  const builtCount = useMemo(
    () => allSuggestions.filter((s) => s.status === "built").length,
    [allSuggestions]
  );

  const neuralStatus = useMemo(() => {
    if (isRateLimited) return `RATE LIMITED (${rateLimitCountdown}s)`;
    if (aiError) return "ERROR";
    if (isManifesting || isBuilding) return "BUILDING";
    if (isRefining) return "REFINING";
    if (isLoading) return "LOADING";
    return "IDLE";
  }, [isRateLimited, rateLimitCountdown, aiError, isManifesting, isBuilding, isRefining, isLoading]);

  const checkHealth = async (provider: string) => {
    setProviderHealth((prev) => ({ ...prev, [provider]: { ...prev[provider], status: "checking" } }));
    const startTime = Date.now();
    try {
      const key = providerKeys[provider];
      if (provider === "google") {
        if (!key) throw new Error("No key");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!res.ok) throw new Error("Request failed");
      } else if (provider === "openai") {
        if (!key) throw new Error("No key");
        const client = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
        await client.models.list();
      } else if (provider === "web-llm") {
        const w = window as any;
        if (!w.navigator.gpu) throw new Error("No WebGPU");
      } else if (provider === "gemini-nano") {
        const w = window as any;
        if (!(w.ai && w.ai.assistant)) throw new Error("No Gemini Nano");
      } else if (provider === "custom") {
        await fetch(customEndpoint + "/models", { mode: "no-cors" });
      }
      const ping = Date.now() - startTime;
      setProviderHealth((prev) => ({ ...prev, [provider]: { status: "online", ping, tokens: "Available" } }));
    } catch {
      setProviderHealth((prev) => ({ ...prev, [provider]: { status: "offline", ping: null, tokens: null } }));
    }
  };

  const handleTestNeuralLink = async () => {
    if (isTestingAI) return;
    setIsTestingAI(true);
    setTestResponse(null);
    try {
      const response = await callUnifiedAI("Respond with exactly: 'Connection OK'");
      setTestResponse(response);
      setTimeout(() => setTestResponse((prev) => (prev === response ? null : prev)), 8000);
    } catch (err: any) {
      setTestResponse(`ERROR: ${err.message}`);
    } finally {
      setIsTestingAI(false);
    }
  };

  const handleVote = (id: string, currentVotes: number) => {
    if (id.startsWith('seed_')) {
      setSeedVotes(prev => ({ ...prev, [id]: (prev[id] !== undefined ? prev[id] : currentVotes) + 1 }));
    } else {
      voteSuggestion(id, currentVotes);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (id.startsWith('seed_')) return;
    setIsLoading(true);
    try {
      const target = suggestions.find((s) => s.id === id);
      if (target?.user_id && user?.uid && target.user_id !== user.uid && !isCreator) {
        throw new Error("Permission denied.");
      }
      await deleteSuggestion(id);
      if (launchTarget?.id === id) setLaunchTarget(null);
    } catch (err: any) {
      alert(err.message || "Access Denied.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForkConfirm = async (title: string) => {
    if (!forkTarget) return;
    try {
      const newDoc = {
        content: title,
        app_type: forkTarget.app_type,
        status: "built",
        votes: 0,
        energy: forkTarget.energy || 0,
        user_id: user?.uid || null,
        created_at: new Date().toISOString(),
        built_code: forkTarget.built_code || "",
        parent_id: forkTarget.id,
      };
      const docRef = await addDoc(collection(db, "suggestions"), newDoc);
      const fork = { id: docRef.id, ...newDoc } as Suggestion;
      setForkTarget(null);
      setLaunchTarget(fork);
    } catch (err: any) {
      console.error("Fork failed:", err);
    }
  };

  const buildEvolution = async (suggestion: Suggestion, plan?: GoalPlan) => {
    if (isBuilding && isBuilding !== suggestion.id) return;
    try {
      setIsBuilding(suggestion.id);
      setManifestingStep("Generating app...");
      setIsManifesting(true);

      const existingApps = suggestions
        .filter(s => s.status !== "system_config" && s.status !== "deleted" && !s.is_deleted && s.id !== suggestion.id && s.status === "built")
        .slice(0, 8)
        .map(s => `- "${s.content}" (${s.app_type || "desktop"})`)
        .join("\n");

      const appType = (suggestion.app_type || "desktop") as AppType;
      const energy = suggestion.energy ?? 50;
      const energyContext = energy > 50
        ? "This is a high-energy creation — go complex and ambitious"
        : "Start simple but make it polished and complete";

      const planContext = plan
        ? `\nGOAL PLAN:\n- Core need: ${plan.coreNeed}\n- Target user: ${plan.targetUser}\n- Required features: ${plan.features.join(", ")}\n- Key interactions: ${plan.interactions.join(", ")}\n- Visual style: ${plan.visualStyle}\n- Success: ${plan.successCriteria}\n\nBuild this app following the plan above.\n`
        : "";

      const prompt = `
System: ${aiConfig.systemPrompt}

Type specialist: ${AGENT_SYSTEM_PROMPTS[appType]}

Energy: ${energyContext}

Target: ${appType.toUpperCase()}

Task: Create a complete React application for: "${suggestion.content}"
${existingApps ? `\nOther apps already built (for context/inspiration, don't duplicate):\n${existingApps}\n` : ""}${planContext}
Type-specific guidance:
- ${AGENT_GUIDELINES[appType]}

Libraries available (already in scope, NO imports needed):
- React 18 hooks (useState, useEffect, useMemo, useRef, useCallback, useContext, useReducer)
- Tailwind CSS classes
- Lucide React icons (e.g. Search, Star, Heart, Play, Settings...)
- Recharts (LineChart, BarChart, PieChart, AreaChart...)
- motion.div, AnimatePresence from Framer Motion
- Canvas 2D API, Web Audio API, SVG, Math, localStorage — all available natively

Critical rules:
- Start with: export default function App() {
- NO import statements at all
- ALL styling via Tailwind classes or inline styles
- Return ONLY raw code, no markdown fences
      `.trim();

      if (apiQuota < 20) {
        alert("Build capacity too low (needs 20%). Wait for recharge.");
        return;
      }

      const text = await callUnifiedAI(prompt);
      const match = text.match(/```(?:javascript|typescript|tsx|jsx)?\s?([\s\S]*?)```/);
      const generatedCode = (match ? match[1] : text)
        .replace(/```[a-z]*\n?/gi, "")
        .replace(/```/g, "")
        .trim();

      if (!generatedCode) throw new Error("No code returned.");

      const updatePayload: any = { status: "built", built_code: generatedCode };
      if (plan) updatePayload.plan = plan;
      await updateDoc(doc(db, "suggestions", suggestion.id), updatePayload);
      consumeQuota(15);
      setLaunchTarget({ ...suggestion, status: "built", built_code: generatedCode, ...(plan ? { plan } : {}) });
    } catch (err: any) {
      console.error("Build failed:", err);
      setAiError(err.message);
    } finally {
      setIsBuilding(null);
      setIsManifesting(false);
    }
  };

  const handleSuggest = async () => {
    if (!input.trim() || !canSuggest) return;
    if (apiQuota < 20) {
      alert("Build capacity too low (needs 20%). Wait for recharge.");
      return;
    }
    if (["openai", "anthropic"].includes(aiProvider) && !providerKeys[aiProvider]) {
      const providerLabel = aiProvider === "anthropic" ? "Claude (Anthropic)" : "OpenAI";
      setSettingsMessage(`Add your ${providerLabel} API key to start generating`);
      setShowSettings(true);
      return;
    }
    const rawInput = input.trim();
    setInput("");
    try {
      setManifestingStep("Refining idea...");
      setIsManifesting(true);
      let content = rawInput;
      try {
        const refined = await callUnifiedAI(
          `Refine this app idea into a clear one-sentence description. Be technical and direct.\nOriginal: "${rawInput}"\nRefined:`
        );
        content = refined.trim() || rawInput;
      } catch (_) {}

      // Decompose goal in parallel with idea refinement
      setManifestingStep("Planning...");
      let plan: GoalPlan | undefined;
      try {
        plan = await decomposeGoal(content, newAppType, callUnifiedAI);
      } catch (_) {}

      const insertData: any = {
        content,
        app_type: newAppType,
        status: "pending",
        votes: 0,
        energy: 0,
        user_id: user?.uid || null,
        created_at: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "suggestions"), insertData);
      const newSuggestion = { id: docRef.id, ...insertData } as Suggestion;
      consumeQuota(5);

      // Show the plan card, then build once dismissed
      setIsManifesting(false);
      if (plan) {
        await new Promise<void>(resolve => {
          setPendingPlan({ idea: content, plan, onContinue: resolve });
        });
        setPendingPlan(null);
      }

      await buildEvolution(newSuggestion, plan);
    } catch (err: any) {
      console.error("Manifest error:", err);
      setAiError(err.message);
    } finally {
      setIsManifesting(false);
      setIsBuilding(null);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen w-full bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* Loading screen */}
      <AnimatePresence>
        {isInitializing && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[200] bg-gray-950 flex flex-col items-center justify-center gap-4"
          >
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-400">Connecting...</p>
            <button
              onClick={() => setIsInitializing(false)}
              className="mt-2 text-xs text-gray-600 hover:text-gray-400 transition-colors underline"
            >
              Skip
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan card overlay */}
      <AnimatePresence>
        {pendingPlan && (
          <PlanCard
            idea={pendingPlan.idea}
            plan={pendingPlan.plan}
            onDismiss={pendingPlan.onContinue}
          />
        )}
      </AnimatePresence>

      {/* Building overlay */}
      <AnimatePresence>
        {isManifesting && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-gray-950/90 flex flex-col items-center justify-center gap-6"
          >
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <div className="text-center">
              <p className="text-base font-semibold text-white">Building App</p>
              <p className="text-sm text-gray-400 mt-1">{manifestingStep}</p>
            </div>
            <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }} animate={{ width: "100%" }}
                transition={{ duration: 12, ease: "easeInOut" }}
                className="h-full bg-indigo-500 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="flex-none h-14 bg-gray-900 border-b border-gray-800 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
        {/* Logo + status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white hidden sm:block tracking-wide">EVOLUTIVE</span>
          {/* Status: dot-only on mobile, full pill on sm+ */}
          <span
            className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${
              neuralStatus === "IDLE"
                ? "bg-gray-800 text-gray-500"
                : "bg-indigo-500/20 text-indigo-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${neuralStatus === "IDLE" ? "bg-gray-600" : "bg-indigo-400 animate-pulse"}`} />
            <span className="hidden sm:inline">{neuralStatus}</span>
          </span>
        </div>

        {/* View switcher — single-letter on mobile, full word on sm+ */}
        <div className="flex-1 flex justify-center">
          <div className="flex bg-gray-800 rounded-lg p-1 gap-0.5 sm:gap-1">
            {(["galaxy", "feed", "hub"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  view === v ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <span className="sm:hidden font-black">{v.charAt(0).toUpperCase()}</span>
                <span className="hidden sm:inline uppercase">{v}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:block">
            BUILDS: <span className="text-white font-medium">{builtCount}</span>
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {user ? (
            <button
              onClick={() => setShowAuth(true)}
              className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center sm:gap-2 transition-all"
              title="Account"
            >
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                alt=""
                className="w-5 h-5 rounded-full"
                referrerPolicy="no-referrer"
              />
              <span className="hidden sm:block max-w-[80px] truncate text-sm text-gray-300">
                {user.email?.split("@")[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg flex items-center justify-center transition-all"
              title="Sign In"
            >
              <User className="w-4 h-4 text-white sm:hidden" />
              <span className="hidden sm:block text-sm font-medium text-white">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Error banner */}
      <AnimatePresence>
        {aiError && !isRateLimited && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
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
                      Add a free Google Gemini key to get started — or use OpenAI / Anthropic
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setShowSettings(true); setAiError(null); }}
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

      {/* Rate limit banner */}
      <AnimatePresence>
        {isRateLimited && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-none bg-amber-950/60 border-b border-amber-700/30 px-4 py-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-amber-300 font-medium">
                Gemini rate limit — ready again in{" "}
                <span className="font-black text-amber-200 tabular-nums">{rateLimitCountdown}s</span>
              </p>
              <span className="text-[10px] font-mono text-amber-600 uppercase tracking-widest">20 req/min</span>
            </div>
            <div className="h-1 w-full bg-amber-900/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                animate={{
                  width: maxRateLimitCountdown.current > 0
                    ? `${Math.round(((maxRateLimitCountdown.current - rateLimitCountdown) / maxRateLimitCountdown.current) * 100)}%`
                    : "0%"
                }}
                transition={{ duration: 0.9, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WebLLM loading banner */}
      <AnimatePresence>
        {webLlmProgress && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
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

      {/* ── MAIN AREA ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">

        {/* Galaxy (always mounted, shown/hidden) */}
        <div
          style={{ display: view === "galaxy" ? "block" : "none" }}
          className="absolute inset-0"
        >
          <Canvas
            shadows
            camera={{ position: [0, 0, 10], fov: 75 }}
            className="cursor-grab active:cursor-grabbing"
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
          >
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#6366f1" />
            <EvolutiveSeed onClick={() => setView("hub")} isOpen={view === "hub"} />
            <Nebula />
            <OrbitRing radius={3.5} opacity={0.18} color="#818cf8" />
            <OrbitRing radius={5.0} opacity={0.11} color="#6366f1" />
            <OrbitRing radius={6.5} opacity={0.07} color="#4f46e5" />
            <OrbitRing radius={7.5} opacity={0.05} color="#4338ca" />
            {allSuggestions
              .filter((s) => s.status === "built" && s.built_code)
              .map((s) => (
                <ModuleNode key={s.id} suggestion={s} onRun={(sg) => setLaunchTarget(sg)} />
              ))}
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              maxPolarAngle={Math.PI / 1.5}
              minPolarAngle={Math.PI / 3}
            />
          </Canvas>

          {/* Rotating hero text */}
          <div className="absolute inset-x-0 bottom-28 sm:bottom-36 flex items-center justify-center pointer-events-none z-10">
            <AnimatePresence mode="wait">
              <motion.p
                key={heroIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.7 }}
                className="text-white/20 text-base sm:text-xl font-light tracking-wide text-center px-8"
              >
                {HERO_PHRASES[heroIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Feed view */}
        {view === "feed" && (
          <ScrollFeed
            suggestions={displaySuggestions}
            onPlay={(s) => setLaunchTarget(s)}
            onVote={handleVote}
            onBuild={(s) => buildEvolution(s)}
          />
        )}

        {/* Hub view */}
        {view === "hub" && (
          <HubView
            suggestions={displaySuggestions}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterType={filterType}
            setFilterType={setFilterType}
            user={user}
            isCreator={isCreator}
            isBuilding={isBuilding}
            isRefining={isRefining}
            isLoading={isLoading}
            onBuild={buildEvolution}
            onLaunch={(s: Suggestion) => setLaunchTarget(s)}
            onFork={(s: Suggestion) => setForkTarget(s)}
            onDelete={handleDeleteSuggestion}
            onVote={handleVote}
          />
        )}
      </main>

      {/* ── BOTTOM BAR ──────────────────────────────────────────────────────── */}
      {/* Mobile: 2 rows (pills row + input row). Desktop: single row via flex-wrap trick. */}
      <footer className="flex-none bg-gray-900 border-t border-gray-800 flex flex-wrap items-center px-3 sm:px-4 py-2 sm:h-[72px] gap-2">

        {/* Row 1 on mobile: scrollable type pills + provider icon */}
        <div className="flex items-center gap-2 basis-full sm:basis-auto sm:flex-none order-1">
          <div
            className="flex gap-1 overflow-x-auto min-w-0 flex-1 sm:flex-none"
            style={{ scrollbarWidth: "none" }}
          >
            {(["phone", "desktop", "game", "terminal", "music", "art"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setNewAppType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  newAppType === type
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Provider selector — shown in row 1 on mobile, hidden (re-shown below) on sm+ */}
          <div ref={providerDropRef} className="relative shrink-0 sm:hidden">
            {(() => {
              const active = MANIFEST_PROVIDERS.find((p) => p.id === aiProvider) || MANIFEST_PROVIDERS[0];
              return (
                <button
                  onClick={() => setShowProviderDrop((prev) => !prev)}
                  className="flex items-center gap-1 w-9 h-9 justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-all"
                  title={active.label}
                >
                  <active.Icon className="w-4 h-4" />
                </button>
              );
            })()}
            <AnimatePresence>
              {showProviderDrop && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                  className="absolute bottom-full right-0 mb-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50"
                >
                  {MANIFEST_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setAiProvider(p.id);
                        setSelectedModel(p.model);
                        localStorage.setItem("manifest_provider", p.id);
                        setShowProviderDrop(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                        aiProvider === p.id
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      <p.Icon className="w-4 h-4 shrink-0" />
                      {p.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Row 2 on mobile / continues single row on sm+: input + provider(desktop) + manifest */}
        <div className="flex items-center gap-2 flex-1 min-w-0 order-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
            placeholder={`Describe your ${newAppType} app...`}
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 sm:px-4 py-2 sm:py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />

          {/* Provider selector — desktop only (mobile version is in row 1 above) */}
          <div className="relative shrink-0 hidden sm:block">
            {(() => {
              const active = MANIFEST_PROVIDERS.find((p) => p.id === aiProvider) || MANIFEST_PROVIDERS[0];
              const isFallback = activeProvider !== aiProvider;
              return (
                <button
                  onClick={() => setShowProviderDrop((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-all ${
                    isFallback
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                      : "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 hover:text-white"
                  }`}
                  title={isFallback ? `Fallback active: using ${activeProvider}` : active.label}
                >
                  <active.Icon className="w-3.5 h-3.5" />
                  <span className="max-w-[80px] truncate">
                    {isFallback ? activeProvider : active.label}
                  </span>
                  {isFallback && <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">↻</span>}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              );
            })()}
            <AnimatePresence>
              {showProviderDrop && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                  className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50"
                >
                  {MANIFEST_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setAiProvider(p.id);
                        setSelectedModel(p.model);
                        localStorage.setItem("manifest_provider", p.id);
                        setShowProviderDrop(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                        aiProvider === p.id
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      <p.Icon className="w-4 h-4 shrink-0" />
                      {p.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleSuggest}
            disabled={!canSuggest || isLoading || !!isBuilding || isManifesting || !input.trim()}
            className="flex items-center gap-2 px-4 min-h-[44px] bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-all shrink-0"
          >
            {isManifesting || isBuilding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden xs:inline sm:inline">MANIFEST</span>
          </button>
        </div>
      </footer>

      {/* ── SETTINGS MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            onClose={() => { setShowSettings(false); setSettingsMessage(null); }}
            aiProvider={aiProvider}
            setAiProvider={setAiProvider}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            userApiKey={userApiKey}
            saveApiKeyToAccount={saveApiKeyToAccount}
            customEndpoint={customEndpoint}
            setCustomEndpoint={setCustomEndpoint}
            forceCloud={forceCloud}
            setForceCloud={setForceCloud}
            aiConfig={aiConfig}
            setAiConfig={setAiConfig}
            providerHealth={providerHealth}
            checkHealth={checkHealth}
            isTestingAI={isTestingAI}
            testResponse={testResponse}
            handleTestNeuralLink={handleTestNeuralLink}
            setTestResponse={setTestResponse}
            settingsMessage={settingsMessage}
            setSettingsMessage={setSettingsMessage}
          />
        )}
      </AnimatePresence>

      {/* ── AUTH MODAL ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            user={user}
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            authPassword={authPassword}
            setAuthPassword={setAuthPassword}
            isSignUp={isSignUp}
            setIsSignUp={setIsSignUp}
            authError={authError}
            isAuthLoading={isAuthLoading}
            signInWithEmail={signInWithEmail}
            signInWithGoogle={signInWithGoogle}
            signInWithGithub={signInWithGithub}
            logout={logout}
            suggestions={suggestions}
          />
        )}
      </AnimatePresence>

      {/* ── LAUNCH MODAL ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {launchTarget && (
          <LaunchModal
            suggestion={launchTarget}
            onClose={() => setLaunchTarget(null)}
            onVote={handleVote}
            onFork={() => { setForkTarget(launchTarget); setLaunchTarget(null); }}
            onRefine={async (message: string, currentCode: string) => {
              const isFix = message.startsWith("Fix this error:");
              const systemPrompt = isFix
                ? "You are fixing broken React code. Return ONLY the corrected function body. No imports. No TypeScript. No markdown. Just working JSX."
                : aiConfig.systemPrompt;
              const taskInstr = isFix
                ? `${message}\n\nReturn ONLY valid JSX with no unterminated strings, no TypeScript syntax, no import statements. The function must be named App.`
                : `Apply this change: "${message}"\n\nReturn ONLY the complete updated React component — no markdown, no imports, no TypeScript type annotations. The function must be named App and must render valid JSX.`;
              const prompt = `${systemPrompt}\n\nCurrent code:\n${currentCode}\n\n${taskInstr}`.trim();
              const raw = await callUnifiedAI(prompt);
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
            }}
          />
        )}
      </AnimatePresence>

      {/* ── FORK MODAL ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {forkTarget && (
          <ForkModal
            source={forkTarget}
            onConfirm={handleForkConfirm}
            onCancel={() => setForkTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── ONBOARDING OVERLAY ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={onboardingStep}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                  {onboardingStep === 0 && <Sparkles className="w-6 h-6 text-indigo-400" />}
                  {onboardingStep === 1 && <MessageSquare className="w-6 h-6 text-indigo-400" />}
                  {onboardingStep === 2 && <Globe className="w-6 h-6 text-indigo-400" />}
                </div>
                <h2 className="text-white text-xl font-bold mb-2">{ONBOARDING_STEPS[onboardingStep].title}</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{ONBOARDING_STEPS[onboardingStep].body}</p>
                {ONBOARDING_STEPS[onboardingStep].note && (
                  <p className="text-indigo-400 text-xs mt-4 bg-indigo-500/10 rounded-lg px-3 py-2">
                    {ONBOARDING_STEPS[onboardingStep].note}
                  </p>
                )}
                <div className="flex items-center justify-between mt-7">
                  <div className="flex gap-1.5">
                    {ONBOARDING_STEPS.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === onboardingStep ? 'bg-indigo-400 w-3' : 'bg-gray-600'}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { localStorage.setItem('evolutive_onboarded', '1'); setShowOnboarding(false); }}
                      className="px-4 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => {
                        if (onboardingStep < ONBOARDING_STEPS.length - 1) {
                          setOnboardingStep(s => s + 1);
                        } else {
                          localStorage.setItem('evolutive_onboarded', '1');
                          setShowOnboarding(false);
                        }
                      }}
                      className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      {onboardingStep < ONBOARDING_STEPS.length - 1 ? "Next →" : "Get Started"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── FORK MODAL ────────────────────────────────────────────────────────────────

function ForkModal({
  source,
  onConfirm,
  onCancel,
}: {
  source: Suggestion;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(`Fork of: ${source.content}`);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="w-4 h-4 text-indigo-400" />
            <h3 className="text-white font-bold text-base">Fork App</h3>
          </div>
          <p className="text-gray-400 text-xs">Creates an independent copy you can modify freely.</p>
          <p className="text-indigo-500/60 text-[10px] font-mono mt-1">source #{source.id.substring(0, 8)}</p>
        </div>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && title.trim()) onConfirm(title.trim()); if (e.key === "Escape") onCancel(); }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          placeholder="Fork title..."
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 text-sm transition-all">
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onConfirm(title.trim())}
            disabled={!title.trim()}
            className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 rounded-lg text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <GitFork className="w-3.5 h-3.5" />
            Fork & Open
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── HUB VIEW ──────────────────────────────────────────────────────────────────

interface HubViewProps {
  suggestions: Suggestion[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: "all" | "built" | "pending" | "mine";
  setFilterType: (f: "all" | "built" | "pending" | "mine") => void;
  user: any;
  isCreator: boolean;
  isBuilding: string | null;
  isRefining: string | null;
  isLoading: boolean;
  onBuild: (s: Suggestion) => void;
  onLaunch: (s: Suggestion) => void;
  onFork: (s: Suggestion) => void;
  onDelete: (id: string) => void;
  onVote: (id: string, votes: number) => void;
}

function HubView({
  suggestions, searchQuery, setSearchQuery, filterType, setFilterType,
  user, isCreator, isBuilding, isRefining, isLoading, onBuild, onLaunch, onFork, onDelete, onVote,
}: HubViewProps) {
  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex-none p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 shrink-0">
          {(["all", "built", "pending", "mine"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filterType === f ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex-none hidden sm:grid grid-cols-[1fr_72px_80px_180px] gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-800">
        <span>Title</span>
        <span className="text-center">Type</span>
        <span className="text-center">Status</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
            <Search className="w-10 h-10" />
            <p className="text-sm">No apps found</p>
          </div>
        )}
        {suggestions.map((s) => {
          const isBuilt = s.status === "built";
          const isDemo = s.user_id === '@evolutive_demo';
          const isOwner = !isDemo && (s.user_id === user?.uid || isCreator);
          return (
            <div
              key={s.id}
              className="border-b border-gray-800/50 hover:bg-gray-900 transition-colors"
            >
              {/* Mobile card layout */}
              <div className="sm:hidden flex flex-col gap-3 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-medium leading-snug">{s.content}</p>
                      {isDemo && <span className="shrink-0 px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded text-[9px] font-black uppercase tracking-wider border border-violet-500/30">DEMO</span>}
                    </div>
                    {s.parent_id && (
                      <p className="text-[10px] text-indigo-400/60 font-mono mt-0.5">forked from #{s.parent_id.substring(0, 8)}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400">{s.app_type || "desktop"}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${isBuilt ? "bg-indigo-500/20 text-indigo-400" : "bg-gray-800 text-gray-400"}`}>{s.status}</span>
                    </div>
                  </div>
                  {isOwner && (
                    <button onClick={() => onDelete(s.id)} disabled={isLoading} className="p-2 bg-gray-800 hover:bg-red-900/40 rounded-lg text-gray-600 hover:text-red-400 transition-all disabled:opacity-40 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {isBuilt ? (
                    <button onClick={() => onLaunch(s)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-semibold text-white transition-all min-h-[44px]">
                      <Play className="w-4 h-4 fill-current" />
                      Launch
                    </button>
                  ) : (
                    <button onClick={() => onBuild(s)} disabled={!!isBuilding || !!isRefining} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-all min-h-[44px]">
                      {isBuilding === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Build
                    </button>
                  )}
                  {isBuilt && (
                    <button onClick={() => onFork(s)} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-all min-h-[44px]" title="Fork this app">
                      <GitFork className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => onVote(s.id, s.votes || 0)} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-all min-h-[44px]">
                    <ChevronUp className="w-4 h-4" />
                    <span className="font-medium">{s.votes || 0}</span>
                  </button>
                </div>
              </div>

              {/* Desktop row layout */}
              <div className="hidden sm:grid grid-cols-[1fr_72px_80px_180px] gap-3 items-center px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">{s.content}</p>
                    {isDemo && <span className="shrink-0 px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded text-[9px] font-black uppercase tracking-wider border border-violet-500/30">DEMO</span>}
                  </div>
                  <p className="text-xs text-gray-600 font-mono">
                    #{s.id.substring(0, 8)}
                    {s.parent_id && (
                      <span className="ml-2 text-indigo-400/60">forked from #{s.parent_id.substring(0, 8)}</span>
                    )}
                  </p>
                </div>
                <div className="flex justify-center">
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">{s.app_type || "desktop"}</span>
                </div>
                <div className="flex justify-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${isBuilt ? "bg-indigo-500/20 text-indigo-400" : "bg-gray-800 text-gray-400"}`}>{s.status}</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {isBuilt ? (
                    <button onClick={() => onLaunch(s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded text-xs font-medium text-white transition-all">
                      <Play className="w-3 h-3 fill-current" />
                      Launch
                    </button>
                  ) : (
                    <button onClick={() => onBuild(s)} disabled={!!isBuilding || !!isRefining} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-medium text-white transition-all">
                      {isBuilding === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Build
                    </button>
                  )}
                  {isBuilt && (
                    <button onClick={() => onFork(s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs font-medium text-gray-400 hover:text-white transition-all" title="Fork this app">
                      <GitFork className="w-3 h-3" />
                      Fork
                    </button>
                  )}
                  <button onClick={() => onVote(s.id, s.votes || 0)} className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 hover:text-white transition-all">
                    <ChevronUp className="w-3 h-3" />
                    {s.votes || 0}
                  </button>
                  {isOwner && (
                    <button onClick={() => onDelete(s.id)} disabled={isLoading} className="p-1.5 bg-gray-800 hover:bg-red-900/40 rounded text-gray-600 hover:text-red-400 transition-all disabled:opacity-40" title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SETTINGS MODAL ────────────────────────────────────────────────────────────

interface SettingsModalProps {
  onClose: () => void;
  aiProvider: string;
  setAiProvider: (p: any) => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  userApiKey: string;
  saveApiKeyToAccount: (key: string, provider?: string) => void;
  customEndpoint: string;
  setCustomEndpoint: (e: string) => void;
  forceCloud: boolean;
  setForceCloud: (v: boolean) => void;
  aiConfig: any;
  setAiConfig: (fn: any) => void;
  providerHealth: Record<string, any>;
  checkHealth: (p: string) => void;
  isTestingAI: boolean;
  testResponse: string | null;
  handleTestNeuralLink: () => void;
  setTestResponse: (r: string | null) => void;
  settingsMessage?: string | null;
  setSettingsMessage?: (m: string | null) => void;
}

const MODELS: Record<string, { value: string; label: string }[]> = {
  google: [
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet" },
  ],
  custom: [],
  "web-llm": [
    { value: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 0.5B (tiny, fast)" },
    { value: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 2B (balanced)" },
    { value: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B (small)" },
    { value: "Llama-3-8B-Instruct-q4f32_1-MLC", label: "Llama 3 8B (GPU recommended)" },
  ],
  "gemini-nano": [{ value: "gemini-nano", label: "Gemini Nano" }],
};

interface ProviderGuidance {
  badge: 'FREE' | 'PAID' | 'NO KEY NEEDED';
  hint: string;
  link?: string;
}
const PROVIDER_GUIDANCE: Record<string, ProviderGuidance> = {
  google:        { badge: 'FREE',          hint: 'Free tier available — get your key at Google AI Studio',                                     link: 'https://aistudio.google.com/apikey' },
  openai:        { badge: 'PAID',          hint: 'Paid — get your key at OpenAI Platform',                                                     link: 'https://platform.openai.com/api-keys' },
  anthropic:     { badge: 'PAID',          hint: 'Paid — get your key at Anthropic Console',                                                    link: 'https://console.anthropic.com/' },
  'web-llm':     { badge: 'NO KEY NEEDED', hint: 'Free & private — runs locally in your browser. Requires a good GPU. No API key needed.' },
  'gemini-nano': { badge: 'NO KEY NEEDED', hint: 'Free — built into Chrome. Enable at chrome://flags/#prompt-api-for-gemini-nano' },
  custom:        { badge: 'FREE',          hint: 'Custom OpenAI-compatible endpoint. Provide a base URL below and an optional API key.' },
};

function SettingsModal({
  onClose, aiProvider, setAiProvider, selectedModel, setSelectedModel,
  userApiKey, saveApiKeyToAccount, customEndpoint, setCustomEndpoint,
  forceCloud, setForceCloud, aiConfig, setAiConfig, providerHealth,
  checkHealth, isTestingAI, testResponse, handleTestNeuralLink, setTestResponse,
  settingsMessage, setSettingsMessage,
}: SettingsModalProps) {
  const providers = ["google", "openai", "anthropic", "custom", "web-llm"] as const;
  const providerModels = MODELS[aiProvider] || [];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2 sm:hidden" />
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {settingsMessage && (
          <div className="mx-4 mt-4 flex items-start justify-between gap-3 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-sm text-amber-300">
            <span>{settingsMessage}</span>
            <button onClick={() => setSettingsMessage?.(null)} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-4 space-y-5">
          {/* Provider */}
          <section>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              AI Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {providers.map((p) => (
                <button
                  key={p}
                  onClick={() => setAiProvider(p)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    aiProvider === p
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {p === "web-llm" ? "WebLLM" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* API Key & Provider Guidance */}
          {(() => {
            const g = PROVIDER_GUIDANCE[aiProvider];
            const needsKey = !["web-llm", "gemini-nano"].includes(aiProvider);
            const badgeCls = g?.badge === 'NO KEY NEEDED'
              ? 'bg-violet-900/40 text-violet-400 border-violet-800/50'
              : g?.badge === 'PAID'
              ? 'bg-amber-900/40 text-amber-400 border-amber-800/50'
              : 'bg-green-900/40 text-green-400 border-green-800/50';
            return (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {needsKey ? 'API Key' : 'Provider'}
                  </label>
                  {g && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeCls}`}>
                      {g.badge}
                    </span>
                  )}
                </div>
                {needsKey && (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder={`${aiProvider} API key...`}
                      value={userApiKey}
                      onChange={(e) => saveApiKeyToAccount(e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button
                      onClick={() => saveApiKeyToAccount(userApiKey)}
                      className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium text-white transition-all"
                    >
                      Save
                    </button>
                  </div>
                )}
                {g && (
                  <div className={`flex items-start justify-between gap-3 ${needsKey ? 'mt-2' : ''}`}>
                    <p className="text-xs text-gray-500 leading-relaxed">{g.hint}</p>
                    {g.link && (
                      <a
                        href={g.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
                      >
                        Get API Key →
                      </a>
                    )}
                  </div>
                )}
              </section>
            );
          })()}

          {/* Custom endpoint */}
          {aiProvider === "custom" && (
            <section>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Custom Endpoint
              </label>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </section>
          )}

          {/* Model */}
          <section>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Model
            </label>
            {providerModels.length > 0 ? (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {providerModels.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                placeholder="Model name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            )}
          </section>

          {/* Force cloud toggle */}
          <section className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-white">Force Cloud Mode</p>
              <p className="text-xs text-gray-500">Use platform cloud key as fallback</p>
            </div>
            <button
              onClick={() => setForceCloud(!forceCloud)}
              className={`relative w-10 h-6 rounded-full transition-colors ${forceCloud ? "bg-indigo-500" : "bg-gray-700"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${forceCloud ? "left-5" : "left-1"}`} />
            </button>
          </section>

          {/* Test connection */}
          <section className="space-y-2">
            <button
              onClick={handleTestNeuralLink}
              disabled={isTestingAI}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-all"
            >
              {isTestingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              Test Connection
            </button>
            {testResponse && (
              <div
                className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                  testResponse.includes("ERROR")
                    ? "bg-red-900/30 border border-red-800 text-red-300"
                    : "bg-green-900/30 border border-green-800 text-green-300"
                }`}
              >
                <span className="truncate">{testResponse}</span>
                <button onClick={() => setTestResponse(null)} className="ml-2 opacity-50 hover:opacity-100 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </section>

          {/* Temperature */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Temperature</label>
              <span className="text-xs text-indigo-400 font-mono">{aiConfig.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="2" step="0.05"
              value={aiConfig.temperature}
              onChange={(e) => setAiConfig((prev: any) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full accent-indigo-500 h-1 cursor-pointer"
            />
          </section>

          {/* Max tokens */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Max Tokens</label>
              <span className="text-xs text-indigo-400 font-mono">{aiConfig.maxTokens}</span>
            </div>
            <input
              type="range" min="128" max="32000" step="128"
              value={aiConfig.maxTokens}
              onChange={(e) => setAiConfig((prev: any) => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              className="w-full accent-indigo-500 h-1 cursor-pointer"
            />
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── AUTH MODAL ────────────────────────────────────────────────────────────────

interface AuthModalProps {
  onClose: () => void;
  user: any;
  authEmail: string;
  setAuthEmail: (v: string) => void;
  authPassword: string;
  setAuthPassword: (v: string) => void;
  isSignUp: boolean;
  setIsSignUp: (v: boolean) => void;
  authError: string | null;
  isAuthLoading: boolean;
  signInWithEmail: (email: string, password: string, isSignUp: boolean) => void;
  signInWithGoogle: () => void;
  signInWithGithub: () => void;
  logout: () => void;
  suggestions: Suggestion[];
}

function AuthModal({
  onClose, user, authEmail, setAuthEmail, authPassword, setAuthPassword,
  isSignUp, setIsSignUp, authError, isAuthLoading,
  signInWithEmail, signInWithGoogle, signInWithGithub, logout, suggestions,
}: AuthModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm overflow-y-auto max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2 sm:hidden" />
          <h2 className="text-base font-semibold text-white">
            {user ? "Account" : isSignUp ? "Create Account" : "Sign In"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {user ? (
            /* ── Signed in ── */
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                  alt=""
                  className="w-10 h-10 rounded-full"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.email?.split("@")[0]}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-lg font-bold text-white">
                    {suggestions.filter((s) => s.user_id === user.uid).length}
                  </p>
                  <p className="text-xs text-gray-400">Ideas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {suggestions.filter((s) => s.user_id === user.uid && s.status === "built").length}
                  </p>
                  <p className="text-xs text-gray-400">Builds</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {suggestions.filter((s) => s.user_id === user.uid).reduce((a, s) => a + (s.votes || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-400">Votes</p>
                </div>
              </div>

              <button
                onClick={() => { logout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800 rounded-lg text-sm text-red-400 hover:text-red-300 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            /* ── Signed out ── */
            <>
              {authError && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">
                  {authError}
                </div>
              )}

              <input
                type="email"
                placeholder="Email address"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signInWithEmail(authEmail, authPassword, isSignUp)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />

              <button
                onClick={() => signInWithEmail(authEmail, authPassword, isSignUp)}
                disabled={isAuthLoading}
                className="w-full flex items-center justify-center py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-all"
              >
                {isAuthLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-white transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <button
                onClick={signInWithGithub}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-white transition-all"
              >
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.11.825-.26.825-.58 0-.285-.015-1.23-.015-2.23-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .32.225.7.825.58C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>

              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── LAUNCH MODAL ──────────────────────────────────────────────────────────────

function LaunchModal({
  suggestion,
  onClose,
  onVote,
  onFork,
  onRefine,
}: {
  suggestion: Suggestion;
  onClose: () => void;
  onVote: (id: string, votes: number) => void;
  onFork?: () => void;
  onRefine?: (message: string, code: string) => Promise<string>;
}) {
  const [code, setCode] = useState(suggestion.built_code || "");
  const [lastError, setLastError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [voted, setVoted] = useState(false);
  const [showVotePop, setShowVotePop] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const desktopChatEndRef = useRef<HTMLDivElement>(null);
  const mobileChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "EVO_ERROR") {
        setLastError(e.data.msg);
        setMessages(prev => {
          if (prev.at(-1)?.text.startsWith("⚠️")) return prev;
          return [...prev, { role: "ai", text: `⚠️ ${e.data.msg}` }];
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => { setLastError(null); }, [code]);

  useEffect(() => {
    desktopChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    mobileChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (override?: string) => {
    const text = override ?? chatInput.trim();
    if (!text || !onRefine || isFixing) return;
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsFixing(true);
    try {
      const newCode = await onRefine(text, code);
      if (newCode) {
        setCode(newCode);
        setMessages(prev => [...prev, { role: "ai", text: "Done — app updated." }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "ai", text: "Error: " + e.message }]);
    } finally {
      setIsFixing(false);
    }
  };

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    setShowVotePop(true);
    onVote(suggestion.id, suggestion.votes || 0);
    setTimeout(() => setShowVotePop(false), 1200);
  };

  const title = suggestion.content.length > 45
    ? suggestion.content.substring(0, 45) + "…"
    : suggestion.content;

  const ChatMessages = ({ endRef }: { endRef: React.RefObject<HTMLDivElement> }) => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {messages.length === 0 && (
        <p className="text-[11px] text-gray-600 text-center mt-8 leading-relaxed px-2">
          Describe changes or ask the AI to fix errors.
        </p>
      )}
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[88%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
            msg.role === "user"
              ? "bg-indigo-600 text-white"
              : msg.text.startsWith("⚠️")
                ? "bg-red-900/30 text-red-300 border border-red-800/40"
                : "bg-gray-800 text-gray-300 border border-gray-700/60"
          }`}>{msg.text}</div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );

  const ChatInput = () => (
    <div className="flex-none p-3 border-t border-gray-800 space-y-2">
      {lastError && !isFixing && (
        <button
          onClick={() => sendMessage(`Fix this error: ${lastError}`)}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 rounded-lg text-[11px] font-bold text-red-400 transition-all"
        >
          <Zap className="w-3 h-3" /> Fix Error
        </button>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Improve or change this app..."
          disabled={isFixing}
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40"
        />
        <button
          onClick={() => sendMessage()}
          disabled={!chatInput.trim() || isFixing}
          className="w-9 h-9 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 rounded-lg flex items-center justify-center text-white transition-all shrink-0"
        >
          {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black flex flex-col"
      style={{ height: '100dvh' }}
    >
      {/* Always-visible floating close — 48px tap target, dark circle, z-9999 */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 right-3 z-[9999] w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all active:scale-90 shadow-lg"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Title bar — 56px mobile, 48px desktop. pr-16 clears the floating X */}
      <div className="flex-none h-14 sm:h-12 bg-gray-900/95 border-b border-gray-800 flex items-center pl-3 pr-16 gap-2 shrink-0">
        <span className="flex-1 text-sm font-semibold text-white truncate min-w-0">
          {title}
          {suggestion.parent_id && (
            <span className="ml-2 text-[10px] text-indigo-400/60 font-mono font-normal hidden sm:inline">
              forked from #{suggestion.parent_id.substring(0, 8)}
            </span>
          )}
        </span>

        {/* Fork — hidden on mobile */}
        {onFork && (
          <button
            onClick={onFork}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-gray-800 text-gray-400 hover:text-white transition-all shrink-0"
          >
            <GitFork className="w-3.5 h-3.5" />
            Fork
          </button>
        )}

        {/* Vote — always visible */}
        <div className="relative shrink-0">
          <motion.button whileTap={{ scale: 0.85 }} onClick={handleVote}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all ${
              voted ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
            {(suggestion.votes || 0) + (voted ? 1 : 0)}
          </motion.button>
          <AnimatePresence>
            {showVotePop && (
              <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -20 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-black text-indigo-400 pointer-events-none">
                +1
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plan toggle — only if plan exists */}
        {suggestion.plan && (
          <button
            onClick={() => setShowPlan(p => !p)}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${
              showPlan ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            title="View Goal Plan"
          >
            <Layers className="w-4 h-4" />
          </button>
        )}

        {/* Chat toggle — desktop only */}
        {onRefine && (
          <button
            onClick={() => setShowChat(p => !p)}
            className={`hidden sm:flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${
              showChat ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            title="Toggle AI Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expandable plan panel */}
      <AnimatePresence>
        {showPlan && suggestion.plan && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-indigo-500/15"
          >
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-indigo-400 mb-2">Built from this plan</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                {suggestion.plan.coreNeed && (
                  <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Need · </span><span className="text-[10px] text-white/60">{suggestion.plan.coreNeed}</span></div>
                )}
                {suggestion.plan.targetUser && (
                  <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">For · </span><span className="text-[10px] text-white/60">{suggestion.plan.targetUser}</span></div>
                )}
                {suggestion.plan.visualStyle && (
                  <div><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Style · </span><span className="text-[10px] text-white/60">{suggestion.plan.visualStyle}</span></div>
                )}
                {suggestion.plan.features.length > 0 && (
                  <div className="col-span-2 sm:col-span-3"><span className="text-[8px] uppercase tracking-widest text-white/25 font-bold">Features · </span><span className="text-[10px] text-white/60">{suggestion.plan.features.join(" · ")}</span></div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview — always full width on mobile, shrinks on desktop when chat open */}
        <div className="flex-1 relative min-w-0">
          <AppSandbox code={code} appType={suggestion.app_type} className="absolute inset-0 w-full h-full" />

          {/* Fix with AI — FAB (mobile, bottom-right above chat FAB) / banner (desktop) */}
          <AnimatePresence>
            {lastError && onRefine && !isFixing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute z-10 pointer-events-none"
                style={{ bottom: '88px', left: '16px' }}
              >
                {/* Mobile: circular FAB */}
                <button
                  onClick={() => sendMessage(`Fix this error: ${lastError}`)}
                  className="sm:hidden pointer-events-auto w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full shadow-xl flex items-center justify-center text-white active:scale-90 transition-all"
                  title="Fix with AI"
                >
                  <Zap className="w-6 h-6" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop: Fix with AI banner */}
          <AnimatePresence>
            {lastError && onRefine && !isFixing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="hidden sm:flex absolute bottom-4 left-0 right-0 justify-center z-10 pointer-events-none"
              >
                <button
                  onClick={() => sendMessage(`Fix this error: ${lastError}`)}
                  className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold text-white shadow-xl transition-all active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  Fix with AI
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile: floating chat FAB — bottom-right */}
          {onRefine && (
            <button
              onClick={() => setShowChat(p => !p)}
              className={`sm:hidden absolute bottom-4 right-4 z-20 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90 ${
                showChat
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-900/80 backdrop-blur-sm border border-white/10 text-white"
              }`}
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Desktop: side chat panel */}
        <div className="hidden sm:flex shrink-0">
          <AnimatePresence>
            {showChat && onRefine && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden"
              >
                <div className="flex-none px-4 py-2.5 border-b border-gray-800 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-[3px] text-white/50">AI Chat</span>
                  {isFixing && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                </div>
                <ChatMessages endRef={desktopChatEndRef} />
                <ChatInput />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile: bottom sheet chat — 60% height, spring slide-up */}
      <AnimatePresence>
        {showChat && onRefine && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="sm:hidden absolute bottom-0 left-0 right-0 z-[200] flex flex-col bg-gray-950 rounded-t-2xl border-t border-gray-800 shadow-2xl overflow-hidden"
            style={{ height: "70%" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-700" />
            </div>
            {/* Sheet header */}
            <div className="flex-none px-4 py-2 border-b border-gray-800 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[3px] text-white/50">AI Chat</span>
              <div className="flex items-center gap-2">
                {isFixing && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                <button onClick={() => setShowChat(false)} className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <ChatMessages endRef={mobileChatEndRef} />
            <ChatInput />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
