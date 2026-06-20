import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import * as webllm from "@mlc-ai/web-llm";
import type { RefObject } from "react";
import { AIConfig } from "../types";
import { callGeminiCloud, callGeminiNano } from "./providers/google";
import { callOpenRouter, OPENROUTER_FREE_MODELS } from "./providers/openrouter";
import { callOllama } from "./providers/ollama";
import { callGroq } from "./providers/groq";

export type AIProvider = 'google' | 'openai' | 'anthropic' | 'custom' | 'web-llm' | 'gemini-nano' | 'mlc-mobile' | 'ollama' | 'openrouter' | 'groq';

export interface AICallOptions {
  provider: AIProvider;
  model: string;
  keys: Record<string, string>;
  config: AIConfig;
  customEndpoint?: string;
  ollamaEndpoint?: string;
  forceCloud?: boolean;
  onProgress?: (msg: string) => void;
  onRateLimited?: (countdown: number) => void;
  onRateLimitCleared?: () => void;
  webLlmEngineRef?: RefObject<webllm.MLCEngine | null>;
}

export { callGeminiCloud } from "./providers/google";

export interface FallbackOptions extends AICallOptions {
  onProviderSwitch?: (provider: string, label: string) => void;
}

const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, r) => setTimeout(() => r(new Error(`${label} timed out after ${ms / 1000}s`)), ms)),
  ]);

export async function callAIWithFallback(prompt: string, options: FallbackOptions): Promise<string> {
  const { onProviderSwitch, webLlmEngineRef, keys } = options;
  const errors: string[] = [];

  const attempt = async (
    label: string,
    fn: () => Promise<string>,
    timeoutMs = 30000,
  ): Promise<string | null> => {
    try {
      onProviderSwitch?.(label, label);
      const result = await withTimeout(fn(), timeoutMs, label);
      return result;
    } catch (err: any) {
      errors.push(`[${label}] ${err.message || err}`);
      console.warn(`Fallback: ${label} failed —`, err.message);
      return null;
    }
  };

  // 1. Selected provider (Ollama gets a longer timeout — CPU inference is slow)
  const primaryTimeout = options.provider === 'ollama' ? 120_000 : 30_000;
  const primary = await attempt(options.provider, () => callAI(prompt, options), primaryTimeout);
  if (primary !== null) return primary;

  // 2. Other cloud providers with stored keys (skip the already-tried one)
  const cloudProviders: Array<{ provider: AIProvider; model: string; label: string }> = [
    { provider: 'google',      model: 'gemini-2.0-flash',              label: 'Google Gemini' },
    { provider: 'openai',      model: 'gpt-4o-mini',                   label: 'OpenAI' },
    { provider: 'anthropic',   model: 'claude-haiku-4-5-20251001',     label: 'Anthropic' },
    { provider: 'openrouter',  model: 'google/gemini-2.0-flash-exp:free', label: 'OpenRouter' },
    { provider: 'groq',        model: 'llama3-8b-8192',                   label: 'Groq' },
  ];

  for (const cp of cloudProviders) {
    if (cp.provider === options.provider) continue;
    if (!keys[cp.provider]) continue;
    const result = await attempt(cp.label, () =>
      callAI(prompt, { ...options, provider: cp.provider, model: cp.model })
    );
    if (result !== null) return result;
  }

  // 2.5 OpenRouter free model cascade (try when we have an openrouter key, regardless of primary)
  if (keys['openrouter']) {
    const alreadyTriedModel = options.provider === 'openrouter' ? options.model : null;
    for (const freeModel of OPENROUTER_FREE_MODELS) {
      if (freeModel === alreadyTriedModel) continue; // already tried as primary
      const result = await attempt(`OpenRouter/${freeModel.split('/')[1]}`, () =>
        callOpenRouter(prompt, freeModel, keys['openrouter'])
      );
      if (result !== null) return result;
    }
  }

  // 3. Platform cloud relay (no user key needed)
  const cloud = await attempt('Cloud Relay', () =>
    callGeminiCloud(prompt, keys['google'])
  );
  if (cloud !== null) return cloud;

  // 4. Gemini Nano (Chrome built-in)
  const nano = await attempt('Gemini Nano', () => callGeminiNano(prompt));
  if (nano !== null) return nano;

  // 5. WebLLM (local, requires WebGPU) — 60s timeout to cover model download
  if ((navigator as any).gpu) {
    const local = await attempt('WebLLM (local)', () =>
      callAI(prompt, {
        ...options,
        provider: 'web-llm',
        model: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
        webLlmEngineRef,
      }),
      60000
    );
    if (local !== null) return local;
  }

  throw new Error(
    `All AI providers exhausted.\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
  );
}

export async function callAI(prompt: string, options: AICallOptions): Promise<string> {
  const {
    provider,
    model,
    keys,
    config,
    customEndpoint,
    ollamaEndpoint,
    forceCloud,
    onProgress,
    onRateLimited,
    onRateLimitCleared,
    webLlmEngineRef,
  } = options;

  const userGoogleKey = keys['google'];

  if (forceCloud) {
    return callGeminiCloud(prompt, userGoogleKey);
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      const activeKey = keys[provider] || "";
      const googleKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || keys['google'];

      if (provider === 'ollama') {
        return callOllama(prompt, model, ollamaEndpoint || 'http://localhost:11434');
      }

      if (provider === 'gemini-nano') {
        try {
          const w = window as any;
          if (!w.ai || !w.ai.assistant) throw new Error("Gemini Nano not detected.");
          const aiSession = await w.ai.assistant.create();
          return await aiSession.prompt(prompt);
        } catch (err) {
          console.warn("Gemini Nano failed, falling back to Cloud:", err);
          return callGeminiCloud(prompt, userGoogleKey);
        }
      }

      if (provider === 'web-llm') {
        try {
          if (!webLlmEngineRef?.current) {
            const w = window as any;
            if (!w.navigator.gpu) throw new Error("WebGPU is not supported or enabled in this browser. Local AI requires WebGPU.");
            onProgress?.("Waking AI Engine...");
            const engine = new webllm.MLCEngine();
            engine.setInitProgressCallback((report) => onProgress?.(report.text));
            const loadPromise = engine.reload(model || "Llama-3-8B-Instruct-v0.1-q4f32_1-MLC");
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("WEBLLM_TIMEOUT: Local AI took too long to load. Add a free Gemini key in Settings for instant AI.")), 30000)
            );
            await Promise.race([loadPromise, timeoutPromise]);
            if (webLlmEngineRef) webLlmEngineRef.current = engine;
          }
          const response = await webLlmEngineRef!.current!.chat.completions.create({
            messages: [{ role: "user", content: prompt }]
          });
          return response.choices[0].message.content || "";
        } catch (err: any) {
          console.warn("Web-LLM failure:", err);
          onProgress?.("");
          if (err.message?.includes("WebGPU")) throw err;
          return callGeminiCloud(prompt, userGoogleKey);
        }
      }

      if (provider === 'mlc-mobile') {
        if (!customEndpoint) throw new Error("MLC Mobile requires a custom endpoint URL. Set it in Settings.");
        const client = new OpenAI({
          apiKey: "no-key",
          baseURL: customEndpoint,
          dangerouslyAllowBrowser: true,
        });
        const response = await client.chat.completions.create({
          model: model || "main",
          messages: [{ role: "user", content: prompt }],
        });
        return response.choices[0].message.content || "";
      }

      if (!googleKey && provider === 'google') throw new Error("No Google API Key Found.");
      if (!activeKey && (provider === 'openai' || provider === 'anthropic' || provider === 'custom' || provider === 'openrouter')) {
        if (provider !== 'custom') throw new Error(`No ${provider.toUpperCase()} key found. Add one in Settings.`);
      }

      if (provider === 'openrouter') {
        return callOpenRouter(prompt, model, activeKey);
      }

      if (provider === 'groq') {
        return callGroq(prompt, activeKey, model);
      }

      if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: googleKey || "" });
        let modelId = model;
        if (!modelId.startsWith('gemini-') && !modelId.startsWith('gemma-')) modelId = "gemini-2.0-flash";

        const attemptCall = async (targetModel: string) => {
          const response = await ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: {
              temperature: config.temperature,
              topP: config.topP,
              topK: config.topK,
              maxOutputTokens: config.maxTokens,
            }
          });
          return response.text;
        };

        try {
          const text = await attemptCall(modelId);
          if (!text) throw new Error("The AI Engine returned an empty response.");
          onRateLimitCleared?.();
          return text;
        } catch (err: any) {
          if (err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
            console.warn(`Model ${modelId} failed quota, attempting fallback to gemini-2.0-flash...`);
            if (modelId !== 'gemini-2.0-flash') {
              try {
                const fallbackText = await attemptCall('gemini-2.0-flash');
                if (fallbackText) {
                  throw Object.assign(new Error("Warning: Neural Sync downgraded to Flash version due to Pro quota exhaustion."), { fallbackText });
                }
              } catch (fallbackErr: any) {
                if (fallbackErr.fallbackText) return fallbackErr.fallbackText;
                console.error("Flash fallback also failed:", fallbackErr);
              }
            }

            if (retryCount < maxRetries) {
              retryCount++;
              // Fixed 30s wait matches Gemini's 20-req/min window
              let countdown = 30;
              onRateLimited?.(countdown);

              const interval = setInterval(() => {
                onRateLimited?.(Math.max(0, --countdown));
              }, 1000);
              await sleep(30000);
              clearInterval(interval);
              onRateLimitCleared?.();
              continue;
            }
          }
          throw err;
        }
      }

      if (provider === 'openai' || provider === 'custom') {
        const isDeepInfra = activeKey.startsWith('nvapi-') || activeKey.startsWith('NVAPI-');
        const isMistralDirect = activeKey.startsWith('mistral-') || activeKey.toLowerCase().includes('mistral');

        const client = new OpenAI({
          apiKey: activeKey,
          baseURL: isDeepInfra ? "https://api.deepinfra.com/v1" :
            (isMistralDirect && !customEndpoint ? "https://api.mistral.ai/v1" :
            (provider === 'custom' ? customEndpoint : undefined)),
          dangerouslyAllowBrowser: true,
        });

        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: config.temperature,
          top_p: config.topP,
          max_tokens: config.maxTokens,
        });
        return response.choices[0].message.content || "";
      }

      if (provider === 'anthropic') {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": activeKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.content[0].text;
      }

      throw new Error("AI Provider Disconnected.");
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('connection error') || msg.includes('Failed to fetch')) {
        throw new Error(`[${provider}] Connection failed. If using mobile local AI, ensure the bridge app is active. Otherwise check your internet.`);
      }
      throw err;
    }
  }
  throw new Error("Failed to reach AI after multiple attempts.");
}
