/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronUp, 
  MessageSquare, 
  Plus, 
  X, 
  Activity, 
  Database, 
  Zap, 
  Play, 
  Eye, 
  Code,
  Sparkles,
  Loader2
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { GoogleGenAI } from "@google/genai";
import { User, Session } from "@supabase/supabase-js";
import { User as UserIcon, LogOut, ShieldCheck, Key } from "lucide-react";

// --- TYPES ---
interface Suggestion {
  id: number;
  content: string;
  votes: number;
  status: string;
  manifested_code?: string;
  created_at?: string;
}

interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  personal_api_key?: string;
}

// --- 3D COMPONENTS ---

function EvolutiveSeed({ onClick, isOpen }: { onClick: () => void, isOpen: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.15;
    const pulse = 1 + Math.sin(t * (isOpen ? 2 : 0.5)) * (isOpen ? 0.1 : 0.05);
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

// --- MODULE PLAYER (SANDBOX) ---

function ModulePlayer({ code, onClose }: { code: string, onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background: transparent; color: white; margin: 0; font-family: sans-serif; }
          .container { padding: 20px; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          ${code}
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(<App />);
        </script>
      </body>
    </html>
  `, [code]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-10 bg-black/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-5xl aspect-video bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs uppercase tracking-widest font-bold">Manifested Module</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 bg-transparent">
          <iframe 
            ref={iframeRef}
            srcDoc={srcDoc}
            className="w-full h-full border-none"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </motion.div>
  );
}

// --- MAIN UI ---

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mind' | 'identity'>('mind');
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isManifesting, setIsManifesting] = useState<number | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  // Identity State
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('evolutive_energy_key') || "");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // Gemini AI Provider
  const getAI = (customKey?: string) => {
    const key = customKey || userApiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No Energy Source Found. Connect Identity or Provide Key.");
    return new GoogleGenAI({ apiKey: key });
  };

  // Initial fetch and Auth listener
  useEffect(() => {
    fetchSuggestions();
    
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const fetchSuggestions = async () => {
    if (!supabase) {
      setSuggestions([
        { id: 1, content: "Add a floating neon digital clock in the void", votes: 45, status: "pending", manifested_code: `
          function App() {
            const [time, setTime] = React.useState(new Date());
            React.useEffect(() => {
              const timer = setInterval(() => setTime(new Date()), 1000);
              return () => clearInterval(timer);
            }, []);
            return (
              <div className="flex items-center justify-center h-screen">
                <div className="text-center p-10 border border-indigo-500/30 bg-indigo-500/10 rounded-3xl backdrop-blur-xl">
                  <h2 className="text-6xl font-mono text-indigo-400 font-bold drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]">
                    {time.toLocaleTimeString()}
                  </h2>
                  <p className="mt-4 text-white/40 uppercase tracking-widest text-xs">Syncing with Temporal Grid</p>
                </div>
              </div>
            );
          }
        ` },
        { id: 2, content: "Create a simple atmospheric ambient sound controller", votes: 8, status: "pending" },
        { id: 3, content: "Grid map showing the total energy of all suggestions", votes: 24, status: "pending" },
      ]);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('votes', { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (err: any) {
      console.error("Error fetching root memory:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!supabase) return;
    setAuthError(null);
    try {
      const { error } = isSignUp 
        ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
        : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      
      if (error) throw error;
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleSuggest = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");

    if (!supabase) {
      setSuggestions([{ id: Date.now(), content, votes: 0, status: "pending" }, ...suggestions]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('suggestions')
        .insert([{ content }])
        .select();

      if (error) throw error;
      if (data) setSuggestions([data[0], ...suggestions]);
    } catch (err: any) {
      console.error("Error planting intent:", err);
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
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, votes: currentVotes + 1 } : s).sort((a,b) => b.votes-a.votes));
    } catch (err: any) {
      console.error("Error casting vote:", err);
    }
  };

  const manifestEvolution = async (suggestion: Suggestion) => {
    if (isManifesting) return;
    
    try {
      setIsManifesting(suggestion.id);
      
      const prompt = `
        System: You are the Evolutive Cloud Manifestation Engine. 
        Task: Create a beautiful, minimalist React component for the following user intent: "${suggestion.content}"
        
        Constraints:
        - Output ONLY the component code.
        - The component must be named "App".
        - Use Tailwind CSS for all styling.
        - Assume React and Tailwind are already loaded in the environment.
        - The container should be transparent to work with a dark background.
        - Ensure clear typography and atmospheric feel.
        - Return ONLY the code block, no markdown formatting.
      `;

      const ai = getAI();
      const result = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt
      });

      const generatedCode = result.text.replace(/```jsx|```tsx|```javascript|```/g, '').trim();

      if (supabase) {
        await supabase
          .from('suggestions')
          .update({ 
            status: 'manifested', 
            manifested_code: generatedCode 
          })
          .eq('id', suggestion.id);
      }

      setSuggestions(suggestions.map(s => s.id === suggestion.id ? { ...s, status: 'manifested', manifested_code: generatedCode } : s));
      setActiveModule(generatedCode);

    } catch (err: any) {
      console.error("Manifestation failure:", err);
      alert("The Mind failed to manifest. Intent is complex or void is unstable.");
    } finally {
      setIsManifesting(null);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#020205] text-white selection:bg-indigo-500/30 overflow-hidden font-sans">
      
      {/* --- BACKGROUND BLOBS & GLOW --- */}
      <div className="void-glow" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      
      {/* --- HUD LAYER --- */}
      <header className="absolute top-10 left-10 z-10 pointer-events-none">
        <h1 className="text-[64px] font-[900] tracking-[-2px] leading-[0.9] text-white/15 uppercase">
          EVOLUTIVE<br />CLOUD
        </h1>
        <div className="mt-2 flex flex-col gap-2">
          <div className="text-[11px] tracking-[4px] text-indigo-400 uppercase font-bold">
            Phase: Manifestation . 04
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[9px] text-white/40 uppercase tracking-widest font-mono">
              <Activity className="w-3 h-3" />
              <span>Seed: {isOpen ? "Expanding" : "Dormant"}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-green-500/60 uppercase tracking-widest font-mono">
              <Database className="w-3 h-3" />
              <span>Root: {supabase ? "Connected" : "Simulated"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- ENERGY METER --- */}
      <div className="absolute bottom-10 left-10 z-10 w-[200px] pointer-events-none">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[9px] uppercase tracking-wider text-white/40">Energy Usage</span>
          <span className="text-[9px] text-white/20">238,217 / 262,144</span>
        </div>
        <div className="w-full h-[2px] bg-white/10">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "91%" }}
            className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" 
          />
        </div>
      </div>

      {/* --- 3D INTERACTION --- */}
      {!isOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
          <motion.p 
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-indigo-300/40 text-[10px] font-bold tracking-[6px] uppercase"
          >
            Touch the Origin
          </motion.p>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 0, 5], fov: 75 }} className="cursor-grab active:cursor-grabbing">
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#6366f1" />
        <EvolutiveSeed onClick={() => setIsOpen(true)} isOpen={isOpen} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
      </Canvas>

      {/* --- CUBE INTERFACE (THE MIND) --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-10 right-10 z-20 w-[380px] h-[520px] flex flex-col bg-[#0a0a1e]/80 backdrop-blur-[25px] border border-indigo-500/30 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* Mind Header */}
            <div className="p-6 border-b border-indigo-500/30 flex justify-between items-start">
              <div>
                <h2 className="text-[10px] uppercase tracking-[2px] text-white/40 mb-1">Structure 4.0</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveTab('mind')} 
                    className={`text-[18px] font-medium transition-colors ${activeTab === 'mind' ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
                  >
                    The Mind
                  </button>
                  <button 
                    onClick={() => setActiveTab('identity')} 
                    className={`text-[18px] font-medium transition-colors ${activeTab === 'identity' ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
                  >
                    Identity
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/5 rounded-full transition-colors group"
              >
                <X className="w-5 h-5 text-white/30 group-hover:text-indigo-400" />
              </button>
            </div>

            {/* Suggestions Root - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {activeTab === 'mind' ? (
                <div className="space-y-4">
                  {suggestions.map((s, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={s.id}
                      className="group relative p-4 bg-white/[0.03] border border-indigo-500/20 hover:border-indigo-500/40 transition-all rounded-xl"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={() => handleVote(s.id, s.votes)} className="text-indigo-400/60 hover:text-indigo-400 active:scale-90 transition-all">
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <span className="text-xs font-mono font-bold text-white/40">{s.votes}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">
                              {s.status === 'manifested' ? 'App Manifested' : 'Suggestion Pending'}
                            </span>
                            
                            <div className="flex gap-2">
                              {s.manifested_code && (
                                <button onClick={() => setActiveModule(s.manifested_code!)} className="text-[9px] text-indigo-300 hover:text-white uppercase font-bold transition-colors">
                                  Run
                                </button>
                              )}
                              {s.votes >= 20 && s.status === 'pending' && (
                                <button 
                                  onClick={() => manifestEvolution(s)} 
                                  disabled={!!isManifesting}
                                  className="text-[10px] text-indigo-400 hover:text-white uppercase font-bold transition-all disabled:opacity-50"
                                >
                                  {isManifesting === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Manifest'}
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[12px] text-white/80 leading-snug font-light line-clamp-2">{s.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-8 py-4">
                  {!session ? (
                    <div className="text-center space-y-6 pt-5">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                        <UserIcon className="w-8 h-8 text-white/20" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Anchor Your Soul</h3>
                        <p className="text-[10px] text-white/40 leading-relaxed px-10">
                          Connecting identity allows you to commit Energy (API Keys).
                        </p>
                      </div>

                      {/* Email Auth Form */}
                      <div className="space-y-3 px-2">
                        <input 
                          type="email"
                          placeholder="Temporal Email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-3 text-[11px] text-white focus:border-indigo-500/50 outline-none"
                        />
                        <input 
                          type="password"
                          placeholder="Soul Secret"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-3 text-[11px] text-white focus:border-indigo-500/50 outline-none"
                        />
                        {authError && <p className="text-[9px] text-red-500/80 uppercase font-bold">{authError}</p>}
                        
                        <button 
                          onClick={handleEmailAuth}
                          className="w-full py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all"
                        >
                          {isSignUp ? "Create Account" : "Sign In"}
                        </button>

                        <button 
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-[9px] text-white/30 hover:text-white/60 uppercase tracking-widest font-bold underline underline-offset-4"
                        >
                          {isSignUp ? "Already have a soul?" : "Register your soul"}
                        </button>
                      </div>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                        <div className="relative flex justify-center"><span className="bg-[#0a0a1e] px-4 text-[9px] text-white/20 uppercase tracking-widest font-bold">Or use Core Identity</span></div>
                      </div>

                      <button 
                        onClick={() => supabase?.auth.signInWithOAuth({ provider: 'google' })}
                        className="w-full px-6 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-indigo-300 transition-all flex items-center justify-center gap-2"
                      >
                        Sign in with Google
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                        <img src={session.user.user_metadata.avatar_url} className="w-12 h-12 rounded-full border border-indigo-500/30" referrerPolicy="no-referrer" />
                        <div className="flex-1">
                          <h3 className="text-xs font-bold text-white">{session.user.user_metadata.full_name}</h3>
                          <p className="text-[10px] text-white/40 font-mono">Linked Soul: {session.user.id.slice(0, 8)}...</p>
                        </div>
                        <button onClick={() => supabase?.auth.signOut()} className="p-2 hover:bg-red-500/20 text-red-500/60 hover:text-red-500 rounded-lg transition-colors">
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-bold tracking-widest">Energy Configuration</span>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase text-white/40 ml-1">Gemini Energy Source (API Key)</label>
                          <div className="relative">
                            <input 
                              type="password"
                              value={userApiKey}
                              onChange={(e) => {
                                setUserApiKey(e.target.value);
                                localStorage.setItem('evolutive_energy_key', e.target.value);
                              }}
                              placeholder="Paste Key to Empower the Cloud..."
                              className="w-full bg-white/5 border border-white/10 p-3 text-[11px] text-white focus:outline-none focus:border-indigo-500/50"
                            />
                            <Key className="absolute right-3 top-3 w-4 h-4 text-white/10" />
                          </div>
                          <p className="text-[9px] text-white/20 italic p-1">
                            Your key is stored locally and used only for your manifest actions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Intent Input area */}
            <div className="p-6 border-t border-indigo-500/30">
              {activeTab === 'mind' ? (
                <div className="flex gap-3">
                  <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSuggest()}
                    placeholder="Describe an evolution..."
                    className="flex-1 bg-white/[0.05] border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-indigo-500/50 placeholder:text-white/20"
                  />
                  <button 
                    onClick={handleSuggest}
                    className="w-11 h-11 bg-indigo-500 flex items-center justify-center transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">Identity Management Layer</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModule && (
          <ModulePlayer code={activeModule} onClose={() => setActiveModule(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
