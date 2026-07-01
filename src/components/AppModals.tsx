import { AnimatePresence, motion } from "motion/react";
import { SettingsModal } from "./SettingsModal";
import { AuthModal } from "./AuthModal";
import { LaunchModal } from "./LaunchModal";
import { ForkModal } from "./ForkModal";
import { JoinModal } from "./JoinModal";
import AppOnboarding from "./AppOnboarding";
import { MANIFEST_PROVIDERS } from "../constants/appConstants";
import type { User } from "firebase/auth";
import type { Suggestion, AppEvolution } from "../types";

interface Props {
  // Settings modal
  showSettings: boolean;
  onCloseSettings: () => void;
  aiProvider: string;
  setAiProvider: (p: any) => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  userApiKey: string;
  saveApiKeyToAccount: (key: string, provider?: string) => void;
  providerKeys: Record<string, string[]>;
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
  settingsMessage: string | null;
  setSettingsMessage: (m: string | null) => void;
  webGPUSupported: boolean | null;
  refreshLinkedAccounts: () => void;
  zoomScale: number;
  updateZoom: (s: number) => void;
  // Auth modal
  showAuth: boolean;
  onCloseAuth: () => void;
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
  // Shared
  user: User | null;
  suggestions: Suggestion[];
  // Launch modal
  launchTarget: Suggestion | null;
  onCloseLaunch: () => void;
  handleVote: (id: string, votes: number) => void;
  onForkStart: (s: Suggestion) => void;
  handleToggleVisibility: (vis: 'public' | 'private') => void;
  handleWaterApp: (focus: any, depth: any, note: string) => void;
  handleAutoWaterChange: (enabled: boolean, interval: number, times: number, focus: string, note: string) => void;
  wateringId: string | null;
  activeProvider: string;
  apiQuota: number;
  pendingEvolution: AppEvolution | null;
  setPendingEvolution: (e: AppEvolution | null) => void;
  showWaterDialog: boolean;
  setShowWaterDialog: (v: boolean) => void;
  handleRefine: (message: string, currentCode: string, onSwitch?: (label: string) => void) => Promise<string>;
  onOpenSettings: () => void;
  // Fork modal
  forkTarget: Suggestion | null;
  handleForkConfirm: (title: string) => void;
  onCancelFork: () => void;
  // Join modal
  joinToken: string | null;
  onJoinAccepted: () => void;
  onCloseJoin: () => void;
  onSignInRequired: () => void;
  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (v: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (v: number) => void;
  // Fallback toast
  fallbackToast: string | null;
  onSwitchWaterApp?: (s: Suggestion) => void;
}

export function AppModals({
  showSettings, onCloseSettings, aiProvider, setAiProvider, selectedModel, setSelectedModel,
  userApiKey, saveApiKeyToAccount, providerKeys, addProviderKey, removeProviderKey,
  customEndpoint, setCustomEndpoint, ollamaEndpoint, setOllamaEndpoint,
  forceCloud, setForceCloud, aiConfig, setAiConfig, providerHealth, checkHealth,
  isTestingAI, testResponse, handleTestNeuralLink, setTestResponse,
  settingsMessage, setSettingsMessage, webGPUSupported, refreshLinkedAccounts, zoomScale, updateZoom,
  showAuth, onCloseAuth, authEmail, setAuthEmail, authPassword, setAuthPassword,
  isSignUp, setIsSignUp, authError, isAuthLoading, signInWithEmail, signInWithGoogle, signInWithGithub, logout,
  user, suggestions,
  launchTarget, onCloseLaunch, handleVote, onForkStart, handleToggleVisibility,
  handleWaterApp, handleAutoWaterChange, wateringId, activeProvider, apiQuota,
  pendingEvolution, setPendingEvolution, showWaterDialog, setShowWaterDialog, handleRefine, onOpenSettings,
  forkTarget, handleForkConfirm, onCancelFork,
  joinToken, onJoinAccepted, onCloseJoin, onSignInRequired,
  showOnboarding, setShowOnboarding, onboardingStep, setOnboardingStep,
  fallbackToast, onSwitchWaterApp,
}: Props) {
  const isOwner = (s: Suggestion) => !!user?.uid && user.uid === s.user_id && !s.id.startsWith('seed_');
  const myBuiltApps = suggestions.filter(s => isOwner(s) && s.status === 'built' && s.built_code && !s.is_deleted);

  return (
    <>
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            onClose={onCloseSettings}
            aiProvider={aiProvider} setAiProvider={setAiProvider}
            selectedModel={selectedModel} setSelectedModel={setSelectedModel}
            userApiKey={userApiKey} saveApiKeyToAccount={saveApiKeyToAccount}
            providerKeysMap={providerKeys} addProviderKey={addProviderKey} removeProviderKey={removeProviderKey}
            customEndpoint={customEndpoint} setCustomEndpoint={setCustomEndpoint}
            ollamaEndpoint={ollamaEndpoint} setOllamaEndpoint={setOllamaEndpoint}
            forceCloud={forceCloud} setForceCloud={setForceCloud}
            aiConfig={aiConfig} setAiConfig={setAiConfig}
            providerHealth={providerHealth} checkHealth={checkHealth}
            isTestingAI={isTestingAI} testResponse={testResponse}
            handleTestNeuralLink={handleTestNeuralLink} setTestResponse={setTestResponse}
            settingsMessage={settingsMessage} setSettingsMessage={setSettingsMessage}
            webGPUSupported={webGPUSupported} user={user}
            onLinkedAccountsChange={refreshLinkedAccounts}
            zoomScale={zoomScale} onZoomChange={updateZoom}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuth && (
          <AuthModal
            onClose={onCloseAuth} user={user}
            authEmail={authEmail} setAuthEmail={setAuthEmail}
            authPassword={authPassword} setAuthPassword={setAuthPassword}
            isSignUp={isSignUp} setIsSignUp={setIsSignUp}
            authError={authError} isAuthLoading={isAuthLoading}
            signInWithEmail={signInWithEmail} signInWithGoogle={signInWithGoogle}
            signInWithGithub={signInWithGithub} logout={logout}
            suggestions={suggestions}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {launchTarget && (
          <LaunchModal
            suggestion={launchTarget} currentUserId={user?.uid}
            onClose={onCloseLaunch} onOpenSettings={onOpenSettings}
            onVote={handleVote}
            onFork={() => { onForkStart(launchTarget); onCloseLaunch(); }}
            onToggleVisibility={handleToggleVisibility}
            onWater={isOwner(launchTarget) ? handleWaterApp : undefined}
            onAutoWaterChange={isOwner(launchTarget) ? handleAutoWaterChange : undefined}
            isWatering={wateringId === launchTarget.id}
            isFreeProvider={activeProvider === 'web-llm'}
            quota={apiQuota}
            pendingEvolution={pendingEvolution}
            onClearEvolution={() => setPendingEvolution(null)}
            showWaterDialog={showWaterDialog} setShowWaterDialog={setShowWaterDialog}
            chatProvider={aiProvider}
            chatProviderOptions={MANIFEST_PROVIDERS.map(p => ({ id: p.id, label: p.label }))}
            onChatProviderSwitch={(id) => {
              setAiProvider(id as any);
              const p = MANIFEST_PROVIDERS.find(mp => mp.id === id);
              if (p) setSelectedModel(p.model);
            }}
            onRefine={handleRefine}
            allApps={myBuiltApps}
            onSwitchWaterApp={onSwitchWaterApp}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forkTarget && (
          <ForkModal source={forkTarget} onConfirm={handleForkConfirm} onCancel={onCancelFork} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {joinToken && (
          <JoinModal token={joinToken} user={user}
            onAccepted={onJoinAccepted} onClose={onCloseJoin} onSignInRequired={onSignInRequired}
          />
        )}
      </AnimatePresence>

      <AppOnboarding
        showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding}
        onboardingStep={onboardingStep} setOnboardingStep={setOnboardingStep}
        webGPUSupported={webGPUSupported} aiProvider={aiProvider}
        onProviderSelect={(id, model) => { setAiProvider(id as any); setSelectedModel(model); }}
      />

      <AnimatePresence>
        {fallbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-[calc(max(env(safe-area-inset-bottom),8px)+90px)] left-1/2 -translate-x-1/2 z-[9999] bg-gray-800 border border-gray-600 rounded-full px-4 py-2 text-xs text-gray-300 shadow-xl pointer-events-none whitespace-nowrap"
          >
            {fallbackToast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
