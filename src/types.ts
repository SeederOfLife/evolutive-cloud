
export interface GoalPlan {
  title: string;
  coreNeed: string;
  targetUser: string;
  features: string[];
  interactions: string[];
  visualStyle: string;
  successCriteria: string;
}

export interface EvolutionVersion {
  code: string;
  timestamp: string;
  prompt?: string;
}

export interface AppEvolution {
  timestamp: string;
  focus: string;
  depth: string;
  summary: string;
  code: string;
  prevCode: string;
  energyUsed: number;
}

export interface Suggestion {
  id: string;
  content: string;
  app_type?: 'phone' | 'desktop' | 'game' | 'terminal' | 'music' | 'art';
  category?: string;
  votes: number;
  energy: number; // 0 to 100
  status: string;
  user_id?: string;
  built_code?: string;
  created_at?: string;
  pledged_by?: string[]; // user ids
  parent_id?: string | null; // For refinement iterations
  version?: number;
  is_deleted?: boolean;
  history?: EvolutionVersion[];
  chat_thread?: { role: 'user' | 'assistant' | 'system', content: string }[];
  plan?: GoalPlan;
  refinement_questions?: { question: string; priority: string; why: string }[];
  refinement_answers?: Record<number, string>;
  visibility?: 'public' | 'private';
  evolutions?: AppEvolution[];
  autoWater?: 'off' | 'hourly' | 'daily' | 'weekly';
}

export interface AIConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  safetyThreshold: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_ONLY_HIGH';
}

export interface Advice {
  id: string;
  suggestion_id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  personal_api_key?: string;
}

export interface SystemMessage {
  id: string;
  userId: string;
  text: string;
  x: number;
  y: number;
  createdAt: number;
}

export interface EvolutionSnapshot {
  id: string;
  built_at: string;
  count: number;
}

export interface ProjectConfig {
  creator_id: string;
  is_finalized: boolean;
  project_name: string;
}
