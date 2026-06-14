# Domaine : Évolution

**Responsabilité** : faire grandir les apps dans le temps via des passes IA ciblées ("watering").

## Ce qui va ici
- `watering.ts` — `waterApp()` : améliore le code existant avec focus + depth + note
- `WaterDialog.tsx` — UI pour déclencher un watering
- `DiffViewer.tsx` — comparaison avant/après une évolution
- `EvolutionTree.tsx` — visualisation de l'arbre des versions

## Concept clé
Une app naît petite (SEED-FIRST) et grandit par waterings successifs.
Cadence configurable : Off / Hourly / Daily / Every 2-3 days / Weekly / Monthly.
Chaque watering génère une `AppEvolution` avec `prevCode`, `summary`, `focus`, `depth`.
