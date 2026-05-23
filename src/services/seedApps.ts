import { Suggestion } from "../types";

const yesterday = new Date(Date.now() - 86400000).toISOString();

// ── SNAKE GAME ────────────────────────────────────────────────────────────────
const SNAKE_CODE = `
function App() {
  const canvasRef = useRef(null);
  const gsRef = useRef(null);
  const [score, setScore] = useState(0);
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const SZ = 18, COLS = Math.floor(c.width / SZ), ROWS = Math.floor(c.height / SZ);
    let raf, last = 0, speed = 140;
    const rnd = (sn) => {
      let f;
      do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
      while (sn.some(s => s.x === f.x && s.y === f.y));
      return f;
    };
    const sn0 = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
    gsRef.current = { snake: sn0, dir: { x: 1, y: 0 }, ndir: { x: 1, y: 0 }, food: rnd(sn0), score: 0, alive: true };
    ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, c.width, c.height);

    const draw = (ts) => {
      raf = requestAnimationFrame(draw);
      const g = gsRef.current;
      if (!g || !g.alive) return;
      if (ts - last < speed) return;
      last = ts;
      g.dir = g.ndir;
      const h = { x: (g.snake[0].x + g.dir.x + COLS) % COLS, y: (g.snake[0].y + g.dir.y + ROWS) % ROWS };
      if (g.snake.some(s => s.x === h.x && s.y === h.y)) { g.alive = false; setAlive(false); return; }
      g.snake.unshift(h);
      if (h.x === g.food.x && h.y === g.food.y) {
        g.score++; speed = Math.max(65, speed - 3); setScore(g.score); g.food = rnd(g.snake);
      } else g.snake.pop();
      ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, c.width, c.height);
      g.snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#818cf8' : ('rgba(99,102,241,' + (0.9 - i / g.snake.length * 0.65) + ')');
        ctx.fillRect(s.x * SZ + 2, s.y * SZ + 2, SZ - 4, SZ - 4);
      });
      ctx.fillStyle = '#f472b6'; ctx.shadowBlur = 12; ctx.shadowColor = '#ec4899';
      ctx.beginPath(); ctx.arc(g.food.x * SZ + SZ / 2, g.food.y * SZ + SZ / 2, SZ / 2 - 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    };

    const onKey = (e) => {
      const g = gsRef.current; if (!g || !g.alive) return;
      const m = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      const d = m[e.key]; if (d && !(d.x === -g.dir.x && d.y === -g.dir.y)) g.ndir = d;
      if (m[e.key]) e.preventDefault();
    };

    raf = requestAnimationFrame(draw);
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, []);

  const restart = () => {
    const c = canvasRef.current, SZ = 18;
    const COLS = Math.floor(c.width / SZ), ROWS = Math.floor(c.height / SZ);
    const rnd = (sn) => { let f; do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; } while (sn.some(s => s.x === f.x && s.y === f.y)); return f; };
    const sn = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
    gsRef.current = { snake: sn, dir: { x: 1, y: 0 }, ndir: { x: 1, y: 0 }, food: rnd(sn), score: 0, alive: true };
    setScore(0); setAlive(true);
  };

  const swipe = (dx, dy) => {
    const g = gsRef.current; if (!g || !g.alive) return;
    const d = { x: dx, y: dy }; if (!(d.x === -g.dir.x && d.y === -g.dir.y)) g.ndir = d;
  };

  return (
    <div className="flex flex-col items-center h-screen bg-[#050510] pt-3 select-none">
      <div className="flex items-center justify-between w-full max-w-xs px-4 mb-2">
        <span className="text-indigo-400 font-black text-xs uppercase tracking-widest">SNAKE</span>
        <span className="text-white font-black tabular-nums">{score}</span>
      </div>
      <canvas ref={canvasRef} width={270} height={270} className="rounded-xl border border-white/10" />
      {!alive ? (
        <div className="mt-4 text-center">
          <p className="text-white font-black text-xl mb-1">GAME OVER</p>
          <p className="text-gray-500 text-sm mb-4">Score: {score}</p>
          <button onClick={restart} className="px-8 py-2.5 bg-indigo-500 text-white rounded-xl font-black hover:bg-indigo-600 transition-colors">RETRY</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div />
          <button onPointerDown={() => swipe(0, -1)} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-lg active:bg-indigo-500 transition-colors">▲</button>
          <div />
          <button onPointerDown={() => swipe(-1, 0)} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-lg active:bg-indigo-500 transition-colors">◄</button>
          <button onPointerDown={() => swipe(0, 1)} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-lg active:bg-indigo-500 transition-colors">▼</button>
          <button onPointerDown={() => swipe(1, 0)} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-lg active:bg-indigo-500 transition-colors">►</button>
        </div>
      )}
    </div>
  );
}
`.trim();

// ── DAILY MOOD TRACKER ────────────────────────────────────────────────────────
const MOOD_CODE = `
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

// ── PARTICLE FLOW ─────────────────────────────────────────────────────────────
const PARTICLE_CODE = `
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

// ── DRUM PAD ──────────────────────────────────────────────────────────────────
const DRUM_CODE = `
function App() {
  const audioRef = useRef(null);
  const [active, setActive] = useState({});
  const [seq, setSeq] = useState([]);
  const getAC = () => {
    if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioRef.current;
  };
  const PADS = [
    { key: 'Q', label: 'Kick',   color: '#6366f1', freq: 55,   decay: 0.5,  osc: true,  pitch: true  },
    { key: 'W', label: 'Snare',  color: '#ec4899', freq: 250,  decay: 0.15, osc: false, pitch: false },
    { key: 'E', label: 'Hi-Hat', color: '#f59e0b', freq: 9000, decay: 0.05, osc: false, pitch: false },
    { key: 'R', label: 'Open',   color: '#10b981', freq: 5000, decay: 0.35, osc: false, pitch: false },
    { key: 'A', label: 'Bass',   color: '#8b5cf6', freq: 80,   decay: 0.4,  osc: true,  pitch: false },
    { key: 'S', label: 'Tom',    color: '#0ea5e9', freq: 100,  decay: 0.28, osc: true,  pitch: true  },
    { key: 'D', label: 'Clap',   color: '#ef4444', freq: 1200, decay: 0.12, osc: false, pitch: false },
    { key: 'F', label: 'Rim',    color: '#f97316', freq: 450,  decay: 0.08, osc: true,  pitch: false },
  ];
  const play = (pad) => {
    const ac = getAC(), now = ac.currentTime;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + pad.decay);
    gain.connect(ac.destination);
    if (pad.osc) {
      const osc = ac.createOscillator();
      osc.type = 'sine'; osc.frequency.setValueAtTime(pad.freq, now);
      if (pad.pitch) osc.frequency.exponentialRampToValueAtTime(pad.freq * 0.08, now + pad.decay);
      osc.connect(gain); osc.start(now); osc.stop(now + pad.decay + 0.05);
    } else {
      const bufLen = Math.floor(ac.sampleRate * pad.decay);
      const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      const src = ac.createBufferSource();
      const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = pad.freq;
      src.buffer = buf; src.connect(bpf); bpf.connect(gain); src.start(now);
    }
    setActive(a => ({ ...a, [pad.key]: true }));
    setSeq(s => [...s.slice(-11), pad]);
    setTimeout(() => setActive(a => ({ ...a, [pad.key]: false })), 120);
  };
  useEffect(() => {
    const onKey = (e) => { const p = PADS.find(p => p.key === e.key.toUpperCase()); if (p) play(p); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 select-none">
      <p className="text-gray-700 text-[10px] font-mono uppercase tracking-widest mb-5">Tap pads or use keys Q W E R A S D F</p>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {PADS.map(pad => (
          <button key={pad.key} onPointerDown={() => play(pad)}
            className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-0.5 font-black transition-all"
            style={{
              background: active[pad.key] ? pad.color : pad.color + '18',
              border: '2px solid ' + pad.color + '60',
              transform: active[pad.key] ? 'scale(0.91)' : 'scale(1)',
              boxShadow: active[pad.key] ? '0 0 22px ' + pad.color + '80' : 'none',
              color: active[pad.key] ? '#ffffff' : pad.color,
            }}>
            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{pad.key}</span>
            <span className="text-xs font-black">{pad.label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-1 items-center h-5">
        {seq.map((p, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: p.color, opacity: 0.2 + (i / seq.length) * 0.8 }} />
        ))}
      </div>
    </div>
  );
}
`.trim();

// ── VOCABULARY FLASHCARDS ─────────────────────────────────────────────────────
const FLASH_CODE = `
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

// ── SEED DATA ─────────────────────────────────────────────────────────────────

export const SEED_APPS: Suggestion[] = [
  {
    id: 'seed_snake_001',
    content: 'Snake Game',
    app_type: 'game',
    status: 'built',
    votes: 42,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: SNAKE_CODE,
    created_at: yesterday,
    history: [],
  },
  {
    id: 'seed_mood_001',
    content: 'Daily Mood Tracker',
    app_type: 'phone',
    status: 'built',
    votes: 37,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: MOOD_CODE,
    created_at: yesterday,
    history: [],
  },
  {
    id: 'seed_particles_001',
    content: 'Particle Flow',
    app_type: 'art',
    status: 'built',
    votes: 51,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: PARTICLE_CODE,
    created_at: yesterday,
    history: [],
  },
  {
    id: 'seed_drums_001',
    content: 'Drum Pad',
    app_type: 'music',
    status: 'built',
    votes: 34,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: DRUM_CODE,
    created_at: yesterday,
    history: [],
  },
  {
    id: 'seed_flash_001',
    content: 'Vocabulary Flashcards',
    app_type: 'phone',
    status: 'built',
    votes: 28,
    energy: 80,
    user_id: '@evolutive_demo',
    built_code: FLASH_CODE,
    created_at: yesterday,
    history: [],
  },
];
