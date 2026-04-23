
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
  const [activePlayTab, setActivePlayTab] = useState<'chat' | 'code' | 'history'>('chat');

  useEffect(() => {
    if (suggestion.manifested_code && !code) {
      setCode(suggestion.manifested_code);
    }
  }, [suggestion.manifested_code]);
  const [isSaving, setIsSaving] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>(
    suggestion.manifested_code ? [] : [{ role: 'user', content: `Manifesting: ${suggestion.content}` }]
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanCode = useMemo(() => {
    // We want to remove imports and export keywords but keep the actual logic
    // AI often includes "import React from 'react'" which breaks UMD script style
    return code
      .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '') // Remove imports multiline
      .replace(/export\s+default\s+/g, '') // Remove export default
      .replace(/export\s+/g, '') // Remove other exports
      .trim();
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <!-- UMD Libraries -->
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
            background: #020205; 
            color: white; 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
          }
          #root { flex: 1; display: flex; flex-direction: column; }
          .error-container {
            padding: 24px;
            color: #ef4444;
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.1);
            border-radius: 16px;
            margin: 20px;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.6;
          }
          /* Custom scrollbar for preview */
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        </style>
      </head>
      <body>
        <div id="root">
           <div style="flex:1; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.1); font-size:10px; font-weight:900; letter-spacing:4px; text-transform:uppercase;">
              Synthesizing Void...
           </div>
        </div>
        
        <script type="text/babel">
          (function() {
            const originalConsoleError = console.error;
            console.error = (...args) => {
              if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning:')) return;
              originalConsoleError.apply(console, args);
            };

            try {
              // Map all dependencies to window scope for the evaled code
              const { 
                useState, useEffect, useMemo, useRef, useCallback, 
                createContext, useContext, useReducer, useLayoutEffect,
                memo, forwardRef, Fragment
              } = window.React;
              
              const { motion, AnimatePresence, LayoutGroup } = window.Motion || {};
              
              const Recharts = window.Recharts || {};
              const { 
                LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
                BarChart, Bar, PieChart, Pie, Cell, Sector, ComposedChart, Scatter, ScatterChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
              } = Recharts;
              
              const d3 = window.d3;
              const confetti = window.confetti;
              const LucideReact = window.LucideReact;

              // Smarter Icon Component: Handles case differences and invalid names
              const Icon = ({ name, className, size = 20, ...props }) => {
                if (!LucideReact) return <div style={{width: size, height: size}} className={className} />;
                
                // Try direct match, then camelCase, then PascalCase
                let Component = LucideReact[name];
                if (!Component) {
                  const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
                  Component = LucideReact[pascalName];
                }
                
                if (!Component) {
                  // Final fallback: check for some common variations
                  const mapped = { 'activity': LucideReact.Activity, 'zap': LucideReact.Zap, 'sparkles': LucideReact.Sparkles };
                  Component = mapped[name ? name.toLowerCase() : ''];
                }

                return Component ? <Component size={size} className={className} {...props} /> : <div style={{width: size, height: size}} className={className} />;
              };

              // User Logic Injection
              try {
                ${cleanCode}
              } catch (evalErr) {
                throw new Error("Logic Sync Failed: " + evalErr.message);
              }

              // Check if App exists in any form (it might be constant, var, function)
              let ComponentToRender = null;
              if (typeof App !== 'undefined') ComponentToRender = App;
              else if (typeof Manifestation !== 'undefined') ComponentToRender = Manifestation;
              else if (typeof Main !== 'undefined') ComponentToRender = Main;
              
              if (ComponentToRender) {
                const root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(<ComponentToRender />);
              } else {
                // Try to find ANY function that looks like a component if App not found
                const keys = Object.keys(window).filter(k => k.length > 2 && /^[A-Z]/.test(k) && typeof window[k] === 'function');
                if (keys.length > 0) {
                   const root = ReactDOM.createRoot(document.getElementById('root'));
                   root.render(React.createElement(window[keys[0]]));
                } else {
                   throw new Error("Synchronicity Failure: No 'App' component defined. Ensure your code defines a component named 'App'.");
                }
              }
            } catch (err) {
              console.error("Neural Execution Failure:", err);
              document.getElementById('root').innerHTML = \`
                <div class="error-container">
                  <div style="font-weight:900; margin-bottom:12px; font-size:11px; letter-spacing:2px; color:#ff4f4f">NEURAL_EXECUTION_FAILURE</div>
                  <div style="opacity:0.8">\${err.message}</div>
                  <div style="margin-top:16px; opacity:0.3; font-size:10px">Trace: \${err.stack?.split('\\n')[1] || 'Internal Matrix'}</div>
                </div>
              \`;
            }
          })();
        </script>
      </body>
    </html>
  `, [cleanCode]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#020205] text-white"
    >
      {/* HEADER / TOOLBAR */}
      <div className="h-16 md:h-20 border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-[4px] leading-none mb-1">Manifest_IDE</h1>
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Node Identity: {suggestion.id}</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-white/10 hidden md:block" />

          <div className="hidden md:flex items-center gap-2">
            {[
              { id: 'chat', label: 'Neural Refinement', icon: MessageCircle },
              { id: 'code', label: 'Manual Logic', icon: Code },
              { id: 'history', label: 'Evolutionary Registry', icon: History }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActivePlayTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[2px] transition-all flex items-center gap-2 ${activePlayTab === tab.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-xl">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Neural Link Active</span>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving || code === suggestion.manifested_code}
            className={`px-6 h-10 md:h-12 rounded-xl text-[10px] font-black uppercase tracking-[3px] transition-all flex items-center gap-2 ${code === suggestion.manifested_code ? 'bg-white/5 text-white/20 border border-white/5' : 'bg-white text-black hover:bg-indigo-50 shadow-xl'}`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            {isSaving ? 'Syncing...' : 'Commit to Cloud'}
          </button>

          <button 
            onClick={onClose} 
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white border border-white/10"
          >
            <X className="w-6 h-6 md:w-7 md:h-7" />
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: INPUT / LOGIC */}
        <div className="w-full md:w-[45%] flex flex-col border-r border-white/10 bg-[#080808]">
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {activePlayTab === 'chat' && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                  <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto mb-10 opacity-20">
                    <Zap className="w-12 h-12 text-indigo-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[4px] text-white">System: Refinement Interface</h3>
                      <p className="text-[9px] leading-relaxed uppercase tracking-widest mt-2">Describe changes to the manifestation. The Neural Engine will rebuild the component logic while preserving your intent.</p>
                    </div>
                  </div>

                  {chatMessages.map((msg, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[90%] p-5 rounded-2xl md:rounded-3xl text-[12px] leading-relaxed font-medium ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-none shadow-xl'}`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isRefining && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 p-5 rounded-3xl rounded-tl-none flex items-center gap-4 shadow-2xl">
                        <div className="relative">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                          <div className="absolute inset-0 blur-sm bg-indigo-500/20 rounded-full animate-pulse" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-[3px] text-white">Synthesizing Logic...</span>
                          <span className="text-[8px] uppercase tracking-widest text-white/30 italic">Rewriting the manifestation layer</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 md:p-8 bg-black/40 border-t border-white/5">
                  <div className="max-w-3xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-indigo-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative flex gap-4 bg-white/5 border border-white/10 rounded-3xl p-2 pl-6 focus-within:border-indigo-500/50 transition-all focus-within:bg-white/10">
                      <input 
                        type="text" 
                        value={refineInput}
                        onChange={(e) => setRefineInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                        placeholder="Describe your next evolution..."
                        className="flex-1 bg-transparent py-4 text-[13px] text-white outline-none font-medium placeholder:text-white/20"
                      />
                      <button 
                        onClick={handleRefine}
                        disabled={isRefining || !refineInput.trim()}
                        className="w-14 h-14 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl disabled:opacity-20 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95"
                      >
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePlayTab === 'code' && (
              <div className="flex-1 flex flex-col bg-[#050505]">
                <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                   <div className="w-2 h-2 rounded-full bg-indigo-500" />
                   <span className="text-[10px] font-black uppercase tracking-[3px] text-white/60">Source Controller</span>
                </div>
                <textarea 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full h-full bg-transparent p-8 md:p-12 font-mono text-[13px] md:text-[14px] text-indigo-200/80 outline-none resize-none selection:bg-indigo-500/40 no-scrollbar leading-relaxed"
                  placeholder="// Enter manifestation logic..."
                />
                <div className="p-4 border-t border-white/5 bg-black/40 text-[9px] text-white/20 uppercase tracking-[4px] font-black flex justify-between items-center px-10">
                   <span>Rev.{suggestion.history?.length || 0}</span>
                   <span className="italic">Manual interventions bypass neural gating</span>
                </div>
              </div>
            )}

            {activePlayTab === 'history' && (
              <div className="flex-1 flex flex-col bg-[#080808] p-8 md:p-12 space-y-10 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <History className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-[5px] text-white">Evolutionary Registry</h2>
                      <p className="text-[9px] uppercase tracking-widest text-white/30 mt-1 font-bold">Trace back the manifestation's ancestral forms</p>
                    </div>
                  </div>
                </div>
                
                {!suggestion.history || suggestion.history.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                     <RefreshCw className="w-12 h-12 animate-pulse text-indigo-500" />
                     <p className="text-[10px] uppercase tracking-[4px] font-black italic text-white/40">This soul has no previous manifestations</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {suggestion.history.map((version, idx) => (
                       <div key={idx} className="group bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 hover:bg-white/10 transition-all hover:border-indigo-500/30 shadow-xl">
                          <div className="flex justify-between items-start">
                             <div className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-mono text-indigo-400 tracking-tighter uppercase font-black">Gen_{suggestion.history!.length - idx}</div>
                             <span className="text-[9px] text-white/40 uppercase tracking-widest font-black leading-none">{new Date(version.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-white/70 italic uppercase tracking-wider leading-relaxed border-l-2 border-indigo-500/30 pl-6 group-hover:border-indigo-500 transition-all">"{version.prompt || 'Manual Intervention'}"</p>
                          <button 
                            onClick={() => setCode(version.code)}
                            className="w-full py-4 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-[4px] hover:bg-white hover:text-black transition-all hover:border-white shadow-2xl active:scale-[0.98]"
                          >
                            Restore Form
                          </button>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: LIVE PREVIEW */}
        <div className="flex-1 relative bg-black flex flex-col">
          <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-white/5">
             <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 blur-[2px]" />
                <span className="text-[10px] font-black uppercase tracking-[4px] text-white">Live Manifestation View</span>
             </div>
             <div className="flex items-center gap-4 text-[9px] text-white/20 uppercase tracking-widest font-bold">
               <span>Interactive Preview</span>
               <div className="w-px h-3 bg-white/10" />
               <span>Standard Sandbox</span>
             </div>
          </div>
          
          <div className="relative flex-1 bg-[#020205] overflow-hidden">
             {!code && (
               <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#020205] space-y-6">
                 <div className="relative">
                   <div className="absolute inset-0 blur-2xl bg-indigo-500/20 animate-pulse" />
                   <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
                 </div>
                 <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[6px] text-white animate-pulse">Neural Synthesis in Progress</span>
                    <span className="text-[8px] uppercase tracking-[3px] text-white/30 italic">Connecting to Collective Consciousness...</span>
                 </div>
                 <div className="w-32 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500" 
                      animate={{ x: [-128, 128] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                 </div>
               </div>
             )}
             {/* THE ACTUAL PREVIEW FRAME */}
             <iframe 
               ref={iframeRef}
               srcDoc={srcDoc}
               className="w-full h-full border-none"
               title="manifestation-player"
               sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
             />
             
             {/* FADE COVERS */}
             <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#020205] to-transparent pointer-events-none" />
             <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-[#020205] to-transparent pointer-events-none" />
          </div>
          
          {/* HUD OVERLAY ON PREVIEW */}
          <div className="absolute bottom-6 right-6 flex gap-2">
             <button 
               onClick={() => {
                 if (iframeRef.current) {
                   iframeRef.current.srcdoc = srcDoc; // Reload
                 }
               }}
               className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-white/40 hover:text-white"
             >
               <RefreshCw className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
