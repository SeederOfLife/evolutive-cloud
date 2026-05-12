
import React, { useMemo } from "react";

interface AppSandboxProps {
  code: string;
  appType?: 'phone' | 'desktop' | 'game' | 'terminal';
  className?: string;
  onLog?: (msg: string) => void;
  onError?: (msg: string, stack?: string) => void;
}

export function AppSandbox({ code, appType = 'desktop', className = "", onLog, onError }: AppSandboxProps) {
  const cleanCode = useMemo(() => {
    if (!code) return "";
    let processed = code;
    processed = processed.replace(/import\s+[\s\S]*?from\s+(["'])(?:react|lucide-react|framer-motion|motion\/react|recharts|d3|three|@react-three\/fiber|@react-three\/drei|react-markdown|tone|openai|canvas-confetti|clsx|tailwind-merge|@google\/generative-ai).*?\1;?/g, '');
    processed = processed.replace(/import\s+(['"]).*?\1;?/g, '');
    processed = processed.replace(/import\s+\{([^}]+)\}\s+from\s+(["'])(?:react|lucide-react|framer-motion|motion\/react|recharts|d3|three|@react-three\/fiber|@react-three\/drei|react-markdown|tone|openai|canvas-confetti|clsx|tailwind-merge|@google\/generative-ai).*?\2;?/g, '');
    processed = processed.replace(/const\s+\{[\s\S]*?\}\s*=\s*(window\.)?(React|Motion|lucide|Lucide|Recharts|d3|LucideReact);?/g, '');
    processed = processed.replace(/const\s+([a-zA-Z0-9_$]+)\s*=\s*(window\.)?(React|Motion|lucide|Lucide|Recharts|d3|LucideReact)\.([a-zA-Z0-9_$]+);?/g, '');
    processed = processed.replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/g, 'window.__BUILT_APP__ = function $1');
    processed = processed.replace(/export\s+default\s+function\s*\(/g, 'window.__BUILT_APP__ = function (');
    processed = processed.replace(/export\s+default\s+\(([^)]*)\)\s*=>/g, 'window.__BUILT_APP__ = ($1) =>');
    processed = processed.replace(/export\s+default\s+class\s+([a-zA-Z0-9_$]+)/g, 'window.__BUILT_APP__ = class $1');
    processed = processed.replace(/export\s+default\s+class\s*\{/g, 'window.__BUILT_APP__ = class {');
    processed = processed.replace(/export\s+default\s+([a-zA-Z0-9_$]+);?\s*$/gm, 'window.__BUILT_APP__ = $1;');
    processed = processed.replace(/export\s+default\s+/g, 'window.__BUILT_APP__ = ');
    processed = processed.replace(/\bexport\s+/g, '');
    return processed.trim();
  }, [code]);

  const srcDoc = useMemo(() => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script crossorigin="anonymous" src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
        <script crossorigin="anonymous" src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
        <script crossorigin="anonymous" src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.12/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <script crossorigin="anonymous" src="https://unpkg.com/lucide-react@0.453.0/dist/umd/lucide-react.min.js"></script>
        <script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/framer-motion@10.16.4/dist/framer-motion.js"></script>
        <script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/recharts@2.12.7/umd/Recharts.js"></script>
        <script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
        <script crossorigin="anonymous" src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r170/three.min.js"></script>
        <script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/react-markdown@8.0.7/react-markdown.min.js"></script>
        <script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
        <script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/clsx@2.1.1/dist/clsx.min.js"></script>
        <script crossorigin="anonymous" src="https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.js"></script>
        <style>
          body { background: #000; color: white; margin: 0; min-height: 100vh; display: flex; flex-direction: column; overflow: auto; font-family: sans-serif; }
          #root { flex: 1; display: flex; flex-direction: column; }
          #loading { 
            position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; 
            background: #000; z-index: 9999; color: #4f46e5; font-size: 10px; text-transform: uppercase; letter-spacing: 4px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        </style>
      </head>
      <body>
        <div id="loading">Initializing_Neural_Node...</div>
        <div id="root"></div>
        <script>
          (async function() {
            window.process = { env: { NODE_ENV: 'production' } };
            const rootElement = document.getElementById('root');
            const loadingElement = document.getElementById('loading');
            
            window.onerror = (msg, url, line, col, error) => {
              window.parent.postMessage({ type: 'EVO_ERROR', msg, stack: error?.stack }, '*');
              if (loadingElement) loadingElement.innerText = "Execution_Error";
              return false;
            };

            try {
              const start = Date.now();
              while ((!window.Babel || !window.React || !window.ReactDOM || !window.LucideReact) && Date.now() - start < 15000) {
                await new Promise(r => setTimeout(r, 200));
              }

              var { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext, useReducer, useLayoutEffect } = window.React;
              var React = window.React;
              var ReactDOM = window.ReactDOM;
              var Motion = window.motion || window.Motion || window.framerMotion || {};
              var Markdown = window.ReactMarkdown;
              var { clsx } = window;
              var Tone = window.Tone || {};
              
              window.require = (name) => {
                const map = {
                  'react': window.React,
                  'react-dom': window.ReactDOM,
                  'react-dom/client': window.ReactDOM,
                  'lucide-react': window.LucideReact,
                  'framer-motion': Motion,
                  'motion/react': Motion,
                  'recharts': window.Recharts,
                  'd3': window.d3,
                  'three': window.THREE,
                  'react-markdown': window.ReactMarkdown,
                  'canvas-confetti': window.confetti,
                  'clsx': window.clsx,
                  'tailwind-merge': window.tailwindMerge,
                  'tone': window.Tone
                };
                return map[name] || window[name] || {};
              };

              window.motion = Motion.motion || Motion;
              window.AnimatePresence = Motion.AnimatePresence;

              // Expose popular libs to global scope
              window.React = React;
              window.ReactDOM = window.ReactDOM; // Keep it same
              window.THREE = window.THREE;
              window.Markdown = Markdown;
              window.clsx = clsx;
              window.Tone = Tone;
              
              var __internal_Lucide = window.LucideReact || {};
              window.lucide = __internal_Lucide;
              
              // Expose icons globally
              Object.keys(__internal_Lucide).forEach(key => { 
                if (/^[A-Z]/.test(key)) window[key] = __internal_Lucide[key]; 
              });

              if (loadingElement) loadingElement.innerText = "Manifesting_Code...";

              const scriptBody = ${JSON.stringify(cleanCode)};
              const keys = Object.keys(window.React).filter(k => /^[a-zA-Z0-9_$]+$/.test(k));
              const scopePrefix = 'var { ' + keys.join(', ') + ' } = window.React;\n';
              const transpiled = Babel.transform(scopePrefix + scriptBody, { 
                presets: ['env', 'react', 'typescript'],
                filename: 'built-app.tsx'
              }).code;
              
              const scriptNode = document.createElement('script');
              scriptNode.text = transpiled;
              document.body.appendChild(scriptNode);

              await new Promise(r => setTimeout(r, 100));

              // Advanced Component Discovery
              let AppComp = window.__BUILT_APP__ || window.App || window.Main || window.DefaultApp;
              
              if (!AppComp) {
                // Heuristic search for React components in global scope
                const candidates = Object.keys(window).filter(k => 
                  /^[A-Z]/.test(k) && 
                  typeof window[k] === 'function' && 
                  !['React', 'ReactDOM', 'Recharts', 'Motion', 'LucideReact', 'Babel', 'THREE', 'Tone'].includes(k)
                );
                if (candidates.length > 0) AppComp = window[candidates[0]];
              }

              if (AppComp) {
                if (loadingElement) loadingElement.style.display = 'none';
                ReactDOM.createRoot(rootElement).render(React.createElement(AppComp));
              } else {
                if (loadingElement) loadingElement.innerText = "No_Entry_Point_Found";
              }
            } catch (err) {
              console.error(err);
              if (loadingElement) loadingElement.innerText = "Neural_Failure";
            }
          })();
        </script>
      </body>
    </html>
  `;
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
