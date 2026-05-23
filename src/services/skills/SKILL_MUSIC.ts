/**
 * SKILL_MUSIC: Web Audio API Instrument & Sequencer Generation
 * Expert system prompt for generating music apps in iframe sandbox
 */

export const SKILL_MUSIC_SYSTEM_PROMPT = `You are an expert music and audio application developer. Generate a complete, runnable React component that creates an interactive musical instrument, sequencer, or audio visualizer using the Web Audio API.

CRITICAL REQUIREMENTS:
- NEVER initialize AudioContext on mount — always inside a user gesture handler (onClick/onPointerDown)
- Store AudioContext in a useRef, create it once on first interaction
- Create oscillator/buffer nodes per note; always call node.stop() after the note ends
- Use gainNode for volume control and smooth attack/release (avoid clicks)
- All sound generation must be procedural — no external audio URLs
- App must work without imports — use window.React, Web Audio API natively
- Visual feedback for every sound: animate keys/pads, show waveform or bars

SANDBOX GLOBALS AVAILABLE:
- React 18 (useState, useEffect, useRef, useCallback)
- ReactDOM.createRoot
- Tailwind CSS classes
- Web Audio API (AudioContext, OscillatorNode, GainNode, AnalyserNode, BiquadFilterNode)
- Lucide icons (Play, Pause, Volume2, Music, etc.)
- Framer Motion (motion.div, AnimatePresence)

AUDIO PATTERNS:
1. AudioContext: create once in onClick, store in ref — \`if (!ctx.current) ctx.current = new AudioContext()\`
2. Resume on interaction: \`if (ctx.current.state === 'suspended') await ctx.current.resume()\`
3. Play a note: create OscillatorNode → connect GainNode → connect destination → schedule start/stop
4. Attack/release: use gainNode.gain.setTargetAtTime() for smooth envelope
5. Visualizer: create AnalyserNode, read frequencyData in requestAnimationFrame loop

INSTRUMENT TYPES TO BUILD:
- Piano keyboard: white + black keys mapped to note frequencies, keyboard input support
- Drum machine: 4x4 or 8-step grid, each cell toggles a drum hit
- Synthesizer: waveform selector, frequency slider, ADSR controls
- Chord pad: large pads play chord clusters, touch-friendly
- Theremin: mouse X = frequency, mouse Y = volume

COMMON MISTAKES TO AVOID:
- Creating AudioContext outside a user gesture (browser blocks autoplay)
- Not disconnecting nodes after they finish (memory leak over many notes)
- Using setInterval for sequencer timing (drifts) — use AudioContext.currentTime scheduling instead
- Playing piano notes on mousedown only — also handle mouseup for release, keydown/keyup for keyboard
- Not providing a visual "start" button — users need to click first to unlock AudioContext

STATE STRUCTURE:
{
  isStarted: boolean,     // AudioContext unlocked
  isPlaying: boolean,     // Sequencer running
  bpm: number,            // Tempo
  activeNotes: Set<string>, // Currently held keys/pads
  volume: number,         // Master volume (0-1)
  waveform: OscillatorType, // 'sine'|'square'|'sawtooth'|'triangle'
}

INPUT HANDLING:
- Keyboard: map A-K to piano notes (A=C4, S=D4, D=E4, F=F4, G=G4, H=A4, J=B4, K=C5)
- Mouse: onPointerDown to start note, onPointerUp to stop (use pointer events not mouse for touch)
- Touch: same pointer events work on mobile`;

export const SKILL_MUSIC_MISTAKES = [
  {
    mistake: "Calling `new AudioContext()` at the top level or in useEffect on mount",
    solution: "Create AudioContext inside onClick: `if (!ctxRef.current) ctxRef.current = new AudioContext()`",
    example: "Browser throws 'AudioContext was not allowed to start' and no sound plays"
  },
  {
    mistake: "Creating one persistent oscillator and changing its frequency (causes glitches)",
    solution: "Create a new OscillatorNode per note, connect it, start it, schedule stop: `osc.stop(ctx.currentTime + duration)`",
    example: "Changing frequency mid-note causes audible clicks and the 'legato' bleeds between keys"
  },
  {
    mistake: "Using setInterval for step sequencer timing",
    solution: "Schedule beats with AudioContext.currentTime: `scheduleNote(step, ctx.currentTime + step * stepDuration)`",
    example: "Sequencer drifts out of sync after a few bars as setInterval timing is imprecise"
  }
];

export const SKILL_MUSIC_TEMPLATE = `export default function App() {
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStarted, setIsStarted] = useState(false);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [waveform, setWaveform] = useState('sine');
  const [volume, setVolume] = useState(0.5);

  // Note frequencies: C4 to B4
  const NOTES = { a: 261.63, s: 293.66, d: 329.63, f: 349.23, g: 392.00, h: 440.00, j: 493.88, k: 523.25 };
  const KEY_LABELS = { a:'C', s:'D', d:'E', f:'F', g:'G', h:'A', j:'B', k:'C5' };

  const start = async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      analyserRef.current = ctxRef.current.createAnalyser();
      analyserRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
    setIsStarted(true);
    drawVisualizer();
  };

  const playNote = useCallback((key) => {
    if (!ctxRef.current || !NOTES[key]) return;
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveform;
    osc.frequency.value = NOTES[key];
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.setTargetAtTime(0, ctx.currentTime + 0.3, 0.1);
    osc.connect(gain);
    gain.connect(analyserRef.current || ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
    setActiveKeys(k => new Set([...k, key]));
    setTimeout(() => setActiveKeys(k => { const n = new Set(k); n.delete(key); return n; }), 200);
  }, [waveform, volume]);

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx2d = canvas.getContext('2d');
    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      ctx2d.fillStyle = 'rgba(5,5,20,0.3)';
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      data.slice(0, 64).forEach((v, i) => {
        const h = (v / 255) * canvas.height;
        ctx2d.fillStyle = \`hsl(\${i * 4}, 80%, 60%)\`;
        ctx2d.fillRect(i * (canvas.width / 64), canvas.height - h, canvas.width / 64 - 1, h);
      });
    };
    draw();
  };

  useEffect(() => {
    const down = (e) => { if (NOTES[e.key] && !e.repeat) playNote(e.key); };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [playNote]);

  if (!isStarted) return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="text-4xl font-black text-white">🎹 Piano</div>
      <button onClick={start} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg">
        Click to Start
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-4">
      <canvas ref={canvasRef} width={600} height={80} className="rounded-xl w-full max-w-xl" />
      <div className="flex gap-1">
        {Object.entries(NOTES).map(([key]) => (
          <button key={key} onPointerDown={() => playNote(key)}
            className={\`w-12 h-32 rounded-b-lg border-2 border-gray-700 font-bold text-sm flex flex-col justify-end items-center pb-2 transition
              \${activeKeys.has(key) ? 'bg-indigo-400 text-white' : 'bg-white text-gray-800'}\`}>
            <span className="text-xs">{KEY_LABELS[key]}</span>
            <span className="text-[9px] opacity-50">{key.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-4 items-center">
        <select value={waveform} onChange={e => setWaveform(e.target.value)}
          className="bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm">
          {['sine','square','sawtooth','triangle'].map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(+e.target.value)}
          className="w-32" />
        <span className="text-white/50 text-sm">Vol: {Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}`;

export const SKILL_MUSIC_INPUT_HANDLING = `
PIANO KEYBOARD MAPPING:
const NOTES = { a:261.63, s:293.66, d:329.63, f:349.23, g:392.00, h:440.00, j:493.88, k:523.25 };
useEffect(() => {
  const down = (e) => { if (NOTES[e.key] && !e.repeat) playNote(e.key); };
  const up = (e) => { if (NOTES[e.key]) releaseNote(e.key); };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
}, [playNote, releaseNote]);

POINTER EVENTS (works for mouse AND touch):
<button onPointerDown={() => playNote(key)} onPointerUp={() => releaseNote(key)} onPointerLeave={() => releaseNote(key)}>

SEQUENCER SCHEDULING (drift-free):
const scheduleStep = (stepIdx, time) => {
  if (!pattern[stepIdx]) return;
  const osc = ctx.createOscillator();
  osc.start(time);
  osc.stop(time + 0.1);
  osc.connect(ctx.destination);
};
`;

export const SKILL_MUSIC_STATE_STRUCTURE = `
RECOMMENDED STATE:
const ctxRef = useRef(null);                     // AudioContext (created on first click)
const [isStarted, setIsStarted] = useState(false); // Whether AudioContext is unlocked
const [isPlaying, setIsPlaying] = useState(false); // Sequencer running
const [bpm, setBpm] = useState(120);               // Tempo
const [activeKeys, setActiveKeys] = useState(new Set()); // Visually active keys
const [waveform, setWaveform] = useState('sine'); // OscillatorType
const [volume, setVolume] = useState(0.5);         // Master gain 0-1
const [pattern, setPattern] = useState(Array(16).fill(false)); // Sequencer grid

GAIN ENVELOPE (smooth, no clicks):
const playNote = (freq, duration = 0.5) => {
  const ctx = ctxRef.current;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(masterVolume, ctx.currentTime + 0.01);  // attack
  gain.gain.setTargetAtTime(0, ctx.currentTime + duration * 0.7, 0.05);     // release
  osc.frequency.value = freq;
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + duration);
};
`;
