/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronUp, X, Search, Zap, Play, Sparkles, Loader2,
  Settings, Activity, Trash2, LogOut, Globe, Cpu, ChevronDown, User,
  MessageSquare, ArrowRight, GitFork, Layers, Wrench, Share2, Lock, Droplets, Server,
  Plus, ChevronRight, ChevronLeft
} from "lucide-react";
import OpenAI from "openai";
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc,
  doc, where, limit, getDocs
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { Suggestion, Advice, ProjectConfig, EvolutionVersion, GoalPlan } from "./types";
import { AppSandbox } from "./components/AppSandbox";
import { EvolutiveSeed, ModuleNode, Nebula, OrbitRing, GalaxyField, ForkLines } from "./components/ThreeWorld";
import { ScrollFeed } from "./components/ScrollFeed";
import { useQuota } from "./hooks/useQuota";
import { useAuth } from "./hooks/useAuth";
import { useAI } from "./hooks/useAI";
import { useSuggestions } from "./hooks/useSuggestions";
import { AGENT_SYSTEM_PROMPTS, AGENT_GUIDELINES, AppType } from "./services/agentSkills";
import { SEED_APPS } from "./services/seedApps";
import { generateRefinementQuestions, buildFinalPrompt, RefinementQuestion } from "./services/refiner";
import { decomposeGoal } from "./services/decomposer";
import { PromptRefiner } from "./components/PromptRefiner";
import { AIProgress, AIStageIndex } from "./components/AIProgress";
import { NetworkPanel } from "./components/NetworkPanel";
import { JoinModal } from "./components/JoinModal";
import { ShareMenu } from "./components/ShareMenu";
import { getLinkedAccounts, LinkedAccount } from "./services/invites";
import WaterDialog from "./components/WaterDialog";
import DiffViewer from "./components/DiffViewer";
import { waterApp, type FocusId, type DepthId } from "./services/watering";
import type { AppEvolution } from "./types";

async function checkWebGPUSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

const MANIFEST_PROVIDERS = [
  { id: "google",      label: "Google Gemini", Icon: Globe,    model: "gemini-3-flash-preview" },
  { id: "openai",      label: "OpenAI GPT-4",  Icon: Zap,      model: "gpt-4o" },
  { id: "anthropic",   label: "Claude",         Icon: Sparkles, model: "claude-sonnet-4-20250514" },
  { id: "openrouter",  label: "OpenRouter",     Icon: Layers,   model: "google/gemini-2.0-flash-exp:free" },
  { id: "web-llm",     label: "Free Local AI",  Icon: Cpu,      model: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC" },
  { id: "ollama",      label: "Ollama",         Icon: Server,   model: "gemma2:2b" },
] as const;

const HERO_PHRASES = [
  "What will you build today?",
  "Games, tools, art, music — anything.",
  "Describe it. We build it.",
  "Turn imagination into code.",
];

const EXAMPLE_CHIPS = [
  "snake game with neon style",
  "vocabulary flashcards for spanish",
  "particle art that follows my mouse",
];

const ONBOARDING_STEPS = [
  {
    title: "Welcome to Evolutive",
    body: "Turn any idea into a working app — games, tools, art, music — in seconds.",
    note: null, // rendered dynamically based on GPU support
  },
  {
    title: "Choose Your AI",
    body: "Pick how to power your apps. Google Gemini is free and works on any device — no GPU needed.",
    note: null,
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
    addProviderKey, removeProviderKey,
    aiConfig, setAiConfig,
    customEndpoint, setCustomEndpoint,
    ollamaEndpoint, setOllamaEndpoint,
    forceCloud, setForceCloud,
    aiError, setAiError,
    activeProvider,
    isRateLimited,
    rateLimitCountdown,
    webLlmProgress,
    call: callUnifiedAI,
  } = useAI();

  const isIOS = useMemo(() =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream,
    []
  );
  const { suggestions, deleteSuggestion, voteSuggestion } = useSuggestions();

  const [zoomScale, setZoomScaleState] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem('app_zoom_scale') || '1');
    return [0.8, 1.0, 1.2].includes(v) ? v : 1.0;
  });
  const updateZoom = (s: number) => {
    setZoomScaleState(s);
    localStorage.setItem('app_zoom_scale', String(s));
  };

  // View / modal state
  const [view, setView] = useState<'galaxy' | 'feed' | 'hub'>('galaxy');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // App state
  const [input, setInput] = useState("");
  const [newAppType, setNewAppType] = useState<AppType>('desktop');
  const newAppTypeRef = useRef<AppType>('desktop');
  useEffect(() => { newAppTypeRef.current = newAppType; }, [newAppType]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const [launchTarget, setLaunchTarget] = useState<Suggestion | null>(null);
  const [forkTarget, setForkTarget] = useState<Suggestion | null>(null);
  const [isManifesting, setIsManifesting] = useState(false);
  const [manifestingStep, setManifestingStep] = useState("");
  const [aiStage, setAiStage] = useState<AIStageIndex>(0);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [providerHealth, setProviderHealth] = useState<
    Record<string, { status: 'online' | 'offline' | 'checking' | null; ping: number | null; tokens: string | null }>
  >({});
  const maxRateLimitCountdown = useRef(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('evolutive_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [seedVotes, setSeedVotes] = useState<Record<string, number>>({});
  const [pendingRefiner, setPendingRefiner] = useState<{
    idea: string;
    title: string;
    questions: RefinementQuestion[];
    onBuild: (answers: Record<number, string>, editedTitle: string) => void;
    onSkip: (editedTitle: string) => void;
  } | null>(null);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [showNoGPUBanner, setShowNoGPUBanner] = useState(false);
  const [joinToken, setJoinToken] = useState<string | null>(() => {
    const m = window.location.pathname.match(/^\/join\/([a-f0-9]{40})$/);
    return m ? m[1] : null;
  });
  // userId → short display name for linked accounts
  const [linkedUserMap, setLinkedUserMap] = useState<Map<string, string>>(new Map());
  const nodePositionsRef = useRef(new Map<string, THREE.Vector3>());
  const [wateringId, setWateringId] = useState<string | null>(null);
  const [showWaterDialog, setShowWaterDialog] = useState(false);
  const [pendingEvolution, setPendingEvolution] = useState<AppEvolution | null>(null);

  const userApiKey = useMemo(() => providerKeys[aiProvider]?.[0] || "", [providerKeys, aiProvider]);

  // Detect WebGPU on mount — if unsupported and no explicit provider stored, fall back to Google
  useEffect(() => {
    checkWebGPUSupport().then(supported => {
      setWebGPUSupported(supported);
      if (!supported) {
        const stored = localStorage.getItem('app_provider');
        if (!stored || stored === 'web-llm') {
          setAiProvider('google' as any);
          setSelectedModel('gemini-3-flash-preview');
          setShowNoGPUBanner(true);
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const raw = JSON.parse(userProfile.personal_api_key);
      // Normalize: values may be strings (legacy) or arrays (new)
      const cloudKeys: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(raw)) {
        cloudKeys[k] = Array.isArray(v) ? (v as string[]) : (typeof v === 'string' && v ? [v] : []);
      }
      setProviderKeys((prev) => {
        const merged = { ...prev, ...cloudKeys };
        localStorage.setItem("app_hub_keys", JSON.stringify(merged));
        return merged;
      });
    } catch {
      // Legacy: personal_api_key stored as a raw string (single Google key)
      setProviderKeys((prev) => {
        const merged = { ...prev, google: [userProfile.personal_api_key as string] };
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

  // After sign-in: pick up any pending invite stored by JoinModal
  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem("pending_invite_token");
    if (pending) {
      localStorage.removeItem("pending_invite_token");
      setJoinToken(pending);
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch linked accounts when user is known, build userId → displayName map
  const refreshLinkedAccounts = useCallback(async () => {
    if (!user) { setLinkedUserMap(new Map()); return; }
    try {
      const accounts: LinkedAccount[] = await getLinkedAccounts(user.uid);
      const m = new Map<string, string>();
      for (const a of accounts) {
        m.set(a.linkedUserId, a.linkedDisplayName || a.linkedEmail.split("@")[0]);
      }
      setLinkedUserMap(m);
    } catch { /* non-critical */ }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshLinkedAccounts(); }, [refreshLinkedAccounts]);

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
    // Sets/replaces the first key for the provider; use addProviderKey for additional keys
    const existing = providerKeys[provider] || [];
    const newArr = key ? [key, ...existing.slice(1)] : existing.slice(1);
    const newKeys = { ...providerKeys, [provider]: newArr };
    setProviderKeys(newKeys);
    localStorage.setItem("app_hub_keys", JSON.stringify(newKeys));
    if (provider === "google") localStorage.setItem("evolutive_energy_key", key || "");
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

  const socialProof = useMemo(() => {
    const built = allSuggestions.filter(s => s.status === 'built');
    const creatorIds = new Set(
      built.filter(s => !s.id.startsWith('seed_') && s.user_id).map(s => s.user_id!)
    );
    return { apps: built.length, creators: Math.max(creatorIds.size, 1) };
  }, [allSuggestions]);

  const showLanding = !user && view === 'galaxy' && input === '';

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
      const key = providerKeys[provider]?.[0];
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
      } else if (provider === "openrouter") {
        if (!key) throw new Error("No key");
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  const handleToggleVisibility = async (newVis: 'public' | 'private') => {
    if (!launchTarget || launchTarget.id.startsWith('seed_')) return;
    try {
      await updateDoc(doc(db, "suggestions", launchTarget.id), { visibility: newVis });
      setLaunchTarget(prev => prev ? { ...prev, visibility: newVis } : null);
    } catch (e) {
      console.error("Visibility update failed:", e);
    }
  };

  const handleWaterApp = async (focus: FocusId, depth: DepthId, note: string) => {
    if (!launchTarget || launchTarget.id.startsWith('seed_')) return;
    const isFreeProvider = activeProvider === 'webllm';
    setWateringId(launchTarget.id);
    try {
      const evolution = await waterApp(launchTarget, focus, depth, note, callUnifiedAI);
      // Cap history at 20 evolutions
      const prevEvolutions = launchTarget.evolutions ?? [];
      const evolutions: AppEvolution[] = [evolution, ...prevEvolutions].slice(0, 20);
      await updateDoc(doc(db, "suggestions", launchTarget.id), {
        built_code: evolution.code,
        evolutions,
      });
      setLaunchTarget(prev => prev ? { ...prev, built_code: evolution.code, evolutions } : null);
      if (!isFreeProvider) {
        const depthCost = (['gentle', 'balanced', 'wild'] as DepthId[]);
        const costs: Record<DepthId, number> = { gentle: 10, balanced: 20, wild: 35 };
        consumeQuota(costs[depth]);
      }
      setPendingEvolution(evolution);
      // Browser notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`${launchTarget.content} evolved`, { body: evolution.summary });
      }
    } catch (e) {
      console.error("Watering failed:", e);
    } finally {
      setWateringId(null);
    }
  };

  const buildEvolution = async (suggestion: Suggestion, _plan?: unknown, overridePrompt?: string) => {
    if (isBuilding && isBuilding !== suggestion.id) return;
    try {
      setIsBuilding(suggestion.id);
      setManifestingStep("Generating app...");
      setAiStage(2);
      setIsManifesting(true);

      const existingApps = suggestions
        .filter(s => s.status !== "system_config" && s.status !== "deleted" && !s.is_deleted && s.id !== suggestion.id && s.status === "built")
        .slice(0, 8)
        .map(s => `- "${s.content}" (${s.app_type || "desktop"})`)
        .join("\n");

      const appType = (suggestion.app_type || "desktop") as AppType;
      const taskDescription = overridePrompt || suggestion.content;

      // Scope detection — try AI decompose, fall back to heuristic
      let goalPlan: GoalPlan | null = null;
      try { goalPlan = await decomposeGoal(taskDescription, appType, callUnifiedAI); } catch { /* non-critical */ }

      const scope = goalPlan?.scope ?? (() => {
        const lower = taskDescription.toLowerCase();
        const words = lower.split(/\s+/).length;
        const smallKws = ['timer', 'clock', 'counter', 'stopwatch', 'calculator', 'converter', 'random', 'dice', 'color picker'];
        if (smallKws.some(kw => lower.includes(kw)) && words <= 8) return 'small' as const;
        if (appType === 'game' || words > 12) return 'large' as const;
        if (words <= 5) return 'small' as const;
        return 'medium' as const;
      })();

      const isSeed = scope !== 'small';

      const seedSection = isSeed ? `
SEED-FIRST PHILOSOPHY:
You are planting a SEED that will grow over days through watering passes, not building a finished app in one shot.

Build a COMPLETE, ENJOYABLE CORE — small in scope but fully working and fun to use today. Pick the single most essential loop or feature and make it polished. Do NOT attempt the full vision now.

Leave clear room to grow: structure the code so features can be added later (modular state, clear sections, // GROWTH: comments marking where future watering can expand).

Example: for a large game idea, build ONE working room with core movement and one mechanic — complete and playable — not a broken sprawling attempt at everything.

After the full code, on a NEW LINE output the growth roadmap as JSON:
ROADMAP: {"now":["what works today 1","what works today 2"],"next":["next watering adds 1","next watering adds 2"],"future":["bigger vision 1","bigger vision 2"]}
`.trim() : "";

      const copyrightLine = `COPYRIGHT: Reference only general design patterns and genres. Never reproduce specific copyrighted games, characters, assets, or code. Build original mechanics inspired by genres, not clones of named products.`;

      const energy = suggestion.energy ?? 50;
      const energyContext = !isSeed
        ? (energy > 50 ? "This is a high-energy creation — go complex and ambitious" : "Start simple but make it polished and complete")
        : "";

      const prompt = [
        `System: ${aiConfig.systemPrompt}`,
        seedSection,
        `Type specialist: ${AGENT_SYSTEM_PROMPTS[appType]}`,
        energyContext ? `Energy: ${energyContext}` : "",
        `Target: ${appType.toUpperCase()}`,
        `\nTask: Create a complete React application for: "${taskDescription}"`,
        existingApps ? `\nOther apps already built (for context, don't duplicate):\n${existingApps}` : "",
        `\nType-specific guidance:\n- ${AGENT_GUIDELINES[appType]}`,
        `\n${copyrightLine}`,
        `\nLibraries available (already in scope, NO imports needed):
- React 18 hooks (useState, useEffect, useMemo, useRef, useCallback, useContext, useReducer)
- Tailwind CSS classes (use class names directly, no window.Tailwind)
- Lucide React icons (use any icon name directly: Play, Pause, Volume2, Trophy, etc.)
- Recharts (LineChart, BarChart, PieChart, AreaChart, ResponsiveContainer...)
- motion.div, AnimatePresence from Framer Motion
- Canvas 2D API, Web Audio API, SVG, requestAnimationFrame, Math — all available natively
- IMPORTANT: localStorage is NOT available (sandbox restriction) — use React state only`,
        `\nCritical rules:
- Start with: export default function App() {
- NO import statements at all
- ALL styling via Tailwind classes or inline styles
- Return ONLY raw code${isSeed ? ' then ROADMAP: JSON' : ''}, no markdown fences
- CRITICAL: Always complete the entire function. Never truncate. The last line MUST be the closing brace of the App function. If the response is getting long, simplify features rather than cutting code mid-statement.`,
      ].filter(Boolean).join("\n\n").trim();

      if (apiQuota < 20) {
        alert("Build capacity too low (needs 20%). Wait for recharge.");
        return;
      }

      setAiStage(3);
      const text = await callUnifiedAI(prompt);
      setAiStage(4);

      // Parse roadmap for seed builds
      let roadmap: { now: string[]; next: string[]; future: string[] } | undefined;
      let codeText = text;
      if (isSeed) {
        const roadmapIdx = text.lastIndexOf('\nROADMAP:');
        if (roadmapIdx !== -1) {
          const jsonStr = text.slice(roadmapIdx + 9).trim();
          try { roadmap = JSON.parse(jsonStr); } catch { /* ignore malformed */ }
          codeText = text.slice(0, roadmapIdx);
        }
      }

      const match = codeText.match(/```(?:javascript|typescript|tsx|jsx)?\s?([\s\S]*?)```/);
      const generatedCode = (match ? match[1] : codeText)
        .replace(/```[a-z]*\n?/gi, "")
        .replace(/```/g, "")
        .trim();

      if (!generatedCode) throw new Error("No code returned.");

      setAiStage(5);
      const saveData: Record<string, unknown> = { status: "built", built_code: generatedCode };
      if (roadmap) saveData.roadmap = roadmap;
      await updateDoc(doc(db, "suggestions", suggestion.id), saveData);
      consumeQuota(15);
      setAiStage(6);
      setLaunchTarget({ ...suggestion, status: "built", built_code: generatedCode, ...(roadmap ? { roadmap } : {}) });
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
    if (["openai", "anthropic"].includes(aiProvider) && !providerKeys[aiProvider]?.length) {
      const providerLabel = aiProvider === "anthropic" ? "Claude (Anthropic)" : "OpenAI";
      setSettingsMessage(`Add your ${providerLabel} API key to start generating`);
      setShowSettings(true);
      return;
    }
    const rawInput = input.trim();
    setInput("");
    try {
      // Generate refinement questions — abort on exhausted providers
      setManifestingStep("Generating questions...");
      setAiStage(0);
      setIsManifesting(true);
      let questions: RefinementQuestion[] = [];
      let aiTitle = rawInput;
      try {
        const result = await generateRefinementQuestions(rawInput, newAppType, callUnifiedAI);
        questions = result.questions;
        aiTitle = result.title || rawInput;
      } catch (err: any) {
        if (err?.message?.includes('All AI providers exhausted')) throw err;
      }
      setIsManifesting(false);

      // Show PromptRefiner — user answers questions or skips
      type RefinerResult = { answers: Record<number, string>; title: string; skipped: boolean };
      const { answers, title: finalTitle, skipped } = await new Promise<RefinerResult>(resolve => {
        setPendingRefiner({
          idea: rawInput,
          title: aiTitle,
          questions,
          onBuild: (answers, editedTitle) => resolve({ answers, title: editedTitle, skipped: false }),
          onSkip: (editedTitle) => resolve({ answers: {}, title: editedTitle, skipped: true }),
        });
      });
      setPendingRefiner(null);

      // Build final prompt from answers (or use raw input if skipped)
      setManifestingStep("Refining prompt...");
      setAiStage(1);
      setIsManifesting(true);
      let buildPrompt = rawInput;
      if (!skipped && Object.values(answers).some(v => v.trim())) {
        try {
          buildPrompt = await buildFinalPrompt(rawInput, answers, questions, newAppType, callUnifiedAI);
        } catch (err: any) {
          if (err?.message?.includes('All AI providers exhausted')) throw err;
          buildPrompt = rawInput;
        }
      }
      setIsManifesting(false);

      // Save to Firestore with title + refinement metadata
      const insertData: any = {
        content: finalTitle,
        app_type: newAppType,
        status: "pending",
        votes: 0,
        energy: 0,
        user_id: user?.uid || null,
        created_at: new Date().toISOString(),
        ...(questions.length > 0 ? {
          refinement_questions: questions.map(q => ({ question: q.question, priority: q.priority, why: q.why })),
          refinement_answers: answers,
        } : {}),
      };
      const docRef = await addDoc(collection(db, "suggestions"), insertData);
      const newSuggestion = { id: docRef.id, ...insertData } as Suggestion;
      consumeQuota(5);

      await buildEvolution(newSuggestion, undefined, buildPrompt);
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
    <div className="w-full bg-gray-950 text-white flex flex-col overflow-hidden" style={{ height: '100dvh', zoom: zoomScale !== 1 ? zoomScale : undefined }}>

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

      {/* Prompt refiner overlay */}
      <AnimatePresence>
        {pendingRefiner && (
          <PromptRefiner
            idea={pendingRefiner.idea}
            title={pendingRefiner.title}
            questions={pendingRefiner.questions}
            appType={newAppTypeRef.current}
            onTypeChange={setNewAppType}
            onBuild={pendingRefiner.onBuild}
            onSkip={pendingRefiner.onSkip}
            callAI={callUnifiedAI}
          />
        )}
      </AnimatePresence>

      {/* Building overlay */}
      <AnimatePresence>
        {isManifesting && <AIProgress stage={aiStage} />}
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
                      Add a free Google Gemini key at aistudio.google.com — takes 30 seconds, no credit card needed
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

      {/* No-GPU banner */}
      <AnimatePresence>
        {showNoGPUBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-none bg-indigo-950/60 border-b border-indigo-700/30 px-4 py-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                <p className="text-sm text-indigo-200 leading-snug min-w-0">
                  Local AI unavailable on this device. Add a free Google Gemini key to start.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setShowSettings(true); setShowNoGPUBanner(false); }}
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

      {/* iOS + WebLLM banner */}
      <AnimatePresence>
        {isIOS && aiProvider === 'web-llm' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
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
                onClick={() => setShowSettings(true)}
                className="shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap"
              >
                Settings
              </button>
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
            <GalaxyField />
            <OrbitRing radius={3.5} opacity={0.18} color="#818cf8" />
            <OrbitRing radius={5.0} opacity={0.11} color="#6366f1" />
            <OrbitRing radius={6.5} opacity={0.07} color="#4f46e5" />
            <OrbitRing radius={7.5} opacity={0.05} color="#4338ca" />
            {allSuggestions
              .filter((s) => s.status === "built" && s.built_code)
              .map((s) => (
                <ModuleNode
                  key={s.id}
                  suggestion={s}
                  onRun={(sg) => setLaunchTarget(sg)}
                  linkedFromLabel={s.user_id && linkedUserMap.has(s.user_id) ? linkedUserMap.get(s.user_id) : undefined}
                  isWatering={wateringId === s.id}
                  forkCount={suggestions.filter(f => f.parent_id === s.id).length}
                  posRef={nodePositionsRef}
                />
              ))}
            <ForkLines
              suggestions={allSuggestions.filter(s => s.status === "built" && !!s.built_code)}
              posRef={nodePositionsRef}
            />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              maxPolarAngle={Math.PI / 1.5}
              minPolarAngle={Math.PI / 3}
            />
          </Canvas>

          {/* Landing hero — shown for logged-out guests with empty input */}
          <AnimatePresence>
            {showLanding && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-10 px-5 pb-20 pointer-events-none"
              >
                {/* Hero */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center leading-tight tracking-tight max-w-lg mb-3">
                  Imagine an app.<br />
                  <span className="text-indigo-400">AI builds it.</span>{" "}
                  <span className="text-white/70">Share it.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-sm sm:text-base text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
                  Type any idea. Watch it become a real working app in 30 seconds. Built on AI, shared with the world.
                </p>

                {/* Example chips */}
                <div className="flex flex-wrap justify-center gap-2 mb-7 pointer-events-auto">
                  {EXAMPLE_CHIPS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => {
                        setInput(chip);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="px-3.5 py-1.5 bg-white/8 hover:bg-indigo-500/20 border border-white/12 hover:border-indigo-500/40 rounded-full text-xs text-white/70 hover:text-white transition-all backdrop-blur-sm"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Social proof */}
                <div className="flex items-center gap-4 mb-8 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400/70" />
                    <span className="tabular-nums">
                      <CountUp target={socialProof.apps} />
                    </span>
                    {" "}apps built
                  </span>
                  <span className="w-px h-3 bg-gray-700" />
                  <span className="tabular-nums">
                    By <CountUp target={socialProof.creators} /> creator{socialProof.creators !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* How it works */}
                <div className="flex items-start gap-4 sm:gap-8">
                  {[
                    { icon: MessageSquare, step: "1", label: "Describe your idea" },
                    { icon: Sparkles,      step: "2", label: "AI asks you questions" },
                    { icon: Globe,         step: "3", label: "App appears in galaxy" },
                  ].map(({ icon: Icon, step, label }) => (
                    <div key={step} className="flex flex-col items-center gap-1.5 text-center max-w-[80px]">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-widest">{step}</span>
                      <span className="text-[11px] text-gray-400 leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rotating hero text — shown for signed-in users or while typing */}
          {!showLanding && (
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
          )}
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
      {/* Two rows on mobile (pills then input), one row on desktop */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-[100] bg-gray-900 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center sm:h-[68px]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        {/* ── Row 1: type pills + provider icon (both breakpoints) ── */}
        <div className="flex items-center gap-2 px-3 sm:px-4 pt-2 sm:py-0 sm:shrink-0">
          <div
            className="flex gap-1.5 overflow-x-auto flex-1 sm:flex-none"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
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

          {/* Provider icon — right of pills on mobile, hidden on sm+ (re-shown in input row) */}
          <div ref={providerDropRef} className="relative shrink-0 sm:hidden">
            {(() => {
              const active = MANIFEST_PROVIDERS.find((p) => p.id === aiProvider) || MANIFEST_PROVIDERS[0];
              return (
                <button
                  onClick={() => setShowProviderDrop((prev) => !prev)}
                  className="flex items-center justify-center w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-all"
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
                      onClick={() => { setAiProvider(p.id); setSelectedModel(p.model); localStorage.setItem("manifest_provider", p.id); setShowProviderDrop(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${aiProvider === p.id ? "bg-indigo-500/20 text-indigo-400" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                    >
                      <p.Icon className="w-4 h-4 shrink-0" />{p.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Row 2: input + provider (desktop) + MANIFEST ── */}
        <div className="flex items-center gap-2 px-3 sm:px-4 pt-1.5 pb-1 sm:py-0 flex-1 min-w-0">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
            placeholder={`Describe your ${newAppType} app...`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="app-description"
            className="flex-1 min-w-0 min-h-[44px] bg-gray-800 border border-gray-700 rounded-lg px-3 sm:px-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />

          {/* Provider selector — desktop only */}
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
                  title={isFallback ? `Fallback: ${activeProvider}` : active.label}
                >
                  <active.Icon className="w-3.5 h-3.5" />
                  <span className="max-w-[80px] truncate">{isFallback ? activeProvider : active.label}</span>
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
                      onClick={() => { setAiProvider(p.id); setSelectedModel(p.model); localStorage.setItem("manifest_provider", p.id); setShowProviderDrop(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${aiProvider === p.id ? "bg-indigo-500/20 text-indigo-400" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                    >
                      <p.Icon className="w-4 h-4 shrink-0" />{p.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleSuggest}
            disabled={!canSuggest || isLoading || !!isBuilding || isManifesting || !input.trim()}
            className="flex items-center gap-2 px-4 h-[44px] bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-all shrink-0"
          >
            {isManifesting || isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="hidden sm:inline">MANIFEST</span>
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
            providerKeysMap={providerKeys}
            addProviderKey={addProviderKey}
            removeProviderKey={removeProviderKey}
            customEndpoint={customEndpoint}
            setCustomEndpoint={setCustomEndpoint}
            ollamaEndpoint={ollamaEndpoint}
            setOllamaEndpoint={setOllamaEndpoint}
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
            webGPUSupported={webGPUSupported}
            user={user}
            onLinkedAccountsChange={refreshLinkedAccounts}
            zoomScale={zoomScale}
            onZoomChange={updateZoom}
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
            currentUserId={user?.uid}
            onClose={() => setLaunchTarget(null)}
            onVote={handleVote}
            onFork={() => { setForkTarget(launchTarget); setLaunchTarget(null); }}
            onToggleVisibility={handleToggleVisibility}
            onWater={user?.uid === launchTarget.user_id && !launchTarget.id.startsWith('seed_') ? handleWaterApp : undefined}
            isWatering={wateringId === launchTarget.id}
            isFreeProvider={activeProvider === 'webllm'}
            quota={apiQuota}
            pendingEvolution={pendingEvolution}
            onClearEvolution={() => setPendingEvolution(null)}
            showWaterDialog={showWaterDialog}
            setShowWaterDialog={setShowWaterDialog}
            chatProvider={aiProvider}
            chatProviderOptions={MANIFEST_PROVIDERS.map(p => ({ id: p.id, label: p.label }))}
            onChatProviderSwitch={(id) => {
              setAiProvider(id as any);
              const p = MANIFEST_PROVIDERS.find(mp => mp.id === id);
              if (p) setSelectedModel(p.model);
            }}
            onRefine={async (message: string, currentCode: string) => {
              const isTruncated = message.includes("incomplete") || message.includes("truncated");
              const isFix = message.startsWith("Fix this error:") || isTruncated;
              const systemPrompt = isFix
                ? "You are fixing broken React code. Return ONLY the corrected function body. No imports. No TypeScript. No markdown. Just working JSX."
                : aiConfig.systemPrompt;
              const taskInstr = isTruncated
                ? `The previous code was truncated. Generate a COMPLETE working version that fits in your response. Simplify if needed - working simple beats broken complex.\n\nReturn ONLY the complete App function, no imports, no markdown.`
                : isFix
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

      {/* ── JOIN MODAL ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {joinToken && (
          <JoinModal
            token={joinToken}
            user={user}
            onAccepted={() => { setJoinToken(null); refreshLinkedAccounts(); }}
            onClose={() => setJoinToken(null)}
            onSignInRequired={() => { setShowAuth(true); }}
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
                  {onboardingStep === 1 && <Cpu className="w-6 h-6 text-indigo-400" />}
                  {onboardingStep === 2 && <MessageSquare className="w-6 h-6 text-indigo-400" />}
                  {onboardingStep === 3 && <Globe className="w-6 h-6 text-indigo-400" />}
                </div>
                <h2 className="text-white text-xl font-bold mb-2">{ONBOARDING_STEPS[onboardingStep].title}</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{ONBOARDING_STEPS[onboardingStep].body}</p>

                {/* Step 0: dynamic GPU note */}
                {onboardingStep === 0 && (
                  <p className="text-indigo-400 text-xs mt-4 bg-indigo-500/10 rounded-lg px-3 py-2">
                    {webGPUSupported
                      ? "Free local AI is active by default. No API key needed to start."
                      : "Local AI requires a GPU. Add a free Google Gemini key to start — 30 seconds."}
                  </p>
                )}

                {/* Step 1: provider selection */}
                {onboardingStep === 1 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {MANIFEST_PROVIDERS.filter(p => webGPUSupported !== false || p.id !== 'web-llm').map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setAiProvider(p.id as any); setSelectedModel(p.model); }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          aiProvider === p.id
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                      >
                        <p.Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{p.label}</span>
                        {aiProvider === p.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
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

// ── COUNT UP ──────────────────────────────────────────────────────────────────

function CountUp({ target }: { target: number }) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (target === 0) return;
    const duration = 1400;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{count}</>;
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
      <div className="flex-none hidden sm:grid grid-cols-[1fr_72px_96px_180px] gap-3 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-800">
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
              <div className="hidden sm:grid grid-cols-[1fr_72px_96px_180px] gap-3 items-center px-4 py-3">
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
                <div className="flex justify-center overflow-hidden">
                  <span className={`px-2 py-1 rounded text-xs font-medium truncate max-w-full ${isBuilt ? "bg-indigo-500/20 text-indigo-400" : "bg-gray-800 text-gray-400"}`}>{s.status}</span>
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
  providerKeysMap: Record<string, string[]>;
  addProviderKey: (provider: string, key: string) => void;
  removeProviderKey: (provider: string, index: number) => void;
  customEndpoint: string;
  setCustomEndpoint: (e: string) => void;
  ollamaEndpoint: string;
  setOllamaEndpoint: (e: string) => void;
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
  webGPUSupported?: boolean | null;
  user?: any;
  onLinkedAccountsChange?: () => void;
  zoomScale: number;
  onZoomChange: (s: number) => void;
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
  openrouter: [
    { value: "google/gemini-2.0-flash-exp:free",       label: "Gemini 2.0 Flash (free)" },
    { value: "meta-llama/llama-3.2-3b-instruct:free",  label: "Llama 3.2 3B (free)" },
    { value: "mistralai/mistral-7b-instruct:free",     label: "Mistral 7B (free)" },
    { value: "deepseek/deepseek-chat",                 label: "DeepSeek Chat (cheap)" },
    { value: "openai/gpt-4o-mini",                     label: "GPT-4o Mini (cheap)" },
    { value: "anthropic/claude-3.5-sonnet",            label: "Claude 3.5 Sonnet (best)" },
  ],
  ollama: [
    { value: "gemma2:2b",       label: "Gemma 2 2B (small, fast)" },
    { value: "gemma2:9b",       label: "Gemma 2 9B (balanced)" },
    { value: "gemma3:27b",      label: "Gemma 3 27B (capable)" },
    { value: "llama3.2",        label: "Llama 3.2" },
    { value: "qwen2.5",         label: "Qwen 2.5" },
    { value: "mistral",         label: "Mistral" },
    { value: "deepseek-coder",  label: "DeepSeek Coder" },
  ],
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
  openrouter:    { badge: 'FREE',          hint: 'Many models through one key — free tier included. No separate signups.',                              link: 'https://openrouter.ai/keys' },
  ollama:        { badge: 'FREE',          hint: 'Free & unlimited local AI. Install at ollama.com, then run: ollama serve && ollama pull gemma2:2b' },
};

function SettingsModal({
  onClose, aiProvider, setAiProvider, selectedModel, setSelectedModel,
  userApiKey, saveApiKeyToAccount, providerKeysMap, addProviderKey, removeProviderKey,
  customEndpoint, setCustomEndpoint, ollamaEndpoint, setOllamaEndpoint,
  forceCloud, setForceCloud, aiConfig, setAiConfig, providerHealth,
  checkHealth, isTestingAI, testResponse, handleTestNeuralLink, setTestResponse,
  settingsMessage, setSettingsMessage, webGPUSupported, user, onLinkedAccountsChange,
  zoomScale, onZoomChange,
}: SettingsModalProps) {
  const [tab, setTab] = useState<"ai" | "network">("ai");
  const [newKeyInput, setNewKeyInput] = useState("");
  const [ollamaTestResult, setOllamaTestResult] = useState<string | null>(null);
  const [ollamaTestLoading, setOllamaTestLoading] = useState(false);
  const providers = ["google", "openai", "anthropic", "openrouter", "custom", "web-llm", "ollama"] as const;
  const providerModels = MODELS[aiProvider] || [];
  const currentKeys = providerKeysMap[aiProvider] || [];

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

        {/* Tabs — only shown when logged in */}
        {user && (
          <div className="flex gap-1 px-4 pt-3">
            {(["ai", "network"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  tab === t ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {t === "ai" ? "AI Settings" : "My Network"}
              </button>
            ))}
          </div>
        )}

        {settingsMessage && tab === "ai" && (
          <div className="mx-4 mt-4 flex items-start justify-between gap-3 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-sm text-amber-300">
            <span>{settingsMessage}</span>
            <button onClick={() => setSettingsMessage?.(null)} className="shrink-0 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Network tab content */}
        {tab === "network" && user && (
          <div className="p-4">
            <NetworkPanel user={user} onLinkedAccountsChange={() => onLinkedAccountsChange?.()} />
          </div>
        )}

        <div className={tab === "network" ? "hidden" : "p-4 space-y-5"}>
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
            const needsKey = !["web-llm", "gemini-nano", "ollama"].includes(aiProvider);
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
                  {aiProvider === 'openrouter' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-cyan-900/40 text-cyan-400 border-cyan-800/50">
                      MANY MODELS
                    </span>
                  )}
                  {aiProvider === 'web-llm' && (
                    <span className="text-[10px] text-gray-500 font-medium">Requires GPU</span>
                  )}
                </div>
                {/* WebGPU not available warning */}
                {aiProvider === 'web-llm' && webGPUSupported === false && (
                  <div className="flex items-start gap-2 mb-3 p-3 bg-amber-900/30 border border-amber-700/40 rounded-lg text-xs text-amber-300 leading-relaxed">
                    <Cpu className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    Your device doesn't support local AI (no compatible GPU). Try Google Gemini (free) or OpenAI instead.
                  </div>
                )}
                {needsKey && (
                  <div className="space-y-2">
                    {/* Existing keys list */}
                    {currentKeys.map((k, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-gray-300 font-mono truncate">
                          {"•".repeat(Math.max(0, k.length - 6))}{k.slice(-6)}
                        </span>
                        {currentKeys.length > 1 && (
                          <span className="text-[10px] text-indigo-400 font-bold mr-1">
                            {i === 0 ? "active" : `#${i + 1}`}
                          </span>
                        )}
                        <button
                          onClick={() => removeProviderKey(aiProvider, i)}
                          className="shrink-0 text-gray-600 hover:text-red-400 transition-colors"
                          title="Remove key"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {/* Add new key */}
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder={`Add ${aiProvider} API key...`}
                        value={newKeyInput}
                        onChange={(e) => setNewKeyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newKeyInput.trim()) {
                            addProviderKey(aiProvider, newKeyInput.trim());
                            setNewKeyInput("");
                          }
                        }}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <button
                        onClick={() => {
                          if (newKeyInput.trim()) {
                            addProviderKey(aiProvider, newKeyInput.trim());
                            setNewKeyInput("");
                          }
                        }}
                        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium text-white transition-all"
                      >
                        Add
                      </button>
                    </div>
                    {currentKeys.length > 1 && (
                      <p className="text-[10px] text-gray-500">
                        {currentKeys.length} keys — rotates automatically on rate limit
                      </p>
                    )}
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

          {/* Ollama endpoint + helpers */}
          {aiProvider === "ollama" && (
            <section className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Ollama Endpoint
                </label>
                <input
                  type="text"
                  value={ollamaEndpoint}
                  onChange={(e) => setOllamaEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={ollamaTestLoading}
                  onClick={async () => {
                    setOllamaTestLoading(true);
                    setOllamaTestResult(null);
                    try {
                      const res = await fetch(`${ollamaEndpoint}/api/tags`);
                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                      const data = await res.json();
                      const models = (data.models || []).map((m: any) => m.name).join(', ');
                      setOllamaTestResult(`Connected ✓ — Models: ${models || 'none pulled yet'}`);
                    } catch (e: any) {
                      setOllamaTestResult(`Error: ${e.message}`);
                    } finally {
                      setOllamaTestLoading(false);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-all"
                >
                  {ollamaTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  Test Ollama
                </button>
              </div>
              {ollamaTestResult && (
                <div className={`flex items-center justify-between p-3 rounded-lg text-xs ${ollamaTestResult.startsWith('Error') ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-green-900/30 border border-green-800 text-green-300'}`}>
                  <span className="leading-relaxed">{ollamaTestResult}</span>
                  <button onClick={() => setOllamaTestResult(null)} className="ml-2 opacity-50 hover:opacity-100 shrink-0"><X className="w-3 h-3" /></button>
                </div>
              )}
              <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg text-xs text-amber-300/80 leading-relaxed">
                <span className="font-semibold text-amber-300">CORS on Windows:</span> Set <code className="bg-black/30 px-1 rounded">OLLAMA_ORIGINS=*</code> then restart Ollama Desktop.
              </div>
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

          {/* Zoom */}
          <section className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-white">Zoom</p>
              <p className="text-xs text-gray-500">Scale UI for readability</p>
            </div>
            <div className="flex items-center gap-1">
              {([0.8, 1.0, 1.2] as const).map(s => (
                <button
                  key={s}
                  onClick={() => onZoomChange(s)}
                  className={`w-10 h-8 rounded-lg text-sm font-bold transition-all ${
                    zoomScale === s ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {s === 0.8 ? '−' : s === 1.2 ? '+' : '⊙'}
                </button>
              ))}
            </div>
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

// ── CHAT INPUT BAR (defined OUTSIDE LaunchModal so component identity is stable) ──

interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  content: string; // text content (empty for images)
  kind: 'text' | 'image';
}

const CHAT_SKILLS = [
  { id: 'phone',    label: '📱 Phone'    },
  { id: 'desktop',  label: '🖥️ Desktop'  },
  { id: 'game',     label: '🎮 Game'     },
  { id: 'terminal', label: '⌨️ Terminal' },
  { id: 'music',    label: '🎵 Music'    },
  { id: 'art',      label: '🎨 Art'      },
] as const;

const ChatInputBar = React.memo(function ChatInputBar({
  lastError,
  isFixing,
  onSend,
  aiProvider,
  providerOptions,
  onProviderSwitch,
}: {
  lastError: string | null;
  isFixing: boolean;
  onSend: (text: string) => void;
  aiProvider?: string;
  providerOptions?: { id: string; label: string }[];
  onProviderSwitch?: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuSection, setMenuSection] = useState<null | 'skill' | 'provider'>(null);

  // Close on click-outside
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setMenuSection(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const formatSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

  const handleFiles = (files: FileList | null, kind: 'text' | 'image') => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          id: Math.random().toString(36).slice(2),
          name: file.name,
          size: file.size,
          content: kind === 'text' ? (reader.result as string) : '',
          kind,
        }]);
      };
      if (kind === 'image') reader.readAsDataURL(file);
      else reader.readAsText(file);
    });
    // Reset so the same file can be re-selected
    if (fileInputRef.current)  fileInputRef.current.value  = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeAttachment = (id: string) =>
    setAttachments(prev => prev.filter(a => a.id !== id));

  const submit = () => {
    const rawText = inputRef.current?.value.trim() ?? "";
    if (isFixing || (!rawText && attachments.length === 0)) return;

    const userText = rawText || `Use the attached ${attachments.length === 1 ? 'file' : 'files'} as reference.`;
    const MAX_CHARS = 4000;
    let totalChars = 0;
    const ctxParts: string[] = [];

    for (const att of attachments) {
      if (att.kind === 'image') {
        ctxParts.push(`[Reference image attached: ${att.name}]`);
        continue;
      }
      const remaining = MAX_CHARS - totalChars;
      if (remaining <= 0) {
        ctxParts.push(`[${att.name}: omitted — 4000-char context limit reached]`);
        continue;
      }
      const snippet = att.content.length > remaining
        ? att.content.slice(0, remaining) + '\n[... truncated]'
        : att.content;
      ctxParts.push(`REFERENCE FILE (${att.name}):\n${snippet}`);
      totalChars += snippet.length;
    }

    const fullMessage = ctxParts.length > 0
      ? `${ctxParts.join('\n\n')}\n\n${userText}`
      : userText;

    onSend(fullMessage.trim());
    if (inputRef.current) inputRef.current.value = "";
    setAttachments([]);
  };

  return (
    <div className="flex-none p-3 border-t border-gray-800 space-y-2">
      {/* Fix Error button */}
      {lastError && !isFixing && (
        <button
          onClick={() => onSend(`Fix this error: ${lastError}`)}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 rounded-lg text-[11px] font-bold text-red-400 transition-all"
        >
          <Wrench className="w-3 h-3" /> Fix Error
        </button>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-indigo-950/60 border border-indigo-700/50 rounded-full text-[10px] text-indigo-300 max-w-[180px]">
              <span className="shrink-0">{att.kind === 'image' ? '🖼️' : '📎'}</span>
              <span className="truncate">{att.name}</span>
              <span className="text-indigo-500 shrink-0 ml-0.5">({formatSize(att.size)})</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="shrink-0 ml-0.5 w-3.5 h-3.5 rounded-full bg-indigo-800/50 hover:bg-red-700/60 flex items-center justify-center transition-colors"
              >
                <X className="w-2 h-2" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-1.5">
        {/* "+" button + popup (self-contained with ref for click-outside) */}
        <div className="relative shrink-0" ref={menuRef}>
          {/* Hidden file pickers */}
          <input ref={fileInputRef}  type="file" accept=".txt,.csv,.json,.md" multiple className="hidden"
            onChange={e => { handleFiles(e.target.files, 'text');  setShowMenu(false); }} />
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { handleFiles(e.target.files, 'image'); setShowMenu(false); }} />

          {/* "+" button */}
          <button
            type="button"
            onClick={() => { setMenuSection(null); setShowMenu(s => !s); }}
            disabled={isFixing}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all disabled:opacity-40 ${
              showMenu
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Attach files or switch options"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Popup menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.1 }}
                className="absolute bottom-full left-0 mb-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[300]"
              >
                {/* ── Main menu ── */}
                {menuSection === null && (
                  <div className="py-1">
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => { fileInputRef.current?.click(); }}>
                      <span className="text-base leading-none">📎</span>
                      <span className="flex-1">Attach file</span>
                      <span className="text-[9px] text-gray-600">.txt .csv .json .md</span>
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => { imageInputRef.current?.click(); }}>
                      <span className="text-base leading-none">🖼️</span>
                      <span className="flex-1">Attach image</span>
                    </button>
                    <div className="h-px bg-gray-800 mx-3 my-1" />
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => setMenuSection('skill')}>
                      <span className="text-base leading-none">🎯</span>
                      <span className="flex-1">Choose skill</span>
                      <ChevronRight className="w-3 h-3 opacity-40" />
                    </button>
                    {providerOptions && providerOptions.length > 0 && (
                      <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => setMenuSection('provider')}>
                        <span className="text-base leading-none">⚙️</span>
                        <span className="flex-1">AI provider</span>
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                    )}
                  </div>
                )}

                {/* ── Skill submenu ── */}
                {menuSection === 'skill' && (
                  <div className="py-1">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
                      <button onClick={() => setMenuSection(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-black uppercase tracking-[3px] text-gray-500">Choose Skill</span>
                    </div>
                    {CHAT_SKILLS.map(skill => (
                      <button key={skill.id} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => {
                        const msg = `Rebuild this as a ${skill.id} type app — adapt design, layout, and interactions for ${skill.id}.`;
                        if (inputRef.current) { inputRef.current.value = msg; inputRef.current.focus(); }
                        setShowMenu(false); setMenuSection(null);
                      }}>
                        <span className="text-base leading-none">{skill.label.split(' ')[0]}</span>
                        <span>{skill.label.split(' ').slice(1).join(' ')}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Provider submenu ── */}
                {menuSection === 'provider' && (
                  <div className="py-1">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
                      <button onClick={() => setMenuSection(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-black uppercase tracking-[3px] text-gray-500">AI Provider</span>
                    </div>
                    {(providerOptions || []).map(p => (
                      <button key={p.id}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] transition-colors text-left ${aiProvider === p.id ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                        onClick={() => { onProviderSwitch?.(p.id); setShowMenu(false); setMenuSection(null); }}
                      >
                        {aiProvider === p.id
                          ? <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-0.5" />
                          : <span className="w-1.5 h-1.5 shrink-0" />
                        }
                        <span className="flex-1">{p.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && submit()}
          placeholder={attachments.length > 0 ? "What to do with these files?" : "Improve or change this app..."}
          disabled={isFixing}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          name="chat-message"
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40"
        />

        {/* Send button */}
        <button
          onClick={submit}
          disabled={isFixing}
          className="w-9 h-9 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 rounded-lg flex items-center justify-center text-white transition-all shrink-0"
        >
          {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
});

const ChatMessages = React.memo(function ChatMessages({
  messages,
  containerRef,
}: {
  messages: Array<{ role: string; text: string }>;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
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
    </div>
  );
});

// ── LAUNCH MODAL ──────────────────────────────────────────────────────────────

function LaunchModal({
  suggestion,
  currentUserId,
  onClose,
  onVote,
  onFork,
  onToggleVisibility,
  onWater,
  isWatering,
  isFreeProvider,
  quota,
  pendingEvolution,
  onClearEvolution,
  showWaterDialog,
  setShowWaterDialog,
  onRefine,
  chatProvider,
  chatProviderOptions,
  onChatProviderSwitch,
}: {
  suggestion: Suggestion;
  currentUserId?: string;
  onClose: () => void;
  onVote: (id: string, votes: number) => void;
  onFork?: () => void;
  onToggleVisibility?: (vis: 'public' | 'private') => void;
  onWater?: (focus: FocusId, depth: DepthId, note: string) => void;
  isWatering?: boolean;
  isFreeProvider?: boolean;
  quota?: number;
  pendingEvolution?: AppEvolution | null;
  onClearEvolution?: () => void;
  showWaterDialog?: boolean;
  setShowWaterDialog?: (v: boolean) => void;
  onRefine?: (message: string, code: string) => Promise<string>;
  chatProvider?: string;
  chatProviderOptions?: { id: string; label: string }[];
  onChatProviderSwitch?: (id: string) => void;
}) {
  const [code, setCode] = useState(suggestion.built_code || "");
  const [lastError, setLastError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixStage, setFixStage] = useState<AIStageIndex>(0);
  const [autoRetries, setAutoRetries] = useState(0);
  const [voted, setVoted] = useState(false);
  const [showVotePop, setShowVotePop] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const desktopChatContainerRef = useRef<HTMLDivElement>(null);
  const mobileChatContainerRef = useRef<HTMLDivElement>(null);
  const autoRetryRef = useRef(0);

  const sendMessageRef = useRef<(msg: string) => void>(() => {});

  const handleCodeError = (msg: string) => {
    setLastError(msg);
    setMessages(prev => {
      if (prev.at(-1)?.text.startsWith("⚠️")) return prev;
      return [...prev, { role: "ai", text: `⚠️ ${msg}` }];
    });
    // Auto-retry truncated code up to 3 times
    if ((msg.includes("incomplete") || msg.includes("truncated")) && onRefine) {
      if (autoRetryRef.current < 3) {
        autoRetryRef.current += 1;
        setAutoRetries(autoRetryRef.current);
        const retryMsg = "The previous code was truncated. Generate a COMPLETE working version that fits in your response. Simplify if needed - working simple beats broken complex.";
        setTimeout(() => sendMessageRef.current(retryMsg), 800);
      }
    }
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "EVO_ERROR") handleCodeError(e.data.msg);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setLastError(null); autoRetryRef.current = 0; setAutoRetries(0); }, [code]);

  useEffect(() => {
    const scrollToBottom = (el: HTMLDivElement | null) => {
      if (!el) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
        el.scrollTop = el.scrollHeight;
      }
    };
    scrollToBottom(desktopChatContainerRef.current);
    scrollToBottom(mobileChatContainerRef.current);
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text?.trim() || !onRefine || isFixing) return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsFixing(true);
    setFixStage(0);
    const t1 = setTimeout(() => setFixStage(1), 700);
    const t2 = setTimeout(() => setFixStage(2), 1800);
    const t3 = setTimeout(() => setFixStage(3), 3500);
    try {
      const newCode = await onRefine(text, code);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setFixStage(4);
      if (newCode) {
        setCode(newCode);
        await new Promise(r => setTimeout(r, 300));
        setFixStage(5);
        await new Promise(r => setTimeout(r, 300));
        setFixStage(6);
        await new Promise(r => setTimeout(r, 500));
        setMessages(prev => [...prev, { role: "ai", text: "Done — app updated." }]);
      }
    } catch (e: any) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setMessages(prev => [...prev, { role: "ai", text: "Error: " + e.message }]);
    } finally {
      setIsFixing(false);
    }
  };

  // Keep sendMessageRef always pointing at the latest sendMessage closure
  useEffect(() => { sendMessageRef.current = sendMessage; }); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Visibility toggle — owner only, not seed apps */}
        {onToggleVisibility && currentUserId && suggestion.user_id === currentUserId && !suggestion.id.startsWith('seed_') && (
          <button
            onClick={() => onToggleVisibility(suggestion.visibility === 'public' ? 'private' : 'public')}
            title={suggestion.visibility === 'public' ? 'Make private' : 'Make public'}
            className="flex w-8 h-8 rounded-lg items-center justify-center bg-gray-800 text-gray-400 hover:text-white transition-all shrink-0"
          >
            {suggestion.visibility === 'public'
              ? <Globe className="w-3.5 h-3.5 text-emerald-400" />
              : <Lock className="w-3.5 h-3.5" />
            }
          </button>
        )}

        {/* Water — owner only, not seeds */}
        {onWater && setShowWaterDialog && (
          <button
            onClick={() => setShowWaterDialog(true)}
            title="Water this app — evolve it with AI"
            disabled={isWatering}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all shrink-0 ${
              isWatering
                ? 'bg-cyan-500/20 text-cyan-400 animate-pulse cursor-wait'
                : 'bg-gray-800 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            {isWatering ? 'Evolving…' : 'Water'}
          </button>
        )}

        {/* Share — always visible for built apps that aren't seeds */}
        {!suggestion.id.startsWith('seed_') && (
          <ShareMenu appId={suggestion.id} appTitle={suggestion.content} />
        )}

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

        {/* Journey toggle — if questions were asked */}
        {suggestion.refinement_questions && suggestion.refinement_questions.length > 0 && (
          <button
            onClick={() => { setShowJourney(p => !p); setShowPlan(false); setShowRoadmap(false); }}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${
              showJourney ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            title="View Build Journey"
          >
            <Activity className="w-4 h-4" />
          </button>
        )}

        {/* Plan toggle — only if plan exists */}
        {suggestion.plan && (
          <button
            onClick={() => { setShowPlan(p => !p); setShowJourney(false); setShowRoadmap(false); }}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 ${
              showPlan ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            title="View Goal Plan"
          >
            <Layers className="w-4 h-4" />
          </button>
        )}

        {/* Roadmap toggle — shown for seed builds */}
        {suggestion.roadmap && (
          <button
            onClick={() => { setShowRoadmap(p => !p); setShowPlan(false); setShowJourney(false); }}
            className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all shrink-0 text-sm ${
              showRoadmap ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            title="Growth Roadmap"
          >
            🌱
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

      {/* Roadmap panel — seed growth plan */}
      <AnimatePresence>
        {showRoadmap && suggestion.roadmap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-emerald-500/15"
          >
            <div className="px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[4px] text-emerald-400 mb-3 flex items-center gap-1.5">
                🌱 Growth Roadmap
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[2px] text-emerald-400/80 mb-1.5">✅ Growing now</p>
                  {(suggestion.roadmap.now || []).map((item, i) => (
                    <p key={i} className="text-[10px] text-white/60 leading-relaxed">• {item}</p>
                  ))}
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[2px] text-cyan-400/80 mb-1.5">🌱 Next watering</p>
                  {(suggestion.roadmap.next || []).map((item, i) => (
                    <p key={i} className="text-[10px] text-white/40 leading-relaxed">• {item}</p>
                  ))}
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[2px] text-indigo-400/80 mb-1.5">🔮 Future growth</p>
                  {(suggestion.roadmap.future || []).map((item, i) => (
                    <p key={i} className="text-[10px] text-white/30 leading-relaxed">• {item}</p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journey panel — questions asked + answers given */}
      <AnimatePresence>
        {showJourney && suggestion.refinement_questions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden bg-gray-900/80 border-b border-indigo-500/15"
          >
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
                        {answer ? (
                          <p className="text-[10px] text-indigo-300/80 font-medium">→ {answer}</p>
                        ) : (
                          <p className="text-[10px] text-white/20 italic">skipped</p>
                        )}
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
        {/* Preview — always full width on mobile, shrinks on desktop when chat open */}
        <div className="flex-1 relative min-w-0">
          <AppSandbox code={code} appType={suggestion.app_type} className="absolute inset-0 w-full h-full" onError={handleCodeError} />

          {/* Fix with AI — always visible when there's an error */}
          <AnimatePresence>
            {lastError && !isFixing && (
              <>
                {/* Mobile: circular FAB bottom-left */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="sm:hidden absolute z-[9999] pointer-events-none"
                  style={{ bottom: '88px', left: '16px' }}
                >
                  <button
                    onClick={() => sendMessage(lastError.includes("incomplete") || lastError.includes("truncated")
                      ? `This code is broken with error: ${lastError}. Generate a COMPLETE working version. Simplify if needed.`
                      : `Fix this error: ${lastError}`)}
                    className="pointer-events-auto w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full shadow-xl flex items-center justify-center text-white active:scale-90 transition-all"
                    title="Fix with AI"
                  >
                    <Wrench className="w-6 h-6" />
                  </button>
                </motion.div>

                {/* Desktop: banner bottom-center */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="hidden sm:flex absolute bottom-4 left-0 right-0 justify-center z-[9999] pointer-events-none"
                >
                  <button
                    onClick={() => sendMessage(lastError.includes("incomplete") || lastError.includes("truncated")
                      ? `This code is broken with error: ${lastError}. Generate a COMPLETE working version. Simplify if needed.`
                      : `Fix this error: ${lastError}`)}
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold text-white shadow-xl transition-all active:scale-95"
                  >
                    <Wrench className="w-4 h-4" />
                    {autoRetries > 0 ? `Fix with AI (retry ${autoRetries}/3)` : "Fix with AI"}
                  </button>
                </motion.div>
              </>
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
                <ChatMessages messages={messages} containerRef={desktopChatContainerRef} />
                <ChatInputBar lastError={lastError} isFixing={isFixing} onSend={sendMessage}
                  aiProvider={chatProvider} providerOptions={chatProviderOptions} onProviderSwitch={onChatProviderSwitch} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fix-with-AI progress overlay */}
      <AnimatePresence>
        {isFixing && <AIProgress stage={fixStage} label="Fixing" highZ />}
      </AnimatePresence>

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
            <ChatMessages messages={messages} containerRef={mobileChatContainerRef} />
            <ChatInputBar lastError={lastError} isFixing={isFixing} onSend={sendMessage}
              aiProvider={chatProvider} providerOptions={chatProviderOptions} onProviderSwitch={onChatProviderSwitch} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Water dialog */}
      <AnimatePresence>
        {showWaterDialog && onWater && setShowWaterDialog && (
          <WaterDialog
            suggestion={suggestion}
            quota={quota ?? 100}
            isFree={isFreeProvider ?? false}
            onWater={(focus, depth, note) => {
              setShowWaterDialog(false);
              onWater(focus, depth, note);
            }}
            onClose={() => setShowWaterDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* Diff viewer after evolution */}
      <AnimatePresence>
        {pendingEvolution && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-xl h-[70vh] flex flex-col overflow-hidden shadow-2xl"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
            >
              <DiffViewer
                evolution={pendingEvolution}
                onApply={() => { onClearEvolution?.(); }}
                onRevert={async () => {
                  if (pendingEvolution.prevCode) {
                    await onWater?.(
                      'ux' as FocusId,
                      'gentle' as DepthId,
                      'Revert to previous version'
                    );
                  }
                  onClearEvolution?.();
                }}
                onRetry={() => {
                  onClearEvolution?.();
                  setShowWaterDialog?.(true);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
