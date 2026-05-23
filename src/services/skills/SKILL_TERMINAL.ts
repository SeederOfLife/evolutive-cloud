/**
 * SKILL_TERMINAL: CLI / Terminal Interface Generation
 * Expert system prompt for generating command-line style apps in iframe sandbox
 */

export const SKILL_TERMINAL_SYSTEM_PROMPT = `You are an expert terminal and CLI interface developer. Generate a complete, runnable React component that creates an immersive command-line experience.

CRITICAL REQUIREMENTS:
- Use React hooks (useState, useEffect, useRef) to manage terminal state
- Render output as an array of lines — never mutate history, only append
- Auto-scroll to bottom after each command using ref.scrollIntoView()
- Handle keyboard: Enter submits, ArrowUp/Down cycles history, Tab for completion
- Style with monospace font, dark background, colored text (green/amber/cyan)
- All commands must produce visible output — never silently fail
- Implement at least 8 meaningful commands relevant to the app concept

SANDBOX GLOBALS AVAILABLE:
- React 18 (useState, useEffect, useRef, useMemo, useCallback)
- ReactDOM.createRoot
- Tailwind CSS classes (use font-mono for all terminal text)
- No external dependencies needed — pure React + DOM

TERMINAL STRUCTURE PATTERN:
1. State: history (output lines array), input (current command), cmdHistory (past commands), historyIdx
2. Output lines: { id, type: 'input'|'output'|'error'|'success'|'info', text, color? }
3. Command parser: split input, lookup command, execute, push result to history
4. Input: controlled input at bottom, full width, transparent background
5. Prompt string: user@machine:~$ or custom themed prompt

COMMON MISTAKES TO AVOID:
- Not auto-scrolling after output — always call scrollRef.current?.scrollIntoView()
- Losing focus on the input — keep the input focused, re-focus on container click
- Blocking the UI with synchronous "loading" — use setTimeout to simulate async ops
- Not handling unknown commands gracefully — always output "command not found: X"
- Making the terminal look like a website — commit to the aesthetic fully

STATE STRUCTURE:
{
  history: Array<{ id: number, type: string, text: string }>,
  input: string,
  cmdHistory: string[],   // past submitted commands
  historyIdx: number,     // -1 = current input, 0+ = browsing history
}

INPUT HANDLING:
- Enter: parse + execute command, push to cmdHistory, clear input
- ArrowUp: historyIdx++, fill input with cmdHistory[historyIdx]
- ArrowDown: historyIdx--, fill input with cmdHistory or clear
- Tab: attempt prefix-match completion against known commands
- Ctrl+C: output "^C", clear current input
- Ctrl+L: clear history (keep prompt)`;

export const SKILL_TERMINAL_MISTAKES = [
  {
    mistake: "Input loses focus when user clicks terminal output",
    solution: "Add onClick to the terminal container: `onClick={() => inputRef.current?.focus()}`",
    example: "User scrolls up to read output, clicks, then has to click the input again to type"
  },
  {
    mistake: "Not scrolling to bottom after each command output",
    solution: "Add bottomRef = useRef(null) and call `bottomRef.current?.scrollIntoView({behavior:'smooth'})` in useEffect([history])",
    example: "New output appears below the fold, user thinks command did nothing"
  },
  {
    mistake: "Showing raw error objects instead of styled error messages",
    solution: "Catch all command errors and push a line with type:'error' and a human-readable message",
    example: "'[object Object]' appears in red instead of 'Error: file not found'"
  }
];

export const SKILL_TERMINAL_TEMPLATE = `export default function App() {
  const [history, setHistory] = useState([
    { id: 0, type: 'info', text: 'Welcome to EvolutiveOS v1.0.0' },
    { id: 1, type: 'info', text: 'Type "help" to see available commands.' },
  ]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  let nextId = useRef(2);

  const push = (text, type = 'output') =>
    setHistory(h => [...h, { id: nextId.current++, type, text }]);

  const COMMANDS = {
    help: () => push('Commands: help, clear, echo, date, whoami, ls, cat, version'),
    clear: () => setHistory([]),
    echo: (args) => push(args.join(' ') || ''),
    date: () => push(new Date().toLocaleString()),
    whoami: () => push('user@evolutive'),
    version: () => push('EvolutiveOS v1.0.0 — built with React'),
    ls: () => push('documents/  projects/  .config  README.md'),
    cat: (args) => {
      if (args[0] === 'README.md') push('# EvolutiveOS\\nA terminal experience.');
      else push(\`cat: \${args[0] || '?'}: No such file\`, 'error');
    },
  };

  const run = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    push(\`$ \${trimmed}\`, 'input');
    setCmdHistory(h => [trimmed, ...h]);
    setHistoryIdx(-1);
    const [cmd, ...args] = trimmed.split(/\\s+/);
    if (COMMANDS[cmd]) { try { COMMANDS[cmd](args); } catch(e) { push(e.message, 'error'); } }
    else push(\`command not found: \${cmd}\`, 'error');
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const onKey = (e) => {
    if (e.key === 'Enter') { run(input); setInput(''); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(idx);
      setInput(cmdHistory[idx] || '');
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? '' : cmdHistory[idx]);
    }
  };

  const COLOR = { input: 'text-green-400', output: 'text-gray-300', error: 'text-red-400', success: 'text-emerald-400', info: 'text-cyan-400' };

  return (
    <div onClick={() => inputRef.current?.focus()}
      className="h-screen bg-gray-950 p-4 flex flex-col font-mono text-sm overflow-hidden cursor-text">
      <div className="flex-1 overflow-auto space-y-0.5 pb-2">
        {history.map(line => (
          <div key={line.id} className={\`whitespace-pre-wrap \${COLOR[line.type] || 'text-gray-300'}\`}>{line.text}</div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-green-900/40 pt-2">
        <span className="text-green-500 flex-shrink-0">user@evo:~$</span>
        <input ref={inputRef} autoFocus value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
          className="flex-1 bg-transparent outline-none text-green-300 caret-green-400" spellCheck={false} />
      </div>
    </div>
  );
}`;

export const SKILL_TERMINAL_INPUT_HANDLING = `
KEYBOARD HANDLER:
const onKey = (e) => {
  if (e.key === 'Enter') { run(input); setInput(''); setHistoryIdx(-1); }
  if (e.key === 'ArrowUp') { e.preventDefault(); browseHistory(+1); }
  if (e.key === 'ArrowDown') { e.preventDefault(); browseHistory(-1); }
  if (e.key === 'Tab') { e.preventDefault(); autocomplete(); }
  if (e.key === 'c' && e.ctrlKey) { push('^C', 'input'); setInput(''); }
  if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); setHistory([]); }
};

TAB COMPLETION:
const autocomplete = () => {
  const cmds = Object.keys(COMMANDS);
  const matches = cmds.filter(c => c.startsWith(input));
  if (matches.length === 1) setInput(matches[0]);
  else if (matches.length > 1) push(matches.join('  '));
};

SIMULATED ASYNC COMMAND:
const runAsync = (msg, delay = 800) => {
  push('Processing...', 'info');
  setTimeout(() => push(msg, 'success'), delay);
};
`;

export const SKILL_TERMINAL_STATE_STRUCTURE = `
RECOMMENDED STATE:
const [history, setHistory] = useState([]);     // All rendered output lines
const [input, setInput] = useState('');          // Current input value
const [cmdHistory, setCmdHistory] = useState([]); // Submitted commands for ArrowUp
const [historyIdx, setHistoryIdx] = useState(-1); // -1 = fresh input

OUTPUT LINE SHAPE:
{ id: number, type: 'input'|'output'|'error'|'success'|'info'|'warning', text: string }

FILESYSTEM STATE (for file-system simulations):
const [cwd, setCwd] = useState('/home/user');
const [fs, setFs] = useState({
  '/home/user': { type: 'dir', children: ['README.md', 'projects'] },
  '/home/user/README.md': { type: 'file', content: '# Welcome\\n...' },
});
`;
