import { useEffect, type RefObject } from 'react';

// Permissions Policy delegation — without this the iframe can't even ask.
export const IFRAME_ALLOW =
  'camera; microphone; geolocation; accelerometer; gyroscope; magnetometer; fullscreen; clipboard-write; gamepad; autoplay; screen-wake-lock';

const MAX_STORE_BYTES = 200_000;

// Injected into the sandbox srcdoc BEFORE app code. The iframe has an opaque
// origin (sandbox="allow-scripts" only): no localStorage, and Chrome auto-denies
// getUserMedia because permissions can't attach to an opaque origin. Both are
// bridged to the parent via postMessage instead — the parent owns the real
// origin, shows the permission prompt, and transfers live MediaStreamTracks in.
// Plain ES5, single quotes only, and no '</script>' sequence.
export const CAPABILITY_SNIPPET = `
(function(){
  var store=null,waiters=[],mseq=0,mwait={};
  window.addEventListener('message',function(e){
    var d=e.data||{};
    if(d.type==='EVO_STORE_DATA'&&store===null){store=d.data||{};waiters.forEach(function(r){r(store);});waiters=[];}
    if(d.type==='EVO_MEDIA_RESULT'&&mwait[d.id]){
      var w=mwait[d.id];delete mwait[d.id];
      if(d.error){w.rej(new Error(d.error));}
      else{try{w.res(new MediaStream(d.tracks||[]));}catch(err){w.rej(err);}}
    }
  });
  window.AppStorage={
    load:function(){
      if(store!==null)return Promise.resolve(store);
      return new Promise(function(r){
        waiters.push(r);
        setTimeout(function(){if(store===null){store={};waiters.forEach(function(w){w(store);});waiters=[];}},3000);
      });
    },
    save:function(data){
      store=data||{};
      try{parent.postMessage({type:'EVO_STORE_SET',data:JSON.parse(JSON.stringify(store))},'*');}catch(e){}
    }
  };
  try{parent.postMessage({type:'EVO_STORE_GET'},'*');}catch(e){}
  function bridgeGUM(c){
    return new Promise(function(res,rej){
      var id=++mseq;mwait[id]={res:res,rej:rej};
      parent.postMessage({type:'EVO_MEDIA_REQUEST',id:id,constraints:c||{video:true}},'*');
      setTimeout(function(){if(mwait[id]){mwait[id].rej(new Error('Camera/mic request timed out'));delete mwait[id];}},30000);
    });
  }
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
    var native=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=function(c){
      return native(c).catch(function(err){
        if(err&&(err.name==='NotAllowedError'||err.name==='SecurityError'))return bridgeGUM(c);
        throw err;
      });
    };
  }
})();
`.trim();

// Parent-side handler: answers storage and media requests coming from ONE
// specific iframe (matched by e.source, so multiple sandboxes can coexist).
export function useSandboxCapabilities(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  appId?: string,
) {
  useEffect(() => {
    const storeKey = `evo_app_store_${appId ?? 'anon'}`;
    const onMsg = async (e: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || e.source !== iframe.contentWindow) return;
      const d: any = e.data || {};
      const win = iframe.contentWindow;
      if (d.type === 'EVO_STORE_GET') {
        let data = {};
        try { data = JSON.parse(localStorage.getItem(storeKey) ?? '{}'); } catch { /* corrupt entry */ }
        win?.postMessage({ type: 'EVO_STORE_DATA', data }, '*');
      } else if (d.type === 'EVO_STORE_SET') {
        try {
          const s = JSON.stringify(d.data ?? {});
          if (s.length <= MAX_STORE_BYTES) localStorage.setItem(storeKey, s);
        } catch { /* quota exceeded */ }
      } else if (d.type === 'EVO_MEDIA_REQUEST') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(d.constraints ?? { video: true });
          const tracks = stream.getTracks();
          try {
            win?.postMessage({ type: 'EVO_MEDIA_RESULT', id: d.id, tracks }, '*', tracks as unknown as Transferable[]);
          } catch {
            // Browser can't transfer MediaStreamTrack (Firefox/Safari)
            tracks.forEach(t => t.stop());
            win?.postMessage({ type: 'EVO_MEDIA_RESULT', id: d.id, error: 'Live camera/mic not supported in this browser sandbox' }, '*');
          }
        } catch (err: any) {
          win?.postMessage({ type: 'EVO_MEDIA_RESULT', id: d.id, error: err?.message || 'Permission denied' }, '*');
        }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [iframeRef, appId]);
}
