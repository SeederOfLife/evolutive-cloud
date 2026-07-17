import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pencil, Zap, Plus, Loader2 } from "lucide-react";
import { RefinementQuestion, generateMoreQuestions } from "../services/refiner";
import type { AppType } from "../services/agentSkills";
import { QuestionCard } from "./QuestionCard";

const APP_TYPE_OPTIONS: { id: AppType; label: string }[] = [
  { id: 'phone',    label: '📱 Phone'    },
  { id: 'desktop',  label: '🖥️ Desktop'  },
  { id: 'game',     label: '🎮 Game'     },
  { id: 'terminal', label: '⌨️ Terminal' },
  { id: 'music',    label: '🎵 Music'    },
  { id: 'art',      label: '🎨 Art'      },
];

const MAX_QUESTIONS = 9;

interface Props {
  idea: string;
  title: string;
  questions: RefinementQuestion[];
  appType?: AppType;
  onTypeChange?: (type: AppType) => void;
  onBuild: (answers: Record<number, string>, editedTitle: string, appType: AppType) => void;
  onSkip: (editedTitle: string, appType: AppType) => void;
  callAI: (prompt: string) => Promise<string>;
}

export function PromptRefiner({ idea, title: initialTitle, questions: initialQs, appType, onTypeChange, onBuild, onSkip, callAI }: Props) {
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<RefinementQuestion[]>(initialQs);
  const [localType, setLocalType] = useState<AppType>(appType ?? 'desktop');
  const [loadingMoreQs, setLoadingMoreQs] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (t: AppType) => {
    setLocalType(t);
    onTypeChange?.(t);
  };

  // Merge selections + custom input into a final answer string per question
  const buildAnswer = (idx: number): string => {
    const sel = selections[idx] || [];
    const custom = customInputs[idx]?.trim() || "";
    return [...sel, ...(custom ? [custom] : [])].join(", ");
  };

  const answeredCount = questions.filter((_, i) => buildAnswer(i).length > 0).length;

  const togglePill = (idx: number, pill: string) => {
    setSelections(prev => {
      const cur = prev[idx] || [];
      return {
        ...prev,
        [idx]: cur.includes(pill) ? cur.filter(s => s !== pill) : [...cur, pill],
      };
    });
  };

  const collectAnswers = (): Record<number, string> => {
    const out: Record<number, string> = {};
    questions.forEach((_, i) => { out[i] = buildAnswer(i); });
    return out;
  };

  const handleExpandQuestions = async () => {
    if (questions.length >= MAX_QUESTIONS || loadingMoreQs) return;
    setLoadingMoreQs(true);
    try {
      const more = await generateMoreQuestions(idea, "app", questions, callAI);
      setQuestions(prev => [...prev, ...more].slice(0, MAX_QUESTIONS));
    } finally {
      setLoadingMoreQs(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 380 }}
        className="w-full sm:max-w-lg bg-gray-950 sm:rounded-2xl rounded-t-2xl border border-white/8 shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-700" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-4 border-b border-gray-800 shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[4px] text-indigo-400 mb-2">Refine your prompt</p>

          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false); }}
              className="w-full bg-gray-800 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-lg font-black text-white focus:outline-none focus:border-indigo-400"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTimeout(() => titleInputRef.current?.select(), 50); }}
              className="group flex items-center gap-2 text-left w-full"
            >
              <h2 className="text-lg font-black text-white leading-tight">{title}</h2>
              <Pencil className="w-3.5 h-3.5 text-white/20 group-hover:text-indigo-400 transition-colors shrink-0" />
            </button>
          )}

          {idea !== title && (
            <p className="text-[9px] font-mono text-white/25 mt-1 truncate">from: {idea}</p>
          )}

          {/* Skill type picker */}
          <div className="mt-3">
            <p className="text-[8px] font-black uppercase tracking-[3px] text-white/25 mb-1.5">App Type</p>
            <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {APP_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleTypeChange(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                    localType === opt.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress dots — dynamic based on total question count */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-1 flex-wrap">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    buildAnswer(i) ? "w-6 bg-indigo-400" : "w-3 bg-gray-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono text-white/30">
              {answeredCount}/{questions.length} answered
            </span>
          </div>
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <AnimatePresence initial={false}>
            {questions.map((q, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <QuestionCard
                  question={q}
                  selectedPills={selections[idx] || []}
                  customInput={customInputs[idx] || ""}
                  onTogglePill={pill => togglePill(idx, pill)}
                  onCustomInput={val => setCustomInputs(prev => ({ ...prev, [idx]: val }))}
                  idea={idea}
                  callAI={callAI}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Expand parameters button */}
          {questions.length < MAX_QUESTIONS && (
            <button
              onClick={handleExpandQuestions}
              disabled={loadingMoreQs}
              className="w-full py-2.5 rounded-xl border border-dashed border-indigo-500/30 text-indigo-400/70 hover:text-indigo-300 hover:border-indigo-500/60 text-[10px] font-bold uppercase tracking-[3px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMoreQs
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                : <><Plus className="w-3 h-3" /> Add more parameters</>
              }
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 flex gap-3 shrink-0">
          <button
            onClick={() => onSkip(title, localType)}
            className="flex-1 py-3 rounded-xl border border-gray-700 text-[11px] font-bold uppercase tracking-[3px] text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            Skip
          </button>
          <button
            onClick={() => onBuild(collectAnswers(), title, localType)}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[3px] transition-all ${
              answeredCount > 0
                ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg active:scale-95"
                : "bg-indigo-500/30 text-indigo-300/60 cursor-not-allowed"
            }`}
            disabled={answeredCount === 0}
          >
            <Zap className="w-3.5 h-3.5" />
            Build
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

