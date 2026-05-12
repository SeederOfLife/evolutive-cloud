
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Globe, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Eye, 
  Zap, 
  History, 
  Box, 
  Sparkles,
  ArrowRight,
  Monitor,
  Layout,
  Cpu,
  RefreshCw,
  Search,
  Filter,
  X,
  Share2,
  Heart,
  Code
} from "lucide-react";
import { Suggestion } from "../types";
import { AppSandbox } from "./AppSandbox";

interface EmulatorHubProps {
  suggestions: Suggestion[];
  currentUser: any;
  onExecute: (s: Suggestion) => void;
  onClose: () => void;
}

export function EmulatorHub({ suggestions, currentUser, onExecute, onClose }: EmulatorHubProps) {
  const [filter, setFilter] = useState<'world' | 'local'>('world');
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredApps = suggestions.filter(s => {
    if (s.status !== 'built') return false;
    if (filter === 'local') return s.user_id === currentUser?.uid;
    return true; // World shows everything built
  }).sort((a, b) => {
     const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
     const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
     return dateB - dateA;
  });

  const currentApp = filteredApps[currentIndex];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    const height = e.currentTarget.clientHeight;
    const newIndex = Math.round(scrollPos / height);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < filteredApps.length) {
      setCurrentIndex(newIndex);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#000] text-white flex flex-col font-sans"
    >
      {/* Top Bar Navigation */}
      <div className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-3xl flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex bg-black/40 p-1 rounded-full border border-white/5">
            <button 
              onClick={() => { setFilter('world'); setCurrentIndex(0); }}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all flex items-center gap-2 ${filter === 'world' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
            >
              <Globe className="w-3.5 h-3.5" />
              Neural World
            </button>
            <button 
              onClick={() => { setFilter('local'); setCurrentIndex(0); }}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[3px] transition-all flex items-center gap-2 ${filter === 'local' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
            >
              <User className="w-3.5 h-3.5" />
              Local Node
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-[4px] text-indigo-400">Emulator_Hub</span>
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">{filteredApps.length} manifested_units</span>
           </div>
           <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Sparkles className="w-5 h-5 text-indigo-400 shadow-glow" />
           </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden lg:gap-10 p-4 lg:p-12 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent_50%)]">
        
        {/* Sidebar Info - Desktop */}
        <div className="hidden xl:flex w-80 flex-col gap-6 shrink-0 h-full overflow-y-auto no-scrollbar">
           <div className="bg-[#0a0a20] border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
              <div className="space-y-2">
                 <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">{currentApp?.content}</h2>
                 <p className="text-[10px] text-white/20 font-mono tracking-[4px]">UUID_{currentApp?.id.slice(0,12)}</p>
              </div>
              
              <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${currentApp?.user_id || 'system'}`} alt="Manifestor" className="w-full h-full object-cover" />
                 </div>
                 <div className="text-left">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[4px] block">Manifestor</span>
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">@{currentApp?.user_id?.slice(0, 8) || 'SYSTEM'}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black/60 rounded-2xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Version</span>
                    <span className="text-lg font-mono text-white/80">V{currentApp?.version || 1}</span>
                 </div>
                 <div className="bg-black/60 rounded-2xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Energy</span>
                    <span className="text-lg font-mono text-indigo-400">{currentApp?.energy || 0}%</span>
                 </div>
              </div>

              <div className="space-y-3 pt-4">
                 <button 
                   onClick={() => currentApp && onExecute(currentApp)}
                   className="w-full py-4 bg-white text-black rounded-3xl text-[10px] font-black uppercase tracking-[6px] hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-3 group"
                 >
                    <Layout className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    Open in Editor
                 </button>
                 <button className="w-full py-4 bg-white/5 border border-white/10 text-white/60 rounded-3xl text-[10px] font-black uppercase tracking-[6px] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3">
                    <Share2 className="w-4 h-4" />
                    Share Hash
                 </button>
              </div>
           </div>

           <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] p-8 space-y-4">
              <div className="flex items-center gap-3">
                 <History className="w-4 h-4 text-indigo-400" />
                 <span className="text-[10px] font-black uppercase tracking-[4px] text-white/60">Global Stream</span>
              </div>
              <div className="space-y-4">
                 {suggestions.slice(0, 3).map(s => (
                   <div key={s.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => onExecute(s)}>
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-all">
                         <Play className="w-3 h-3 text-white/40 group-hover:text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="text-[11px] font-black text-white/80 truncate uppercase tracking-tighter group-hover:text-indigo-400 transition-colors">{s.content}</div>
                         <div className="text-[8px] text-white/20 uppercase tracking-[2px] mt-1">{s.status}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Vertical Swipe Feed */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 relative items-center">
           
           <div 
             ref={containerRef}
             onScroll={handleScroll}
             className="w-full flex-1 overflow-y-auto snap-y snap-mandatory custom-scrollbar no-scrollbar relative max-w-[1000px] mx-auto rounded-[3rem] lg:rounded-[4rem] border border-white/5 bg-[#020205] shadow-[0_100px_200px_rgba(0,0,0,1)]"
           >
              {filteredApps.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-8">
                   <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Box className="w-10 h-10 text-white/20" />
                   </div>
                   <div className="space-y-4">
                      <h3 className="text-xl font-black uppercase tracking-[10px] text-white/60">Void_Detected</h3>
                      <p className="max-w-xs mx-auto text-[11px] text-white/20 uppercase tracking-[4px] leading-relaxed">No manifested applications found in this layer of the neural network.</p>
                   </div>
                </div>
              ) : (
                filteredApps.map((app, idx) => (
                  <div 
                    key={app.id} 
                    className="h-full w-full snap-start flex-col relative overflow-hidden group"
                  >
                     <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
                     
                     <div className="w-full h-full relative">
                        <AppSandbox 
                          code={app.built_code || ""} 
                          appType={app.app_type}
                          className="w-full h-full"
                        />
                        
                        {/* Overlay info for Mobile (overlayed on bottom of app) */}
                        <div className="absolute bottom-8 left-8 right-8 z-20 flex justify-between items-end xl:hidden">
                           <div className="space-y-3 max-w-[70%]">
                              <h3 className="text-lg font-black uppercase text-white tracking-widest drop-shadow-lg">{app.content}</h3>
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
                                     <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${app.user_id || 'system'}`} alt="User" />
                                 </div>
                                 <span className="text-[10px] font-black text-white/60 uppercase tracking-widest drop-shadow-md">@{app.user_id?.slice(0, 8) || 'SYSTEM'}</span>
                              </div>
                           </div>
                           <div className="flex flex-col gap-4 items-center">
                               <button className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-pink-500 transition-all">
                                  <Heart className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={() => onExecute(app)}
                                 className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all"
                               >
                                  <Code className="w-5 h-5" />
                               </button>
                           </div>
                        </div>
                     </div>
                  </div>
                ))
              )}
           </div>

           {/* Navigation Controls */}
           <div className="hidden lg:flex flex-col gap-6 items-center">
              <button 
                onClick={() => {
                  if (currentIndex > 0) {
                    containerRef.current?.scrollTo({ top: (currentIndex - 1) * containerRef.current.clientHeight, behavior: 'smooth' });
                  }
                }}
                disabled={currentIndex === 0}
                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all shadow-xl"
              >
                 <ChevronUp className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col gap-3 py-4 items-center">
                 {filteredApps.slice(Math.max(0, currentIndex - 2), Math.min(filteredApps.length, currentIndex + 3)).map((app, i) => {
                    const actualIdx = filteredApps.indexOf(app);
                    return (
                      <div 
                        key={app.id}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${actualIdx === currentIndex ? 'h-8 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)]' : 'bg-white/10'}`}
                      />
                    );
                 })}
              </div>

              <button 
                onClick={() => {
                  if (currentIndex < filteredApps.length - 1) {
                    containerRef.current?.scrollTo({ top: (currentIndex + 1) * containerRef.current.clientHeight, behavior: 'smooth' });
                  }
                }}
                disabled={currentIndex === filteredApps.length - 1}
                className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all shadow-xl"
              >
                 <ChevronDown className="w-6 h-6" />
              </button>
           </div>

        </div>
      </div>
    </motion.div>
  );
}
