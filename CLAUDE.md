# Evolutive Cloud — Instructions Claude

## Ce projet
App generator IA : l'utilisateur décrit une idée → IA génère un composant React dans un iframe sandbox → les apps vivent dans une galaxie 3D et grandissent via "watering" (passes IA passives). Projet solo de Maxime (@SeederOfLife). Live : evolutive-cloud.vercel.app.

## Les 5 domaines de sens
| Domaine | Dossier cible | Ce qui y appartient |
|---|---|---|
| **Génération** | `src/generation/` | Pipeline IA : providers, decomposer, refiner, skills, agentSkills, useAI |
| **Sandbox** | `src/sandbox/` | Exécution iframe : AppSandbox, sandboxUtils, LaunchModal, ModulePlayer |
| **Galaxie** | `src/galaxy/` | Vue 3D : ThreeWorld, seededRand, seedApps |
| **Évolution** | `src/evolution/` | Amélioration dans le temps : watering, DiffViewer, WaterDialog, EvolutionTree |
| **Identité** | `src/identity/` | Utilisateur : auth, useAuth, NetworkPanel, HubView, invites, useQuota |

## Règle #1 — Un fichier, une job (NON-NÉGOCIABLE)
- **Seuil : 300 lignes. Cible : 150–200 lignes.**
- Un fichier dépasse 300 lignes → le découper AVANT d'ajouter des features.
- Tout nouveau fichier → dans son dossier domaine (table ci-dessus).
- Vérifier après chaque série de modifications : `npm run check:sizes`

## Règle #2 — Direction des dépendances
- Les services (génération) ne dépendent JAMAIS des composants UI.
- `App.tsx` orchestre les domaines — il n'implémente pas de logique métier.
- Pas de dépendances circulaires entre domaines.

## Règles sandbox (CRITICAL — generated code MUST follow)
- NO imports. Toutes dépendances sont des globals (React, ReactDOM, Tailwind, Phaser, Lucide via Proxy).
- `localStorage` BLOQUÉ dans le sandbox iframe — React state uniquement.
- Injection render : `findAppFunctionEnd()` pour trouver l'accolade fermante de App, injecter APRÈS. JAMAIS `lastIndexOf('}')`.
- Valider avec `isCodeBalanced()`. Si false → tronqué → auto-retry "generate COMPLETE working version, simplify if needed".
- Jeux Phaser : `useRef` pour l'état de scène, JAMAIS `useState` (closure issue dans `update()`).
- Philosophie SEED-FIRST : cœur small+polished + `// GROWTH:` comments + roadmap. Pas d'app complet en un shot.

## Providers IA
- Provider par défaut : `'google'`. WebLLM opt-in (requiert WebGPU, absent sur iOS/laptops).
- Fallback chain : `google → openrouter → groq → ollama → cloud relay → gemini-nano → webllm`. Ne pas casser l'ordre.
- Clés API : Settings UI uniquement, JAMAIS dans le code source.
- Ollama : `OLLAMA_ORIGINS=*` + `ollama serve` actif. Timeout 120s.

## Ce qu'on NE fait PAS
- Pas de nouvel AuthModal — `setShowAuth(true)` suffit (réutilise `AuthModal`).
- Pas de `localStorage` dans le code sandbox (SecurityError garanti).
- Pas de titres d'apps verbeux — titre court depuis PromptRefiner/decomposer.
- Pas de `lastIndexOf('}')` pour l'injection render.
- Pas de WebLLM par défaut pour les nouveaux utilisateurs.

## Vérifications obligatoires avant chaque commit
Lance ces 3 commandes après chaque modification importante. Si les 3 sont vertes, l'architecture tient.

| Commande | 🟢 Vert = tout va bien | 🔴 Rouge = ne pas pousser |
|---|---|---|
| `npm run lint` | `Found 0 errors` | erreur TypeScript quelque part |
| `npm run check:sizes` | `Tous les fichiers src sont sous 300 lignes` | fichier trop gros → découper d'abord |
| `npm test` | `X passed` | un test échoue → fonction critique cassée |

```bash
npm run lint && npm run check:sizes && npm test
```

## Environnement dev
- Git binary : `C:\Users\user palis\AppData\Local\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe`
- Terminal : Git Bash. Node/npm en PowerShell : `$env:Path = "C:\Program Files\nodejs;" + $env:Path`
- Commit style : `feat:` / `fix:` / `docs:` / `refactor:`
- Utilisateurs non-connectés peuvent browse + launch. Manifest/Fork/Water/Vote → intercepte avec login modal.
