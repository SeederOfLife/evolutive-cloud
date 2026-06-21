// Mood Tracker + Particle Flow + Vocabulary Flashcards — creative/utility seed apps

export const MOOD_CODE = `
function App() {
  const MOODS = [
    { emoji: '😄', label: 'Great', color: '#22c55e' },
    { emoji: '🙂', label: 'Good',  color: '#84cc16' },
    { emoji: '😐', label: 'Okay',  color: '#f59e0b' },
    { emoji: '😞', label: 'Low',   color: '#f97316' },
    { emoji: '😢', label: 'Bad',   color: '#ef4444' },
  ];
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');

  const log = () => {
    if (!selected) return;
    const entry = { mood: selected, note, time: new Date().toLocaleTimeString() };
    setHistory(h => [entry, ...h].slice(0, 30));
    setSelected(null); setNote('');
  };

  const counts = MOODS.map(m => history.filter(h => h.mood.label === m.label).length);
  const max = Math.max(...counts, 1);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-sm mx-auto">
      <h1 className="text-lg font-black mb-0.5">Daily Mood</h1>
      <p className="text-gray-600 text-xs mb-4">How are you feeling right now?</p>
      <div className="flex justify-between mb-4">
        {MOODS.map(m => (
          <button key={m.label} onClick={() => setSelected(selected && selected.label === m.label ? null : m)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
            style={{ background: selected && selected.label === m.label ? m.color + '33' : 'rgba(255,255,255,0.03)', border: '2px solid ' + (selected && selected.label === m.label ? m.color : 'transparent') }}>
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[9px] text-gray-500 font-medium">{m.label}</span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="mb-4">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note... (optional)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-600 mb-2 focus:outline-none focus:border-indigo-500 text-white" />
          <button onClick={log} className="w-full py-2.5 rounded-xl font-black text-sm text-white hover:opacity-90 transition-all"
            style={{ background: selected.color }}>
            Log {selected.emoji} {selected.label}
          </button>
        </div>
      )}
      {history.length > 0 && (
        <div className="flex items-end gap-2 h-20 bg-gray-900/60 rounded-xl px-3 pt-2 mb-4">
          {MOODS.map((m, i) => (
            <div key={m.label} className="flex flex-col items-center flex-1 gap-1">
              <div className="w-full rounded-t-sm" style={{ height: (counts[i] / max * 56) + 'px', background: m.color + '99', minHeight: counts[i] > 0 ? '4px' : '0px' }} />
              <span className="text-[9px]">{m.emoji}</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2 max-h-52 overflow-y-auto">
        {history.map((h, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-900 rounded-xl px-3 py-2.5">
            <span className="text-xl shrink-0">{h.mood.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold" style={{ color: h.mood.color }}>{h.mood.label}</p>
              {h.note && <p className="text-[10px] text-gray-500 truncate">{h.note}</p>}
            </div>
            <p className="text-[9px] text-gray-600 shrink-0">{h.time}</p>
          </div>
        ))}
      </div>
      {history.length === 0 && !selected && (
        <div className="text-center py-8 text-gray-700">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-sm">Pick a mood above to start logging</p>
        </div>
      )}
    </div>
  );
}
`.trim();

export const PARTICLE_CODE = `
function App() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    let W = c.width = c.offsetWidth, H = c.height = c.offsetHeight;
    const N = 180;
    const mouse = { x: W / 2, y: H / 2 };
    const particles = Array.from({ length: N }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
      life: Math.random() * 100 + 60, maxLife: 160,
      hue: (i / N) * 360, r: Math.random() * 2 + 0.8,
    }));
    let t = 0, raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.01;
      ctx.fillStyle = 'rgba(5,5,20,0.07)';
      ctx.fillRect(0, 0, W, H);
      particles.forEach(p => {
        const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.hypot(dx, dy) + 1;
        p.vx += (dx / dist) * 0.35 + Math.cos(p.x * 0.006 + t) * 0.12;
        p.vy += (dy / dist) * 0.35 + Math.sin(p.y * 0.006 + t) * 0.12;
        p.vx *= 0.95; p.vy *= 0.95;
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
          p.x = Math.random() * W; p.y = Math.random() * H;
          p.vx = (Math.random() - 0.5) * 1.5; p.vy = (Math.random() - 0.5) * 1.5;
          p.life = p.maxLife; p.hue = Math.random() * 360;
        }
        p.hue = (p.hue + 0.4) % 360;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.shadowBlur = 7; ctx.shadowColor = 'hsl(' + p.hue + ',100%,60%)';
        ctx.fillStyle = 'hsl(' + p.hue + ',100%,65%)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    };
    const onMove = (e) => {
      const r = c.getBoundingClientRect(), src = e.touches ? e.touches[0] : e;
      mouse.x = src.clientX - r.left; mouse.y = src.clientY - r.top;
    };
    const onResize = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
    c.addEventListener('mousemove', onMove);
    c.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener('mousemove', onMove);
      c.removeEventListener('touchmove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return (
    <div className="w-full h-screen bg-[#050514] relative">
      <canvas ref={canvasRef} className="w-full h-full" style={{ touchAction: 'none' }} />
      <p className="absolute bottom-4 inset-x-0 text-center text-white/15 text-xs font-mono uppercase tracking-widest pointer-events-none">Move cursor to guide the flow</p>
    </div>
  );
}
`.trim();

export const FLASH_CODE = `
function App() {
  const WORDS = [
    { word: 'Ephemeral',   def: 'Lasting a very short time',               ex: 'Morning dew is ephemeral.'            },
    { word: 'Resilient',   def: 'Recovering quickly from difficulties',     ex: 'She remained resilient throughout.'   },
    { word: 'Eloquent',    def: 'Fluent and persuasive in expression',      ex: 'His eloquent speech moved the crowd.' },
    { word: 'Tenacious',   def: 'Holding firm to goals despite obstacles',  ex: 'The tenacious climber summited.'      },
    { word: 'Serendipity', def: 'A happy and unexpected discovery',         ex: 'Meeting you was pure serendipity.'    },
    { word: 'Ambiguous',   def: 'Open to more than one interpretation',     ex: 'The ending was deliberately vague.'   },
    { word: 'Meticulous',  def: 'Showing great attention to detail',        ex: 'She was meticulous in her research.'  },
    { word: 'Pragmatic',   def: 'Dealing with things practically',          ex: 'A pragmatic solution solved it.'      },
    { word: 'Candid',      def: 'Truthful and straightforwardly honest',    ex: 'He gave a refreshingly candid reply.' },
    { word: 'Prolific',    def: 'Producing many works or results',          ex: 'A prolific author with fifty novels.' },
  ];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [learning, setLearning] = useState([]);
  const [done, setDone] = useState(false);

  const next = (easy) => {
    if (easy) setKnown(k => [...k, idx]); else setLearning(l => [...l, idx]);
    setFlipped(false);
    setTimeout(() => { if (idx + 1 >= WORDS.length) setDone(true); else setIdx(i => i + 1); }, 160);
  };
  const reset = () => { setIdx(0); setFlipped(false); setKnown([]); setLearning([]); setDone(false); };

  if (done) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">🎓</div>
      <h2 className="text-white text-2xl font-black mb-2">Round Complete!</h2>
      <div className="flex gap-4 mb-6 mt-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-6 py-4 text-center">
          <p className="text-green-400 font-black text-3xl">{known.length}</p>
          <p className="text-green-600 text-xs mt-1">Got It</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl px-6 py-4 text-center">
          <p className="text-orange-400 font-black text-3xl">{learning.length}</p>
          <p className="text-orange-600 text-xs mt-1">Review</p>
        </div>
      </div>
      <button onClick={reset} className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-black hover:bg-indigo-600 transition-colors">Study Again</button>
    </div>
  );

  const card = WORDS[idx];
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-3 flex items-center justify-between">
        <span className="text-gray-600 text-xs font-mono">{idx + 1} / {WORDS.length}</span>
        <div className="flex gap-1">
          {WORDS.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: known.includes(i) ? '#22c55e' : learning.includes(i) ? '#f97316' : i === idx ? '#6366f1' : '#1f2937' }} />
          ))}
        </div>
      </div>
      <div onClick={() => setFlipped(f => !f)}
        className="w-full max-w-sm bg-gray-900 border border-gray-700 hover:border-indigo-500/40 rounded-2xl p-8 cursor-pointer min-h-52 flex flex-col items-center justify-center text-center select-none transition-colors">
        {!flipped ? (
          <div>
            <p className="text-gray-600 text-[10px] uppercase tracking-widest font-black mb-3">WORD</p>
            <h2 className="text-white text-3xl font-black">{card.word}</h2>
            <p className="text-gray-700 text-xs mt-5">tap to reveal definition</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 text-[10px] uppercase tracking-widest font-black mb-3">DEFINITION</p>
            <p className="text-white text-lg font-semibold leading-snug mb-3">{card.def}</p>
            <p className="text-indigo-400 text-sm italic">"{card.ex}"</p>
          </div>
        )}
      </div>
      {flipped && (
        <div className="flex gap-3 mt-4 w-full max-w-sm">
          <button onClick={() => next(false)} className="flex-1 py-3 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl font-black text-sm hover:bg-orange-500/20 transition-all">Still Learning</button>
          <button onClick={() => next(true)} className="flex-1 py-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl font-black text-sm hover:bg-green-500/20 transition-all">Got It ✓</button>
        </div>
      )}
      {!flipped && <p className="text-gray-700 text-xs mt-4">{known.length} known · {learning.length} reviewing</p>}
    </div>
  );
}
`.trim();
