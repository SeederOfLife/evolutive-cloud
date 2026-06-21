import React, { useState, useMemo, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import { Maximize2, Sparkles, MessageSquare, Globe } from "lucide-react";
import { Suggestion } from "../types";
import { EvolutiveSeed, ModuleNode, Nebula, OrbitRing, GalaxyField, ForkLines } from "./index";
import { CountUp } from "../components/CountUp";
import { HERO_PHRASES, EXAMPLE_CHIPS } from "../constants/appConstants";
import type { User } from "firebase/auth";

interface Props {
  isVisible: boolean;
  isHubOpen: boolean;
  allSuggestions: Suggestion[];
  suggestions: Suggestion[];
  linkedUserMap: Map<string, string>;
  wateringId: string | null;
  nodePositionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
  orbitControlsRef: React.MutableRefObject<any>;
  user: User | null;
  input: string;
  onLaunch: (s: Suggestion) => void;
  onOpenHub: () => void;
  onChipClick: (chip: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function GalaxyView({
  isVisible, isHubOpen, allSuggestions, suggestions, linkedUserMap,
  wateringId, nodePositionsRef, orbitControlsRef, user, input,
  onLaunch, onOpenHub, onChipClick, inputRef,
}: Props) {
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHeroIndex(i => (i + 1) % HERO_PHRASES.length), 4000);
    return () => clearInterval(id);
  }, []);

  const socialProof = useMemo(() => {
    const built = allSuggestions.filter(s => s.status === "built");
    const creatorIds = new Set(built.filter(s => !s.id.startsWith("seed_") && s.user_id).map(s => s.user_id!));
    return { apps: built.length, creators: Math.max(creatorIds.size, 1) };
  }, [allSuggestions]);

  const showLanding = !user && isVisible && input === "";

  return (
    <div style={{ display: isVisible ? "block" : "none" }} className="absolute inset-0"
      onDoubleClick={() => orbitControlsRef.current?.reset()}>
      <button onClick={() => orbitControlsRef.current?.reset()} title="Reset view"
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full text-white/50 hover:text-white transition-all active:scale-90">
        <Maximize2 className="w-3.5 h-3.5" />
      </button>

      <Canvas shadows camera={{ position: [0, 0, 10], fov: 75 }}
        className="cursor-grab active:cursor-grabbing"
        gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#6366f1" />
        <EvolutiveSeed onClick={onOpenHub} isOpen={isHubOpen} />
        <Nebula />
        <GalaxyField />
        <OrbitRing radius={3.5} opacity={0.18} color="#818cf8" />
        <OrbitRing radius={5.0} opacity={0.11} color="#6366f1" />
        <OrbitRing radius={6.5} opacity={0.07} color="#4f46e5" />
        <OrbitRing radius={7.5} opacity={0.05} color="#4338ca" />
        {allSuggestions.filter(s => s.status === "built" && s.built_code).map(s => (
          <ModuleNode key={s.id} suggestion={s} onRun={onLaunch}
            linkedFromLabel={s.user_id && linkedUserMap.has(s.user_id) ? linkedUserMap.get(s.user_id) : undefined}
            isWatering={wateringId === s.id}
            forkCount={suggestions.filter(f => f.parent_id === s.id).length}
            posRef={nodePositionsRef} />
        ))}
        <ForkLines suggestions={allSuggestions.filter(s => s.status === "built" && !!s.built_code)} posRef={nodePositionsRef} />
        <OrbitControls ref={orbitControlsRef} enablePan={false} enableZoom
          minDistance={3} maxDistance={25} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
      </Canvas>

      <AnimatePresence>
        {showLanding && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }} transition={{ duration: 0.6 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10 px-5 pb-20 pointer-events-none">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center leading-tight tracking-tight max-w-lg mb-3">
              Imagine an app.<br />
              <span className="text-indigo-400">AI builds it.</span>{" "}<span className="text-white/70">Share it.</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
              Type any idea. Watch it become a real working app in 30 seconds.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-7 pointer-events-auto">
              {EXAMPLE_CHIPS.map(chip => (
                <button key={chip} onClick={() => { onChipClick(chip); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="px-3.5 py-1.5 bg-white/8 hover:bg-indigo-500/20 border border-white/12 hover:border-indigo-500/40 rounded-full text-xs text-white/70 hover:text-white transition-all backdrop-blur-sm">
                  {chip}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mb-8 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400/70" />
                <span className="tabular-nums"><CountUp target={socialProof.apps} /></span> apps built
              </span>
              <span className="w-px h-3 bg-gray-700" />
              <span className="tabular-nums">By <CountUp target={socialProof.creators} /> creator{socialProof.creators !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-start gap-4 sm:gap-8">
              {[
                { icon: MessageSquare, step: "1", label: "Describe your idea" },
                { icon: Sparkles,      step: "2", label: "AI asks you questions" },
                { icon: Globe,         step: "3", label: "App appears in galaxy" },
              ].map(({ icon: Icon, step, label }) => (
                <div key={step} className="flex flex-col items-center gap-1.5 text-center max-w-[80px]">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-widest">{step}</span>
                  <span className="text-[11px] text-gray-400 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showLanding && (
        <div className="absolute inset-x-0 bottom-28 sm:bottom-36 flex items-center justify-center pointer-events-none z-10">
          <AnimatePresence mode="wait">
            <motion.p key={heroIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.7 }}
              className="text-white/20 text-base sm:text-xl font-light tracking-wide text-center px-8">
              {HERO_PHRASES[heroIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
