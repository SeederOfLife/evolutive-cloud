import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function OrbitRing({ radius, opacity = 0.12, color = "#6366f1" }: {
  radius: number;
  opacity?: number;
  color?: string;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.008;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.015, radius + 0.015, 128]} />
      <meshBasicMaterial color={color} opacity={opacity} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}
