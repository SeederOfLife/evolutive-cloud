import * as webllm from "@mlc-ai/web-llm";
import type { RefObject } from "react";
import type { AICallOptions } from "./ai.service";
import { callAI } from "./ai.service";
import { callGeminiCloud, callGeminiNano } from "./providers/google";
import { callOpenRouter, OPENROUTER_FREE_MODELS } from "./providers/openrouter";
import type { AIProvider } from "./ai.service";

export interface FallbackOptions extends AICallOptions {
  onProviderSwitch?: (provider: string, label: string) => void;
  webLlmEngineRef?: RefObject<webllm.MLCEngine | null>;
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

  // 1. Selected provider (Ollama/OpenRouter free tier need longer timeouts)
  const primaryTimeout = options.provider === 'ollama' ? 120_000
    : options.provider === 'openrouter' ? 90_000 : 30_000;
  const primary = await attempt(options.provider, () => callAI(prompt, options), primaryTimeout);
  if (primary !== null) return primary;

  // 2. Other cloud providers with stored keys (skip the already-tried one)
  const cloudProviders: Array<{ provider: AIProvider; model: string; label: string }> = [
    { provider: 'google',      model: 'gemini-2.0-flash',              label: 'Google Gemini' },
    { provider: 'openai',      model: 'gpt-4o-mini',                   label: 'OpenAI' },
    { provider: 'anthropic',   model: 'claude-haiku-4-5-20251001',     label: 'Anthropic' },
    { provider: 'openrouter',  model: 'poolside/laguna-xs-2.1:free',      label: 'OpenRouter' },
    { provider: 'groq',        model: 'llama-3.1-8b-instant',          label: 'Groq' },
    { provider: 'cerebras',    model: 'llama-3.3-70b',                 label: 'Cerebras' },
  ];

  for (const cp of cloudProviders) {
    if (cp.provider === options.provider) continue;
    if (!keys[cp.provider]) continue;
    const timeout = cp.provider === 'openrouter' ? 90_000 : 30_000;
    const result = await attempt(cp.label, () =>
      callAI(prompt, { ...options, provider: cp.provider, model: cp.model }), timeout
    );
    if (result !== null) return result;
  }

  // 2.5 OpenRouter free model cascade — server-side failover in one call
  if (keys['openrouter']) {
    const cascade = options.provider === 'openrouter'
      ? OPENROUTER_FREE_MODELS.filter(m => m !== options.model)
      : [...OPENROUTER_FREE_MODELS];
    if (cascade.length > 0) {
      const result = await attempt('OpenRouter (free cascade)', () =>
        callOpenRouter(prompt, cascade[0], keys['openrouter'], undefined, cascade), 90_000
      );
      if (result !== null) return result;
    }
  }

  // 3. Platform cloud relay
  const cloud = await attempt('Cloud Relay', () => callGeminiCloud(prompt, keys['google']));
  if (cloud !== null) return cloud;

  // 4. Gemini Nano (Chrome built-in)
  const nano = await attempt('Gemini Nano', () => callGeminiNano(prompt));
  if (nano !== null) return nano;

  // 5. WebLLM (local, requires WebGPU) — 60s to cover model download
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
