import { useState, useRef, useCallback, useEffect } from "react";
import * as webllm from "@mlc-ai/web-llm";
import { callAIWithFallback, callGeminiCloud, AIProvider } from "../services/ai.service";
import type { AIConfig } from "../types";
import { DEFAULT_AI_CONFIG, PROVIDER_DEFAULT_MODELS, parseProviderKeys, detectViableProviders } from "./aiConfig";

export function useAI() {
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
    const stored = localStorage.getItem('app_provider') as AIProvider;
    // Never default new users to web-llm — will be corrected after viability check
    return stored || 'google';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    // Models decommissioned upstream — a stale persisted choice must not survive.
    const dead = ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'google/gemini-2.0-flash-exp:free'];
    const stored = localStorage.getItem('app_model');
    if (stored && !dead.includes(stored)) return stored;
    return 'gemini-2.0-flash';
  });
  const [providerKeys, setProviderKeys] = useState<Record<string, string[]>>(() =>
    parseProviderKeys(
      localStorage.getItem('app_hub_keys'),
      localStorage.getItem('evolutive_energy_key')
    )
  );
  const keyRotationRef = useRef<Record<string, number>>({});
  const sessionSuccessRef = useRef<AIProvider | null>(null);

  const [aiConfig, setAiConfig] = useState<AIConfig & { systemPrompt: string }>(() => {
    try {
      const saved = localStorage.getItem('app_ai_config');
      return saved ? JSON.parse(saved) : DEFAULT_AI_CONFIG;
    } catch { return DEFAULT_AI_CONFIG; }
  });
  const [customEndpoint, setCustomEndpoint] = useState(() =>
    localStorage.getItem('app_custom_endpoint') || ""
  );
  const [ollamaEndpoint, setOllamaEndpointState] = useState(() =>
    localStorage.getItem('app_ollama_endpoint') || "http://localhost:11434"
  );
  const setOllamaEndpoint = useCallback((v: string) => {
    setOllamaEndpointState(v);
    localStorage.setItem('app_ollama_endpoint', v);
  }, []);
  const [forceCloud, setForceCloud] = useState(() => {
    try { return localStorage.getItem('app_force_cloud') === 'true'; }
    catch { return false; }
  });

  const [aiError, setAiError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>(aiProvider);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [webLlmProgress, setWebLlmProgress] = useState("");

  // Viable providers (populated after mount-time checks)
  const [viableProviders, setViableProviders] = useState<AIProvider[]>([]);
  const [viableCheckDone, setViableCheckDone] = useState(false);

  // Non-blocking fallback toast
  const [fallbackToast, setFallbackToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFallbackToast = useCallback((msg: string) => {
    setFallbackToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setFallbackToast(null), 4000);
  }, []);

  const webLlmEngineRef = useRef<webllm.MLCEngine | null>(null);

  // Uncaught async errors were dying silently in the console — surface them.
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message ?? String(e.reason);
      if (msg && !/ResizeObserver|AbortError/i.test(msg)) {
        setAiError(`Unexpected error: ${msg.slice(0, 200)}`);
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  // On mount: detect viable providers, then auto-select the best one
  useEffect(() => {
    const init = async () => {
      const keys = parseProviderKeys(
        localStorage.getItem('app_hub_keys'),
        localStorage.getItem('evolutive_energy_key')
      );
      const endpoint = localStorage.getItem('app_ollama_endpoint') || 'http://localhost:11434';
      const viable = await detectViableProviders(keys, endpoint);
      setViableProviders(viable);
      setViableCheckDone(true);

      const stored = localStorage.getItem('app_provider') as AIProvider | null;
      // If no explicit choice, or chosen provider is not viable, switch to best viable option
      if (!stored || !viable.includes(stored)) {
        if (viable.length > 0) {
          const best = viable[0];
          setAiProvider(best);
          const defaultModel = PROVIDER_DEFAULT_MODELS[best];
          if (defaultModel) setSelectedModel(defaultModel);
          // Don't persist — this is an auto-selection, not a user choice
        }
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persistKeys = (keys: Record<string, string[]>) => {
    localStorage.setItem('app_hub_keys', JSON.stringify(keys));
    if (keys.google?.length) localStorage.setItem('evolutive_energy_key', keys.google[0]);
    else localStorage.removeItem('evolutive_energy_key');
  };

  const addProviderKey = useCallback((provider: string, key: string) => {
    if (!key.trim()) return;
    setProviderKeys(prev => {
      const next = { ...prev, [provider]: [...(prev[provider] || []), key.trim()] };
      persistKeys(next);
      return next;
    });
  }, []);

  const removeProviderKey = useCallback((provider: string, index: number) => {
    setProviderKeys(prev => {
      const arr = (prev[provider] || []).filter((_, i) => i !== index);
      const next = { ...prev, [provider]: arr };
      persistKeys(next);
      return next;
    });
  }, []);

  const call = useCallback(async (prompt: string, onExternalProviderSwitch?: (label: string) => void): Promise<string> => {
    setAiError(null);

    // If we remembered a working provider this session, prefer it
    const effectiveProvider = sessionSuccessRef.current ?? aiProvider;
    const effectiveModel = sessionSuccessRef.current && sessionSuccessRef.current !== aiProvider
      ? (PROVIDER_DEFAULT_MODELS[sessionSuccessRef.current] ?? selectedModel)
      : selectedModel;

    setActiveProvider(effectiveProvider);

    try {
      const resolvedKeys: Record<string, string> = {};
      for (const [p, arr] of Object.entries(providerKeys)) {
        if (arr.length) {
          const idx = (keyRotationRef.current[p] ?? 0) % arr.length;
          resolvedKeys[p] = arr[idx];
        }
      }

      let firstLabel = '';
      const text = await callAIWithFallback(prompt, {
        provider: effectiveProvider,
        model: effectiveModel,
        keys: resolvedKeys,
        config: aiConfig,
        customEndpoint,
        ollamaEndpoint,
        forceCloud,
        onProgress: setWebLlmProgress,
        onRateLimited: (countdown: number) => {
          setIsRateLimited(true);
          setRateLimitCountdown(countdown);
          const arr = providerKeys[effectiveProvider];
          if (arr && arr.length > 1) {
            keyRotationRef.current[effectiveProvider] = ((keyRotationRef.current[effectiveProvider] ?? 0) + 1) % arr.length;
          }
        },
        onRateLimitCleared: () => {
          setIsRateLimited(false);
          setRateLimitCountdown(0);
        },
        webLlmEngineRef,
        onProviderSwitch: (label) => {
          if (!firstLabel) {
            firstLabel = label;
          } else if (label !== firstLabel) {
            showFallbackToast(`${firstLabel} unavailable — trying ${label}…`);
          }
          setActiveProvider(label);
          onExternalProviderSwitch?.(label);
        },
      });

      // Remember this successful provider for the rest of the session
      sessionSuccessRef.current = effectiveProvider;
      return text;
    } catch (err: any) {
      setAiError(err.message);
      throw err;
    }
  }, [aiProvider, selectedModel, providerKeys, aiConfig, customEndpoint, ollamaEndpoint, forceCloud, showFallbackToast]);

  const callCloud = useCallback((prompt: string) =>
    callGeminiCloud(prompt, providerKeys['google']?.[0]),
    [providerKeys]
  );

  return {
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
    isRateLimited, setIsRateLimited,
    rateLimitCountdown, setRateLimitCountdown,
    webLlmProgress, setWebLlmProgress,
    webLlmEngineRef,
    viableProviders,
    viableCheckDone,
    fallbackToast,
    call,
    callCloud,
  };
}
