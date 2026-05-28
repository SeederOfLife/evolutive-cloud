import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Droplets } from 'lucide-react';
import { FOCUS_AREAS, DEPTH_OPTIONS, type FocusId, type DepthId } from '../services/watering';
import type { Suggestion } from '../types';

interface Props {
  suggestion: Suggestion;
  quota: number;
  isFree: boolean;
  onWater: (focus: FocusId, depth: DepthId, note: string) => void;
  onClose: () => void;
  onAutoWaterChange?: (val: Suggestion['autoWater']) => void;
}

export default function WaterDialog({ suggestion, quota, isFree, onWater, onClose, onAutoWaterChange }: Props) {
  const [focus, setFocus] = useState<FocusId>('ux');
  const [depth, setDepth] = useState<DepthId>('balanced');
  const [note, setNote] = useState('');

  const selectedDepth = DEPTH_OPTIONS.find(d => d.id === depth)!;
  const cost = isFree ? 0 : selectedDepth.cost;
  const canAfford = isFree || quota >= selectedDepth.cost;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-gray-900 sm:bg-black/70 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="flex flex-col h-full sm:h-auto sm:max-h-[90vh] w-full sm:max-w-lg bg-gray-900 sm:border sm:border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
      >
        {/* Sticky Header */}
        <div className="flex-none bg-gray-900 border-b border-white/10">
          {/* Mobile drag handle */}
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Focus area - 2-col grid on mobile, 2-col on desktop */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Evolution Focus</p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFocus(f.id as FocusId)}
                  className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all min-h-[56px] ${
                    focus === f.id
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg leading-none mt-0.5 shrink-0">{f.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">{f.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-snug">{f.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Depth - horizontal scrollable pills */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Depth</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {DEPTH_OPTIONS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDepth(d.id as DepthId)}
                  className={`flex-1 min-w-[96px] p-3 rounded-xl border text-center transition-all shrink-0 ${
                    depth === d.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{d.description}</div>
                  <div className={`text-xs font-medium mt-1.5 ${isFree ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isFree ? 'Free' : `${d.cost} ⚡`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Note - full width */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Creator Note <span className="normal-case text-gray-500">(optional)</span>
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Anything specific you want changed or preserved…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {/* Auto-water */}
          {onAutoWaterChange && (
            <div className="flex items-start justify-between gap-3 py-2 border-t border-white/10">
              <div>
                <p className="text-sm text-gray-300">Auto-water</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">Like watering a plant — slower growth is fine.</p>
              </div>
              <select
                value={suggestion.autoWater ?? 'off'}
                onChange={e => onAutoWaterChange(e.target.value as Suggestion['autoWater'])}
                className="bg-gray-800 border border-white/10 text-sm text-gray-300 rounded-lg px-3 py-1.5 outline-none shrink-0"
              >
                <option value="off">Off</option>
                <option value="daily">Daily</option>
                <option value="every-2-days">Every 2 days</option>
                <option value="every-3-days">Every 3 days</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div
          className="flex-none bg-gray-900 px-5 pt-4 border-t border-white/10 flex items-center justify-between"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
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
          <button
            onClick={() => canAfford && onWater(focus, depth, note)}
            disabled={!canAfford}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              canAfford
                ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Droplets size={16} />
            Water Now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
