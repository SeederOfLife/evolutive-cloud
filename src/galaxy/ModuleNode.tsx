import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Suggestion } from "../types";
import { seededRand } from "../utils/seededRand";

const TRAIL_LEN   = 14;
const NODE_COLORS = ["#ff006e", "#3a86ff", "#fb5607", "#ffbe0b", "#8338ec", "#00f5d4", "#06d6a0"];

export function ModuleNode({ suggestion, onRun, linkedFromLabel, isWatering, forkCount, posRef }: {
  suggestion: Suggestion;
  onRun: (s: Suggestion) => void;
  linkedFromLabel?: string;
  isWatering?: boolean;
  forkCount?: number;
  posRef?: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const meshRef      = useRef<THREE.Mesh>(null!);
  const moonRef      = useRef<THREE.Mesh>(null!);
  const trailRef     = useRef<THREE.Points>(null!);
  const ringRef      = useRef<THREE.Mesh>(null!);
  const pulseRingRef = useRef<THREE.Mesh>(null!);
  const outerGlowRef = useRef<THREE.Mesh>(null!);
  const trailBuf     = useRef(new Float32Array(TRAIL_LEN * 3));
  const timeRef      = useRef(0);
  const [hovered, setHovered] = useState(false);

  const evolutionCount = suggestion.evolutions?.length ?? 0;
  const lastEvolved    = suggestion.evolutions?.[0]?.timestamp;
  const msSinceWater   = lastEvolved ? Date.now() - new Date(lastEvolved).getTime() : Infinity;
  const isRecent    = msSinceWater < 60 * 60 * 1000;
  const isNeglected = msSinceWater > 30 * 24 * 60 * 60 * 1000;

  const { radius, speed, offset, color, nodeSize } = useMemo(() => {
    const id     = suggestion.id;
    const energy = suggestion.energy || 0;
    const nodeSize = Math.min((0.13 + evolutionCount * 0.03 + (energy / 100) * 0.12) * 1.2, 0.54);
    const arm    = Math.floor(seededRand(id, 5) * 2);
    const armBase = arm * Math.PI;
    const spread  = (seededRand(id, 6) - 0.5) * 1.7;
    const offset  = armBase + spread;
    return {
      nodeSize,
      radius: 3.0 + (1 - energy / 100) * 5.0,
      speed: (0.05 + (1 - energy / 100) * 0.15) * 0.4,
      offset,
      color: linkedFromLabel ? "#34d399" : NODE_COLORS[Math.floor(seededRand(id, 3) * NODE_COLORS.length)],
    };
  }, [suggestion.id, suggestion.energy, linkedFromLabel, evolutionCount]);

  const baseGlow = isWatering ? 4.0 : isRecent ? 3.2 : isNeglected ? 0.5 : 1.8;
  const opacity  = isNeglected ? 0.4 : 0.92;
  const showRing = hovered || !!isWatering;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    const orbitT = t * speed + offset;
    meshRef.current.position.x = Math.cos(orbitT) * radius;
    meshRef.current.position.y = Math.sin(t * 0.18 + offset) * 0.22;
    meshRef.current.position.z = Math.sin(orbitT) * radius;

    const wobble = isWatering ? (1 + Math.sin(t * 2.4) * 0.18) : 1;
    meshRef.current.scale.set(
      wobble * (1 + Math.sin(t * 0.84 + offset) * 0.07),
      wobble * (1 + Math.sin(t * 0.668 + offset + 1.1) * 0.07),
      wobble * (1 + Math.sin(t * 0.972 + offset + 2.2) * 0.07),
    );
    meshRef.current.rotation.x += delta * 0.12;
    meshRef.current.rotation.y += delta * 0.20;

    if (moonRef.current && forkCount && forkCount > 0) {
      const mt = t * 0.72;
      moonRef.current.position.x = Math.cos(mt) * (nodeSize * 3.5);
      moonRef.current.position.z = Math.sin(mt) * (nodeSize * 3.5);
      moonRef.current.position.y = Math.sin(mt * 0.7) * (nodeSize * 1.2);
    }

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

    if (ringRef.current) {
      ringRef.current.scale.setScalar(showRing ? 1.0 + Math.abs(Math.sin(t * Math.PI)) * 0.5 : 0);
    }

    if (pulseRingRef.current) {
      const pulse = isWatering ? (((t * 0.55) % 1)) : 0;
      pulseRingRef.current.scale.setScalar(isWatering ? 1.0 + pulse * 3.0 : 0);
      if (pulseRingRef.current.material) {
        (pulseRingRef.current.material as THREE.MeshBasicMaterial).opacity = isWatering ? (1 - pulse) * 0.5 : 0;
      }
    }

    if (outerGlowRef.current) {
      const glowPulse = 1 + Math.sin(t * 1.3 + offset) * 0.12;
      outerGlowRef.current.scale.setScalar(glowPulse);
    }

    if (posRef) posRef.current.set(suggestion.id, meshRef.current.position.clone());
  });

  const label = suggestion.content.length > 28 ? suggestion.content.substring(0, 28) + "…" : suggestion.content;

  return (
    <group>
      <mesh ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onRun(suggestion); }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <icosahedronGeometry args={[nodeSize, 1]} />
        <meshStandardMaterial
          color={hovered ? "#fff" : color}
          emissive={hovered ? "#fff" : color}
          emissiveIntensity={hovered ? 2.8 : baseGlow}
          metalness={0.6} roughness={0.22} transparent opacity={opacity}
        />
        {/* Inner glow halo */}
        <mesh scale={2.0}>
          <sphereGeometry args={[nodeSize, 10, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* Outer diffuse glow — gives depth to each node */}
        <mesh ref={outerGlowRef} scale={4.2}>
          <sphereGeometry args={[nodeSize, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.055} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* Hover/watering ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[nodeSize * 1.3, nodeSize * 1.6, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* Expanding watering pulse ring */}
        <mesh ref={pulseRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[nodeSize * 1.5, nodeSize * 2.0, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {forkCount && forkCount > 0 && (
          <mesh ref={moonRef}>
            <icosahedronGeometry args={[nodeSize * 0.3, 0]} />
            <meshStandardMaterial color="#a5b4fc" emissive="#a5b4fc" emissiveIntensity={1.4} transparent opacity={0.78} />
          </mesh>
        )}
        {hovered && (
          <Html center position={[0, nodeSize + 0.35, 0]} zIndexRange={[100, 0]}>
            <div style={{
              background: "rgba(9,9,11,0.93)",
              border: `1px solid ${linkedFromLabel ? "rgba(52,211,153,0.45)" : "rgba(99,102,241,0.45)"}`,
              borderRadius: "8px", padding: "5px 10px",
              fontSize: "10px", fontWeight: "700", color: "white",
              whiteSpace: "nowrap", pointerEvents: "none",
              letterSpacing: "0.3px", boxShadow: "0 4px 16px rgba(0,0,0,0.65)",
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
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={TRAIL_LEN} array={trailBuf.current} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={nodeSize * 0.28} color={color} transparent opacity={0.35} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}
