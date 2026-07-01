import { motion, AnimatePresence } from 'motion/react';
import { Timer } from 'lucide-react';

export const INTERVALS = [
  { v: 5,   l: '5 min' },
  { v: 15,  l: '15 min' },
  { v: 30,  l: '30 min' },
  { v: 60,  l: '1 hour' },
  { v: 120, l: '2 hours' },
];

export const TIMES_OPTS = [
  { v: 3,  l: '3×' },
  { v: 5,  l: '5×' },
  { v: 10, l: '10×' },
  { v: 0,  l: '∞' },
];

interface Props {
  awEnabled: boolean;
  setAwEnabled: (v: boolean) => void;
  awInterval: number;
  setAwInterval: (v: number) => void;
  awTimes: number;
  setAwTimes: (v: number) => void;
  focus: string;
  note: string;
  onAutoWaterChange: (enabled: boolean, interval: number, times: number, focus: string, note: string) => void;
}

export default function WaterSchedule({
  awEnabled, setAwEnabled, awInterval, setAwInterval, awTimes, setAwTimes,
  focus, note, onAutoWaterChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer size={14} className="text-cyan-400" />
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Auto-water</p>
        </div>
        <button
          onClick={() => {
            const v = !awEnabled;
            setAwEnabled(v);
            onAutoWaterChange(v, awInterval, awTimes, focus, note);
          }}
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
                      onClick={() => { setAwInterval(opt.v); onAutoWaterChange(true, opt.v, awTimes, focus, note); }}
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
                      onClick={() => { setAwTimes(opt.v); onAutoWaterChange(true, awInterval, opt.v, focus, note); }}
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
  );
}
