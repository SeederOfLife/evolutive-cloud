import { useEffect, useRef, useState } from 'react';
import type { Suggestion } from '../types';
import type { FocusId, DepthId } from '../services/watering';

export function useAutoWater(
  suggestion: Suggestion,
  onWater?: (focus: FocusId, depth: DepthId, note: string) => void,
) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [done, setDone] = useState(0);

  const metaRef = useRef({ done: 0, nextAt: 0, running: false });
  const onWaterRef = useRef(onWater);
  useEffect(() => { onWaterRef.current = onWater; }, [onWater]);

  const focusRef = useRef(suggestion.autoWaterFocus);
  const noteRef  = useRef(suggestion.autoWaterNote);
  useEffect(() => { focusRef.current = suggestion.autoWaterFocus; }, [suggestion.autoWaterFocus]);
  useEffect(() => { noteRef.current  = suggestion.autoWaterNote;  }, [suggestion.autoWaterNote]);

  const isEnabled = !!suggestion.autoWaterEnabled && !!onWater && !!suggestion.autoWaterInterval;

  useEffect(() => {
    if (!isEnabled) {
      setCountdown(null);
      setDone(0);
      metaRef.current.running = false;
      return;
    }

    const intervalMs = (suggestion.autoWaterInterval ?? 30) * 60 * 1000;
    const limit      = suggestion.autoWaterTimes ?? 0;

    metaRef.current = { done: 0, nextAt: Date.now() + intervalMs, running: true };
    setCountdown(Math.round(intervalMs / 1000));
    setDone(0);

    const tick = setInterval(() => {
      const meta = metaRef.current;
      if (!meta.running) return;

      const remaining = Math.max(0, Math.round((meta.nextAt - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining === 0) {
        const newDone = meta.done + 1;
        meta.done = newDone;
        setDone(newDone);

        const focus = (focusRef.current as FocusId) || 'ux';
        const note  = noteRef.current ?? '';
        onWaterRef.current?.(focus, 'balanced' as DepthId, note);

        if (limit > 0 && newDone >= limit) {
          meta.running = false;
          setCountdown(null);
          clearInterval(tick);
        } else {
          meta.nextAt = Date.now() + intervalMs;
        }
      }
    }, 1000);

    return () => clearInterval(tick);
  // Re-run only when core scheduling params change, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion.autoWaterEnabled, suggestion.autoWaterInterval, suggestion.autoWaterTimes, suggestion.id, isEnabled]);

  const stop = () => {
    metaRef.current.running = false;
    setCountdown(null);
  };

  return { countdown, done, isRunning: countdown !== null, stop };
}
