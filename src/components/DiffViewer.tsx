import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, RotateCcw, RefreshCw, ChevronRight } from 'lucide-react';
import type { AppEvolution } from '../types';

interface Props {
  evolution: AppEvolution;
  onApply: () => void;
  onRevert: () => void;
  onRetry: () => void;
}

function computeStats(prev: string, next: string) {
  const prevLines = prev.split('\n');
  const nextLines = next.split('\n');
  const added = nextLines.filter(l => !prevLines.includes(l)).length;
  const removed = prevLines.filter(l => !nextLines.includes(l)).length;
  const total = Math.max(prevLines.length, nextLines.length);
  const changed = Math.round(((added + removed) / (total * 2)) * 100);
  return { added, removed, changed };
}

function DiffLine({ line, type }: { line: string; type: 'added' | 'removed' | 'same' }) {
  if (type === 'added') return (
    <div className="flex gap-2 bg-green-500/10 border-l-2 border-green-500">
      <span className="w-5 text-center text-green-400 text-xs select-none flex-shrink-0 py-0.5">+</span>
      <span className="text-green-300 text-xs font-mono py-0.5 whitespace-pre-wrap break-all">{line}</span>
    </div>
  );
  if (type === 'removed') return (
    <div className="flex gap-2 bg-red-500/10 border-l-2 border-red-500">
      <span className="w-5 text-center text-red-400 text-xs select-none flex-shrink-0 py-0.5">−</span>
      <span className="text-red-300 text-xs font-mono py-0.5 whitespace-pre-wrap break-all line-through opacity-70">{line}</span>
    </div>
  );
  return (
    <div className="flex gap-2">
      <span className="w-5 text-center text-gray-600 text-xs select-none flex-shrink-0 py-0.5"> </span>
      <span className="text-gray-400 text-xs font-mono py-0.5 whitespace-pre-wrap break-all">{line}</span>
    </div>
  );
}

export default function DiffViewer({ evolution, onApply, onRevert, onRetry }: Props) {
  const stats = useMemo(() => computeStats(evolution.prevCode, evolution.code), [evolution]);

  const diffLines = useMemo(() => {
    const prev = new Set(evolution.prevCode.split('\n'));
    const next = new Set(evolution.code.split('\n'));
    const allNext = evolution.code.split('\n');
    const allPrev = evolution.prevCode.split('\n');

    // Simple line-based diff: show first 60 lines of next code with +/- markers
    const result: { line: string; type: 'added' | 'removed' | 'same' }[] = [];
    const maxLines = 80;
    let shown = 0;

    for (const line of allNext) {
      if (shown >= maxLines) break;
      result.push({ line, type: prev.has(line) ? 'same' : 'added' });
      shown++;
    }

    // Prepend removed lines that no longer appear
    const removedLines = allPrev.filter(l => !next.has(l)).slice(0, 10);
    return [...removedLines.map(line => ({ line, type: 'removed' as const })), ...result];
  }, [evolution]);

  return (
    <motion.div
      className="flex flex-col h-full bg-gray-950"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-gray-900">
        <div className="flex items-center gap-2 mb-1">
          <ChevronRight size={14} className="text-cyan-400" />
          <span className="text-sm font-semibold text-white">{evolution.summary}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="text-green-400 font-medium">+{stats.added} lines</span>
          <span className="text-red-400 font-medium">−{stats.removed} lines</span>
          <span className="text-gray-400">{stats.changed}% changed</span>
          <span className="ml-auto">{evolution.focus} · {evolution.depth}</span>
        </div>
      </div>

      {/* Diff */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-px">
        {diffLines.map((entry, i) => (
          <DiffLine key={i} line={entry.line} type={entry.type} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-gray-900">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 text-sm transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
        <button
          onClick={onRevert}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 text-sm transition-colors"
        >
          <RotateCcw size={14} />
          Revert
        </button>
        <button
          onClick={onApply}
          className="flex items-center gap-1.5 ml-auto px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-colors"
        >
          <CheckCircle size={16} />
          Apply Evolution
        </button>
      </div>
    </motion.div>
  );
}
