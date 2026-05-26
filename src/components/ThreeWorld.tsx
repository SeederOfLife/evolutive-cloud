
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

// ── SEED PARTICLES: emitted from the central sun ──────────────────────────────
function SeedParticles({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!);

  const { initPos, vel } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.9 + Math.random() * 1.0;
      const speed = 0.4 + Math.random() * 0.9;
      const sx = Math.sin(phi) * Math.cos(theta);
      const sy = Math.sin(phi) * Math.sin(theta);
      const sz = Math.cos(phi);
      pos[i * 3] = sx * r; pos[i * 3 + 1] = sy * r; pos[i * 3 + 2] = sz * r;
      v[i * 3] = sx * speed; v[i * 3 + 1] = sy * speed; v[i * 3 + 2] = sz * speed;
    }
    return { initPos: pos, vel: v };
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += vel[i * 3] * delta;
      pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
      pos[i * 3 + 2] += vel[i * 3 + 2] * delta;
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (x * x + y * y + z * z > 49) {
        const t2 = Math.random() * Math.PI * 2;
        const p2 = Math.acos(2 * Math.random() - 1);
        const spd = 0.4 + Math.random() * 0.9;
        const sx2 = Math.sin(p2) * Math.cos(t2);
        const sy2 = Math.sin(p2) * Math.sin(t2);
        const sz2 = Math.cos(p2);
        pos[i * 3] = sx2 * 0.9; pos[i * 3 + 1] = sy2 * 0.9; pos[i * 3 + 2] = sz2 * 0.9;
        vel[i * 3] = sx2 * spd; vel[i * 3 + 1] = sy2 * spd; vel[i * 3 + 2] = sz2 * spd;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={initPos} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.07} color="#ffffc0" transparent opacity={0.85} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

// ── EVOLUTIVE SEED: the central star with organic irregular heartbeat ──────────
const CORE_R = 0.9;

export function EvolutiveSeed({ onClick, isOpen }: { onClick: () => void, isOpen: boolean }) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null!);
  const corona1Ref = useRef<THREE.Mesh>(null!);
  const corona2Ref = useRef<THREE.Mesh>(null!);
  const corona3Ref = useRef<THREE.Mesh>(null!);
  const raysRef = useRef<THREE.Group>(null!);
  const timeRef = useRef(0);

  const rayData = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    const len = 1.8 + (i % 3) * 0.5;
    return {
      pos: dir.clone().multiplyScalar(CORE_R + 0.15 + len / 2).toArray() as [number, number, number],
      euler,
      len,
      opacity: 0.07 + (i % 2) * 0.04,
    };
  }), []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // Irregular heartbeat: overlapping sines at non-harmonic frequencies
    const pulse = 1
      + Math.sin(t * 2.09) * 0.05      // main beat
      + Math.sin(t * 3.77) * 0.022     // fast flutter
      + Math.sin(t * 0.61) * 0.018     // slow swell
      + Math.sin(t * 5.13) * 0.008;    // micro tremor

    if (coreRef.current) coreRef.current.scale.setScalar(pulse);
    if (corona1Ref.current) corona1Ref.current.scale.setScalar(pulse * (1 + Math.sin(t * 0.4 + 0.4) * 0.03));
    if (corona2Ref.current) corona2Ref.current.scale.setScalar(pulse * (1 + Math.sin(t * 0.35 + 0.8) * 0.04));
    if (corona3Ref.current) corona3Ref.current.scale.setScalar(pulse * (1 + Math.sin(t * 0.28 + 1.2) * 0.05));

    if (coreMat.current) {
      const warm = 0.82 + Math.sin(t * 0.23) * 0.18 + Math.sin(t * 0.71) * 0.06;
      coreMat.current.emissive.setRGB(1, Math.min(1, warm), Math.max(0.45, warm * 0.6));
      coreMat.current.emissiveIntensity = (isOpen ? 5 : 3.5) + Math.sin(t * 2.09) * 0.5 + Math.sin(t * 3.77) * 0.2;
    }

    if (raysRef.current) raysRef.current.rotation.y = t * 0.07;
  });

  return (
    <group onClick={onClick}>
      <pointLight color="#fff8d0" intensity={isOpen ? 8 : 5} distance={25} decay={1.5} />
      <pointLight color="#a0c8ff" intensity={isOpen ? 2.5 : 1.5} distance={10} decay={2} />

      <mesh ref={coreRef}>
        <sphereGeometry args={[CORE_R, 64, 64]} />
        <meshStandardMaterial ref={coreMat} color="#ffffd0" emissive="#ffffd0" emissiveIntensity={4} metalness={0} roughness={0.02} />
      </mesh>

      <mesh ref={corona1Ref}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={corona2Ref}>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#aaddff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={corona3Ref}>
        <sphereGeometry args={[3.0, 32, 32]} />
        <meshBasicMaterial color="#ffe8aa" transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <group ref={raysRef}>
        {rayData.map((ray, i) => (
          <mesh key={i} position={ray.pos} rotation={ray.euler}>
            <cylinderGeometry args={[0.005, 0.03, ray.len, 6, 1]} />
            <meshBasicMaterial color="#ffcc44" transparent opacity={ray.opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>

      <SeedParticles />
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

  const { radius, speed, offset, yOffset, incl, color, nodeSize } = useMemo(() => {
    const id = suggestion.id;
    const nodeSize = Math.min(0.16 + evolutionCount * 0.028, 0.44);
    // Spiral arm: bias orbit starting angle toward one of two arms (0° or 180°)
    const arm = Math.floor(seededRand(id, 5) * 2);
    const armBase = arm * Math.PI;
    const spread = (seededRand(id, 6) - 0.5) * 1.7;
    const offset = armBase + spread;
    // Orbit inclination: tilt plane out of horizontal by ±25°
    const incl = (seededRand(id, 4) - 0.5) * 0.9;
    return {
      nodeSize,
      radius: 3.5 + (1 - (suggestion.energy || 0) / 100) * 4,
      speed: 0.08 + seededRand(id, 0) * 0.18,
      offset,
      incl,
      yOffset: (seededRand(id, 2) - 0.5) * 1.5,
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

    // Inclined orbit: tilt the XZ plane by `incl` around the X axis
    const orbX = Math.cos(orbitT) * radius;
    const orbZ = Math.sin(orbitT) * radius;
    meshRef.current.position.x = orbX;
    meshRef.current.position.y = orbZ * Math.sin(incl) + yOffset + Math.sin(orbitT * 1.7) * 0.28;
    meshRef.current.position.z = orbZ * Math.cos(incl);

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
