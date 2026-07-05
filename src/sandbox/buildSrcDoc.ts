import { isCodeBalanced, findAppFunctionEnd } from "../utils/sandboxUtils";
import { CAPABILITY_SNIPPET } from "./capabilityBridge";

export function buildSrcDoc(cleanCode: string): string {
  if (!cleanCode) {
    return `<!DOCTYPE html><html><body style="background:#050508;display:flex;align-items:center;justify-content:center;height:100vh;color:rgba(255,255,255,.2);font:900 11px/1 sans-serif;text-transform:uppercase;letter-spacing:10px">Awaiting Manifestation</body></html>`;
  }

  if (!isCodeBalanced(cleanCode)) {
    const msg = "Generated code was incomplete (likely truncated by rate limit). Click Fix with AI to retry.";
    return `<!DOCTYPE html><html><body style="background:#050508;display:flex;align-items:center;justify-content:center;height:100vh;padding:24px;box-sizing:border-box"><div style="max-width:360px;text-align:center;color:rgba(239,68,68,.9);font:700 13px/1.6 system-ui">${msg}</div></body></html>`;
  }

  const insertPoint = findAppFunctionEnd(cleanCode);
  const codeWithRender = cleanCode.slice(0, insertPoint)
    + '\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));'
    + cleanCode.slice(insertPoint);
  const encoded = encodeURIComponent(codeWithRender);

  return `<!DOCTYPE html>
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
<script>${CAPABILITY_SNIPPET}<\/script>
<script>
(function(){
  var root=document.getElementById('root');
  function showErr(msg,stack){
    try{window.parent&&window.parent.postMessage({type:'EVO_ERROR',msg:String(msg),stack:stack},'*');}catch(x){}
    root.innerHTML='<div class="err"><div style="font-weight:800;letter-spacing:2px;margin-bottom:8px;color:#f87171;">BUILD FAILURE<\/div>'+String(msg)+(stack?'<br><pre style="font-size:10px;opacity:.5;margin-top:8px;overflow:auto;max-height:180px">'+String(stack)+'<\/pre>':'')+'<\/div>';
  }
  window.onerror=function(m,u,l,c,e){showErr(m,e&&e.stack);return true;};
  window.onunhandledrejection=function(e){showErr(e.reason&&e.reason.message||String(e.reason));};
  var _log=console.log;
  console.log=function(){
    _log.apply(console,arguments);
    try{window.parent&&window.parent.postMessage({type:'EVO_LOG',content:Array.from(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a):String(a);}).join(' ')},'*');}catch(x){}
  };

  function ld(src,cb,eCb){
    var s=document.createElement('script');
    s.src=src;s.crossOrigin='anonymous';
    s.onload=cb;
    s.onerror=eCb||function(){showErr('CDN failed: '+src);};
    document.head.appendChild(s);
  }
  function loadChain(){
    function runFM(){
      ld('https://cdn.jsdelivr.net/npm/framer-motion@10.16.4/dist/framer-motion.js',function(){
        window.motion=window.Motion&&window.Motion.motion;
        window.AnimatePresence=window.Motion&&window.Motion.AnimatePresence;
        ld('https://unpkg.com/@babel/standalone@7.23.0/babel.min.js',runApp);
      },function(){
        ld('https://unpkg.com/@babel/standalone@7.23.0/babel.min.js',runApp);
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
      var _fb=function(p){p=p||{};return R.createElement('svg',{width:p.size||16,height:p.size||16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,className:p.className||''});};

      ['useState','useEffect','useMemo','useRef','useCallback','createContext','useContext',
       'useReducer','useLayoutEffect','forwardRef','Fragment','memo','Children','cloneElement'].forEach(function(h){
        if(R[h]!==undefined)window[h]=R[h];
      });
      Object.keys(IC).forEach(function(k){if(k!=='default')window[k]=IC[k];});
      Object.keys(RC).forEach(function(k){if(/^[A-Z]/.test(k))window[k]=RC[k];});
      if(window.LucideReact)Object.assign(window,window.LucideReact);
      window.lucide=IC;
      window.h=R.createElement;

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
        console.log('Transpile OK');
      }catch(transpileErr){
        showErr('Transpile: '+transpileErr.message,transpileErr.stack);
        return;
      }

      try{
        (new Function(out))();
        console.log('Manifestation complete.');
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
}
