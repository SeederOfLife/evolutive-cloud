
import React, { useMemo } from "react";
import { motion } from "motion/react";
import { GitBranch, Sparkles } from "lucide-react";
import { Suggestion } from "../types";

export function EvolutionBranch({ branch, onSelect }: { branch: any, onSelect: (s: Suggestion) => void }) {
  let title = branch.node.content;
  
  return (
    <div className="flex items-center gap-16 relative">
      <motion.div 
        whileHover={{ scale: 1.05, y: -5 }}
        onClick={() => onSelect(branch.node)}
        className={`shrink-0 w-64 p-6 rounded-[2rem] border-2 cursor-pointer transition-all relative z-10 ${
          branch.node.status === 'built' 
            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)]' 
            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
        }`}
      >
        {branch.node.status === 'built' && (
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3 flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${branch.node.status === 'built' ? 'bg-indigo-400' : 'bg-white/20'}`} />
          NODE_{branch.node.id}
        </div>
        <div className="text-[11px] text-white/80 font-bold line-clamp-3 leading-relaxed mb-6 italic group-hover:text-white">
           "{title}"
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-4">
           <span className={`text-[8px] uppercase font-black tracking-[2px] ${branch.node.status === 'built' ? 'text-indigo-400' : 'text-white/40'}`}>
             {branch.node.status === 'built' ? 'Built' : 'Pending'}
           </span>
           <div className="flex gap-2">
             {branch.node.version && <span className="px-2 py-0.5 rounded-full bg-white/5 text-[7px] text-white/40 font-black tracking-tighter">V{branch.node.version}</span>}
             <span className="px-2 py-0.5 rounded-full bg-white/5 text-[7px] text-indigo-400 font-black tracking-tighter uppercase">{branch.node.votes}V</span>
           </div>
        </div>
      </motion.div>

      {branch.children.length > 0 && (
        <div className="flex flex-col gap-12 relative py-4">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-white/5 via-indigo-500/20 to-white/5" style={{ left: '-32px' }} />
          {branch.children.map((child: any, i: number) => (
            <div key={i} className="flex items-center relative">
               <div className="absolute left-0 w-8 h-px bg-indigo-500/20" style={{ left: '-32px' }} />
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
