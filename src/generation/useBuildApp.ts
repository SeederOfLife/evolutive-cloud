import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Suggestion, AIConfig, GoalPlan } from '../types';
import { AGENT_SYSTEM_PROMPTS, AGENT_GUIDELINES, type AppType } from '../services/agentSkills';
import { generateRefinementQuestions, buildFinalPrompt, detectAppType, type RefinementQuestion } from '../services/refiner';
import { decomposeGoal } from '../services/decomposer';
import type { AIStageIndex } from '../components/AIProgress';

export interface PendingRefiner {
  idea: string;
  title: string;
  questions: RefinementQuestion[];
  appType: AppType;
  onBuild: (answers: Record<number, string>, editedTitle: string, appType: AppType) => void;
  onSkip: (editedTitle: string, appType: AppType) => void;
}

interface Options {
  suggestions: Suggestion[];
  aiConfig: AIConfig & { systemPrompt: string };
  callAI: (prompt: string) => Promise<string>;
  apiQuota: number;
  consumeQuota: (n: number) => void;
  user: User | null;
  aiProvider: string;
  providerKeys: Record<string, string[]>;
  setAiError: (msg: string | null) => void;
  setLaunchTarget: Dispatch<SetStateAction<Suggestion | null>>;
}

export function useBuildApp({
  suggestions, aiConfig, callAI, apiQuota, consumeQuota,
  user, aiProvider, providerKeys, setAiError, setLaunchTarget,
}: Options) {
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const [isManifesting, setIsManifesting] = useState(false);
  const [aiStage, setAiStage] = useState<AIStageIndex>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRefiner, setPendingRefiner] = useState<PendingRefiner | null>(null);

  const buildEvolution = useCallback(async (
    suggestion: Suggestion,
    _plan?: unknown,
    overridePrompt?: string,
  ) => {
    if (isBuilding && isBuilding !== suggestion.id) return;
    try {
      setIsBuilding(suggestion.id);
      setAiStage(2);
      setIsManifesting(true);

      const existingApps = suggestions
        .filter(s => s.status !== 'system_config' && s.status !== 'deleted' && !s.is_deleted && s.id !== suggestion.id && s.status === 'built')
        .slice(0, 8)
        .map(s => `- "${s.content}" (${s.app_type || 'desktop'})`)
        .join('\n');

      const appType = (suggestion.app_type || 'desktop') as AppType;
      const taskDescription = overridePrompt || suggestion.content;

      let goalPlan: GoalPlan | null = null;
      try { goalPlan = await decomposeGoal(taskDescription, appType, callAI); } catch { /* non-critical */ }

      const scope = goalPlan?.scope ?? (() => {
        const lower = taskDescription.toLowerCase();
        const words = lower.split(/\s+/).length;
        const smallKws = ['timer', 'clock', 'counter', 'stopwatch', 'calculator', 'converter', 'random', 'dice', 'color picker'];
        if (smallKws.some(kw => lower.includes(kw)) && words <= 8) return 'small' as const;
        if (appType === 'game' || words > 12) return 'large' as const;
        if (words <= 5) return 'small' as const;
        return 'medium' as const;
      })();

      const isSeed = scope !== 'small';

      const seedSection = isSeed ? `
SEED-FIRST PHILOSOPHY:
You are planting a SEED that will grow over days through watering passes, not building a finished app in one shot.

Build a COMPLETE, ENJOYABLE CORE — small in scope but fully working and fun to use today. Pick the single most essential loop or feature and make it polished. Do NOT attempt the full vision now.

Leave clear room to grow: structure the code so features can be added later (modular state, clear sections, // GROWTH: comments marking where future watering can expand).

Example: for a large game idea, build ONE working room with core movement and one mechanic — complete and playable — not a broken sprawling attempt at everything.

After the full code, on a NEW LINE output the growth roadmap as JSON:
ROADMAP: {"now":["what works today 1","what works today 2"],"next":["next watering adds 1","next watering adds 2"],"future":["bigger vision 1","bigger vision 2"]}
`.trim() : '';

      const copyrightLine = `COPYRIGHT: Reference only general design patterns and genres. Never reproduce specific copyrighted games, characters, assets, or code. Build original mechanics inspired by genres, not clones of named products.`;

      const energy = suggestion.energy ?? 50;
      const energyContext = !isSeed
        ? (energy > 50 ? 'This is a high-energy creation — go complex and ambitious' : 'Start simple but make it polished and complete')
        : '';

      const prompt = [
        `System: ${aiConfig.systemPrompt}`,
        seedSection,
        `Type specialist: ${AGENT_SYSTEM_PROMPTS[appType]}`,
        energyContext ? `Energy: ${energyContext}` : '',
        `Target: ${appType.toUpperCase()}`,
        `\nTask: Create a complete React application for: "${taskDescription}"`,
        existingApps ? `\nOther apps already built (for context, don't duplicate):\n${existingApps}` : '',
        `\nType-specific guidance:\n- ${AGENT_GUIDELINES[appType]}`,
        `\n${copyrightLine}`,
        `\nLibraries available (already in scope, NO imports needed):
- React 18 hooks (useState, useEffect, useMemo, useRef, useCallback, useContext, useReducer)
- Tailwind CSS classes (use class names directly, no window.Tailwind)
- Lucide React icons (use any icon name directly: Play, Pause, Volume2, Trophy, etc.)
- Recharts (LineChart, BarChart, PieChart, AreaChart, ResponsiveContainer...)
- motion.div, AnimatePresence from Framer Motion
- Canvas 2D API, Web Audio API, SVG, requestAnimationFrame, Math — all available natively
- Camera/microphone: navigator.mediaDevices.getUserMedia({video:true}) works (user sees a permission prompt) — attach the stream to a <video> element via ref
- Persistent memory: const data = await AppStorage.load(); AppStorage.save(obj) — a plain JSON object that survives reload. Use it for scores, settings, saved notes.
- IMPORTANT: localStorage is NOT available (sandbox restriction) — use React state + AppStorage only`,
        `\nCritical rules:
- Start with: export default function App() {
- NO import statements at all
- ALL styling via Tailwind classes or inline styles
- Return ONLY raw code${isSeed ? ' then ROADMAP: JSON' : ''}, no markdown fences
- CRITICAL: Always complete the entire function. Never truncate. The last line MUST be the closing brace of the App function. If the response is getting long, simplify features rather than cutting code mid-statement.`,
      ].filter(Boolean).join('\n\n').trim();

      if (apiQuota < 20) {
        alert('Build capacity too low (needs 20%). Wait for recharge.');
        return;
      }

      setAiStage(3);
      const text = await callAI(prompt);
      setAiStage(4);

      let roadmap: { now: string[]; next: string[]; future: string[] } | undefined;
      let codeText = text;
      if (isSeed) {
        const roadmapIdx = text.lastIndexOf('\nROADMAP:');
        if (roadmapIdx !== -1) {
          const jsonStr = text.slice(roadmapIdx + 9).trim();
          try { roadmap = JSON.parse(jsonStr); } catch { /* ignore */ }
          codeText = text.slice(0, roadmapIdx);
        }
      }

      const match = codeText.match(/```(?:javascript|typescript|tsx|jsx)?\s?([\s\S]*?)```/);
      const generatedCode = (match ? match[1] : codeText)
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();

      if (!generatedCode) throw new Error('No code returned.');

      setAiStage(5);
      const saveData: Record<string, unknown> = { status: 'built', built_code: generatedCode };
      if (roadmap) saveData.roadmap = roadmap;
      try {
        await updateDoc(doc(db, 'suggestions', suggestion.id), saveData);
      } catch (saveErr: any) {
        // Generation succeeded — never discard it because the save failed. Open locally, warn.
        console.error('Cloud save failed, app kept in session:', saveErr);
        setAiError(`App generated but cloud save failed (${saveErr?.code || saveErr?.message}). It opens locally — it won't persist after reload.`);
      }
      consumeQuota(15);
      setAiStage(6);
      setLaunchTarget({ ...suggestion, status: 'built', built_code: generatedCode, ...(roadmap ? { roadmap } : {}) });
    } catch (err: any) {
      console.error('Build failed:', err);
      setAiError(err.message);
    } finally {
      setIsBuilding(null);
      setIsManifesting(false);
    }
  }, [isBuilding, suggestions, aiConfig, callAI, apiQuota, consumeQuota, setAiError, setLaunchTarget]);

  const handleSuggest = useCallback(async (
    input: string,
    setInput: (s: string) => void,
    canSuggest: boolean,
  ) => {
    if (!input.trim() || !canSuggest) return;
    if (apiQuota < 20) {
      alert('Build capacity too low (needs 20%). Wait for recharge.');
      return;
    }
    if (['openai', 'anthropic'].includes(aiProvider) && !providerKeys[aiProvider]?.length) {
      const label = aiProvider === 'anthropic' ? 'Claude (Anthropic)' : 'OpenAI';
      alert(`Add your ${label} API key in Settings to start generating`);
      return;
    }
    const rawInput = input.trim();
    setInput('');
    setIsLoading(true);
    try {
      setAiStage(0);
      setIsManifesting(true);
      // Step 1 owns the type: detect a default from the idea, user confirms in the refiner.
      const detectedType = detectAppType(rawInput);
      let questions: RefinementQuestion[] = [];
      let aiTitle = rawInput;
      try {
        const result = await generateRefinementQuestions(rawInput, detectedType, callAI);
        questions = result.questions;
        aiTitle = result.title || rawInput;
      } catch (err: any) {
        if (err?.message?.includes('All AI providers exhausted')) throw err;
      }
      setIsManifesting(false);

      type RefinerResult = { answers: Record<number, string>; title: string; skipped: boolean; appType: AppType };
      const { answers, title: finalTitle, skipped, appType } = await new Promise<RefinerResult>(resolve => {
        setPendingRefiner({
          idea: rawInput,
          title: aiTitle,
          questions,
          appType: detectedType,
          onBuild: (answers, editedTitle, chosenType) => resolve({ answers, title: editedTitle, skipped: false, appType: chosenType }),
          onSkip: (editedTitle, chosenType) => resolve({ answers: {}, title: editedTitle, skipped: true, appType: chosenType }),
        });
      });
      setPendingRefiner(null);

      setAiStage(1);
      setIsManifesting(true);
      let buildPrompt = rawInput;
      if (!skipped && Object.values(answers).some(v => v.trim())) {
        try {
          buildPrompt = await buildFinalPrompt(rawInput, answers, questions, appType, callAI);
        } catch (err: any) {
          if (err?.message?.includes('All AI providers exhausted')) throw err;
          buildPrompt = rawInput;
        }
      }
      setIsManifesting(false);

      const insertData: any = {
        content: finalTitle,
        app_type: appType,
        status: 'pending',
        votes: 0,
        energy: 0,
        user_id: user?.uid || null,
        created_at: new Date().toISOString(),
        ...(questions.length > 0 ? {
          refinement_questions: questions.map(q => ({ question: q.question, priority: q.priority, why: q.why })),
          refinement_answers: answers,
        } : {}),
      };
      const docRef = await addDoc(collection(db, 'suggestions'), insertData);
      const newSuggestion = { id: docRef.id, ...insertData } as Suggestion;
      consumeQuota(5);

      await buildEvolution(newSuggestion, undefined, buildPrompt);
    } catch (err: any) {
      console.error('Manifest error:', err);
      setAiError(err.message);
    } finally {
      setIsManifesting(false);
      setIsBuilding(null);
      setIsLoading(false);
    }
  }, [apiQuota, aiProvider, providerKeys, callAI, consumeQuota, user, setAiError, buildEvolution]);

  return {
    isBuilding,
    isManifesting,
    aiStage,
    isLoading,
    pendingRefiner,
    setPendingRefiner,
    buildEvolution,
    handleSuggest,
  };
}
