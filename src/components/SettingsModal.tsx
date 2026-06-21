import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { NetworkPanel } from "./NetworkPanel";
import { SettingsAITab } from "./SettingsAITab";

export interface SettingsModalProps {
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

export function SettingsModal({
  onClose, aiProvider, setAiProvider, selectedModel, setSelectedModel,
  providerKeysMap, addProviderKey, removeProviderKey,
  customEndpoint, setCustomEndpoint, ollamaEndpoint, setOllamaEndpoint,
  forceCloud, setForceCloud, aiConfig, setAiConfig,
  isTestingAI, testResponse, handleTestNeuralLink, setTestResponse,
  settingsMessage, setSettingsMessage, webGPUSupported, user, onLinkedAccountsChange,
  zoomScale, onZoomChange,
}: SettingsModalProps) {
  const [tab, setTab] = useState<"ai" | "network">("ai");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2 sm:hidden" />
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {user && (
          <div className="flex gap-1 px-4 pt-3">
            {(["ai", "network"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
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

        {tab === "network" && user && (
          <div className="p-4">
            <NetworkPanel user={user} onLinkedAccountsChange={() => onLinkedAccountsChange?.()} />
          </div>
        )}

        {tab === "ai" && (
          <SettingsAITab
            aiProvider={aiProvider} setAiProvider={setAiProvider}
            selectedModel={selectedModel} setSelectedModel={setSelectedModel}
            providerKeysMap={providerKeysMap} addProviderKey={addProviderKey} removeProviderKey={removeProviderKey}
            customEndpoint={customEndpoint} setCustomEndpoint={setCustomEndpoint}
            ollamaEndpoint={ollamaEndpoint} setOllamaEndpoint={setOllamaEndpoint}
            forceCloud={forceCloud} setForceCloud={setForceCloud}
            aiConfig={aiConfig} setAiConfig={setAiConfig}
            isTestingAI={isTestingAI} testResponse={testResponse}
            handleTestNeuralLink={handleTestNeuralLink} setTestResponse={setTestResponse}
            webGPUSupported={webGPUSupported} zoomScale={zoomScale} onZoomChange={onZoomChange}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
