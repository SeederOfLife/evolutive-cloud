# Domaine : Identité

**Responsabilité** : tout ce qui concerne l'utilisateur, son compte et sa relation aux autres.

## Ce qui va ici
- `lib/firebase.ts` — configuration Firebase (auth + Firestore)
- `hooks/useAuth.ts` — état d'authentification réactif
- `hooks/useQuota.ts` — quotas d'utilisation IA
- `hooks/useSuggestions.ts` — chargement des apps depuis Firestore
- `components/AuthModal.tsx` — modal de connexion/inscription (NE PAS dupliquer)
- `components/NetworkPanel.tsx` — réseau social, comptes liés
- `components/HubView.tsx` — vue hub communautaire
- `services/invites.ts` — système d'invitations

## Règle critique
Il n'y a QU'UN seul AuthModal. Pour déclencher la connexion : `setShowAuth(true)` dans App.tsx.
Ne jamais créer un nouveau composant d'auth.
