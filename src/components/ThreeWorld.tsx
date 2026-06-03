
import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Suggestion } from "../types";
import { seededRand } from "../utils/seededRand";

// ── GALAXY FIELD ───────────────────────────────────────────────────────────────
export function GalaxyField() {
  const armRef   = useRef<THREE.Points>(null!);
  const brightRef = useRef<THREE.Points>(null!);
  const timeRef  = useRef(0);

  // Layer 1: 300 arm-structure stars with warm/cool gradient by distance
  const { pos1, col1 } = useMemo(() => {
    const count = 300; // +50% from original 200
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const warm = new THREE.Color("#ffc060");
    const cool = new THREE.Color("#aad4ff");
    for (let i = 0; i < count; i++) {
      const arm    = i % 2;
      const armBase = arm * Math.PI;
      const spread  = (Math.random() - 0.5) * 2.2;
      const r       = 9 + Math.random() * 22;
      const angle   = armBase + spread;
      pos[i * 3]     = Math.cos(angle) * r;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * r * 0.22;
      const t = Math.min(1, (r - 9) / 22); // 0 = inner (warm), 1 = outer (cool)
      const c = warm.clone().lerp(cool, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { pos1: pos, col1: col };
  }, []);

  // Layer 2: ~200 larger bright stars for depth
  const { pos2, col2 } = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const warm = new THREE.Color("#ffe4a0");
    const cool = new THREE.Color("#cce8ff");
    for (let i = 0; i < count; i++) {
      const r     = 8 + Math.random() * 26;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3]     = Math.cos(theta) * r;
      pos[i * 3 + 2] = Math.sin(theta) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * r * 0.15;
      const t = Math.min(1, (r - 8) / 26);
      const c = warm.clone().lerp(cool, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { pos2: pos, col2: col };
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    // 3x slower than original 0.006
    if (armRef.current)    armRef.current.rotation.y    = timeRef.current * 0.002;
    if (brightRef.current) brightRef.current.rotation.y = timeRef.current * 0.0014;
  });

  return (
    <group>
      <points ref={armRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={300} array={pos1} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={300} array={col1} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.28} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <points ref={brightRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={200} array={pos2} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={200} array={col2} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.12} vertexColors transparent opacity={0.55} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ── EVOLUTIVE SEED: black hole singularity + accretion disk + white jets ──────
export function EvolutiveSeed({ onClick, isOpen }: { onClick: () => void, isOpen: boolean }) {
  const glowRef      = useRef<THREE.Mesh>(null!);
  const disk1Ref     = useRef<THREE.Mesh>(null!);
  const disk2Ref     = useRef<THREE.Mesh>(null!);
  const disk3Ref     = useRef<THREE.Mesh>(null!);
  const disk4Ref     = useRef<THREE.Mesh>(null!);
  const jet1MatRef   = useRef<THREE.MeshBasicMaterial>(null!);
  const jet2MatRef   = useRef<THREE.MeshBasicMaterial>(null!);
  const outerRingRef = useRef<THREE.Mesh>(null!);
  const outerPulseRef = useRef<THREE.Mesh>(null!);
  const timeRef      = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Differential rotation — 60% slower (original × 0.4)
    if (disk1Ref.current) disk1Ref.current.rotation.z = t * 1.04;
    if (disk2Ref.current) disk2Ref.current.rotation.z = t * 0.64;
    if (disk3Ref.current) disk3Ref.current.rotation.z = t * 0.36;
    if (disk4Ref.current) disk4Ref.current.rotation.z = t * 0.18;

    // Core glow pulse — 60% slower
    if (glowRef.current) glowRef.current.scale.setScalar(1 + Math.sin(t * 1.24) * 0.07 + Math.sin(t * 2.92) * 0.03);

    // Jet flicker — 60% slower
    const ja = 0.55 + Math.sin(t * 2.04) * 0.18 + Math.sin(t * 4.68) * 0.08;
    if (jet1MatRef.current) jet1MatRef.current.opacity = ja;
    if (jet2MatRef.current) jet2MatRef.current.opacity = ja;

    // Extra golden torus — very slow spin in its flat plane
    if (outerRingRef.current) outerRingRef.current.rotation.z = t * 0.08;

    // Gravitational pull — gentle 3-second pulse (1 → 1.05 → 1)
    if (outerPulseRef.current) outerPulseRef.current.scale.setScalar(1 + Math.sin(t * 2.094) * 0.05);
  });

  return (
    <group onClick={onClick}>
      {/* Stronger, softer central glow */}
      <pointLight color="#ffffff" intensity={isOpen ? 20 : 14} distance={45} decay={1.8} />
      <pointLight color="#d8c8ff" intensity={3.0} distance={10} decay={2.2} />

      {/* Singularity */}
      <mesh>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshStandardMaterial color="#04040e" emissive="#04040e" emissiveIntensity={0} metalness={1} roughness={0} />
      </mesh>

      {/* White-gold core glow — slightly larger */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.60, 16, 16]} />
        <meshBasicMaterial color="#fffef8" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Gravitational pull aura — gentle 3s pulse */}
      <mesh ref={outerPulseRef}>
        <sphereGeometry args={[2.0, 16, 16]} />
        <meshBasicMaterial color="#c4b0ff" transparent opacity={0.04} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Accretion rings */}
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

      {/* Extra outer golden torus ring — faint, very slow */}
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.6, 0.04, 6, 128]} />
        <meshBasicMaterial color="#c89820" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Polar jets */}
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

// ── MODULE NODE ────────────────────────────────────────────────────────────────
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
  const meshRef  = useRef<THREE.Mesh>(null!);
  const moonRef  = useRef<THREE.Mesh>(null!);
  const trailRef = useRef<THREE.Points>(null!);
  const ringRef  = useRef<THREE.Mesh>(null!);
  const trailBuf = useRef(new Float32Array(TRAIL_LEN * 3));
  const timeRef  = useRef(0);
  const [hovered, setHovered] = useState(false);

  const evolutionCount = suggestion.evolutions?.length ?? 0;
  const lastEvolved    = suggestion.evolutions?.[0]?.timestamp;
  const msSinceWater   = lastEvolved ? Date.now() - new Date(lastEvolved).getTime() : Infinity;
  const isRecent    = msSinceWater < 60 * 60 * 1000;
  const isNeglected = msSinceWater > 30 * 24 * 60 * 60 * 1000;

  const { radius, speed, offset, color, nodeSize } = useMemo(() => {
    const id     = suggestion.id;
    const energy = suggestion.energy || 0;
    // +20% node size
    const nodeSize = Math.min((0.13 + evolutionCount * 0.03 + (energy / 100) * 0.12) * 1.2, 0.54);
    const arm     = Math.floor(seededRand(id, 5) * 2);
    const armBase = arm * Math.PI;
    const spread  = (seededRand(id, 6) - 0.5) * 1.7;
    const offset  = armBase + spread;
    return {
      nodeSize,
      radius: 3.0 + (1 - energy / 100) * 5.0,
      speed: (0.05 + (1 - energy / 100) * 0.15) * 0.4, // 60% slower
      offset,
      color: linkedFromLabel ? "#34d399" : NODE_COLORS[Math.floor(seededRand(id, 3) * NODE_COLORS.length)],
    };
  }, [suggestion.id, suggestion.energy, linkedFromLabel, evolutionCount]);

  const baseGlow = isWatering ? 3.5 : isRecent ? 2.8 : isNeglected ? 0.5 : 1.6;
  const opacity  = isNeglected ? 0.4 : 0.92;
  const showRing = hovered || !!isWatering;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    // Orbit
    const orbitT = t * speed + offset;
    meshRef.current.position.x = Math.cos(orbitT) * radius;
    meshRef.current.position.y = 0;
    meshRef.current.position.z = Math.sin(orbitT) * radius;

    // Organic breathing wobble — 60% slower frequencies
    const wobbleScale = isWatering ? (1 + Math.sin(t * 2.4) * 0.15) : 1;
    meshRef.current.scale.set(
      wobbleScale * (1 + Math.sin(t * 0.84 + offset) * 0.07),
      wobbleScale * (1 + Math.sin(t * 0.668 + offset + 1.1) * 0.07),
      wobbleScale * (1 + Math.sin(t * 0.972 + offset + 2.2) * 0.07),
    );
    // 60% slower self-rotation
    meshRef.current.rotation.x += delta * 0.12;
    meshRef.current.rotation.y += delta * 0.20;

    // Moon orbit — 60% slower
    if (moonRef.current && forkCount && forkCount > 0) {
      const mt = t * 0.72;
      moonRef.current.position.x = Math.cos(mt) * (nodeSize * 3.5);
      moonRef.current.position.z = Math.sin(mt) * (nodeSize * 3.5);
      moonRef.current.position.y = Math.sin(mt * 0.7) * (nodeSize * 1.2);
    }

    // Trail
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

    // Hover/watering ring pulse — 1 → 1.4 → 1
    if (ringRef.current) {
      ringRef.current.scale.setScalar(showRing ? 1.0 + Math.abs(Math.sin(t * Math.PI)) * 0.4 : 0);
    }

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
        {/* Core icosahedron crystal */}
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

        {/* Soft outer glow — 1.8× sphere, additive, opacity 0.15 */}
        <mesh scale={1.8}>
          <sphereGeometry args={[nodeSize, 10, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* Pulsing white ring — always mounted, scale driven to 0 when inactive */}
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[nodeSize * 1.3, nodeSize * 1.55, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* Moon for forked apps */}
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

      {/* Trailing wisp */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={TRAIL_LEN} array={trailBuf.current} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={nodeSize * 0.22} color={color} transparent opacity={0.22} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

// ── FORK LINES ────────────────────────────────────────────────────────────────
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
  const posArray  = useRef(new Float32Array(Math.max(lineCount * 6, 6)));

  useFrame(() => {
    if (!linesRef.current || lineCount === 0) return;
    const map = posRef.current;
    for (let i = 0; i < lineCount; i++) {
      const child  = map.get(forkPairs[i].child);
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
    // 60% slower than original 0.02
    if (ref.current) ref.current.rotation.z += delta * 0.008;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.015, radius + 0.015, 128]} />
      <meshBasicMaterial color={color} opacity={opacity} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── NEBULA ────────────────────────────────────────────────────────────────────
export function Nebula({ count = 4000 }) {
  const timeRef  = useRef(0);
  const groupRef = useRef<THREE.Group>(null!);
  const matRef   = useRef<THREE.PointsMaterial>(null!);

  const circleTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0,   "rgba(255,255,255,1)");
      gradient.addColorStop(0.2, "rgba(255,255,255,0.8)");
      gradient.addColorStop(0.5, "rgba(99,102,241,0.2)");
      gradient.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Cloud 1 — main
  const { points, colors } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#6366f1"), new THREE.Color("#818cf8"),
      new THREE.Color("#4f46e5"), new THREE.Color("#c084fc"),
      new THREE.Color("#2dd4bf"),
    ];
    for (let i = 0; i < count; i++) {
      const r     = 10 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      p[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
      const col = palette[Math.floor(Math.random() * palette.length)];
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    return { points: p, colors: c };
  }, [count]);

  // Cloud 2 — mirror of cloud 1 (negate X+Z = rotate 180° around Y)
  const { points2, colors2 } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3]     = -points[i * 3];
      p[i * 3 + 1] =  points[i * 3 + 1];
      p[i * 3 + 2] = -points[i * 3 + 2];
      c[i * 3]     = colors[i * 3];
      c[i * 3 + 1] = colors[i * 3 + 1];
      c[i * 3 + 2] = colors[i * 3 + 2];
    }
    return { points2: p, colors2: c };
  }, [points, colors]);

  useFrame((_, delta) => {
    if (!matRef.current || !groupRef.current) return;
    timeRef.current += delta;
    const time = timeRef.current;
    // 50% slower drift
    matRef.current.size = 0.15 + Math.sin(time * 0.15) * 0.05;
    groupRef.current.rotation.y = time * 0.015;
    groupRef.current.rotation.z = Math.sin(time * 0.05) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {/* Cloud 1 */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={points}  itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={count} array={colors}  itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          ref={matRef}
          size={0.2}
          vertexColors
          transparent
          map={circleTexture}
          opacity={0.55}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      {/* Cloud 2 — opposite side for symmetry */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={points2} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={count} array={colors2} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          vertexColors
          transparent
          map={circleTexture}
          opacity={0.45}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
