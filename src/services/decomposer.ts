export interface GoalPlan {
  title: string;
  coreNeed: string;
  targetUser: string;
  features: string[];
  interactions: string[];
  visualStyle: string;
  successCriteria: string;
}

const FALLBACK: GoalPlan = {
  title: "",
  coreNeed: "",
  targetUser: "anyone",
  features: [],
  interactions: [],
  visualStyle: "clean",
  successCriteria: "works as described",
};

export async function decomposeGoal(
  idea: string,
  type: string,
  callAI: (prompt: string) => Promise<string>
): Promise<GoalPlan> {
  const prompt = `You are a product planner. Decompose this app idea into a clear plan.

USER IDEA: "${idea}"
APP TYPE: ${type}

Return ONLY valid JSON in this exact format, no markdown:
{
  "title": "2-4 word app name exactly as the user would say it (e.g. 'snake game' → 'Snake Game', 'flashcards for spanish' → 'Spanish Flashcards', 'todo list app' → 'Todo List')",
  "coreNeed": "1 sentence - what problem does this solve",
  "targetUser": "1 phrase - who is this for",
  "features": ["feature 1", "feature 2", "feature 3"],
  "interactions": ["interaction 1", "interaction 2"],
  "visualStyle": "1 phrase - clean/playful/professional/retro/etc",
  "successCriteria": "1 sentence - what makes this app successful"
}

Keep it concise. Features max 5 items. Interactions max 4 items.`;

  try {
    const response = await callAI(prompt);
    const cleaned = response.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { ...FALLBACK, ...parsed };
  } catch (err: any) {
    if (err?.message?.includes('All AI providers exhausted')) throw err;
    return { ...FALLBACK, coreNeed: idea };
  }
}
