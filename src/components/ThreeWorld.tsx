
import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { Suggestion } from "../types";

export function EvolutiveSeed({ onClick, isOpen }: { onClick: () => void, isOpen: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
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

export function ModuleNode({ suggestion, onRun }: { suggestion: Suggestion, onRun: (s: Suggestion) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  
  const { radius, speed, offset, yOffset, color } = useMemo(() => {
    const colors = ["#ff006e", "#3a86ff", "#fb5607", "#ffbe0b", "#8338ec", "#00f5d4"];
    return {
      radius: 3.5 + (1 - (suggestion.energy || 0) / 100) * 4,
      speed: 0.1 + Math.random() * 0.2,
      offset: Math.random() * Math.PI * 2,
      yOffset: (Math.random() - 0.5) * 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  }, [suggestion.energy]);

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
