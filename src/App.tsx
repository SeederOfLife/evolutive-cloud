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
  Plus, ChevronRight, ChevronLeft, Maximize2
} from "lucide-react";
import { AuthModal } from "./components/AuthModal";
import { SettingsModal } from "./components/SettingsModal";
import { LaunchModal } from "./components/LaunchModal";
import { ForkModal } from "./components/ForkModal";
import { HubView } from "./components/HubView";
import { CountUp } from "./components/CountUp";
import { MANIFEST_PROVIDERS, HERO_PHRASES, EXAMPLE_CHIPS, ONBOARDING_STEPS } from "./constants/appConstants";
import { checkWebGPUSupport } from "./utils/webgpu";
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
    viableProviders,
    viableCheckDone,
    fallbackToast,
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
  const nodePositionsRef   = useRef(new Map<string, THREE.Vector3>());
  const orbitControlsRef  = useRef<any>(null);
  const [wateringId, setWateringId] = useState<string | null>(null);
  const [showWaterDialog, setShowWaterDialog] = useState(false);
  const [pendingEvolution, setPendingEvolution] = useState<AppEvolution | null>(null);

  const userApiKey = useMemo(() => providerKeys[aiProvider]?.[0] || "", [providerKeys, aiProvider]);

  // Detect WebGPU for the Settings modal warning (display only)
  useEffect(() => {
    checkWebGPUSupport().then(supported => setWebGPUSupported(supported));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show "no providers" banner once viability check completes
  useEffect(() => {
    if (viableCheckDone && viableProviders.length === 0) setShowNoGPUBanner(true);
  }, [viableCheckDone, viableProviders.length]);

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

  const handleAutoWaterChange = async (enabled: boolean, interval: number, times: number, focus: string, note: string) => {
    if (!launchTarget || launchTarget.id.startsWith('seed_')) return;
    const update = {
      autoWaterEnabled: enabled,
      autoWaterInterval: interval,
      autoWaterTimes: times,
      autoWaterFocus: focus,
      autoWaterNote: note,
      autoWater: (enabled ? (interval <= 60 ? 'hourly' : 'daily') : 'off') as 'off' | 'hourly' | 'daily',
    };
    await updateDoc(doc(db, "suggestions", launchTarget.id), update);
    setLaunchTarget(prev => prev ? { ...prev, ...update } : null);
  };

  const handleWaterApp = async (focus: FocusId, depth: DepthId, note: string) => {
    if (!launchTarget || launchTarget.id.startsWith('seed_')) return;
    const isFreeProvider = activeProvider === 'web-llm';
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
                  Add a free Google Gemini key to start — 30 seconds, no credit card needed.
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
          onDoubleClick={() => orbitControlsRef.current?.reset()}
        >
          {/* Camera reset button — top-right of the 3D view */}
          <button
            onClick={() => orbitControlsRef.current?.reset()}
            title="Reset view"
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full text-white/50 hover:text-white transition-all active:scale-90"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
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
              ref={orbitControlsRef}
              enablePan={false}
              enableZoom
              minDistance={3}
              maxDistance={25}
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
            onOpenSettings={() => setShowSettings(true)}
            onVote={handleVote}
            onFork={() => { setForkTarget(launchTarget); setLaunchTarget(null); }}
            onToggleVisibility={handleToggleVisibility}
            onWater={user?.uid === launchTarget.user_id && !launchTarget.id.startsWith('seed_') ? handleWaterApp : undefined}
            onAutoWaterChange={user?.uid === launchTarget.user_id && !launchTarget.id.startsWith('seed_') ? handleAutoWaterChange : undefined}
            isWatering={wateringId === launchTarget.id}
            isFreeProvider={activeProvider === 'web-llm'}
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
            onRefine={async (message: string, currentCode: string, onProviderSwitch?: (label: string) => void) => {
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

      {/* Non-blocking fallback toast — appears above fixed footer */}
      <AnimatePresence>
        {fallbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-[calc(max(env(safe-area-inset-bottom),8px)+90px)] left-1/2 -translate-x-1/2 z-[9999] bg-gray-800 border border-gray-600 rounded-full px-4 py-2 text-xs text-gray-300 shadow-xl pointer-events-none whitespace-nowrap"
          >
            {fallbackToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

