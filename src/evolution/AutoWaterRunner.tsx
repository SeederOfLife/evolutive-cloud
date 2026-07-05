import { useEffect, useRef } from 'react';
import type { Suggestion } from '../types';
import type { FocusId, DepthId } from '../services/watering';

interface Props {
  suggestions: Suggestion[];
  wateringId: string | null;
  onFire: (s: Suggestion, focus: FocusId, depth: DepthId, note: string) => void;
}

export function AutoWaterRunner({ suggestions, wateringId, onFire }: Props) {
  const onFireRef = useRef(onFire);
  const wateringRef = useRef(wateringId);
  // If a fire fails, no evolution is written and the app stays eligible —
  // without this, it would retry every 15s and burn quota/rate limits.
  const lastAttempt = useRef<Record<string, number>>({});
  useEffect(() => { onFireRef.current = onFire; }, [onFire]);
  useEffect(() => { wateringRef.current = wateringId; }, [wateringId]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (wateringRef.current) return; // already watering, wait
      const now = Date.now();
      for (const s of suggestions) {
        if (!s.autoWaterEnabled || !s.autoWaterInterval || s.id.startsWith('seed_')) continue;
        const times = s.autoWaterTimes ?? 0;
        if (times !== 0 && (s.evolutions?.length ?? 0) >= times) continue; // limit reached
        const intervalMs = s.autoWaterInterval * 60_000;
        const lastTs = s.evolutions?.[0]?.timestamp;
        const refAt = lastTs
          ? new Date(lastTs).getTime()
          : (s.created_at ? new Date(s.created_at).getTime() : now);
        const retryDelay = Math.max(intervalMs, 5 * 60_000);
        if ((lastAttempt.current[s.id] ?? 0) + retryDelay > now) continue;
        if (now >= refAt + intervalMs) {
          lastAttempt.current[s.id] = now;
          onFireRef.current(
            s,
            (s.autoWaterFocus ?? 'ux') as FocusId,
            'balanced' as DepthId,
            s.autoWaterNote ?? '',
          );
          return; // one at a time — next eligible app fires on the next tick
        }
      }
    }, 15_000);
    return () => clearInterval(tick);
  }, [suggestions]);

  return null;
}
