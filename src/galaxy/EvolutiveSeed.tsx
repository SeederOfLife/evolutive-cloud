import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function EvolutiveSeed({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  const disk1Ref      = useRef<THREE.Mesh>(null!);
  const disk2Ref      = useRef<THREE.Mesh>(null!);
  const disk3Ref      = useRef<THREE.Mesh>(null!);
  const disk4Ref      = useRef<THREE.Mesh>(null!);
  const jet1MatRef    = useRef<THREE.MeshBasicMaterial>(null!);
  const jet2MatRef    = useRef<THREE.MeshBasicMaterial>(null!);
  const lensingRef    = useRef<THREE.Mesh>(null!);
  const outerRingRef  = useRef<THREE.Mesh>(null!);
  const timeRef       = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    if (disk1Ref.current) disk1Ref.current.rotation.z = t * 1.3;
    if (disk2Ref.current) disk2Ref.current.rotation.z = t * 0.78;
    if (disk3Ref.current) disk3Ref.current.rotation.z = t * 0.44;
    if (disk4Ref.current) disk4Ref.current.rotation.z = t * 0.22;
    const ja = 0.48 + Math.sin(t * 2.04) * 0.22 + Math.sin(t * 4.68) * 0.08;
    if (jet1MatRef.current) jet1MatRef.current.opacity = ja;
    if (jet2MatRef.current) jet2MatRef.current.opacity = ja;
    if (outerRingRef.current) outerRingRef.current.rotation.z = t * 0.06;
    if (lensingRef.current) {
      lensingRef.current.scale.setScalar(isOpen ? 1.12 : 1 + Math.sin(t * 0.8) * 0.04);
    }
  });

  return (
    <group onClick={onClick}>
      {/* Ambient lighting from the hot accretion disk */}
      <pointLight color="#ff9940" intensity={isOpen ? 18 : 12} distance={40} decay={1.6} />
      <pointLight color="#6040ff" intensity={2.5} distance={12} decay={2.0} />

      {/* Event horizon — pure black singularity */}
      <mesh>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshStandardMaterial color="#000004" emissive="#000000" emissiveIntensity={0} metalness={1} roughness={0.05} />
      </mesh>

      {/* Photon ring — ultra-bright ring right at event horizon (like M87* / Sgr A*) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.64, 0.76, 128]} />
        <meshBasicMaterial color="#ffe4a0" transparent opacity={0.96} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Einstein lensing glow — large faint warm halo */}
      <mesh ref={lensingRef}>
        <sphereGeometry args={[2.2, 16, 16]} />
        <meshBasicMaterial color="#c87020" transparent opacity={0.025} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Accretion disk — innermost hot ring (white-orange) */}
      <mesh ref={disk1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.76, 1.18, 90]} />
        <meshBasicMaterial color="#fff0b0" transparent opacity={0.82} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Accretion disk — mid ring (orange) */}
      <mesh ref={disk2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.18, 1.85, 90]} />
        <meshBasicMaterial color="#ff9030" transparent opacity={0.52} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Accretion disk — outer ring (deep red) */}
      <mesh ref={disk3Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.85, 2.55, 90]} />
        <meshBasicMaterial color="#cc4010" transparent opacity={0.26} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Accretion disk — far fringe (faint purple) */}
      <mesh ref={disk4Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.55, 3.4, 90]} />
        <meshBasicMaterial color="#802880" transparent opacity={0.1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Outer dust ring */}
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.9, 0.035, 6, 128]} />
        <meshBasicMaterial color="#c08020" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Polar jet — north */}
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.02, 0.09, 3.8, 8, 1]} />
        <meshBasicMaterial ref={jet1MatRef} color="#a0d0ff" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Polar jet — south */}
      <mesh position={[0, -2.6, 0]}>
        <cylinderGeometry args={[0.09, 0.02, 3.8, 8, 1]} />
        <meshBasicMaterial ref={jet2MatRef} color="#a0d0ff" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
