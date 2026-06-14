/**
 * SKILL_ART: Generative Art & Visual Experience Generation
 * Expert system prompt for generating canvas/SVG art in iframe sandbox
 */

export const SKILL_ART_SYSTEM_PROMPT = `You are an expert generative art developer. Generate a complete, runnable React component that creates a visually stunning, interactive generative art experience using Canvas 2D API, SVG, or CSS animations.

CRITICAL REQUIREMENTS:
- Use requestAnimationFrame for all animation — never setInterval for visual loops
- Store time as a monotonic accumulator (t += dt) — derive all motion from Math.sin/cos of t
- Particle systems: initialize N particles outside the loop, recycle dead ones, never push inside loop
- Mouse position must influence at least one visual parameter (color, force, density, direction)
- All visuals are procedural — no external image URLs
- Expose palette, particleCount, speed as named constants at the top of the file
- Every piece must feel alive — static screenshots are not acceptable

SANDBOX GLOBALS AVAILABLE:
- React 19 (useState, useEffect, useRef, useCallback)
- ReactDOM.createRoot
- Canvas 2D API (ctx.fillRect, ctx.arc, ctx.beginPath, ctx.bezierCurveTo, ctx.createRadialGradient, etc.)
- Tailwind CSS classes
- SVG elements via React JSX
- Math (sin, cos, PI, random, abs, sqrt, atan2, hypot)
- Framer Motion (motion.div, AnimatePresence)

SEED-FIRST: Build ONE compelling visual system that runs at 60fps and responds to mouse. Mark expansion points with // GROWTH: comments (e.g., // GROWTH: add palette switcher). Beautiful and alive beats feature-rich and janky.

COMPOSITION LAYERS (think in layers):
1. Background: gradient fill or fading trail (\`fillRect with low alpha for motion blur\`)
2. Mid-ground: geometry — circles, polygons, flowing curves
3. Foreground: particles, sparks, glitches
4. Overlay: UI controls (speed, palette) — minimal, non-intrusive

PARTICLE SYSTEM PATTERN:
- Initialize: \`const particles = Array.from({length: N}, () => makeParticle())\`
- Update in loop: \`particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= dt; if(p.life <= 0) resetParticle(p); })\`
- Never: \`particles.push(new Particle())\` inside the animation frame

VISUAL TECHNIQUES:
- Motion blur: \`ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(0,0,w,h)\` instead of clearRect
- Glow: set ctx.shadowBlur + ctx.shadowColor before drawing bright elements
- Trails: store last N positions per particle and draw connecting lines
- Noise: use sin(x*freq1 + t) * cos(y*freq2 + t) for organic motion
- Flow field: divide canvas into grid, assign angle per cell from noise, steer particles

AESTHETIC GUIDANCE:
- Adapt aesthetic to the concept — do NOT default to "circles on black background"
- Space themes: dark bg, cool whites, nebula gradients, slow drift
- Ocean themes: deep blue, foam whites, wave sin curves, bubbles
- Fire themes: warm bg, orange/red/yellow, upward drift, heat shimmer
- Geometric: precise angles, grid snap, neon on dark, symmetry

COMMON MISTAKES TO AVOID:
- Calling clearRect every frame (erases motion blur effect) — use low-alpha fillRect instead
- Allocating new arrays or objects inside the animation frame (causes GC pauses)
- Not cancelling requestAnimationFrame on component unmount (memory leak)
- Ignoring mouse — every generative piece must react to mouse in some way
- Making it loop identically — add subtle randomness so it never repeats exactly

STATE STRUCTURE:
{
  isRunning: boolean,     // Pause/play toggle
  speed: number,          // Time multiplier
  particleCount: number,  // Live particle count
  palette: string[],      // Active color palette
  mousePos: {x, y},       // Last known mouse position
}`;

export const SKILL_ART_MISTAKES = [
  {
    mistake: "Using clearRect every frame instead of low-alpha fillRect",
    solution: "Replace `ctx.clearRect(0,0,w,h)` with `ctx.fillStyle='rgba(0,0,0,0.06)'; ctx.fillRect(0,0,w,h)` for motion trails",
    example: "Art looks like a screensaver of static dots instead of flowing trails with persistence"
  },
  {
    mistake: "Pushing new particle objects inside the animation loop",
    solution: "Pre-allocate the particle array; reset dead particles in-place: `if(p.life<=0) Object.assign(p, makeParticle())`",
    example: "Smooth 60fps becomes choppy after 30s as GC collects thousands of discarded particle objects"
  },
  {
    mistake: "Not cancelling requestAnimationFrame on unmount",
    solution: "Store frame ID: `frameId.current = requestAnimationFrame(loop)`, cleanup: `return () => cancelAnimationFrame(frameId.current)`",
    example: "Multiple animation loops stack up on re-renders, causing double/triple speed and CPU spike"
  }
];

export const SKILL_ART_TEMPLATE = `// PALETTE and PARTICLE_COUNT are tunable constants
const PALETTE = ['#6366f1','#ec4899','#06b6d4','#f59e0b','#10b981'];
const PARTICLE_COUNT = 200;
const SPEED = 1.0;

function makeParticle(w, h) {
  return { x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2,
           life: Math.random()*120+60, maxLife: 180, r: Math.random()*3+1,
           color: PALETTE[Math.floor(Math.random()*PALETTE.length)] };
}

export default function App() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const particles = useRef([]);
  const t = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    particles.current = Array.from({ length: PARTICLE_COUNT }, () => makeParticle(canvas.width, canvas.height));

    const loop = (ts) => {
      const dt = SPEED;
      t.current += 0.01 * dt;
      const { x: mx, y: my } = mouseRef.current;
      const w = canvas.width, h = canvas.height;

      // Motion blur trail
      ctx.fillStyle = 'rgba(5,5,20,0.06)';
      ctx.fillRect(0, 0, w, h);

      particles.current.forEach(p => {
        // Mouse attraction
        const dx = mx - p.x, dy = my - p.y;
        const dist = Math.hypot(dx, dy) + 1;
        p.vx += (dx / dist) * 0.3;
        p.vy += (dy / dist) * 0.3;

        // Flow field influence
        const angle = Math.sin(p.x * 0.008 + t.current) * Math.cos(p.y * 0.008 + t.current) * Math.PI * 2;
        p.vx += Math.cos(angle) * 0.1;
        p.vy += Math.sin(angle) * 0.1;

        // Damping
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;

        // Recycle
        if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          Object.assign(p, makeParticle(w, h));
        }

        // Draw
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize); };
  }, []);

  const onMove = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="w-full h-screen bg-black">
      <canvas ref={canvasRef} onMouseMove={onMove} className="w-full h-full" />
    </div>
  );
}`;

export const SKILL_ART_INPUT_HANDLING = `
MOUSE INFLUENCE (store in ref to avoid re-renders):
const mouseRef = useRef({ x: 0, y: 0 });
const onMove = (e) => {
  const r = canvasRef.current.getBoundingClientRect();
  mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
};
// In loop: use mouseRef.current.x / .y for attraction, repulsion, or parameter control

TOUCH SUPPORT:
const onTouch = (e) => {
  e.preventDefault();
  const t = e.touches[0];
  const r = canvasRef.current.getBoundingClientRect();
  mouseRef.current = { x: t.clientX - r.left, y: t.clientY - r.top };
};
// <canvas onMouseMove={onMove} onTouchMove={onTouch} />

CLICK TO RESET / BURST:
const onClick = (e) => {
  const r = canvasRef.current.getBoundingClientRect();
  const cx = e.clientX - r.left, cy = e.clientY - r.top;
  // Emit burst: reset N particles at click point
  particles.current.slice(0, 20).forEach(p => {
    p.x = cx; p.y = cy;
    p.vx = (Math.random()-0.5)*8; p.vy = (Math.random()-0.5)*8;
    p.life = p.maxLife;
  });
};
`;

export const SKILL_ART_STATE_STRUCTURE = `
RECOMMENDED REFS (use refs, not state, for hot-path data):
const canvasRef = useRef(null);          // Canvas DOM element
const frameRef = useRef(null);           // requestAnimationFrame ID for cleanup
const mouseRef = useRef({ x: 0, y: 0 }); // Current mouse position
const particles = useRef([]);            // Particle pool (mutated in place)
const t = useRef(0);                     // Time accumulator

REACT STATE (only for UI controls):
const [isRunning, setIsRunning] = useState(true);
const [speed, setSpeed] = useState(1);
const [palette, setPalette] = useState(PALETTE);

PALETTE PRESETS:
const PALETTES = {
  cosmic: ['#6366f1','#ec4899','#06b6d4','#f59e0b','#10b981'],
  fire:   ['#ff4500','#ff6a00','#ffd700','#ff8c00','#fff0c8'],
  ocean:  ['#0077b6','#00b4d8','#90e0ef','#caf0f8','#03045e'],
  forest: ['#2d6a4f','#52b788','#b7e4c7','#74c69d','#1b4332'],
};
`;
