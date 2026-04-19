/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import * as Tone from "tone";
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
  Loader2,
  Users,
  Timer,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  History as HistoryIcon
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
  energy: number; // 0 to 100
  status: string;
  manifested_code?: string;
  created_at?: string;
  pledged_by?: string[]; // user ids
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

// --- SOUND ENGINE ---
class HarmonicVoid {
  private drone: Tone.Oscillator | null = null;
  private lfo: Tone.LFO | null = null;
  private filter: Tone.Filter | null = null;
  private started = false;

  async start() {
    if (this.started) return;
    await Tone.start();
    
    this.filter = new Tone.Filter(200, "lowpass").toDestination();
    this.drone = new Tone.Oscillator("A1", "sawtooth").connect(this.filter);
    this.lfo = new Tone.LFO(0.1, 100, 500).connect(this.filter.frequency);
    
    this.drone.volume.value = -20;
    this.drone.start();
    this.lfo.start();
    this.started = true;
  }

  updatePitch(userCount: number) {
    if (!this.drone) return;
    // Pitch rises with more users
    const freq = 55 + (userCount * 5); // A1 is 55Hz
    this.drone.frequency.rampTo(freq, 2);
  }

  playBlip() {
    const synth = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    synth.triggerAttackRelease("C5", "16n");
  }

  playManifest() {
    const synth = new Tone.PolySynth().toDestination();
    synth.triggerAttackRelease(["C4", "E4", "G4", "B4"], "4n");
  }

  stop() {
    this.drone?.stop();
    this.lfo?.stop();
  }
}

const sound = new HarmonicVoid();

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

function ModuleNode({ suggestion, onRun }: { suggestion: Suggestion, onRun: (code: string) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
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

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed + offset;
    meshRef.current.position.x = Math.cos(t) * radius;
    meshRef.current.position.z = Math.sin(t) * radius;
    meshRef.current.position.y = yOffset + Math.sin(t * 2) * 0.5;
    meshRef.current.rotation.y += 0.01;
    meshRef.current.rotation.x += 0.005;
  });

  return (
    <mesh 
      ref={meshRef} 
      onClick={(e) => {
        e.stopPropagation();
        if (suggestion.manifested_code) onRun(suggestion.manifested_code);
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[0.3, 0.3, 0.3]} />
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
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    matRef.current.size = 0.1 + Math.sin(t * 0.5) * 0.05;
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
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
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
  const [activeUsersCount, setActiveUsersCount] = useState(1);
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});
  const [echoes, setEchoes] = useState<VoidEcho[]>([]);
  const [echoInput, setEchoInput] = useState("");
  const echoTimeoutRef = useRef<any>(null);

  // Identity State
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('evolutive_energy_key') || "");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  // New Evolutionary States
  const [isFinalized, setIsFinalized] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState(100); 
  const [isMuted, setIsMuted] = useState(true);

  // Derive ghosts from presence
  const ghosts = useMemo(() => {
    return Object.entries(presenceData)
      .filter(([id]) => id !== session?.user.id)
      .flatMap(([_, instances]) => Object.values(instances))
      .filter((p: any) => p.x !== undefined && p.y !== undefined);
  }, [presenceData, session]);

  // Gemini AI Provider
  const getAI = (customKey?: string) => {
    const key = customKey || userApiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No Energy Source Found. Connect Identity or Provide Key.");
    return new GoogleGenAI({ apiKey: key });
  };

  // Initial fetch and Project setup
  useEffect(() => {
    fetchSuggestions();
    
    const syncProject = async () => {
      if (!supabase) return;
      
      const { data } = await supabase.from('suggestions').select('*').eq('status', 'system_config').maybeSingle();
      
      if (data) {
        const config = JSON.parse(data.content || "{}") as ProjectConfig;
        setIsFinalized(config.is_finalized);
        setCreatorId(config.creator_id);
      } else if (session?.user.id) {
        const config: ProjectConfig = {
          creator_id: session.user.id,
          is_finalized: false,
          epoch_name: "The Genesis"
        };
        await supabase.from('suggestions').insert([{
          content: JSON.stringify(config),
          status: 'system_config',
          votes: 0,
          energy: 0
        }]);
        setCreatorId(session.user.id);
      }
    };
    syncProject();

    if (supabase) {
      // Auth
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (!session) {
          setUserApiKey("");
          localStorage.removeItem('evolutive_energy_key');
        }
      });

      // Real-time listener for suggestions and presence and echoes
      const channel = supabase.channel('void-sync');

      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'suggestions' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              if (payload.new.status === 'system_config') {
                const config = JSON.parse(payload.new.content) as ProjectConfig;
                setIsFinalized(config.is_finalized);
                setCreatorId(config.creator_id);
              } else {
                setSuggestions(current => [...current, payload.new as Suggestion].sort((a,b) => b.votes - a.votes));
              }
            } else if (payload.eventType === 'UPDATE') {
              if (payload.new.status === 'system_config') {
                const config = JSON.parse(payload.new.content) as ProjectConfig;
                setIsFinalized(config.is_finalized);
              } else {
                setSuggestions(current => current.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s).sort((a,b) => b.votes - a.votes));
              }
            }
          }
        )
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          setPresenceData(state);
          setActiveUsersCount(Object.keys(state).length);
        })
        .on('broadcast', { event: 'echo' }, ({ payload }) => {
          setEchoes(prev => [...prev, payload].slice(-10));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ 
              online_at: new Date().toISOString(),
              userId: session?.user.id || 'anonymous'
            });
          }
        });

      // Clear old echoes
      const interval = setInterval(() => {
        setEchoes(prev => prev.filter(e => Date.now() - e.createdAt < 5000));
      }, 1000);

      const handleMouseMove = (e: MouseEvent) => {
        channel.track({
          online_at: new Date().toISOString(),
          userId: session?.user.id || 'anonymous',
          x: e.clientX,
          y: e.clientY
        });
      };

      window.addEventListener('mousemove', handleMouseMove);

      return () => {
        subscription.unsubscribe();
        supabase.removeChannel(channel);
        clearInterval(interval);
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [session]);

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

  const handleMuteToggle = () => {
    if (isMuted) {
      sound.start();
    } else {
      sound.stop();
    }
    setIsMuted(!isMuted);
  };

  // Filter manifestations by history slider
  const visibleManifestations = useMemo(() => {
    const manifested = suggestions.filter(s => s.status === 'manifested').sort((a, b) => 
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    const limit = Math.ceil((historyIndex / 100) * manifested.length);
    return manifested.slice(0, limit);
  }, [suggestions, historyIndex]);

  const displaySuggestions = useMemo(() => {
    // Current valid suggestions (system config filtered)
    const valid = suggestions.filter(s => s.status !== 'system_config');
    
    // Manifested ones filtered by time
    const manifestedIds = visibleManifestations.map(m => m.id);
    
    return valid.filter(s => {
      if (s.status === 'manifested') return manifestedIds.includes(s.id);
      return true; // Pending ones always shown (they are the "future")
    });
  }, [suggestions, visibleManifestations]);

  const canSuggest = !isFinalized ? session?.user.id === creatorId : true;
  const canInteract = isFinalized || session?.user.id === creatorId;
  
  // Sound pitch update
  useEffect(() => {
    if (!isMuted) {
      sound.updatePitch(activeUsersCount);
    }
  }, [activeUsersCount, isMuted]);

  const fetchSuggestions = async () => {
    if (!supabase) {
      setSuggestions([
        { id: 1, content: "Add a floating neon digital clock in the void", votes: 45, energy: 100, status: "pending", manifested_code: `
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
        { id: 2, content: "Create a simple atmospheric ambient sound controller", votes: 8, energy: 20, status: "pending" },
        { id: 3, content: "Grid map showing the total energy of all suggestions", votes: 24, energy: 60, status: "pending" },
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
      setSuggestions([{ id: Date.now(), content, votes: 0, energy: 0, status: "pending" }, ...suggestions]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('suggestions')
        .insert([{ content }])
        .select();

      if (error) throw error;
      if (data) {
        if (!isMuted) sound.playBlip();
        setSuggestions([data[0], ...suggestions]);
      }
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
      // Real-time channel will handle the local state update
    } catch (err: any) {
      console.error("Error casting vote:", err);
    }
  };

  const handlePledge = async (s: Suggestion) => {
    if (!session || !userApiKey || !supabase) return;
    
    const hasPledged = s.pledged_by?.includes(session.user.id);
    if (hasPledged) return;

    try {
      const newPledgedBy = [...(s.pledged_by || []), session.user.id];
      const newEnergy = Math.min(100, (s.energy || 0) + 25); // Each pledge adds 25% energy
      
      const { error } = await supabase
        .from('suggestions')
        .update({ 
          pledged_by: newPledgedBy,
          energy: newEnergy
        })
        .eq('id', s.id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Error pledging energy:", err);
    }
  };

  const sendEcho = (e: React.FormEvent) => {
    e.preventDefault();
    if (!echoInput.trim() || !supabase) return;
    
    const channel = supabase.channel('void-sync');
    const newEcho: VoidEcho = {
      id: Math.random().toString(36),
      userId: session?.user.id || 'anonymous',
      text: echoInput.trim(),
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      createdAt: Date.now()
    };

    channel.send({
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
        Context: This manifested through collective effort. ${suggestion.pledged_by?.length || 0} souls contributed their API energy to this intent.
        
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
            <div className="flex items-center gap-1 text-[9px] text-indigo-400/80 uppercase tracking-widest font-mono ml-2">
              <Users className="w-3 h-3" />
              <span>Souls: {activeUsersCount}</span>
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
            {isFinalized ? "Collective Awareness Active" : "Creator Shaping Reality"}
          </motion.p>
        </div>
      )}

      <div className="absolute top-10 left-10 z-20 flex flex-col gap-4">
        <button 
          onClick={handleMuteToggle}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all shadow-xl backdrop-blur-md"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-pink-500" /> : <Volume2 className="w-5 h-5 text-green-500 animate-pulse" />}
        </button>
        
        {session?.user.id === creatorId && (
          <button 
            onClick={handleToggleFinalize}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-xl backdrop-blur-md ${
              isFinalized ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
            }`}
            title={isFinalized ? "Collective Mode: EVERYONE CAN CREATE" : "Creator Mode: ONLY YOU CAN CREATE"}
          >
            {isFinalized ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* --- CHRONOS SLIDER --- */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-20">
        <div className="h-64 w-1 bg-white/5 rounded-full relative flex flex-col items-center py-2">
          <input 
            type="range"
            min="0"
            max="100"
            value={historyIndex}
            onChange={(e) => {
              setHistoryIndex(parseInt(e.target.value));
              if (!isMuted) sound.playBlip();
            }}
            className="absolute inset-0 w-64 -rotate-90 origin-center cursor-pointer opacity-0"
            style={{ left: '-128px', top: '128px' }}
          />
          <motion.div 
            animate={{ height: `${historyIndex}%` }}
            className="w-full bg-gradient-to-t from-indigo-500 via-pink-500 to-yellow-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <HistoryIcon className="w-5 h-5 text-white/40" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap">Chronos</span>
        </div>
      </div>

      <Canvas shadows camera={{ position: [0, 0, 8], fov: 75 }} className="cursor-grab active:cursor-grabbing">
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#6366f1" />
        <EvolutiveSeed onClick={() => setIsOpen(true)} isOpen={isOpen} />
        <Nebula />
        
        {/* Manifested App Nodes - Filtered by History */}
        {visibleManifestations
          .filter(s => s.manifested_code)
          .map(s => (
            <ModuleNode 
              key={s.id} 
              suggestion={s} 
              onRun={(code) => setActiveModule(code)} 
            />
          ))
        }

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
      </Canvas>

      {/* --- HUD: ECHO INPUT --- */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-[400px]">
        <form onSubmit={sendEcho} className="relative group">
          {/* Input is circular */}
          <input 
            type="text"
            placeholder="Broadcast to the void..."
            value={echoInput}
            onChange={(e) => setEchoInput(e.target.value)}
            className="w-full bg-white/5 border-2 border-white/10 px-8 py-5 rounded-full text-[12px] text-white focus:border-indigo-500 focus:bg-white/10 outline-none text-center backdrop-blur-md transition-all placeholder:text-white/20 font-black uppercase tracking-widest"
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
            className="fixed inset-0 m-auto w-[90vw] h-[85vh] bg-[#050510]/95 backdrop-blur-2xl border-2 border-white/10 flex flex-col z-50 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden rounded-none"
          >
            {/* Mind Panel is a Cubic Structure (Cubic/Sharp) */}
            <div className="flex border-b border-white/10 p-6 shrink-0 bg-white/5 items-center justify-between">
              <div className="flex items-center gap-10">
                <div className="flex gap-12">
                  {['mind', 'identity'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`text-[12px] font-black uppercase tracking-[6px] transition-all relative ${activeTab === tab ? 'text-white' : 'text-white/20'}`}
                    >
                      {tab === 'mind' ? 'Collective consciousness' : 'Soul Identity'}
                      {activeTab === tab && <motion.div layoutId="tab" className="absolute -bottom-2 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-500" />}
                    </button>
                  ))}
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${isFinalized ? 'bg-green-500 animate-pulse shadow-[0_0_10px_green]' : 'bg-yellow-500 shadow-[0_0_10px_yellow]'}`} />
                  <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">
                    {isFinalized ? 'Post-Creation Sync' : 'Primordial Shaping'}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform p-2"><X className="w-6 h-6 text-white/40" /></button>
            </div>

            {/* Suggestions Root - Scrollable */}
            <div className="flex-1 overflow-y-auto p-10 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05)_0%,transparent_70%)] custom-scrollbar">
              {activeTab === 'mind' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {displaySuggestions.map((s, idx) => (
                    <motion.div 
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group"
                    >
                      {/* Suggestions are Circles */}
                      <div className="aspect-square rounded-full p-10 bg-white/[0.03] border-2 border-white/5 hover:border-indigo-500/50 transition-all flex flex-col items-center justify-center text-center relative overflow-hidden group-hover:shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-pink-500/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10 w-full flex flex-col h-full justify-between items-center py-4">
                          <div className="flex justify-center">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-4 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/30">
                              #{s.id} . {s.status}
                            </span>
                          </div>

                          <p className="text-[14px] text-white leading-relaxed font-bold line-clamp-4 px-4 italic drop-shadow-lg scale-90 group-hover:scale-100 transition-transform">
                            <span className="text-indigo-400 text-lg">“</span>
                            {s.content}
                            <span className="text-indigo-400 text-lg">”</span>
                          </p>
                          
                          <div className="flex flex-col gap-4 items-center w-full">
                            {s.manifested_code && (
                              <button onClick={() => setActiveModule(s.manifested_code!)} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-all active:scale-95 shadow-[0_0_20px_white]">
                                <Play className="w-6 h-6 fill-current" />
                              </button>
                            )}
                            
                            {s.status === 'pending' && (
                              <div className="flex flex-col gap-3 w-full px-6">
                                <div className="flex justify-center gap-5">
                                  {/* Vote Button - Circular */}
                                  <button 
                                    onClick={() => handleVote(s.id, s.votes)}
                                    className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center text-white/40 hover:border-white hover:text-white transition-all group-hover:scale-110"
                                  >
                                    <ChevronUp className="w-6 h-6" />
                                  </button>

                                  {/* Pledge Button - Circular */}
                                  <button 
                                    onClick={() => handlePledge(s)}
                                    disabled={!session || !userApiKey || s.pledged_by?.includes(session?.user.id || '')}
                                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                                      s.pledged_by?.includes(session?.user.id || '') 
                                        ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10' 
                                        : 'border-white/10 text-white/40 hover:border-white hover:text-white'
                                    } disabled:opacity-20`}
                                  >
                                    <Zap className={`w-5 h-5 ${s.pledged_by?.includes(session?.user.id || '') ? 'fill-yellow-400' : ''}`} />
                                  </button>
                                  
                                  {/* Manifest Button - Circular */}
                                  <button 
                                    onClick={() => manifestEvolution(s)} 
                                    disabled={!!isManifesting || (s.energy || 0) < 100}
                                    className="w-12 h-12 rounded-full border-2 border-indigo-500 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-10"
                                  >
                                    {isManifesting === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                  </button>
                                </div>
                                
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div animate={{ width: `${s.energy || 0}%` }} className="h-full bg-gradient-to-r from-indigo-500 via-pink-500 via-yellow-400 to-green-400 shadow-[0_0_10px_white]" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-12 py-10">
                  {!session ? (
                    <div className="text-center space-y-10">
                      <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(99,102,241,0.3)]">
                        <UserIcon className="w-10 h-10 text-white" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black uppercase tracking-[10px] text-white">Identity</h3>
                        <p className="text-[11px] text-white/40 leading-relaxed uppercase tracking-widest px-10">
                          Connect your soul to the evolutive cloud.
                        </p>
                      </div>

                      {/* Email Auth Form - Circular Buttons/Inputs */}
                      <div className="space-y-4 px-2">
                        <input 
                          type="email"
                          placeholder="Soul Identifier (Email)"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-5 rounded-full text-[11px] text-white focus:border-indigo-500/50 outline-none text-center"
                        />
                        <input 
                          type="password"
                          placeholder="Spirit Key (Password)"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-5 rounded-full text-[11px] text-white focus:border-indigo-500/50 outline-none text-center"
                        />
                        {authError && <p className="text-[9px] text-pink-500 uppercase font-black tracking-widest">{authError}</p>}
                        
                        <button 
                          onClick={handleEmailAuth}
                          className="w-full py-5 bg-white text-black text-[11px] font-black uppercase tracking-[4px] rounded-full hover:bg-indigo-300 transition-all shadow-xl"
                        >
                          {isSignUp ? "Manifest Soul" : "Resume Connection"}
                        </button>

                        <button 
                          onClick={() => setIsSignUp(!isSignUp)}
                          className="text-[10px] text-white/30 hover:text-indigo-400 uppercase tracking-widest font-black transition-colors"
                        >
                          {isSignUp ? "Already part of the cloud?" : "Begin new manifestation"}
                        </button>
                      </div>

                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                        <div className="relative flex justify-center"><span className="bg-[#050510] px-4 text-[10px] text-white/20 uppercase tracking-[4px] font-black">Or use Core Identity</span></div>
                      </div>

                      <button 
                        onClick={() => supabase?.auth.signInWithOAuth({ provider: 'google' })}
                        className="w-full px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-[4px] rounded-full hover:rotate-1 transition-all flex items-center justify-center gap-3"
                      >
                        Google Sync
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-10">
                      <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-4 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                        <img 
                          src={session.user.user_metadata.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.email}`} 
                          alt="Soul Avatar"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-black uppercase tracking-[8px] text-indigo-400">{session.user.email}</h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Active Soul in the Void</p>
                      </div>

                      <div className="bg-white/[0.03] p-10 rounded-full border border-white/5 space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[3px] text-white/40 block">Gemini Energy Source</label>
                          <input 
                            type="password"
                            value={userApiKey}
                            onChange={(e) => {
                              setUserApiKey(e.target.value);
                              localStorage.setItem('evolutive_energy_key', e.target.value);
                            }}
                            placeholder="PASTE YOUR API ENERGY KEY"
                            className="bg-transparent border-b border-white/10 w-full p-2 text-center text-xs text-indigo-300 focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => supabase?.auth.signOut()}
                        className="px-10 py-4 border-2 border-pink-500/30 text-pink-500/60 text-[10px] font-black uppercase tracking-[4px] rounded-full hover:bg-pink-500 hover:text-white transition-all"
                      >
                        Sever Connection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Intent Input area (Cubic Structure) */}
            <div className="p-10 border-t border-white/10 shrink-0 bg-white/10">
              {activeTab === 'mind' ? (
                <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                  {!canSuggest && (
                    <div className="text-center">
                      <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/10 py-2 border border-yellow-500/30 rounded-full">
                        Lock engaged: Waiting for Creator to switch to Collective Mode
                      </p>
                    </div>
                  )}
                  <div className={`flex gap-6 w-full transition-opacity ${!canSuggest ? 'opacity-30 pointer-events-none' : ''}`}>
                    {/* Suggestion input is circular */}
                    <input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canSuggest && handleSuggest()}
                      placeholder="WAKE A NEW INTENT..."
                      className="flex-1 bg-white/5 border-2 border-white/10 px-8 py-6 rounded-full text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/20 font-black uppercase tracking-[4px] text-center"
                    />
                    {/* Suggestion button is circular */}
                    <button 
                      onClick={handleSuggest}
                      disabled={!canSuggest}
                      className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-110 shadow-2xl hover:bg-gradient-to-br hover:from-indigo-500 hover:to-pink-500 hover:text-white disabled:opacity-50"
                    >
                      <Plus className="w-10 h-10 font-bold" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center flex-col items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[10px] text-white/20 font-black">Inner Core Maintenance</span>
                  <div className="w-32 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
