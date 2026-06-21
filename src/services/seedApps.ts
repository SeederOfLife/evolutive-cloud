import { Suggestion } from "../types";
import { SNAKE_CODE, DRUM_CODE } from "./seedGameCodes";
import { MOOD_CODE, PARTICLE_CODE, FLASH_CODE } from "./seedAppCodes";

const yesterday = new Date(Date.now() - 86400000).toISOString();

export const SEED_APPS: Suggestion[] = [
  {
    id: 'seed_snake_001',
    content: 'Snake Game',
    app_type: 'game',
    status: 'built',
    votes: 42,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: SNAKE_CODE,
    created_at: yesterday,
    history: [],
  },
  {
    id: 'seed_mood_001',
    content: 'Daily Mood Tracker',
    app_type: 'phone',
    status: 'built',
    votes: 37,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: MOOD_CODE,
    created_at: yesterday,
    history: [],
  },
  {
    id: 'seed_particles_001',
    content: 'Particle Flow',
    app_type: 'art',
    status: 'built',
    votes: 51,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: PARTICLE_CODE,
    created_at: yesterday,
    history: [],
  },
  {
    id: 'seed_drums_001',
    content: 'Drum Pad',
    app_type: 'music',
    status: 'built',
    votes: 34,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: DRUM_CODE,
    created_at: yesterday,
    history: [],
  },
  {
    id: 'seed_flash_001',
    content: 'Vocabulary Flashcards',
    app_type: 'phone',
    status: 'built',
    votes: 28,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: FLASH_CODE,
    created_at: yesterday,
    history: [],
  },
];
