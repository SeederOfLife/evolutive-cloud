
import { useEffect, useMemo, useRef } from "react";
import { CAPABILITY_SNIPPET, IFRAME_ALLOW, useSandboxCapabilities } from "../sandbox/capabilityBridge";

interface AppSandboxProps {
  code: string;
  appType?: 'phone' | 'desktop' | 'game' | 'terminal' | 'music' | 'art';
  appId?: string;
  className?: string;
  onLog?: (msg: string) => void;
  onError?: (msg: string, stack?: string) => void;
}

function sanitizeCode(code: string): string {
  return code
    // Remove only real ES module import statements:
    // must have 'import' as first non-whitespace word AND match the ES module import shape.
    // Avoids false positives on const declarations, JSX, or template literal content
    // that happens to contain the word "import".
    .replace(/^\s*import\b[^;]*?(?:from\s+['"][^'"]+['"])?\s*;?\s*$/gm, '')
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

function isCodeBalanced(code: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
  const closing = new Set([')', '}', ']']);
  for (const ch of code) {
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (closing.has(ch) && stack.pop() !== ch) return false;
  }
  return stack.length === 0;
}

function findAppFunctionEnd(code: string): number {
  const appMatch = code.match(/(?:const|function)\s+App\s*[=(]/);
  if (!appMatch || appMatch.index === undefined) return code.length;
  let i = code.indexOf('{', appMatch.index);
  if (i < 0) return code.length;
  let depth = 1;
  i++;
  while (i < code.length && depth > 0) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') depth--;
    i++;
  }
  return i;
}

export function AppSandbox({ code, appId, className = "", onError }: AppSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useSandboxCapabilities(iframeRef, appId);
  const cleanCode = useMemo(() => sanitizeCode(code || ""), [code]);
  const isBalanced = useMemo(() => !cleanCode || isCodeBalanced(cleanCode), [cleanCode]);

  useEffect(() => {
    if (cleanCode && !isBalanced) {
      onError?.("Generated code was incomplete (likely truncated by rate limit). Click Fix with AI to retry.");
    }
  }, [cleanCode, isBalanced]); // eslint-disable-line react-hooks/exhaustive-deps

  const srcDoc = useMemo(() => {
    if (!cleanCode) {
      return `<!DOCTYPE html><html><body style="background:#050508;display:flex;align-items:center;justify-content:center;height:100vh;color:rgba(255,255,255,.15);font:900 10px/1 sans-serif;text-transform:uppercase;letter-spacing:8px">Awaiting Build</body></html>`;
    }

    if (!isBalanced) {
      const msg = "Generated code was incomplete (likely truncated by rate limit). Click Fix with AI to retry.";
      return `<!DOCTYPE html><html><body style="background:#050508;display:flex;align-items:center;justify-content:center;height:100vh;padding:24px;box-sizing:border-box"><div style="max-width:360px;text-align:center;color:rgba(239,68,68,.9);font:700 13px/1.6 system-ui">${msg}</div></body></html>`;
    }

    const insertPoint = findAppFunctionEnd(cleanCode);
    const codeWithRender = cleanCode.slice(0, insertPoint) + '\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));' + cleanCode.slice(insertPoint);
    const encoded = encodeURIComponent(codeWithRender);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>
body{background:#050508;color:#fff;margin:0;min-height:100vh;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow-y:auto;-webkit-overflow-scrolling:touch;}
#root{flex:1;display:flex;flex-direction:column}
.err{padding:16px;color:#ef4444;font-family:monospace;font-size:11px;word-break:break-all;white-space:pre-wrap;background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.15);border-radius:10px;margin:12px}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:10px}
</style>
</head>
<body>
<div id="root"></div>
<script>${CAPABILITY_SNIPPET}<\/script>
<script>
(function(){
  var root=document.getElementById('root');
  function showErr(msg,stack){
    // Self-heal: 'Grid3X3 is not defined' (unknown icon/component in any usage,
    // even async render) -> stub it as an empty icon and re-run the app.
    var m=/([A-Za-z_$][\\w$]*) is not defined/.exec(String(msg));
    if(m&&/^[A-Z]/.test(m[1])&&window.__fb&&window.__rerun&&(window.__stubbed=(window.__stubbed||0)+1)<=8){
      window[m[1]]=window.__fb;window.__rerun();return;
    }
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
      var _ic=function(p){p=p||{};return React.createElement('svg',{width:p.size||16,height:p.size||16,viewBox:'0 0 24 24',fill:'none',stroke:p.color||'currentColor',strokeWidth:p.strokeWidth||2,className:p.className||''});};
      ['Activity','AlertCircle','AlertTriangle','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ArrowUpDown','Award','Bell','Bookmark','BookOpen','Brush','Camera','Check','CheckCircle','CheckSquare','ChevronDown','ChevronUp','ChevronLeft','ChevronRight','Circle','Clock','Cloud','Code','Code2','Columns','Compass','Copy','CreditCard','Crown','Cpu','Database','Delete','Download','Edit','Eraser','ExternalLink','Eye','EyeOff','FastForward','File','FileText','Filter','Flag','Flame','FlipHorizontal2','Folder','FolderOpen','Globe','GripHorizontal','GripVertical','Hash','Headphones','Heart','Home','HelpCircle','Hourglass','Image','Info','Key','Layers','Layout','Link','List','Loader2','Lock','LogOut','Maximize','Maximize2','Medal','Menu','MessageCircle','MessageSquare','Mic','Mic2','Minimize','Minimize2','Minus','Monitor','Moon','Music','Music2','Package','Palette','Pause','Phone','Play','Plus','Power','QrCode','RefreshCcw','RefreshCw','Repeat','RotateCcw','RotateCw','Save','Search','Send','Settings','Share','Share2','Shield','Shuffle','SkipBack','SkipForward','Speaker','Square','Sparkles','Star','Sun','Table','Tag','Target','Terminal','Timer','ToggleLeft','ToggleRight','Trash','Trash2','TrendingDown','TrendingUp','Trophy','Upload','User','Users','Video','Volume1','Volume2','VolumeX','Wand2','Wifi','X','XCircle','Zap','ZoomIn','ZoomOut'].forEach(function(name){
        window.LucideReact[name]=_ic;window[name]=_ic;
      });
      // Catch-all: any icon name the AI uses that isn't in the list above → empty SVG (no crash)
      try{
        var _iconProxy=new Proxy(window.LucideReact,{get:function(t,k){return t[k]||_ic;}});
        window.LucideReact=_iconProxy;
      }catch(e){}
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
      var _fb=function(p){p=p||{};return R.createElement('svg',{width:p.size||16,height:p.size||16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,className:p.className||''});};

      ['useState','useEffect','useMemo','useRef','useCallback','createContext','useContext',
       'useReducer','useLayoutEffect','forwardRef','Fragment','memo','Children','cloneElement'].forEach(function(h){
        if(R[h]!==undefined)window[h]=R[h];
      });
      Object.keys(IC).forEach(function(k){if(k!=='default')window[k]=IC[k];});
      Object.keys(RC).forEach(function(k){if(/^[A-Z]/.test(k))window[k]=RC[k];});
      if(window.LucideReact)Object.assign(window,window.LucideReact);
      // Patch React.createElement so undefined/null component types (e.g. missing icons) render as
      // empty spans instead of throwing "React.createElement: type is invalid"
      var _origCE=R.createElement;
      R.createElement=window.React.createElement=function(type,props){
        if(type==null||type===undefined){
          var safe={};if(props){if(props.className)safe.className=props.className;if(props.style)safe.style=props.style;}
          return _origCE('span',safe);
        }
        return _origCE.apply(this,arguments);
      };
      // Make require('lucide-react') return a catch-all proxy so destructured named imports work
      try{
        IC=new Proxy(IC,{get:function(t,k){return t[k]||window[k]||_fb;}});
      }catch(e){}

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
      // Stub any capitalized JSX tag that resolves to nothing (unknown Lucide icon,
      // hallucinated component) as an empty icon — local declarations shadow the stub.
      (mountCode.match(/<([A-Z][A-Za-z0-9_]*)/g)||[]).forEach(function(t){
        var n=t.slice(1);if(window[n]===undefined)window[n]=_fb;
      });

      var out;
      try{
        out=Babel.transform(mountCode,{presets:['env','react','typescript'],filename:'app.tsx'}).code;
      }catch(transpileErr){
        showErr('Transpile: '+transpileErr.message,transpileErr.stack);
        return;
      }

      window.__fb=_fb;
      window.__rerun=function(){
        try{(new Function(out))();}catch(e){showErr('Runtime: '+e.message,e.stack);}
      };
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
  }, [cleanCode, isBalanced]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      className={`w-full h-full border-none bg-black ${className}`}
      title="app-sandbox"
      sandbox="allow-scripts"
      allow={IFRAME_ALLOW}
    />
  );
}
