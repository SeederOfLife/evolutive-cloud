import type { AppType } from "./agentSkills";

export interface RefinementQuestion {
  priority: "Critical" | "High Priority";
  question: string;
  why: string;
  suggestions: string[];
}

// Instant keyword heuristic — gives step 1 a sensible default type so the AI has
// project context. The user confirms/changes it in the refiner before building.
export function detectAppType(idea: string): AppType {
  const s = ` ${idea.toLowerCase()} `;
  if (/\b(game|jeu|play|arcade|platformer|shooter|shoot|rpg|puzzle|snake|tetris|maze|racing|dungeon|roguelike|tower ?defense)\b/.test(s)) return 'game';
  if (/\b(terminal|cli|command ?line|console|shell|hacker?|bash|prompt)\b/.test(s)) return 'terminal';
  if (/\b(music|synth|piano|drum|beat|sound|audio|melody|sequencer|daw|metronome)\b/.test(s)) return 'music';
  if (/\b(art|paint|draw|drawing|generative|shader|fractal|particle|kaleidoscope|visualizer)\b/.test(s)) return 'art';
  if (/\b(phone|mobile|swipe|chat app|social|feed|stories|dating|messenger)\b/.test(s)) return 'phone';
  return 'desktop';
}

export interface RefinementResult {
  questions: RefinementQuestion[];
  title: string;
}

export async function generateRefinementQuestions(
  idea: string,
  type: string,
  callAI: (prompt: string) => Promise<string>
): Promise<RefinementResult> {
  const prompt = `User wants to build a ${type} app: "${idea}"

Generate exactly 3 clarifying questions to make this idea concrete and buildable. Each question has a priority: Critical (the app cannot be built without this) or High Priority (greatly improves quality).

Return ONLY valid JSON:
{
  "questions": [
    {
      "priority": "Critical",
      "question": "Short question (max 8 words)",
      "why": "1 sentence why this matters",
      "suggestions": ["short answer 1", "short answer 2", "short answer 3"]
    }
  ],
  "title": "2-4 word app name like user would say it"
}

Questions should be specific to the idea, not generic. For "snake game" ask about: difficulty, theme, special powers. For "todo app" ask about: categories, deadlines, persistence. Make suggestions tappable shortcuts.`;

  const response = await callAI(prompt);
  try {
    const parsed = JSON.parse(response.replace(/```json|```/g, "").trim());
    return {
      title: parsed.title || idea,
      questions: (parsed.questions || []).slice(0, 3),
    };
  } catch {
    return { title: idea, questions: [] };
  }
}

export async function generateMoreSuggestions(
  question: string,
  existingSuggestions: string[],
  idea: string,
  callAI: (prompt: string) => Promise<string>
): Promise<string[]> {
  const prompt = `For the app idea "${idea}" and question "${question}", we already have these suggestions: ${existingSuggestions.join(", ")}. Generate 3 MORE different suggestions, not duplicates. Return ONLY a JSON array of 3 strings, no markdown.`;
  const response = await callAI(prompt);
  try {
    return JSON.parse(response.replace(/```json|```/g, "").trim());
  } catch {
    return [];
  }
}

export async function generateMoreQuestions(
  idea: string,
  type: string,
  existingQuestions: RefinementQuestion[],
  callAI: (prompt: string) => Promise<string>
): Promise<RefinementQuestion[]> {
  const asked = existingQuestions.map(q => q.question).join(" | ");
  const prompt = `For the app "${idea}" (type: ${type}), we already asked: ${asked}. Generate 2-3 MORE questions covering different aspects like visual style, sound, special features, accessibility, or edge cases. Return ONLY valid JSON: {"questions":[{"priority":"High Priority","question":"...","why":"...","suggestions":["...","...","..."]}]}`;
  const response = await callAI(prompt);
  try {
    const parsed = JSON.parse(response.replace(/```json|```/g, "").trim());
    return parsed.questions || [];
  } catch {
    return [];
  }
}

export async function buildFinalPrompt(
  idea: string,
  answers: Record<number, string>,
  questions: RefinementQuestion[],
  type: string,
  callAI: (prompt: string) => Promise<string>
): Promise<string> {
  const clarifications = questions
    .map((q, i) => `- ${q.question}: ${answers[i] || "skip"}`)
    .join("\n");

  const refined = await callAI(`Refine this app idea into a clear build prompt:

Original idea: "${idea}"
Type: ${type}

User clarifications:
${clarifications}

Return a 2-3 sentence concrete description of what to build. Be specific and actionable.`);

  return refined.trim() || idea;
}
