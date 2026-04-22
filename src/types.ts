
export interface Suggestion {
  id: number;
  content: string;
  votes: number;
  energy: number; // 0 to 100
  status: string;
  user_id?: string;
  manifested_code?: string;
  created_at?: string;
  pledged_by?: string[]; // user ids
  parent_id?: number | null; // For refinement iterations
  version?: number;
  is_deleted?: boolean;
}

export interface Advice {
  id: number;
  suggestion_id: number;
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

export interface VoidEcho {
  id: string;
  userId: string;
  text: string;
  x: number;
  y: number;
  createdAt: number;
}

export interface EvolutionSnapshot {
  id: string;
  manifested_at: string;
  count: number;
}

export interface ProjectConfig {
  creator_id: string;
  is_finalized: boolean;
  epoch_name: string;
}
