/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
// Removal of Tone.js for simplified access as requested
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
  DraftingCompass
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import * as webllm from "@mlc-ai/web-llm";
import { User, Session } from "@supabase/supabase-js";
import { User as UserIcon, LogOut, ShieldCheck, Key, Cpu, Globe } from "lucide-react";

// --- TYPES ---
interface Suggestion {
  id: number;
  content: string;
  votes: number;
  energy: number; // 0 to 100
  status: string;
  user_id?: string;
  manifested_code?: string;
  created_at?: string;
  pledged_by?: string[]; // user ids
  parent_id?: number | null; // For refinement iterations
  version?: number;
  is_deleted?: boolean;
}

function EvolutionTree({ suggestions, onSelect }: { suggestions: Suggestion[], onSelect: (s: Suggestion) => void }) {
  const filteredSuggestions = useMemo(() => 
    suggestions.filter(s => s.status !== 'deleted' && !s.is_deleted), 
  [suggestions]);

  const rootNodes = useMemo(() => 
    filteredSuggestions.filter(s => !s.parent_id && s.status !== 'system_config'), 
  [filteredSuggestions]);
  
  const buildTree = (s: Suggestion, level: number = 0): any => {
    const children = filteredSuggestions.filter(child => child.parent_id === s.id);
    return {
      node: s,
      level,
      children: children.map(c => buildTree(c, level + 1))
    };
  };

  const forest = useMemo(() => rootNodes.map(r => buildTree(r)), [rootNodes, filteredSuggestions]);

  if (forest.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
        <GitBranch className="w-20 h-20 mb-6" />
        <p className="text-xl font-black uppercase tracking-[10px]">No Evolutionary Paths<br/>Detected Yet</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto custom-scrollbar p-20 flex flex-col gap-32">
      {forest.map((tree, i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          <EvolutionBranch branch={tree} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

function EvolutionBranch({ branch, onSelect }: { branch: any, onSelect: (s: Suggestion) => void }) {
  let title = branch.node.content;
  if (branch.node.content.startsWith('JSON:')) {
    try { title = JSON.parse(branch.node.content.substring(5)).text; } catch(e) {}
  }

  return (
    <div className="flex items-center gap-16 relative">
      <motion.div 
        whileHover={{ scale: 1.05, y: -5 }}
        onClick={() => onSelect(branch.node)}
        className={`shrink-0 w-64 p-6 rounded-[2rem] border-2 cursor-pointer transition-all relative z-10 ${
          branch.node.status === 'manifested' 
            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)]' 
            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
        }`}
      >
        {branch.node.status === 'manifested' && (
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3 flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${branch.node.status === 'manifested' ? 'bg-indigo-400' : 'bg-white/20'}`} />
          NODE_{branch.node.id}
        </div>
        <div className="text-[11px] text-white/80 font-bold line-clamp-3 leading-relaxed mb-6 italic group-hover:text-white">
           "{title}"
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-4">
           <span className={`text-[8px] uppercase font-black tracking-[2px] ${branch.node.status === 'manifested' ? 'text-indigo-400' : 'text-white/40'}`}>
             {branch.node.status}
           </span>
           <div className="flex gap-2">
             {branch.node.version && <span className="px-2 py-0.5 rounded-full bg-white/5 text-[7px] text-white/40 font-black tracking-tighter">V{branch.node.version}</span>}
             <span className="px-2 py-0.5 rounded-full bg-white/5 text-[7px] text-indigo-400 font-black tracking-tighter uppercase">{branch.node.votes}V</span>
           </div>
        </div>
      </motion.div>

      {branch.children.length > 0 && (
        <div className="flex flex-col gap-12 relative py-4">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-white/5 via-indigo-500/20 to-white/5" style={{ left: '-32px' }} />
          {branch.children.map((child: any, i: number) => (
            <div key={i} className="flex items-center relative">
               <div className="absolute left-0 w-8 h-px bg-indigo-500/20" style={{ left: '-32px' }} />
               <EvolutionBranch branch={child} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Advice {
  id: number;
  suggestion_id: number;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  personal_api_key?: string;
}

interface VoidEcho {
  id: string;
  userId: string;
  text: string;
  x: number;
  y: number;
  createdAt: number;
}

interface EvolutionSnapshot {
  id: string;
  manifested_at: string;
  count: number;
}

interface ProjectConfig {
  creator_id: string;
  is_finalized: boolean;
  epoch_name: string;
}

// --- SOUND ENGINE REMOVED FOR SIMPLICITY ---

// --- 3D COMPONENTS ---

function EvolutiveSeed({ onClick, isOpen }: { onClick: () => void, isOpen: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    timeRef.current += delta;
    const time = timeRef.current;
    meshRef.current.rotation.y = time * 0.15;
    const pulse = 1 + Math.sin(time * (isOpen ? 2 : 0.5)) * (isOpen ? 0.1 : 0.05);
    meshRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} onClick={onClick} castShadow>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshDistortMaterial
          color={isOpen ? "#818cf8" : "#6366f1"}
          speed={isOpen ? 5 : 3}
          distort={isOpen ? 0.6 : 0.4}
          radius={1}
          metalness={0.7}
          roughness={0.1}
          emissive={isOpen ? "#4338ca" : "#2e1065"}
          emissiveIntensity={0.8}
        />
      </mesh>
    </Float>
  );
}

function ModuleNode({ suggestion, onRun }: { suggestion: Suggestion, onRun: (s: Suggestion) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  
  // Create a unique orbit for each node based on its ID
  const { radius, speed, offset, yOffset, color } = useMemo(() => {
    const colors = ["#ff006e", "#3a86ff", "#fb5607", "#ffbe0b", "#8338ec", "#00f5d4"];
    return {
      radius: 3.5 + Math.random() * 2,
      speed: 0.1 + Math.random() * 0.2,
      offset: Math.random() * Math.PI * 2,
      yOffset: (Math.random() - 0.5) * 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  }, []);

  useFrame((state, delta) => {
    timeRef.current += delta;
    const time = timeRef.current;
    const t = time * speed + offset;
    meshRef.current.position.x = Math.cos(t) * radius;
    meshRef.current.position.z = Math.sin(t) * radius;
    meshRef.current.position.y = yOffset + Math.sin(t * 2) * 0.5;
    meshRef.current.rotation.y += 0.01;
  });

  return (
    <mesh 
      ref={meshRef} 
      onClick={(e) => {
        e.stopPropagation();
        onRun(suggestion);
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial 
        color={hovered ? "#fff" : color} 
        emissive={hovered ? "#fff" : color}
        emissiveIntensity={hovered ? 2 : 1.5}
        metalness={0.9}
        roughness={0.1}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function Nebula({ count = 3000 }) {
  const timeRef = useRef(0);
  const circleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { points, colors } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#ff006e"),
      new THREE.Color("#3a86ff"),
      new THREE.Color("#fb5607"),
      new THREE.Color("#ffbe0b"),
      new THREE.Color("#8338ec"),
    ];

    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 50;
      p[i * 3 + 1] = (Math.random() - 0.5) * 50;
      p[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      const col = palette[Math.floor(Math.random() * palette.length)];
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return { points: p, colors: c };
  }, [count]);

  const matRef = useRef<THREE.PointsMaterial>(null!);
  useFrame((state, delta) => {
    timeRef.current += delta;
    const time = timeRef.current;
    matRef.current.size = 0.1 + Math.sin(time * 0.5) * 0.05;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.15}
        vertexColors
        transparent
        map={circleTexture}
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// --- MODULE PLAYER (SANDBOX) ---

function ModulePlayer({ 
  suggestion, 
  onClose, 
  onSave 
}: { 
  suggestion: Suggestion, 
  onClose: () => void, 
  onSave?: (code: string) => Promise<void> 
}) {
  const [code, setCode] = useState(suggestion.manifested_code || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanCode = useMemo(() => {
    return code
      .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '') // Remove imports
      .replace(/export\s+default\s+/g, '') // Remove export default
      .replace(/export\s+/g, ''); // Remove other exports
  }, [code]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(code);
      setIsEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save changes to the collective mind.");
    } finally {
      setIsSaving(false);
    }
  };

  const srcDoc = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <script src="https://unpkg.com/framer-motion@10.16.4/dist/framer-motion.js"></script>
        <script src="https://unpkg.com/recharts/umd/Recharts.js"></script>
        <script src="https://unpkg.com/d3@7"></script>
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
        <style>
          body { 
            background: transparent; 
            color: white; 
            margin: 0; 
            font-family: 'Inter', sans-serif; 
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            overflow-y: auto;
            overflow-x: hidden;
          }
          #root { width: 100%; height: 100%; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(129, 140, 248, 0.2); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(129, 140, 248, 0.4); }
        </style>
      </head>
      <body class="custom-scrollbar">
        <div id="root"></div>
        <script type="text/babel">
          (function() {
            try {
              const React = window.React;
              const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;
              const ReactDOM = window.ReactDOM;
              const motion = window.Motion;
              const Recharts = window.Recharts;
              const d3 = window.d3;
              const confetti = window.confetti;

              // Mock icons helper if lucide-react isn't fully available
              const Lucide = window.lucide;
              
              // If the code didn't define App, but defined something else, try to find it
              const ComponentToRender = typeof App !== 'undefined' ? App : null;
              
              if (ComponentToRender) {
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(<ComponentToRender />);
              } else {
                document.getElementById('root').innerHTML = '<div style="padding:20px; color:rgba(255,255,255,0.5); text-align:center">Evolution Manifested. No entry point found.</div>';
              }
            } catch (err) {
              document.getElementById('root').innerHTML = '<pre style="color:pink; padding:20px; white-space:pre-wrap">' + err.message + '</pre>';
            }
          })();
        </script>
      </body>
    </html>
  `, [cleanCode]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-10 bg-black/80 backdrop-blur-md"
    >
      <div className="relative w-full md:max-w-5xl h-full md:h-auto md:aspect-video bg-[#050505] border-none md:border md:border-white/10 rounded-none md:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs uppercase tracking-widest font-bold">Evolution_{suggestion.id}</span>
            </div>
            
            <div className="hidden md:flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
              <button 
                onClick={() => setIsEditing(false)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${!isEditing ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}
              >
                Manifestation
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}
              >
                Source Code
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditing && (
              <button 
                onClick={handleSave}
                disabled={isSaving || code === suggestion.manifested_code}
                className="px-4 py-2 bg-green-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Save Sync
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-transparent relative overflow-hidden">
          {isEditing ? (
            <div className="absolute inset-0 flex flex-col bg-[#080808]">
              <textarea 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full h-full bg-transparent p-6 md:p-10 font-mono text-xs md:text-sm text-indigo-300 outline-none resize-none selection:bg-indigo-500/30 no-scrollbar"
                placeholder="// Enter your manifestation modifications here..."
              />
              <div className="p-4 border-t border-white/5 bg-black/40 text-[9px] text-white/20 uppercase tracking-[4px] font-black flex justify-between items-center">
                 <span>Collaborative Revision Layer active</span>
                 <span className="italic">Changes must be synchronized to persist</span>
              </div>
            </div>
          ) : (
            <iframe 
              ref={iframeRef}
              srcDoc={srcDoc}
              className="w-full h-full border-none"
              sandbox="allow-scripts"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// --- MAIN UI ---

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mind' | 'identity' | 'evolution'>('mind');
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dbFeatures, setDbFeatures] = useState<{ 
    pledged_by: boolean, 
    manifested_code: boolean,
    energy: boolean,
    parent_id: boolean,
    version: boolean,
    user_id: boolean
  }>({ pledged_by: true, manifested_code: true, energy: true, parent_id: true, version: true, user_id: true });
  const [isLoading, setIsLoading] = useState(false);
  const [isManifesting, setIsManifesting] = useState<number | null>(null);
  const [activeModule, setActiveModule] = useState<Suggestion | null>(null);
  const [isRepoOpen, setIsRepoOpen] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(1);
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});
  const [echoes, setEchoes] = useState<VoidEcho[]>([]);
  const [echoInput, setEchoInput] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const channelRef = useRef<any>(null);
  const isSyncing = useRef(false);

  // Identity State
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('soul_model') || "gemini-1.5-flash";
  });
  const [aiProvider, setAiProvider] = useState<'google' | 'openai' | 'anthropic' | 'custom' | 'web-llm' | 'gemini-nano' | 'mlc-mobile'>(() => {
    return (localStorage.getItem('soul_provider') as any) || "google";
  });

  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('soul_nexus_keys');
      const legacy = localStorage.getItem('evolutive_energy_key');
      const initial = saved ? JSON.parse(saved) : {};
      if (legacy && !initial.google) initial.google = legacy;
      return initial;
    } catch {
      return {};
    }
  });

  const userApiKey = useMemo(() => providerKeys[aiProvider] || "", [providerKeys, aiProvider]);

  // Sync Profile on Auth
  useEffect(() => {
    if (!session || !supabase) return;

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
                localStorage.setItem('soul_nexus_keys', JSON.stringify({ ...providerKeys, ...cloudKeys }));
             } catch {
                // If it's a legacy single string key
                setProviderKeys(prev => ({ ...prev, google: data.personal_api_key }));
                localStorage.setItem('soul_nexus_keys', JSON.stringify({ ...providerKeys, google: data.personal_api_key }));
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
    localStorage.setItem('soul_nexus_keys', JSON.stringify(newKeys));
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
    const saved = localStorage.getItem('soul_quota');
    return saved ? parseInt(saved) : 100;
  });

  useEffect(() => {
    localStorage.setItem('soul_quota', apiQuota.toString());
  }, [apiQuota]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [isRefining, setIsRefining] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'manifested' | 'pending' | 'mine'>('all');
  const [customEndpoint, setCustomEndpoint] = useState(() => {
    return localStorage.getItem('soul_custom_endpoint') || "";
  });
  const [webLlmProgress, setWebLlmProgress] = useState<string>("");
  const webLlmEngineRef = useRef<webllm.MLCEngine | null>(null);

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
    localStorage.setItem('soul_model', selectedModel);
    localStorage.setItem('soul_provider', aiProvider);
    localStorage.setItem('soul_custom_endpoint', customEndpoint);
  }, [selectedModel, aiProvider, customEndpoint]);

  // Derive ghosts from presence
  // Derive ghosts from presence
  const ghosts = useMemo(() => {
    return Object.entries(presenceData)
      .filter(([id]) => id !== session?.user?.id)
      .flatMap(([_, instances]) => Object.values(instances))
      .filter((p: any) => p.x !== undefined && p.y !== undefined);
  }, [presenceData, session]);

  const soulRank = useMemo(() => {
    if (!session) return { title: "Unidentified", color: "#ffffff", level: 0 };
    const myCreations = suggestions.filter(s => s.user_id === session.user.id);
    const manifests = myCreations.filter(s => s.status === 'manifested').length;
    const totalEco = myCreations.reduce((acc, curr) => acc + (curr.votes || 0), 0);
    
    if (manifests >= 5) return { title: "Grand Architect", color: "#6366f1", level: 4 };
    if (manifests >= 2) return { title: "Aether Weaver", color: "#ec4899", level: 3 };
    if (totalEco >= 10) return { title: "Echo Master", color: "#f59e0b", level: 2 };
    if (myCreations.length >= 1) return { title: "Idea Planter", color: "#10b981", level: 1 };
    return { title: "Void Wanderer", color: "#94a3b8", level: 0 };
  }, [suggestions, session]);

  // Unified AI Bridge
  const callUnifiedAI = async (prompt: string): Promise<string> => {
    try {
      const activeKey = providerKeys[aiProvider] || "";
      const googleKey = providerKeys['google'] || process.env.GEMINI_API_KEY;
      
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
          setWebLlmProgress("Wakeing Browser Soul...");
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

      if (!googleKey && aiProvider === 'google') throw new Error("No Google Energy Source Found.");
      if (!activeKey && (aiProvider === 'openai' || aiProvider === 'anthropic' || aiProvider === 'custom')) {
         if (aiProvider !== 'custom') throw new Error(`No ${aiProvider.toUpperCase()} Key Found.`);
      }

      if (aiProvider === 'google') {
        const genAI = new GoogleGenerativeAI(googleKey!);
        const model = genAI.getGenerativeModel({ model: selectedModel });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text() || "";
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

      throw new Error("Soul Link Provider Disconnected.");
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
    const key = customKey || providerKeys['google'] || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No Energy Source Found. Connect Identity or Provide Key.");
    return new GoogleGenerativeAI(key);
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
        localStorage.removeItem('soul_nexus_keys');
        localStorage.removeItem('evolutive_energy_key');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initial fetch and Project setup
  useEffect(() => {
    const init = async () => {
      try {
        await fetchSuggestions();
        await syncProject();
      } finally {
        setIsInitializing(false);
      }
    };
    init();
    
    const syncProject = async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;

      try {
        if (!supabase) return;
        
        console.log("Checking Project Config...");
        const { data, error } = await supabase.from('suggestions').select('*').eq('status', 'system_config').maybeSingle();
        
        if (error) {
          console.error("SyncProject Query Error (Status 400/406?):", error);
          if (error.code === 'PGRST116') {
             console.warn("Multiple system_config records found. This project might be in an inconsistent state.");
          }
          return;
        }

        if (data) {
          try {
            const config = JSON.parse(data.content || "{}") as ProjectConfig;
            setIsFinalized(!!config.is_finalized);
            
            // Re-identify creator if missing
            if (!config.creator_id && session?.user?.id) {
              console.log("Identifying new creator...");
              config.creator_id = session.user.id;
              await supabase.from('suggestions').update({ content: JSON.stringify(config) }).eq('id', data.id);
            }
            
            setCreatorId(config.creator_id || "");
            console.log("System Config Loaded. Creator ID:", config.creator_id);
          } catch (e) {
            console.error("Config Parse Error:", e);
          }
        } else if (session?.user?.id) {
          // Explicitly set as creator locally first to unblock UI
          setCreatorId(session.user.id);
          
          const config: ProjectConfig = {
            creator_id: session.user.id,
            is_finalized: false,
            epoch_name: "The Genesis"
          };
          
          // Try a minimalist insert first to avoid schema errors
          const { error: insertError } = await supabase.from('suggestions').insert([{
            content: JSON.stringify(config),
            status: 'system_config'
          }]);
          
          if (insertError) {
            console.error("SyncProject Insert Error (Schema mismatch?):", insertError);
          } else {
            setCreatorId(session.user.id);
          }
        }
      } catch (err) {
        console.error("SyncProject Global Exception:", err);
      }
    };

    if (supabase) {
      syncProject();

      // Real-time listener for suggestions and presence and echoes
      if (!channelRef.current) {
        channelRef.current = supabase.channel('void-sync');

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
          .on('broadcast', { event: 'echo' }, ({ payload }: any) => {
            setEchoes(prev => [...prev, payload].slice(-10));
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

      // Clear old echoes
      const interval = setInterval(() => {
        setEchoes(prev => prev.filter(e => Date.now() - e.createdAt < 5000));
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
        const title = s.content.startsWith('JSON:') ? JSON.parse(s.content.substring(5)).text : s.content;
        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Category Filter
        let matchesCategory = true;
        if (filterType === 'manifested') matchesCategory = s.status === 'manifested';
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
        System: You are the Evolutive Cloud Refinement Engine.
        Original Request: "${suggestion.content}"
        Refinement Request: "${refinementPrompt}"
        Original Code: ${suggestion.manifested_code}
        
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
        alert("Soul Capacity too low for refinement. Wait for recharge.");
        setIsRefining(null);
        return;
      }
      const text = await callUnifiedAI(prompt);
      const generatedCode = text.replace(/```jsx|```tsx|```javascript|```/g, '').trim();

      if (!generatedCode) {
        throw new Error("The consciousness returned an empty manifestation. Try refining your request.");
      }

      if (supabase) {
        // Create a new version of the app
        const insertData: any = { 
          content: `Improved version of: ${suggestion.content} (${refinementPrompt})`,
          status: 'manifested',
          votes: 0,
          energy: 100,
          manifested_code: generatedCode,
        };

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
          status: 'manifested', 
          manifested_code: generatedCode,
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
      // For this demo, we'll store it as a broadcast echo if table isn't ready,
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
        setSuggestions(data);
        if (data.length > 0) {
          const columns = Object.keys(data[0]);
          setDbFeatures({
            pledged_by: columns.includes('pledged_by'),
            manifested_code: columns.includes('manifested_code'),
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
      alert("Soul Capacity depleted. Wait for the consciousness to recharge.");
      return;
    }

    const rawInput = input.trim();
    setInput("");
    setIsManifesting(0);
    
    try {
      const prompt = `Refine this app idea into a clear, concise one-sentence manifestation prompt. Keep it mystical and technical.
        Original: "${rawInput}"
        Manifestation:`;

      let content = rawInput;
      try {
        const text = await callUnifiedAI(prompt);
        content = text.trim() || rawInput;
      } catch (aiErr) {
        console.warn("Consciousness Refinement Link failed (Connection error?). Resting on raw intent.", aiErr);
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
        setSuggestions([data[0], ...suggestions]);
      }
    } catch (err: any) {
      console.error("Error planting intent:", err);
      const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      alert(`Manifestation Link Failure: ${errorMsg}`);
    } finally {
      setIsManifesting(null);
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
        alert("Please set your Energy Key in the Account tab to power manifestations.");
        setActiveTab('identity');
      }
      return;
    }
    if (isRefining) return;
    
    // Schema-aware data extraction
    let pledgedBy = s.pledged_by || [];
    let currentEnergy = s.energy || 0;

    if (s.content.startsWith('JSON:')) {
      try {
        const meta = JSON.parse(s.content.substring(5));
        pledgedBy = meta.pledged_by || pledgedBy;
        currentEnergy = meta.energy || currentEnergy;
      } catch(e) {}
    }

    const hasPledged = pledgedBy.includes(session.user.id);
    const newEnergy = Math.min(100, currentEnergy + (isCreator ? 100 : 25));
    const shouldManifest = newEnergy >= 100;

    try {
      setIsRefining(s.id);
      const newPledgedBy = hasPledged ? pledgedBy : [...pledgedBy, session.user.id];
      
      let manifestedCode = s.manifested_code;
      let newStatus = s.status;

      if (shouldManifest && s.status === 'pending') {
        const prompt = `Create a functional, professional React component titled "App" for this idea: ${s.content.startsWith('JSON:') ? JSON.parse(s.content.substring(5)).text : s.content}. 
        Use Tailwind CSS. Return ONLY the code, no markdown wrappers. Include animations using framer-motion (window.Motion). 
        Assume you have access to: window.React, window.Motion, window.Recharts, window.d3, window.confetti, window.lucide.`;
        
        const result = await callUnifiedAI(prompt);
        manifestedCode = result.replace(/```jsx|```tsx|```javascript|```/g, '').trim();
        newStatus = 'manifested';
      }

      const updateData: any = { status: newStatus };
      if (manifestedCode) updateData.manifested_code = manifestedCode;
      
      // Only include fields that exist in DB
      if (dbFeatures.energy) updateData.energy = newEnergy;
      if (dbFeatures.pledged_by) updateData.pledged_by = newPledgedBy;

      // Wrap missing fields into content
      if (!dbFeatures.energy || !dbFeatures.pledged_by) {
        const meta = s.content.startsWith('JSON:') ? JSON.parse(s.content.substring(5)) : { text: s.content };
        if (!dbFeatures.energy) meta.energy = newEnergy;
        if (!dbFeatures.pledged_by) meta.pledged_by = newPledgedBy;
        updateData.content = 'JSON:' + JSON.stringify(meta);
      }
      
      const { error: updateError } = await supabase.from('suggestions').update(updateData).eq('id', s.id);
      if (updateError) throw updateError;
      
      if (shouldManifest) {
        setApiQuota(prev => Math.max(0, prev - 10));
        // Update local state for immediate launch
        const updatedS = { ...s, status: 'manifested' as const, manifested_code: manifestedCode };
        setSuggestions(prev => prev.map(p => p.id === s.id ? updatedS : p));
        setActiveModule(updatedS);
      }
    } catch (err: any) {
      console.error("Error during manifestation cycle:", err);
      alert("The consciousness bridge flickered. Try again.");
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

  const sendEcho = (e: React.FormEvent) => {
    e.preventDefault();
    if (!echoInput.trim() || !supabase || !channelRef.current) return;
    
    const newEcho: VoidEcho = {
      id: Math.random().toString(36),
      userId: session?.user.id || 'anonymous',
      text: echoInput.trim(),
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      createdAt: Date.now()
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'echo',
      payload: newEcho
    });

    setEchoInput("");
  };

  const manifestEvolution = async (suggestion: Suggestion) => {
    if (isManifesting) return;
    
    try {
      setIsManifesting(suggestion.id);
      
      const prompt = `
        System: You are the Evolutive Cloud Manifestation Engine. 
        Objective: Generate professional-grade, high-complexity interactive applications.
        Context: This app was requested by the community. ${suggestion.pledged_by?.length || 0} users supported this idea.
        
        Task: Create a beautiful, polished, and functionally complex React application for: "${suggestion.content}"
        
        Capabilities & Libraries:
        - React 18 (Standard hooks available globally: useState, useEffect, useMemo, etc.)
        - Tailwind CSS (Full utility suite)
        - window.Motion (Framer Motion equivalent for smooth layouts and animations)
        - window.Recharts (Professional charting: LineChart, AreaChart, BarChart, etc.)
        - window.d3 (Powerful data manipulation and visualization)
        - window.confetti (Visual celebrations)
        - window.lucide (Global icon set access)

        Design Style:
        - Modern SaaS / Dark Laboratory aesthetic.
        - Deep shadows, glassmorphism, responsive grids.
        - Interactive elements with feedback (hover transitions, active scales).
        - Multi-section layouts (e.g. Header, Sidebar, Dashboard Grid) if appropriate.

        Complexity Requirements:
        - Do not build "hello world" versions. Build "production-ready" pages.
        - If data is involved, include realistic mock data sets.
        - Use sophisticated state management for internal transitions.

        Constraints:
        - Output ONLY the component code.
        - The component must be named "App".
        - Use Tailwind CSS for all styling.
        - The container should be transparent or dark to work with the Evolutive Cloud background.
        - Return ONLY the code block, no markdown formatting.
      `;

      if (apiQuota < 20) {
        alert("Soul Capacity too low for manifestation. Wait for recharge.");
        setIsManifesting(null);
        return;
      }
      const text = await callUnifiedAI(prompt);
      const generatedCode = text.replace(/```jsx|```tsx|```javascript|```/g, '').trim();

      if (!generatedCode) {
        throw new Error("The void returned no code. Manifestation failed.");
      }

      if (supabase) {
        const updateData: any = { status: 'manifested' };
        
        if (dbFeatures.manifested_code) {
          updateData.manifested_code = generatedCode;
        } else {
          const meta = suggestion.content.startsWith('JSON:') ? JSON.parse(suggestion.content.substring(5)) : { text: suggestion.content };
          meta.manifested_code = generatedCode;
          meta.status = 'manifested';
          updateData.content = 'JSON:' + JSON.stringify(meta);
        }

        const { error } = await supabase
          .from('suggestions')
          .update(updateData)
          .eq('id', suggestion.id);
        
        if (error) throw error;
      }

      setApiQuota(prev => Math.max(0, prev - 15));
      const updatedSuggestion = { ...suggestion, status: 'manifested' as const, manifested_code: generatedCode };
      setSuggestions(suggestions.map(s => s.id === suggestion.id ? updatedSuggestion : s));
      setActiveModule(updatedSuggestion);

    } catch (err: any) {
      console.error("Generation failure:", err);
      alert("Generation failed. The request may be too complex or the server is busy.");
    } finally {
      setIsManifesting(null);
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
            <h1 className="mt-12 text-2xl md:text-3xl font-black uppercase tracking-[10px] text-white">Neural Pulse</h1>
            <p className="mt-4 text-[10px] md:text-sm text-indigo-400 font-bold uppercase tracking-[4px] animate-pulse">Syncing with Collective Mind...</p>
            <div className="mt-20 w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-indigo-500"
                 animate={{ x: [-200, 200] }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- BACKGROUND BLOBS & GLOW --- */}
      <div className="void-glow" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-pink-900/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[150px] pointer-events-none -z-10" />
      
      {/* --- HUD LAYER --- */}
      {/* --- VOID ECHOES LAYER --- */}
      <AnimatePresence>
        {echoes.map((echo) => (
          <motion.div
            key={echo.id}
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: -50 }}
            exit={{ opacity: 0, scale: 1.5, y: -100 }}
            className="fixed z-50 pointer-events-none"
            style={{ left: echo.x, top: echo.y }}
          >
            <div className="bg-indigo-900/40 border-2 border-indigo-400 backdrop-blur-md px-5 py-3 rounded-none shadow-[4px_4px_0px_#818cf8]">
              <span className="text-[12px] font-black text-white tracking-[2px] uppercase">{echo.text}</span>
              <div className="text-[9px] text-indigo-300 font-bold uppercase mt-1 border-t border-indigo-500/30 pt-1">Echo Confirmed</div>
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
          EVOLUTIVE<br />CLOUD
        </h1>
            <div className="mt-2 flex flex-col gap-1 md:gap-2">
          <div className="text-[8px] md:text-[11px] tracking-[2px] md:tracking-[4px] text-indigo-400 uppercase font-bold">
            Evolutive Cloud . Online
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
          <span className="[writing-mode:vertical-lr] text-[7px] md:text-[8px] font-black uppercase tracking-[2px] md:tracking-[3px] text-white/40 group-hover:text-white transition-colors">Manifests</span>
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
                {displaySuggestions.filter(s => s.status === 'manifested').length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center text-center opacity-20">
                    <History className="w-10 h-10 mb-4" />
                    <p className="text-[10px] uppercase font-black tracking-widest leading-loose">No manifestations<br/>yet recorded in this epoch.</p>
                  </div>
                )}
                {displaySuggestions
                  .filter(s => s.status === 'manifested')
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
                          <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Manifested</span>
                        </div>
                        <h3 className="text-[13px] font-bold text-white/90 leading-relaxed italic line-clamp-2">"{title}"</h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (s.manifested_code) {
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
                              if (s.manifested_code) {
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
        
        {/* Manifested App Nodes */}
        {suggestions
          .filter(s => s.status === 'manifested' && s.manifested_code)
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

      {/* --- HUD: ECHO INPUT --- */}
      <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-20 w-[90%] sm:w-[400px]">
        <form onSubmit={sendEcho} className="relative group">
          {/* Input is circular */}
          <input 
            type="text"
            placeholder="Broadcast to the void..."
            value={echoInput}
            onChange={(e) => setEchoInput(e.target.value)}
            className="w-full bg-white/5 border-2 border-white/10 px-6 md:px-8 py-4 md:py-5 rounded-full text-[10px] md:text-[12px] text-white focus:border-indigo-500 focus:bg-white/10 outline-none text-center backdrop-blur-md transition-all placeholder:text-white/20 font-black uppercase tracking-widest"
          />
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity -z-10" />
          <button type="submit" className="hidden" />
        </form>
      </div>

      {/* --- CUBE INTERFACE (THE MIND) --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-0 m-auto w-full h-full md:w-[90vw] md:h-[85vh] bg-[#050510]/95 backdrop-blur-2xl border-none md:border-2 md:border-white/10 flex flex-col z-50 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden rounded-none md:rounded-none"
          >
            {/* Mind Panel is a Cubic Structure (Cubic/Sharp) */}
            <div className="flex flex-col md:flex-row border-b border-white/10 p-4 md:p-6 shrink-0 bg-white/5 items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 w-full md:w-auto">
                    <div className="flex gap-6 md:gap-12 overflow-x-auto w-full md:w-auto px-2 md:px-0 no-scrollbar">
                  {['mind', 'evolution', 'identity'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`text-[10px] md:text-[12px] font-black uppercase tracking-[3px] md:tracking-[6px] transition-all relative py-2 whitespace-nowrap ${activeTab === tab ? 'text-white' : 'text-white/20'}`}
                    >
                      {tab === 'mind' ? 'Shared' : tab === 'evolution' ? 'Evolution' : 'Account'}
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
                      SOUL <span className="text-white/80">{apiQuota}%</span>
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 md:static hover:rotate-90 transition-transform p-2"><X className="w-5 md:w-6 h-5 md:h-6 text-white/40" /></button>
            </div>

            {/* Suggestions Root - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-black/40 custom-scrollbar">
              {activeTab === 'mind' ? (
                <div className="max-w-6xl mx-auto p-6">
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-between">
                    <div className="relative w-full max-w-sm group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Search the void..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 text-[11px] text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all uppercase tracking-widest font-black"
                      />
                    </div>
                    
                    <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/10 shrink-0">
                      {(['all', 'manifested', 'pending', 'mine'] as const).map((type) => (
                        <button 
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-white/40 hover:text-white'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Explorer Header */}
                  <div className="hidden md:grid grid-cols-[1fr_120px_100px_160px] gap-4 px-6 py-3 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] font-black text-white/30 mb-4">
                    <div className="flex items-center gap-2 italic"><Box className="w-3 h-3" /> Idea / Manifestation</div>
                    <div className="text-center">Complexity</div>
                    <div className="text-center">Status</div>
                    <div className="text-right">Operations</div>
                  </div>

                  <div className="flex flex-col gap-3">
                  {displaySuggestions.length === 0 && (
                    <div className="py-12 md:py-20 text-center border-2 border-dashed border-white/5 rounded-[1.5rem] md:rounded-[2rem]">
                      <p className="text-white/20 italic tracking-widest text-[10px] md:text-xs uppercase px-6">The collective mind is currently silent. Awaiting a spark...</p>
                    </div>
                  )}
                  {displaySuggestions.map((s, idx) => {
                    let processedS = { ...s };
                    let displayContent = s.content;

                    if (s.content.startsWith('JSON:')) {
                      try {
                        const meta = JSON.parse(s.content.substring(5));
                        displayContent = meta.text || "Untitled Idea";
                        processedS = { ...s, ...meta };
                      } catch(e) {}
                    }

                    const isApp = !!processedS.manifested_code;

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
                                {displayContent}
                              </h3>
                              <div className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-widest mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className={isApp ? 'text-indigo-500' : ''}>#{s.id}</span> 
                                <span className="hidden md:inline w-1 h-1 rounded-full bg-white/10" />
                                <span>{isApp ? `Version v${processedS.version || 1}` : 'Proposal Draft'}</span>
                                {(processedS.pledged_by || []).length > 0 && (
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
                                 animate={{ width: `${processedS.energy || 0}%` }}
                                 className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                               />
                             </div>
                             <span className="text-[7px] md:text-[9px] font-mono text-white/40 tracking-tighter uppercase whitespace-nowrap">
                               {processedS.votes || 0} Votes / {processedS.energy || 0}% Power
                             </span>
                          </div>

                          {/* Data Column: Status */}
                          <div className="flex justify-start md:justify-center">
                             <div className={`px-2 py-0.5 md:py-1 rounded text-[7px] md:text-[8px] font-black uppercase tracking-widest border ${
                               isApp 
                               ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                               : 'bg-white/5 text-white/30 border-white/10'
                             }`}>
                               {processedS.status}
                             </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-2 md:pr-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                            {isApp ? (
                              <>
                                <button onClick={() => setActiveModule(processedS as any)} className="flex-1 md:flex-none p-2 md:p-2.5 rounded-lg bg-white text-black hover:scale-105 md:hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 group/launch" title="Launch App">
                                  <Play className="w-3.5 md:w-4 h-3.5 md:h-4 fill-current group-hover/launch:animate-pulse" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Execute</span>
                                </button>
                                {(isFinalized || isCreator) && (
                                  <button 
                                    onClick={() => {
                                      const prompt = window.prompt("Suggest an evolution for this app:");
                                      if (prompt) handleRefine(processedS, prompt);
                                    }}
                                    disabled={!!isRefining}
                                    className="p-2 md:p-2.5 rounded-lg border border-white/10 text-white/60 hover:bg-white hover:text-black transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                                    title="Evolve"
                                  >
                                    {isRefining === s.id ? <Loader2 className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin text-indigo-400" /> : <RefreshCw className="w-3.5 md:w-4 h-3.5 md:h-4" />}
                                    <span className="text-[9px] uppercase font-black tracking-widest md:hidden">Evolve</span>
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    const msg = window.prompt("Ask for a professional review (Comment will be pinned):");
                                    if (msg) postAdvice(s.id, msg);
                                  }}
                                  className="p-2 md:p-2.5 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                  title="Request Review"
                                >
                                  <MessageSquare className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                  <span className="text-[9px] uppercase font-black tracking-widest md:hidden">Review</span>
                                </button>
                              </>
                            ) : (
                              processedS.status === 'pending' && (
                                <>
                                  {!isCreator && (
                                    <button 
                                      onClick={() => handleVote(s.id, processedS.votes)}
                                      className="flex-1 md:flex-none p-2 md:p-2.5 rounded-lg border border-white/10 text-white/40 hover:border-white hover:text-white transition-all hover:bg-white/5 flex items-center justify-center gap-2"
                                      title="Upvote"
                                    >
                                      <ChevronUp className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Vote</span>
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handlePledge(processedS)}
                                    disabled={!!isRefining || (!isCreator && !userApiKey)}
                                    className={`flex-1 md:flex-none p-2 md:p-2.5 rounded-lg border flex items-center justify-center transition-all gap-2 relative ${
                                      isCreator 
                                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 border-indigo-500 text-white hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.3)]' 
                                      : 'bg-white/5 border-white/10 text-yellow-500/50 hover:bg-yellow-500 hover:text-black'
                                    }`}
                                    title={isCreator ? "Manifest Immediately" : "Manifest with Energy"}
                                  >
                                    {isRefining === s.id ? (
                                      <Loader2 className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin" />
                                    ) : isCreator ? (
                                      <Zap className="w-3.5 md:w-4 h-3.5 md:h-4 fill-current animate-pulse text-yellow-400" />
                                    ) : (
                                      <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                    )}
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                      {isRefining === s.id ? 'Manifesting...' : isCreator ? 'Manifest Now' : 'Power-Up'}
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

                            {(isCreator || (processedS.user_id && session?.user?.id && processedS.user_id === session.user.id)) && (
                              <button 
                                onClick={() => {
                                  if (window.confirm("This action is irreversible. Delete from collective memory?")) {
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
                  }} 
                />
              ) : (
                <div className="max-w-md mx-auto space-y-12 py-20">
                  {!session ? (
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
                            alt="Soul Avatar"
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
                            style={{ backgroundColor: `${soulRank.color}20`, color: soulRank.color, borderColor: `${soulRank.color}40` }}
                          >
                            {soulRank.title}
                          </div>
                          <div className="flex gap-1 justify-center">
                            {[...Array(5)].map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full ${i < soulRank.level ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-white/10'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-lg mx-auto">
                        <div className="p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-3xl group">
                          <div className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-widest font-black mb-1 md:mb-2 group-hover:text-indigo-400 transition-colors text-center md:text-left">Shared</div>
                          <div className="text-xl md:text-2xl text-white font-black tracking-tighter text-center md:text-left">
                            {suggestions.filter(s => s.user_id === session.user.id).length}
                          </div>
                        </div>
                        <div className="p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-3xl group">
                          <div className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-widest font-black mb-1 md:mb-2 group-hover:text-pink-400 transition-colors text-center md:text-left">Manifests</div>
                          <div className="text-xl md:text-2xl text-white font-black tracking-tighter text-center md:text-left">
                            {suggestions.filter(s => s.user_id === session.user.id && s.status === 'manifested').length}
                          </div>
                        </div>
                        <div className="p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-3xl group">
                          <div className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-widest font-black mb-1 md:mb-2 group-hover:text-yellow-400 transition-colors text-center md:text-left">Soul Power</div>
                          <div className="text-xl md:text-2xl text-white font-black tracking-tighter text-center md:text-left">
                            {suggestions.filter(s => s.user_id === session.user.id).reduce((acc, curr) => acc + (curr.votes || 0), 0)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/[0.03] p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white/5 space-y-8 text-left">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black uppercase tracking-[4px] text-white">AI Nexus</h4>
                            <p className="text-[8px] text-white/30 uppercase tracking-widest font-medium">Switch & Monitor Evolution Bridges</p>
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
                                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Swift)</option>
                                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep)</option>
                                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Exp)</option>
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
                                {(aiProvider === 'google' ? ['gemini-2.0-flash-exp', 'gemini-1.5-flash'] : 
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

                          <div className="p-6 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-[2rem] space-y-4">
                             <div className="flex items-center gap-3 text-indigo-400">
                               <div className="p-1.5 rounded-lg bg-indigo-500/10"><Info className="w-3.5 h-3.5" /></div>
                               <span className="text-[10px] font-black uppercase tracking-[4px]">Soul Connection Guide</span>
                             </div>
                             <div className="text-[9px] md:text-[10px] text-white/40 leading-relaxed uppercase tracking-widest space-y-3 font-medium">
                                {aiProvider === 'google' && <p>Primary neural bridge. Built for Architectural manifest. Key at <a href="https://aistudio.google.com" target="_blank" className="text-indigo-400 underline">Google AI Studio</a>.</p>}
                                {aiProvider === 'openai' && <p>Standard intelligence lattice. Production grade logic. Key at <a href="https://platform.openai.com" target="_blank" className="text-pink-400 underline">OpenAI Portal</a>.</p>}
                                {aiProvider === 'anthropic' && <p>Claude 3.5 Sonnet support for human-centric manifests. Key at <a href="https://console.anthropic.com" target="_blank" className="text-yellow-400 underline">Anthropic Console</a>.</p>}
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
              {activeTab === 'mind' ? (
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
                      placeholder="Manifest an idea..."
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

      <AnimatePresence>
        {activeModule && (
          <ModulePlayer 
            suggestion={activeModule} 
            onClose={() => setActiveModule(null)} 
            onSave={async (newCode) => {
              if (!supabase) return;
              const { error } = await supabase.from('suggestions').update({ manifested_code: newCode }).eq('id', activeModule.id);
              if (error) throw error;
              setSuggestions(prev => prev.map(s => s.id === activeModule.id ? { ...s, manifested_code: newCode } : s));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
