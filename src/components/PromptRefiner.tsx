import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pencil, Zap, ChevronRight, AlertCircle, TrendingUp } from "lucide-react";
import { RefinementQuestion } from "../services/refiner";

interface Props {
  idea: string;
  title: string;
  questions: RefinementQuestion[];
  onBuild: (answers: Record<number, string>, editedTitle: string) => void;
  onSkip: (editedTitle: string) => void;
}

export function PromptRefiner({ idea, title: initialTitle, questions, onBuild, onSkip }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const answeredCount = Object.values(answers).filter(v => v.trim()).length;

  const setAnswer = (idx: number, val: string) =>
    setAnswers(prev => ({ ...prev, [idx]: val }));

  const toggleSuggestion = (idx: number, suggestion: string) => {
    setAnswers(prev => ({
      ...prev,
      [idx]: prev[idx] === suggestion ? "" : suggestion,
    }));
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

          {/* Editable title */}
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

          {/* Progress */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    answers[i]?.trim() ? "w-6 bg-indigo-400" : "w-3 bg-gray-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono text-white/30">
              {answeredCount}/{questions.length} answered
            </span>
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {questions.map((q, idx) => (
            <QuestionCard
              key={idx}
              question={q}
              answer={answers[idx] || ""}
              onAnswer={val => setAnswer(idx, val)}
              onToggleSuggestion={s => toggleSuggestion(idx, s)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-800 flex gap-3 shrink-0">
          <button
            onClick={() => onSkip(title)}
            className="flex-1 py-3 rounded-xl border border-gray-700 text-[11px] font-bold uppercase tracking-[3px] text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            Skip
          </button>
          <button
            onClick={() => onBuild(answers, title)}
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

function QuestionCard({
  question: q,
  answer,
  onAnswer,
  onToggleSuggestion,
}: {
  question: RefinementQuestion;
  answer: string;
  onAnswer: (val: string) => void;
  onToggleSuggestion: (s: string) => void;
}) {
  const isCritical = q.priority === "Critical";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-800 overflow-hidden"
      >
        {/* Question header */}
        <div className={`px-4 py-3 ${isCritical ? "bg-red-500/5 border-b border-red-500/15" : "bg-orange-500/5 border-b border-orange-500/10"}`}>
          <div className="flex items-center gap-2 mb-1.5">
            {isCritical
              ? <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
              : <TrendingUp className="w-3 h-3 text-orange-400 shrink-0" />
            }
            <span className={`text-[8px] font-black uppercase tracking-[3px] ${isCritical ? "text-red-400" : "text-orange-400"}`}>
              {q.priority}
            </span>
          </div>
          <p className="text-sm font-bold text-white leading-snug">{q.question}</p>
          <p className="text-[10px] text-white/35 mt-0.5">{q.why}</p>
        </div>

        {/* Suggestions + custom input */}
        <div className="px-4 py-3 space-y-3 bg-gray-900/40">
          <div className="flex flex-wrap gap-2">
            {q.suggestions.map(s => (
              <button
                key={s}
                onClick={() => onToggleSuggestion(s)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                  answer === s
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-gray-800 border-gray-700 text-white/50 hover:text-white hover:border-gray-500"
                }`}
              >
                {answer === s && <ChevronRight className="w-2.5 h-2.5" />}
                {s}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={q.suggestions.includes(answer) ? "" : answer}
            onChange={e => onAnswer(e.target.value)}
            placeholder="Or type your own..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
