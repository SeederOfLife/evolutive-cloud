import { useState, useMemo, useEffect } from 'react';
import { Droplets, Timer, Zap, ChevronDown, ChevronUp, Play, Clock, Bell, Info, X } from 'lucide-react';
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

function nextWaterIn(s: Suggestion, now: number): string {
  if (!s.autoWaterEnabled || !s.autoWaterInterval) return '';
  const times = s.autoWaterTimes ?? 0;
  if (times !== 0 && (s.evolutions?.length ?? 0) >= times) return 'limit reached';
  const intervalMs = s.autoWaterInterval * 60_000;
  const lastTs = s.evolutions?.[0]?.timestamp;
  const refAt = lastTs ? new Date(lastTs).getTime()
    : (s.created_at ? new Date(s.created_at).getTime() : now);
  const diff = refAt + intervalMs - now;
  if (diff <= 0) return 'due now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `in ${h}h ${rem}m` : `in ${h}h`;
}

const INFO_TEXT = `Watering = an AI pass that evolves your app.
Each pass improves one focus area (UX, design, features…).
The auto-water timer fires in the background — you don't need to keep the app open.
After each pass you get a browser notification with a summary of what changed.
Energy (⚡) is consumed per pass: gentle 10, balanced 20, wild 35.`;

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
  const [infoApp, setInfoApp] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const myApps = useMemo(() =>
    suggestions
      .filter(s => s.status === 'built' && s.built_code && !s.is_deleted && s.user_id === user?.uid)
      .sort((a, b) => {
        if (a.autoWaterEnabled && !b.autoWaterEnabled) return -1;
        if (!a.autoWaterEnabled && b.autoWaterEnabled) return 1;
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
    const h = (now - new Date(last).getTime()) / 3600000;
    if (h < 1)  return { label: 'Just watered', color: 'text-emerald-400' };
    if (h < 24) return { label: 'Growing', color: 'text-indigo-400' };
    if (h > 720) return { label: 'Needs water', color: 'text-amber-400' };
    return { label: 'Dormant', color: 'text-gray-400' };
  };

  const notifState = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  const handleNotifTest = async () => {
    if (notifState === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') {
      new Notification('✨ Evolutive — notifications active!', {
        body: 'You will be notified when your apps evolve.', icon: '/favicon.ico',
      });
    }
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
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-black uppercase tracking-widest text-white">Garden</span>
          <span className="text-xs text-gray-600">{myApps.length} app{myApps.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleNotifTest} title={notifState === 'granted' ? 'Test notification' : 'Enable notifications'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all ${
              notifState === 'granted'
                ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                : 'bg-white/8 border border-white/10 text-gray-500 hover:text-gray-300'
            }`}>
            <Bell className="w-3 h-3" />
            {notifState === 'granted' ? 'notif ON' : notifState === 'denied' ? 'notif OFF' : 'enable notif'}
          </button>
          <div className="flex items-center gap-1.5 text-xs text-yellow-400">
            <Zap className="w-3 h-3" />
            <span className="font-medium tabular-nums">{apiQuota}</span>
            <span className="text-gray-600">energy</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 pb-32">
        {myApps.map(s => {
          const status = getStatus(s);
          const genCount = s.evolutions?.length ?? 0;
          const lastWateredTs = s.evolutions?.[0]?.timestamp;
          const isExpanded = expanded === s.id;
          const isInfo = infoApp === s.id;
          const schedule = scheduleLabel(s);
          const countdown = nextWaterIn(s, now);
          const label = s.content.length > 40 ? s.content.substring(0, 40) + '…' : s.content;

          return (
            <div key={s.id}
              className={`bg-gray-900 border rounded-2xl overflow-hidden transition-all ${
                wateringId === s.id ? 'border-cyan-500/40' : 'border-white/8'
              }`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  wateringId === s.id ? 'bg-cyan-400 animate-pulse' :
                  status.color.includes('emerald') ? 'bg-emerald-400' :
                  status.color.includes('indigo')  ? 'bg-indigo-400' :
                  status.color.includes('amber')   ? 'bg-amber-400'  : 'bg-gray-600'
                }`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{label}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                    {genCount > 0 && <span className="text-[10px] text-gray-600">v{genCount + 1}</span>}
                    {lastWateredTs && (
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{timeAgo(lastWateredTs)}
                      </span>
                    )}
                  </div>
                </div>

                {s.autoWaterEnabled && (
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                      <Timer className="w-2.5 h-2.5 text-cyan-400" />
                      <span className="text-[9px] text-cyan-400 font-medium">{schedule}</span>
                    </div>
                    {countdown && (
                      <span className={`text-[9px] font-medium px-2 ${
                        countdown === 'due now' ? 'text-amber-400' :
                        countdown === 'limit reached' ? 'text-gray-600' : 'text-gray-500'
                      }`}>{countdown}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => onOpenApp(s)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-400 hover:text-white transition-all">
                    <Play className="w-3 h-3" />
                  </button>
                  <button onClick={() => onOpenWater(s)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/25 text-cyan-300 transition-all text-[11px] font-bold">
                    <Droplets className="w-3 h-3" />Water
                  </button>
                  <button onClick={() => setInfoApp(isInfo ? null : s.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-500 hover:text-gray-300 transition-all">
                    {isInfo ? <X className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                  </button>
                  {genCount > 0 && (
                    <button onClick={() => setExpanded(isExpanded ? null : s.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/8 hover:bg-white/15 text-gray-500 hover:text-gray-300 transition-all">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {isInfo && (
                <div className="border-t border-white/6 px-4 py-3 bg-indigo-950/30">
                  <p className="text-[10px] text-gray-400 leading-relaxed whitespace-pre-line">{INFO_TEXT}</p>
                </div>
              )}

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
