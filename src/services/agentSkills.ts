export type AppType = 'phone' | 'desktop' | 'game' | 'terminal' | 'music' | 'art';

import { SKILL_GAME_SYSTEM_PROMPT } from './skills/SKILL_GAME';
import { SKILL_DESKTOP_SYSTEM_PROMPT } from './skills/SKILL_DESKTOP';
import { SKILL_TERMINAL_SYSTEM_PROMPT } from './skills/SKILL_TERMINAL';
import { SKILL_MUSIC_SYSTEM_PROMPT } from './skills/SKILL_MUSIC';
import { SKILL_ART_SYSTEM_PROMPT } from './skills/SKILL_ART';
import { SKILL_PHONE_SYSTEM_PROMPT } from './skills/SKILL_PHONE';

// System prompts enriched with patterns from:
// - chongdashu/cc-skills-nanobananapro Three.js Builder SKILL.md
// - chongdashu/threejs-tactics-game Three.js Builder SKILL.md
// - Donchitos/Claude-Code-Game-Studios prototype + team-combat + map-systems skills
// - andrew-lim html5-snake + html5-raycast canvas patterns
// - SKILL_* files: Canvas/Phaser3, Desktop, Terminal, Music, Art
export const AGENT_SYSTEM_PROMPTS: Record<AppType, string> = {
  phone:
    SKILL_PHONE_SYSTEM_PROMPT +
    "\n\nADDITIONAL PATTERNS: " +
    "Think Instagram, WhatsApp, TikTok style UI — clean, fast, gesture-driven. " +
    "Use onTouchStart/onTouchEnd for swipe detection (deltaX > 50 = right swipe). " +
    "Flip animations: CSS transform rotateY via inline style + state toggle. " +
    "Pre-populate all lists with 5-10 realistic sample items so the app looks alive on first render.",

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
    "`function loop(ts){ const dt=Math.min((ts-prev)/1000,0.05); prev=ts; update(dt); draw(); rafId=requestAnimationFrame(loop); }` " +
    "Separate update(dt) and draw() functions — never mix logic and rendering. Store the frame ID and cancel on cleanup. " +

    "(3) REF-BASED GAME STATE — CRITICAL: all mutable state accessed inside the loop MUST live in a useRef, not useState. " +
    "Pattern: `const gs = useRef({ score:0, lives:3, phase:'start' })` — mutate gs.current in the loop, " +
    "call setScore(gs.current.score) only to update React display. " +
    "useState values are stale inside the loop (captured at effect creation time). " +
    "Show 'start' | 'playing' | 'gameover' screens as React JSX overlays driven by a display state object. " +

    "(4) INPUT — keyboard: maintain a map of pressed keys via keydown/keyup event listeners; support both WASD and arrow keys. " +
    "Touch: onTouchStart/onTouchEnd on the canvas for mobile. " +
    "Store all input state in refs (never setState inside input handlers). " +

    "(5) COLLISION DETECTION — choose the right algorithm: " +
    "Grid collision (snake, pac-man): 2D array map, check cell value at target position. " +
    "AABB (platformers, shooters): `r1.x < r2.x+r2.w && r1.x+r1.w > r2.x && r1.y < r2.y+r2.h && r1.y+r1.h > r2.y`. " +
    "Circular (asteroids, balls): `dx*dx + dy*dy < (r1+r2)*(r1+r2)`. " +

    "(6) OBJECT POOL DISCIPLINE — initialize entity arrays outside the loop; recycle dead objects instead of pushing new ones. " +
    "Never call 'new' or array.push inside the animation frame. " +

    "(7) SINGLE CORE MECHANIC — nail one mechanic that is actually fun before adding score/lives/levels. " +
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
  phone:    "Touch-first, vertical stacking, large tap targets (min 44px), bottom navigation, portrait layout, hardcoded initial data (no fetch/localStorage), flip animations via CSS rotateY + state toggle",
  desktop:  "Multi-panel layout (sidebar+main+detail), useMemo for derived lists, keyboard shortcuts, empty states, flex with min-h-0 for panel sizing",
  game:     "Constants block + loop(ts){update(dt);draw()} + gs=useRef({score,lives,phase}) for loop state + setDisplay() for JSX + WASD+arrows+touch + AABB/grid/circular collision + object pool + win/lose/restart",
  terminal: "Monospace font, dark background (green-on-black or amber-on-black), command history (ArrowUp), auto-scroll to bottom, re-focus input on container click",
  music:    "AudioContext in onClick (never on mount), new OscillatorNode per note, gain envelope for smooth attack/release, pointer events for keyboard+touch",
  art:      "Canvas layers + low-alpha fillRect for trails + requestAnimationFrame with time accumulator + particle recycling (no new in loop) + mouse-reactive + named palette constants",
};

/** Returns the full system prompt for a given app type, including all enriched patterns. */
export function getAgentSkill(type: AppType): string {
  return AGENT_SYSTEM_PROMPTS[type];
}
