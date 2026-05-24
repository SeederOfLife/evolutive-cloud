export interface RefinementQuestion {
  priority: "Critical" | "High Priority";
  question: string;
  why: string;
  suggestions: string[];
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
