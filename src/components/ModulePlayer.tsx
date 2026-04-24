
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
  Code,
  FileJson,
  FolderTree,
  Settings,
  ChevronRight,
  ChevronDown,
  Terminal,
  Play,
  Monitor
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
  const [code, setCode] = useState(suggestion.built_code || "");
  const [activeSideTab, setActiveSideTab] = useState<'files' | 'chat' | 'history' | 'settings'>('files');
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [activeFile, setActiveFile] = useState('src/App.tsx');
  const [showPreview, setShowPreview] = useState(true);

  // Sync code if it changes externally
  useEffect(() => {
    if (suggestion.built_code && !code) {
      setCode(suggestion.built_code);
    }
  }, [suggestion.built_code]);

  const [isSaving, setIsSaving] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>(
    suggestion.built_code ? [] : [{ role: 'user', content: `Initiating application sequence for: ${suggestion.content}` }]
  );
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanCode = useMemo(() => {
    if (!code) return "";
    let processed = code.replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '');
    processed = processed.replace(/import\s+['"].*?['"];?/g, '');
    processed = processed.replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1');
    processed = processed.replace(/export\s+default\s+class\s+([a-zA-Z0-9_$]+)/g, 'class $1');
    processed = processed.replace(/export\s+default\s+([a-zA-Z0-9_$]+);?/g, 'window.__BUILT_APP__ = $1;');
    if (processed.includes('export default')) {
       processed = processed.replace(/export\s+default\s+/g, 'window.__BUILT_APP__ = ');
    }
    processed = processed.replace(/\bexport\s+/g, '');
    
    // No complex escaping needed if we use JSON.stringify in the target
    return processed.trim();
  }, [code]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(code);
    } catch (err) {
      console.error("Save failed:", err);
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
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Application logic adjusted. System updated." }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Build error: " + (err as any).message }]);
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
        <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
        <script src="https://unpkg.com/framer-motion@10.16.4/dist/framer-motion.js"></script>
        <script src="https://unpkg.com/recharts/umd/Recharts.min.js"></script>
        <script src="https://unpkg.com/d3@7"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
        
        <style>
          body { 
            background: transparent;
            color: white; 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
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
          }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          (async function() {
            try {
              const { useState, useEffect, useMemo, useRef, useCallback } = window.React;
              const { motion, AnimatePresence } = window.Motion || {};
              const LucideReact = window.LucideReact || {};
              const React = window.React;
              const ReactDOM = window.ReactDOM;
              const THREE = window.THREE;

              Object.keys(LucideReact).forEach(key => { if (typeof LucideReact[key] === 'function' || typeof LucideReact[key] === 'object') window[key] = LucideReact[key]; });

              const Icon = ({ name, ...props }) => {
                let C = LucideReact[name] || LucideReact[name.charAt(0).toUpperCase() + name.slice(1)];
                return C ? <C {...props} /> : null;
              };
              window.Icon = Icon;

              try {
                // Synchronously transpile and execute the code using Babel
                const scriptBody = ${JSON.stringify(cleanCode)};
                const transpiled = Babel.transform(scriptBody, { 
                  presets: ['react'],
                  filename: 'built-app.js'
                }).code;
                
                const scriptNode = document.createElement('script');
                scriptNode.text = transpiled;
                document.body.appendChild(scriptNode);
                
                // Allow a tiny microtask break for any immediate execution side effects
                await new Promise(r => setTimeout(r, 0));
              } catch (evalErr) {
                console.error("Evaluation Error:", evalErr);
                throw new Error("System Sync Failed: " + evalErr.message);
              }

              let AppComp = window.App || window.__BUILT_APP__ || window.Main || window.BuiltApp;
              if (!AppComp) {
                const keys = Object.keys(window).filter(k => /^[A-Z]/.test(k) && typeof window[k] === 'function' && !['React', 'ReactDOM', 'Recharts', 'Motion', 'LucideReact'].includes(k));
                if (keys.length > 0) AppComp = window[keys[0]];
              }
              
              if (AppComp) {
                ReactDOM.createRoot(document.getElementById('root')).render(<AppComp />);
              } else {
                throw new Error("No App component found in the built code.");
              }
            } catch (err) {
              console.error(err);
              document.getElementById('root').innerHTML = \`<div class="error-container"><b>Execution Failure</b><br/>\${err.message}</div>\`;
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
      className="fixed inset-0 z-50 flex flex-col bg-[#050508] text-white overflow-hidden font-sans"
    >
      {/* --- TOP BAR --- */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-2xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-[10px] font-black uppercase tracking-[3px] leading-none mb-0.5">EVOLUTIONARY_STUDIO</h1>
              <p className="text-[8px] text-white/30 uppercase tracking-[2px] font-bold">Rev: {suggestion.version || 1}.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg ml-4">
            <button 
              onClick={() => setShowPreview(true)}
              className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Preview
            </button>
            <button 
              onClick={() => setShowPreview(false)}
              className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${!showPreview ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Code
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={isSaving || code === suggestion.built_code}
            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[2px] transition-all flex items-center gap-2 ${code === suggestion.built_code ? 'bg-white/5 text-white/20' : 'bg-white text-black hover:scale-105 active:scale-95'}`}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
            Commit
          </button>
          <button 
            onClick={onClose} 
            className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* --- ACTIVITY BAR (SIDE) --- */}
        <div className="w-14 border-r border-white/5 bg-[#020205] flex flex-col items-center py-4 gap-6 shrink-0">
          {[
            { id: 'files', icon: FolderTree, label: 'Files' },
            { id: 'chat', icon: MessageCircle, label: 'AI' },
            { id: 'history', icon: History, label: 'History' },
            { id: 'settings', icon: Settings, label: 'Config' }
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => {
                setActiveSideTab(btn.id as any);
                setIsExplorerOpen(true);
              }}
              className={`relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all ${activeSideTab === btn.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-white/20 hover:text-white/60'}`}
            >
              <btn.icon className="w-5 h-5" />
              {activeSideTab === btn.id && (
                <div className="absolute left-0 w-1 h-4 bg-indigo-500 rounded-r-full" />
              )}
              <div className="absolute left-16 px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {btn.label}
              </div>
            </button>
          ))}
        </div>

        {/* --- SIDEBAR CONTENT (EXPLORER / CHAT) --- */}
        <AnimatePresence>
          {isExplorerOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/5 bg-[#08080a] flex flex-col overflow-hidden shrink-0"
            >
              <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-white/5 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-[3px] text-white/60">
                  {activeSideTab === 'files' ? 'File_Explorer' : activeSideTab.toUpperCase()}
                </span>
                <button onClick={() => setIsExplorerOpen(false)} className="text-white/20 hover:text-white">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                {activeSideTab === 'files' && (
                  <div className="px-2 space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-white/40 text-[10px] items-center">
                       <ChevronDown className="w-3 h-3" />
                       <span className="font-bold uppercase tracking-widest">APP_ROOT</span>
                    </div>
                    <div className="ml-4 space-y-1">
                      <div className="flex items-center gap-2 px-3 py-2 text-white/40 text-[9px] items-center">
                         <ChevronDown className="w-3 h-3 text-indigo-500/50" />
                         <span className="font-bold uppercase tracking-widest">src</span>
                      </div>
                      <button 
                        onClick={() => { setActiveFile('src/App.tsx'); setShowPreview(false); }}
                        className={`w-full flex items-center gap-3 px-6 py-2 rounded-lg text-[10px] font-medium transition-all ${activeFile === 'src/App.tsx' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        App.tsx
                      </button>
                      <button 
                        onClick={() => { setActiveFile('metadata.json'); setShowPreview(false); }}
                        className={`w-full flex items-center gap-3 px-6 py-2 rounded-lg text-[10px] font-medium transition-all ${activeFile === 'metadata.json' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                      >
                        <FileJson className="w-3.5 h-3.5" />
                        metadata.json
                      </button>
                    </div>
                  </div>
                )}

                {activeSideTab === 'chat' && (
                  <div className="h-full flex flex-col p-4">
                    <div className="flex-1 overflow-y-auto space-y-6 mb-4 custom-scrollbar pr-2">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[90%] p-4 rounded-2xl text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/5 border border-white/10 text-white/70 shadow-lg'}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isRefining && (
                        <div className="flex items-center gap-3 text-white/30 italic text-[10px]">
                           <Loader2 className="w-3 h-3 animate-spin" />
                           Building application structure...
                        </div>
                      )}
                    </div>
                    <div className="relative group">
                       <input 
                         type="text" 
                         value={refineInput}
                         onChange={(e) => setRefineInput(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                         placeholder="App feedback..."
                         className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[11px] outline-none group-focus-within:border-indigo-500/50 transition-all font-medium"
                       />
                       <button 
                         onClick={handleRefine}
                         className="absolute right-2 top-2 w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-400 transition-all"
                       >
                         <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                )}

                {activeSideTab === 'history' && (
                  <div className="px-4 space-y-4">
                    {suggestion.history?.map((v, i) => (
                      <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3 hover:border-indigo-500/30 transition-all group">
                         <div className="flex justify-between items-center text-[8px] font-black text-white/30 uppercase tracking-widest">
                            <span>GEN_{suggestion.history!.length - i}</span>
                            <span>{new Date(v.timestamp).toLocaleTimeString()}</span>
                         </div>
                         <p className="text-[10px] text-white/60 line-clamp-2 italic">"{v.prompt || 'Manual Edit'}"</p>
                         <button 
                           onClick={() => setCode(v.code)}
                           className="w-full py-2 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                         >
                           Restore
                         </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MAIN WORKSPACE --- */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
           
           {/* EDITOR AREA */}
           <div className={`flex flex-col bg-[#050508] transition-all duration-500 ${showPreview ? 'w-0 md:w-1/2 opacity-0 md:opacity-100 hidden md:flex' : 'flex-1 opacity-100'}`}>
              <div className="h-10 border-b border-white/5 flex items-center gap-px bg-black/20 shrink-0">
                 <div className="h-full px-4 flex items-center gap-2 bg-white/5 border-r border-white/5">
                    <Code className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">{activeFile}</span>
                 </div>
              </div>
              <div className="flex-1 overflow-hidden relative">
                {activeFile === 'src/App.tsx' ? (
                  <textarea 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full bg-transparent p-8 font-mono text-[13px] text-indigo-100/70 outline-none resize-none custom-scrollbar leading-relaxed"
                  />
                ) : (
                  <div className="p-8 font-mono text-[12px] text-white/40 uppercase tracking-widest leading-relaxed">
                     <FileJson className="w-8 h-8 mb-4 opacity-20" />
                     {JSON.stringify({ 
                       id: suggestion.id, 
                       status: suggestion.status, 
                       created_at: suggestion.created_at,
                       content: suggestion.content
                     }, null, 2)}
                  </div>
                )}
              </div>
              <div className="h-8 border-t border-white/5 bg-black/40 flex items-center justify-between px-6 text-[8px] font-black text-white/20 uppercase tracking-[3px]">
                 <span>{activeFile.split('.').pop()?.toUpperCase() || 'PLAINTEXT'}</span>
                 <span>Evolution Layer 1.0</span>
              </div>
           </div>

           {/* PREVIEW AREA */}
           <div className={`flex flex-col bg-[#020205] transition-all duration-500 ${showPreview ? 'flex-1' : 'w-0 md:w-0 opacity-0 overflow-hidden hidden md:flex'}`}>
              <div className="h-10 border-b border-white/5 flex items-center justify-between px-6 bg-black/20 shrink-0">
                 <div className="flex items-center gap-3">
                   <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/40">App Preview</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Stable</span>
                 </div>
              </div>
              <div className="flex-1 relative group">
                  <iframe 
                    ref={iframeRef}
                    srcDoc={srcDoc}
                    className="w-full h-full border-none"
                    title="app-player"
                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                  />
                  {!code && (
                    <div className="absolute inset-0 bg-[#020205] flex flex-col items-center justify-center p-10 text-center">
                       <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-6" />
                       <span className="text-[10px] font-black uppercase tracking-[5px] text-white/40">Awaiting Build</span>
                    </div>
                  )}

                  {/* MINI HUD */}
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                       onClick={() => { if (iframeRef.current) iframeRef.current.srcdoc = srcDoc; }}
                       className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl transition-all text-white/40 hover:text-white"
                    >
                       <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
              </div>
              <div className="h-8 border-t border-white/5 bg-black/40 flex items-center px-6 gap-6 overflow-hidden">
                 <div className="flex items-center gap-2 text-[8px] font-black text-white/20 uppercase tracking-widest shrink-0">
                    <Terminal className="w-3 h-3" />
                    <span>AI Runtime</span>
                 </div>
                 <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden flex items-center px-2">
                    <div className="text-[7px] text-white/10 uppercase tracking-tighter truncate">Bootstrapping framework... Complete. Mapping dependencies... Complete. Executing application logic...</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
