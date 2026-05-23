export type AppType = 'phone' | 'desktop' | 'game' | 'terminal' | 'music' | 'art';

import { SKILL_GAME_SYSTEM_PROMPT } from './skills/SKILL_GAME';
import { SKILL_DESKTOP_SYSTEM_PROMPT } from './skills/SKILL_DESKTOP';
import { SKILL_TERMINAL_SYSTEM_PROMPT } from './skills/SKILL_TERMINAL';
import { SKILL_MUSIC_SYSTEM_PROMPT } from './skills/SKILL_MUSIC';
import { SKILL_ART_SYSTEM_PROMPT } from './skills/SKILL_ART';

// System prompts enriched with patterns from:
// - chongdashu/cc-skills-nanobananapro Three.js Builder SKILL.md
// - chongdashu/threejs-tactics-game Three.js Builder SKILL.md
// - Donchitos/Claude-Code-Game-Studios prototype + team-combat + map-systems skills
// - andrew-lim html5-snake + html5-raycast canvas patterns
// - SKILL_* files: Canvas/Phaser3, Desktop, Terminal, Music, Art
export const AGENT_SYSTEM_PROMPTS: Record<AppType, string> = {
  phone:
    "You are a mobile-first app expert. Create touch-optimized apps with: large tap targets (min 44px), bottom navigation, swipe gestures, portrait layout, thumb-friendly buttons. Think Instagram, WhatsApp, TikTok style UI.",

  desktop:
    SKILL_DESKTOP_SYSTEM_PROMPT + "\n\n" +
    "ADDITIONAL PATTERNS: " +
    "Treat your component tree as a scene graph — parent state flows down; use React.memo and useMemo to keep expensive subtrees from re-rendering. " +
    "Adapt visuals to the concept — a data dashboard looks different from a code editor or kanban board. Never default to the same generic layout. " +
    "Add responsive resize handling (window resize → update layout state). Expose key config values as named constants at the top of the file.",

  game:
    SKILL_GAME_SYSTEM_PROMPT + "\n\n" +
    "ADDITIONAL CANVAS PATTERNS (andrew-lim / html5-snake / html5-raycast):\n" +
    "You are a browser game developer. Build fully playable games using React + canvas via useRef+useEffect. " +
    "Core architecture (proven patterns from html5-snake and html5-raycast): " +

    "(1) CONSTANTS BLOCK at top — speed, size, gravity, lives, all tunable values exposed as named constants, never magic numbers inside logic. " +

    "(2) CANVAS GAME LOOP — use requestAnimationFrame inside useEffect with a named loop function: " +
    "`function loop(ts){ const dt=Math.min((ts-prev)/1000,0.05); prev=ts; update(dt); draw(); reqId=requestAnimationFrame(loop); }` " +
    "Separate update(dt) and draw() functions — never mix logic and rendering. Store the frame ID and cancel on cleanup. " +
    "Canvas id='gameCanvas', sized to fill container via ref. " +

    "(3) GAME STATE — explicit 'start' | 'playing' | 'gameover' states stored in a useRef; " +
    "show a start screen with click/tap to begin, show score prominently during play, show game-over screen with final score and a restart button. " +
    "Click or tap on the canvas (or a button) transitions between states. " +

    "(4) INPUT — keyboard: maintain a queue/map of pressed keys via keydown/keyup; support both WASD and arrow keys mapped to the same actions. " +
    "Touch: onTouchStart/onTouchEnd on the canvas for mobile; map swipes or zones to game actions. " +
    "Store all input state in refs (never setState inside input handlers). " +

    "(5) COLLISION DETECTION — choose the right algorithm: " +
    "Grid collision (snake, pac-man): 2D array map, check cell value at target position. " +
    "AABB (platformers, shooters): `r1.x < r2.x+r2.w && r1.x+r1.w > r2.x && r1.y < r2.y+r2.h && r1.y+r1.h > r2.y`. " +
    "Circular (asteroids, balls): `dx*dx + dy*dy < (r1+r2)*(r1+r2)`. " +

    "(6) RAYCASTING (for 3D-look games) — cast one ray per screen column, compute wall height from perpendicular distance, " +
    "shade walls by distance (far=darker), support keyboard strafe + mouse look. " +

    "(7) OBJECT POOL DISCIPLINE — initialize entity arrays outside the loop; recycle dead objects instead of pushing new ones. " +
    "Never call 'new' or array.push inside the animation frame. " +

    "(8) SINGLE CORE MECHANIC — nail one mechanic that is actually fun before adding score/lives/levels. " +
    "Every game must end with: clear win/lose condition, restart button, final score display.",

  terminal:
    SKILL_TERMINAL_SYSTEM_PROMPT + "\n\n" +
    "ADDITIONAL PATTERNS: " +
    "Create command-line style interfaces with: monospace font, green-on-black or amber-on-black colors, command input, simulated file systems, ASCII art, typewriter effects, fake OS feel.",

  music:
    SKILL_MUSIC_SYSTEM_PROMPT + "\n\n" +
    "ADDITIONAL PATTERNS: " +
    "Build piano keyboards, drum pads, synthesizers, or waveform displays. " +
    "Pattern: create AudioContext once on first click, store in a ref; create oscillator/buffer nodes per note and connect to context.destination; disconnect and stop nodes after they play.",

  art:
    SKILL_ART_SYSTEM_PROMPT + "\n\n" +
    "ADDITIONAL PATTERNS: " +
    "Avoid repetitive default circle-on-black — adapt the aesthetic to the concept. " +
    "Expose palette, count, speed as constants. Make it interactive — mouse position should influence at least one parameter (color, force, density).",
};

export const AGENT_GUIDELINES: Record<AppType, string> = {
  phone:    "Touch-first, vertical stacking, large tap targets (min 44px), bottom navigation, portrait layout",
  desktop:  "Multi-panel layout (sidebar+main+detail), useMemo for derived lists, keyboard shortcuts, empty states, flex with min-h-0 for panel sizing",
  game:     "Constants block + loop(ts){update(dt);draw()} + start/playing/gameover states + WASD+arrows+touch + AABB/grid/circular collision + object pool + win/lose/restart/score",
  terminal: "Monospace font, dark background (green-on-black or amber-on-black), command history (ArrowUp), auto-scroll to bottom, re-focus input on container click",
  music:    "AudioContext in onClick (never on mount), new OscillatorNode per note, gain envelope for smooth attack/release, pointer events for keyboard+touch",
  art:      "Canvas layers + low-alpha fillRect for trails + requestAnimationFrame with time accumulator + particle recycling (no new in loop) + mouse-reactive + named palette constants",
};

/** Returns the full system prompt for a given app type, including all enriched patterns. */
export function getAgentSkill(type: AppType): string {
  return AGENT_SYSTEM_PROMPTS[type];
}
