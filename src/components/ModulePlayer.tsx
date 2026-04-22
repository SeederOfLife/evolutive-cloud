
import React, { useState, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { Sparkles, X, Database, Loader2 } from "lucide-react";
import { Suggestion } from "../types";

export function ModulePlayer({ 
  suggestion, 
  onClose, 
  onSave 
}: { 
  suggestion: Suggestion, 
  onClose: () => void, 
  onSave?: (code: string) => Promise<void> 
}) {
  const [code, setCode] = useState(suggestion.manifested_code || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      setIsEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save changes to the collective mind.");
    } finally {
      setIsSaving(false);
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
            
            <div className="hidden md:flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
              <button 
                onClick={() => setIsEditing(false)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${!isEditing ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}
              >
                Manifestation
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}
              >
                Source Code
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditing && (
              <button 
                onClick={handleSave}
                disabled={isSaving || code === suggestion.manifested_code}
                className="px-4 py-2 bg-green-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Save Sync
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-transparent relative overflow-hidden">
          {isEditing ? (
            <div className="absolute inset-0 flex flex-col bg-[#080808]">
              <textarea 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full h-full bg-transparent p-6 md:p-10 font-mono text-xs md:text-sm text-indigo-300 outline-none resize-none selection:bg-indigo-500/30 no-scrollbar"
                placeholder="// Enter your manifestation modifications here..."
              />
              <div className="p-4 border-t border-white/5 bg-black/40 text-[9px] text-white/20 uppercase tracking-[4px] font-black flex justify-between items-center">
                 <span>Collaborative Revision Layer active</span>
                 <span className="italic">Changes must be synchronized to persist</span>
              </div>
            </div>
          ) : (
            <iframe 
              ref={iframeRef}
              srcDoc={srcDoc}
              className="w-full h-full border-none"
              sandbox="allow-scripts"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
