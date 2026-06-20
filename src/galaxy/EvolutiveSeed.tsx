import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function EvolutiveSeed({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  const glowRef       = useRef<THREE.Mesh>(null!);
  const disk1Ref      = useRef<THREE.Mesh>(null!);
  const disk2Ref      = useRef<THREE.Mesh>(null!);
  const disk3Ref      = useRef<THREE.Mesh>(null!);
  const disk4Ref      = useRef<THREE.Mesh>(null!);
  const jet1MatRef    = useRef<THREE.MeshBasicMaterial>(null!);
  const jet2MatRef    = useRef<THREE.MeshBasicMaterial>(null!);
  const outerRingRef  = useRef<THREE.Mesh>(null!);
  const outerPulseRef = useRef<THREE.Mesh>(null!);
  const timeRef       = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    if (disk1Ref.current) disk1Ref.current.rotation.z = t * 1.04;
    if (disk2Ref.current) disk2Ref.current.rotation.z = t * 0.64;
    if (disk3Ref.current) disk3Ref.current.rotation.z = t * 0.36;
    if (disk4Ref.current) disk4Ref.current.rotation.z = t * 0.18;
    if (glowRef.current) glowRef.current.scale.setScalar(1 + Math.sin(t * 1.24) * 0.07 + Math.sin(t * 2.92) * 0.03);
    const ja = 0.55 + Math.sin(t * 2.04) * 0.18 + Math.sin(t * 4.68) * 0.08;
    if (jet1MatRef.current) jet1MatRef.current.opacity = ja;
    if (jet2MatRef.current) jet2MatRef.current.opacity = ja;
    if (outerRingRef.current) outerRingRef.current.rotation.z = t * 0.08;
    if (outerPulseRef.current) outerPulseRef.current.scale.setScalar(1 + Math.sin(t * 2.094) * 0.05);
  });

  return (
    <group onClick={onClick}>
      <pointLight color="#ffffff" intensity={isOpen ? 20 : 14} distance={45} decay={1.8} />
      <pointLight color="#d8c8ff" intensity={3.0} distance={10} decay={2.2} />
      <mesh>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshStandardMaterial color="#04040e" emissive="#04040e" emissiveIntensity={0} metalness={1} roughness={0} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.60, 16, 16]} />
        <meshBasicMaterial color="#fffef8" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={outerPulseRef}>
        <sphereGeometry args={[2.0, 16, 16]} />
        <meshBasicMaterial color="#c4b0ff" transparent opacity={0.04} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={disk1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.68, 1.08, 90]} />
        <meshBasicMaterial color="#fff4c0" transparent opacity={0.78} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={disk2Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.08, 1.65, 90]} />
        <meshBasicMaterial color="#ffd060" transparent opacity={0.46} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={disk3Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.65, 2.35, 90]} />
        <meshBasicMaterial color="#e09040" transparent opacity={0.22} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={disk4Ref} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.35, 3.1, 90]} />
        <meshBasicMaterial color="#b07038" transparent opacity={0.09} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.6, 0.04, 6, 128]} />
        <meshBasicMaterial color="#c89820" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.025, 0.11, 3.2, 8, 1]} />
        <meshBasicMaterial ref={jet1MatRef} color="#ffffff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, -2.2, 0]}>
        <cylinderGeometry args={[0.11, 0.025, 3.2, 8, 1]} />
        <meshBasicMaterial ref={jet2MatRef} color="#ffffff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
