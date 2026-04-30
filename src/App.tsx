/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronUp, 
  MessageSquare, 
  Plus, 
  X, 
  Search,
  Activity, 
  Database, 
  Zap, 
  Play, 
  Eye, 
  Code,
  Sparkles,
  Loader2,
  Users,
  Lock,
  Unlock,
  History,
  MessageCircle,
  RefreshCw,
  Info,
  Trash2,
  GitBranch,
  Box,
  Layout,
  DraftingCompass,
  LogOut, 
  ShieldCheck, 
  Key, 
  Cpu, 
  Globe,
  Settings,
  Cloud,
  Shield,
  Monitor,
  Terminal,
  User as UserIcon
} from "lucide-react";
import { User } from "firebase/auth";
import OpenAI from "openai";
import * as webllm from "@mlc-ai/web-llm";


enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null, currentAuth: any) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
      tenantId: currentAuth?.currentUser?.tenantId,
      providerInfo: currentAuth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};
import { GoogleGenAI } from "@google/genai";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  setDoc, 
  getDoc, 
  where,
  limit,
  serverTimestamp,
  Timestamp,
  getDocs
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider
} from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { 
  Suggestion, 
  Advice, 
  UserProfile, 
  SystemMessage, 
  EvolutionSnapshot, 
  ProjectConfig,
  AIConfig,
  EvolutionVersion
} from "./types";
import { EvolutionTree } from "./components/EvolutionTree";
import { ModulePlayer } from "./components/ModulePlayer";
import { EvolutiveSeed, ModuleNode, Nebula } from "./components/ThreeWorld";

// --- TYPES REMOVED (IMPORTED FROM ./types) ---

// --- INTERFACES REMOVED (IMPORTED FROM ./types) ---

// --- SOUND ENGINE REMOVED FOR SIMPLICITY ---

// --- 3D COMPONENTS ---

// --- 3D WORLD REMOVED ---

// --- MODULE PLAYER (SANDBOX) ---

// --- MODULE PLAYER REMOVED ---

// --- MAIN UI ---

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'identity' | 'evolution'>('library');
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dbFeatures, setDbFeatures] = useState<{ 
    pledged_by: boolean, 
    built_code: boolean,
    energy: boolean,
    parent_id: boolean,
    version: boolean,
    user_id: boolean
  }>({ pledged_by: true, built_code: true, energy: true, parent_id: true, version: true, user_id: true });
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [viewMode, setViewMode] = useState<'EXPLORER' | 'FEED'>('FEED');
  const [newAppType, setNewAppType] = useState<'phone' | 'desktop' | 'game' | 'terminal'>('desktop');
  const [devicePreview, setDevicePreview] = useState<'phone' | 'desktop'>('phone');
  const [isRepoOpen, setIsRepoOpen] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(1);
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isManifesting, setIsManifesting] = useState(false);
  const [manifestingStep, setManifestingStep] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [forceCloud, setForceCloud] = useState(() => {
    try {
      return localStorage.getItem('app_force_cloud') === 'true';
    } catch { return false; }
  });
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  // Expose libraries to window for ModulePlayer
  useEffect(() => {
    const w = window as any;
    w.React = React;
    w.ReactDOM = {
      createRoot: (container: HTMLElement) => (window as any).ReactDOMClient.createRoot(container),
      render: (element: any, container: HTMLElement) => {
        const root = (window as any).ReactDOMClient.createRoot(container);
        root.render(element);
      }
    };
    // Note: We need to import the client version of ReactDOM for modern React
    import('react-dom/client').then(m => {
      w.ReactDOMClient = m;
    });
    
    w.Motion = { motion, AnimatePresence };
    w.LucideReact = { 
      ChevronUp, MessageSquare, Plus, X, Search, Activity, Database, Zap, Play, Eye, Code, 
      Sparkles, Loader2, Users, Lock, Unlock, History, MessageCircle, RefreshCw, Info, 
      Trash2, GitBranch, Box, Layout, DraftingCompass, LogOut, ShieldCheck, Key, Cpu, Globe, Monitor, Terminal, CircleUser: UserIcon 
    };
    w.THREE = THREE;
  }, []);

  const [diagnostics, setDiagnostics] = useState({
    synapses: 4096,
    connectivity: 99.8,
    entropy: 0.12,
    load: 12.4
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setDiagnostics(prev => ({
        synapses: 4000 + Math.floor(Math.random() * 200),
        connectivity: 99 + Math.random(),
        entropy: Math.max(0, prev.entropy + (Math.random() - 0.5) * 0.01),
        load: 10 + Math.random() * 20
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const channelRef = useRef<any>(null);
  const isSyncing = useRef(false);

  // Identity State
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem('app_model') || "gemini-1.5-flash";
    } catch { return "gemini-1.5-flash"; }
  });
  const [aiProvider, setAiProvider] = useState<'google' | 'openai' | 'anthropic' | 'custom' | 'web-llm' | 'gemini-nano' | 'mlc-mobile'>(() => {
    try {
      return (localStorage.getItem('app_provider') as any) || "google";
    } catch { return "google"; }
  });

  useEffect(() => {
    // When provider changes, ensure the selected model is valid for that provider
    const providers: Record<string, string[]> = {
      google: ['gemini-3-flash-preview', 'gemini-3.1-pro-preview'],
      openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'],
      anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'],
      'web-llm': ['Llama-3-8B-Instruct-v0.1-q4f32_1-MLC', 'Phi-3-mini-4k-instruct-q4f16_1-MLC', 'Gemma-2b-it-q4f16_1-MLC', 'Mistral-7B-Instruct-v0.2-q4f16_1-MLC'],
      'gemini-nano': ['built-in']
    };

    if (providers[aiProvider] && !providers[aiProvider].includes(selectedModel)) {
      setSelectedModel(providers[aiProvider][0]);
    }
    localStorage.setItem('app_provider', aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    localStorage.setItem('app_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('app_force_cloud', forceCloud.toString());
  }, [forceCloud]);

  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('app_hub_keys');
      const legacy = localStorage.getItem('evolutive_energy_key');
      const initial = saved ? JSON.parse(saved) : {};
      if (legacy && !initial.google) initial.google = legacy;
      return initial;
    } catch {
      return {};
    }
  });

  const [aiConfig, setAiConfig] = useState<AIConfig & { systemPrompt: string }>(() => {
    try {
      const saved = localStorage.getItem('app_ai_config');
      return saved ? JSON.parse(saved) : {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxTokens: 4096,
        safetyThreshold: 'BLOCK_NONE',
        systemPrompt: "You are the Evolutionary Reactive Engine. Generate professional-grade, high-complexity interactive applications. Deep shadows, modern UI, responsive grids."
      };
    } catch {
      return {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxTokens: 4096,
        safetyThreshold: 'BLOCK_NONE',
        systemPrompt: "You are the Evolutionary Reactive Engine. Generate professional-grade, high-complexity interactive applications. Deep shadows, modern UI, responsive grids."
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('app_ai_config', JSON.stringify(aiConfig));
  }, [aiConfig]);

  const userApiKey = useMemo(() => providerKeys[aiProvider] || "", [providerKeys, aiProvider]);

  // Sync Profile on Auth
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'user_profiles', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setUserProfile(data);
          if (data.personal_api_key) {
             try {
                const cloudKeys = JSON.parse(data.personal_api_key);
                setProviderKeys(prev => ({ ...prev, ...cloudKeys }));
                localStorage.setItem('app_hub_keys', JSON.stringify({ ...providerKeys, ...cloudKeys }));
             } catch {
                setProviderKeys(prev => ({ ...prev, google: data.personal_api_key as string }));
                localStorage.setItem('app_hub_keys', JSON.stringify({ ...providerKeys, google: data.personal_api_key }));
             }
          }
        } else {
          await setDoc(docRef, { id: user.uid });
        }
      } catch (e) {
        console.error("Profile sync catch:", e);
      }
    };

    fetchProfile();
  }, [user]);

  const saveApiKeyToAccount = async (key: string, provider: string = aiProvider) => {
    const newKeys = { ...providerKeys, [provider]: key };
    setProviderKeys(newKeys);
    localStorage.setItem('app_hub_keys', JSON.stringify(newKeys));
    if (provider === 'google') localStorage.setItem('evolutive_energy_key', key);

    if (user) {
      try {
        await updateDoc(doc(db, 'user_profiles', user.uid), { personal_api_key: JSON.stringify(newKeys) });
      } catch (e) {
        console.error("Error syncing API key:", e);
      }
    }
  };

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // New Evolutionary States
  const [isFinalized, setIsFinalized] = useState(false);
  const [apiQuota, setApiQuota] = useState(() => {
    const saved = localStorage.getItem('app_quota');
    return saved ? parseInt(saved) : 100;
  });

  useEffect(() => {
    localStorage.setItem('app_quota', apiQuota.toString());
  }, [apiQuota]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'built' | 'pending' | 'mine'>('all');
  const [customEndpoint, setCustomEndpoint] = useState(() => {
    return localStorage.getItem('app_custom_endpoint') || "";
  });
  const [webLlmProgress, setWebLlmProgress] = useState<string>("");
  const webLlmEngineRef = useRef<webllm.MLCEngine | null>(null);

  const unwrapSuggestion = useCallback((s: Suggestion): Suggestion => {
    if (s.content && s.content.startsWith('JSON:')) {
      try {
        const meta = JSON.parse(s.content.substring(5));
        return { 
          ...s, 
          ...meta, 
          content: meta.text || s.content,
          // Ensure we don't accidentally override ID or other system fields
          id: s.id,
          user_id: s.user_id || meta.user_id,
          status: s.status || meta.status
        };
      } catch(e) {
        return s;
      }
    }
    return s;
  }, []);

  // AI Nexus Health Monitoring
  const [providerHealth, setProviderHealth] = useState<Record<string, { status: 'online' | 'offline' | 'checking' | null, ping: number | null, tokens: string | null }>>({});

  const checkHealth = async (provider: string) => {
    setProviderHealth(prev => ({ ...prev, [provider]: { ...prev[provider], status: 'checking' } }));
    const startTime = Date.now();
    try {
      let isOnline = false;
      let tokens: string | null = null;
      const key = providerKeys[provider] || (provider === 'google' ? process.env.GEMINI_API_KEY : null);

      if (provider === 'google') {
        if (!key) throw new Error("No key");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (res.ok) isOnline = true;
      } else if (provider === 'openai') {
        if (!key) throw new Error("No Key");
        const client = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
        await client.models.list();
        isOnline = true;
      } else if (provider === 'web-llm') {
        const w = window as any;
        isOnline = !!w.navigator.gpu;
      } else if (provider === 'gemini-nano') {
        const w = window as any;
        isOnline = !!(w.ai && w.ai.assistant);
      } else if (provider === 'custom') {
        const res = await fetch(customEndpoint + "/models", { mode: 'no-cors' });
        isOnline = true;
      } else {
        isOnline = true;
      }

      const ping = Date.now() - startTime;
      setProviderHealth(prev => ({ 
        ...prev, 
        [provider]: { status: 'online', ping, tokens: tokens || "Available" } 
      }));
    } catch (e) {
      setProviderHealth(prev => ({ 
        ...prev, 
        [provider]: { status: 'offline', ping: null, tokens: null } 
      }));
    }
  };

  useEffect(() => {
    localStorage.setItem('app_model', selectedModel);
    localStorage.setItem('app_provider', aiProvider);
    localStorage.setItem('app_custom_endpoint', customEndpoint);
  }, [selectedModel, aiProvider, customEndpoint]);

  // Derive ghosts from presence
  // Derive ghosts from presence
  const ghosts = useMemo(() => {
    return Object.entries(presenceData)
      .filter(([id]) => id !== user?.uid)
      .flatMap(([_, instances]) => Object.values(instances))
      .filter((p: any) => p.x !== undefined && p.y !== undefined);
  }, [presenceData, user]);

  const appRank = useMemo(() => {
    if (!user?.uid) return { title: "Guest", color: "#ffffff", level: 0 };
    const myCreations = suggestions.filter(s => s.user_id === user.uid);
    const builds = myCreations.filter(s => s.status === 'built').length;
    const totalVotes = myCreations.reduce((acc, curr) => acc + (curr.votes || 0), 0);
    
    if (builds >= 5) return { title: "Grand Architect", color: "#6366f1", level: 4 };
    if (builds >= 2) return { title: "Senior Builder", color: "#ec4899", level: 3 };
    if (totalVotes >= 10) return { title: "Idea Master", color: "#f59e0b", level: 2 };
    if (myCreations.length >= 1) return { title: "Junior Builder", color: "#10b981", level: 1 };
    return { title: "New Member", color: "#94a3b8", level: 0 };
  }, [suggestions, user]);

  // Cloud Fallback Helper - Uses server-side proxy for security
  const callGeminiCloud = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("/api/neural-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt,
          model: "gemini-3.1-pro-preview" 
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If server fallback fails because of mission key or invalid key, attempt user key fallback
        if (data.error === "SYSTEM_KEY_MISSING" || data.error === "NEURAL_NODE_ERROR" || [400, 401, 403].includes(response.status)) {
          const userGoogleKey = providerKeys['google'];
          if (userGoogleKey) {
            console.log("Cloud link restricted, switching to user neural key...");
            const ai = new GoogleGenAI({ apiKey: userGoogleKey });
            const result = await ai.models.generateContent({
              model: "gemini-3.1-pro-preview",
              contents: prompt
            });
            return result.text;
          }
          
          if (data.error === "SYSTEM_KEY_MISSING") {
             throw new Error("System Cloud Key missing. Enable the Neural Hub and provide a Google API Key.");
          }
          throw new Error(data.message || "Neural link denied. Check your API Hub credentials.");
        }
        throw new Error(data.message || "Unknown neural link protocol error.");
      }

      return data.text;
    } catch (err: any) {
      console.error("Cloud Fallback Failure:", err);
      throw new Error(`Cloud neural link failed: ${err.message}`);
    }
  };

  // Unified AI Bridge
  const callUnifiedAI = async (prompt: string, force = forceCloud): Promise<string> => {
    if (force) {
      return await callGeminiCloud(prompt);
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        const activeKey = providerKeys[aiProvider] || "";
        const googleKey = process.env.GEMINI_API_KEY || providerKeys['google'];
        
        // Offline / Specialized Mobile Handlers
        if (aiProvider === 'gemini-nano') {
          try {
            const w = window as any;
            if (!w.ai || !w.ai.assistant) {
              throw new Error("Gemini Nano not detected.");
            }
            const aiSession = await w.ai.assistant.create();
            const result = await aiSession.prompt(prompt);
            return result;
          } catch (err) {
            console.warn("Gemini Nano failed, falling back to Cloud:", err);
            return await callGeminiCloud(prompt);
          }
        }

        if (aiProvider === 'web-llm') {
          try {
            if (!webLlmEngineRef.current) {
              const w = window as any;
              if (!w.navigator.gpu) {
                throw new Error("WebGPU is not supported or enabled in this browser. Local AI requires WebGPU.");
              }
              setWebLlmProgress("Wakeing AI Engine...");
              const engine = new webllm.MLCEngine();
              engine.setInitProgressCallback((report) => setWebLlmProgress(report.text));
              await engine.reload(selectedModel || "Llama-3-8B-Instruct-v0.1-q4f32_1-MLC");
              webLlmEngineRef.current = engine;
            }
            const response = await webLlmEngineRef.current.chat.completions.create({
              messages: [{ role: "user", content: prompt }]
            });
            return response.choices[0].message.content || "";
          } catch (err: any) {
            console.warn("Web-LLM failure:", err);
            setWebLlmProgress("");
            if (err.message?.includes("WebGPU")) throw err;
            return await callGeminiCloud(prompt);
          }
        }

        if (aiProvider === 'mlc-mobile') {
          const client = new OpenAI({
            apiKey: "no-key",
            baseURL: customEndpoint || "http://localhost:8080/v1",
            dangerouslyAllowBrowser: true,
          });
          const response = await client.chat.completions.create({
            model: selectedModel || "main",
            messages: [{ role: "user", content: prompt }],
          });
          return response.choices[0].message.content || "";
        }

        if (!googleKey && aiProvider === 'google') throw new Error("No Google API Key Found.");
        if (!activeKey && (aiProvider === 'openai' || aiProvider === 'anthropic' || aiProvider === 'custom')) {
           if (aiProvider !== 'custom') throw new Error(`No ${aiProvider.toUpperCase()} Key Found.`);
        }

        if (aiProvider === 'google') {
          const ai = new GoogleGenAI({ apiKey: googleKey || "" });
          let modelId = selectedModel;
          if (!modelId.startsWith('gemini-')) modelId = "gemini-3-flash-preview"; 
          
          try {
            const response = await ai.models.generateContent({
              model: modelId,
              contents: prompt,
              config: {
                temperature: aiConfig.temperature,
                topP: aiConfig.topP,
                topK: aiConfig.topK,
                maxOutputTokens: aiConfig.maxTokens,
              }
            });

            const text = response.text;
            if (!text) throw new Error("The AI Engine returned an empty response.");
            setIsRateLimited(false);
            setRateLimitCountdown(0);
            return text;
          } catch (err: any) {
            // Check for rate limit error (429)
            if (err?.message?.includes('429') || err?.status === 429) {
              if (retryCount < maxRetries) {
                retryCount++;
                const waitTime = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                setIsRateLimited(true);
                setRateLimitCountdown(Math.ceil(waitTime / 1000));
                
                // Countdown timer for UI
                const timer = setInterval(() => {
                  setRateLimitCountdown(prev => Math.max(0, prev - 1));
                }, 1000);
                
                await sleep(waitTime);
                clearInterval(timer);
                continue; // Retry while loop
              }
            }
            throw err;
          }
        }

        if (aiProvider === 'openai' || aiProvider === 'custom') {
          const isDeepInfra = activeKey.startsWith('nvapi-') || activeKey.startsWith('NVAPI-');
          const isMistralDirect = activeKey.startsWith('mistral-') || activeKey.toLowerCase().includes('mistral');
          
          const client = new OpenAI({
            apiKey: activeKey,
            baseURL: isDeepInfra ? "https://api.deepinfra.com/v1" : 
                     (isMistralDirect && !customEndpoint ? "https://api.mistral.ai/v1" : 
                     (aiProvider === 'custom' ? customEndpoint : undefined)),
            dangerouslyAllowBrowser: true,
          });

          const response = await client.chat.completions.create({
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: aiConfig.temperature,
            top_p: aiConfig.topP,
            max_tokens: aiConfig.maxTokens,
          });
          return response.choices[0].message.content || "";
        }

        if (aiProvider === 'anthropic') {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": activeKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
              "anthropic-dangerous-direct-browser-access": "true"
            },
            body: JSON.stringify({
              model: selectedModel,
              max_tokens: 4096,
              messages: [{ role: "user", content: prompt }]
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message);
          return data.content[0].text;
        }

        throw new Error("AI Provider Disconnected.");
      } catch (err: any) {
        const msg = err.message || String(err);
        if (msg.includes('connection error') || msg.includes('Failed to fetch')) {
          throw new Error(`[${aiProvider}] Connection failed. If using mobile local AI, ensure the bridge app is active. Otherwise check your internet.`);
        }
        throw err;
      }
    }
    throw new Error("Failed to reach AI after multiple attempts.");
  };

  // Gemini AI Provider (Legacy/Internal)
  const getAI = (customKey?: string) => {
    // Defensive check for process.env in browser environments
    const envKey = typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY as string) : undefined;
    const key = customKey || providerKeys['google'] || envKey;
    if (!key) throw new Error("No Energy Source Found. Connect Identity or Provide Key.");
    return null; // Legacy helper no longer used
  };

  // Auth Session Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProviderKeys({});
        localStorage.removeItem('app_nexus_keys');
        localStorage.removeItem('evolutive_energy_key');
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const [initStatus, setInitStatus] = useState<string>("Connecting to System Network...");

  // Initial fetch and Project setup
  useEffect(() => {
    let mounted = true;
    
    setInitStatus("Synchronizing Registry...");

    // Real-time suggestions listener
    const qSuggestions = query(collection(db, "suggestions"), orderBy("votes", "desc"));
    // Initialization timeout
    const initTimeout = setTimeout(() => {
      if (isInitializing) {
        console.warn("Initialization taking too long, forcing start...");
        setIsInitializing(false);
      }
    }, 5000);

    const unsubSuggestions = onSnapshot(qSuggestions, (snapshot) => {
      const newSuggestions: Suggestion[] = [];
      let foundConfig = false;
      snapshot.forEach(docSnap => {
        const s = { id: docSnap.id, ...docSnap.data() } as Suggestion;
        if (s.status === 'system_config') {
          foundConfig = true;
          try {
            const config = JSON.parse(s.content || "{}") as ProjectConfig;
            setIsFinalized(!!config.is_finalized);
            setCreatorId(config.creator_id || "");
          } catch(e) {}
        } else {
          newSuggestions.push(unwrapSuggestion(s));
        }
      });

      // If no config found and user is logged in, create one
      if (!foundConfig && user?.uid && mounted) {
        const config: ProjectConfig = {
          creator_id: user.uid,
          is_finalized: false,
          project_name: "Initial Phase"
        };
        addDoc(collection(db, "suggestions"), {
          content: JSON.stringify(config),
          status: 'system_config',
          user_id: user.uid,
          created_at: new Date().toISOString()
        });
      }

      setSuggestions(newSuggestions);
      setInitStatus("System Link Established.");
      setIsInitializing(false);
      clearTimeout(initTimeout);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setInitStatus("Sync Interrupted. Retrying Link...");
      clearTimeout(initTimeout);
      setIsInitializing(false); // Force through on error
    });

    // Real-time messages listener
    const qMessages = query(collection(db, "system_messages"), orderBy("createdAt", "desc"), limit(20));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const messages: SystemMessage[] = [];
      snapshot.forEach(docSnap => messages.push({ id: docSnap.id, ...docSnap.data() } as SystemMessage));
      setSystemMessages(messages.slice(0, 10));
    });

    // Real-time advice listener
    const qAdvice = query(collection(db, "advice"), orderBy("created_at", "asc"));
    const unsubAdvice = onSnapshot(qAdvice, (snapshot) => {
      const newAdvice: Advice[] = [];
      snapshot.forEach(docSnap => newAdvice.push({ id: docSnap.id, ...docSnap.data() } as Advice));
      setAdvice(newAdvice);
    });

    // Presence simulation
    const interval = setInterval(() => {
      setSystemMessages(prev => prev.filter(e => Date.now() - e.createdAt < 15000));
    }, 5000);

    return () => {
      mounted = false;
      unsubSuggestions();
      unsubMessages();
      unsubAdvice();
      clearInterval(interval);
    };
  }, [user?.uid]);

  const handleToggleFinalize = async () => {
    if (!user || user.uid !== creatorId) return;
    const newFinalized = !isFinalized;
    
    try {
      const q = query(collection(db, "suggestions"), where("status", "==", "system_config"), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, "suggestions", snap.docs[0].id);
        const config = JSON.parse(snap.docs[0].data().content || "{}") as ProjectConfig;
        config.is_finalized = newFinalized;
        await updateDoc(docRef, { content: JSON.stringify(config) });
      }
    } catch(e) {
      console.error("Finalize error:", e);
    }
  };

  const displaySuggestions = useMemo(() => {
    return suggestions
      .filter(s => s.status !== 'system_config' && s.status !== 'deleted' && !s.is_deleted)
      .filter(s => {
        // Search Filter
        let title = s.content;
        if (s.content.startsWith('JSON:')) {
          try {
            const parsed = JSON.parse(s.content.substring(5));
            title = parsed.text || "Untitled Idea";
          } catch(e) {
            title = s.content.substring(5).substring(0, 50);
          }
        }
        
        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Category Filter
        let matchesCategory = true;
        if (filterType === 'built') matchesCategory = s.status === 'built';
        if (filterType === 'pending') matchesCategory = s.status === 'pending';
        if (filterType === 'mine') matchesCategory = s.user_id === user?.uid;
        
        return matchesSearch && matchesCategory;
      });
  }, [suggestions, searchQuery, filterType, user]);

  const neuralStatus = useMemo(() => {
    if (webLlmProgress && (webLlmProgress.includes('Loading') || webLlmProgress.includes('fetching'))) {
      const match = webLlmProgress.match(/\[(\d+)\/(\d+)\]/);
      if (match) return `SYNCING NEURAL PATHS (${match[1]}/${match[2]})`;
      return "INITIALIZING LOCAL AI";
    }
    if (isRateLimited) return `RATE LIMITED (${rateLimitCountdown}s)`;
    if (isManifesting) return "MANIFESTING";
    if (isBuilding) return "SYNTHESIZING";
    if (isRefining) return "REFINING";
    if (isLoading) return "EXTRACTING";
    return "IDLE";
  }, [webLlmProgress, isRateLimited, rateLimitCountdown, isManifesting, isBuilding, isRefining, isLoading]);

  const handleRefine = async (suggestion: Suggestion, refinementPrompt: string) => {
    if (!refinementPrompt.trim() || isRefining) return;
    setIsRefining(suggestion.id);
    
    try {
      const prompt = `
        System: You are the Evolutionary Reactive Engine.
        Original Request: "${suggestion.content}"
        Refinement Request: "${refinementPrompt}"
        Original Code: ${suggestion.built_code}
        
        Task: Modify the original code based on the new feedback.
        Complexity Level: Professional / High Complexity.
        Available Libraries:
        - window.React (Standard hooks: useState, useEffect, etc. are available. DO NOT import React.)
        - window.Motion (Framer Motion: use "motion" and "AnimatePresence" directly from global scope. DO NOT redeclare them.)
        - window.Recharts (Standard charts available: LineChart, BarChart, AreaChart, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer.)
        - window.lucide (React Icons: Use standard components like <Zap />, <Activity />, <Check />, etc. They are pre-imported into your scope.)

        Design Guidance:
        - Return ONLY the function body for a component named "App".
        - Use Tailwind CSS for 100% of styling.
        - Ensure all icons used are valid Lucide icons.

        Design Guidance:
        - Create professional, polished UI patterns (dashboards, landing pages, interactive labs).
        - Use clean typography, responsive layouts, and modern hover states.
        - Implement robust internal state if the request implies complex tracking.
        - Ensure the app feels "complete" and high-end.

        Constraints:
        - Output ONLY the modified component code.
        - The component must be named "App".
        - Use Tailwind CSS.
        - Return ONLY the code block, no markdown formatting.
      `;

      if (apiQuota < 10) {
        alert("Build Capacity too low for update. Wait for recharge.");
        setIsRefining(null);
        return;
      }
      const text = await callUnifiedAI(prompt);
      const generatedCode = text.replace(/```jsx|```tsx|```javascript|```/g, '').trim();

      if (!generatedCode) {
        throw new Error("The system returned an empty application structure. Try refining your request.");
      }

      // Create a new version of the app
      const insertData: any = { 
        content: `Improved version of: ${suggestion.content} (${refinementPrompt})`,
        app_type: suggestion.app_type || 'desktop',
        status: 'built',
        votes: 0,
        energy: 100,
        user_id: user?.uid || null,
        built_code: generatedCode,
        parent_id: suggestion.id,
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'suggestions'), insertData);
      setApiQuota(prev => Math.max(0, prev - 10));
    } catch (err) {
      console.error("Refinement failed:", err);
    } finally {
      setIsRefining(null);
    }
  };

  const postAdvice = async (suggestionId: string, content: string) => {
    if (!content.trim() || !user) return;
    try {
      await addDoc(collection(db, 'advice'), {
        suggestion_id: suggestionId,
        user_id: user.uid,
        user_email: user.email,
        content: content,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("Advice failed:", err);
    }
  };

  const isCreator = !!user?.uid && (user.uid === creatorId || !creatorId || creatorId === "");
  const canSuggest = isFinalized || isCreator;
  const canInteract = isFinalized || isCreator;
  
  // Debug logging for permissions
  useEffect(() => {
    if (user?.uid) {
      console.log("Current Identity:", user.uid, "Creator Identity:", creatorId, "isCreator:", isCreator);
    }
  }, [user, creatorId, isCreator]);
  
  // Passive Quota Recharge
  useEffect(() => {
    const timer = setInterval(() => {
      setApiQuota(prev => {
        if (prev >= 100) return 100;
        return Math.min(100, prev + 1);
      });
    }, 60000); // 1% per minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.uid) {
       setFilterType('mine');
    }
  }, [user]);

  // fetchSuggestions is no longer needed as onSnapshot handles real-time updates.

  const handleEmailAuth = async () => {
    setAuthError(null);
    setIsLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error("Auth Exception:", err);
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubAuth = async () => {
    setIsLoading(true);
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("GitHub Auth Error:", err);
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggest = async () => {
    if (!input.trim()) return;
    if (apiQuota < 5) {
      alert("Build Capacity depleted. Wait for the system to recharge.");
      return;
    }

    const rawInput = input.trim();
    setInput("");
    setIsBuilding("MANIFESTING");
    setIsManifesting(true);
    
    try {
      const prompt = `Refine this app idea into a clear, concise one-sentence description. Keep it technical and direct.
        Original: "${rawInput}"
        Refined:`;

      let content = rawInput;
      try {
        const text = await callUnifiedAI(prompt);
        content = text.trim() || rawInput;
      } catch (aiErr) {
        console.warn("System Refinement Link failed (Connection error?). Resting on raw intent.", aiErr);
        // We use the raw input if the AI refinement fails to prevent blocking the user
      }

      const insertData: any = { 
        content,
        app_type: newAppType,
        status: 'pending',
        votes: 0,
        energy: 0,
        user_id: user?.uid || null,
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'suggestions'), insertData);
      setApiQuota(prev => Math.max(0, prev - 5));
    } catch (err: any) {
      console.error("Error planting intent:", err);
      alert(`System Link Failure: ${err.message}`);
    } finally {
      setIsBuilding(null);
    }
  };

  const handleVote = async (id: string, currentVotes: number) => {
    try {
      await updateDoc(doc(db, 'suggestions', id), { votes: (currentVotes || 0) + 1 });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `suggestions/${id}`, auth);
    }
  };

  const handleTestNeuralLink = async () => {
    if (isTestingAI) return;
    setIsTestingAI(true);
    setTestResponse(null);
    try {
      const response = await callUnifiedAI("Respond with: 'Neural Link Active. Ready for evolution.' and nothing else.");
      setTestResponse(response);
      // Auto-clear success message after 8 seconds
      setTimeout(() => setTestResponse(prev => prev === response ? null : prev), 8000);
    } catch (err: any) {
      setTestResponse(`LINK ERROR: ${err.message}`);
    } finally {
      setIsTestingAI(false);
    }
  };

  const handlePledge = async (s: Suggestion) => {
    setIsManifesting(true);
    const key = userApiKey || (isCreator ? process.env.GEMINI_API_KEY : null);
    if (!user || !key) {
      if (!key && !userApiKey) {
        alert("Please set your API Key in the Account tab to power builds.");
        setActiveTab('identity');
      }
      setIsManifesting(false);
      return;
    }
    if (isRefining) return;
    
    const pledgedBy = s.pledged_by || [];
    const currentEnergy = s.energy || 0;

    const hasPledged = pledgedBy.includes(user.uid);
    const newEnergy = Math.min(100, currentEnergy + (isCreator ? 100 : 25));
    const shouldBuild = newEnergy >= 100;

    try {
      setIsRefining(s.id);
      const newPledgedBy = hasPledged ? pledgedBy : [...pledgedBy, user.uid];
      
      let builtCode = s.built_code;
      let newStatus = s.status;

      if (shouldBuild && s.status === 'pending') {
        const typeContext = s.app_type === 'phone' ? 'optimized for a mobile device (portrait)' : 
                            s.app_type === 'game' ? 'a high-performance interactive game' : 
                            s.app_type === 'terminal' ? 'a command-line style utility' : 'a desktop web application';
        
        const prompt = `Create a functional, professional React component titled "App" for this idea: ${s.content}. 
        The application is ${typeContext}.
        Use Tailwind CSS. Return ONLY the code, no markdown wrappers. Include animations using framer-motion (window.Motion). 
        Assume you have access to: window.React, window.Motion, window.Recharts, window.d3, window.confetti, window.lucide (React icons).`;
        
        const result = await callUnifiedAI(prompt);
        builtCode = result.replace(/```jsx|```tsx|```javascript|```/g, '').trim();
        newStatus = 'built';
      }

      const updateData: any = { 
        status: newStatus,
        energy: newEnergy,
        pledged_by: newPledgedBy,
        built_code: builtCode || ""
      };
      
      await updateDoc(doc(db, 'suggestions', s.id), updateData);
      
      if (shouldBuild) {
        setApiQuota(prev => Math.max(0, prev - 10));
        const updatedS = { ...s, status: 'built' as const, built_code: builtCode };
        setCurrentSuggestion(updatedS);
      }
    } catch (err: any) {
      console.error("Error during build cycle:", err);
      alert(`The system bridge flickered: ${err.message}`);
    } finally {
      setIsRefining(null);
      setIsManifesting(false);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    setIsLoading(true);
    try {
      const target = suggestions.find(s => s.id === id);
      if (target && target.user_id && user?.uid && target.user_id !== user.uid && !isCreator) {
        throw new Error("Ownership validation failed. You are not the creator of this module.");
      }

      await updateDoc(doc(db, 'suggestions', id), { status: 'deleted', is_deleted: true });
      if (currentSuggestion?.id === id) setCurrentSuggestion(null);
    } catch (err: any) {
      console.error("Deletion Error:", err);
      alert(err.message || "Access Denied.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user) return;
    
    const newMessage: any = {
      userId: user.uid,
      text: messageInput.trim(),
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      createdAt: Date.now()
    };

    addDoc(collection(db, 'system_messages'), newMessage);
    setMessageInput("");
  };

  const initiateNewProject = async () => {
    const promptValue = prompt("What do you want to build in this new Evolutionary Workspace?");
    if (!promptValue) return;

    try {
      setIsBuilding("new");
      
      const newSuggestion = {
        content: promptValue,
        app_type: newAppType,
        votes: 1,
        energy: 10,
        status: 'pending',
        user_id: user?.uid || null,
        built_code: "",
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'suggestions'), newSuggestion);
      const data = { id: docRef.id, ...newSuggestion } as Suggestion;
      
      setCurrentSuggestion(data); // OPEN IMMEDIATELY
      await buildEvolution(data);
      
    } catch (err: any) {
      console.error("Initiation Error:", err);
      alert("AI Bridge failed to initiate: " + err.message);
    } finally {
      setIsBuilding(null);
    }
  };

  const buildEvolution = async (suggestion: Suggestion) => {
    if (isBuilding && isBuilding !== suggestion.id) return;
    
    try {
      setIsBuilding(suggestion.id);
      
      const prompt = `
        System: ${aiConfig.systemPrompt}
        Target Archetype: ${suggestion.app_type?.toUpperCase() || 'DESKTOP'}
        
        Task: Create a beautiful, polished, and functionally complex React application for: "${suggestion.content}"
        
        Archetype Guidelines:
        - If DESKTOP: Design for wide viewports, use dashboard grids, sidebars, and comprehensive layouts.
        - If PHONE: Design for touch-first interaction, bottom navigation, and vertical stacking.
        - If GAME: Focus on high-interactivity, canvas or motion-heavy layers, and game state loops.
        - If TERMINAL: Use a technical, mono-spaced command interface with log outputs and technical telemetry.
        
        Capabilities & Libraries:
        - React 18 (Hooks are available in the local scope: useState, useEffect, useMemo, etc. DO NOT declare these.)
        - Tailwind CSS (Full utility suite)
        - window.Motion (Framer Motion: use "motion" and "AnimatePresence" directly from scope. DO NOT redeclare them.)
        - window.Recharts (Standard charts available in scope: LineChart, BarChart, ResponsiveContainer, etc. DO NOT redeclare them.)
        - window.d3 (d3 available in scope.)
        - window.confetti (confetti available in scope.)
        - window.LucideReact (Standard icons available via the <Icon name="..." /> helper component which is pre-defined.)

        Design Style:
        - Modern SaaS / Technical Lab aesthetic.
        - Deep shadows, modern UI, responsive grids.
        - Interactive elements with feedback (hover transitions, active scales).
        - Multi-section layouts (e.g. Header, Sidebar, Dashboard Grid) if appropriate.

        Complexity Requirements:
        - Do not build "hello world" versions. Build "production-ready" pages.
        - If data is involved, include realistic mock data sets.
        - Use sophisticated state management for internal transitions.

        Constraints:
        - Output ONLY the component code. No markdown formatting.
        - The component MUST be exported as "export default function App() { ... }".
        - Use Tailwind CSS for all styling.
        - CRITICAL: Do NOT include ANY import statements.
        - CRITICAL: Do NOT redeclare or extract hooks/libraries from globals (e.g., do NOT do "const { useState } = React;").
        - Assume useState, useEffect, useMemo, useRef, motion, etc., are ALREADY present in the global scope.
        - For icons, always use the pre-mapped global components (e.g. <Zap />) or the <Icon name="IconName" /> helper.
        - The container should be transparent or dark.
        - Return ONLY the raw code.
      `;

      if (apiQuota < 20) {
        alert("Build capacity too low for building. Wait for recharge.");
        setIsBuilding(null);
        return;
      }
      const steps = [
        "Initializing Neural Engine...",
        "Analysing prompt architecture...",
        "Conceptualizing UI patterns...",
        "Synthesizing component logic...",
        "Hardening structural layers...",
        "Finalizing environment bridge..."
      ];
      
      let stepIdx = 0;
      setManifestingStep(steps[0]);
      setIsManifesting(true);
      
      const stepInterval = setInterval(() => {
        stepIdx = Math.min(stepIdx + 1, steps.length - 1);
        setManifestingStep(steps[stepIdx]);
      }, 2000);

      try {
        const text = await callUnifiedAI(prompt);
        clearInterval(stepInterval);
        
        const match = text.match(/```(?:javascript|typescript|tsx|jsx)?\s?([\s\S]*?)```/);
        let generatedCode = (match ? match[1] : text)
          .replace(/```[a-z]*\n?/gi, '')
          .replace(/```/g, '')
          .trim();

        if (!generatedCode) {
          throw new Error("The system returned no code. Build failed.");
        }

        await updateDoc(doc(db, 'suggestions', suggestion.id), {
          status: 'built',
          built_code: generatedCode
        });

        setApiQuota(prev => Math.max(0, prev - 15));
        const updatedSuggestion = { ...suggestion, status: 'built' as const, built_code: generatedCode };
        setCurrentSuggestion(updatedSuggestion);
      } finally {
        clearInterval(stepInterval);
        setIsManifesting(false);
      }

    } catch (err: any) {
      console.error("Generation failure:", err);
      alert(`App build failed: ${err.message}`);
    } finally {
      setIsBuilding(null);
      setIsManifesting(false);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#020205] text-white selection:bg-indigo-500/30 overflow-hidden font-sans">
      <AnimatePresence>
        {isInitializing && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[200] bg-[#020208] flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-64 h-64 border-2 border-indigo-500/10 rounded-full flex items-center justify-center"
              >
                <div className="w-2 h-2 bg-indigo-500 rounded-full blur-[4px]" />
              </motion.div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <motion.div 
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-white font-black text-[12px] tracking-[15px] uppercase ml-[15px]"
                  >
                   Engine
                 </motion.div>
                 <div className="text-[9px] text-white/20 font-mono tracking-widest mt-2 uppercase">REBIRTH_ IN_ PROGRESS</div>
              </div>
            </div>
            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={() => setIsInitializing(false)}
              className="mt-20 px-8 py-3 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[5px] rounded-full hover:bg-indigo-400 transition-all shadow-[0_0_30px_rgba(99,102,241,0.5)]"
            >
              Enter Interface
            </motion.button>
          </motion.div>
        )}

        {isManifesting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-[#050510]/95 backdrop-blur-[120px] flex flex-col items-center justify-center p-10 overflow-hidden"
          >
            {/* Neural Background Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2)_0%,transparent_70%)] animate-pulse" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay" />
            </div>

            <div className="max-w-md w-full text-center space-y-16 relative z-10">
              <div className="relative">
                <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 12, ease: "easeInOut" }}
                    className="absolute h-full bg-gradient-to-r from-indigo-500 via-pink-500 to-indigo-500"
                  />
                </div>
                {/* Micro-sparkles along the progress bar */}
                <motion.div 
                  animate={{ x: ["0%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 w-20 h-full bg-white/40 blur-[4px]"
                />
              </div>

              <div className="space-y-6">
                <motion.h2 
                  animate={{ letterSpacing: ["15px", "22px", "15px"] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-2xl md:text-3xl font-black uppercase tracking-[20px] text-white ml-[20px]"
                >
                  Manifesting
                </motion.h2>
                
                <div className="flex flex-col gap-3">
                   <p className="text-[11px] text-indigo-400 font-mono uppercase tracking-[6px] animate-pulse">
                     {manifestingStep}
                   </p>
                   <div className="flex justify-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: [4, 12, 4], opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                          className="w-1 bg-white/30 rounded-full"
                        />
                      ))}
                   </div>
                   <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest mt-4">Structural integrity: {(diagnostics.connectivity).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- BACKGROUND BLOBS & GLOW --- */}
      <div className="bg-gradient-to-br from-indigo-500/5 to-transparent absolute inset-0 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-900/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      
      {/* --- HUD LAYER --- */}
      {!currentSuggestion && (
        <div className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-md group hover:border-indigo-500/30 transition-colors">
               <Activity className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="hidden md:flex flex-col">
              <h1 className="text-[10px] font-black uppercase tracking-[4px] text-white/50">Engine_Manifest</h1>
              <div className="flex items-center gap-3 mt-0.5">
                 <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${neuralStatus !== 'IDLE' ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">{neuralStatus}</span>
                 </div>
                 
                 <div className="h-2 w-[1px] bg-white/5" />
                 
                 <div className="flex items-center gap-1.5 text-[8px] font-mono text-indigo-400/60 uppercase tracking-widest group cursor-help">
                    <Users className="w-3 h-3 opacity-50" />
                    <span className="group-hover:text-white transition-colors">{activeUsersCount} </span>
                 </div>
                 
                 <div className="h-2 w-[1px] bg-white/5" />
                 
                 <div className="flex items-center gap-1.5 text-[8px] font-mono text-green-500/40 uppercase tracking-widest">
                    <Database className="w-3 h-3 opacity-50" />
                    <span>SYNCED</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            {isCreator && (
              <button 
                onClick={handleToggleFinalize}
                className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-all backdrop-blur-md shadow-lg group ${
                  isFinalized ? 'bg-green-500/5 border-green-500/20 text-green-500/60 hover:bg-green-500/10' : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-500/60 hover:bg-yellow-500/10'
                }`}
              >
                {isFinalized ? <Unlock className="w-3 h-3 group-hover:rotate-12 transition-transform" /> : <Lock className="w-3 h-3 group-hover:-rotate-12 transition-transform" />}
                <span className="text-[9px] font-black uppercase tracking-widest">{isFinalized ? "COLLECTIVE" : "CREATOR MODE"}</span>
              </button>
            )}

            <button 
              onClick={() => setIsRepoOpen(true)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 text-white/40 hover:text-white hover:bg-white/10 hover:border-indigo-500/50 transition-all group backdrop-blur-md shadow-lg"
            >
              <Database className="w-3 h-3 text-indigo-400 group-hover:scale-125 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">Builds</span>
            </button>

            {neuralStatus !== 'IDLE' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center gap-3 backdrop-blur-md"
              >
                 <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                 <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{neuralStatus}</span>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* --- SYSTEM MESSAGES --- */}
      <AnimatePresence>
        {systemMessages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: -50 }}
            exit={{ opacity: 0, scale: 1.5, y: -100 }}
            className="fixed z-50 pointer-events-none"
            style={{ left: msg.x, top: msg.y }}
          >
            <div className="bg-indigo-900/40 border-2 border-indigo-400 backdrop-blur-md px-5 py-3 rounded-none shadow-[4px_4px_0px_#818cf8]">
              <span className="text-[12px] font-black text-white tracking-[2px] uppercase">{msg.text}</span>
              <div className="text-[9px] text-indigo-300 font-bold uppercase mt-1 border-t border-indigo-500/30 pt-1">Msg. Sent</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* --- SPIRIT TRAILS LAYER --- */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {Object.entries(presenceData).map(([key, presences]) => {
          const presence = (presences as any)[0];
          if (!presence?.x || presence.userId === user?.uid) return null;
          return (
            <motion.div
              key={key}
              animate={{ x: presence.x, y: presence.y }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="absolute w-4 h-4"
            >
              <div className="w-full h-full bg-indigo-500 rounded-full blur-[8px] opacity-30 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* --- CONTENT LAYER --- */}

      {/* --- REPO SIDEBAR --- */}
      <AnimatePresence>
        {isRepoOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRepoOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[400px] bg-[#050510]/95 backdrop-blur-2xl border-l border-white/10 z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-[12px] font-black uppercase tracking-[4px]">Archives</h2>
                </div>
                <button 
                  onClick={() => setIsRepoOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar space-y-4">
                {displaySuggestions.filter(s => s.status === 'built').length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center text-center opacity-20">
                    <History className="w-10 h-10 mb-4" />
                    <p className="text-[10px] uppercase font-black tracking-widest leading-loose">No builds<br/>yet recorded in this epoch.</p>
                  </div>
                )}
                {displaySuggestions
                  .filter(s => s.status === 'built')
                  .sort((a, b) => b.id.localeCompare(a.id))
                  .map((s) => {
                    let title = s.content;
                    if (s.content.startsWith('JSON:')) {
                      try { title = JSON.parse(s.content.substring(5)).text; } catch(e) {}
                    }
                    return (
                      <motion.div 
                        key={s.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-6 py-8 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-indigo-500/30 transition-all group flex flex-col gap-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-indigo-400/60 font-bold">NODE_{s.id}</span>
                          <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Built</span>
                        </div>
                        <h3 className="text-[13px] font-bold text-white/90 leading-relaxed italic line-clamp-2">"{title}"</h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (s.built_code) {
                                setCurrentSuggestion(s as any);
                                setIsRepoOpen(false);
                              }
                            }}
                            className="flex-1 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform flex items-center justify-center gap-2"
                          >
                            <Play className="w-3 h-3" /> Execute
                          </button>
                          <button 
                            onClick={() => {
                              if (s.built_code) {
                                // Just a preview of the prompt/id
                                console.log(s);
                              }
                            }}
                            className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                }
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* The Canvas uses shadows and a high-fov for immersion. THREE.Clock warnings may trigger from internal fiber init. */}
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 10], fov: 75 }} 
        className="cursor-grab active:cursor-grabbing"
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#6366f1" />
        <EvolutiveSeed onClick={() => setIsOpen(true)} isOpen={isOpen} />
        <Nebula />
        
        {/* Global App Nodes */}
        {suggestions
          .filter(s => s.status === 'built' && s.built_code)
          .map(s => (
            <ModuleNode 
              key={s.id} 
              suggestion={s} 
              onRun={(suggestion) => setCurrentSuggestion(suggestion)} 
            />
          ))
        }

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
      </Canvas>

      {/* --- HUD: UPDATE INPUT --- */}
      {!isOpen && !currentSuggestion && (
        <div className="absolute bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 z-20 w-[90%] sm:w-[320px]">
          <form onSubmit={sendMessage} className="relative group">
            <input 
              type="text"
              placeholder="Post a thought..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 px-6 py-3 rounded-full text-[10px] text-white/60 focus:text-white focus:border-indigo-500/50 focus:bg-white/10 outline-none text-center backdrop-blur-md transition-all placeholder:text-white/20 font-black uppercase tracking-[2px]"
            />
            <div className="absolute -inset-0.5 bg-indigo-500/10 rounded-full blur group-hover:bg-indigo-500/20 transition-all -z-10" />
            <button type="submit" className="hidden" />
          </form>
        </div>
      )}

      {/* --- SYSTEM INTERFACE (THE LIBRARY) --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-0 m-auto w-full h-full md:w-[90vw] md:h-[85vh] bg-[#050510]/95 backdrop-blur-2xl border-none md:border-2 md:border-white/10 flex flex-col z-50 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden rounded-none md:rounded-none"
          >
            {/* Dashboard Panel */}
            <div className="flex flex-col md:flex-row border-b border-white/10 p-4 md:p-6 shrink-0 bg-white/5 items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 w-full md:w-auto">
                    <div className="flex gap-6 md:gap-12 overflow-x-auto w-full md:w-auto px-2 md:px-0 no-scrollbar">
                  {['library', 'evolution', 'identity'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`text-[10px] md:text-[12px] font-black uppercase tracking-[3px] md:tracking-[6px] transition-all relative py-2 whitespace-nowrap ${activeTab === tab ? 'text-white' : 'text-white/20'}`}
                    >
                      {tab === 'library' ? 'Hub' : tab === 'evolution' ? 'Evolution' : 'Account'}
                      {activeTab === tab && <motion.div layoutId="tab" className="absolute -bottom-1 left-0 w-full h-[2px] md:h-[3px] bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-500" />}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-center">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 bg-white/5 rounded-full border border-white/10">
                    <div className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${isFinalized ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-[8px] md:text-[10px] font-black text-white/60 tracking-widest uppercase">
                      {isFinalized ? 'COMMUNITY' : 'CREATOR'}
                    </span>
                  </div>

                  {/* API Quota Tracking */}
                  <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2 bg-white/5 rounded-full border border-white/10 group/quota relative">
                    <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full overflow-hidden bg-white/10 relative">
                      <motion.div 
                        className="absolute bottom-0 left-0 w-full bg-indigo-500" 
                        initial={{ height: "100%" }}
                        animate={{ height: `${apiQuota}%` }}
                      />
                    </div>
                    <span className="text-[8px] md:text-[10px] font-black text-white/40 tracking-widest uppercase">
                      BUILD CAPACITY <span className="text-white/80">{apiQuota}%</span>
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 md:static hover:rotate-90 transition-transform p-2"><X className="w-5 md:w-6 h-5 md:h-6 text-white/40" /></button>
            </div>

            {/* Suggestions Root - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-black/40 custom-scrollbar">
              {activeTab === 'library' ? (
                <div className="max-w-6xl mx-auto p-6">
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-between">
                    <div className="relative w-full max-w-sm group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Search the library..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 text-[11px] text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all uppercase tracking-widest font-black"
                      />
                    </div>
                    
                    <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/10 shrink-0">
                      <button 
                        onClick={() => setViewMode('FEED')}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${viewMode === 'FEED' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        title="Discovery Feed"
                      >
                        <Layout className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setViewMode('EXPLORER')}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${viewMode === 'EXPLORER' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        title="Table View"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/10 shrink-0">
                      {(['all', 'built', 'pending', 'mine'] as const).map((type) => (
                        <button 
                          key={type}
                          onClick={() => setFilterType(type as any)}
                          className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-white/40 hover:text-white'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Explorer Header */}
                  <div className="hidden md:grid grid-cols-[1fr_120px_100px_160px] gap-4 px-6 py-3 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-4">
                    <div className="flex items-center gap-2"><Box className="w-3 h-3" /> Idea / Application</div>
                    <div className="text-center">Complexity</div>
                    <div className="text-center">Status</div>
                    <div className="text-right">Operations</div>
                  </div>

                  {viewMode === 'EXPLORER' ? (
                    <>
                      {/* Explorer Header */}
                      <div className="hidden md:grid grid-cols-[1fr_120px_100px_160px] gap-4 px-6 py-3 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-4">
                        <div className="flex items-center gap-2"><Box className="w-3 h-3" /> Idea / Application</div>
                        <div className="text-center">Complexity</div>
                        <div className="text-center">Status</div>
                        <div className="text-right">Operations</div>
                      </div>

                      <div className="flex flex-col gap-3">
                      {displaySuggestions.length === 0 && (
                        <div className="py-12 md:py-20 text-center border-2 border-dashed border-white/5 rounded-[1.5rem] md:rounded-[2rem]">
                          <p className="text-white/20 italic tracking-widest text-[10px] md:text-xs uppercase px-6">The global library is currently empty. Awaiting an idea...</p>
                        </div>
                      )}
                      {displaySuggestions.map((s, idx) => {
                        const isApp = s.status === 'built';
                        const isCreator = s.user_id && user?.uid && s.user_id === user.uid;

                        return (
                          <motion.div 
                            key={s.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="group relative"
                          >
                            <div className="flex flex-col md:grid md:grid-cols-[1fr_120px_100px_160px] gap-4 items-stretch md:items-center p-4 md:px-6 md:py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all cursor-default">
                              {/* Main Info */}
                              <div className="flex items-start gap-3 md:gap-4 overflow-hidden">
                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${isApp ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/40 shadow-inner'}`}>
                                  {isApp ? <Layout className="w-4 h-4 md:w-5 md:h-5" /> : <DraftingCompass className="w-4 h-4 md:w-5 md:h-5" />}
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <h3 className="text-white font-bold text-xs md:text-sm truncate group-hover:text-indigo-300 transition-colors">
                                    {s.content}
                                  </h3>
                                  <div className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-widest mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className={isApp ? 'text-indigo-500' : ''}>#{s.id}</span> 
                                    <span className="hidden md:inline w-1 h-1 rounded-full bg-white/10" />
                                    <span>{isApp ? `VERSION V${s.version || 1}` : 'PROPOSAL DRAFT'}</span>
                                    <span className="hidden md:inline w-1 h-1 rounded-full bg-white/10" />
                                    <span className={`uppercase ${s.app_type === 'phone' ? 'text-pink-400' : s.app_type === 'game' ? 'text-green-400' : 'text-white/40'}`}>
                                      {s.app_type || 'desktop'}
                                    </span>
                                    {(s.pledged_by || []).length > 0 && (
                                      <>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <span className="flex items-center gap-1 text-yellow-500/50"><Zap className="w-2 md:w-2.5 h-2 md:h-2.5 fill-current" /> SUPPORTED</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Data Column: Stats */}
                              <div className="flex flex-col items-center md:items-center gap-1">
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${s.energy || 0}%` }}
                                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                  />
                                </div>
                                <span className="text-[7px] md:text-[9px] font-mono text-white/40 tracking-tighter uppercase whitespace-nowrap">
                                  {s.votes || 0} Votes / {s.energy || 0}% Power
                                </span>
                              </div>

                              {/* Data Column: Status */}
                              <div className="flex justify-start md:justify-center">
                                <div className={`px-2 py-0.5 md:py-1 rounded text-[7px] md:text-[8px] font-black uppercase tracking-widest border ${
                                  isApp 
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                                  : 'bg-white/5 text-white/30 border-white/10'
                                }`}>
                                  {s.status.toUpperCase()}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end gap-2 md:pr-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                                {isApp ? (
                                  <>
                                    <button onClick={() => setCurrentSuggestion(s)} className="flex-1 md:flex-none p-2 md:p-2.5 rounded-lg bg-white text-black hover:scale-105 md:hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 group/launch" title="Launch App">
                                      <Play className="w-3.5 md:w-4 h-3.5 md:h-4 fill-current group-hover/launch:animate-pulse" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Execute</span>
                                    </button>
                                  </>
                                ) : (
                                  s.status === 'pending' && (
                                    <>
                                      {!isCreator && (
                                        <button 
                                          onClick={() => handleVote(s.id, s.votes)}
                                          className="flex-1 md:flex-none p-2 md:p-2.5 rounded-lg border border-white/10 text-white/40 hover:border-white hover:text-white transition-all hover:bg-white/5 flex items-center justify-center gap-2"
                                          title="Upvote"
                                        >
                                          <ChevronUp className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                          <span className="text-[9px] font-black uppercase tracking-widest">Vote</span>
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => handlePledge(s)}
                                        disabled={!!isRefining || !!isBuilding || (!isCreator && !userApiKey)}
                                        className={`flex-1 md:flex-none p-2 md:p-2.5 rounded-lg border flex items-center justify-center transition-all gap-2 relative overflow-hidden group/pledge ${
                                          isCreator 
                                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 border-indigo-500 text-white hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                                          : 'bg-white/5 border-white/10 text-yellow-500/50 hover:bg-indigo-500 hover:text-white hover:border-indigo-500'
                                        }`}
                                        title={isCreator ? "Manifest Module" : "Manifest with Your Power"}
                                      >
                                        {(isRefining === s.id || isBuilding === s.id) ? (
                                          <Loader2 className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin" />
                                        ) : isCreator ? (
                                          <Zap className="w-3.5 md:w-4 h-3.5 md:h-4 fill-current animate-pulse text-yellow-400" />
                                        ) : (
                                          <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                        )}
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                          {isRefining === s.id || isBuilding === s.id ? 'Manifesting...' : isCreator ? 'MANIFEST NOW' : 'Power-Up'}
                                        </span>
                                      </button>
                                    </>
                                  )
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       {displaySuggestions.map((s, idx) => (
                         <motion.div 
                           key={s.id}
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           transition={{ delay: idx * 0.1 }}
                           className="group aspect-[4/5] bg-gradient-to-b from-white/10 to-white/5 rounded-[2rem] border border-white/10 overflow-hidden relative flex flex-col hover:border-indigo-500/50 transition-all cursor-pointer shadow-2xl"
                           onClick={() => s.status === 'built' && setCurrentSuggestion(s)}
                         >
                            {/* App Preview Mock/Visual */}
                            <div className="flex-1 bg-black/40 flex items-center justify-center relative overflow-hidden">
                               <div className="absolute inset-0 opacity-20 pointer-events-none">
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.2),transparent_70%)]" />
                               </div>
                               {s.app_type === 'phone' ? (
                                 <div className="w-1/2 aspect-[9/19] rounded-[2rem] border-4 border-white/20 bg-white/5 flex flex-col items-center justify-center gap-2 p-4 animate-pulse">
                                    <div className="w-full h-1 bg-white/10 rounded-full" />
                                    <div className="flex-1 w-full bg-white/5 rounded-lg" />
                                 </div>
                               ) : s.app_type === 'game' ? (
                                 <Activity className="w-16 h-16 text-indigo-400/20" />
                               ) : (
                                 <Layout className="w-16 h-16 text-indigo-400/20" />
                               )}
                               
                               <div className="absolute top-6 left-6 flex items-center gap-2">
                                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10 transition-all ${s.status === 'built' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40'}`}>
                                     {s.status}
                                  </div>
                                  <div className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10 bg-black/50 text-white/70">
                                     {s.app_type || 'desktop'}
                                  </div>
                               </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-8 bg-gradient-to-t from-black to-transparent space-y-4">
                               <h3 className="text-lg font-black text-white uppercase leading-tight tracking-tight line-clamp-2">{s.content}</h3>
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${s.user_id || s.id}`} alt="User" />
                                     </div>
                                     <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">@{s.user_id?.slice(0, 6) || 'anonymous'}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="flex items-center gap-1.5 text-indigo-400">
                                        <Zap className="w-3 h-3 fill-current" />
                                        <span className="text-[10px] font-black">{s.energy || 0}%</span>
                                     </div>
                                     <div className="flex items-center gap-1.5 text-white/40">
                                        <ChevronUp className="w-3 h-3" />
                                        <span className="text-[10px] font-black">{s.votes || 0}</span>
                                     </div>
                                  </div>
                               </div>
                               
                               {s.status === 'pending' && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handlePledge(s); }}
                                   className="w-full py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[4px] hover:bg-indigo-400 transition-all shadow-lg active:scale-95"
                                 >
                                   Fuel Manifestation
                                 </button>
                               )}
                            </div>
                         </motion.div>
                       ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'evolution' ? (
                <EvolutionTree 
                  suggestions={suggestions} 
                  onSelect={(s) => {
                    console.log("Selected evolution node:", s);
                    setCurrentSuggestion(s);
                  }} 
                />
              ) : (
                <div className="w-full space-y-12 py-20">
                  {!user ? (
                    <div className="max-w-md mx-auto space-y-12">
                      <div className="text-center space-y-10">
                      <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(99,102,241,0.3)]">
                        <UserIcon className="w-10 h-10 text-white" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black uppercase tracking-[10px] text-white">Account</h3>
                        <p className="text-[11px] text-white/40 leading-relaxed uppercase tracking-widest px-10">
                          Sign in to save and share your ideas.
                        </p>
                      </div>

                      {/* Email Auth Form - Circular Buttons/Inputs */}
                      <div className="space-y-4 px-2">
                        <input 
                          type="email"
                          placeholder="Email Address"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-5 rounded-full text-[11px] text-white focus:border-indigo-500/50 outline-none text-center"
                        />
                        <input 
                          type="password"
                          placeholder="Password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-5 rounded-full text-[11px] text-white focus:border-indigo-500/50 outline-none text-center"
                        />
                        {authError && <p className="text-[9px] text-pink-500 uppercase font-black tracking-widest">{authError}</p>}
                        
                        <button 
                          onClick={handleEmailAuth}
                          className="w-full py-5 bg-white text-black text-[11px] font-black uppercase tracking-[4px] rounded-full hover:bg-indigo-300 transition-all shadow-xl"
                        >
                          {isSignUp ? "Create Account" : "Log In"}
                        </button>

                        <button 
                          onClick={handleGoogleAuth}
                          className="w-full py-5 bg-[#4285F4] text-white text-[11px] font-black uppercase tracking-[4px] rounded-full hover:bg-[#357abd] transition-all shadow-xl flex items-center justify-center gap-3"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Continue with Google
                        </button>

                        <button 
                          onClick={handleGithubAuth}
                          className="w-full py-5 bg-[#333] text-white text-[11px] font-black uppercase tracking-[4px] rounded-full hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 border border-white/10"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.11.825-.26.825-.58 0-.285-.015-1.23-.015-2.23-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .32.225.7.825.58C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/>
                          </svg>
                          Continue with GitHub
                        </button>

                        <button 
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-[10px] text-white/30 hover:text-indigo-400 uppercase tracking-widest font-black transition-colors"
                        >
                          {isSignUp ? "Already have an account?" : "Need an account?"}
                        </button>
                      </div>

                          <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                            <div className="relative flex justify-center"><span className="bg-[#050510] px-4 text-[10px] text-white/20 uppercase tracking-[4px] font-black">Authorized Providers</span></div>
                        </div>

                        <button 
                          onClick={handleGithubAuth}
                          className="w-full px-6 py-5 bg-gradient-to-r from-gray-800 to-black text-white text-[11px] font-black uppercase tracking-[4px] rounded-full hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-30 border border-white/10"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.11.825-.26.825-.58 0-.285-.015-1.23-.015-2.23-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .32.225.7.825.58C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/>
                          </svg>
                          Connect GitHub Hub
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10 py-12 max-w-[1400px] mx-auto px-6 lg:px-12">
                      {/* --- DASHBOARD HEADER & IDENTITY --- */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        
                        {/* Profile Identity Card */}
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="lg:col-span-5 bg-gradient-to-br from-[#0a0a25] via-[#050510] to-[#010105] p-10 lg:p-14 rounded-[4rem] border border-white/5 relative overflow-hidden group flex flex-col justify-between shadow-[0_50px_100px_rgba(0,0,0,0.6)]"
                        >
                          <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] group-hover:bg-indigo-500/20 transition-all duration-700" />
                          
                          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 relative z-10">
                            <div className="relative shrink-0">
                              <div className="w-32 h-32 lg:w-44 lg:h-44 rounded-[3.5rem] overflow-hidden border-4 border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.2)] bg-black rotate-[-3deg] group-hover:rotate-0 transition-transform duration-700">
                                <img 
                                  src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`} 
                                  alt="Profile Avatar"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                className="absolute -inset-10 border border-dashed border-indigo-500/5 rounded-full"
                              />
                            </div>

                            <div className="text-center lg:text-left space-y-4 pt-4">
                              <div className="space-y-1">
                                <h3 className="text-3xl lg:text-5xl font-black uppercase tracking-[15px] lg:tracking-[25px] text-white leading-none">
                                  {user.email?.split('@')[0]}
                                </h3>
                                <p className="text-indigo-400 font-mono text-[9px] uppercase tracking-[6px] opacity-40">Neural Node: {user.uid.substring(0, 16).toUpperCase()}</p>
                              </div>
                              
                              <div className="inline-flex items-center gap-4 bg-white/5 px-6 py-2 rounded-2xl border border-white/5 backdrop-blur-md">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                <span className="text-[10px] font-black uppercase tracking-[5px] text-white/60">Node_Online</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-16 lg:mt-24 space-y-8 relative z-10 border-t border-white/5 pt-10">
                            <div className="flex items-center justify-between">
                               <div className="space-y-1">
                                 <div className="text-[11px] font-black uppercase tracking-[5px] text-indigo-400">{appRank.title}</div>
                                 <div className="text-[8px] text-white/20 uppercase tracking-[3px] font-bold">Evolution Level {appRank.level}/5</div>
                               </div>
                               <div className="flex gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                                  {[...Array(5)].map((_, i) => (
                                    <div 
                                      key={i} 
                                      className={`w-2.5 h-2.5 rounded-full transition-all duration-1000 ${i < appRank.level ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)]' : 'bg-white/5'}`} 
                                    />
                                  ))}
                               </div>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${(appRank.level / 5) * 100}%` }}
                                 className="h-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                               />
                            </div>
                          </div>
                        </motion.div>

                        {/* Stats Bento Grid */}
                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8 content-start">
                          {[
                            { label: 'Neural Ideas', icon: History, color: 'indigo', val: suggestions.filter(s => s.user_id === user.uid).length, desc: 'Conceptual blueprints generated', bg: 'from-blue-600/20 to-indigo-600/20' },
                            { label: 'Master Builds', icon: Box, color: 'pink', val: suggestions.filter(s => s.user_id === user.uid && s.status === 'built').length, desc: 'Manifested applications', bg: 'from-pink-600/20 to-purple-600/20' },
                            { label: 'Core Energy', icon: Zap, color: 'yellow', val: suggestions.filter(s => s.user_id === user.uid).reduce((acc, curr) => acc + (curr.votes || 0), 0), desc: 'Network contribution credits', bg: 'from-yellow-600/20 to-orange-600/20', span: 'sm:col-span-2' }
                          ].map((stat, i) => (
                            <motion.div 
                              key={i}
                              whileHover={{ y: -8, scale: 1.01 }}
                              className={`p-10 bg-gradient-to-br from-[#0a0a20] to-black border border-white/5 rounded-[3.5rem] group transition-all relative overflow-hidden flex flex-col justify-between hover:border-white/10 hover:shadow-[0_40px_80px_rgba(0,0,0,0.6)] ${stat.span || ''}`}
                            >
                              <div className={`absolute -top-10 -right-10 p-12 bg-gradient-to-br ${stat.bg} rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity`} />
                              
                              <div className="flex items-center justify-between mb-10 relative z-10">
                                <div className="p-4 rounded-2xl bg-white/5 text-white/50 border border-white/5 group-hover:text-white group-hover:border-white/20 transition-all">
                                  <stat.icon className="w-5 h-5" />
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-[5px] text-white/20 group-hover:text-white/40 transition-colors">Stat_Unit_{i+1}</div>
                              </div>
                              
                              <div className="relative z-10 space-y-1">
                                <div className="text-6xl lg:text-7xl text-white font-black tracking-tighter leading-none mb-4">
                                  {stat.val}
                                </div>
                                <div className="text-[13px] text-white/40 uppercase tracking-[6px] font-black group-hover:text-white transition-colors">{stat.label}</div>
                                <div className="text-[9px] text-white/15 uppercase tracking-widest font-bold mt-1 max-w-[200px]">{stat.desc}</div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                      {/* --- LOWER TECH SECTION --- */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                         
                        {/* Diagnostics Module */}
                        <div className="lg:col-span-7 bg-[#050510] border border-white/5 p-10 lg:p-12 rounded-[4rem] relative overflow-hidden group">
                          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6 border-b border-white/5 pb-8">
                             <div className="space-y-1">
                                <h4 className="text-[12px] font-black uppercase tracking-[12px] text-indigo-400">Neural Infrastructure</h4>
                                <p className="text-[9px] text-white/20 uppercase tracking-[4px] font-mono">Consensus: v4.2.8-beta-stable</p>
                             </div>
                             <div className="flex items-center gap-4 px-6 py-2.5 bg-black/40 rounded-2xl border border-indigo-500/10">
                                <motion.div 
                                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.1, 1] }} 
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]" 
                                />
                                <span className="text-[11px] text-green-500 font-black tracking-[4px] uppercase">Nexus_Linked</span>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                            {[
                              { label: 'Synapses', icon: Database, val: diagnostics.synapses },
                              { label: 'Quantum', icon: Globe, val: `${diagnostics.connectivity.toFixed(1)}%` },
                              { label: 'Entropy', icon: Activity, val: diagnostics.entropy.toFixed(3) },
                              { label: 'Load', icon: Cpu, val: `${diagnostics.load.toFixed(1)}%` }
                            ].map((item, i) => (
                              <div key={i} className="space-y-3 group/item">
                                <div className="flex items-center gap-3 text-white/10 group/item:text-indigo-400/40 transition-colors">
                                  <item.icon className="w-3.5 h-3.5" />
                                  <span className="text-[9px] uppercase font-bold tracking-[3px]">{item.label}</span>
                                </div>
                                <div className="text-3xl font-mono text-white tracking-[1px] group-hover/item:translate-x-1 transition-transform">{item.val}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Hub Settings Module */}
                        <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 p-10 lg:p-12 rounded-[4rem] flex flex-col justify-between">
                           <div className="space-y-8 mb-12">
                             <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <h4 className="text-[11px] font-black uppercase tracking-[8px] text-white">Neural Hub Settings</h4>
                                  <p className="text-[8px] text-white/30 uppercase tracking-[4px] font-medium">Regional_Bridge_v.1.0.4</p>
                                </div>
                                <Settings className="w-5 h-5 text-white/20" />
                             </div>
                             
                             <div className="space-y-6">
                               <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                  <div className="flex items-center gap-4">
                                     <div className="p-3 bg-indigo-500/10 rounded-xl">
                                        <Cloud className="w-4 h-4 text-indigo-400" />
                                     </div>
                                     <div className="space-y-0.5">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/80">Processing Priority</div>
                                        <div className="text-[8px] text-white/30 tracking-widest uppercase">Cloud Compute Allocation</div>
                                     </div>
                                  </div>
                                  <div className="flex bg-black/60 rounded-full p-1 border border-white/5">
                                    <button 
                                      onClick={() => setForceCloud(false)}
                                      className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                                        !forceCloud ? 'bg-indigo-500 text-white shadow-xl' : 'text-white/40 hover:text-white'
                                      }`}
                                    >
                                      LOCAL
                                    </button>
                                    <button 
                                      onClick={() => setForceCloud(true)}
                                      className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                                        forceCloud ? 'bg-indigo-500 text-white shadow-xl' : 'text-white/40 hover:text-white'
                                      }`}
                                    >
                                      CLOUD
                                    </button>
                                  </div>
                               </div>

                               <div className="p-6 bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/10 flex items-center justify-between group cursor-pointer hover:bg-indigo-500/10 transition-all">
                                  <div className="flex items-center gap-5">
                                     <div className="w-12 h-12 bg-black/40 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Shield className="w-5 h-5" />
                                     </div>
                                     <div className="space-y-1">
                                        <div className="text-[11px] font-black uppercase tracking-[4px] text-white">Quantum Encryption</div>
                                        <div className="text-[8px] text-indigo-400/60 font-mono">STATUS: AES-256_ACTIVE</div>
                                     </div>
                                  </div>
                                  <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform" />
                               </div>
                             </div>
                           </div>

                           <button 
                             onClick={() => auth.signOut()}
                             className="w-full py-4 bg-red-500/5 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-[10px] text-red-500/60 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-xl"
                           >
                             Terminate_Session
                           </button>
                        </div>

                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Individual Provider Identity Page */}
                        <div className="lg:col-span-12 bg-white/[0.03] p-4 md:p-10 rounded-[4rem] border border-white/5 space-y-10 text-left backdrop-blur-sm relative overflow-hidden">
                          {/* Decorative element */}
                          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent hidden md:block" />
                          
                          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-8 gap-6">
                            <div className="space-y-1">
                              <h4 className="text-[12px] font-black uppercase tracking-[8px] text-white">Neural Orchestrator</h4>
                              <p className="text-[8px] text-white/30 uppercase tracking-[4px] font-medium">Cluster Config: {aiProvider}</p>
                            </div>
                            <div className="flex flex-wrap gap-3 items-center justify-center md:justify-end">
                              <div className="flex gap-2 p-1.5 bg-black/40 rounded-full border border-white/5">
                                {(['google', 'openai', 'anthropic', 'custom', 'web-llm', 'gemini-nano', 'mlc-mobile'] as const).map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => setAiProvider(p)}
                                    className={`w-5 h-5 rounded-full transition-all flex items-center justify-center relative ${aiProvider === p ? 'bg-indigo-500 ring-2 ring-indigo-500/20 scale-110 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
                                    title={p.toUpperCase()}
                                  >
                                    {providerHealth[p]?.status === 'online' && (
                                       <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-black" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <motion.div 
                            key={aiProvider}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-10"
                          >
                          <div className="flex items-start justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-[6px] text-white">{aiProvider.replace('-', ' ')}</h2>
                                {aiProvider === 'google' && <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[7px] font-black uppercase tracking-widest border border-indigo-500/20 rounded-full">Primary</span>}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                                  providerHealth[aiProvider]?.status === 'online' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                  providerHealth[aiProvider]?.status === 'offline' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                                  providerHealth[aiProvider]?.status === 'checking' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                  'bg-white/5 text-white/20 border-white/5'
                                }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    providerHealth[aiProvider]?.status === 'online' ? 'bg-green-400 animate-pulse' : 
                                    providerHealth[aiProvider]?.status === 'offline' ? 'bg-pink-400' : 
                                    providerHealth[aiProvider]?.status === 'checking' ? 'bg-yellow-400 animate-spin' : 'bg-white/20'
                                  }`} />
                                  {providerHealth[aiProvider]?.status || 'Idle'}
                                </div>
                                {providerHealth[aiProvider]?.ping && (
                                  <span className="text-[9px] font-mono text-white/40 tracking-tighter">{providerHealth[aiProvider].ping}ms link latency</span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => checkHealth(aiProvider)}
                              disabled={providerHealth[aiProvider]?.status === 'checking'}
                              className="p-4 rounded-[1.5rem] bg-white/5 border border-white/10 text-white/40 hover:bg-white hover:text-black hover:border-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 group"
                              title="Nexus Sync Check"
                            >
                              <Activity className={`w-5 h-5 group-hover:scale-110 transition-transform ${providerHealth[aiProvider]?.status === 'checking' ? 'animate-spin' : ''}`} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 space-y-4 group text-center md:text-left">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-[3px] text-white/40 group-focus-within:text-indigo-400 transition-colors">
                                  {aiProvider === 'web-llm' || aiProvider === 'gemini-nano' ? 'Hardware Engine' : 'Energy Secret'}
                                </label>
                                <Lock className="w-3 h-3 text-white/10" />
                              </div>
                              
                              {aiProvider === 'web-llm' || aiProvider === 'gemini-nano' ? (
                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">On-Device Mode</span>
                                  </div>
                                  <p className="text-[8px] text-white/40 leading-relaxed uppercase tracking-widest">
                                    {aiProvider === 'web-llm' ? 'Utilizing WebGPU for local execution. No API keys required.' : 'Utilizing Chrome Built-in AI. Ensure optimization-guide-on-device-model is enabled.'}
                                  </p>
                                </div>
                              ) : (
                                <div className="relative">
                                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-indigo-400 transition-colors" />
                                  <input 
                                    type="password" 
                                    placeholder={aiProvider === 'google' ? "ENTER GOOGLE API KEY (REQUIRED FOR EXTERNAL HOSTING)" : "Identity Token Required"}
                                    value={userApiKey}
                                    onChange={(e) => saveApiKeyToAccount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[11px] text-white outline-none focus:border-indigo-500/30 transition-all font-mono"
                                  />
                                </div>
                              )}

                              {aiProvider === 'google' && !process.env.GEMINI_API_KEY && !userApiKey && (
                                <p className="mt-2 text-[8px] text-pink-500/60 font-black uppercase tracking-widest text-center">
                                  System key not detected. Provide your own key to manifest ideas.
                                </p>
                              )}

                              {!(aiProvider === 'web-llm' || aiProvider === 'gemini-nano') && (
                                <button 
                                  onClick={() => saveApiKeyToAccount(userApiKey)}
                                  className="w-full py-3 bg-white/5 hover:bg-white hover:text-black text-[8px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                                >
                                  Synchronize Key
                                </button>
                              )}
                              <button 
                                onClick={handleTestNeuralLink}
                                disabled={isTestingAI}
                                className={`w-full py-4 mt-6 flex items-center justify-center gap-3 rounded-2xl border transition-all font-black uppercase tracking-[3px] text-[10px] ${
                                  isTestingAI ? 'bg-white/5 border-white/5 text-white/20 animate-pulse' : 'bg-indigo-500 text-white border-indigo-600 hover:bg-indigo-600 hover:scale-[1.02] active:scale-95 shadow-[0_10px_20px_rgba(79,70,229,0.3)]'
                                }`}
                              >
                                {isTestingAI ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Testing Neural Link...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4" />
                                    <span>Initiate Neural Test</span>
                                  </>
                                )}
                              </button>

                              <div className="pt-6 border-t border-white/5 mt-6">
                                <div className="flex items-center justify-between mb-4">
                                  <label className="text-[9px] font-black uppercase tracking-[3px] text-white/40">Default Evolution Archetype</label>
                                  <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border border-white/5 bg-white/5 text-white/40`}>
                                    {newAppType}
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                   {(['phone', 'desktop', 'game', 'terminal'] as const).map(type => (
                                      <button 
                                        key={type}
                                        onClick={() => setNewAppType(type)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${newAppType === type ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-white/20 hover:border-white/10'}`}
                                      >
                                        {type === 'phone' && <Layout className="w-3.5 h-3.5" />}
                                        {type === 'desktop' && <Monitor className="w-3.5 h-3.5" />}
                                        {type === 'game' && <Sparkles className="w-3.5 h-3.5" />}
                                        {type === 'terminal' && <Terminal className="w-3.5 h-3.5" />}
                                        <span className="text-[7px] font-black uppercase tracking-tighter">{type}</span>
                                      </button>
                                   ))}
                                </div>
                              </div>

                              {testResponse && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`mt-4 p-4 rounded-xl border font-mono text-[9px] uppercase tracking-wider leading-relaxed ${
                                    testResponse.includes('ERROR') ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-2 opacity-50">
                                    <Info className="w-3 h-3" />
                                    <span>Neural Response:</span>
                                    <button 
                                      onClick={() => setTestResponse(null)}
                                      className="ml-auto hover:text-white"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {testResponse}
                                </motion.div>
                              )}
                            </div>

                            <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 space-y-4 group text-center md:text-left">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-[3px] text-white/40 group-focus-within:text-pink-400 transition-colors">Evolution Model</label>
                                <Cpu className="w-3 h-3 text-white/10" />
                              </div>
                              <div className="relative">
                                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-pink-400 transition-colors" />
                                <select 
                                  value={selectedModel}
                                  onChange={(e) => setSelectedModel(e.target.value)}
                                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[11px] text-white outline-none focus:border-pink-500/30 transition-all appearance-none uppercase font-black"
                                >
                                  {aiProvider === 'google' && (
                                    <>
                                      <option value="gemini-3-flash-preview">Gemini 3 Flash (Swift)</option>
                                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep)</option>
                                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
                                    </>
                                  )}
                                  {aiProvider === 'openai' && (
                                    <>
                                      <option value="gpt-4o">GPT-4 Omni (Prime)</option>
                                      <option value="gpt-4o-mini">GPT-4o Mini (Efficiency)</option>
                                      <option value="o1-preview">OpenAI o1 Reasoning</option>
                                    </>
                                  )}
                                  {aiProvider === 'anthropic' && (
                                    <>
                                      <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                                    </>
                                  )}
                                  {aiProvider === 'custom' || aiProvider === 'mlc-mobile' || aiProvider === 'web-llm' || aiProvider === 'gemini-nano' ? (
                                     <option value={selectedModel}>{selectedModel.toUpperCase()}</option>
                                  ) : null}
                                </select>
                              </div>
                              <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center md:justify-start">
                                {(aiProvider === 'google' ? ['gemini-3-flash-preview', 'gemini-3.1-pro-preview'] : 
                                  aiProvider === 'openai' ? ['gpt-4o', 'o1-mini'] :
                                  aiProvider === 'anthropic' ? ['claude-3-5-sonnet-20240620'] :
                                  aiProvider === 'custom' ? ['llama3', 'mistral', 'phi3'] : []).map(m => (
                                  <button 
                                    key={m} 
                                    onClick={() => setSelectedModel(m)}
                                    className={`px-2 py-1 rounded-md text-[7px] font-black border transition-all ${selectedModel === m ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-white/5 text-white/30 border-white/5 hover:border-white/20'}`}
                                  >
                                    {m.split('-')[0].toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {(aiProvider === 'custom' || aiProvider === 'mlc-mobile') && (
                            <div className="bg-black/20 p-6 rounded-[2rem] border border-yellow-500/10 space-y-3 text-center md:text-left">
                              <label className="text-[9px] font-black uppercase tracking-[3px] text-white/40 block">Network Anchor (Endpoint URL)</label>
                              <div className="relative group">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-yellow-400 transition-colors" />
                                <input 
                                  type="text"
                                  value={customEndpoint}
                                  onChange={(e) => setCustomEndpoint(e.target.value)}
                                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 px-4 text-[11px] text-white outline-none focus:border-yellow-500/50 transition-all font-mono"
                                  placeholder={aiProvider === 'custom' ? "http://localhost:11434/v1" : "http://手机IP:8080/v1"}
                                />
                              </div>
                            </div>
                          )}

                          <div className="bg-black/20 p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                                  <DraftingCompass className="w-4 h-4" />
                                </div>
                                <label className="text-[10px] font-black uppercase tracking-[3px] text-white/60">Advanced Parameters</label>
                              </div>
                              <span className="text-[10px] font-mono text-white/20">STUDIO CONTROLS</span>
                            </div>

                            <div className="space-y-4">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">AI Directive (System Prompt)</span>
                                <span className="text-[8px] font-mono text-white/20 italic">Global System Instructions</span>
                              </div>
                              <textarea 
                                value={aiConfig.systemPrompt}
                                onChange={(e) => setAiConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-[11px] text-white/80 outline-none focus:border-orange-500/50 transition-all font-mono no-scrollbar resize-none"
                                placeholder="Set the core identity and rules for projects..."
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                              <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Temperature</span>
                                  <span className="text-[10px] font-mono text-orange-400">{aiConfig.temperature.toFixed(2)}</span>
                                </div>
                                <input 
                                  type="range" min="0" max="2" step="0.05"
                                  value={aiConfig.temperature}
                                  onChange={(e) => setAiConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                  className="w-full accent-orange-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[8px] text-white/20 font-black uppercase">
                                  <span>Precise</span>
                                  <span>Creative</span>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Max Tokens</span>
                                  <span className="text-[10px] font-mono text-indigo-400">{aiConfig.maxTokens}</span>
                                </div>
                                <input 
                                  type="range" min="128" max="128000" step="128"
                                  value={aiConfig.maxTokens}
                                  onChange={(e) => setAiConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                                  className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                              </div>

                              <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Top P</span>
                                  <span className="text-[10px] font-mono text-pink-400">{aiConfig.topP.toFixed(2)}</span>
                                </div>
                                <input 
                                  type="range" min="0" max="1" step="0.01"
                                  value={aiConfig.topP}
                                  onChange={(e) => setAiConfig(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
                                  className="w-full accent-pink-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                              </div>

                              <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Safety Filters</span>
                                  <span className="text-[10px] font-mono text-green-400">{aiConfig.safetyThreshold.replace('BLOCK_', '')}</span>
                                </div>
                                <select 
                                  value={aiConfig.safetyThreshold}
                                  onChange={(e) => setAiConfig(prev => ({ ...prev, safetyThreshold: e.target.value as any }))}
                                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-4 text-[10px] text-white/60 outline-none focus:border-green-500/30 transition-all uppercase font-black"
                                >
                                  <option value="BLOCK_NONE">Block None</option>
                                  <option value="BLOCK_LOW_AND_ABOVE">Low & Above</option>
                                  <option value="BLOCK_MEDIUM_AND_ABOVE">Medium & Above</option>
                                  <option value="BLOCK_ONLY_HIGH">High Only</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between px-2">
                            <div className="space-y-2">
                               <span className="text-[8px] text-white/20 uppercase tracking-[3px] font-black">Cognitive Footprint</span>
                               <div className="flex gap-1.5">
                                 {[...Array(5)].map((_, i) => (
                                   <div key={i} className={`w-4 md:w-6 h-1 rounded-full transition-all duration-700 ${i < (aiProvider === 'google' || aiProvider === 'openai' ? 2 : aiProvider === 'web-llm' ? 5 : 3) ? 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]' : 'bg-white/5'}`} />
                                 ))}
                               </div>
                            </div>
                            <div className="text-right space-y-1">
                               <span className="text-[8px] text-white/20 uppercase tracking-[3px] font-black block">Nexus Sync Status</span>
                               <span className="text-[12px] font-black text-indigo-400 uppercase tracking-widest">{providerHealth[aiProvider]?.tokens || "Unlimited"}</span>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Intent Input area (Cubic Structure) */}
            <div className="p-4 md:p-10 border-t border-white/10 shrink-0 bg-white/10">
              {activeTab === 'library' ? (
                <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto">
                  {!user && (
                    <div className="text-center px-4 animate-pulse">
                      <p className="text-[8px] md:text-[10px] font-black text-white/30 uppercase tracking-[4px] bg-white/5 py-2 border border-white/5 rounded-full flex items-center justify-center gap-2">
                         <Lock className="w-2.5 h-2.5" />
                         Guest Mode: Ideas will not be linked to your account. <span className="text-indigo-400 cursor-pointer hover:underline" onClick={() => setActiveTab('identity')}>Sign in</span>
                      </p>
                    </div>
                  )}
                  {!canSuggest && user && (
                    <div className="text-center px-4">
                      <p className="text-[8px] md:text-[10px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 py-2 border border-yellow-500/30 rounded-full italic">
                        Access Restricted: Waiting for Master Bridge Sync
                      </p>
                    </div>
                  )}
                  <div className={`flex flex-col gap-4 w-full transition-opacity ${!canSuggest ? 'opacity-30 pointer-events-none' : ''}`}>
                    <div className="flex gap-2 justify-center mb-2">
                       {(['phone', 'desktop', 'game', 'terminal'] as const).map(type => (
                         <button 
                           key={type}
                           onClick={() => setNewAppType(type)}
                           className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${newAppType === type ? 'bg-white text-black border-white' : 'bg-white/5 text-white/30 border-white/10'}`}
                         >
                           {type}
                         </button>
                       ))}
                    </div>
                    <div className="flex gap-3 md:gap-6 w-full">
                      <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && canSuggest && handleSuggest()}
                        placeholder={`Manifest a ${newAppType}...`}
                        className="flex-1 bg-white/5 border-2 border-white/10 px-6 md:px-8 py-4 md:py-6 rounded-full text-xs md:text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/10 font-black uppercase tracking-[2px] md:tracking-[4px] text-center"
                      />
                      <button 
                        onClick={handleSuggest}
                        disabled={!canSuggest || isLoading}
                        className={`relative w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xl hover:bg-indigo-500 hover:text-white disabled:opacity-50 overflow-hidden group`}
                      >
                      {isLoading ? (
                        <Loader2 className="w-6 md:w-10 h-6 md:h-10 animate-spin text-indigo-500" />
                      ) : (
                        <Plus className="w-6 md:w-10 h-6 md:h-10 font-bold group-hover:rotate-90 transition-transform" />
                      )}
                      
                      {isLoading && (
                        <motion.div 
                          className="absolute inset-0 bg-indigo-500/10"
                          animate={{ opacity: [0, 0.5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HUD: INITIATE BUTTON --- */}
      {!isOpen && !currentSuggestion && (
        <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-40 pointer-events-none">
          <button 
            onClick={initiateNewProject}
            disabled={!!isBuilding}
            className="group relative h-16 w-16 md:h-20 md:w-20 bg-white text-black rounded-full font-black flex items-center justify-center shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:shadow-[0_20px_80px_rgba(255,255,255,0.4)] hover:-translate-y-2 active:scale-95 transition-all border border-white overflow-hidden pointer-events-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {isBuilding === 'new' ? (
              <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
            ) : (
              <div className="flex flex-col items-center">
                <Plus className="w-6 h-6 md:w-8 md:h-8" />
                <span className="text-[7px] uppercase tracking-widest absolute -bottom-1 group-hover:bottom-2 opacity-0 group-hover:opacity-100 transition-all font-black">Create</span>
              </div>
            )}
          </button>
        </div>
      )}

      <AnimatePresence>
        {currentSuggestion && (
          <ModulePlayer 
            suggestion={currentSuggestion} 
            onClose={() => setCurrentSuggestion(null)} 
            onRefine={async (feedback) => {
              const refinePrompt = `
                System: ${aiConfig.systemPrompt}
                Objective: Update the existing "App" component based on user feedback.
                
                Current Code:
                ${currentSuggestion.built_code}
                
                User Feedback:
                "${feedback}"
                
                Instructions:
                - Return the ENTIRE updated React component named "App".
                - Maintain the existing libraries (Motion, Recharts, etc.) and global scope.
                - DO NOT include imports or redundant declarations.
                - Focus on high-quality, polished code.
                - Return ONLY the code.
              `;
              
              const newCode = await callUnifiedAI(refinePrompt);
              
              // Push to local history and sync
              if (newCode) {
                const newVersion: EvolutionVersion = {
                  code: currentSuggestion.built_code || "",
                  timestamp: new Date().toISOString(),
                  prompt: feedback
                };
                
                const updatedHistory = [newVersion, ...(currentSuggestion.history || [])];
                const updatePayload: any = { history: updatedHistory, built_code: newCode };
                
                await updateDoc(doc(db, 'suggestions', currentSuggestion.id), updatePayload);
                setCurrentSuggestion(prev => prev ? { ...prev, built_code: newCode, history: updatedHistory } : null);
              }
              
              return newCode;
            }}
            onSave={async (newCode) => {
              const newVersion: EvolutionVersion = {
                code: currentSuggestion.built_code || "",
                timestamp: new Date().toISOString(),
                prompt: "Manual Revision"
              };
              
              const updatedHistory = [newVersion, ...(currentSuggestion.history || [])];
              const updatePayload: any = { 
                built_code: newCode,
                history: updatedHistory
              };

              await updateDoc(doc(db, 'suggestions', currentSuggestion.id), updatePayload);
              setCurrentSuggestion(prev => prev ? { ...prev, built_code: newCode, history: updatedHistory } : null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
