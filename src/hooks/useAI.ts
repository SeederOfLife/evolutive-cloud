import { useState, useRef, useCallback } from "react";
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
    "- Use the full power of: React, Canvas, Web Audio API, CSS animations, SVG, Math, localStorage.\n" +
    "- For games: make them actually playable with clear rules and win/lose states.\n" +
    "- For art: make it generative and responsive to interaction.\n" +
    "- For music: make it playable with keyboard or touch.\n" +
    "- For tools: make them actually useful with real functionality.\n" +
    "- For simulations: make the physics/logic feel real.\n\n" +
    "QUALITY BAR: Imagine this app will be seen by thousands of people. Make it worthy of that."
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

export function useAI() {
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
    const stored = localStorage.getItem('app_provider') as AIProvider;
    return stored || 'web-llm';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = localStorage.getItem('app_model');
    if (stored) return stored;
    return localStorage.getItem('app_provider') ? "gemini-3-flash-preview" : "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
  });
  const [providerKeys, setProviderKeys] = useState<Record<string, string[]>>(() =>
    parseProviderKeys(
      localStorage.getItem('app_hub_keys'),
      localStorage.getItem('evolutive_energy_key')
    )
  );
  const keyRotationRef = useRef<Record<string, number>>({});

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
  const webLlmEngineRef = useRef<webllm.MLCEngine | null>(null);

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
    setActiveProvider(aiProvider);
    try {
      // Resolve a single key per provider based on current rotation index
      const resolvedKeys: Record<string, string> = {};
      for (const [p, arr] of Object.entries(providerKeys)) {
        if (arr.length) {
          const idx = (keyRotationRef.current[p] ?? 0) % arr.length;
          resolvedKeys[p] = arr[idx];
        }
      }
      const text = await callAIWithFallback(prompt, {
        provider: aiProvider,
        model: selectedModel,
        keys: resolvedKeys,
        config: aiConfig,
        customEndpoint,
        ollamaEndpoint,
        forceCloud,
        onProgress: setWebLlmProgress,
        onRateLimited: (countdown: number) => {
          setIsRateLimited(true);
          setRateLimitCountdown(countdown);
          // Rotate to next key for the rate-limited provider
          const arr = providerKeys[aiProvider];
          if (arr && arr.length > 1) {
            keyRotationRef.current[aiProvider] = ((keyRotationRef.current[aiProvider] ?? 0) + 1) % arr.length;
          }
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
    call,
    callCloud,
  };
}
