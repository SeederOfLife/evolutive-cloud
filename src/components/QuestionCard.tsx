import { useState } from "react";
import { AlertCircle, TrendingUp, Check, Plus, Loader2 } from "lucide-react";
import { generateMoreSuggestions } from "../services/refiner";
import type { RefinementQuestion } from "../services/refiner";

interface Props {
  question: RefinementQuestion;
  selectedPills: string[];
  customInput: string;
  onTogglePill: (pill: string) => void;
  onCustomInput: (val: string) => void;
  idea: string;
  callAI: (prompt: string) => Promise<string>;
}

export function QuestionCard({
  question: q, selectedPills, customInput, onTogglePill, onCustomInput, idea, callAI,
}: Props) {
  const isCritical = q.priority === "Critical";
  const [pills, setPills] = useState<string[]>(q.suggestions);
  const [loadingMore, setLoadingMore] = useState(false);

  const selectedCount = selectedPills.length + (customInput.trim() ? 1 : 0);

  const handleMoreSuggestions = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await generateMoreSuggestions(q.question, pills, idea, callAI);
      setPills(prev => [...prev, ...more.filter(s => !prev.includes(s))]);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <div className={`px-4 py-3 ${isCritical ? "bg-red-500/5 border-b border-red-500/15" : "bg-orange-500/5 border-b border-orange-500/10"}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            {isCritical
              ? <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
              : <TrendingUp className="w-3 h-3 text-orange-400 shrink-0" />
            }
            <span className={`text-[8px] font-black uppercase tracking-[3px] ${isCritical ? "text-red-400" : "text-orange-400"}`}>
              {q.priority}
            </span>
          </div>
          {selectedCount > 0 && <span className="text-[8px] font-mono text-indigo-400/70">{selectedCount} selected</span>}
        </div>
        <p className="text-sm font-bold text-white leading-snug">{q.question}</p>
        <p className="text-[10px] text-white/35 mt-0.5">{q.why}</p>
      </div>

      <div className="px-4 py-3 space-y-3 bg-gray-900/40">
        <div className="flex flex-wrap gap-2">
          {pills.map(s => {
            const active = selectedPills.includes(s);
            return (
              <button key={s} onClick={() => onTogglePill(s)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                  active
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                }`}>
                {active && <Check className="w-2.5 h-2.5 shrink-0" />}
                {s}
              </button>
            );
          })}
          <button onClick={handleMoreSuggestions} disabled={loadingMore}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold border border-dashed border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-all disabled:opacity-40">
            {loadingMore ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
            More
          </button>
        </div>
        <input type="text" value={customInput} onChange={e => onCustomInput(e.target.value)}
          placeholder="Or type your own..." autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} name="custom-option"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors" />
      </div>
    </div>
  );
}
