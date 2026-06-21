// Snake Game + Drum Pad — interactive real-time game seed apps

export const SNAKE_CODE = `
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

export const DRUM_CODE = `
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
