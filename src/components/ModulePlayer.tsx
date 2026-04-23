
import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  X, 
  Database, 
  Loader2, 
  MessageCircle, 
  History, 
  Zap, 
  ArrowRight,
  RefreshCw,
  Code
} from "lucide-react";
import { Suggestion, EvolutionVersion } from "../types";

export function ModulePlayer({ 
  suggestion, 
  onClose, 
  onSave,
  onRefine
}: { 
  suggestion: Suggestion, 
  onClose: () => void, 
  onSave?: (code: string) => Promise<void>,
  onRefine?: (feedback: string) => Promise<string>
}) {
  const [code, setCode] = useState(suggestion.manifested_code || "");
  const [activePlayTab, setActivePlayTab] = useState<'manifest' | 'code' | 'chat' | 'history'>('manifest');
  const [isSaving, setIsSaving] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanCode = useMemo(() => {
    return code
      .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '') // Remove imports
      .replace(/export\s+default\s+/g, '') // Remove export default
      .replace(/export\s+/g, '') // Remove other exports
      .replace(/const\s+\{.*\}\s+=\s+window\.React;?/g, '') // Remove redunant React hooks declaration
      .replace(/const\s+\{.*\}\s+=\s+window\.ReactDOM;?/g, '')
      .replace(/const\s+\{.*\}\s+=\s+window\.Motion;?/g, '')
      .replace(/const\s+\{.*\}\s+=\s+window\.lucide;?/g, '')
      .replace(/const\s+\{.*\}\s+=\s+window\.lucide-react;?/g, '');
  }, [code]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(code);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save changes to the collective mind.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefine = async () => {
    if (!onRefine || !refineInput.trim()) return;
    setIsRefining(true);
    setChatMessages(prev => [...prev, { role: 'user', content: refineInput }]);
    const currentInput = refineInput;
    setRefineInput("");
    
    try {
      const newCode = await onRefine(currentInput);
      if (newCode) {
        setCode(newCode);
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Evolutionary path adjusted. Manifestation updated." }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Neural bridge failed: " + (err as any).message }]);
    } finally {
      setIsRefining(false);
    }
  };

  const srcDoc = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
        <script src="https://unpkg.com/framer-motion@10.16.4/dist/framer-motion.js"></script>
        <script src="https://unpkg.com/recharts/umd/Recharts.min.js"></script>
        <script src="https://unpkg.com/d3@7"></script>
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
        <style>
          body { 
            background: transparent; 
            color: white; 
            margin: 0; 
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            overflow-y: auto;
            overflow-x: hidden;
          }
          #root { width: 100%; height: 100%; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(129, 140, 248, 0.2); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(129, 140, 248, 0.4); }
        </style>
      </head>
      <body class="custom-scrollbar">
        <div id="root"></div>
        <script type="text/babel">
          (function() {
            try {
              // Expose everything to scope for generated code
              const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext, useReducer, useLayoutEffect } = window.React;
              const { motion, AnimatePresence, LayoutGroup } = window.Motion || {};
              const { 
                LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
                BarChart, Bar, PieChart, Pie, Cell, Sector
              } = window.Recharts || {};
              const d3 = window.d3;
              const confetti = window.confetti;
              const Lucide = window.lucide;
              const LucideReact = window.LucideReact;

              // Helper for icons
              const Icon = ({ name, ...props }) => {
                if (!LucideReact) return null;
                const Component = LucideReact[name];
                return Component ? <Component {...props} /> : null;
              };

              // Inject the code
              ${cleanCode}

              // Rendering
              const ComponentToRender = typeof App !== 'undefined' ? App : null;
              if (ComponentToRender) {
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(<ComponentToRender />);
              } else {
                 document.getElementById('root').innerHTML = '<div style="padding:40px; color:rgba(255,255,255,0.3); text-align:center; font-size:12px; letter-spacing:2px; text-transform:uppercase">Manifestation Layer Empty. No "App" component detected.</div>';
              }
            } catch (err) {
              console.error("Manifestation Error:", err);
              document.getElementById('root').innerHTML = '<div style="color:#ff6b6b; padding:20px; font-family:monospace; line-height:1.5; font-size:12px; background:rgba(255,0,0,0.1); border:1px solid rgba(255,0,0,0.2); border-radius:12px"><b>MANIFESTATION ERROR:</b><br/>' + err.message + '</div>';
            }
          })();
        </script>
      </body>
    </html>
  `, [cleanCode]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-10 bg-black/80 backdrop-blur-md"
    >
      <div className="relative w-full md:max-w-5xl h-full md:h-auto md:aspect-video bg-[#050505] border-none md:border md:border-white/10 rounded-none md:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs uppercase tracking-widest font-bold">Evolution_{suggestion.id}</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
              {[
                { id: 'manifest', label: 'Play', icon: Zap },
                { id: 'code', label: 'Code', icon: Code },
                { id: 'chat', label: 'Iterate', icon: MessageCircle },
                { id: 'history', label: 'History', icon: History }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActivePlayTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activePlayTab === tab.id ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave}
              disabled={isSaving || code === suggestion.manifested_code}
              className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${code === suggestion.manifested_code ? 'bg-white/5 text-white/20' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20'}`}
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
              {isSaving ? 'Syncing' : 'Sync Changes'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-transparent relative overflow-hidden flex">
          {activePlayTab === 'manifest' && (
            <iframe 
              ref={iframeRef}
              srcDoc={srcDoc}
              className="w-full h-full border-none"
              title="manifestation-player"
              sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
            />
          )}

          {activePlayTab === 'code' && (
            <div className="flex-1 flex flex-col bg-[#080808]">
              <textarea 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full h-full bg-transparent p-6 md:p-12 font-mono text-xs md:text-sm text-indigo-300 outline-none resize-none selection:bg-indigo-500/30 no-scrollbar"
                placeholder="// Enter your manifestation modifications here..."
              />
              <div className="p-4 border-t border-white/5 bg-black/40 text-[9px] text-white/20 uppercase tracking-[4px] font-black flex justify-between items-center">
                 <span>Collaborative Revision Layer active</span>
                 <span className="italic">Changes must be synchronized to persist in the Cloud</span>
              </div>
            </div>
          )}

          {activePlayTab === 'chat' && (
            <div className="flex-1 flex bg-[#080808]">
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 custom-scrollbar">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto opacity-40">
                      <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center">
                        <MessageCircle className="w-8 h-8 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">Neural Refinement</h3>
                        <p className="text-[10px] leading-relaxed uppercase tracking-wider">Ask the Cloud to adjust the UI, add features, or fix behavior. The manifestation will evolve based on your feedback.</p>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl md:rounded-3xl text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-none'}`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {isRefining && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-[3px] text-white/40">Rewriting Reality...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-6 bg-black/40 border-t border-white/5">
                  <div className="max-w-3xl mx-auto flex gap-3">
                    <input 
                      type="text" 
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      placeholder="e.g. 'Add a dark mode toggle', 'Make the chart animated'"
                      className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-[11px] text-white outline-none focus:border-indigo-500/30 focus:bg-white/10 transition-all font-medium"
                    />
                    <button 
                      onClick={handleRefine}
                      disabled={isRefining || !refineInput.trim()}
                      className="p-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl disabled:opacity-30 transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePlayTab === 'history' && (
            <div className="flex-1 flex flex-col bg-[#080808] p-6 md:p-10 space-y-6 overflow-y-auto no-scrollbar">
              <div className="flex items-center gap-3">
                 <History className="w-5 h-5 text-indigo-400" />
                 <h2 className="text-xs font-black uppercase tracking-[4px]">Evolutionary Registry</h2>
              </div>
              
              {!suggestion.history || suggestion.history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center space-y-3">
                   <RefreshCw className="w-10 h-10 animate-pulse" />
                   <p className="text-[10px] uppercase tracking-widest font-black italic">This soul has no previous forms</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {suggestion.history.map((version, idx) => (
                     <div key={idx} className="group bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:bg-white/10 transition-all hover:border-indigo-500/30">
                        <div className="flex justify-between items-start">
                           <span className="text-[10px] font-mono text-white/20 tracking-tighter">V.{suggestion.history!.length - idx}</span>
                           <span className="text-[8px] text-white/40 uppercase tracking-widest">{new Date(version.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-white/70 line-clamp-2 italic uppercase tracking-wider leading-relaxed">"{version.prompt || 'Manual Revision'}"</p>
                        <button 
                          onClick={() => setCode(version.code)}
                          className="w-full py-2.5 rounded-xl border border-white/10 text-[8px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all hover:border-indigo-500"
                        >
                          Restore form
                        </button>
                     </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
