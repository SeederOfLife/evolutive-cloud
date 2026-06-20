import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Suggestion } from "../types";

export function ForkLines({ suggestions, posRef }: {
  suggestions: Suggestion[];
  posRef: React.MutableRefObject<Map<string, THREE.Vector3>>;
}) {
  const linesRef = useRef<THREE.LineSegments>(null!);

  const forkPairs = useMemo(() =>
    suggestions
      .filter(s => s.parent_id && suggestions.some(p => p.id === s.parent_id))
      .map(s => ({ child: s.id, parent: s.parent_id! }))
      .slice(0, 20),
    [suggestions]
  );

  const lineCount = forkPairs.length;
  const posArray  = useRef(new Float32Array(Math.max(lineCount * 6, 6)));

  useFrame(() => {
    if (!linesRef.current || lineCount === 0) return;
    const map = posRef.current;
    for (let i = 0; i < lineCount; i++) {
      const child  = map.get(forkPairs[i].child);
      const parent = map.get(forkPairs[i].parent);
      if (child && parent) {
        posArray.current[i * 6 + 0] = child.x;
        posArray.current[i * 6 + 1] = child.y;
        posArray.current[i * 6 + 2] = child.z;
        posArray.current[i * 6 + 3] = parent.x;
        posArray.current[i * 6 + 4] = parent.y;
        posArray.current[i * 6 + 5] = parent.z;
      }
    }
    (linesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  if (lineCount === 0) return null;

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={lineCount * 2} array={posArray.current} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#818cf8" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}
