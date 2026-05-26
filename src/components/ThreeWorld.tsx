
import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Suggestion } from "../types";

function seededRand(seed: string, n: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= n * 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}

// ── GALAXY FIELD: 200 deep-space sparkles in two loose arms ───────────────────
export function GalaxyField() {
  const ref = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);

  const positions = useMemo(() => {
    const pos = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      const arm = i % 2;
      const armBase = arm * Math.PI;
      const spread = (Math.random() - 0.5) * 2.2;
      const r = 9 + Math.random() * 22;
      const angle = armBase + spread;
      pos[i * 3]     = Math.cos(angle) * r;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * r * 0.22;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (ref.current) ref.current.rotation.y = timeRef.current * 0.006;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={200} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#aad4ff" transparent opacity={0.28} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// ── EVOLUTIVE SEED: black hole singularity + accretion disk + white jets ──────
export function EvolutiveSeed({ onClick, isOpen }: { onClick: () => void, isOpen: boolean }) {
  const glowRef = useRef<THREE.Mesh>(null!);
  const disk1Ref = useRef<THREE.Mesh>(null!);
  const disk2Ref = useRef<THREE.Mesh>(null!);
  const disk3Ref = useRef<THREE.Mesh>(null!);
  const disk4Ref = useRef<THREE.Mesh>(null!);
  const jet1MatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const jet2MatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    // Differential rotation: inner rings faster (Keplerian-inspired)
    if (disk1Ref.current) disk1Ref.current.rotation.z = t * 2.6;
    if (disk2Ref.current) disk2Ref.current.rotation.z = t * 1.6;
    if (disk3Ref.current) disk3Ref.current.rotation.z = t * 0.9;
    if (disk4Ref.current) disk4Ref.current.rotation.z = t * 0.45;
    // Core glow pulse
    if (glowRef.current) glowRef.current.scale.setScalar(1 + Math.sin(t * 3.1) * 0.07 + Math.sin(t * 7.3) * 0.03);
    // Jet flicker
    const ja = 0.55 + Math.sin(t * 5.1) * 0.18 + Math.sin(t * 11.7) * 0.08;
    if (jet1MatRef.current) jet1MatRef.current.opacity = ja;
    if (jet2MatRef.current) jet2MatRef.current.opacity = ja;
  });

  return (
    <group onClick={onClick}>
      <pointLight color="#ffffff" intensity={isOpen ? 14 : 9} distance={32} decay={1.8} />
      <pointLight color="#d8c8ff" intensity={2.5} distance={7} decay={2.2} />

      {/* Singularity: near-black sphere */}
      <mesh>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshStandardMaterial color="#04040e" emissive="#04040e" emissiveIntensity={0} metalness={1} roughness={0} />
      </mesh>

      {/* White-gold light of creativity at the core */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.52, 16, 16]} />
        <meshBasicMaterial color="#fffef8" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Accretion disk — differential rotation rings on the flat plane */}
      <mesh ref={disk1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.68, 1.08, 90]} />
        <meshBasicMaterial color="#fff4c0" transparent opacity={0.78} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={disk2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.08, 1.65, 90]} />
        <meshBasicMaterial color="#ffd060" transparent opacity={0.46} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={disk3Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.65, 2.35, 90]} />
        <meshBasicMaterial color="#e09040" transparent opacity={0.22} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={disk4Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.35, 3.1, 90]} />
        <meshBasicMaterial color="#b07038" transparent opacity={0.09} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Polar jets: white creativity bursting up and down */}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.025, 0.11, 3.2, 8, 1]} />
        <meshBasicMaterial ref={jet1MatRef} color="#ffffff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.2, 0]}>
        <cylinderGeometry args={[0.11, 0.025, 3.2, 8, 1]} />
        <meshBasicMaterial ref={jet2MatRef} color="#ffffff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── MODULE NODE: icosahedron crystal, spiral arms, inclined orbit, trailing wisps ──
const TRAIL_LEN = 7;
const NODE_COLORS = ["#ff006e", "#3a86ff", "#fb5607", "#ffbe0b", "#8338ec", "#00f5d4", "#06d6a0"];

export function ModuleNode({ suggestion, onRun, linkedFromLabel, isWatering, forkCount, posRef }: {
  suggestion: Suggestion;
  onRun: (s: Suggestion) => void;
  linkedFromLabel?: string;
  isWatering?: boolean;
  forkCount?: number;
  posRef?: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const moonRef = useRef<THREE.Mesh>(null!);
  const trailRef = useRef<THREE.Points>(null!);
  const trailBuf = useRef(new Float32Array(TRAIL_LEN * 3));
  const timeRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  const evolutionCount = suggestion.evolutions?.length ?? 0;
  const lastEvolved = suggestion.evolutions?.[0]?.timestamp;
  const msSinceWater = lastEvolved ? Date.now() - new Date(lastEvolved).getTime() : Infinity;
  const isRecent = msSinceWater < 60 * 60 * 1000;
  const isNeglected = msSinceWater > 30 * 24 * 60 * 60 * 1000;

  const { radius, speed, offset, color, nodeSize } = useMemo(() => {
    const id = suggestion.id;
    const energy = suggestion.energy || 0;
    // High energy → closer to center, slower (pulled in, stable near the singularity)
    // Low energy  → farther out, faster (outer fringes, not yet consumed)
    const nodeSize = Math.min(0.13 + evolutionCount * 0.03 + (energy / 100) * 0.12, 0.45);
    const arm = Math.floor(seededRand(id, 5) * 2);
    const armBase = arm * Math.PI;
    const spread = (seededRand(id, 6) - 0.5) * 1.7;
    const offset = armBase + spread;
    return {
      nodeSize,
      radius: 3.0 + (1 - energy / 100) * 5.0,
      speed: 0.05 + (1 - energy / 100) * 0.15,
      offset,
      color: linkedFromLabel ? "#34d399" : NODE_COLORS[Math.floor(seededRand(id, 3) * NODE_COLORS.length)],
    };
  }, [suggestion.id, suggestion.energy, linkedFromLabel, evolutionCount]);

  const baseGlow = isWatering ? 3.5 : isRecent ? 2.8 : isNeglected ? 0.5 : 1.6;
  const opacity = isNeglected ? 0.4 : 0.92;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const orbitT = t * speed + offset;

    // Flat plane orbit — all nodes on y=0
    meshRef.current.position.x = Math.cos(orbitT) * radius;
    meshRef.current.position.y = 0;
    meshRef.current.position.z = Math.sin(orbitT) * radius;

    // Organic breathing wobble — per-axis, non-harmonic
    const wobbleScale = isWatering ? (1 + Math.sin(t * 6) * 0.15) : 1;
    meshRef.current.scale.set(
      wobbleScale * (1 + Math.sin(t * 2.1 + offset) * 0.07),
      wobbleScale * (1 + Math.sin(t * 1.67 + offset + 1.1) * 0.07),
      wobbleScale * (1 + Math.sin(t * 2.43 + offset + 2.2) * 0.07),
    );
    meshRef.current.rotation.x += delta * 0.3;
    meshRef.current.rotation.y += delta * 0.5;

    // Moon orbit (local to mesh, so it orbits the node)
    if (moonRef.current && forkCount && forkCount > 0) {
      const mt = t * 1.8;
      moonRef.current.position.x = Math.cos(mt) * (nodeSize * 3.5);
      moonRef.current.position.z = Math.sin(mt) * (nodeSize * 3.5);
      moonRef.current.position.y = Math.sin(mt * 0.7) * (nodeSize * 1.2);
    }

    // Trail: shift buffer back, push current world position at front
    for (let i = TRAIL_LEN - 1; i > 0; i--) {
      trailBuf.current[i * 3]     = trailBuf.current[(i - 1) * 3];
      trailBuf.current[i * 3 + 1] = trailBuf.current[(i - 1) * 3 + 1];
      trailBuf.current[i * 3 + 2] = trailBuf.current[(i - 1) * 3 + 2];
    }
    trailBuf.current[0] = meshRef.current.position.x;
    trailBuf.current[1] = meshRef.current.position.y;
    trailBuf.current[2] = meshRef.current.position.z;
    if (trailRef.current) {
      (trailRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // Report position for fork lines
    if (posRef) posRef.current.set(suggestion.id, meshRef.current.position.clone());
  });

  const label = suggestion.content.length > 28
    ? suggestion.content.substring(0, 28) + "…"
    : suggestion.content;

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onRun(suggestion); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        {/* Icosahedron: angular crystal, organic bioluminescent feel */}
        <icosahedronGeometry args={[nodeSize, 1]} />
        <meshStandardMaterial
          color={hovered ? "#fff" : color}
          emissive={hovered ? "#fff" : color}
          emissiveIntensity={hovered ? 2.5 : baseGlow}
          metalness={0.6}
          roughness={0.25}
          transparent
          opacity={opacity}
        />

        {/* Moon for forked apps — orbits in local space */}
        {forkCount && forkCount > 0 && (
          <mesh ref={moonRef}>
            <icosahedronGeometry args={[nodeSize * 0.3, 0]} />
            <meshStandardMaterial color="#a5b4fc" emissive="#a5b4fc" emissiveIntensity={1.2} transparent opacity={0.75} />
          </mesh>
        )}

        {hovered && (
          <Html center position={[0, nodeSize + 0.3, 0]} zIndexRange={[100, 0]}>
            <div style={{
              background: "rgba(9,9,11,0.93)",
              border: `1px solid ${linkedFromLabel ? "rgba(52,211,153,0.45)" : "rgba(99,102,241,0.45)"}`,
              borderRadius: "8px",
              padding: "5px 10px",
              fontSize: "10px",
              fontWeight: "700",
              color: "white",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              letterSpacing: "0.3px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.65)",
            }}>
              {label}
              {evolutionCount > 0 && (
                <span style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#67e8f9", marginTop: "2px", opacity: 0.9 }}>
                  gen {evolutionCount + 1} · {isRecent ? "just watered" : isNeglected ? "needs water" : "growing"}
                </span>
              )}
              {linkedFromLabel && (
                <span style={{ display: "block", fontSize: "9px", fontWeight: "600", color: "#34d399", marginTop: "2px", opacity: 0.9 }}>
                  from @{linkedFromLabel}
                </span>
              )}
            </div>
          </Html>
        )}
      </mesh>

      {/* Trailing wisp — positions updated each frame from trailBuf */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={TRAIL_LEN} array={trailBuf.current} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={nodeSize * 0.22} color={color} transparent opacity={0.22} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ── FORK LINES: glowing threads showing lineage between parent and child nodes ──
export function ForkLines({ suggestions, posRef }: {
  suggestions: Suggestion[];
  posRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const linesRef = useRef<THREE.LineSegments>(null!);

  const forkPairs = useMemo(() =>
    suggestions
      .filter(s => s.parent_id && suggestions.some(p => p.id === s.parent_id))
      .map(s => ({ child: s.id, parent: s.parent_id! }))
      .slice(0, 20),
    [suggestions]
  );

  const lineCount = forkPairs.length;
  // 2 endpoints × 3 floats per pair; minimum 6 to avoid zero-length buffer
  const posArray = useRef(new Float32Array(Math.max(lineCount * 6, 6)));

  useFrame(() => {
    if (!linesRef.current || lineCount === 0) return;
    const map = posRef.current;
    for (let i = 0; i < lineCount; i++) {
      const child = map.get(forkPairs[i].child);
      const parent = map.get(forkPairs[i].parent);
      if (child && parent) {
        posArray.current[i * 6 + 0] = child.x;
        posArray.current[i * 6 + 1] = child.y;
        posArray.current[i * 6 + 2] = child.z;
        posArray.current[i * 6 + 3] = parent.x;
        posArray.current[i * 6 + 4] = parent.y;
        posArray.current[i * 6 + 5] = parent.z;
      }
    }
    (linesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  if (lineCount === 0) return null;

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={lineCount * 2} array={posArray.current} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#818cf8" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

// ── ORBIT RING ────────────────────────────────────────────────────────────────
export function OrbitRing({ radius, opacity = 0.12, color = "#6366f1" }: { radius: number; opacity?: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.02;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.015, radius + 0.015, 128]} />
      <meshBasicMaterial color={color} opacity={opacity} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── NEBULA: vast star-field backdrop ─────────────────────────────────────────
export function Nebula({ count = 4000 }) {
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null!);

  const circleTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.2, "rgba(255,255,255,0.8)");
      gradient.addColorStop(0.5, "rgba(99,102,241,0.2)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { points, colors } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#6366f1"), new THREE.Color("#818cf8"),
      new THREE.Color("#4f46e5"), new THREE.Color("#c084fc"),
      new THREE.Color("#2dd4bf"),
    ];
    for (let i = 0; i < count; i++) {
      const r = 10 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      p[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
      const col = palette[Math.floor(Math.random() * palette.length)];
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    return { points: p, colors: c };
  }, [count]);

  const matRef = useRef<THREE.PointsMaterial>(null!);
  useFrame((_, delta) => {
    if (!matRef.current || !groupRef.current) return;
    timeRef.current += delta;
    const time = timeRef.current;
    matRef.current.size = 0.15 + Math.sin(time * 0.3) * 0.05;
    groupRef.current.rotation.y = time * 0.03;
    groupRef.current.rotation.z = Math.sin(time * 0.1) * 0.1;
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={points.length / 3} array={points} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          ref={matRef}
          size={0.2}
          vertexColors
          transparent
          map={circleTexture}
          opacity={0.4}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
