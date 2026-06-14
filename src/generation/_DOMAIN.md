# Domaine : Génération

**Responsabilité** : tout ce qui transforme un prompt utilisateur en code React.

## Ce qui va ici
- Providers IA (`providers/google.ts`, `providers/openrouter.ts`, `providers/groq.ts`, `providers/ollama.ts`)
- Pipeline de génération (`ai.service.ts`)
- Décomposition de l'objectif (`decomposer.ts`)
- Raffinement du prompt (`refiner.ts`)
- Skills par type d'app (`skills/`, `agentSkills.ts`)
- Hook de sélection du provider (`hooks/useAI.ts`)

## Règle de dépendance
Ce domaine NE dépend PAS des composants UI (src/components/).
Il reçoit du texte, il retourne du texte (le code généré).
