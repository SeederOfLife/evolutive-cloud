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
  CircleUser
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import * as webllm from "@mlc-ai/web-llm";
import { User, Session } from "@supabase/supabase-js";
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
  const [isBuilding, setIsBuilding] = useState<number | string | null>(null);
  const [activeModule, setActiveModule] = useState<Suggestion | null>(null);
  const [isRepoOpen, setIsRepoOpen] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(1);
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const channelRef = useRef<any>(null);
  const isSyncing = useRef(false);

  // Identity State
  const [session, setSession] = useState<Session | null>(null);
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
      anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229']
    };

    if (providers[aiProvider] && !providers[aiProvider].includes(selectedModel)) {
      setSelectedModel(providers[aiProvider][0]);
    }
    localStorage.setItem('app_provider', aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    localStorage.setItem('app_model', selectedModel);
  }, [selectedModel]);

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
    if (!session || !supabase) return;

    if (!supabase) return;
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) return;

        if (data) {
          setUserProfile(data);
          if (data.personal_api_key) {
             try {
                const cloudKeys = JSON.parse(data.personal_api_key);
                setProviderKeys(prev => ({ ...prev, ...cloudKeys }));
                localStorage.setItem('app_hub_keys', JSON.stringify({ ...providerKeys, ...cloudKeys }));
             } catch {
                // If it's a legacy single string key
                setProviderKeys(prev => ({ ...prev, google: data.personal_api_key }));
                localStorage.setItem('app_hub_keys', JSON.stringify({ ...providerKeys, google: data.personal_api_key }));
             }
          }
        } else {
          await supabase.from('user_profiles').insert([{ id: session.user.id }]);
        }
      } catch (e) {
        console.error("Profile sync catch:", e);
      }
    };

    fetchProfile();
  }, [session, supabase]);

  const saveApiKeyToAccount = async (key: string, provider: string = aiProvider) => {
    const newKeys = { ...providerKeys, [provider]: key };
    setProviderKeys(newKeys);
    localStorage.setItem('app_hub_keys', JSON.stringify(newKeys));
    if (provider === 'google') localStorage.setItem('evolutive_energy_key', key);

    if (session && supabase) {
      try {
        await supabase.from('user_profiles').update({ personal_api_key: JSON.stringify(newKeys) }).eq('id', session.user.id);
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
  const [isRefining, setIsRefining] = useState<number | null>(null);
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
      .filter(([id]) => id !== session?.user?.id)
      .flatMap(([_, instances]) => Object.values(instances))
      .filter((p: any) => p.x !== undefined && p.y !== undefined);
  }, [presenceData, session]);

  const appRank = useMemo(() => {
    if (!session?.user?.id) return { title: "Guest", color: "#ffffff", level: 0 };
    const myCreations = suggestions.filter(s => s.user_id === session.user.id);
    const builds = myCreations.filter(s => s.status === 'built').length;
    const totalVotes = myCreations.reduce((acc, curr) => acc + (curr.votes || 0), 0);
    
    if (builds >= 5) return { title: "Grand Architect", color: "#6366f1", level: 4 };
    if (builds >= 2) return { title: "Senior Builder", color: "#ec4899", level: 3 };
    if (totalVotes >= 10) return { title: "Idea Master", color: "#f59e0b", level: 2 };
    if (myCreations.length >= 1) return { title: "Junior Builder", color: "#10b981", level: 1 };
    return { title: "New Member", color: "#94a3b8", level: 0 };
  }, [suggestions, session]);

  // Unified AI Bridge
  const callUnifiedAI = async (prompt: string): Promise<string> => {
    try {
      const activeKey = providerKeys[aiProvider] || "";
      const googleKey = providerKeys['google'] || (typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined);
      
      // Offline / Specialized Mobile Handlers
      if (aiProvider === 'gemini-nano') {
        const w = window as any;
        if (!w.ai || !w.ai.assistant) {
          throw new Error("Gemini Nano not detected. Ensure 'AI Test' is enabled in your Android Chrome flags (chrome://flags/#optimization-guide-on-device-model).");
        }
        const session = await w.ai.assistant.create();
        const result = await session.prompt(prompt);
        return result;
      }

      if (aiProvider === 'web-llm') {
        if (!webLlmEngineRef.current) {
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
        const keyToUse = googleKey;
        if (!keyToUse) throw new Error("No Google API Key Found. Ensure your API Key is set in the Account tab.");
        
        const ai = new GoogleGenAI({ apiKey: keyToUse });
        // Safety: Ensure the model is valid for Google
        let modelId = selectedModel;
        if (!modelId.startsWith('gemini-')) {
          modelId = "gemini-3-flash-preview"; // Fallback to stable model
        }
        
        try {
          const response = await ai.models.generateContent({
            model: modelId,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
              temperature: aiConfig.temperature,
              topP: aiConfig.topP,
              topK: aiConfig.topK,
              maxOutputTokens: aiConfig.maxTokens,
            }
          });
          
          const text = response.text;
          if (!text) throw new Error("The AI Engine returned an empty response.");
          return text;
        } catch (e: any) {
          const errText = e.message || String(e);
          if (errText.includes('404') || errText.toLowerCase().includes('not found') || errText.includes('503')) {
            console.warn("Primary model unavailable, falling back to gemini-3-flash-preview:", errText);
            const fallbackResponse = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [{ parts: [{ text: prompt }] }],
              config: {
                temperature: aiConfig.temperature,
                topP: aiConfig.topP,
                maxOutputTokens: aiConfig.maxTokens,
              }
            });
            return fallbackResponse.text || "";
          }
          throw e;
        }
      }

      if (aiProvider === 'openai' || aiProvider === 'custom') {
        const client = new OpenAI({
          apiKey: activeKey,
          baseURL: aiProvider === 'custom' ? customEndpoint : undefined,
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
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProviderKeys({});
        localStorage.removeItem('app_nexus_keys');
        localStorage.removeItem('evolutive_energy_key');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [initStatus, setInitStatus] = useState<string>("Connecting to System Network...");

  // Initial fetch and Project setup
  useEffect(() => {
    let mounted = true;
    
    const syncProject = async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;

      try {
        if (!supabase) return;
        
        setInitStatus("Synchronizing Registry...");
        const { data, error } = await supabase.from('suggestions').select('*').eq('status', 'system_config').maybeSingle();
        
        if (error) {
          console.error("SyncProject Query Error:", error);
          return;
        }

        if (data) {
          try {
            const config = JSON.parse(data.content || "{}") as ProjectConfig;
            setIsFinalized(!!config.is_finalized);
            if (!config.creator_id && session?.user?.id) {
              config.creator_id = session.user.id;
              await supabase.from('suggestions').update({ content: JSON.stringify(config) }).eq('id', data.id);
            }
            setCreatorId(config.creator_id || "");
          } catch (e) {
            console.error("Config Parse Error:", e);
          }
        } else if (session?.user?.id) {
          setCreatorId(session.user.id);
          const config: ProjectConfig = {
            creator_id: session.user.id,
            is_finalized: false,
            project_name: "Initial Phase"
          };
          await supabase.from('suggestions').insert([{
            content: JSON.stringify(config),
            status: 'system_config'
          }]);
        }
      } catch (err) {
        console.error("SyncProject Global Exception:", err);
      } finally {
        isSyncing.current = false;
      }
    };

    const init = async () => {
      console.log("Starting Initialization sequence...");
      
      const safetyTimeout = setTimeout(() => {
        if (mounted) {
          console.warn("Initialization safety threshold reached. Forcing interface boot.");
          setIsInitializing(false);
        }
      }, 6000);

      if (!supabase) {
        setInitStatus("Supabase Matrix Off-Bridge. Offline Mode Active.");
        setTimeout(() => {
          if (mounted) {
            clearTimeout(safetyTimeout);
            setIsInitializing(false);
          }
        }, 1200);
        return;
      }

      try {
        setInitStatus("Synchronizing with Global Registry...");
        await Promise.all([
          fetchSuggestions().catch(e => console.error("Suggestions sync failure:", e)),
          syncProject().catch(e => console.error("Registry config failure:", e))
        ]);
        
        setInitStatus("System Link Established.");
      } catch (err) {
        console.error("Initialization sequence interrupted:", err);
        setInitStatus("Sync Interrupted. Retrying Link...");
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          setTimeout(() => setIsInitializing(false), 800);
        }
      }
    };

    init();
    
    if (supabase) {
      // Real-time listener for suggestions and presence and system messages
      if (!channelRef.current) {
        channelRef.current = supabase.channel('system-sync');

        channelRef.current
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'suggestions' },
            (payload: any) => {
              if (payload.eventType === 'INSERT') {
                if (payload.new.status === 'system_config') {
                  try {
                    const config = JSON.parse(payload.new.content) as ProjectConfig;
                    setIsFinalized(config.is_finalized);
                    setCreatorId(config.creator_id);
                  } catch(e) {}
                } else {
                  setSuggestions(current => [...current, payload.new as Suggestion].sort((a,b) => (b.votes || 0) - (a.votes || 0)));
                }
              } else if (payload.eventType === 'UPDATE') {
                if (payload.new.status === 'system_config') {
                  try {
                    const config = JSON.parse(payload.new.content) as ProjectConfig;
                    setIsFinalized(config.is_finalized);
                  } catch(e) {}
                } else {
                  setSuggestions(current => current.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s).sort((a,b) => (b.votes || 0) - (a.votes || 0)));
                }
              } else if (payload.eventType === 'DELETE') {
                setSuggestions(current => current.filter(s => s.id !== payload.old.id));
              }
            }
          )
          .on('presence', { event: 'sync' }, () => {
            const state = channelRef.current.presenceState();
            setPresenceData(state);
            setActiveUsersCount(Object.keys(state).length);
          })
          .on('broadcast', { event: 'message' }, ({ payload }: any) => {
            setSystemMessages(prev => [...prev, payload].slice(-10));
          })
          .on('broadcast', { event: 'advice' }, ({ payload }: any) => {
            setAdvice(prev => [...prev, payload]);
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await channelRef.current.track({ 
                online_at: new Date().toISOString(),
                userId: session?.user.id || 'anonymous'
              });
            }
          });
      }

      // Clear old messages
      const interval = setInterval(() => {
        setSystemMessages(prev => prev.filter(e => Date.now() - e.createdAt < 5000));
      }, 1000);

      const handleMouseMove = (e: MouseEvent) => {
        if (channelRef.current) {
          channelRef.current.track({
            online_at: new Date().toISOString(),
            userId: session?.user.id || 'anonymous',
            x: e.clientX,
            y: e.clientY
          });
        }
      };

      window.addEventListener('mousemove', handleMouseMove);

      return () => {
        mounted = false;
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        clearInterval(interval);
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [session?.user?.id]); // Only reconfirm project sync if user changes

  const handleToggleFinalize = async () => {
    if (!supabase || session?.user.id !== creatorId) return;
    const newFinalized = !isFinalized;
    
    const { data: configRecord } = await supabase.from('suggestions').select('*').eq('status', 'system_config').single();
    if (configRecord) {
      const config = JSON.parse(configRecord.content) as ProjectConfig;
      config.is_finalized = newFinalized;
      await supabase.from('suggestions').update({ content: JSON.stringify(config) }).eq('id', configRecord.id);
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
        if (filterType === 'mine') matchesCategory = s.user_id === session?.user?.id;
        
        return matchesSearch && matchesCategory;
      });
  }, [suggestions, searchQuery, filterType, session]);

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
        - window.React (useState, useEffect, etc.)
        - window.Motion (for animations, use as 'motion')
        - window.Recharts (for charts, use as 'Recharts.LineChart' etc.)
        - window.d3 (for data viz)
        - window.confetti (for effects)
        - window.lucide (for icons, initialize via lucide.createIcons or similar if needed, or assume SVG standard)

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

      if (supabase) {
        // Create a new version of the app
        const insertData: any = { 
          content: `Improved version of: ${suggestion.content} (${refinementPrompt})`,
          status: 'built',
          votes: 0,
          energy: 100,
        };

        if (dbFeatures.built_code) {
          insertData.built_code = generatedCode;
        } else {
          insertData.content = 'JSON:' + JSON.stringify({
            text: insertData.content,
            status: insertData.status,
            votes: insertData.votes,
            energy: insertData.energy,
            built_code: generatedCode
          });
        }

        if (dbFeatures.parent_id) insertData.parent_id = suggestion.id;
        // Don't assume version exists if not detected
        // if (dbFeatures.version) insertData.version = (suggestion.version || 1) + 1;

        await supabase
          .from('suggestions')
          .insert([insertData]);
      } else {
        setSuggestions([{ 
          id: Date.now(), 
          content: `Refinement of ${suggestion.id}`, 
          votes: 0, 
          energy: 100, 
          status: 'built', 
          built_code: generatedCode,
          parent_id: suggestion.id 
        }, ...suggestions]);
      }
      setApiQuota(prev => Math.max(0, prev - 10));
    } catch (err) {
      console.error("Refinement failed:", err);
    } finally {
      setIsRefining(null);
    }
  };

  const postAdvice = async (suggestionId: number, content: string) => {
    if (!content.trim() || !session) return;
    try {
      // In a real app we might have an 'advice' table. 
      // For this demo, we'll store it as a broadcast message if table isn't ready,
      // or just simulate local state update for others.
      // But let's try to use a broadcast event specifically for advice.
    const channel = channelRef.current;
    if (!channel) return;
    
    channel.send({
      type: 'broadcast',
      event: 'advice',
      payload: {
          suggestion_id: suggestionId,
          user_email: session.user.email,
          content: content,
          created_at: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("Advice failed:", err);
    }
  };

  const isCreator = !!session?.user?.id && (session.user.id === creatorId || !creatorId || creatorId === "");
  const canSuggest = isFinalized || isCreator;
  const canInteract = isFinalized || isCreator;
  
  // Debug logging for permissions
  useEffect(() => {
    if (session?.user?.id) {
      console.log("Current Identity:", session.user.id, "Creator Identity:", creatorId, "isCreator:", isCreator);
    }
  }, [session, creatorId, isCreator]);
  
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

  const fetchSuggestions = async () => {
    if (!supabase) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('votes', { ascending: false });

      if (error) throw error;
      if (data) {
        const unwrapped = data.map(unwrapSuggestion);
        setSuggestions(unwrapped);
        if (data.length > 0) {
          const columns = Object.keys(data[0]);
          setDbFeatures({
            pledged_by: columns.includes('pledged_by'),
            built_code: columns.includes('built_code'),
            energy: columns.includes('energy'),
            parent_id: columns.includes('parent_id'),
            version: columns.includes('version'),
            user_id: columns.includes('user_id')
          });
          console.log("Database Schema:", columns);
        }
      }
    } catch (err: any) {
      console.error("Error fetching root memory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!supabase) return;
    setAuthError(null);
    setIsLoading(true);
    try {
      const { error } = isSignUp 
        ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
        : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      
      if (error) {
        console.error("Auth Error:", error);
        setAuthError(error.message);
      } else {
        console.log("Auth Success!");
        setAuthEmail("");
        setAuthPassword("");
      }
    } catch (err: any) {
      console.error("Auth Exception:", err);
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
    setIsBuilding(0);
    
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

      if (!supabase) {
        setSuggestions([{ id: Date.now(), content, votes: 0, energy: 0, status: "pending", user_id: session?.user?.id }, ...suggestions]);
        setApiQuota(prev => Math.max(0, prev - 5));
        return;
      }

      const suggestData: any = { content };
      // Wrap in JSON if columns are missing
      if (session?.user?.id) {
        if (!dbFeatures.user_id || !dbFeatures.energy) {
          suggestData.content = 'JSON:' + JSON.stringify({
            text: content,
            user_id: session.user.id,
            energy: 0,
            votes: 0
          });
        } else {
          suggestData.user_id = session.user.id;
        }
      }

      const { data, error } = await supabase
        .from('suggestions')
        .insert([suggestData])
        .select();

      if (error) throw error;
      setApiQuota(prev => Math.max(0, prev - 5));
      if (data) {
        setSuggestions([unwrapSuggestion(data[0]), ...suggestions]);
      }
    } catch (err: any) {
      console.error("Error planting intent:", err);
      const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      alert(`System Link Failure: ${errorMsg}`);
    } finally {
      setIsBuilding(null);
    }
  };

  const handleVote = async (id: number, currentVotes: number) => {
    if (!supabase) {
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, votes: s.votes + 1 } : s).sort((a,b) => b.votes-a.votes));
      return;
    }
    try {
      const { error } = await supabase.from('suggestions').update({ votes: currentVotes + 1 }).eq('id', id);
      if (error) throw error;
      // Real-time channel will handle the local state update
    } catch (err: any) {
      console.error("Error casting vote:", err);
    }
  };

  const handlePledge = async (s: Suggestion) => {
    const key = userApiKey || (isCreator ? process.env.GEMINI_API_KEY : null);
    if (!session || !key || !supabase) {
      if (!key && !userApiKey) {
        alert("Please set your API Key in the Account tab to power builds.");
        setActiveTab('identity');
      }
      return;
    }
    if (isRefining) return;
    
    // Simplified data extraction from unwrapped suggestion
    const pledgedBy = s.pledged_by || [];
    const currentEnergy = s.energy || 0;

    const hasPledged = pledgedBy.includes(session.user.id);
    const newEnergy = Math.min(100, currentEnergy + (isCreator ? 100 : 25));
    const shouldBuild = newEnergy >= 100;

    try {
      setIsRefining(s.id);
      const newPledgedBy = hasPledged ? pledgedBy : [...pledgedBy, session.user.id];
      
      let builtCode = s.built_code;
      let newStatus = s.status;

      if (shouldBuild && s.status === 'pending') {
        const prompt = `Create a functional, professional React component titled "App" for this idea: ${s.content}. 
        Use Tailwind CSS. Return ONLY the code, no markdown wrappers. Include animations using framer-motion (window.Motion). 
        Assume you have access to: window.React, window.Motion, window.Recharts, window.d3, window.confetti, window.lucide.`;
        
        const result = await callUnifiedAI(prompt);
        builtCode = result.replace(/```jsx|```tsx|```javascript|```/g, '').trim();
        newStatus = 'built';
      }

      const updateData: any = { status: newStatus };
      if (builtCode && dbFeatures.built_code) updateData.built_code = builtCode;
      
      // Only include fields that exist in DB
      if (dbFeatures.energy) updateData.energy = newEnergy;
      if (dbFeatures.pledged_by) updateData.pledged_by = newPledgedBy;

      // Wrap missing fields into content
      if (!dbFeatures.energy || !dbFeatures.pledged_by || !dbFeatures.built_code) {
        const meta = { text: s.content, energy: newEnergy, pledged_by: newPledgedBy, built_code: builtCode };
        updateData.content = 'JSON:' + JSON.stringify(meta);
      }
      
      const { error: updateError } = await supabase.from('suggestions').update(updateData).eq('id', s.id);
      if (updateError) throw updateError;
      
      if (shouldBuild) {
        setApiQuota(prev => Math.max(0, prev - 10));
        // Update local state for immediate launch
        const updatedS = { ...s, status: 'built' as const, built_code: builtCode };
        setSuggestions(prev => prev.map(p => p.id === s.id ? updatedS : p));
        setActiveModule(updatedS);
      }
    } catch (err: any) {
      console.error("Error during build cycle:", err);
      const errMsg = err.message || String(err);
      alert(`The system bridge flickered: ${errMsg}\n\nPlease verify your API key and internet connection.`);
    } finally {
      setIsRefining(null);
    }
  };

  const handleDeleteSuggestion = async (id: number) => {
    if (!supabase) {
      setSuggestions(suggestions.filter(s => s.id !== id));
      return;
    }
    
    try {
      // Direct Hard Delete
      const { error } = await supabase.from('suggestions').delete().eq('id', id);
      
      if (error) {
        console.warn("Hard delete denied. Likely RLS policy mismatch:", error.message);
        // Fallback: try soft delete if delete is prohibited but update is allowed
        const { error: updateError } = await supabase.from('suggestions').update({ status: 'deleted' }).eq('id', id);
        if (updateError) {
          throw new Error(`Delete failed: ${error.message} | Soft fallback failed: ${updateError.message}`);
        }
      }
      
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error("Deletion Error:", err);
      alert(`Critical System Failure: ${err.message || 'Access Denied. Are you the creator?'}`);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !supabase || !channelRef.current) return;
    
    const newMessage: SystemMessage = {
      id: Math.random().toString(36),
      userId: session?.user.id || 'anonymous',
      text: messageInput.trim(),
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      createdAt: Date.now()
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: newMessage
    });

    setMessageInput("");
  };

  const initiateNewProject = async () => {
    const promptValue = prompt("What do you want to build in this new Evolutionary Workspace?");
    if (!promptValue || !supabase) return;

    try {
      setIsBuilding("new");
      const { data: userData } = await supabase.auth.getUser();
      
      const newSuggestion = {
        content: promptValue,
        votes: 1,
        energy: 10,
        status: 'pending',
        user_id: userData.user?.id,
        built_code: ""
      };

      const { data, error } = await supabase.from('suggestions').insert(newSuggestion).select().single();
      if (error) throw error;

      setSuggestions(prev => [data, ...prev]);
      setActiveModule(data); // OPEN IMMEDIATELY
      
      // Auto-trigger first build
      await buildEvolution(data);
      
    } catch (err: any) {
      console.error("Initiation Error:", err);
      alert("AI Bridge failed to initiate: " + err.message);
    } finally {
      setIsBuilding(null);
    }
  };
  const buildEvolution = async (suggestion: Suggestion) => {
    if (isBuilding) return;
    
    try {
      setIsBuilding(suggestion.id);
      
      const prompt = `
        System: ${aiConfig.systemPrompt}
        Context: This app was requested by the community. ${suggestion.pledged_by?.length || 0} users supported this idea.
        
        Task: Create a beautiful, polished, and functionally complex React application for: "${suggestion.content}"
        
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
        - Output ONLY the component code.
        - The component MUST be exported as "export default function App() { ... }".
        - Use Tailwind CSS for all styling.
        - CRITICAL: Do NOT include any import statements. The environment provides all necessary tools globally.
        - CRITICAL: Do NOT redeclare hooks (useState, etc), or libraries like motion, Recharts, or d3. Just use them.
        - For icons, always use the pre-mapped global components (e.g. <Zap />) or the <Icon name="IconName" /> helper.
        - The container should be transparent or dark.
        - Return ONLY the code, no markdown formatting outside of the code block if you must use one.
      `;

      if (apiQuota < 20) {
        alert("Build capacity too low for building. Wait for recharge.");
        setIsBuilding(null);
        return;
      }
      const text = await callUnifiedAI(prompt);
      
      // Clean backticks and language identifiers meticulously
      let generatedCode = text
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();

      if (!generatedCode) {
        throw new Error("The system returned no code. Build failed.");
      }

      if (supabase) {
        const updateData: any = { status: 'built' };
        
        if (dbFeatures.built_code) {
          updateData.built_code = generatedCode;
        } else {
          const meta = suggestion.content.startsWith('JSON:') ? JSON.parse(suggestion.content.substring(5)) : { text: suggestion.content };
          meta.built_code = generatedCode;
          meta.status = 'built';
          updateData.content = 'JSON:' + JSON.stringify(meta);
        }

        const { error } = await supabase
          .from('suggestions')
          .update(updateData)
          .eq('id', suggestion.id);
        
        if (error) throw error;
      }

      setApiQuota(prev => Math.max(0, prev - 15));
      const updatedSuggestion = { ...suggestion, status: 'built' as const, built_code: generatedCode };
      setSuggestions(suggestions.map(s => s.id === suggestion.id ? updatedSuggestion : s));
      setActiveModule(updatedSuggestion);

    } catch (err: any) {
      console.error("Generation failure:", err);
      const errMsg = err.message || String(err);
      alert(`App build failed: ${errMsg}`);
    } finally {
      setIsBuilding(null);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#020205] text-white selection:bg-indigo-500/30 overflow-hidden font-sans">
      <AnimatePresence>
        {isInitializing && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[200] bg-[#020208] flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative">
              <div className="absolute -inset-10 bg-indigo-500/20 blur-[60px] rounded-full animate-pulse" />
              <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
            </div>
            <h1 className="mt-12 text-2xl md:text-3xl font-black uppercase tracking-[10px] text-white">System Boot</h1>
            <p className="mt-4 text-[10px] md:text-xs text-indigo-400 font-bold uppercase tracking-[4px] animate-pulse h-4 truncate max-w-sm px-4">
              {initStatus}
            </p>
            
            <div className="mt-20 w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-indigo-500"
                 animate={{ x: [-200, 200] }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
               />
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3 }}
              onClick={() => setIsInitializing(false)}
              className="mt-10 px-6 py-2 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-white/40 transition-all"
            >
              Enter System
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- BACKGROUND BLOBS & GLOW --- */}
      <div className="bg-gradient-to-br from-indigo-500/5 to-transparent absolute inset-0 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-900/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      
      {/* --- HUD LAYER --- */}
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
          if (!presence?.x || presence.userId === session?.user.id) return null;
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

      <header className="absolute top-6 left-6 md:top-10 md:left-10 z-10 pointer-events-none">
        <h1 className="text-[32px] md:text-[64px] font-[900] tracking-[-1px] md:tracking-[-2px] leading-[0.9] text-white/15 uppercase">
          EVOLUTIONARY<br />HUB
        </h1>
            <div className="mt-2 flex flex-col gap-1 md:gap-2">
          <div className="text-[8px] md:text-[11px] tracking-[2px] md:tracking-[4px] text-indigo-400 uppercase font-bold">
            Evolutionary Hub . Online
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 text-[8px] md:text-[9px] text-white/40 uppercase tracking-widest font-mono">
              <Activity className="w-2 md:w-3 h-2 md:h-3" />
              <span>{isOpen ? "Open" : "Closed"}</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] md:text-[9px] text-green-500/60 uppercase tracking-widest font-mono">
              <Database className="w-2 md:w-3 h-2 md:h-3" />
              <span>Synced</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] md:text-[9px] text-indigo-400/80 uppercase tracking-widest font-mono">
              <Users className="w-2 md:w-3 h-2 md:h-3" />
              <span className="hidden sm:inline">Active:</span> <span>{activeUsersCount}</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- HUD LAYER --- */}
      <div className="absolute top-6 right-20 md:top-10 md:left-10 md:right-auto z-20 flex flex-col gap-4">
        {isCreator && (
          <button 
            onClick={handleToggleFinalize}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-xl backdrop-blur-md pointer-events-auto ${
              isFinalized ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
            }`}
            title={isFinalized ? "Collective Mode Active" : "Creator Mode Active"}
          >
            {isFinalized ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* --- RIGHT SIDEBAR TOGGLE --- */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-4 z-40">
        <button 
          onClick={() => setIsRepoOpen(true)}
          className="w-12 h-20 md:w-14 md:h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex flex-col items-center justify-center gap-2 md:gap-3 hover:bg-white/10 hover:border-indigo-500/50 transition-all group pointer-events-auto shadow-2xl"
        >
          <Database className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:scale-125 transition-transform" />
          <span className="[writing-mode:vertical-lr] text-[7px] md:text-[8px] font-black uppercase tracking-[2px] md:tracking-[3px] text-white/40 group-hover:text-white transition-colors">Builds</span>
        </button>
      </div>

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
                  .sort((a, b) => b.id - a.id)
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
                                setActiveModule(s as any);
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
              onRun={(suggestion) => setActiveModule(suggestion)} 
            />
          ))
        }

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
      </Canvas>

      {/* --- HUD: UPDATE INPUT --- */}
      {!isOpen && (
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
                      {isFinalized ? 'Community' : 'Creator'}
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
                    <div className="flex items-center gap-2 italic"><Box className="w-3 h-3" /> Idea / Application</div>
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
                                <span>{isApp ? `Version v${s.version || 1}` : 'Proposal Draft'}</span>
                                {(s.pledged_by || []).length > 0 && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="flex items-center gap-1 text-yellow-500/50"><Zap className="w-2 md:w-2.5 h-2 md:h-2.5 fill-current" /> Supported</span>
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
                               {s.status}
                             </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-2 md:pr-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                            {isApp ? (
                              <>
                                <button onClick={() => setActiveModule(s)} className="flex-1 md:flex-none p-2 md:p-2.5 rounded-lg bg-white text-black hover:scale-105 md:hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 group/launch" title="Launch App">
                                  <Play className="w-3.5 md:w-4 h-3.5 md:h-4 fill-current group-hover/launch:animate-pulse" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Execute</span>
                                </button>
                                {(isFinalized || isCreator) && (
                                  <button 
                                    onClick={() => {
                                      const prompt = window.prompt("Suggest an evolution for this app:");
                                      if (prompt) handleRefine(s, prompt);
                                    }}
                                    disabled={!!isRefining}
                                    className="p-2 md:p-2.5 rounded-lg border border-white/10 text-white/60 hover:bg-white hover:text-black transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                                    title="Evolve"
                                  >
                                    {isRefining === s.id ? <Loader2 className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin text-indigo-400" /> : <RefreshCw className="w-3.5 md:w-4 h-3.5 md:h-4" />}
                                    <span className="text-[9px] uppercase font-black tracking-widest md:hidden">Evolve</span>
                                  </button>
                                )}
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
                                    disabled={!!isRefining || (!isCreator && !userApiKey)}
                                    className={`flex-1 md:flex-none p-2 md:p-2.5 rounded-lg border flex items-center justify-center transition-all gap-2 relative ${
                                      isCreator 
                                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 border-indigo-500 text-white hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                                      : 'bg-white/5 border-white/10 text-yellow-500/50 hover:bg-yellow-500 hover:text-black'
                                    }`}
                                    title={isCreator ? "Build Immediately" : "Build with Power"}
                                  >
                                    {isRefining === s.id ? (
                                      <Loader2 className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin" />
                                    ) : isCreator ? (
                                      <Zap className="w-3.5 md:w-4 h-3.5 md:h-4 fill-current animate-pulse text-yellow-400" />
                                    ) : (
                                      <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                    )}
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                      {isRefining === s.id ? 'Building...' : isCreator ? 'Build Now' : 'Power-Up'}
                                    </span>
                                    
                                    {isCreator && !isRefining && (
                                      <div className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                      </div>
                                    )}
                                  </button>
                                </>
                              )
                            )}

                            {(isCreator || (s.user_id && session?.user?.id && s.user_id === session.user.id)) && (
                                  <button 
                                    onClick={() => {
                                      if (window.confirm("This action is irreversible. Delete permanently?")) {
                                        handleDeleteSuggestion(s.id);
                                      }
                                    }}
                                    className="p-2 md:p-2.5 rounded-lg border border-pink-500/10 text-pink-500/20 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all"
                                    title="Delete Forever"
                                  >
                                    <Trash2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                  </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Feedback / Details */}
                        {advice.filter(a => a.suggestion_id === s.id).length > 0 && (
                          <div className="mx-6 mt-1 mb-4 pt-1 flex flex-wrap gap-2">
                             {advice.filter(a => a.suggestion_id === s.id).map((a, i) => (
                               <div key={i} className="text-[8px] bg-white/[0.03] text-white/40 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2">
                                 <MessageCircle className="w-2 h-2 text-indigo-400" />
                                 <span className="text-white/60 lowercase">{a.user_email.split('@')[0]}:</span>
                                 <span>{a.content}</span>
                               </div>
                             ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  </div>
                </div>
              ) : activeTab === 'evolution' ? (
                <EvolutionTree 
                  suggestions={suggestions} 
                  onSelect={(s) => {
                    console.log("Selected evolution node:", s);
                    setActiveModule(s);
                  }} 
                />
              ) : (
                <div className="max-w-md mx-auto space-y-12 py-20">
                  {!session ? (
                    <div className="text-center space-y-10">
                      <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(99,102,241,0.3)]">
                        <CircleUser className="w-10 h-10 text-white" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black uppercase tracking-[10px] text-white">Account</h3>
                        <p className="text-[11px] text-white/40 leading-relaxed uppercase tracking-widest px-10">
                          Sign in to save and share your ideas.
                        </p>
                      </div>

                      {/* Email Auth Form - Circular Buttons/Inputs */}
                      <div className="space-y-4 px-2">
                        {!supabase && (
                          <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-2xl mb-4">
                            <p className="text-[10px] text-pink-400 uppercase font-black tracking-widest leading-relaxed">
                              Database Disconnected.<br/>Check your setup.
                            </p>
                          </div>
                        )}
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
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-[10px] text-white/30 hover:text-indigo-400 uppercase tracking-widest font-black transition-colors"
                        >
                          {isSignUp ? "Already have an account?" : "Need an account?"}
                        </button>
                      </div>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                        <div className="relative flex justify-center"><span className="bg-[#050510] px-4 text-[10px] text-white/20 uppercase tracking-[4px] font-black">Social Login</span></div>
                      </div>

                          <button 
                            onClick={() => {
                              supabase.auth.signInWithOAuth({ 
                                provider: 'google',
                                options: { 
                                  redirectTo: window.location.origin,
                                  skipBrowserRedirect: true, 
                                }
                              }).then(({ data, error }) => {
                                if (error) setAuthError(error.message);
                                if (data?.url) {
                                  const authWindow = window.open(data.url, 'google_auth', 'width=600,height=700');
                                  if (!authWindow) {
                                    setAuthError("Please allow popups to sign in with Google.");
                                  }
                                }
                              });
                            }}
                            disabled={!supabase}
                            className="w-full px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-[4px] rounded-full hover:rotate-1 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                          >
                            Sign in with Google
                          </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-8 py-10">
                      <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-4 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)] relative z-10 bg-black">
                          <img 
                            src={session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.email}`} 
                            alt="Profile Avatar"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Status Ring */}
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="absolute -inset-2 border border-dashed border-indigo-500/30 rounded-full"
                        />
                      </div>

                      <div className="space-y-4">
                         <h3 className="text-xl font-black uppercase tracking-[8px] text-white">{session.user.email?.split('@')[0]}</h3>
                         <div className="flex flex-col items-center gap-2">
                          <div 
                            className="px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[4px] inline-block shadow-lg border"
                            style={{ backgroundColor: `${appRank.color}20`, color: appRank.color, borderColor: `${appRank.color}40` }}
                          >
                            {appRank.title}
                          </div>
                          <div className="flex gap-1 justify-center">
                            {[...Array(5)].map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full ${i < appRank.level ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-white/10'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-lg mx-auto">
                        <div className="p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-3xl group">
                          <div className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-widest font-black mb-1 md:mb-2 group-hover:text-indigo-400 transition-colors text-center md:text-left">Ideas</div>
                          <div className="text-xl md:text-2xl text-white font-black tracking-tighter text-center md:text-left">
                            {suggestions.filter(s => s.user_id === session.user.id).length}
                          </div>
                        </div>
                        <div className="p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-3xl group">
                          <div className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-widest font-black mb-1 md:mb-2 group-hover:text-pink-400 transition-colors text-center md:text-left">Builds</div>
                          <div className="text-xl md:text-2xl text-white font-black tracking-tighter text-center md:text-left">
                            {suggestions.filter(s => s.user_id === session.user.id && s.status === 'built').length}
                          </div>
                        </div>
                        <div className="p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-3xl group">
                          <div className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-widest font-black mb-1 md:mb-2 group-hover:text-yellow-400 transition-colors text-center md:text-left">Build Power</div>
                          <div className="text-xl md:text-2xl text-white font-black tracking-tighter text-center md:text-left">
                            {suggestions.filter(s => s.user_id === session.user.id).reduce((acc, curr) => acc + (curr.votes || 0), 0)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/[0.03] p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white/5 space-y-8 text-left">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-[4px] text-white">AI Hub</h4>
                            <p className="text-[8px] text-white/30 uppercase tracking-widest font-medium">Switch & Monitor System Integrations</p>
                          </div>
                          <div className="flex gap-2">
                            {(['google', 'openai', 'anthropic', 'custom', 'web-llm', 'gemini-nano', 'mlc-mobile'] as const).map((p) => (
                              <button
                                key={p}
                                onClick={() => setAiProvider(p)}
                                className={`w-3 h-3 rounded-full transition-all flex items-center justify-center relative ${aiProvider === p ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] scale-125' : 'bg-white/10 hover:bg-white/20'}`}
                                title={p.toUpperCase()}
                              >
                                {providerHealth[p]?.status === 'online' && (
                                   <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-500 rounded-full border border-[#050510]" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Individual Provider Identity Page */}
                        <motion.div 
                          key={aiProvider}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-8"
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
                                <label className="text-[9px] font-black uppercase tracking-[3px] text-white/40 group-focus-within:text-indigo-400 transition-colors">Energy Secret</label>
                                <Lock className="w-3 h-3 text-white/10" />
                              </div>
                              <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-indigo-400 transition-colors" />
                                <input 
                                  type="password" 
                                  placeholder="Identity Token Required"
                                  value={userApiKey}
                                  onChange={(e) => saveApiKeyToAccount(e.target.value)}
                                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[11px] text-white outline-none focus:border-indigo-500/30 transition-all font-mono"
                                />
                              </div>
                              <button 
                                onClick={() => saveApiKeyToAccount(userApiKey)}
                                className="w-full py-3 bg-white/5 hover:bg-white hover:text-black text-[8px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                              >
                                Synchronize Key
                              </button>
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
                                    </>
                                  )}
                                  {aiProvider === 'openai' && (
                                    <>
                                      <option value="gpt-4o">GPT-4o (Production)</option>
                                      <option value="gpt-4o-mini">GPT-4o Mini (Efficient)</option>
                                      <option value="o1-preview">o1 Preview (Reasoning)</option>
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

                      <button 
                        onClick={() => supabase.auth.signOut()}
                        className="px-10 py-5 bg-white text-black text-[11px] font-black uppercase tracking-[6px] rounded-full hover:bg-pink-500 hover:text-white transition-all shadow-xl active:scale-95"
                      >
                        Sever Connection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Intent Input area (Cubic Structure) */}
            <div className="p-4 md:p-10 border-t border-white/10 shrink-0 bg-white/10">
              {activeTab === 'library' ? (
                <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto">
                  {!canSuggest && (
                    <div className="text-center px-4">
                      <p className="text-[8px] md:text-[10px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 py-2 border border-yellow-500/30 rounded-full italic">
                        Access Restricted: Waiting for Master Bridge Sync
                      </p>
                    </div>
                  )}
                  <div className={`flex gap-3 md:gap-6 w-full transition-opacity ${!canSuggest ? 'opacity-30 pointer-events-none' : ''}`}>
                    <input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canSuggest && handleSuggest()}
                      placeholder="Build an idea..."
                      className="flex-1 bg-white/5 border-2 border-white/10 px-6 md:px-8 py-4 md:py-6 rounded-full text-xs md:text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/10 font-black uppercase tracking-[2px] md:tracking-[4px] text-center"
                    />
                    <button 
                      onClick={handleSuggest}
                      disabled={!canSuggest}
                      className="w-14 h-14 md:w-20 md:h-20 shrink-0 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xl hover:bg-indigo-500 hover:text-white disabled:opacity-50"
                    >
                      <Plus className="w-6 md:w-10 h-6 md:h-10 font-bold" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HUD: INITIATE BUTTON --- */}
      {!isOpen && (
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
        {activeModule && (
          <ModulePlayer 
            suggestion={activeModule} 
            onClose={() => setActiveModule(null)} 
            onRefine={async (feedback) => {
              const refinePrompt = `
                System: ${aiConfig.systemPrompt}
                Objective: Update the existing "App" component based on user feedback.
                
                Current Code:
                ${activeModule.built_code}
                
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
              if (newCode && supabase) {
                const newVersion: EvolutionVersion = {
                  code: activeModule.built_code || "",
                  timestamp: new Date().toISOString(),
                  prompt: feedback
                };
                
                const updatedHistory = [newVersion, ...(activeModule.history || [])];
                const updatePayload: any = { history: updatedHistory, built_code: newCode };
                
                // Fallback for schema
                if (!dbFeatures.version) {
                  const meta = activeModule.content.startsWith('JSON:') ? JSON.parse(activeModule.content.substring(5)) : { text: activeModule.content };
                  meta.history = updatedHistory;
                  meta.built_code = newCode;
                  updatePayload.content = 'JSON:' + JSON.stringify(meta);
                  delete updatePayload.history;
                  delete updatePayload.built_code;
                }

                await supabase.from('suggestions').update(updatePayload).eq('id', activeModule.id);
                setSuggestions(prev => prev.map(s => s.id === activeModule.id ? { ...s, built_code: newCode, history: updatedHistory } : s));
                setActiveModule(prev => prev ? { ...prev, built_code: newCode, history: updatedHistory } : null);
              }
              
              return newCode;
            }}
            onSave={async (newCode) => {
              if (!supabase) return;
              
              const newVersion: EvolutionVersion = {
                code: activeModule.built_code || "",
                timestamp: new Date().toISOString(),
                prompt: "Manual Revision"
              };
              
              const updatedHistory = [newVersion, ...(activeModule.history || [])];
              const updatePayload: any = { 
                built_code: newCode,
                history: updatedHistory
              };

              if (!dbFeatures.built_code) {
                const meta = activeModule.content.startsWith('JSON:') ? JSON.parse(activeModule.content.substring(5)) : { text: activeModule.content };
                meta.built_code = newCode;
                meta.history = updatedHistory;
                updatePayload.content = 'JSON:' + JSON.stringify(meta);
                delete updatePayload.built_code;
                delete updatePayload.history;
              }

              const { error } = await supabase.from('suggestions').update(updatePayload).eq('id', activeModule.id);
              if (error) throw error;
              
              setSuggestions(prev => prev.map(s => s.id === activeModule.id ? { ...s, built_code: newCode, history: updatedHistory } : s));
              setActiveModule(prev => prev ? { ...prev, built_code: newCode, history: updatedHistory } : null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
