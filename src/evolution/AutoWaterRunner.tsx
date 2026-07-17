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
  const suggestionsRef = useRef(suggestions);
  // Per app: when we last fired + the evolution count then. Lets us tell a
  // successful water (count grew) from a failed one (retry, don't hammer quota).
  const lastFire = useRef<Record<string, { at: number; evoCount: number }>>({});
  // Auto-waterings fired THIS SESSION per app — the "total times" cap counts these,
  // never the app's whole evolution history (manual waters must not eat the budget).
  const firedCount = useRef<Record<string, number>>({});

  useEffect(() => { onFireRef.current = onFire; }, [onFire]);
  useEffect(() => { wateringRef.current = wateringId; }, [wateringId]);
  useEffect(() => { suggestionsRef.current = suggestions; }, [suggestions]);

  useEffect(() => {
    const check = () => {
      if (wateringRef.current) return; // one at a time
      const now = Date.now();
      for (const s of suggestionsRef.current) {
        if (!s.autoWaterEnabled || !s.autoWaterInterval || s.id.startsWith('seed_')) continue;

        const cap = s.autoWaterTimes ?? 0; // 0 = unlimited
        if (cap !== 0 && (firedCount.current[s.id] ?? 0) >= cap) continue;

        const intervalMs = s.autoWaterInterval * 60_000;
        const evoCount = s.evolutions?.length ?? 0;
        const lastTs = s.evolutions?.[0]?.timestamp;
        const refAt = lastTs
          ? new Date(lastTs).getTime()
          : (s.created_at ? new Date(s.created_at).getTime() : now);

        // A previous attempt that produced no new evolution = failure → short
        // backoff (≤60s) so we don't burn quota every tick, then retry.
        const prev = lastFire.current[s.id];
        if (prev && evoCount <= prev.evoCount && now - prev.at < Math.min(intervalMs, 60_000)) continue;

        if (now >= refAt + intervalMs) {
          lastFire.current[s.id] = { at: now, evoCount };
          firedCount.current[s.id] = (firedCount.current[s.id] ?? 0) + 1;
          onFireRef.current(
            s,
            (s.autoWaterFocus ?? 'ux') as FocusId,
            'balanced' as DepthId,
            s.autoWaterNote ?? '',
          );
          return; // next eligible app fires on the next tick
        }
      }
    };

    const tick = setInterval(check, 10_000);
    // Returning to the tab (or unlocking the phone) triggers any due waterings
    // immediately — background timers get throttled/frozen by the browser.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    check(); // catch up on anything already due the moment we mount
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []); // stable interval — reads live data through refs

  return null;
}
