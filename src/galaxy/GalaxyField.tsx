import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function GalaxyField() {
  const armRef    = useRef<THREE.Points>(null!);
  const brightRef = useRef<THREE.Points>(null!);
  const timeRef   = useRef(0);

  const { pos1, col1 } = useMemo(() => {
    const count = 300;
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
      const t = Math.min(1, (r - 9) / 22);
      const c = warm.clone().lerp(cool, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { pos1: pos, col1: col };
  }, []);

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
