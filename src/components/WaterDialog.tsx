import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Droplets, Timer } from 'lucide-react';
import { FOCUS_AREAS, DEPTH_OPTIONS, type FocusId, type DepthId } from '../services/watering';
import type { Suggestion } from '../types';

const INTERVALS = [
  { v: 5,   l: '5 min' },
  { v: 15,  l: '15 min' },
  { v: 30,  l: '30 min' },
  { v: 60,  l: '1 hour' },
  { v: 120, l: '2 hours' },
];

const TIMES_OPTS = [
  { v: 3,  l: '3×' },
  { v: 5,  l: '5×' },
  { v: 10, l: '10×' },
  { v: 0,  l: '∞' },
];

interface Props {
  suggestion: Suggestion;
  quota: number;
  isFree: boolean;
  onWater: (focus: FocusId, depth: DepthId, note: string) => void;
  onClose: () => void;
  onAutoWaterChange?: (enabled: boolean, interval: number, times: number, focus: string, note: string) => void;
}

export default function WaterDialog({ suggestion, quota, isFree, onWater, onClose, onAutoWaterChange }: Props) {
  const [focus, setFocus] = useState<FocusId>((suggestion.autoWaterFocus as FocusId) ?? 'ux');
  const [depth, setDepth] = useState<DepthId>('balanced');
  const [note,  setNote]  = useState(suggestion.autoWaterNote ?? '');

  const [awEnabled,  setAwEnabled]  = useState<boolean>(suggestion.autoWaterEnabled ?? false);
  const [awInterval, setAwInterval] = useState<number>(suggestion.autoWaterInterval ?? 30);
  const [awTimes,    setAwTimes]    = useState<number>(suggestion.autoWaterTimes ?? 5);

  const selectedDepth = DEPTH_OPTIONS.find(d => d.id === depth)!;
  const cost     = isFree ? 0 : selectedDepth.cost;
  const canAfford = isFree || quota >= selectedDepth.cost;

  const fireAutoWater = (enabled: boolean, interval: number, times: number, f: string, n: string) =>
    onAutoWaterChange?.(enabled, interval, times, f, n);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-gray-900 sm:bg-black/70 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="flex flex-col h-full sm:h-auto sm:max-h-[90vh] w-full sm:max-w-lg bg-gray-900 sm:border sm:border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
      >
        {/* Header */}
        <div className="flex-none bg-gray-900 border-b border-white/10">
          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-700 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 sm:py-4">
            <div className="flex items-center gap-2">
              <Droplets size={18} className="text-cyan-400" />
              <span className="font-semibold text-white">Water App</span>
              <span className="text-xs text-gray-400 ml-1">gen {(suggestion.evolutions?.length ?? 0) + 1}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Focus */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Evolution Focus</p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map(f => (
                <button key={f.id} onClick={() => { setFocus(f.id as FocusId); fireAutoWater(awEnabled, awInterval, awTimes, f.id, note); }}
                  className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all min-h-[56px] ${
                    focus === f.id ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}>
                  <span className="text-lg leading-none mt-0.5 shrink-0">{f.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">{f.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-snug">{f.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Depth */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Depth</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {DEPTH_OPTIONS.map(d => (
                <button key={d.id} onClick={() => setDepth(d.id as DepthId)}
                  className={`flex-1 min-w-[96px] p-3 rounded-xl border text-center transition-all shrink-0 ${
                    depth === d.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}>
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{d.description}</div>
                  <div className={`text-xs font-medium mt-1.5 ${isFree ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isFree ? 'Free' : `${d.cost} ⚡`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Creator Note <span className="normal-case text-gray-500">(optional)</span>
            </p>
            <textarea value={note} onChange={e => { setNote(e.target.value); fireAutoWater(awEnabled, awInterval, awTimes, focus, e.target.value); }}
              placeholder="Anything specific you want changed or preserved…" rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none outline-none focus:border-white/30 transition-colors" />
          </div>

          {/* Auto-water schedule */}
          {onAutoWaterChange && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer size={14} className="text-cyan-400" />
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Auto-water</p>
                </div>
                <button
                  onClick={() => { const v = !awEnabled; setAwEnabled(v); fireAutoWater(v, awInterval, awTimes, focus, note); }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${awEnabled ? 'bg-cyan-500' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${awEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <AnimatePresence>
                {awEnabled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="bg-white/5 rounded-xl p-4 space-y-4">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Every</p>
                        <div className="flex gap-2 flex-wrap">
                          {INTERVALS.map(opt => (
                            <button key={opt.v}
                              onClick={() => { setAwInterval(opt.v); fireAutoWater(true, opt.v, awTimes, focus, note); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                awInterval === opt.v ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                              }`}>
                              {opt.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Total waterings</p>
                        <div className="flex gap-2">
                          {TIMES_OPTS.map(opt => (
                            <button key={opt.v}
                              onClick={() => { setAwTimes(opt.v); fireAutoWater(true, awInterval, opt.v, focus, note); }}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                awTimes === opt.v ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                              }`}>
                              {opt.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-[10px] text-cyan-400/70">
                        Will water every {INTERVALS.find(i => i.v === awInterval)?.l ?? awInterval + ' min'},&nbsp;
                        {awTimes === 0 ? 'unlimited times' : `${awTimes} times total`}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none bg-gray-900 px-5 pt-4 border-t border-white/10 flex items-center justify-between"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <div className="flex items-center gap-1.5 text-sm">
            <Zap size={14} className={isFree ? 'text-green-400' : 'text-yellow-400'} />
            {isFree ? (
              <span className="text-green-400">Free (local AI)</span>
            ) : (
              <span className={quota < selectedDepth.cost ? 'text-red-400' : 'text-gray-300'}>
                {cost} / {quota} energy
              </span>
            )}
          </div>
          <button onClick={() => canAfford && onWater(focus, depth, note)} disabled={!canAfford}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              canAfford ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}>
            <Droplets size={16} />
            Water Now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
