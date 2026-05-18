
import { useMemo } from "react";

interface AppSandboxProps {
  code: string;
  appType?: 'phone' | 'desktop' | 'game' | 'terminal';
  className?: string;
  onLog?: (msg: string) => void;
  onError?: (msg: string, stack?: string) => void;
}

function sanitizeCode(code: string): string {
  return code
    .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+default\s+function\s+\w*/gm, 'function App')
    .replace(/^export\s+default\s+class\s+\w*/gm, 'class App')
    .replace(/^export\s+default\s+/gm, 'const App = ')
    .replace(/^export\s+/gm, '')
    .trim();
}

export function AppSandbox({ code, className = "" }: AppSandboxProps) {
  const cleanCode = useMemo(() => sanitizeCode(code || ""), [code]);

  const srcDoc = useMemo(() => {
    if (!cleanCode) {
      return `<!DOCTYPE html><html><body style="background:#050508;display:flex;align-items:center;justify-content:center;height:100vh;color:rgba(255,255,255,.15);font:900 10px/1 sans-serif;text-transform:uppercase;letter-spacing:8px">Awaiting Build</body></html>`;
    }

    // encodeURIComponent produces only safe chars (%XX) — no < > " \ ` that break script tags
    const encoded = encodeURIComponent(cleanCode);

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
    root.innerHTML='<div class="err"><b>Error:</b> '+String(msg)+(stack?'<br><pre style="font-size:9px;opacity:.5;margin-top:8px;overflow:auto;max-height:120px">'+String(stack)+'<\/pre>':'')+'<\/div>';
    try{window.parent&&window.parent.postMessage({type:'EVO_ERROR',msg:String(msg)},'*');}catch(x){}
  }
  window.onerror=function(m,u,l,c,e){showErr(m,e&&e.stack);return true;};
  window.onunhandledrejection=function(e){showErr(e.reason&&e.reason.message||String(e.reason));};

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

  function runApp(){
    try{
      var R=window.React,RD=window.ReactDOM;
      var IC=window.lucideReact||window.LucideReact||{};
      var RC=window.Recharts||{};

      ['useState','useEffect','useMemo','useRef','useCallback','createContext','useContext',
       'useReducer','useLayoutEffect','forwardRef','Fragment','memo','Children','cloneElement'].forEach(function(h){
        if(R[h]!==undefined)window[h]=R[h];
      });
      Object.keys(IC).forEach(function(k){if(k!=='default')window[k]=IC[k];});
      Object.keys(RC).forEach(function(k){if(/^[A-Z]/.test(k))window[k]=RC[k];});

      var mkEl=function(tag){return function(p){p=p||{};return R.createElement(tag,{className:p.className,style:p.style,id:p.id,onClick:p.onClick,onChange:p.onChange},p.children);};};
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

      // Decode safely — encodeURIComponent has no chars that break HTML or JS
      var appCode=decodeURIComponent("${encoded}");

      // Inject as type="text/babel" and let Babel transform it
      var babelScript=document.createElement('script');
      babelScript.type='text/babel';
      babelScript.setAttribute('data-presets','env,react,typescript');
      babelScript.textContent=appCode+'\\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));';
      document.body.appendChild(babelScript);

      // Babel.transform the script tag and execute (public API in standalone)
      try{
        var src=babelScript.textContent;
        var out=Babel.transform(src,{presets:['env','react','typescript'],filename:'app.tsx'}).code;
        var execScript=document.createElement('script');
        execScript.textContent=out;
        document.body.appendChild(execScript);
      }catch(transpileErr){
        showErr('Transpile error: '+transpileErr.message,transpileErr.stack);
      }

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
      sandbox="allow-scripts allow-modals allow-forms allow-popups"
    />
  );
}
