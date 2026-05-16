# App.tsx Refactor Plan
## evolutive-cloud — splitting 2,979 lines into a maintainable structure

---

## The target structure

```
src/
├── App.tsx                          (~150 lines — just wires things together)
├── types.ts                         (already done ✓)
├── lib/
│   └── firebase.ts                  (already done ✓)
├── hooks/
│   ├── useAuth.ts                   (~80 lines)
│   ├── useAI.ts                     (~250 lines)
│   ├── useSuggestions.ts            (~120 lines)
│   ├── usePresence.ts               (~60 lines)
│   └── useQuota.ts                  (~40 lines)
├── services/
│   ├── ai.service.ts                (~300 lines)
│   └── suggestions.service.ts      (~120 lines)
└── components/
    ├── ThreeWorld.tsx               (already done ✓)
    ├── ModulePlayer.tsx             (already done ✓)
    ├── EmulatorHub.tsx              (already done ✓)
    ├── EvolutionTree.tsx            (already done ✓)
    ├── AppSandbox.tsx               (already done ✓)
    ├── views/
    │   ├── LibraryView.tsx          (~400 lines)
    │   ├── IdentityView.tsx         (~200 lines)
    │   └── SettingsPanel.tsx        (~250 lines)
    └── ui/
        ├── SuggestionCard.tsx       (~150 lines)
        └── ManifestBar.tsx          (~80 lines)
```

---

## Step 1 — Extract `useAuth.ts`

Everything related to login state. Cut this block from App.tsx:

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { UserProfile } from "../types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // onAuthStateChanged listener (lines ~760 in App.tsx)
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setUserProfile(null);
    });
  }, []);

  // fetchProfile on user change (lines ~354 in App.tsx)
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const docRef = doc(db, 'user_profiles', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        await setDoc(docRef, { id: user.uid });
      }
    };
    fetchProfile();
  }, [user]);

  // handleEmailAuth (lines ~1037 in App.tsx)
  const signInWithEmail = async (email: string, password: string, isSignUp: boolean) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGithub = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => signOut(auth);

  return {
    user, userProfile, authError, isLoading,
    signInWithEmail, signInWithGoogle, signInWithGithub, logout
  };
}
```

---

## Step 2 — Extract `services/ai.service.ts`

The `callGeminiCloud` and `callUnifiedAI` functions are ~300 lines of pure logic with no React. They don't need to be inside the component at all — they just need the current config passed in.

```typescript
// src/services/ai.service.ts
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import * as webllm from "@mlc-ai/web-llm";
import { AIConfig } from "../types";

export type AIProvider = 'google' | 'openai' | 'anthropic' | 'custom' | 'web-llm' | 'gemini-nano' | 'mlc-mobile';

export interface AICallOptions {
  provider: AIProvider;
  model: string;
  keys: Record<string, string>;
  config: AIConfig;
  customEndpoint?: string;
  forceCloud?: boolean;
  onProgress?: (msg: string) => void;
  webLlmEngineRef?: React.MutableRefObject<webllm.MLCEngine | null>;
}

export async function callAI(prompt: string, options: AICallOptions): Promise<string> {
  // Move entire callUnifiedAI body here, receiving config via options
  // This is now a pure async function — no setState calls inside
  // Return the text, let the hook handle state updates
}

export async function callGeminiCloud(prompt: string): Promise<string> {
  // Move callGeminiCloud body here
}
```

**Why this matters:** Right now `callUnifiedAI` calls `setAiError`, `setIsRateLimited`, `setRateLimitCountdown`, and `setWebLlmProgress` — that's why it has to live inside the component. Move those side-effects out: return errors as thrown exceptions, return progress via a callback. Then the service has zero React dependencies.

---

## Step 3 — Extract `hooks/useAI.ts`

The hook wraps the service and manages the React state that surrounds it:

```typescript
// src/hooks/useAI.ts
import { useState, useRef, useCallback } from "react";
import { callAI, AIProvider } from "../services/ai.service";
import { AIConfig } from "../types";
import * as webllm from "@mlc-ai/web-llm";

export function useAI() {
  const [aiProvider, setAiProvider] = useState<AIProvider>(() =>
    (localStorage.getItem('app_provider') as AIProvider) || 'google'
  );
  const [selectedModel, setSelectedModel] = useState(() =>
    localStorage.getItem('app_model') || "gemini-3-flash-preview"
  );
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('app_hub_keys') || '{}'); }
    catch { return {}; }
  });
  const [aiConfig, setAiConfig] = useState<AIConfig & { systemPrompt: string }>(() => {
    try { return JSON.parse(localStorage.getItem('app_ai_config') || 'null') ?? defaultConfig; }
    catch { return defaultConfig; }
  });
  const [aiError, setAiError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [webLlmProgress, setWebLlmProgress] = useState("");
  const webLlmEngineRef = useRef<webllm.MLCEngine | null>(null);

  const call = useCallback(async (prompt: string) => {
    setAiError(null);
    try {
      return await callAI(prompt, {
        provider: aiProvider,
        model: selectedModel,
        keys: providerKeys,
        config: aiConfig,
        webLlmEngineRef,
        onProgress: setWebLlmProgress,
      });
    } catch (err: any) {
      setAiError(err.message);
      throw err;
    }
  }, [aiProvider, selectedModel, providerKeys, aiConfig]);

  return {
    aiProvider, setAiProvider,
    selectedModel, setSelectedModel,
    providerKeys, setProviderKeys,
    aiConfig, setAiConfig,
    aiError, isRateLimited, rateLimitCountdown,
    webLlmProgress, webLlmEngineRef,
    call, // the main entry point for all AI calls
  };
}
```

---

## Step 4 — Extract `hooks/useSuggestions.ts`

All the Firestore listeners and CRUD operations for suggestions:

```typescript
// src/hooks/useSuggestions.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Suggestion } from "../types";

export function useSuggestions(userId?: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [advice, setAdvice] = useState<any[]>([]);

  // Real-time listener (lines ~800 in App.tsx)
  useEffect(() => {
    const q = query(collection(db, "suggestions"), orderBy("votes", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items: Suggestion[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as Suggestion));
      setSuggestions(items.filter(s => !s.is_deleted && s.status !== 'system_config'));
    });
  }, []);

  const addSuggestion = useCallback(async (data: Partial<Suggestion>) => {
    return addDoc(collection(db, 'suggestions'), {
      ...data,
      created_at: new Date().toISOString()
    });
  }, []);

  const updateSuggestion = useCallback(async (id: string, data: Partial<Suggestion>) => {
    return updateDoc(doc(db, 'suggestions', id), data as any);
  }, []);

  const deleteSuggestion = useCallback(async (id: string) => {
    return updateDoc(doc(db, 'suggestions', id), { status: 'deleted', is_deleted: true });
  }, []);

  const voteSuggestion = useCallback(async (id: string, currentVotes: number) => {
    return updateDoc(doc(db, 'suggestions', id), { votes: currentVotes + 1 });
  }, []);

  return {
    suggestions, advice,
    addSuggestion, updateSuggestion, deleteSuggestion, voteSuggestion
  };
}
```

---

## Step 5 — Extract `hooks/useQuota.ts`

The quota system is self-contained — 40 lines in App.tsx, easy to pull out:

```typescript
// src/hooks/useQuota.ts
import { useState, useEffect } from "react";

export function useQuota(initial = 100) {
  const [quota, setQuota] = useState(() => {
    const saved = localStorage.getItem('app_quota');
    return saved ? parseInt(saved) : initial;
  });

  // Persist
  useEffect(() => {
    localStorage.setItem('app_quota', quota.toString());
  }, [quota]);

  // Passive recharge: 1% per minute
  useEffect(() => {
    const timer = setInterval(() => {
      setQuota(prev => Math.min(100, prev + 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const consume = (amount: number) => setQuota(prev => Math.max(0, prev - amount));
  const canAfford = (amount: number) => quota >= amount;

  return { quota, consume, canAfford };
}
```

---

## Step 6 — Extract view components

Split the 1,500-line JSX return into focused view files.

**`src/components/views/LibraryView.tsx`** — the project browser/feed/explorer grid (~400 lines from the `activeTab === 'library'` block)

**`src/components/views/IdentityView.tsx`** — the auth/profile panel (~200 lines from `activeTab === 'identity'`)

**`src/components/views/SettingsPanel.tsx`** — the AI settings, key management, provider health (~250 lines from `activeTab === 'identity'` settings section)

**`src/components/ui/SuggestionCard.tsx`** — one card in the list, extracted from the `displaySuggestions.map(...)` block

**`src/components/ui/ManifestBar.tsx`** — the bottom input bar where you type ideas

---

## Step 7 — What App.tsx becomes

After the refactor, App.tsx is ~150 lines — just wiring:

```typescript
// src/App.tsx — after refactor
import { useAuth } from "./hooks/useAuth";
import { useAI } from "./hooks/useAI";
import { useSuggestions } from "./hooks/useSuggestions";
import { useQuota } from "./hooks/useQuota";
import { LibraryView } from "./components/views/LibraryView";
import { IdentityView } from "./components/views/IdentityView";
import { GalaxyScene } from "./components/ThreeWorld";

export default function App() {
  const auth = useAuth();
  const ai = useAI();
  const suggestions = useSuggestions(auth.user?.uid);
  const quota = useQuota();

  // ~50 lines of top-level layout JSX
  // Everything else is delegated to view components
}
```

---

## The order to do this safely

Do it in this sequence — each step is independently testable before the next:

1. **`useQuota.ts`** — easiest, no dependencies, 5 minutes
2. **`useAuth.ts`** — self-contained, test login still works
3. **`services/ai.service.ts`** — pure functions, no React, test in isolation
4. **`hooks/useAI.ts`** — wraps the service, test AI calls still work
5. **`hooks/useSuggestions.ts`** — test Firestore sync still works
6. **`SuggestionCard.tsx`** — extract one card, visually verify it looks right
7. **`LibraryView.tsx`** — extract the feed/explorer block
8. **`IdentityView.tsx`** + **`SettingsPanel.tsx`** — extract auth/settings UI
9. **`App.tsx` cleanup** — remove everything that's been extracted

**Golden rule:** At each step, the app should still run. Never extract two things at once if either is untested.

---

## Bonus: wire up orbital gravity while you're in there

When you refactor `useSuggestions.ts`, add this one line to `ModuleNode` in `ThreeWorld.tsx`:

```diff
- radius: 3.5 + Math.random() * 2,
+ radius: 3.5 + (1 - (suggestion.energy || 0) / 100) * 4,
```

High-energy projects (energy = 100) orbit at radius 3.5 — closest to the sun.
Low-energy projects (energy = 0) orbit at radius 7.5 — furthest out.
This is the galaxy mechanic you described, and it's literally one line.
```
