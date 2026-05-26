import type { Suggestion, AppEvolution } from '../types';

export const FOCUS_AREAS = [
  { id: 'ux', label: 'UX Polish', icon: '✨', description: 'Smoother interactions, better feedback, delightful details' },
  { id: 'features', label: 'New Features', icon: '🚀', description: 'Expand capabilities with useful new functionality' },
  { id: 'visual', label: 'Visual Design', icon: '🎨', description: 'Colors, typography, layout, animations' },
  { id: 'performance', label: 'Performance', icon: '⚡', description: 'Faster, lighter, more responsive' },
  { id: 'gameplay', label: 'Gameplay', icon: '🎮', description: 'More fun, better balance, new mechanics' },
  { id: 'sound', label: 'Sound & Feel', icon: '🎵', description: 'Audio feedback, haptics, satisfying interactions' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿', description: 'Keyboard nav, contrast, screen reader support' },
] as const;

export type FocusId = typeof FOCUS_AREAS[number]['id'];

export const DEPTH_OPTIONS = [
  { id: 'gentle', label: 'Gentle', cost: 10, description: 'Small, safe improvements — preserves existing behaviour' },
  { id: 'balanced', label: 'Balanced', cost: 20, description: 'Meaningful changes with some experimentation' },
  { id: 'wild', label: 'Wild', cost: 35, description: 'Bold reimagining — anything goes' },
] as const;

export type DepthId = typeof DEPTH_OPTIONS[number]['id'];

export async function waterApp(
  suggestion: Suggestion,
  focus: FocusId,
  depth: DepthId,
  note: string,
  callAI: (prompt: string) => Promise<string>,
): Promise<AppEvolution> {
  const focusArea = FOCUS_AREAS.find(f => f.id === focus)!;
  const depthOption = DEPTH_OPTIONS.find(d => d.id === depth)!;
  const generationCount = (suggestion.evolutions?.length ?? 0) + 1;

  const prompt = `You are evolving a living app. This is generation ${generationCount}.

CURRENT APP CODE:
\`\`\`jsx
${suggestion.built_code}
\`\`\`

EVOLUTION FOCUS: ${focusArea.label} — ${focusArea.description}
DEPTH: ${depthOption.label} — ${depthOption.description}
${note ? `CREATOR NOTE: ${note}` : ''}

Your task: Evolve this app with a ${depthOption.label.toLowerCase()} focus on ${focusArea.label.toLowerCase()}.

RULES:
- Return ONLY the complete updated React component code (no markdown fences, no explanation)
- The component must still be a single default export with no imports
- All sandbox globals remain available (React hooks, Tailwind, Lucide icons, Framer Motion, Phaser, Recharts)
- No localStorage, no external fetch
- Preserve all existing functionality unless depth is "Wild"
- Make the evolution feel intentional and coherent — not random

After the code, on a NEW LINE starting with "SUMMARY:", write one sentence describing what changed (max 80 chars).`;

  const raw = await callAI(prompt);

  const summaryMatch = raw.match(/\nSUMMARY:\s*(.+)/);
  const summary = summaryMatch ? summaryMatch[1].trim() : `${focusArea.label} evolution (gen ${generationCount})`;
  const code = raw.replace(/\nSUMMARY:.+/, '').trim();

  return {
    timestamp: new Date().toISOString(),
    focus: focusArea.label,
    depth: depthOption.label,
    summary,
    code,
    prevCode: suggestion.built_code ?? '',
    energyUsed: depthOption.cost,
  };
}
