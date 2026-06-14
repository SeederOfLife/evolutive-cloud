# Domaine : Sandbox

**Responsabilité** : exécuter le code généré dans un iframe sécurisé et l'afficher à l'utilisateur.

## Ce qui va ici
- `AppSandbox.tsx` — l'iframe qui exécute le code
- `sandboxUtils.ts` — `isCodeBalanced()` + `findAppFunctionEnd()` (fonctions critiques)
- `LaunchModal.tsx` — modal d'affichage d'une app lancée
- `ModulePlayer.tsx` — player avancé avec éditeur de code
- `ChatPanel.tsx` — chat IA intégré au player

## Règles critiques du sandbox
- Le code exécuté n'a PAS accès aux imports (bloqués).
- `localStorage` est BLOQUÉ — React state uniquement.
- Injection du render toujours via `findAppFunctionEnd()`, jamais `lastIndexOf('}')`.
- Valider avec `isCodeBalanced()` avant toute injection.
