
import React, { useMemo } from "react";
import { motion } from "motion/react";
import { GitBranch, Sparkles } from "lucide-react";
import { Suggestion } from "../types";

export function EvolutionBranch({ branch, onSelect }: { branch: any, onSelect: (s: Suggestion) => void }) {
  let title = branch.node.content;
  
  return (
    <div className="flex items-center gap-24 relative group/branch">
      <motion.div 
        whileHover={{ scale: 1.05, y: -5 }}
        onClick={() => onSelect(branch.node)}
        className={`shrink-0 w-72 p-8 rounded-[3rem] border cursor-pointer transition-all relative z-10 neural-card-glow ${
          branch.node.status === 'built' 
            ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)]' 
            : 'bg-white/[0.03] border-white/5 hover:border-white/20'
        }`}
      >
        {branch.node.status === 'built' && (
          <div className="absolute -top-4 -right-4 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,1)] animate-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="text-[10px] font-black uppercase tracking-[4px] text-white/20 mb-4 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${branch.node.status === 'built' ? 'bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,1)]' : 'bg-white/10'}`} />
          SYNAPSE_{branch.node.id.substring(0, 6)}
        </div>
        <div className="text-[13px] text-white/90 font-bold line-clamp-3 leading-relaxed mb-8 italic group-hover/branch:text-white transition-colors">
           "{title}"
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-6">
           <span className={`text-[9px] uppercase font-black tracking-[3px] ${branch.node.status === 'built' ? 'text-indigo-400' : 'text-white/30'}`}>
             {branch.node.status.toUpperCase()}
           </span>
           <div className="flex gap-3">
             {branch.node.version && <span className="px-3 py-1 rounded-full bg-white/5 text-[8px] text-white/40 font-black tracking-widest border border-white/5">V{branch.node.version}</span>}
             <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-[8px] text-indigo-400 font-black tracking-widest uppercase border border-indigo-500/10">{branch.node.votes} POWER</span>
           </div>
        </div>
      </motion.div>

      {branch.children.length > 0 && (
        <div className="flex flex-col gap-20 relative py-8">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-white/0 via-indigo-500/40 to-white/0 shadow-[0_0_10px_rgba(99,102,241,0.2)]" style={{ left: '-48px' }} />
          {branch.children.map((child: any, i: number) => (
            <div key={i} className="flex items-center relative">
               <div className="absolute left-0 w-12 h-px bg-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]" style={{ left: '-48px' }} />
               <EvolutionBranch branch={child} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EvolutionTree({ suggestions, onSelect }: { suggestions: Suggestion[], onSelect: (s: Suggestion) => void }) {
  const filteredSuggestions = useMemo(() => 
    suggestions.filter(s => s.status !== 'deleted' && !s.is_deleted), 
  [suggestions]);

  const rootNodes = useMemo(() => 
    filteredSuggestions.filter(s => !s.parent_id && s.status !== 'system_config'), 
  [filteredSuggestions]);
  
  const buildTree = (s: Suggestion, level: number = 0): any => {
    const children = filteredSuggestions.filter(child => child.parent_id === s.id);
    return {
      node: s,
      level,
      children: children.map(c => buildTree(c, level + 1))
    };
  };

  const forest = useMemo(() => rootNodes.map(r => buildTree(r)), [rootNodes, filteredSuggestions]);

  if (forest.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
        <GitBranch className="w-20 h-20 mb-6" />
        <p className="text-xl font-black uppercase tracking-[10px]">No Evolutionary Paths<br/>Detected Yet</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto custom-scrollbar p-20 flex flex-col gap-32">
      {forest.map((tree, i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          <EvolutionBranch branch={tree} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
