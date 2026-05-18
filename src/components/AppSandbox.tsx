
import { useMemo } from "react";

interface AppSandboxProps {
  code: string;
  appType?: 'phone' | 'desktop' | 'game' | 'terminal';
  className?: string;
  onLog?: (msg: string) => void;
  onError?: (msg: string, stack?: string) => void;
}

export function AppSandbox({ code, className = "" }: AppSandboxProps) {
  const cleanCode = useMemo(() => {
    if (!code) return "";
    let p = code;
    p = p.replace(/import\s+[\s\S]*?from\s+(["'])(?:react|lucide-react|framer-motion|motion\/react|recharts|d3|three|@react-three\/fiber|@react-three\/drei|react-markdown|tone|openai|canvas-confetti|clsx|tailwind-merge|@google\/generative-ai).*?\1;?/g, '');
    p = p.replace(/import\s+(['"]).*?\1;?/g, '');
    p = p.replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/g, 'window.__BUILT_APP__ = function $1');
    p = p.replace(/export\s+default\s+function\s*\(/g, 'window.__BUILT_APP__ = function (');
    p = p.replace(/export\s+default\s+\(([^)]*)\)\s*=>/g, 'window.__BUILT_APP__ = ($1) =>');
    p = p.replace(/export\s+default\s+class\s+([a-zA-Z0-9_$]+)/g, 'window.__BUILT_APP__ = class $1');
    p = p.replace(/export\s+default\s+([a-zA-Z0-9_$]+);?\s*$/gm, 'window.__BUILT_APP__ = $1;');
    p = p.replace(/export\s+default\s+/g, 'window.__BUILT_APP__ = ');
    p = p.replace(/\bexport\s+/g, '');
    p = p.replace(/^import\b.+$/gm, '');
    return p.trim();
  }, [code]);

  const srcDoc = useMemo(() => {
    // Escape backticks and </script> so they're safe inside template literal and HTML script tag
    const safeCode = JSON.stringify(cleanCode)
      .replace(/`/g, '\\u0060')
      .replace(/<\//g, '<\\/');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>
body{background:#050508;color:#fff;margin:0;min-height:100vh;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:auto}
#root{flex:1;display:flex;flex-direction:column}
.err{padding:16px;color:#ef4444;font-family:monospace;font-size:11px;word-break:break-all;white-space:pre-wrap;background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.15);border-radius:10px;margin:12px}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:10px}
</style>
</head>
<body>
<div id="root"></div>
<script>
(function(){
  var root=document.getElementById('root');
  function showErr(msg,stack){
    root.innerHTML='<div class="err"><b>Error:</b> '+msg+(stack?'<br><pre style="font-size:9px;opacity:.5;margin-top:8px;overflow:auto;max-height:120px">'+stack+'</pre>':'')+'<\/div>';
    window.parent&&window.parent.postMessage({type:'EVO_ERROR',msg:msg},'*');
  }
  window.onerror=function(m,u,l,c,e){showErr(String(m),e&&e.stack);return true;};

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
    s.onerror=function(){showErr('CDN failed to load: '+SCRIPTS[idx-1]);};
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

      // React hooks as globals
      ['useState','useEffect','useMemo','useRef','useCallback','createContext','useContext',
       'useReducer','useLayoutEffect','forwardRef','Fragment','memo','Children','cloneElement'].forEach(function(h){
        if(R[h]!==undefined)window[h]=R[h];
      });
      // Lucide icons as globals
      Object.keys(IC).forEach(function(k){if(k!=='default')window[k]=IC[k];});
      // Recharts components as globals
      Object.keys(RC).forEach(function(k){if(/^[A-Z]/.test(k))window[k]=RC[k];});

      // Motion stub: renders without animations so content is still visible
      var motionObj={};
      ['div','span','p','h1','h2','h3','h4','h5','h6','ul','ol','li','a','button','img',
       'input','textarea','section','article','header','footer','nav','main','aside'].forEach(function(t){motionObj[t]=mkEl(t);});
      try{window.motion=new Proxy(motionObj,{get:function(o,k){return o[k]||mkEl(String(k));}});}
      catch(e){window.motion=motionObj;}
      window.AnimatePresence=function(p){return p&&p.children||null;};
      var FM={motion:window.motion,AnimatePresence:window.AnimatePresence,LayoutGroup:R.Fragment};
      window.FramerMotion=FM;

      window.require=function(m){
        var map={
          react:R,'react-dom':RD,'react-dom/client':RD,
          'lucide-react':IC,recharts:RC,
          'framer-motion':FM,'motion/react':FM
        };
        return map[m]||window[m]||{};
      };

      var code=${safeCode};
      if(!code||code.length<5){
        root.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;opacity:.15;text-transform:uppercase;letter-spacing:8px;font-size:10px;font-weight:900;">Awaiting Build<\/div>';
        return;
      }

      // Build scope prefix: React hooks + icons/recharts actually used in the code
      var hooks='useState,useEffect,useMemo,useRef,useCallback,createContext,useContext,useReducer,useLayoutEffect,forwardRef,Fragment,memo';
      var usedIC=Object.keys(IC).filter(function(k){return k!=='default'&&/^[a-zA-Z0-9_$]+$/.test(k)&&code.indexOf(k)!==-1;});
      var usedRC=Object.keys(RC).filter(function(k){return /^[A-Z][a-zA-Z0-9_$]*$/.test(k)&&code.indexOf(k)!==-1;});
      var scope='var React=window.React,ReactDOM=window.ReactDOM,motion=window.motion,AnimatePresence=window.AnimatePresence;\n'+
                'var {'+hooks+'}=window.React;\n';
      if(usedIC.length)scope+='var {'+usedIC.join(',')+'}=window.lucideReact||{};\n';
      if(usedRC.length)scope+='var {'+usedRC.join(',')+'}=window.Recharts||{};\n';

      var out;
      try{out=Babel.transform(scope+code,{presets:['env','react','typescript'],filename:'app.tsx'}).code;}
      catch(e){throw new Error('Transpile error: '+e.message);}
      var el=document.createElement('script');el.text=out;document.body.appendChild(el);

      setTimeout(function(){
        var App=window.__BUILT_APP__||window.App||window.Main||window.BuiltApp;
        if(!App){
          var found=Object.keys(window).find(function(k){
            return /^[A-Z]/.test(k)&&typeof window[k]==='function'&&
              !['React','ReactDOM','Babel','Recharts','FramerMotion'].includes(k)&&!IC[k];
          });
          if(found)App=window[found];
        }
        if(App){
          try{RD.createRoot(root).render(R.createElement(App));}
          catch(e){showErr('Render error: '+e.message,e.stack);}
        }else{
          showErr("No App component found. Make sure code exports a default function App().");
        }
      },50);
    }catch(e){showErr(e.message,e.stack);}
  }

  loadNext();
})();
<\/script>
</body>
</html>`;
  }, [cleanCode]);

  return (
    <iframe
      srcDoc={srcDoc}
      className={`w-full h-full border-none bg-black ${className}`}
      title="app-sandbox"
      sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
    />
  );
}
