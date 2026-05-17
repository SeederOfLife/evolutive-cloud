/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronUp, X, Search, Zap, Play, Sparkles, Loader2,
  Settings, Activity, Trash2, LogOut
} from "lucide-react";
import OpenAI from "openai";
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc,
  doc, where, limit, getDocs
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { Suggestion, Advice, ProjectConfig, EvolutionVersion } from "./types";
import { ModulePlayer } from "./components/ModulePlayer";
import { EvolutiveSeed, ModuleNode, Nebula, OrbitRing } from "./components/ThreeWorld";
import { ScrollFeed } from "./components/ScrollFeed";
import { useQuota } from "./hooks/useQuota";
import { useAuth } from "./hooks/useAuth";
import { useAI } from "./hooks/useAI";
import { useSuggestions } from "./hooks/useSuggestions";

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
    isRateLimited,
    rateLimitCountdown,
    call: callUnifiedAI,
  } = useAI();
  const { suggestions, deleteSuggestion, voteSuggestion } = useSuggestions();

  // View / modal state
  const [view, setView] = useState<'galaxy' | 'feed' | 'hub'>('galaxy');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // App state
  const [input, setInput] = useState("");
  const [newAppType, setNewAppType] = useState<'phone' | 'desktop' | 'game' | 'terminal'>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
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
  const [providerHealth, setProviderHealth] = useState<
    Record<string, { status: 'online' | 'offline' | 'checking' | null; ping: number | null; tokens: string | null }>
  >({});

  const userApiKey = useMemo(() => providerKeys[aiProvider] || "", [providerKeys, aiProvider]);

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
    return suggestions
      .filter((s) => s.status !== "system_config" && s.status !== "deleted" && !s.is_deleted)
      .filter((s) => {
        const matchesSearch = s.content.toLowerCase().includes(searchQuery.toLowerCase());
        let matchesCategory = true;
        if (filterType === "built") matchesCategory = s.status === "built";
        if (filterType === "pending") matchesCategory = s.status === "pending";
        if (filterType === "mine") matchesCategory = s.user_id === user?.uid;
        return matchesSearch && matchesCategory;
      });
  }, [suggestions, searchQuery, filterType, user]);

  const builtCount = useMemo(
    () => suggestions.filter((s) => s.status === "built").length,
    [suggestions]
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

  const handleDeleteSuggestion = async (id: string) => {
    setIsLoading(true);
    try {
      const target = suggestions.find((s) => s.id === id);
      if (target?.user_id && user?.uid && target.user_id !== user.uid && !isCreator) {
        throw new Error("Permission denied.");
      }
      await deleteSuggestion(id);
      if (currentSuggestion?.id === id) setCurrentSuggestion(null);
    } catch (err: any) {
      alert(err.message || "Access Denied.");
    } finally {
      setIsLoading(false);
    }
  };

  const buildEvolution = async (suggestion: Suggestion) => {
    if (isBuilding && isBuilding !== suggestion.id) return;
    try {
      setIsBuilding(suggestion.id);
      setManifestingStep("Generating app...");
      setIsManifesting(true);

      const prompt = `
System: ${aiConfig.systemPrompt}
Target: ${suggestion.app_type?.toUpperCase() || "DESKTOP"}

Task: Create a complete React application for: "${suggestion.content}"

Guidelines:
- DESKTOP: wide viewport, dashboard layout
- PHONE: touch-first, vertical stacking
- GAME: high-interactivity, game state loops
- TERMINAL: monospace, command-line style

Libraries available (do NOT import, already in scope):
- React 18 hooks (useState, useEffect, useMemo, etc.)
- Tailwind CSS
- Framer Motion (motion, AnimatePresence)
- Lucide React icons
- Recharts (LineChart, BarChart, etc.)

Rules:
- Export: export default function App() { ... }
- NO import statements
- Tailwind for all styling
- Return ONLY the code, no markdown
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

      await updateDoc(doc(db, "suggestions", suggestion.id), { status: "built", built_code: generatedCode });
      consumeQuota(15);
      setCurrentSuggestion({ ...suggestion, status: "built", built_code: generatedCode });
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
      await buildEvolution(newSuggestion);
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
      <header className="flex-none h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3">
        {/* Logo + status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white hidden sm:block tracking-wide">EVOLUTIVE</span>
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              neuralStatus === "IDLE"
                ? "bg-gray-800 text-gray-500"
                : "bg-indigo-500/20 text-indigo-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${neuralStatus === "IDLE" ? "bg-gray-600" : "bg-indigo-400 animate-pulse"}`} />
            {neuralStatus}
          </span>
        </div>

        {/* View switcher */}
        <div className="flex-1 flex justify-center">
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            {(["galaxy", "feed", "hub"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === v ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:block">
            BUILDS: <span className="text-white font-medium">{builtCount}</span>
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
          {user ? (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
            >
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                alt=""
                className="w-5 h-5 rounded-full"
                referrerPolicy="no-referrer"
              />
              <span className="hidden sm:block max-w-[80px] truncate text-sm">
                {user.email?.split("@")[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium text-white transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Error banner */}
      <AnimatePresence>
        {aiError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-none bg-red-900/40 border-b border-red-800 px-4 py-2 flex items-center justify-between overflow-hidden"
          >
            <p className="text-sm text-red-300 truncate">{aiError}</p>
            <button onClick={() => setAiError(null)} className="ml-2 text-red-400 hover:text-red-200 shrink-0">
              <X className="w-4 h-4" />
            </button>
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
            {suggestions
              .filter((s) => s.status === "built" && s.built_code)
              .map((s) => (
                <ModuleNode key={s.id} suggestion={s} onRun={(sg) => setCurrentSuggestion(sg)} />
              ))}
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              maxPolarAngle={Math.PI / 1.5}
              minPolarAngle={Math.PI / 3}
            />
          </Canvas>
        </div>

        {/* Feed view */}
        {view === "feed" && (
          <ScrollFeed
            suggestions={displaySuggestions}
            onPlay={(s) => setCurrentSuggestion(s)}
            onVote={(id, votes) => voteSuggestion(id, votes)}
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
            onLaunch={(s: Suggestion) => setCurrentSuggestion(s)}
            onDelete={handleDeleteSuggestion}
            onVote={(id: string, votes: number) => voteSuggestion(id, votes)}
          />
        )}
      </main>

      {/* ── BOTTOM BAR ──────────────────────────────────────────────────────── */}
      <footer className="flex-none h-[72px] bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-3">
        {/* App type pills */}
        <div className="flex gap-1 shrink-0">
          {(["phone", "desktop", "game", "terminal"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setNewAppType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                newAppType === type
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Text input */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
          placeholder={`Describe your ${newAppType} app idea...`}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        {/* Submit */}
        <button
          onClick={handleSuggest}
          disabled={!canSuggest || isLoading || !!isBuilding || isManifesting || !input.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-all shrink-0"
        >
          {isManifesting || isBuilding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          MANIFEST
        </button>
      </footer>

      {/* ── SETTINGS MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
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

      {/* ── MODULE PLAYER ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {currentSuggestion && (
          <ModulePlayer
            suggestion={currentSuggestion}
            onClose={() => setCurrentSuggestion(null)}
            onRefine={async (feedback: string) => {
              const refinePrompt = `
System: ${aiConfig.systemPrompt}
Objective: Update the existing App component based on user feedback.

Current Code:
${currentSuggestion.built_code}

User Feedback: "${feedback}"

Instructions:
- Return the ENTIRE updated component named "App".
- Do NOT include import statements.
- Return ONLY the code.
              `.trim();
              const newCode = await callUnifiedAI(refinePrompt);
              if (newCode) {
                const newVersion: EvolutionVersion = {
                  code: currentSuggestion.built_code || "",
                  timestamp: new Date().toISOString(),
                  prompt: feedback,
                };
                const updatedHistory = [newVersion, ...(currentSuggestion.history || [])];
                await updateDoc(doc(db, "suggestions", currentSuggestion.id), {
                  history: updatedHistory,
                  built_code: newCode,
                });
                setCurrentSuggestion((prev) =>
                  prev ? { ...prev, built_code: newCode, history: updatedHistory } : null
                );
              }
              return newCode;
            }}
            onSave={async (newCode: string) => {
              const newVersion: EvolutionVersion = {
                code: currentSuggestion.built_code || "",
                timestamp: new Date().toISOString(),
                prompt: "Manual Revision",
              };
              const updatedHistory = [newVersion, ...(currentSuggestion.history || [])];
              await updateDoc(doc(db, "suggestions", currentSuggestion.id), {
                built_code: newCode,
                history: updatedHistory,
              });
              setCurrentSuggestion((prev) =>
                prev ? { ...prev, built_code: newCode, history: updatedHistory } : null
              );
            }}
          />
        )}
      </AnimatePresence>
    </div>
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
  onDelete: (id: string) => void;
  onVote: (id: string, votes: number) => void;
}

function HubView({
  suggestions, searchQuery, setSearchQuery, filterType, setFilterType,
  user, isCreator, isBuilding, isRefining, isLoading, onBuild, onLaunch, onDelete, onVote,
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
          const isOwner = s.user_id === user?.uid || isCreator;
          return (
            <div
              key={s.id}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_72px_80px_180px] gap-3 items-center px-4 py-3 border-b border-gray-800/50 hover:bg-gray-900 transition-colors"
            >
              {/* Title */}
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{s.content}</p>
                <p className="text-xs text-gray-600 font-mono">#{s.id.substring(0, 8)}</p>
              </div>

              {/* Type */}
              <div className="hidden sm:flex justify-center">
                <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                  {s.app_type || "desktop"}
                </span>
              </div>

              {/* Status */}
              <div className="hidden sm:flex justify-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    isBuilt ? "bg-indigo-500/20 text-indigo-400" : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {s.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1.5">
                {isBuilt ? (
                  <button
                    onClick={() => onLaunch(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded text-xs font-medium text-white transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Launch
                  </button>
                ) : (
                  <button
                    onClick={() => onBuild(s)}
                    disabled={!!isBuilding || !!isRefining}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-medium text-white transition-all"
                  >
                    {isBuilding === s.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    Build
                  </button>
                )}
                <button
                  onClick={() => onVote(s.id, s.votes || 0)}
                  className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 hover:text-white transition-all"
                >
                  <ChevronUp className="w-3 h-3" />
                  {s.votes || 0}
                </button>
                {isOwner && (
                  <button
                    onClick={() => onDelete(s.id)}
                    disabled={isLoading}
                    className="p-1.5 bg-gray-800 hover:bg-red-900/40 rounded text-gray-600 hover:text-red-400 transition-all disabled:opacity-40"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
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
  "web-llm": [{ value: "Llama-3-8B-Instruct-q4f32_1-MLC", label: "Llama 3 8B" }],
  "gemini-nano": [{ value: "gemini-nano", label: "Gemini Nano" }],
};

function SettingsModal({
  onClose, aiProvider, setAiProvider, selectedModel, setSelectedModel,
  userApiKey, saveApiKeyToAccount, customEndpoint, setCustomEndpoint,
  forceCloud, setForceCloud, aiConfig, setAiConfig, providerHealth,
  checkHealth, isTestingAI, testResponse, handleTestNeuralLink, setTestResponse,
}: SettingsModalProps) {
  const providers = ["google", "openai", "anthropic", "custom", "web-llm"] as const;
  const providerModels = MODELS[aiProvider] || [];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

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

          {/* API Key */}
          {!["web-llm", "gemini-nano"].includes(aiProvider) && (
            <section>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                API Key
              </label>
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
            </section>
          )}

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
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
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
