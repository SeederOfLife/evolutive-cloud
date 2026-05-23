
import { useMemo } from "react";

interface AppSandboxProps {
  code: string;
  appType?: 'phone' | 'desktop' | 'game' | 'terminal' | 'music' | 'art';
  className?: string;
  onLog?: (msg: string) => void;
  onError?: (msg: string, stack?: string) => void;
}

function sanitizeCode(code: string): string {
  return code
    // Remove all import statements (only lines that start with the word import)
    .replace(/^import\b.*$/gm, '')
    // export default function/class → rename to App
    .replace(/^export\s+default\s+function\s*\w*/gm, 'function App')
    .replace(/^export\s+default\s+class\s*\w*/gm, 'class App')
    // export default SomeName; → alias unless already App (avoids "const App = App")
    .replace(/^export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/gm,
      (_, name) => name === 'App' ? '' : `const App = ${name};`)
    // export default <expression> → const App = <expression>
    .replace(/^export\s+default\s+/gm, 'const App = ')
    // strip remaining export keywords
    .replace(/^export\s+/gm, '')
    .trim();
}

export function AppSandbox({ code, className = "" }: AppSandboxProps) {
  const cleanCode = useMemo(() => sanitizeCode(code || ""), [code]);

  const srcDoc = useMemo(() => {
    if (!cleanCode) {
      return `<!DOCTYPE html><html><body style="background:#050508;display:flex;align-items:center;justify-content:center;height:100vh;color:rgba(255,255,255,.15);font:900 10px/1 sans-serif;text-transform:uppercase;letter-spacing:8px">Awaiting Build</body></html>`;
    }

    // Inject render call after the App function's last closing brace.
    // Appending to raw end risks landing inside the function body if AI adds trailing content.
    const lastBrace = cleanCode.lastIndexOf('}');
    const codeWithRender = lastBrace >= 0
      ? cleanCode.slice(0, lastBrace + 1) + '\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));'
      : cleanCode + '\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));';
    const encoded = encodeURIComponent(codeWithRender);

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

  function ld(src,cb,eCb){
    var s=document.createElement('script');
    s.src=src;s.crossOrigin='anonymous';
    s.onload=cb;
    s.onerror=eCb||function(){showErr('CDN failed: '+src);};
    document.head.appendChild(s);
  }
  function loadChain(){
    function runPhaser(){
      ld('https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js',function(){
        ld('https://unpkg.com/@babel/standalone@7.23.0/babel.min.js',runApp);
      },function(){
        ld('https://unpkg.com/@babel/standalone@7.23.0/babel.min.js',runApp);
      });
    }
    function runFM(){
      ld('https://cdn.jsdelivr.net/npm/framer-motion@10.16.4/dist/framer-motion.js',function(){
        window.motion=window.Motion&&window.Motion.motion;
        window.AnimatePresence=window.Motion&&window.Motion.AnimatePresence;
        runPhaser();
      },function(){
        runPhaser();
      });
    }
    ld('https://unpkg.com/react@18.2.0/umd/react.development.js',function(){
      window.LucideReact={};
      ['Activity','AlertCircle','ArrowLeft','ArrowRight','Check','ChevronDown','ChevronUp','ChevronLeft','ChevronRight','Circle','Clock','Code','Copy','Database','Delete','Edit','Eye','File','Filter','Globe','Heart','Home','Info','Key','Layers','Lock','LogOut','Menu','MessageCircle','Moon','Music','Play','Plus','Power','RefreshCw','Search','Settings','Share','Shield','Star','Sun','Trash','Trash2','Upload','User','Users','X','Zap','Sparkles','Terminal','Monitor','Phone','Cpu','Cloud','Wifi','Bell','Camera','Download','Send','Save','Loader2'].forEach(function(name){
        var c=function(p){p=p||{};return React.createElement('svg',{width:p.size||16,height:p.size||16,viewBox:'0 0 24 24',fill:'none',stroke:p.color||'currentColor',strokeWidth:2,className:p.className||''});};
        window.LucideReact[name]=c;window[name]=c;
      });
      ld('https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js',function(){
        window.Recharts={
          LineChart:function(p){return React.createElement('div',{style:{width:'100%',height:'100%'}},p&&p.children);},
          BarChart:function(p){return React.createElement('div',{style:{width:'100%',height:'100%'}},p&&p.children);},
          AreaChart:function(p){return React.createElement('div',{style:{width:'100%',height:'100%'}},p&&p.children);},
          PieChart:function(p){return React.createElement('div',{style:{width:'100%',height:'100%'}},p&&p.children);},
          ResponsiveContainer:function(p){return React.createElement('div',{style:{width:'100%',height:'100%'}},p&&p.children);},
          XAxis:function(){return null;},YAxis:function(){return null;},CartesianGrid:function(){return null;},
          Tooltip:function(){return null;},Legend:function(){return null;},Line:function(){return null;},
          Bar:function(){return null;},Area:function(){return null;},Pie:function(){return null;},Cell:function(){return null;}
        };
        Object.assign(window,window.Recharts);
        runFM();
      });
    });
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
      if(window.LucideReact)Object.assign(window,window.LucideReact);

      var mkEl=function(tag){return function(p){p=p||{};return R.createElement(tag,{className:p.className,style:p.style,id:p.id,onClick:p.onClick,onChange:p.onChange},p.children);};};
      if(!window.motion){
        var motionObj={};
        ['div','span','p','h1','h2','h3','h4','h5','h6','ul','ol','li','a','button','img',
         'input','textarea','section','article','header','footer','nav','main','aside'].forEach(function(t){motionObj[t]=mkEl(t);});
        try{window.motion=new Proxy(motionObj,{get:function(o,k){return o[k]||mkEl(String(k));}});}
        catch(e){window.motion=motionObj;}
      }
      if(!window.AnimatePresence)window.AnimatePresence=function(p){return p&&p.children||null;};
      var FM=window.Motion||{motion:window.motion,AnimatePresence:window.AnimatePresence,LayoutGroup:R.Fragment};
      FM.LayoutGroup=FM.LayoutGroup||R.Fragment;
      window.FramerMotion=FM;
      window.require=function(m){
        var map={react:R,'react-dom':RD,'react-dom/client':RD,'lucide-react':IC,recharts:RC,'framer-motion':FM,'motion/react':FM};
        return map[m]||window[m]||{};
      };

      var mountCode=decodeURIComponent("${encoded}");

      var out;
      try{
        out=Babel.transform(mountCode,{presets:['env','react','typescript'],filename:'app.tsx'}).code;
      }catch(transpileErr){
        showErr('Transpile: '+transpileErr.message,transpileErr.stack);
        return;
      }

      // Run via Function() so errors are synchronous and caught below
      try{
        (new Function(out))();
      }catch(runErr){
        showErr('Runtime: '+runErr.message,runErr.stack);
      }

    }catch(e){showErr(e.message,e.stack);}
  }

  loadChain();
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
      sandbox="allow-scripts"
    />
  );
}
