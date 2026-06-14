import { useState, useRef, useCallback, useEffect } from "react";
import * as webllm from "@mlc-ai/web-llm";
import { callAIWithFallback, callGeminiCloud, AIProvider } from "../services/ai.service";
import { AIConfig } from "../types";

const DEFAULT_CONFIG: AIConfig & { systemPrompt: string } = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxTokens: 8000,
  safetyThreshold: 'BLOCK_NONE',
  systemPrompt:
    "You are the Evolutionary Reactive Engine — a creative AI that turns any human imagination into working software.\n\n" +
    "You can build ANYTHING: games, tools, art, music, simulations, visualizations, experiences, toys, utilities, experiments, stories, instruments, calculators, generators, editors, dashboards, clocks, maps, universes.\n\n" +
    "RULES:\n" +
    "- Never say something is impossible. Find a way.\n" +
    "- If the idea is vague, make it magical and surprising.\n" +
    "- If the idea is specific, execute it precisely.\n" +
    "- Always make it interactive — dead static pages are forbidden.\n" +
    "- Every app must feel alive — animations, responses, feedback.\n" +
    "- Use the full power of: React 19, Canvas, Web Audio API, CSS animations, SVG, Math.\n" +
    "- For games: make them actually playable with clear rules and win/lose states.\n" +
    "- For art: make it generative and responsive to interaction.\n" +
    "- For music: make it playable with keyboard or touch.\n" +
    "- For tools: make them actually useful with real functionality.\n" +
    "- For simulations: make the physics/logic feel real.\n\n" +
    "SANDBOX RULES (CRITICAL — violations crash the app):\n" +
    "- NO import statements — all deps are pre-loaded globals (React, Phaser, Lucide icons, etc.).\n" +
    "- NO localStorage — blocked in sandbox, throws SecurityError. Use React state only.\n" +
    "- NO external URLs for images/audio/fonts — all assets must be procedural.\n" +
    "- Tailwind CSS classes work directly. Do NOT reference window.Tailwind.\n\n" +
    "SEED-FIRST PHILOSOPHY:\n" +
    "Build a SMALL, COMPLETE, POLISHED core that works and delights TODAY.\n" +
    "Mark expansion points with // GROWTH: comments (e.g., // GROWTH: add multiplayer here).\n" +
    "A perfect tiny seed beats a broken large app every time.\n\n" +
    "QUALITY BAR: Imagine this app will be seen by thousands of people. Make it worthy of that."
};

// Default model per provider (used when auto-switching)
const PROVIDER_DEFAULT_MODELS: Partial<Record<AIProvider, string>> = {
  google:      'gemini-3-flash-preview',
  openai:      'gpt-4o-mini',
  anthropic:   'claude-haiku-4-5-20251001',
  openrouter:  'google/gemini-2.0-flash-exp:free',
  groq:        'llama3-8b-8192',
  ollama:      'gemma2:2b',
  'web-llm':   'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
};

function parseProviderKeys(raw: string | null, legacy: string | null): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v)) result[k] = (v as string[]).filter(Boolean);
        else if (typeof v === 'string' && v) result[k] = [v];
      }
    } catch { /* ignore */ }
  }
  if (legacy && !result.google?.length) result.google = [legacy];
  return result;
}

async function detectViableProviders(
  keys: Record<string, string[]>,
  ollamaEndpoint: string,
): Promise<AIProvider[]> {
  const viable: AIProvider[] = [];
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  // Cloud providers with stored keys (fastest check — no network needed)
  if (keys.google?.length)      viable.push('google');
  if (keys.openrouter?.length)  viable.push('openrouter');
  if (keys.groq?.length)        viable.push('groq');
  if (keys.openai?.length)      viable.push('openai');
  if (keys.anthropic?.length)   viable.push('anthropic');

  // Ollama — quick 2s reachability check
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${ollamaEndpoint}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) viable.push('ollama');
  } catch { /* not reachable */ }

  // WebLLM — WebGPU adapter check (skip on iOS entirely)
  if (!isIOS && (navigator as any).gpu) {
    try {
      const adapter = await Promise.race([
        (navigator as any).gpu.requestAdapter(),
        new Promise<null>((_, r) => setTimeout(() => r(new Error()), 2000)),
      ]);
      if (adapter) viable.push('web-llm');
    } catch { /* no WebGPU */ }
  }

  return viable;
}

export function useAI() {
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
    const stored = localStorage.getItem('app_provider') as AIProvider;
    // Never default new users to web-llm — will be corrected after viability check
    return stored || 'google';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = localStorage.getItem('app_model');
    if (stored) return stored;
    return 'gemini-3-flash-preview';
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
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
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

  const call = useCallback(async (prompt: string): Promise<string> => {
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
