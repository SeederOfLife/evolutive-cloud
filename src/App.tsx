/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useAI } from "./hooks/useAI";
import { useSuggestions } from "./hooks/useSuggestions";
import { useProjectData } from "./hooks/useProjectData";
import { useBuildApp } from "./generation/useBuildApp";
import { useQuota } from "./hooks/useQuota";
import { useAppHandlers } from "./hooks/useAppHandlers";
import { useProviderKeySync } from "./hooks/useProviderKeySync";
import { AppHeader } from "./components/AppHeader";
import { BottomBar } from "./components/BottomBar";
import { AppModals } from "./components/AppModals";
import { GalaxyView } from "./galaxy/GalaxyView";
import { AIProgress } from "./components/AIProgress";
import { PromptRefiner } from "./components/PromptRefiner";
import AppBanners from "./components/AppBanners";
import { ScrollFeed } from "./components/ScrollFeed";
import { HubView } from "./components/HubView";
import { SEED_APPS } from "./services/seedApps";
import { checkWebGPUSupport } from "./utils/webgpu";
import type { Suggestion, AppEvolution } from "./types";

export default function App() {
  const { quota: apiQuota, consume: consumeQuota } = useQuota();
  const { user, userProfile, authError, isAuthLoading, signInWithEmail, signInWithGoogle, signInWithGithub, logout } = useAuth();
  const {
    aiProvider, setAiProvider, selectedModel, setSelectedModel,
    providerKeys, setProviderKeys, addProviderKey, removeProviderKey,
    aiConfig, setAiConfig, customEndpoint, setCustomEndpoint,
    ollamaEndpoint, setOllamaEndpoint, forceCloud, setForceCloud,
    aiError, setAiError, activeProvider,
    isRateLimited, rateLimitCountdown, webLlmProgress,
    viableProviders, viableCheckDone, fallbackToast,
    call: callUnifiedAI,
  } = useAI();

  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream, []);
  const { suggestions, deleteSuggestion, voteSuggestion } = useSuggestions();
  const { isFinalized, creatorId, isInitializing, linkedUserMap, refreshLinkedAccounts } = useProjectData(user);
  const [launchTarget, setLaunchTarget] = useState<Suggestion | null>(null);
  const { isBuilding, isManifesting, aiStage, isLoading, pendingRefiner, buildEvolution, handleSuggest } = useBuildApp({
    suggestions, aiConfig, callAI: callUnifiedAI, apiQuota, consumeQuota,
    user, aiProvider, providerKeys, setAiError, setLaunchTarget,
  });

  const [view, setView] = useState<'galaxy' | 'feed' | 'hub'>('galaxy');
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [input, setInput] = useState("");
  const [newAppType, setNewAppType] = useState<any>('desktop');
  const newAppTypeRef = useRef<any>('desktop');
  useEffect(() => { newAppTypeRef.current = newAppType; }, [newAppType]);
  const [forkTarget, setForkTarget] = useState<Suggestion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'built' | 'pending' | 'mine'>('all');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [providerHealth, setProviderHealth] = useState<Record<string, any>>({});
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('evolutive_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [seedVotes, setSeedVotes] = useState<Record<string, number>>({});
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [showNoGPUBanner, setShowNoGPUBanner] = useState(false);
  const [joinToken, setJoinToken] = useState<string | null>(() => {
    const m = window.location.pathname.match(/^\/join\/([a-f0-9]{40})$/);
    return m ? m[1] : null;
  });
  const [wateringId, setWateringId] = useState<string | null>(null);
  const [showWaterDialog, setShowWaterDialog] = useState(false);
  const [pendingEvolution, setPendingEvolution] = useState<AppEvolution | null>(null);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [zoomScale, setZoomScaleState] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem('app_zoom_scale') || '1');
    return [0.8, 1.0, 1.2].includes(v) ? v : 1.0;
  });
  const nodePositionsRef = useRef(new Map<string, THREE.Vector3>());
  const orbitControlsRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxRateLimitCountdown = useRef(0);

  useEffect(() => { checkWebGPUSupport().then(setWebGPUSupported); }, []);
  useEffect(() => { if (viableCheckDone && viableProviders.length === 0) setShowNoGPUBanner(true); }, [viableCheckDone, viableProviders.length]);
  useEffect(() => {
    if (isRateLimited && rateLimitCountdown > maxRateLimitCountdown.current) maxRateLimitCountdown.current = rateLimitCountdown;
    if (!isRateLimited) maxRateLimitCountdown.current = 0;
  }, [isRateLimited, rateLimitCountdown]);
  useEffect(() => {
    const w = window as any;
    w.React = React;
    w.ReactDOM = {
      createRoot: (c: HTMLElement) => (window as any).ReactDOMClient.createRoot(c),
      render: (el: any, c: HTMLElement) => { (window as any).ReactDOMClient.createRoot(c).render(el); },
    };
    import("react-dom/client").then(m => { w.ReactDOMClient = m; });
    w.Motion = { motion, AnimatePresence };
    w.THREE = THREE;
  }, []);
  useProviderKeySync(userProfile, setProviderKeys);
  useEffect(() => {
    if (!user) { localStorage.removeItem("app_nexus_keys"); localStorage.removeItem("evolutive_energy_key"); }
  }, [user]);
  useEffect(() => { if (user?.uid) setFilterType("mine"); }, [user]);
  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem("pending_invite_token");
    if (pending) { localStorage.removeItem("pending_invite_token"); setJoinToken(pending); }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const userApiKey = useMemo(() => providerKeys[aiProvider]?.[0] || "", [providerKeys, aiProvider]);

  const displaySuggestions = useMemo(() => allSuggestions
    .filter(s => s.status !== "system_config" && s.status !== "deleted" && !s.is_deleted)
    .filter(s => {
      if (!s.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType === "built") return s.status === "built";
      if (filterType === "pending") return s.status === "pending";
      if (filterType === "mine") return s.user_id === user?.uid;
      return true;
    }), [allSuggestions, searchQuery, filterType, user]);

  const builtCount = useMemo(() => allSuggestions.filter(s => s.status === "built").length, [allSuggestions]);

  const neuralStatus = useMemo(() => {
    if (isRateLimited) return `RATE LIMITED (${rateLimitCountdown}s)`;
    if (aiError) return "ERROR";
    if (isManifesting || isBuilding) return "BUILDING";
    if (isLoading) return "LOADING";
    return "IDLE";
  }, [isRateLimited, rateLimitCountdown, aiError, isManifesting, isBuilding, isLoading]);

  const updateZoom = (s: number) => { setZoomScaleState(s); localStorage.setItem('app_zoom_scale', String(s)); };

  // Handlers
  const handlers = useAppHandlers({
    user, isCreator, suggestions, deleteSuggestion, voteSuggestion, setSeedVotes,
    launchTarget, setLaunchTarget, forkTarget, setForkTarget,
    providerKeys, setProviderKeys, aiProvider, activeProvider,
    callUnifiedAI, aiConfig, consumeQuota, customEndpoint,
    setProviderHealth, isTestingAI, setIsTestingAI, setTestResponse,
    setWateringId, setPendingEvolution,
  });

  return (
    <div className="w-full bg-gray-950 text-white flex flex-col overflow-hidden"
      style={{ height: '100dvh', zoom: zoomScale !== 1 ? zoomScale : undefined }}>

      <AnimatePresence>
        {isInitializing && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[200] bg-gray-950 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-400">Connecting...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingRefiner && (
          <PromptRefiner
            idea={pendingRefiner.idea} title={pendingRefiner.title}
            questions={pendingRefiner.questions} appType={newAppTypeRef.current}
            onTypeChange={setNewAppType} onBuild={pendingRefiner.onBuild}
            onSkip={pendingRefiner.onSkip} callAI={callUnifiedAI}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isManifesting && <AIProgress stage={aiStage} prompt={input} provider={activeProvider} />}
      </AnimatePresence>

      <AppHeader
        user={user} neuralStatus={neuralStatus} view={view} setView={setView}
        builtCount={builtCount} onOpenSettings={() => setShowSettings(true)}
        onOpenAuth={() => setShowAuth(true)}
      />

      <AppBanners
        aiError={aiError} setAiError={setAiError}
        isRateLimited={isRateLimited} rateLimitCountdown={rateLimitCountdown}
        maxRateLimitCountdownRef={maxRateLimitCountdown}
        webLlmProgress={webLlmProgress} showNoGPUBanner={showNoGPUBanner}
        setShowNoGPUBanner={setShowNoGPUBanner} isIOS={isIOS}
        aiProvider={aiProvider} onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 overflow-hidden relative">
        <GalaxyView
          isVisible={view === "galaxy"} isHubOpen={view === "hub"}
          allSuggestions={allSuggestions} suggestions={suggestions}
          linkedUserMap={linkedUserMap} wateringId={wateringId}
          nodePositionsRef={nodePositionsRef} orbitControlsRef={orbitControlsRef}
          user={user} input={input}
          onLaunch={s => setLaunchTarget(s)} onOpenHub={() => setView("hub")}
          onChipClick={chip => setInput(chip)} inputRef={inputRef}
        />

        {view === "feed" && (
          <ScrollFeed suggestions={displaySuggestions}
            onPlay={s => setLaunchTarget(s)} onVote={handlers.handleVote}
            onBuild={s => buildEvolution(s)} />
        )}

        {view === "hub" && (
          <HubView
            suggestions={displaySuggestions} searchQuery={searchQuery}
            setSearchQuery={setSearchQuery} filterType={filterType} setFilterType={setFilterType}
            user={user} isCreator={isCreator} isBuilding={isBuilding}
            isRefining={null} isLoading={isLoading}
            onBuild={buildEvolution} onLaunch={s => setLaunchTarget(s)}
            onFork={s => setForkTarget(s)} onDelete={handlers.handleDeleteSuggestion}
            onVote={handlers.handleVote}
          />
        )}
      </main>

      <BottomBar
        newAppType={newAppType} setNewAppType={setNewAppType}
        input={input} setInput={setInput} inputRef={inputRef}
        canSuggest={canSuggest} isLoading={isLoading}
        isBuilding={isBuilding} isManifesting={isManifesting}
        aiProvider={aiProvider} setAiProvider={setAiProvider}
        setSelectedModel={setSelectedModel} activeProvider={activeProvider}
        onManifest={() => handleSuggest(input, setInput, newAppType, canSuggest)}
      />

      <AppModals
        showSettings={showSettings} onCloseSettings={() => { setShowSettings(false); setSettingsMessage(null); }}
        aiProvider={aiProvider} setAiProvider={setAiProvider}
        selectedModel={selectedModel} setSelectedModel={setSelectedModel}
        userApiKey={userApiKey} saveApiKeyToAccount={handlers.saveApiKeyToAccount}
        providerKeys={providerKeys} addProviderKey={addProviderKey} removeProviderKey={removeProviderKey}
        customEndpoint={customEndpoint} setCustomEndpoint={setCustomEndpoint}
        ollamaEndpoint={ollamaEndpoint} setOllamaEndpoint={setOllamaEndpoint}
        forceCloud={forceCloud} setForceCloud={setForceCloud}
        aiConfig={aiConfig} setAiConfig={setAiConfig}
        providerHealth={providerHealth} checkHealth={handlers.checkHealth}
        isTestingAI={isTestingAI} testResponse={testResponse}
        handleTestNeuralLink={handlers.handleTestNeuralLink} setTestResponse={setTestResponse}
        settingsMessage={settingsMessage} setSettingsMessage={setSettingsMessage}
        webGPUSupported={webGPUSupported} refreshLinkedAccounts={refreshLinkedAccounts}
        zoomScale={zoomScale} updateZoom={updateZoom}
        showAuth={showAuth} onCloseAuth={() => setShowAuth(false)}
        authEmail={authEmail} setAuthEmail={setAuthEmail}
        authPassword={authPassword} setAuthPassword={setAuthPassword}
        isSignUp={isSignUp} setIsSignUp={setIsSignUp}
        authError={authError} isAuthLoading={isAuthLoading}
        signInWithEmail={signInWithEmail} signInWithGoogle={signInWithGoogle}
        signInWithGithub={signInWithGithub} logout={logout}
        user={user} suggestions={suggestions}
        launchTarget={launchTarget} onCloseLaunch={() => setLaunchTarget(null)}
        handleVote={handlers.handleVote} onForkStart={s => setForkTarget(s)}
        handleToggleVisibility={handlers.handleToggleVisibility}
        handleWaterApp={handlers.handleWaterApp}
        handleAutoWaterChange={handlers.handleAutoWaterChange}
        wateringId={wateringId} activeProvider={activeProvider} apiQuota={apiQuota}
        pendingEvolution={pendingEvolution} setPendingEvolution={setPendingEvolution}
        showWaterDialog={showWaterDialog} setShowWaterDialog={setShowWaterDialog}
        handleRefine={handlers.handleRefine} onOpenSettings={() => setShowSettings(true)}
        forkTarget={forkTarget} handleForkConfirm={handlers.handleForkConfirm}
        onCancelFork={() => setForkTarget(null)}
        joinToken={joinToken}
        onJoinAccepted={() => { setJoinToken(null); refreshLinkedAccounts(); }}
        onCloseJoin={() => setJoinToken(null)} onSignInRequired={() => setShowAuth(true)}
        showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding}
        onboardingStep={onboardingStep} setOnboardingStep={setOnboardingStep}
        fallbackToast={fallbackToast}
      />
    </div>
  );
}
