# Domaine : Galaxie

**Responsabilité** : la vue 3D où vivent les apps sous forme de nœuds orbitants.

## Ce qui va ici
- `ThreeWorld.tsx` — scène React Three Fiber complète (galaxie, nœuds, nébuleuse, seed)
- `seededRand.ts` — générateur déterministe pour les positions stables des nœuds
- `seedApps.ts` — 5 apps de démo affichées quand la galaxie est vide

## Technologies
React Three Fiber (@react-three/fiber), Drei (@react-three/drei), Three.js.
OrbitControls avec zoom clampé : minDistance=3, maxDistance=25.
Vitesses réduites de 60% pour une motion plus organique.
