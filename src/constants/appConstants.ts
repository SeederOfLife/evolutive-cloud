import { Globe, Zap, Sparkles, Layers, Cpu, Server, Bolt } from "lucide-react";

export const MANIFEST_PROVIDERS = [
  { id: "google",      label: "Google Gemini", Icon: Globe,    model: "gemini-2.0-flash" },
  { id: "openai",      label: "OpenAI GPT-4",  Icon: Zap,      model: "gpt-4o" },
  { id: "anthropic",   label: "Claude",         Icon: Sparkles, model: "claude-sonnet-4-20250514" },
  { id: "openrouter",  label: "OpenRouter",     Icon: Layers,   model: "poolside/laguna-xs-2.1:free" },
  { id: "groq",        label: "Groq (Free)",    Icon: Zap,      model: "llama-3.1-8b-instant" },
  { id: "cerebras",    label: "Cerebras (Free)", Icon: Bolt,    model: "llama-3.3-70b" },
  { id: "web-llm",     label: "Free Local AI",  Icon: Cpu,      model: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC" },
  { id: "ollama",      label: "Ollama",         Icon: Server,   model: "gemma2:2b" },
] as const;

export const HERO_PHRASES = [
  "What will you build today?",
  "Games, tools, art, music — anything.",
  "Describe it. We build it.",
  "Turn imagination into code.",
];

export const EXAMPLE_CHIPS = [
  "snake game with neon style",
  "vocabulary flashcards for spanish",
  "particle art that follows my mouse",
];

export const ONBOARDING_STEPS = [
  {
    title: "Welcome to Evolutive",
    body: "Turn any idea into a working app — games, tools, art, music — in seconds.",
    note: null,
  },
  {
    title: "Choose Your AI",
    body: "Pick how to power your apps. Google Gemini is free and works on any device — no GPU needed.",
    note: null,
  },
  {
    title: "Describe your idea",
    body: "Type anything in the bar below — specific or vague. We'll build it into an interactive, animated app.",
    note: null,
  },
  {
    title: "Explore the galaxy",
    body: "Each app you build becomes an orbiting node in space. Click any glowing orb to launch it.",
    note: null,
  },
];
