import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PALETTE = [
  new THREE.Color("#6366f1"),
  new THREE.Color("#818cf8"),
  new THREE.Color("#4f46e5"),
  new THREE.Color("#c084fc"),
  new THREE.Color("#2dd4bf"),
  new THREE.Color("#ec4899"),
  new THREE.Color("#38bdf8"),
  new THREE.Color("#a78bfa"),
];

export function Nebula({ count = 3800 }) {
  const timeRef   = useRef(0);
  const group1Ref = useRef<THREE.Group>(null!);
  const group2Ref = useRef<THREE.Group>(null!);
  const matRef    = useRef<THREE.PointsMaterial>(null!);
  const mat2Ref   = useRef<THREE.PointsMaterial>(null!);

  const circleTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0,   "rgba(255,255,255,1)");
      g.addColorStop(0.18,"rgba(255,255,255,0.85)");
      g.addColorStop(0.45,"rgba(120,80,255,0.25)");
      g.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const { pts1, col1 } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = 12 + Math.pow(Math.random(), 0.7) * 36;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      p[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
      const col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    return { pts1: p, col1: c };
  }, [count]);

  // Second counter-rotating cloud, biased toward teal/pink for contrast
  const { pts2, col2 } = useMemo(() => {
    const half = Math.floor(count * 0.6);
    const p = new Float32Array(half * 3);
    const c = new Float32Array(half * 3);
    const subPalette = [PALETTE[4], PALETTE[5], PALETTE[6], PALETTE[7], PALETTE[0]];
    for (let i = 0; i < half; i++) {
      const r     = 16 + Math.random() * 32;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      p[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
      const col = subPalette[Math.floor(Math.random() * subPalette.length)];
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    return { pts2: p, col2: c };
  }, [count]);

  const half = Math.floor(count * 0.6);

  useFrame((_, delta) => {
    if (!matRef.current || !group1Ref.current) return;
    timeRef.current += delta;
    const time = timeRef.current;
    matRef.current.size  = 0.17 + Math.sin(time * 0.12) * 0.05;
    mat2Ref.current.size = 0.13 + Math.sin(time * 0.18 + 1) * 0.04;
    group1Ref.current.rotation.y = time * 0.016;
    group1Ref.current.rotation.z = Math.sin(time * 0.04) * 0.1;
    group2Ref.current.rotation.y = -time * 0.009;
    group2Ref.current.rotation.x = Math.sin(time * 0.06) * 0.06;
  });

  return (
    <>
      <group ref={group1Ref}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={count} array={pts1} itemSize={3} />
            <bufferAttribute attach="attributes-color"    count={count} array={col1} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial ref={matRef} size={0.2} vertexColors transparent map={circleTexture}
            opacity={0.52} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
      </group>
      <group ref={group2Ref}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={half} array={pts2} itemSize={3} />
            <bufferAttribute attach="attributes-color"    count={half} array={col2} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial ref={mat2Ref} size={0.15} vertexColors transparent map={circleTexture}
            opacity={0.38} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
      </group>
    </>
  );
}
