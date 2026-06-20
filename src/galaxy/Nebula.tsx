import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

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

  const { points2, colors2 } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3]     = -points[i * 3];
      p[i * 3 + 1] =  points[i * 3 + 1];
      p[i * 3 + 2] = -points[i * 3 + 2];
      c[i * 3] = colors[i * 3]; c[i * 3 + 1] = colors[i * 3 + 1]; c[i * 3 + 2] = colors[i * 3 + 2];
    }
    return { points2: p, colors2: c };
  }, [points, colors]);

  useFrame((_, delta) => {
    if (!matRef.current || !groupRef.current) return;
    timeRef.current += delta;
    const time = timeRef.current;
    matRef.current.size = 0.15 + Math.sin(time * 0.15) * 0.05;
    groupRef.current.rotation.y = time * 0.015;
    groupRef.current.rotation.z = Math.sin(time * 0.05) * 0.1;
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={points}  itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={count} array={colors}  itemSize={3} />
        </bufferGeometry>
        <pointsMaterial ref={matRef} size={0.2} vertexColors transparent map={circleTexture}
          opacity={0.55} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={points2} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={count} array={colors2} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.2} vertexColors transparent map={circleTexture}
          opacity={0.45} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}
