import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function GalaxyField() {
  const coreRef = useRef<THREE.Points>(null!);
  const armRef  = useRef<THREE.Points>(null!);
  const haloRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);

  // Dense warm core: gold/white packed near center
  const { corePos, coreCol } = useMemo(() => {
    const count = 320;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = Math.pow(Math.random(), 1.6) * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.25;
      pos[i * 3 + 2] = r * Math.cos(phi);
      const t = r / 6;
      const c = new THREE.Color().setHSL(0.1 - t * 0.02, 0.85, 0.92 - t * 0.28);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { corePos: pos, coreCol: col };
  }, []);

  // 4-arm logarithmic spiral — well-defined arms with tighter inner spread
  const { armPos, armCol } = useMemo(() => {
    const count = 800;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const armIdx = i % 4;
      const t      = Math.random();
      const r      = 4.5 + t * 19;
      const wind   = 2.5;
      const baseA  = armIdx * (Math.PI / 2);
      const spread = (Math.random() - 0.5) * (0.45 + t * 1.3);
      const angle  = baseA + t * wind + spread;
      pos[i * 3]     = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * r * 0.14;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      const hue = 0.08 + t * 0.45;
      const c = new THREE.Color().setHSL(hue, 0.88 - t * 0.3, 0.82 - t * 0.22);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { armPos: pos, armCol: col };
  }, []);

  // Faint outer halo: cool blue/violet scattered stars
  const { haloPos, haloCol } = useMemo(() => {
    const count = 550;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = 18 + Math.random() * 24;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.3;
      pos[i * 3 + 2] = r * Math.cos(phi);
      const hue = 0.57 + Math.random() * 0.17;
      const c = new THREE.Color().setHSL(hue, 0.65, 0.62);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { haloPos: pos, haloCol: col };
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    if (coreRef.current) coreRef.current.rotation.y = t * 0.009;
    if (armRef.current)  armRef.current.rotation.y  = t * 0.006;
    if (haloRef.current) haloRef.current.rotation.y = t * 0.002;
  });

  return (
    <group>
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={320} array={corePos} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={320} array={coreCol} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.24} vertexColors transparent opacity={0.9} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <points ref={armRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={800} array={armPos} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={800} array={armCol} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.10} vertexColors transparent opacity={0.60} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <points ref={haloRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={550} array={haloPos} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={550} array={haloCol} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.055} vertexColors transparent opacity={0.24} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}
