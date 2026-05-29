# Evolutive Cloud — Project Memory

## What it is
AI-powered app generator. User describes any app idea → AI generates it as a runnable React component in an iframe sandbox. Apps live in a 3D galaxy and grow over time via "watering" (passive AI improvement passes). Live at evolutive-cloud.vercel.app. Solo project by Maxime (@SeederOfLife). Vision: a living garden of imagination, not a one-shot generator.

## Stack
React 19 + TypeScript + Vite, Three.js / React Three Fiber, Firebase auth+Firestore, Tailwind, Framer Motion. Deployed on Vercel. AI providers: Google Gemini, OpenAI, Anthropic, WebLLM (local browser), Ollama (local server), OpenRouter (multi-model aggregator).

## Architecture map
- `src/App.tsx` — root, holds main state (suggestions, currentUser, showAuth, isManifesting, viableProviders, etc.). The auth modal trigger is `setShowAuth(true)`. The login/signup component is `AuthModal`.
- `src/services/skills/` — 9 agent skills (game/phone/desktop/terminal/music/art/esl/card/simulation) + SKILL_DESIGN as a universal polish layer.
- `src/services/agentSkills.ts` — `getAgentSkill(type)` returns the system prompt for that type.
- `src/services/ai.service.ts` — generation pipeline; `buildEvolution()` is the main entry. Prepends agent skill + SKILL_DESIGN + GoalPlan + refinement answers.
- `src/hooks/useAI.ts` — provider selection, key storage, smart fallback chain. `detectViableProviders()` runs on mount. `withTimeout()` wraps every attempt.
- `src/services/decomposer.ts` — goal decomposition before build, returns GoalPlan { title, coreNeed, features[], roadmap }.
- `src/services/refiner.ts` — PromptRefiner: generates 3 priority-ranked clarifying questions + clean app title.
- `src/services/watering.ts` — `waterApp()` evolves existing code with focus + depth + note.
- `src/components/AppSandbox.tsx` + `ModulePlayer.tsx` — iframe runtime for generated code.
- `src/components/ThreeWorld.tsx` — galaxy view, ModuleNode renders each app, scales/glows/pulses by evolution count + energy.
- `src/components/WaterDialog.tsx` + `DiffViewer.tsx` — watering UI + before/after review.
- `src/components/PromptRefiner.tsx` + `PlanCard.tsx` + `AIProgress.tsx` — generation flow UI.
- `src/services/seedApps.ts` — 5 hardcoded demo apps shown when galaxy is empty.

## Sandbox rules (CRITICAL — generated code MUST follow)
- NO imports allowed. All deps are globals.
- Available globals: React 18, ReactDOM, Tailwind CSS classes, Phaser 3, Web Audio API, Canvas 2D, 110+ Lucide icon stubs (Proxy fallback handles unknown names).
- localStorage is BLOCKED in the sandbox iframe — use React state only.
- Tailwind is CSS classes, not a JS global — don't `window.Tailwind`.
- Render injection: use `findAppFunctionEnd()` to find the App function's matching closing brace and inject `ReactDOM.createRoot(...).render(React.createElement(App))` AFTER it. NEVER use `lastIndexOf('}')` — that breaks on inner callbacks.
- Always validate with `isCodeBalanced()` before injection. If unbalanced, the AI truncated — auto-retry with a "generate COMPLETE working version, simplify if needed" prompt.
- Phaser games: use `useRef` for game state inside scenes, NOT useState (closure issues in update()).

## Generation philosophy
SEED-FIRST. Don't try to build a finished app in one shot. Generate a small, complete, polished CORE that's enjoyable today, with `// GROWTH:` comments marking where future watering will expand. Show the user a roadmap (now / next / future). Watering is how apps grow toward their full vision over days/weeks. Cadence: Off / Hourly / Daily / Every 2 days / Every 3 days / Weekly / Monthly.

## AI provider reality
- WebGPU is NOT available on iOS or many laptops — `detectViableProviders()` excludes WebLLM when unsupported.
- Gemini free tier: 20 req/min, often 429-limits. Free key from aistudio.google.com/apikey.
- Ollama runs at localhost:11434. Browser needs `OLLAMA_ORIGINS=*` for CORS, set in env before `ollama serve`.
- OpenRouter is the multi-model option — one key, many models including free ones.
- Default provider is `'google'`, NOT `'web-llm'`. WebLLM is opt-in or auto-selected only when WebGPU works.
- Smart fallback chain auto-tries viable providers in order. Don't break this.

## Conventions
- Commit style: `feat:` / `fix:` / `docs:` / `refactor:`
- Always run `npx tsc --noEmit` before commit. Fix all type errors.
- Git binary: `C:\Users\user palis\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe`
- Terminal is Git Bash (configured in VS Code settings).
- Logged-out users can browse + launch apps. Create/modify actions (Manifest, Fork, Water, Vote) intercept with login modal, preserve intent, continue after auth.

## What NOT to do
- Don't add new auth modals — reuse `AuthModal` via `setShowAuth(true)`.
- Don't put `localStorage` calls in sandbox-generated code — it's blocked, will crash with SecurityError.
- Don't default new users to WebLLM — many devices can't run it.
- Don't use `import` statements in generated app code — they're stripped but it's better to not generate them.
- Don't write verbose AI-generated app titles ("a grid-based arcade application where..."). Use the short title from PromptRefiner / decomposer.

## Backlog (discussed, not built)
- Checklist/roadmap side-panel where each roadmap goal can have an attached drawing/explanation
- Vocabulary Review tool (EN/ES/FR with SM-2 spaced repetition) — build first as seed app
- Auto-watering v2 background loop (grow apps while phone open with local LLM)
- Evolution tree v3 (version nodes as galaxy branches)
