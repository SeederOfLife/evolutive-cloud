
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Database,
  Loader2,
  MessageCircle,
  History,
  ArrowRight,
  RefreshCw,
  Code,
  FileJson,
  FolderTree,
  Settings,
  ChevronDown,
  Monitor,
  Zap,
} from "lucide-react";
import { Suggestion } from "../types";

export function ModulePlayer({
  suggestion,
  onClose,
  onSave,
  onRefine,
}: {
  suggestion: Suggestion;
  onClose: () => void;
  onSave?: (code: string) => Promise<void>;
  onRefine?: (feedback: string) => Promise<string>;
}) {
  const [code, setCode] = useState(suggestion.built_code || "");
  const [activeSideTab, setActiveSideTab] = useState<"files" | "chat" | "history" | "settings">("files");
  const [deviceFrame] = useState<"phone" | "desktop">(suggestion.app_type === "phone" ? "phone" : "desktop");
  const [isExplorerOpen, setIsExplorerOpen] = useState(typeof window !== "undefined" && window.innerWidth >= 768);
  const [activeFile, setActiveFile] = useState("src/App.tsx");
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (suggestion.built_code && !code) setCode(suggestion.built_code);
  }, [suggestion.built_code]);

  const [isSaving, setIsSaving] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>(
    suggestion.built_code ? [] : [{ role: "user", content: `Initiating application sequence for: ${suggestion.content}` }]
  );
  const [runtimeStatus, setRuntimeStatus] = useState("Initializing...");
  const [lastError, setLastError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "EVO_LOG") setRuntimeStatus(e.data.content);
      if (e.data?.type === "EVO_ERROR") {
        setRuntimeStatus("ERROR: " + e.data.msg);
        setLastError(e.data.msg);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => { setLastError(null); }, [code]);

  const cleanCode = useMemo(() => {
    if (!code) return "";
    let p = code;
    p = p.replace(/import\s+[\s\S]*?from\s+(["'])(?:react|lucide-react|framer-motion|motion\/react|recharts|d3|three|@react-three\/fiber|@react-three\/drei|react-markdown|tone|openai|canvas-confetti|clsx|tailwind-merge|@google\/generative-ai).*?\1;?/g, "");
    p = p.replace(/import\s+(['"]).*?\1;?/g, "");
    p = p.replace(/import\s+\{([^}]+)\}\s+from\s+(["'])(?:react|lucide-react|framer-motion|motion\/react|recharts|d3|three|@react-three\/fiber|@react-three\/drei|react-markdown|tone|openai|canvas-confetti|clsx|tailwind-merge|@google\/generative-ai).*?\2;?/g, "");
    p = p.replace(/const\s+\{[\s\S]*?\}\s*=\s*(window\.)?(React|Motion|lucide|Lucide|Recharts|d3|LucideReact);?/g, "");
    p = p.replace(/const\s+([a-zA-Z0-9_$]+)\s*=\s*(window\.)?(React|Motion|lucide|Lucide|Recharts|d3|LucideReact)\.([a-zA-Z0-9_$]+);?/g, "");
    p = p.replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/g, "window.__BUILT_APP__ = function $1");
    p = p.replace(/export\s+default\s+function\s*\(/g, "window.__BUILT_APP__ = function (");
    p = p.replace(/export\s+default\s+\(([^)]*)\)\s*=>/g, "window.__BUILT_APP__ = ($1) =>");
    p = p.replace(/export\s+default\s+class\s+([a-zA-Z0-9_$]+)/g, "window.__BUILT_APP__ = class $1");
    p = p.replace(/export\s+default\s+class\s*\{/g, "window.__BUILT_APP__ = class {");
    p = p.replace(/export\s+default\s+([a-zA-Z0-9_$]+);?\s*$/gm, "window.__BUILT_APP__ = $1;");
    p = p.replace(/export\s+default\s+/g, "window.__BUILT_APP__ = ");
    p = p.replace(/\bexport\s+/g, "");
    p = p.replace(/^import\b.+$/gm, "");
    return p.trim();
  }, [code]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try { await onSave(code); } catch (err) { console.error("Save failed:", err); } finally { setIsSaving(false); }
  };

  const handleRefine = async (overrideInput?: string) => {
    const prompt = overrideInput ?? refineInput;
    if (!onRefine || !prompt.trim()) return;
    setIsRefining(true);
    setChatMessages((prev) => [...prev, { role: "user", content: prompt }]);
    if (!overrideInput) setRefineInput("");
    try {
      const newCode = await onRefine(prompt);
      if (newCode) {
        setCode(newCode);
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Application logic adjusted. System updated." }]);
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Build error: " + (err as any).message }]);
    } finally {
      setIsRefining(false);
    }
  };

  const srcDoc = useMemo(() => {
    // Escape backticks (would break template literal) and </script> (would close HTML script tag early)
    const safeCode = JSON.stringify(cleanCode)
      .replace(/`/g, "\\u0060")
      .replace(/<\//g, "<\\/");

    return (
      `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>
body{background:#050508;color:#fff;margin:0;min-height:100vh;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:auto}
#root{flex:1;display:flex;flex-direction:column}
.err{padding:24px;color:#ef4444;background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.1);border-radius:16px;margin:20px;font-family:monospace;font-size:13px;word-break:break-all;white-space:pre-wrap}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:10px}
</style>
</head>
<body>
<div id="root"></div>
<script>
(function(){
  var root=document.getElementById('root');
  function showErr(msg,stack){
    window.parent&&window.parent.postMessage({type:'EVO_ERROR',msg:msg,stack:stack},'*');
    root.innerHTML='<div class="err"><div style="font-weight:800;letter-spacing:2px;margin-bottom:8px;color:#f87171;">BUILD FAILURE<\/div>'+msg+(stack?'<br><pre style="font-size:10px;opacity:.5;margin-top:8px;overflow:auto;max-height:180px">'+stack+'<\/pre>':'')+'<\/div>';
  }
  window.onerror=function(m,u,l,c,e){showErr(String(m),e&&e.stack);return true;};
  var _log=console.log;
  console.log=function(){
    _log.apply(console,arguments);
    window.parent&&window.parent.postMessage({type:'EVO_LOG',content:Array.from(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a):String(a);}).join(' ')},'*');
  };

  var SCRIPTS=[
    'https://unpkg.com/react@18.2.0/umd/react.development.js',
    'https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js',
    'https://unpkg.com/@babel/standalone@7.23.0/babel.min.js',
    'https://unpkg.com/lucide-react@0.263.0/dist/umd/lucide-react.js',
    'https://unpkg.com/recharts@2.8.0/umd/Recharts.js'
  ];
  var idx=0;
  function loadNext(){
    if(idx>=SCRIPTS.length){runApp();return;}
    var s=document.createElement('script');
    s.src=SCRIPTS[idx++];s.crossOrigin='anonymous';
    s.onload=loadNext;
    s.onerror=function(){showErr('CDN failed: '+SCRIPTS[idx-1]);};
    document.head.appendChild(s);
  }

  function mkEl(tag){
    return function(p){
      p=p||{};
      return window.React.createElement(tag,{className:p.className,style:p.style,id:p.id,onClick:p.onClick,onChange:p.onChange},p.children);
    };
  }

  function runApp(){
    try{
      window.process={env:{NODE_ENV:'development'}};
      window.exports={};window.module={exports:window.exports};
      var R=window.React,RD=window.ReactDOM;
      var IC=window.lucideReact||window.LucideReact||{};
      var RC=window.Recharts||{};

      ['useState','useEffect','useMemo','useRef','useCallback','createContext','useContext',
       'useReducer','useLayoutEffect','forwardRef','Fragment','memo','Children','cloneElement'].forEach(function(h){
        if(R[h]!==undefined)window[h]=R[h];
      });
      Object.keys(IC).forEach(function(k){if(k!=='default')window[k]=IC[k];});
      Object.keys(RC).forEach(function(k){if(/^[A-Z]/.test(k))window[k]=RC[k];});

      var motionObj={};
      ['div','span','p','h1','h2','h3','h4','h5','h6','ul','ol','li','a','button','img',
       'input','textarea','section','article','header','footer','nav','main','aside'].forEach(function(t){motionObj[t]=mkEl(t);});
      try{window.motion=new Proxy(motionObj,{get:function(o,k){return o[k]||mkEl(String(k));}});}
      catch(e){window.motion=motionObj;}
      window.AnimatePresence=function(p){return p&&p.children||null;};
      var FM={motion:window.motion,AnimatePresence:window.AnimatePresence,LayoutGroup:R.Fragment};
      window.FramerMotion=FM;

      window.require=function(m){
        var map={react:R,'react-dom':RD,'react-dom/client':RD,'lucide-react':IC,recharts:RC,'framer-motion':FM,'motion/react':FM};
        return map[m]||window[m]||{};
      };

      var code=` +
      safeCode +
      `;
      if(!code||code.length<10){
        root.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;opacity:.2;text-transform:uppercase;letter-spacing:10px;font-size:11px;font-weight:900;">Awaiting Manifestation<\/div>';
        return;
      }

      var hooks='useState,useEffect,useMemo,useRef,useCallback,createContext,useContext,useReducer,useLayoutEffect,forwardRef,Fragment,memo';
      var usedIC=Object.keys(IC).filter(function(k){return k!=='default'&&/^[a-zA-Z0-9_$]+$/.test(k)&&code.indexOf(k)!==-1;});
      var usedRC=Object.keys(RC).filter(function(k){return /^[A-Z][a-zA-Z0-9_$]*$/.test(k)&&code.indexOf(k)!==-1;});
      var scope='var React=window.React,ReactDOM=window.ReactDOM,motion=window.motion,AnimatePresence=window.AnimatePresence;\\n'+
                'var {'+hooks+'}=window.React;\\n';
      if(usedIC.length)scope+='var {'+usedIC.join(',')+'} = window.lucideReact||{};\\n';
      if(usedRC.length)scope+='var {'+usedRC.join(',')+'} = window.Recharts||{};\\n';

      var out;
      try{
        console.log('Transpiling...');
        out=Babel.transform(scope+code,{presets:['env','react','typescript'],filename:'app.tsx'}).code;
        console.log('Transpilation successful');
      }catch(e){throw new Error('Transpile error: '+e.message);}
      var el=document.createElement('script');el.text=out;document.body.appendChild(el);

      setTimeout(function(){
        var App=window.__BUILT_APP__||window.App||window.Main||window.BuiltApp;
        if(!App){
          var found=Object.keys(window).find(function(k){
            return /^[A-Z]/.test(k)&&typeof window[k]==='function'&&
              !['React','ReactDOM','Babel','Recharts','FramerMotion'].includes(k)&&!IC[k];
          });
          if(found){console.log('Detected: '+found);App=window[found];}
        }
        if(App){
          try{RD.createRoot(root).render(R.createElement(App));console.log('Manifestation complete.');}
          catch(e){showErr('Render error: '+e.message,e.stack);}
        }else{
          showErr("No App component found. Code must have: export default function App() {}");
        }
      },50);
    }catch(e){showErr(e.message,e.stack);}
  }

  loadNext();
})();
<\/script>
</body>
</html>`
    );
  }, [cleanCode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#050508] text-white overflow-hidden font-sans"
    >
      <div className="flex-1 flex overflow-hidden">
        {/* ACTIVITY BAR */}
        <div className="hidden md:flex w-16 border-r border-white/5 bg-[#020205] flex-col items-center py-6 gap-8 shrink-0 relative z-50">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all mb-4"
          >
            <X className="w-5 h-5" />
          </button>
          {[
            { id: "files", icon: FolderTree },
            { id: "chat", icon: MessageCircle },
            { id: "history", icon: History },
            { id: "settings", icon: Settings },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => { setActiveSideTab(btn.id as any); setIsExplorerOpen(true); }}
              className={`relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all ${activeSideTab === btn.id ? "bg-indigo-500/10 text-indigo-400" : "text-white/20 hover:text-white/60"}`}
            >
              <btn.icon className="w-5 h-5" />
              {activeSideTab === btn.id && <div className="absolute left-0 w-1 h-4 bg-indigo-500 rounded-r-full" />}
            </button>
          ))}
          <div className="mt-auto">
            <button
              onClick={handleSave}
              disabled={isSaving || code === suggestion.built_code}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${code === suggestion.built_code ? "bg-white/5 text-white/10" : "bg-white text-black hover:bg-indigo-500 hover:text-white"}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* SIDEBAR */}
        <AnimatePresence>
          {isExplorerOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`border-r border-white/5 bg-[#08080a] flex flex-col overflow-hidden shrink-0 z-40 ${typeof window !== "undefined" && window.innerWidth < 768 ? "fixed inset-0 top-14" : ""}`}
            >
              <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-white/5 shrink-0">
                <div className="flex md:hidden items-center gap-2 mr-2">
                  {[{ id: "files", icon: FolderTree }, { id: "chat", icon: MessageCircle }, { id: "history", icon: History }, { id: "settings", icon: Settings }].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveSideTab(tab.id as any)}
                      className={`p-1.5 rounded-lg transition-all ${activeSideTab === tab.id ? "bg-indigo-500 text-white" : "text-white/20"}`}>
                      <tab.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[3px] text-white/60 truncate">
                  {activeSideTab === "files" ? "File_Explorer" : activeSideTab.toUpperCase()}
                </span>
                <button onClick={() => setIsExplorerOpen(false)} className="ml-auto text-white/20 hover:text-white shrink-0">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                {activeSideTab === "files" && (
                  <div className="px-2 space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-white/40 text-[10px]">
                      <ChevronDown className="w-3 h-3" />
                      <span className="font-bold uppercase tracking-widest">APP_ROOT</span>
                    </div>
                    <div className="ml-4 space-y-1">
                      <div className="flex items-center gap-2 px-3 py-2 text-white/40 text-[9px]">
                        <ChevronDown className="w-3 h-3 text-indigo-500/50" />
                        <span className="font-bold uppercase tracking-widest">src</span>
                      </div>
                      <button onClick={() => { setActiveFile("src/App.tsx"); setShowPreview(false); }}
                        className={`w-full flex items-center gap-3 px-6 py-2 rounded-lg text-[10px] font-medium transition-all ${activeFile === "src/App.tsx" ? "bg-indigo-500/20 text-indigo-400" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                        <Code className="w-3.5 h-3.5" /> App.tsx
                      </button>
                      <button onClick={() => { setActiveFile("metadata.json"); setShowPreview(false); }}
                        className={`w-full flex items-center gap-3 px-6 py-2 rounded-lg text-[10px] font-medium transition-all ${activeFile === "metadata.json" ? "bg-indigo-500/20 text-indigo-400" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
                        <FileJson className="w-3.5 h-3.5" /> metadata.json
                      </button>
                    </div>
                  </div>
                )}

                {activeSideTab === "chat" && (
                  <div className="h-full flex flex-col p-4">
                    <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-2">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          <div className={`max-w-[90%] p-4 rounded-2xl text-[11px] leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white/5 border border-white/10 text-white/70"}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isRefining && (
                        <div className="flex items-center gap-3 text-white/30 italic text-[10px]">
                          <Loader2 className="w-3 h-3 animate-spin" /> Building...
                        </div>
                      )}
                    </div>
                    <div className="relative group">
                      <input type="text" value={refineInput}
                        onChange={(e) => setRefineInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                        placeholder="App feedback..."
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[11px] outline-none group-focus-within:border-indigo-500/50 transition-all font-medium"
                      />
                      <button onClick={() => handleRefine()}
                        className="absolute right-2 top-2 w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-400 transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {activeSideTab === "history" && (
                  <div className="px-4 space-y-4">
                    {suggestion.history?.map((v, i) => (
                      <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3 hover:border-indigo-500/30 transition-all">
                        <div className="flex justify-between items-center text-[8px] font-black text-white/30 uppercase tracking-widest">
                          <span>GEN_{suggestion.history!.length - i}</span>
                          <span>{new Date(v.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[10px] text-white/60 line-clamp-2 italic">"{v.prompt || "Manual Edit"}"</p>
                        <button onClick={() => setCode(v.code)}
                          className="w-full py-2 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
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

        {/* MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* EDITOR */}
          <div className={`flex flex-col bg-[#050508] transition-all duration-700 ${showPreview ? "w-0 md:w-[35%] opacity-0 md:opacity-100 hidden md:flex" : "flex-1 opacity-100"}`}>
            <div className="h-12 border-b border-white/5 flex items-center gap-px bg-black/20 shrink-0">
              <div className="h-full px-6 flex items-center gap-3 bg-white/5 border-r border-white/5">
                <Code className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-[3px] text-indigo-100">{activeFile}</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              {activeFile === "src/App.tsx" ? (
                <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
                  className="w-full h-full bg-transparent p-4 font-mono text-[13px] text-indigo-100/70 outline-none resize-none leading-relaxed" />
              ) : (
                <div className="p-10 font-mono text-[12px] text-white/40 uppercase tracking-[4px] leading-relaxed">
                  <FileJson className="w-10 h-10 mb-6 opacity-20" />
                  {JSON.stringify({ id: suggestion.id, status: suggestion.status, created_at: suggestion.created_at, content: suggestion.content }, null, 2)}
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW */}
          <div className={`flex flex-col bg-[#020205] transition-all duration-500 ${showPreview ? "flex-1" : "w-0 opacity-0 overflow-hidden hidden md:flex"}`}>
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 shrink-0">
              <div className="flex items-center gap-4">
                <Monitor className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px] font-black uppercase tracking-[4px] text-white/60">Live Preview</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[4px] text-white/30">{deviceFrame.toUpperCase()} MODE</span>
              </div>
            </div>
            <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden p-2 sm:p-4 lg:p-6">
              <div className={`relative transition-all duration-700 ${
                deviceFrame === "phone"
                  ? "w-full max-w-[380px] aspect-[9/19] max-h-full rounded-[2.5rem] sm:rounded-[3.5rem] border-[10px] sm:border-[14px] border-white/10 shadow-[0_60px_120px_rgba(0,0,0,0.6)] bg-black overflow-hidden"
                  : "w-full h-full rounded-2xl lg:rounded-[3rem] border border-white/10 bg-black shadow-[0_40px_80px_rgba(0,0,0,0.4)]"
              }`}>
                {deviceFrame === "phone" && (
                  <div className="absolute top-0 left-0 w-full h-8 sm:h-10 flex items-center justify-between px-8 sm:px-10 z-10 pointer-events-none">
                    <div className="text-[9px] sm:text-[11px] font-black text-white/40 font-mono tracking-tighter">9:41</div>
                    <div className="flex gap-1.5 items-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                      </div>
                      <div className="w-5 h-2.5 rounded-[2px] border border-white/20 relative">
                        <div className="absolute top-0.5 left-0.5 bottom-0.5 right-1 bg-white/40 rounded-[1px]" />
                      </div>
                    </div>
                  </div>
                )}
                <iframe ref={iframeRef} srcDoc={srcDoc}
                  className="w-full h-full border-none bg-black" title="app-player"
                  sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                />
                {deviceFrame === "phone" && (
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
            <div className="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => { if (iframeRef.current) iframeRef.current.srcdoc = srcDoc; }}
                className="p-4 bg-white/5 hover:bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl transition-all text-white/40 hover:text-white shadow-2xl hover:scale-110 active:scale-90"
                title="Reload"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <AnimatePresence>
              {lastError && onRefine && !isRefining && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-16 left-0 right-0 flex justify-center z-20"
                >
                  <button
                    onClick={() => handleRefine(`[AUTO-FIX] Build error: ${lastError} — fix the code so it renders correctly without errors`)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold text-white shadow-xl transition-all active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    Fix with AI
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute bottom-4 left-4 text-[8px] font-mono text-white/10 max-w-[200px] truncate">{runtimeStatus}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
