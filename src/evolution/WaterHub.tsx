import { useState, useMemo } from 'react';
import { Droplets, Timer, Zap, ChevronDown, ChevronUp, Play, Clock } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Suggestion } from '../types';

function timeAgo(ts: string | undefined): string {
  if (!ts) return 'never';
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function scheduleLabel(s: Suggestion): string {
  if (!s.autoWaterEnabled) return 'off';
  const min = s.autoWaterInterval ?? 30;
  const times = s.autoWaterTimes === 0 ? '∞' : `${s.autoWaterTimes}×`;
  const freq = min < 60 ? `${min}m` : `${min / 60}h`;
  return `every ${freq} · ${times}`;
}

interface Props {
  suggestions: Suggestion[];
  user: User | null;
  wateringId: string | null;
  apiQuota: number;
  onOpenApp: (s: Suggestion) => void;
  onOpenWater: (s: Suggestion) => void;
}

export default function WaterHub({ suggestions, user, wateringId, apiQuota, onOpenApp, onOpenWater }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const myApps = useMemo(() =>
    suggestions
      .filter(s => s.status === 'built' && s.built_code && !s.is_deleted && s.user_id === user?.uid)
      .sort((a, b) => {
        const ta = a.evolutions?.[0]?.timestamp ?? a.created_at ?? '';
        const tb = b.evolutions?.[0]?.timestamp ?? b.created_at ?? '';
        return tb.localeCompare(ta);
      }),
    [suggestions, user]
  );

  const getStatus = (s: Suggestion) => {
    if (wateringId === s.id) return { label: 'Watering…', color: 'text-cyan-400' };
    const last = s.evolutions?.[0]?.timestamp;
    if (!last) return { label: 'Never watered', color: 'text-gray-500' };
    const h = (Date.now() - new Date(last).getTime()) / 3600000;
    if (h < 1)  return { label: 'Just watered', color: 'text-emerald-400' };
    if (h < 24) return { label: 'Growing', color: 'text-indigo-400' };
    if (h > 720) return { label: 'Needs water', color: 'text-amber-400' };
    return { label: 'Dormant', color: 'text-gray-400' };
  };

  if (myApps.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
        <Droplets className="w-10 h-10 text-cyan-500/30 mb-4" />
        <p className="text-gray-400 text-sm">No apps to water yet.</p>
        <p className="text-gray-600 text-xs mt-1">Build your first app and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-black uppercase tracking-widest text-white">Garden</span>
          <span className="text-xs text-gray-600">{myApps.length} app{myApps.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-yellow-400">
          <Zap className="w-3 h-3" />
          <span className="font-medium tabular-nums">{apiQuota}</span>
          <span className="text-gray-600">energy</span>
        </div>
      </div>

      <div className="p-4 space-y-3 pb-32">
        {myApps.map(s => {
          const status = getStatus(s);
          const genCount = s.evolutions?.length ?? 0;
          const lastWateredTs = s.evolutions?.[0]?.timestamp;
          const isExpanded = expanded === s.id;
          const schedule = scheduleLabel(s);
          const label = s.content.length > 40 ? s.content.substring(0, 40) + '…' : s.content;

          return (
            <div key={s.id}
              className={`bg-gray-900 border rounded-2xl overflow-hidden transition-all ${
                wateringId === s.id ? 'border-cyan-500/40' : 'border-white/8'
              }`}>
              {/* Card main row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  wateringId === s.id ? 'bg-cyan-400 animate-pulse' :
                  status.color.includes('emerald') ? 'bg-emerald-400' :
                  status.color.includes('indigo')  ? 'bg-indigo-400' :
                  status.color.includes('amber')   ? 'bg-amber-400'  : 'bg-gray-600'
                }`} />

                {/* App info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{label}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                    {genCount > 0 && <span className="text-[10px] text-gray-600">gen {genCount + 1}</span>}
                    {lastWateredTs && (
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{timeAgo(lastWateredTs)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Schedule badge */}
                {s.autoWaterEnabled && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full shrink-0">
                    <Timer className="w-2.5 h-2.5 text-cyan-400" />
                    <span className="text-[9px] text-cyan-400 font-medium">{schedule}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => onOpenApp(s)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-400 hover:text-white transition-all">
                    <Play className="w-3 h-3" />
                  </button>
                  <button onClick={() => onOpenWater(s)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/25 text-cyan-300 transition-all text-[11px] font-bold">
                    <Droplets className="w-3 h-3" />
                    Water
                  </button>
                  {genCount > 0 && (
                    <button onClick={() => setExpanded(isExpanded ? null : s.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-500 hover:text-gray-300 transition-all">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Evolution timeline (expand) */}
              {isExpanded && (
                <div className="border-t border-white/6 px-4 py-3 space-y-2.5 bg-black/20">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black">Evolution Tree</p>
                  {(s.evolutions ?? []).slice(0, 8).map((ev, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {i < (s.evolutions?.length ?? 1) - 1 && (
                          <div className="w-px flex-1 min-h-[14px] bg-indigo-500/20 mt-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">{ev.focus}</span>
                          <span className="text-[9px] text-gray-600">{timeAgo(ev.timestamp)}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-snug">{ev.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
