import type { AIProvider } from "../services/ai.service";
import type { AIConfig } from "../types";

export const DEFAULT_AI_CONFIG: AIConfig & { systemPrompt: string } = {
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

export const PROVIDER_DEFAULT_MODELS: Partial<Record<AIProvider, string>> = {
  google:      'gemini-2.0-flash',
  openai:      'gpt-4o-mini',
  anthropic:   'claude-haiku-4-5-20251001',
  openrouter:  'google/gemini-2.0-flash-exp:free',
  groq:        'llama3-8b-8192',
  cerebras:    'llama-3.3-70b',
  ollama:      'gemma2:2b',
  'web-llm':   'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
};

export function parseProviderKeys(raw: string | null, legacy: string | null): Record<string, string[]> {
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

export async function detectViableProviders(
  keys: Record<string, string[]>,
  ollamaEndpoint: string,
): Promise<AIProvider[]> {
  const viable: AIProvider[] = [];
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  if (keys.google?.length)      viable.push('google');
  if (keys.openrouter?.length)  viable.push('openrouter');
  if (keys.groq?.length)        viable.push('groq');
  if (keys.openai?.length)      viable.push('openai');
  if (keys.anthropic?.length)   viable.push('anthropic');

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${ollamaEndpoint}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) viable.push('ollama');
  } catch { /* not reachable */ }

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
