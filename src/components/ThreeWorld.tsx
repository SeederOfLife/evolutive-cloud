
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

function SeedParticles({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!);

  const { initPos, vel } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 1.5;
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
        pos[i * 3] = sx2 * 1.5; pos[i * 3 + 1] = sy2 * 1.5; pos[i * 3 + 2] = sz2 * 1.5;
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
    const len = 2.5 + (i % 3) * 0.7;
    return {
      pos: dir.clone().multiplyScalar(1.6 + len / 2).toArray() as [number, number, number],
      euler,
      len,
      opacity: 0.12 + (i % 2) * 0.06,
    };
  }), []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    if (coreRef.current) coreRef.current.scale.setScalar(1 + Math.sin(t * 0.6) * 0.08);
    if (corona1Ref.current) corona1Ref.current.scale.setScalar(1 + Math.sin(t * 0.5 + 0.3) * 0.10);
    if (corona2Ref.current) corona2Ref.current.scale.setScalar(1 + Math.sin(t * 0.4 + 0.7) * 0.13);
    if (corona3Ref.current) corona3Ref.current.scale.setScalar(1 + Math.sin(t * 0.3 + 1.1) * 0.17);

    if (coreMat.current) {
      const b = 0.55 + Math.sin(t * 0.22) * 0.45;
      coreMat.current.emissive.setRGB(1, 0.95 + Math.sin(t * 0.15) * 0.05, Math.max(0.1, b));
      coreMat.current.emissiveIntensity = (isOpen ? 5 : 3.5) + Math.sin(t * 0.6) * 0.5;
    }

    if (raysRef.current) raysRef.current.rotation.y = t * 0.08;
  });

  return (
    <group onClick={onClick}>
      <pointLight color="#fff8d0" intensity={isOpen ? 8 : 5} distance={25} decay={1.5} />
      <pointLight color="#a0c8ff" intensity={isOpen ? 2.5 : 1.5} distance={10} decay={2} />

      <mesh ref={coreRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial ref={coreMat} color="#ffffff" emissive="#ffffa0" emissiveIntensity={4} metalness={0} roughness={0.05} />
      </mesh>

      <mesh ref={corona1Ref}>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={corona2Ref}>
        <sphereGeometry args={[3.0, 32, 32]} />
        <meshBasicMaterial color="#ffffc0" transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={corona3Ref}>
        <sphereGeometry args={[4.2, 32, 32]} />
        <meshBasicMaterial color="#ffe080" transparent opacity={0.02} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <group ref={raysRef}>
        {rayData.map((ray, i) => (
          <mesh key={i} position={ray.pos} rotation={ray.euler}>
            <cylinderGeometry args={[0.01, 0.07, ray.len, 6, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={ray.opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>

      <SeedParticles />
    </group>
  );
}

export function ModuleNode({ suggestion, onRun }: { suggestion: Suggestion, onRun: (s: Suggestion) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  
  const { radius, speed, offset, yOffset, color } = useMemo(() => {
    const colors = ["#ff006e", "#3a86ff", "#fb5607", "#ffbe0b", "#8338ec", "#00f5d4"];
    const id = suggestion.id;
    return {
      radius: 3.5 + (1 - (suggestion.energy || 0) / 100) * 4,
      speed: 0.1 + seededRand(id, 0) * 0.2,
      offset: seededRand(id, 1) * Math.PI * 2,
      yOffset: (seededRand(id, 2) - 0.5) * 2,
      color: colors[Math.floor(seededRand(id, 3) * colors.length)]
    };
  }, [suggestion.id, suggestion.energy]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const time = timeRef.current;
    const t = time * speed + offset;
    meshRef.current.position.x = Math.cos(t) * radius;
    meshRef.current.position.z = Math.sin(t) * radius;
    meshRef.current.position.y = yOffset + Math.sin(t * 2) * 0.5;
    meshRef.current.rotation.y += 0.01;
  });

  const label = suggestion.content.length > 28
    ? suggestion.content.substring(0, 28) + "…"
    : suggestion.content;

  return (
    <mesh
      ref={meshRef}
      onClick={(e) => { e.stopPropagation(); onRun(suggestion); }}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
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
      {hovered && (
        <Html center position={[0, 0.38, 0]} zIndexRange={[100, 0]}>
          <div style={{
            background: "rgba(9,9,11,0.92)",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "10px",
            fontWeight: "700",
            color: "white",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            letterSpacing: "0.3px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}>
            {label}
          </div>
        </Html>
      )}
    </mesh>
  );
}

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

export function Nebula({ count = 4000 }) {
  const timeRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null!);
  
  const circleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { points, colors } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#6366f1"),
      new THREE.Color("#818cf8"),
      new THREE.Color("#4f46e5"),
      new THREE.Color("#c084fc"),
      new THREE.Color("#2dd4bf"),
    ];

    for (let i = 0; i < count; i++) {
      const r = 10 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
      
      const col = palette[Math.floor(Math.random() * palette.length)];
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return { points: p, colors: c };
  }, [count]);

  const matRef = useRef<THREE.PointsMaterial>(null!);
  useFrame((state, delta) => {
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
