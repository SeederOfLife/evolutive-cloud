import { useState, useRef, useCallback } from "react";
import * as webllm from "@mlc-ai/web-llm";
import { callAIWithFallback, callGeminiCloud, AIProvider } from "../services/ai.service";
import { AIConfig } from "../types";

const DEFAULT_CONFIG: AIConfig & { systemPrompt: string } = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxTokens: 4096,
  safetyThreshold: 'BLOCK_NONE',
  systemPrompt: "You are the Evolutionary Reactive Engine. Generate professional-grade, high-complexity interactive applications. Deep shadows, modern UI, responsive grids."
};

export function useAI() {
  const [aiProvider, setAiProvider] = useState<AIProvider>(() =>
    (localStorage.getItem('app_provider') as AIProvider) || 'google'
  );
  const [selectedModel, setSelectedModel] = useState(() =>
    localStorage.getItem('app_model') || "gemini-3-flash-preview"
  );
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('app_hub_keys');
      const legacy = localStorage.getItem('evolutive_energy_key');
      const initial = saved ? JSON.parse(saved) : {};
      if (legacy && !initial.google) initial.google = legacy;
      return initial;
    } catch {
      return {};
    }
  });
  const [aiConfig, setAiConfig] = useState<AIConfig & { systemPrompt: string }>(() => {
    try {
      const saved = localStorage.getItem('app_ai_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [customEndpoint, setCustomEndpoint] = useState(() =>
    localStorage.getItem('app_custom_endpoint') || ""
  );
  const [forceCloud, setForceCloud] = useState(() => {
    try { return localStorage.getItem('app_force_cloud') === 'true'; }
    catch { return false; }
  });
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>(aiProvider);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [webLlmProgress, setWebLlmProgress] = useState("");
  const webLlmEngineRef = useRef<webllm.MLCEngine | null>(null);

  const call = useCallback(async (prompt: string): Promise<string> => {
    setAiError(null);
    setActiveProvider(aiProvider);
    try {
      const text = await callAIWithFallback(prompt, {
        provider: aiProvider,
        model: selectedModel,
        keys: providerKeys,
        config: aiConfig,
        customEndpoint,
        forceCloud,
        onProgress: setWebLlmProgress,
        onRateLimited: (countdown: number) => {
          setIsRateLimited(true);
          setRateLimitCountdown(countdown);
        },
        onRateLimitCleared: () => {
          setIsRateLimited(false);
          setRateLimitCountdown(0);
        },
        webLlmEngineRef,
        onProviderSwitch: (provider) => setActiveProvider(provider),
      });
      return text;
    } catch (err: any) {
      setAiError(err.message);
      throw err;
    }
  }, [aiProvider, selectedModel, providerKeys, aiConfig, customEndpoint, forceCloud]);

  const callCloud = useCallback((prompt: string) =>
    callGeminiCloud(prompt, providerKeys['google']),
    [providerKeys]
  );

  return {
    aiProvider, setAiProvider,
    selectedModel, setSelectedModel,
    providerKeys, setProviderKeys,
    aiConfig, setAiConfig,
    customEndpoint, setCustomEndpoint,
    forceCloud, setForceCloud,
    aiError, setAiError,
    activeProvider,
    isRateLimited, setIsRateLimited,
    rateLimitCountdown, setRateLimitCountdown,
    webLlmProgress, setWebLlmProgress,
    webLlmEngineRef,
    call,
    callCloud,
  };
}
