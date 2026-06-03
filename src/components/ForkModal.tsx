import { useState } from "react";
import { motion } from "motion/react";
import { GitFork } from "lucide-react";
import type { Suggestion } from "../types";

interface Props {
  source: Suggestion;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}

export function ForkModal({ source, onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState(`Fork of: ${source.content}`);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="w-4 h-4 text-indigo-400" />
            <h3 className="text-white font-bold text-base">Fork App</h3>
          </div>
          <p className="text-gray-400 text-xs">Creates an independent copy you can modify freely.</p>
          <p className="text-indigo-500/60 text-[10px] font-mono mt-1">source #{source.id.substring(0, 8)}</p>
        </div>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && title.trim()) onConfirm(title.trim()); if (e.key === "Escape") onCancel(); }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          placeholder="Fork title..."
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 text-sm transition-all">
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onConfirm(title.trim())}
            disabled={!title.trim()}
            className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 rounded-lg text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <GitFork className="w-3.5 h-3.5" />
            Fork & Open
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
