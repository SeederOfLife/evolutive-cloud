
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
  Layout,
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
  const [deviceFrame, setDeviceFrame] = useState<'phone' | 'desktop'>(suggestion.app_type === 'phone' ? 'phone' : 'desktop');
  const [isExplorerOpen, setIsExplorerOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
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
  
  const [runtimeStatus, setRuntimeStatus] = useState("Initializing neural bridge...");
  const [runtimeLogs, setRuntimeLogs] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'EVO_LOG') {
        setRuntimeLogs(prev => [e.data.content, ...prev].slice(0, 50));
        setRuntimeStatus(e.data.content);
      }
      if (e.data?.type === 'EVO_ERROR') {
        setRuntimeStatus("CRITICAL_ERROR: " + e.data.msg);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const cleanCode = useMemo(() => {
    if (!code) return "";
    let processed = code;
    
    // Remove imports but keep the variable names if they are used as destructured elements 
    // We'll strip them and allow the injection logic to provide them as locals or via window.
    processed = processed.replace(/import\s+[\s\S]*?from\s+(["'])(?:react|lucide-react|framer-motion|motion\/react|recharts|d3|three|@react-three\/fiber|@react-three\/drei|react-markdown|tone|openai|canvas-confetti|clsx|tailwind-merge|@google\/generative-ai).*?\1;?/g, '');
    processed = processed.replace(/import\s+(['"]).*?\1;?/g, '');
    
    // Remove individual imports like import { useState } from "react";
    processed = processed.replace(/import\s+\{([^}]+)\}\s+from\s+(["'])(?:react|lucide-react|framer-motion|motion\/react|recharts|d3|three|@react-three\/fiber|@react-three\/drei|react-markdown|tone|openai|canvas-confetti|clsx|tailwind-merge|@google\/generative-ai).*?\2;?/g, '');

    // Remove boilerplate that AI might generate despite instructions
    processed = processed.replace(/const\s+\{[\s\S]*?\}\s*=\s*(window\.)?(React|Motion|lucide|Lucide|Recharts|d3|LucideReact);?/g, '');
    processed = processed.replace(/const\s+([a-zA-Z0-9_$]+)\s*=\s*(window\.)?(React|Motion|lucide|Lucide|Recharts|d3|LucideReact)\.([a-zA-Z0-9_$]+);?/g, '');
    
    // Handle exports - capture the component for rendering
    // 1. Named function export
    processed = processed.replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/g, 'window.__BUILT_APP__ = function $1');
    // 2. Anonymous function export
    processed = processed.replace(/export\s+default\s+function\s*\(/g, 'window.__BUILT_APP__ = function (');
    // 2b. Arrow function anonymous
    processed = processed.replace(/export\s+default\s+\(([^)]*)\)\s*=>/g, 'window.__BUILT_APP__ = ($1) =>');
    // 3. Class export
    processed = processed.replace(/export\s+default\s+class\s+([a-zA-Z0-9_$]+)/g, 'window.__BUILT_APP__ = class $1');
    // 4. Anonymous class export
    processed = processed.replace(/export\s+default\s+class\s*\{/g, 'window.__BUILT_APP__ = class {');
    // 5. Arrow function/Variable export (e.g., const App = ...; export default App;)
    processed = processed.replace(/export\s+default\s+([a-zA-Z0-9_$]+);?\s*$/gm, 'window.__BUILT_APP__ = $1;');
    
    // Remaining generic exports
    processed = processed.replace(/export\s+default\s+/g, 'window.__BUILT_APP__ = ');
    processed = processed.replace(/\bexport\s+/g, '');
    
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

  const srcDoc = useMemo(() => {
    const base = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script crossorigin="anonymous" src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/@babel/standalone@7.23.4/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/lucide-react@0.453.0/dist/umd/lucide-react.min.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/framer-motion@10.16.4/dist/framer-motion.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/recharts@2.10.3/umd/Recharts.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/d3@7"></script>
        <script crossorigin="anonymous" src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.min.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/@react-three/fiber@8.13.0/dist/react-three-fiber.umd.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/@react-three/drei@9.78.1/dist/index.umd.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/react-markdown@8.0.7/react-markdown.min.js"></script>
        <script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/clsx@2.0.0/dist/clsx.min.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/tailwind-merge@1.14.0/dist/bundle.min.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/tone@14.7.77/build/Tone.js"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/openai@4.0.0/dist/index.browser.js"></script>
        
        <style>
          body { 
            background: #050508;
            color: white; 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: auto;
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
            word-break: break-all;
            white-space: pre-wrap;
          }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          (async function() {
            // Save initial window keys to filter later
            const initialKeys = new Set(Object.keys(window));
            
            const rootElement = document.getElementById('root');
            const reportError = (msg, stack) => {
              console.error("Evolution Error:", msg, stack);
              // Report back to parent
              window.parent.postMessage({ type: 'EVO_ERROR', msg, stack }, '*');
              rootElement.innerHTML = [
                '<div class="error-container">',
                '<div style="font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; color: #f87171;">Evolution Failure</div>',
                '<div style="opacity: 0.8; margin-bottom: 12px;">' + msg + '</div>',
                stack ? '<pre style="font-size: 10px; opacity: 0.5; overflow: auto; max-height: 200px;">' + stack + '</pre>' : '',
                '</div>'
              ].join("");
            };

            // Capture console logs
            const oldLog = console.log;
            console.log = (...args) => {
              oldLog(...args);
              window.parent.postMessage({ type: 'EVO_LOG', content: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
            };

            window.onerror = (msg, url, line, col, error) => {
              reportError(msg, error?.stack);
              return false;
            };

            try {
              // Poll for dependencies with a timeout
              const start = Date.now();
              while ((!window.Babel || !window.React || !window.ReactDOM) && Date.now() - start < 5000) {
                await new Promise(r => setTimeout(r, 100));
              }

              if (!window.Babel || !window.React || !window.ReactDOM) {
                throw new Error("Neural Bridge Timeout: Essential libraries failed to materialize.");
              }

              const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext, useReducer, useLayoutEffect } = window.React;
              const LucideReact = window.LucideReact || {};
              const React = window.React;
              const ReactDOM = window.ReactDOM;
              const THREE = window.THREE;
              const Motion = window.Motion || window.framerMotion || {};
              const Fiber = window.ReactThreeFiber || {};
              const Drei = window.Drei || {};
              const Markdown = window.ReactMarkdown;
              const { clsx } = window;
              const { twMerge } = window.tailwindMerge || {};
              const Tone = window.Tone || {};
              const OpenAI = window.OpenAI || {};
              
              // Handle potential CommonJS output from Babel
              window.exports = window.exports || {};
              window.module = window.module || { exports: window.exports };
              window.require = (name) => {
                const map = {
                  'react': window.React,
                  'react-dom': window.ReactDOM,
                  'react-dom/client': window.ReactDOM,
                  'lucide-react': window.LucideReact,
                  'framer-motion': window.Motion,
                  'motion/react': window.Motion,
                  'recharts': window.Recharts,
                  'd3': window.d3,
                  'three': window.THREE,
                  '@react-three/fiber': window.ReactThreeFiber,
                  '@react-three/drei': window.Drei,
                  'react-markdown': window.ReactMarkdown,
                  'canvas-confetti': window.confetti,
                  'clsx': window.clsx,
                  'tailwind-merge': window.tailwindMerge,
                  'tone': window.Tone,
                  'openai': window.OpenAI,
                  '@google/generative-ai': window.GoogleGenAI
                };
                return map[name] || window[name] || {};
              };

              // Expose popular libs to global scope for AI logic
              window.React = React;
              window.ReactDOM = ReactDOM;
              window.THREE = THREE;
              window.Canvas = Fiber.Canvas;
              window.Markdown = Markdown;
              window.ReactMarkdown = Markdown; // Alias
              window.clsx = clsx;
              window.twMerge = twMerge;
              window.cn = (...args) => twMerge ? twMerge(clsx(...args)) : clsx(...args);
              window.Tone = Tone;
              window.OpenAI = OpenAI;
              
              // Standard hooks
              window.useState = useState;
              window.useEffect = useEffect;
              window.useMemo = useMemo;
              window.useRef = useRef;
              window.useCallback = useCallback;
              window.createContext = createContext;
              window.useContext = useContext;
              window.useReducer = useReducer;
              window.useLayoutEffect = useLayoutEffect;
              
              // Map all Drei components
              Object.keys(Drei).forEach(key => {
                if (/^[A-Z]/.test(key)) window[key] = Drei[key];
              });
              
              if (Drei.OrbitControls) window.OrbitControls = Drei.OrbitControls;

              // Map Fiber hooks/components
              Object.keys(Fiber).forEach(key => {
                if (!window[key]) window[key] = Fiber[key];
              });

              // Map Framer Motion correctly
              window.motion = Motion.motion || Motion;
              window.AnimatePresence = Motion.AnimatePresence;
              window.LayoutGroup = Motion.LayoutGroup;
              // Ensure window.Motion has the shape the AI expects
              if (!window.Motion) window.Motion = { motion: window.motion, AnimatePresence: window.AnimatePresence, LayoutGroup: window.LayoutGroup };

              // Expose Recharts components globally
              const Recharts = window.Recharts || {};
              Object.keys(Recharts).forEach(key => {
                window[key] = Recharts[key];
              });

              // Expose Lucide icons globally and via the alias the AI expects
              const LucideReact = window.LucideReact || {};
              window.lucide = LucideReact;
              window.Lucide = LucideReact;
              Object.keys(LucideReact).forEach(key => { 
                if (typeof LucideReact[key] === 'function' || typeof LucideReact[key] === 'object') {
                  if (/^[A-Z]/.test(key)) window[key] = LucideReact[key]; 
                  // Also expose lowercase version if AI uses it (less common but safe)
                  if (!window[key.toLowerCase()]) window[key.toLowerCase()] = LucideReact[key];
                }
              });

              // Inject common hooks into local scope of the script if possible
              const commonLocals = {
                React, ReactDOM, useState, useEffect, useMemo, useRef, useCallback, createContext, useContext, useReducer, useLayoutEffect,
                motion: window.motion, AnimatePresence: window.AnimatePresence, LayoutGroup: window.LayoutGroup,
                ...LucideReact, ...Recharts
              };

              const scriptBody = __SCRIPT_BODY_PLACEHOLDER__;
              if (!scriptBody || scriptBody.length < 10) {
                rootElement.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; opacity: 0.2; text-transform: uppercase; letter-spacing: 10px; font-weight: 900;">Awaiting Manifestation</div>';
                return;
              }

              try {
                console.log("Transpiling logic...");
                // Wrap in scope to provide local variables for common imports
                const keys = Object.keys(commonLocals).filter(k => /^[a-zA-Z0-9_$]+$/.test(k) && !['default', 'module', 'exports'].includes(k));
                const scopePrefex = 'const { ' + keys.join(', ') + ' } = window;\n';
                const transpiled = Babel.transform(scopePrefex + scriptBody, { 
                  presets: ['env', 'react', 'typescript'],
                  filename: 'built-app.tsx'
                }).code;
                
                console.log("Transpilation successful. Injecting...");
                const scriptNode = document.createElement('script');
                scriptNode.text = transpiled;
                document.body.appendChild(scriptNode);
              } catch (transpileErr) {
                throw new Error("Transpilation Entropy: " + transpileErr.message);
              }

              // Let the script register components
              await new Promise(r => setTimeout(r, 50));

              console.log("Locating App component...");
              let AppComp = window.__BUILT_APP__ || window.App || window.Main || window.BuiltApp;
              
              if (!AppComp || typeof AppComp !== 'function') {
                if (window.exports && typeof window.exports.default === 'function') {
                  AppComp = window.exports.default;
                } else if (window.module && window.module.exports) {
                  if (typeof window.module.exports.default === 'function') {
                    AppComp = window.module.exports.default;
                  } else if (typeof window.module.exports === 'function') {
                    AppComp = window.module.exports;
                  }
                }
                
                // Check for named exports in exports object
                if (!AppComp && window.exports) {
                  const namedExport = Object.keys(window.exports).find(k => /^[A-Z]/.test(k) && typeof window.exports[k] === 'function');
                  if (namedExport) AppComp = window.exports[namedExport];
                }
              }

              // Final detection heuristic
              if (!AppComp || typeof AppComp !== 'function') {
                const detected = Object.keys(window).find(k => 
                  !initialKeys.has(k) &&
                  /^[A-Z]/.test(k) && 
                  typeof window[k] === 'function' && 
                  !['React', 'ReactDOM', 'Recharts', 'Motion', 'LucideReact', 'Babel', 'THREE', 'Icon', 'AppComp', 'Lucide', 'Drei', 'Fiber'].includes(k) &&
                  !LucideReact[k] &&
                  !k.startsWith('_')
                );
                if (detected) {
                  console.log("Detected possible component via heuristic:", detected);
                  AppComp = window[detected];
                }
              }
              
              if (AppComp) {
                console.log("Rendering App component...");
                try {
                  const root = ReactDOM.createRoot(rootElement);
                  root.render(React.createElement(AppComp));
                  console.log("Manifestation complete.");
                } catch (renderErr) {
                  console.error("Render catch:", renderErr);
                  reportError("Component initialization failure: " + renderErr.message, renderErr.stack);
                }
              } else {
                throw new Error("No architectural anchor (App component) manifested. Ensure your code defines 'export default function App() {}' or a global 'App' function.");
              }
            } catch (err) {
              reportError(err.message, err.stack);
            }
          })();
        </script>
      </body>
    </html>
  `;
    return base.replace('__SCRIPT_BODY_PLACEHOLDER__', () => JSON.stringify(cleanCode));
  }, [cleanCode]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#050508] text-white overflow-hidden font-sans"
    >
      {/* --- TOP BAR --- */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-2 sm:px-4 bg-black/40 backdrop-blur-2xl shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/60 active:scale-90 transition-all"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsExplorerOpen(!isExplorerOpen)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/60 active:scale-90 transition-all"
              title="Menu"
            >
              <FolderTree className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 hidden sm:flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[10px] font-black uppercase tracking-[3px] leading-none mb-0.5">EVOLUTIONARY_STUDIO</h1>
              <p className="text-[8px] text-white/30 uppercase tracking-[2px] font-bold">Rev: {suggestion.version || 1}.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-white/5 p-0.5 sm:p-1 rounded-lg ml-0 sm:ml-4">
            <button 
              onClick={() => setShowPreview(true)}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Preview
            </button>
            <button 
              onClick={() => setShowPreview(false)}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${!showPreview ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Code
            </button>
          </div>

          {showPreview && (
            <div className="flex items-center gap-1 bg-white/5 p-0.5 sm:p-1 rounded-lg ml-1 sm:ml-2">
              <button 
                onClick={() => setDeviceFrame('phone')}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-all ${deviceFrame === 'phone' ? 'bg-indigo-500 text-white' : 'text-white/20'}`}
                title="Phone Preview"
              >
                 <Layout className="w-3 h-3" />
              </button>
              <button 
                onClick={() => setDeviceFrame('desktop')}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md transition-all ${deviceFrame === 'desktop' ? 'bg-indigo-500 text-white' : 'text-white/20'}`}
                title="Desktop Preview"
              >
                 <Monitor className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={handleSave}
            disabled={isSaving || code === suggestion.built_code}
            className={`px-3 sm:px-4 py-2 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-[2px] transition-all flex items-center gap-2 ${code === suggestion.built_code ? 'bg-white/5 text-white/20' : 'bg-white text-black hover:scale-105 active:scale-95'}`}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
            <span className="hidden xs:inline">Commit</span>
          </button>
          <button 
            onClick={onClose} 
            className="hidden md:flex w-9 h-9 items-center justify-center hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* --- ACTIVITY BAR (SIDE) --- */}
        <div className="hidden md:flex w-16 border-r border-white/5 bg-[#020205] flex-col items-center py-6 gap-8 shrink-0">
          {[
            { id: 'files', icon: FolderTree, label: 'File' },
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
              animate={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`border-r border-white/5 bg-[#08080a] flex flex-col overflow-hidden shrink-0 z-40 ${typeof window !== 'undefined' && window.innerWidth < 768 ? 'fixed inset-0 top-14' : ''}`}
            >
              <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-white/5 shrink-0">
                <div className="flex md:hidden items-center gap-2 mr-2">
                   {[
                     { id: 'files', icon: FolderTree },
                     { id: 'chat', icon: MessageCircle },
                     { id: 'history', icon: History },
                     { id: 'settings', icon: Settings }
                   ].map(tab => (
                     <button 
                       key={tab.id}
                       onClick={() => setActiveSideTab(tab.id as any)}
                       className={`p-1.5 rounded-lg transition-all ${activeSideTab === tab.id ? 'bg-indigo-500 text-white' : 'text-white/20'}`}
                     >
                        <tab.icon className="w-3.5 h-3.5" />
                     </button>
                   ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[3px] text-white/60 truncate">
                  {activeSideTab === 'files' ? 'File_Explorer' : activeSideTab.toUpperCase()}
                </span>
                <button onClick={() => setIsExplorerOpen(false)} className="ml-auto text-white/20 hover:text-white shrink-0">
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
           <div className={`flex flex-col bg-[#050508] transition-all duration-700 ${showPreview ? 'w-0 md:w-[35%] opacity-0 md:opacity-100 hidden md:flex' : 'flex-1 opacity-100'}`}>
              <div className="h-12 border-b border-white/5 flex items-center gap-px bg-black/20 shrink-0">
                 <div className="h-full px-6 flex items-center gap-3 bg-white/5 border-r border-white/5">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-[3px] text-indigo-100">{activeFile}</span>
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
                  <div className="p-10 font-mono text-[12px] text-white/40 uppercase tracking-[4px] leading-relaxed">
                     <FileJson className="w-10 h-10 mb-6 opacity-20" />
                     {JSON.stringify({ 
                       id: suggestion.id, 
                       status: suggestion.status, 
                       created_at: suggestion.created_at,
                       content: suggestion.content
                     }, null, 2)}
                  </div>
                )}
              </div>
              <div className="h-10 border-t border-white/5 bg-black/40 flex items-center justify-between px-8 text-[9px] font-black text-white/20 uppercase tracking-[4px]">
                 <span>{activeFile.split('.').pop()?.toUpperCase() || 'PLAINTEXT'}</span>
                 <span>Revision Layer 1.2</span>
              </div>
           </div>

           {/* PREVIEW AREA */}
           <div className={`flex flex-col bg-[#020205] transition-all duration-500 ${showPreview ? 'flex-1' : 'w-0 md:w-0 opacity-0 overflow-hidden hidden md:flex'}`}>
              <div className="h-12 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0">
                 <div className="flex items-center gap-4">
                   <Monitor className="w-4 h-4 text-indigo-400" />
                   <span className="text-[11px] font-black uppercase tracking-[4px] text-white/60">Live Preview Workspace</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-[4px] text-white/30">{deviceFrame.toUpperCase()} MODE</span>
                 </div>
              </div>
              <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden p-2 sm:p-4 lg:p-12">
                 <div className={`relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                   deviceFrame === 'phone' 
                   ? 'w-full max-w-[320px] aspect-[9/19] max-h-full rounded-[2.5rem] sm:rounded-[3.5rem] border-[10px] sm:border-[14px] border-white/10 shadow-[0_60px_120px_rgba(0,0,0,0.6)] bg-black overflow-hidden' 
                   : 'w-full h-full rounded-2xl lg:rounded-[3rem] border border-white/10 bg-black shadow-[0_40px_80px_rgba(0,0,0,0.4)]'
                 }`}>
                    {/* Phone Status Bar Mockup */}
                    {deviceFrame === 'phone' && (
                       <div className="absolute top-0 left-0 w-full h-8 sm:h-10 flex items-center justify-between px-8 sm:px-10 z-10 pointer-events-none">
                          <div className="text-[9px] sm:text-[11px] font-black text-white/40 font-mono tracking-tighter">9:41</div>
                          <div className="flex gap-1.5 items-center">
                             <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/10 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                             </div>
                             <div className="w-5 h-2.5 sm:w-6 sm:h-3 rounded-[2px] border border-white/20 relative">
                                <div className="absolute top-0.5 left-0.5 bottom-0.5 right-1 bg-white/40 rounded-[1px]" />
                             </div>
                          </div>
                       </div>
                    )}
                    
                    <iframe 
                      ref={iframeRef}
                      srcDoc={srcDoc}
                      className="w-full h-full border-none bg-black"
                      title="app-player"
                      sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                    />
                    
                    {/* Phone Home Indicator Mockup */}
                    {deviceFrame === 'phone' && (
                       <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 sm:w-36 h-1.5 bg-white/10 rounded-full z-10 pointer-events-none" />
                    )}
                 </div>
              </div>
                  {!code && (
                    <div className="absolute inset-0 bg-[#020205] flex flex-col items-center justify-center p-10 text-center">
                       <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-6" />
                       <span className="text-[10px] font-black uppercase tracking-[5px] text-white/40">Awaiting Build</span>
                    </div>
                  )}

                  {/* MINI HUD */}
                  <div className="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                       onClick={() => { if (iframeRef.current) iframeRef.current.srcdoc = srcDoc; }}
                       className="p-4 bg-white/5 hover:bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl transition-all text-white/40 hover:text-white shadow-2xl hover:scale-110 active:scale-90"
                       title="Neural Reboot"
                    >
                       <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
              </div>
              <div className="h-10 sm:h-12 border-t border-white/5 bg-black/40 flex items-center px-4 sm:px-8 gap-4 sm:gap-8 overflow-hidden backdrop-blur-3xl shrink-0">
                 <div className="flex items-center gap-3 text-[9px] font-black text-white/30 uppercase tracking-[4px] shrink-0">
                    <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="hidden xs:inline">Bridge_Status</span>
                 </div>
                 <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${runtimeStatus.includes('CRITICAL') ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]'} animate-pulse`} />
                    <div className="text-[10px] text-white/60 font-mono uppercase tracking-tighter truncate">
                      {runtimeStatus}
                    </div>
                 </div>
                 <div className="hidden sm:flex items-center gap-4 text-[8px] font-bold text-white/10 uppercase tracking-widest shrink-0">
                    <span>Transpiler: Babel 7.23</span>
                    <span>Layers: 3rd_Dimension</span>
                 </div>
              </div>
           </div>
        </div>
    </motion.div>
  );
}
