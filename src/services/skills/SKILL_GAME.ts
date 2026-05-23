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
- Tailwind CSS classes
- window.Phaser (v3) - includes Scene, Physics, Input, Display, Math
- Canvas 2D API (2D context)
- Lucide icons as window globals

GAME STRUCTURE PATTERN:
1. Initialize game state with score, gameOver, gameStarted
2. useEffect for Phaser scene setup with lifecycle hooks (create, update)
3. Input handling: keyboard, mouse click, touch
4. Collision callbacks update React state
5. Game over screen overlays canvas
6. useEffect cleanup: scene.stop(), game.destroy()

COMMON MISTAKES TO AVOID:
- Forgetting physics.stop() or destroying game on unmount (memory leak)
- Not checking gameOver state before updating score
- Rendering UI AFTER canvas instead of in overlay divs
- Using setTimeout instead of game.time for frame-based updates
- Not resetting state when "Play Again" is clicked

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
    mistake: "Forgetting to destroy Phaser game on unmount",
    solution: "Return cleanup function from useEffect: return () => { if (game) game.destroy(true); }",
    example: "game instance persists after component unmounts, causing memory leak and ghost input handlers"
  },
  {
    mistake: "Updating score inside physics collision without checking gameOver",
    solution: "Always check: if (!gameOver) { updateScore(); } before modifying game state",
    example: "Score keeps incrementing after game over, confusing player with hidden points"
  },
  {
    mistake: "Trying to use dynamic asset URLs instead of canvas procedural drawing",
    solution: "Use Graphics objects in Phaser or Canvas fillRect/drawImage with data URLs only",
    example: "Game fails silently because image.load() can't access external URLs in sandbox"
  }
];

export const SKILL_GAME_TEMPLATE = `export default function GameComponent() {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!gameStarted) return;

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: { default: 'arcade', arcade: { gravity: { y: 200 } } },
      scene: {
        create: function() {
          this.player = this.add.rectangle(100, 500, 50, 50, 0x00ff00);
          this.physics.add.existing(this.player);
          this.input.keyboard.createCursorKeys();
        },
        update: function() {
          if (gameOver) return;
          const keys = this.input.keyboard.createCursorKeys();
          if (keys.left.isDown) this.player.body.setVelocityX(-200);
          if (keys.right.isDown) this.player.body.setVelocityX(200);
          if (this.player.y > 600) setGameOver(true);
        }
      }
    };

    const game = new Phaser.Game(config);
    return () => game.destroy(true);
  }, [gameStarted, gameOver]);

  return (
    <div className="flex flex-col items-center gap-4 bg-black p-4">
      <div className="text-2xl font-bold text-white">Score: {score}</div>
      {!gameStarted && <button onClick={() => setGameStarted(true)}>Start Game</button>}
      {gameOver && <button onClick={() => { setGameOver(false); setScore(0); }}>Play Again</button>}
      <div ref={gameRef} />
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
