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
  ChevronDown, X, Search, Zap, Sparkles, Loader2,
  Settings, Globe, Cpu, User,
  MessageSquare, GitFork, Share2, Lock, Droplets, Server,
  Plus, Maximize2
} from "lucide-react";
import { AuthModal } from "./components/AuthModal";
import { SettingsModal } from "./components/SettingsModal";
import { LaunchModal } from "./components/LaunchModal";
import { ForkModal } from "./components/ForkModal";
import { HubView } from "./components/HubView";
import { CountUp } from "./components/CountUp";
import AppBanners from "./components/AppBanners";
import AppOnboarding from "./components/AppOnboarding";
import { MANIFEST_PROVIDERS, HERO_PHRASES, EXAMPLE_CHIPS } from "./constants/appConstants";
import { checkWebGPUSupport } from "./utils/webgpu";
import OpenAI from "openai";
import {
  addDoc, updateDoc, doc, collection,
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { Suggestion, EvolutionVersion } from "./types";
import { AppSandbox } from "./components/AppSandbox";
import { EvolutiveSeed, ModuleNode, Nebula, OrbitRing, GalaxyField, ForkLines } from "./components/ThreeWorld";
import { ScrollFeed } from "./components/ScrollFeed";
import { useQuota } from "./hooks/useQuota";
import { useAuth } from "./hooks/useAuth";
import { useAI } from "./hooks/useAI";
import { useSuggestions } from "./hooks/useSuggestions";
import { useProjectData } from "./hooks/useProjectData";
import { useBuildApp } from "./generation/useBuildApp";
import { SEED_APPS } from "./services/seedApps";
import { PromptRefiner } from "./components/PromptRefiner";
import { AIProgress } from "./components/AIProgress";
import { NetworkPanel } from "./components/NetworkPanel";
import { JoinModal } from "./components/JoinModal";
import { ShareMenu } from "./components/ShareMenu";
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
  const {
    isFinalized, creatorId, isInitializing,
    linkedUserMap, refreshLinkedAccounts, handleToggleFinalize,
  } = useProjectData(user);

  const [zoomScale, setZoomScaleState] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem('app_zoom_scale') || '1');
    return [0.8, 1.0, 1.2].includes(v) ? v : 1.0;
  });
  const updateZoom = (s: number) => {
    setZoomScaleState(s);
    localStorage.setItem('app_zoom_scale', String(s));
  };

  const [view, setView] = useState<'galaxy' | 'feed' | 'hub'>('galaxy');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [input, setInput] = useState("");
  const [newAppType, setNewAppType] = useState<any>('desktop');
  const newAppTypeRef = useRef<any>('desktop');
  useEffect(() => { newAppTypeRef.current = newAppType; }, [newAppType]);
  const [launchTarget, setLaunchTarget] = useState<Suggestion | null>(null);
  const [forkTarget, setForkTarget] = useState<Suggestion | null>(null);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'built' | 'pending' | 'mine'>('all');
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
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [showNoGPUBanner, setShowNoGPUBanner] = useState(false);
  const [joinToken, setJoinToken] = useState<string | null>(() => {
    const m = window.location.pathname.match(/^\/join\/([a-f0-9]{40})$/);
    return m ? m[1] : null;
  });
  const nodePositionsRef   = useRef(new Map<string, THREE.Vector3>());
  const orbitControlsRef  = useRef<any>(null);
  const [wateringId, setWateringId] = useState<string | null>(null);
  const [showWaterDialog, setShowWaterDialog] = useState(false);
  const [pendingEvolution, setPendingEvolution] = useState<AppEvolution | null>(null);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);

  const userApiKey = useMemo(() => providerKeys[aiProvider]?.[0] || "", [providerKeys, aiProvider]);

  const {
    isBuilding, isManifesting, aiStage, isLoading,
    pendingRefiner, setPendingRefiner, buildEvolution, handleSuggest,
  } = useBuildApp({
    suggestions,
    aiConfig,
    callAI: callUnifiedAI,
    apiQuota,
    consumeQuota,
    user,
    aiProvider,
    providerKeys,
    setAiError,
    setLaunchTarget,
  });

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkWebGPUSupport().then(supported => setWebGPUSupported(supported));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viableCheckDone && viableProviders.length === 0) setShowNoGPUBanner(true);
  }, [viableCheckDone, viableProviders.length]);

  useEffect(() => {
    if (isRateLimited && rateLimitCountdown > maxRateLimitCountdown.current) {
      maxRateLimitCountdown.current = rateLimitCountdown;
    }
    if (!isRateLimited) maxRateLimitCountdown.current = 0;
  }, [isRateLimited, rateLimitCountdown]);

  useEffect(() => {
    const id = setInterval(() => setHeroIndex(i => (i + 1) % HERO_PHRASES.length), 4000);
    return () => clearInterval(id);
  }, []);

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

  useEffect(() => {
    if (!userProfile?.personal_api_key) return;
    try {
      const raw = JSON.parse(userProfile.personal_api_key);
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
      setProviderKeys((prev) => {
        const merged = { ...prev, google: [userProfile.personal_api_key as string] };
        localStorage.setItem("app_hub_keys", JSON.stringify(merged));
        return merged;
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (!user) {
      setProviderKeys({});
      localStorage.removeItem("app_nexus_keys");
      localStorage.removeItem("evolutive_energy_key");
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) setFilterType("mine");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem("pending_invite_token");
    if (pending) {
      localStorage.removeItem("pending_invite_token");
      setJoinToken(pending);
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ─────────────────────────────────────────────────────────────

  const allSuggestions = useMemo(() => {
    const hasBuilt = suggestions.filter(s => s.status === 'built').length > 0;
    if (user && hasBuilt) return suggestions;
    return [
      ...SEED_APPS.map(s => ({ ...s, votes: seedVotes[s.id] !== undefined ? seedVotes[s.id] : s.votes })),
      ...suggestions,
    ];
  }, [user, suggestions, seedVotes]);

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
    const creatorIds = new Set(built.filter(s => !s.id.startsWith('seed_') && s.user_id).map(s => s.user_id!));
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

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const saveApiKeyToAccount = async (key: string, provider: string = aiProvider) => {
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

  const handleVote = (id: string, currentVotes: number) => {
    if (id.startsWith('seed_')) {
      setSeedVotes(prev => ({ ...prev, [id]: (prev[id] !== undefined ? prev[id] : currentVotes) + 1 }));
    } else {
      voteSuggestion(id, currentVotes);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (id.startsWith('seed_')) return;
    try {
      const target = suggestions.find((s) => s.id === id);
      if (target?.user_id && user?.uid && target.user_id !== user.uid && !isCreator) {
        throw new Error("Permission denied.");
      }
      await deleteSuggestion(id);
      if (launchTarget?.id === id) setLaunchTarget(null);
    } catch (err: any) {
      alert(err.message || "Access Denied.");
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
      const prevEvolutions = launchTarget.evolutions ?? [];
      const evolutions: AppEvolution[] = [evolution, ...prevEvolutions].slice(0, 20);
      await updateDoc(doc(db, "suggestions", launchTarget.id), { built_code: evolution.code, evolutions });
      setLaunchTarget(prev => prev ? { ...prev, built_code: evolution.code, evolutions } : null);
      if (!isFreeProvider) {
        const costs: Record<DepthId, number> = { gentle: 10, balanced: 20, wild: 35 };
        consumeQuota(costs[depth]);
      }
      setPendingEvolution(evolution);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`${launchTarget.content} evolved`, { body: evolution.summary });
      }
    } catch (e) {
      console.error("Watering failed:", e);
    } finally {
      setWateringId(null);
    }
  };

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
            <button onClick={() => {}} className="mt-2 text-xs text-gray-600 hover:text-gray-400 transition-colors underline">
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
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white hidden sm:block tracking-wide">EVOLUTIVE</span>
          <span
            className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${
              neuralStatus === "IDLE" ? "bg-gray-800 text-gray-500" : "bg-indigo-500/20 text-indigo-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${neuralStatus === "IDLE" ? "bg-gray-600" : "bg-indigo-400 animate-pulse"}`} />
            <span className="hidden sm:inline">{neuralStatus}</span>
          </span>
        </div>

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

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:block">
            BUILDS: <span className="text-white font-medium">{builtCount}</span>
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
          {user ? (
            <button
              onClick={() => setShowAuth(true)}
              className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center sm:gap-2 transition-all"
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
            >
              <User className="w-4 h-4 text-white sm:hidden" />
              <span className="hidden sm:block text-sm font-medium text-white">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Status banners */}
      <AppBanners
        aiError={aiError}
        setAiError={setAiError}
        isRateLimited={isRateLimited}
        rateLimitCountdown={rateLimitCountdown}
        maxRateLimitCountdownRef={maxRateLimitCountdown}
        webLlmProgress={webLlmProgress}
        showNoGPUBanner={showNoGPUBanner}
        setShowNoGPUBanner={setShowNoGPUBanner}
        isIOS={isIOS}
        aiProvider={aiProvider}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* ── MAIN AREA ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">

        {/* Galaxy (always mounted, shown/hidden) */}
        <div
          style={{ display: view === "galaxy" ? "block" : "none" }}
          className="absolute inset-0"
          onDoubleClick={() => orbitControlsRef.current?.reset()}
        >
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

          {/* Landing hero */}
          <AnimatePresence>
            {showLanding && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-10 px-5 pb-20 pointer-events-none"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center leading-tight tracking-tight max-w-lg mb-3">
                  Imagine an app.<br />
                  <span className="text-indigo-400">AI builds it.</span>{" "}
                  <span className="text-white/70">Share it.</span>
                </h1>
                <p className="text-sm sm:text-base text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
                  Type any idea. Watch it become a real working app in 30 seconds. Built on AI, shared with the world.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-7 pointer-events-auto">
                  {EXAMPLE_CHIPS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => { setInput(chip); setTimeout(() => inputRef.current?.focus(), 50); }}
                      className="px-3.5 py-1.5 bg-white/8 hover:bg-indigo-500/20 border border-white/12 hover:border-indigo-500/40 rounded-full text-xs text-white/70 hover:text-white transition-all backdrop-blur-sm"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 mb-8 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400/70" />
                    <span className="tabular-nums"><CountUp target={socialProof.apps} /></span>{" "}apps built
                  </span>
                  <span className="w-px h-3 bg-gray-700" />
                  <span className="tabular-nums">
                    By <CountUp target={socialProof.creators} /> creator{socialProof.creators !== 1 ? "s" : ""}
                  </span>
                </div>
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

          {/* Rotating hero text */}
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

        {view === "feed" && (
          <ScrollFeed
            suggestions={displaySuggestions}
            onPlay={(s) => setLaunchTarget(s)}
            onVote={handleVote}
            onBuild={(s) => buildEvolution(s)}
          />
        )}

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
      <footer
        className="fixed bottom-0 left-0 right-0 z-[100] bg-gray-900 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center sm:h-[68px]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
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
                  newAppType === type ? "bg-indigo-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <div ref={providerDropRef} className="relative shrink-0 sm:hidden">
            {(() => {
              const active = MANIFEST_PROVIDERS.find((p) => p.id === aiProvider) || MANIFEST_PROVIDERS[0];
              return (
                <button
                  onClick={() => setShowProviderDrop((prev) => !prev)}
                  className="flex items-center justify-center w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-all"
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

        <div className="flex items-center gap-2 px-3 sm:px-4 pt-1.5 pb-1 sm:py-0 flex-1 min-w-0">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSuggest(input, setInput, newAppType, canSuggest)}
            placeholder={`Describe your ${newAppType} app...`}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            name="app-description"
            className="flex-1 min-w-0 min-h-[44px] bg-gray-800 border border-gray-700 rounded-lg px-3 sm:px-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />

          <div className="relative shrink-0 hidden sm:block" ref={providerDropRef}>
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
            onClick={() => handleSuggest(input, setInput, newAppType, canSuggest)}
            disabled={!canSuggest || isLoading || !!isBuilding || isManifesting || !input.trim()}
            className="flex items-center gap-2 px-4 h-[44px] bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-all shrink-0"
          >
            {isManifesting || isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="hidden sm:inline">MANIFEST</span>
          </button>
        </div>
      </footer>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
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

      <AnimatePresence>
        {forkTarget && (
          <ForkModal source={forkTarget} onConfirm={handleForkConfirm} onCancel={() => setForkTarget(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {joinToken && (
          <JoinModal
            token={joinToken}
            user={user}
            onAccepted={() => { setJoinToken(null); refreshLinkedAccounts(); }}
            onClose={() => setJoinToken(null)}
            onSignInRequired={() => setShowAuth(true)}
          />
        )}
      </AnimatePresence>

      <AppOnboarding
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
        onboardingStep={onboardingStep}
        setOnboardingStep={setOnboardingStep}
        webGPUSupported={webGPUSupported}
        aiProvider={aiProvider}
        onProviderSelect={(id, model) => { setAiProvider(id as any); setSelectedModel(model); }}
      />

      {/* Fallback toast */}
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
