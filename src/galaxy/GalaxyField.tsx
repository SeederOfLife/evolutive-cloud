import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function buildStarTexture(tint = "rgba(200,190,255,0.15)") {
  const c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0,    "rgba(255,255,255,1)");
  g.addColorStop(0.2,  "rgba(255,255,255,0.9)");
  g.addColorStop(0.55, tint);
  g.addColorStop(1,    "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export function GalaxyField() {
  const coreRef = useRef<THREE.Points>(null!);
  const armRef  = useRef<THREE.Points>(null!);
  const bgRef   = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);

  const starTex = useMemo(() => buildStarTexture(), []);
  const coreTex = useMemo(() => buildStarTexture("rgba(255,220,120,0.2)"), []);

  // Deep-field background: 2800 tiny cool stars scattered everywhere
  const { bgPos, bgCol } = useMemo(() => {
    const count = 2800;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = 12 + Math.random() * 38;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      pos[i * 3 + 2] = r * Math.cos(phi);
      const hue = 0.55 + Math.random() * 0.2;
      const c = new THREE.Color().setHSL(hue, 0.5, 0.55 + Math.random() * 0.3);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { bgPos: pos, bgCol: col };
  }, []);

  // Dense warm core: gold/amber packed near center, power-law concentrated
  const { corePos, coreCol } = useMemo(() => {
    const count = 280;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = Math.pow(Math.random(), 1.4) * 5.5;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3]     = Math.cos(theta) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * r * 0.22;
      pos[i * 3 + 2] = Math.sin(theta) * r;
      const t = r / 5.5;
      const c = new THREE.Color().setHSL(0.1 - t * 0.03, 0.88, 0.92 - t * 0.3);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { corePos: pos, coreCol: col };
  }, []);

  // 4-arm logarithmic spiral: warm inner → cool blue outer
  const { armPos, armCol } = useMemo(() => {
    const count = 900;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const arm  = i % 4;
      const t    = Math.random();
      const r    = 4.5 + t * 20;
      const base = arm * (Math.PI / 2);
      const wind = 2.6;
      const spread = (Math.random() - 0.5) * (0.4 + t * 1.4);
      const angle  = base + t * wind + spread;
      pos[i * 3]     = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * r * 0.13;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      const hue = 0.08 + t * 0.48;
      const c = new THREE.Color().setHSL(hue, 0.9 - t * 0.3, 0.82 - t * 0.2);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { armPos: pos, armCol: col };
  }, []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    if (bgRef.current)   bgRef.current.rotation.y   = t * 0.0018;
    if (coreRef.current) coreRef.current.rotation.y = t * 0.007;
    if (armRef.current)  armRef.current.rotation.y  = t * 0.005;
  });

  return (
    <group>
      {/* Deep-field background — tiny cool dots */}
      <points ref={bgRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2800} array={bgPos} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={2800} array={bgCol} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial map={starTex} size={0.055} vertexColors transparent opacity={0.38} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      {/* Dense warm core */}
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={280} array={corePos} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={280} array={coreCol} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial map={coreTex} size={0.16} vertexColors transparent opacity={0.88} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      {/* 4-arm spiral */}
      <points ref={armRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={900} array={armPos} itemSize={3} />
          <bufferAttribute attach="attributes-color"    count={900} array={armCol} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial map={starTex} size={0.09} vertexColors transparent opacity={0.62} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}
