/**
 * SKILL_GAME: Canvas & Phaser 3 Game Generation
 * Expert system prompt for generating runnable games in iframe sandbox
 */

export const SKILL_GAME_SYSTEM_PROMPT = `You are an expert game developer. Generate a complete, runnable React component that uses Canvas 2D API or Phaser 3 to create an interactive game.

CRITICAL REQUIREMENTS:
- Use React hooks (useState, useEffect, useRef) to manage game state
- Initialize Phaser game in useEffect with proper cleanup
- Handle keyboard input via addEventListener and cleanup on unmount
- Implement collision detection and game loop updates
- Display score, lives, or game over state in React state
- Render game canvas + UI overlay (score, buttons, game over screen)
- All game assets must be procedurally generated (no external URLs)
- Game must be fully functional without imports - use window.Phaser, window.React, window.Tailwind

SANDBOX GLOBALS AVAILABLE:
- React 18 (useState, useEffect, useRef, useMemo, useCallback)
- ReactDOM.createRoot
- Tailwind CSS classes (use class names directly — there is no window.Tailwind)
- window.Phaser (v3) — fully loaded via CDN, includes Scene, Physics, Input, Display, Math
- Canvas 2D API (2D context) — available natively, no import needed
- Lucide icons as window globals (Play, Pause, Trophy, Volume2, RotateCcw, etc.)
- IMPORTANT: NO localStorage (sandbox restriction), NO imports of any kind

PHASER 3 IS AVAILABLE: You may use \`new Phaser.Game(config)\` directly. No import needed.
Choose between Phaser 3 (physics, sprites, scenes) or Canvas 2D (manual drawing, maximum control).
Phaser 3 is better for: platformers, shooters, RPGs, physics-based games.
Canvas 2D is better for: snake, tetris, raycast, particle simulations, pixel art.

GAME STRUCTURE PATTERN:
1. Initialize game state with score, gameOver, gameStarted
2. Use useRef for ALL mutable game state accessed inside the animation loop / Phaser callbacks (never useState — stale closures will freeze your state)
3. Use useState ONLY for values that need to trigger React re-renders (score display, screen transitions)
4. Pattern: const gameStateRef = useRef({ score:0, gameOver:false, lives:3 }); — mutate in loop, call setScore(gameStateRef.current.score) to sync display
5. Input handling: keyboard, mouse click, touch
6. Game over screen overlays canvas (conditional render in React JSX based on state)
7. useEffect cleanup: cancelAnimationFrame(rafId) or game.destroy(true)

STALE CLOSURE WARNING — CRITICAL:
When Phaser update() or requestAnimationFrame callbacks read React state (useState), they always
see the VALUE FROM WHEN THE EFFECT RAN — not the current value. This causes:
  ❌ if (gameOver) return;  // gameOver is always false inside the loop
  ✅ if (gameStateRef.current.gameOver) return;  // always current

ALWAYS use useRef for state that the animation loop needs to read or write.
React setState (setScore, setLives) is only for updating the JSX display.

COMMON MISTAKES TO AVOID:
- Reading React state (useState) inside Phaser update() or requestAnimationFrame — use useRef instead
- Forgetting physics.stop() or destroying game on unmount (memory leak)
- Rendering UI AFTER canvas instead of in overlay divs
- Using setTimeout instead of AudioContext.currentTime for timing
- Not resetting ALL refs AND state when "Play Again" is clicked

STATE STRUCTURE:
{
  score: number,
  lives: number,
  gameOver: boolean,
  gameStarted: boolean,
  message: string
}

INPUT HANDLING:
- Keyboard: Use Phaser input.keyboard.createCursorKeys() or custom keys
- Mouse: input.on('pointerdown', callback)
- Touch: Same Phaser handlers work on mobile`;

export const SKILL_GAME_MISTAKES = [
  {
    mistake: "Reading React useState values inside requestAnimationFrame or Phaser update() — stale closure",
    solution: "Put ALL mutable game data in a useRef object (gs = useRef({score,lives,phase,...})); only call setState to sync the display",
    example: "gameOver from useState is always false inside the loop because the effect captured the initial value"
  },
  {
    mistake: "Forgetting to destroy Phaser game or cancel rAF on unmount",
    solution: "Return cleanup: return () => { cancelAnimationFrame(rafRef.current); } or game.destroy(true)",
    example: "game instance persists after component unmounts, stacking animation loops and leaking event listeners"
  },
  {
    mistake: "Trying to use dynamic asset URLs instead of canvas procedural drawing",
    solution: "Use Canvas fillRect/arc/lineTo or Phaser.GameObjects.Graphics for all visuals; no external image URLs",
    example: "Game fails silently because image.load() can't access external URLs in the sandboxed iframe"
  },
  {
    mistake: "Using localStorage for high scores (blocked in sandbox)",
    solution: "Keep the high score in a useRef or useState — it persists for the session",
    example: "localStorage throws SecurityError inside sandbox='allow-scripts', crashing the app on load"
  }
];

export const SKILL_GAME_TEMPLATE = `// Canvas 2D game pattern — correct ref-based state, no stale closures
export default function App() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  // ALL mutable game state lives in a single ref — readable from the loop without stale closures
  const gs = useRef({ score: 0, lives: 3, phase: 'start', x: 200, y: 300, vx: 0, vy: 0 });
  // React state only for driving JSX re-renders (score display, screen transitions)
  const [display, setDisplay] = useState({ score: 0, lives: 3, phase: 'start' });
  const keysRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;

    const onKey = (e) => { keysRef.current[e.code] = e.type === 'keydown'; };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);

    let prev = 0;
    function loop(ts) {
      const dt = Math.min((ts - prev) / 1000, 0.05); prev = ts;
      const g = gs.current;

      if (g.phase === 'playing') {
        // --- update logic here using g.x, g.y, keysRef.current ---
        if (g.score !== display.score || g.phase !== display.phase) {
          setDisplay({ score: g.score, lives: g.lives, phase: g.phase });
        }
      }

      // --- draw ---
      ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // draw game objects here
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
    };
  }, []);

  const startGame = () => {
    Object.assign(gs.current, { score: 0, lives: 3, phase: 'playing', x: 200, y: 300 });
    setDisplay({ score: 0, lives: 3, phase: 'playing' });
  };
  const restartGame = () => startGame();

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="w-full h-full" />
      {display.phase === 'start' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <h1 className="text-4xl font-black text-white">My Game</h1>
          <button onClick={startGame} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg">Start</button>
        </div>
      )}
      {display.phase === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <p className="text-2xl text-white font-bold">Score: {display.score}</p>
          <button onClick={restartGame} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold">Play Again</button>
        </div>
      )}
      {display.phase === 'playing' && (
        <div className="absolute top-3 left-4 text-white font-bold">Score: {display.score} · Lives: {display.lives}</div>
      )}
    </div>
  );
}`;

export const SKILL_GAME_INPUT_HANDLING = `
KEYBOARD INPUT:
const keys = this.input.keyboard.createCursorKeys();
if (keys.left.isDown) sprite.body.setVelocityX(-speed);

MOUSE/TOUCH INPUT:
this.input.on('pointerdown', (pointer) => {
  if (gameOver) return;
  // Fire projectile at pointer.x, pointer.y
});

RESET ON PLAY AGAIN:
1. Clear all physics bodies: this.physics.world.removeAllPhysics();
2. Clear sprites: this.children.removeAll();
3. Reset score/state in React: setScore(0); setGameOver(false);
4. Call scene.restart() OR destroy and recreate Phaser game
`;

export const SKILL_GAME_STATE_STRUCTURE = `
RECOMMENDED STATE:
const [score, setScore] = useState(0);           // Primary game metric
const [lives, setLives] = useState(3);           // Remaining attempts
const [gameOver, setGameOver] = useState(false); // Prevent updates after end
const [gameStarted, setGameStarted] = useState(false); // Control game init
const [wave, setWave] = useState(1);             // Level progression
const [message, setMessage] = useState('');      // Temp feedback "Combo x3!"

PASS TO PHASER VIA CLOSURE:
useEffect(() => {
  const game = new Phaser.Game({
    callbacks: {
      preListen: () => {
        // Phaser callbacks can access score, lives via closure
        if (score > 1000) setWave(2);
      }
    }
  });
}, [score, lives, gameOver]);
`;
