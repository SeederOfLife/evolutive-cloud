/**
 * SKILL_DESKTOP: Rich Desktop / Productivity App Generation
 * Expert system prompt for generating complex multi-panel web apps in iframe sandbox
 */

export const SKILL_DESKTOP_SYSTEM_PROMPT = `You are an expert desktop application developer. Generate a complete, runnable React component that creates a rich, multi-panel productivity interface.

CRITICAL REQUIREMENTS:
- Use React hooks (useState, useEffect, useRef, useMemo, useCallback) to manage all state
- Build multi-panel layouts: sidebar + main content + optional detail/inspector panel
- Support keyboard shortcuts via useEffect + keydown listener (cleanup on unmount)
- All data is local — no external fetch, no auth, no backend
- App must be fully functional without imports — all globals available on window
- Dense information display: tables, lists, cards, toolbars, tabs

SANDBOX GLOBALS AVAILABLE:
- React 18 (useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer)
- ReactDOM.createRoot
- Tailwind CSS classes
- Lucide icons as window globals (Search, Settings, Plus, Trash, Edit, Eye, etc.)
- Recharts (LineChart, BarChart, PieChart, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend)
- Framer Motion (motion.div, AnimatePresence)
- React state and useReducer for all data (localStorage is NOT available in the sandbox — do NOT use it)

LAYOUT PATTERN:
1. Outer shell: full-height flex row (sidebar | main | detail)
2. Sidebar: fixed width, collapsible, nav items with active state
3. Main: flex-col with toolbar row + scrollable content area
4. Detail/Inspector: slides in from right when item selected
5. Modal/Dialog: absolute overlay with backdrop blur for forms

COMMON MISTAKES TO AVOID:
- Putting all state at top level — colocate state where it's used
- Rebuilding derived data in render — use useMemo for filtered/sorted lists
- Inline event handlers that recreate on every render — useCallback for handlers passed to children
- Not handling empty states — always show an empty state UI when lists are empty
- Fixed pixel sizes — use flex, min-h-0, overflow-hidden for proper panel sizing

STATE STRUCTURE:
{
  activeView: string,        // Current main panel ('dashboard', 'list', 'settings')
  selectedId: string | null, // Currently selected item for detail panel
  items: Item[],             // Primary data collection
  searchQuery: string,       // Filter string
  sortBy: string,            // Sort field
  sidebarOpen: boolean,      // Sidebar collapse state
}

INPUT HANDLING:
- Keyboard shortcuts: Cmd/Ctrl+K for search, Escape to close modals/deselect
- Click row to select, double-click to edit inline
- Drag handle on panel borders for resize (optional, use CSS resize as fallback)`;

export const SKILL_DESKTOP_MISTAKES = [
  {
    mistake: "Using fixed heights instead of flex layout for panels",
    solution: "Use `h-screen flex flex-col` on root, `flex-1 min-h-0 overflow-auto` on scrollable panels",
    example: "Panel content gets cut off or overflows the viewport when items are added"
  },
  {
    mistake: "Filtering/sorting data directly in render without memoization",
    solution: "Wrap derived lists in useMemo: `const filtered = useMemo(() => items.filter(...), [items, query])`",
    example: "Large lists re-sort on every keystroke unrelated to sort state, causing jank"
  },
  {
    mistake: "Trying to use localStorage for persistence (not available in sandbox)",
    solution: "Use React useState with rich initial data so the app looks populated on first render",
    example: "localStorage throws SecurityError in the sandbox; pre-populate state with realistic sample data instead"
  }
];

export const SKILL_DESKTOP_TEMPLATE = `export default function App() {
  const [activeView, setActiveView] = useState('list');
  const [items, setItems] = useState([
    { id: '1', title: 'Item One', status: 'active', priority: 'high' },
    { id: '2', title: 'Item Two', status: 'done', priority: 'low' },
  ]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => items.filter(i => i.title.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  const selected = useMemo(() => items.find(i => i.id === selectedId), [items, selectedId]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen flex bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-white/10 flex flex-col p-3 gap-1">
        {['list', 'dashboard', 'settings'].map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={\`px-3 py-2 rounded-lg text-sm capitalize text-left transition
              \${activeView === v ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-white/5'}\`}>
            {v}
          </button>
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-12 flex items-center gap-3 px-4 border-b border-white/10 flex-shrink-0">
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search..." className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none" />
          <button onClick={() => setItems(p => [...p, { id: Date.now().toString(), title: 'New Item', status: 'active', priority: 'medium' }])}
            className="px-3 py-1.5 bg-indigo-600 rounded-lg text-sm font-medium">+ Add</button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {filtered.map(item => (
            <div key={item.id} onClick={() => setSelectedId(item.id)}
              className={\`p-3 rounded-xl border cursor-pointer transition
                \${selectedId === item.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}\`}>
              <div className="font-medium text-sm">{item.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.status} · {item.priority}</div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-500 mt-16 text-sm">No items match your search</div>}
        </div>
      </main>

      {/* Detail panel */}
      {selected && (
        <aside className="w-72 flex-shrink-0 bg-gray-900 border-l border-white/10 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">{selected.title}</h2>
            <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="space-y-3 text-sm text-gray-400">
            <div>Status: <span className="text-white">{selected.status}</span></div>
            <div>Priority: <span className="text-white">{selected.priority}</span></div>
          </div>
        </aside>
      )}
    </div>
  );
}`;

export const SKILL_DESKTOP_INPUT_HANDLING = `
KEYBOARD SHORTCUTS:
useEffect(() => {
  const handler = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    if (e.key === 'Escape') { setSelectedId(null); setModalOpen(false); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openNewItemForm(); }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);

INLINE EDITING:
const [editingId, setEditingId] = useState(null);
// Double-click row: setEditingId(item.id)
// Blur or Enter: commit edit, setEditingId(null)

DRAG TO REORDER:
// Use HTML5 draggable + onDragOver/onDrop for list reordering
// Store draggedId in ref, swap positions in items array on drop
`;

export const SKILL_DESKTOP_STATE_STRUCTURE = `
RECOMMENDED STATE:
const [activeView, setActiveView] = useState('list');    // Current page/tab
const [items, setItems] = useState([]);                  // Primary data
const [selectedId, setSelectedId] = useState(null);      // Detail panel subject
const [editingId, setEditingId] = useState(null);        // Inline edit target
const [query, setQuery] = useState('');                  // Search filter
const [sortBy, setSortBy] = useState('title');           // Sort field
const [sortDir, setSortDir] = useState('asc');           // Sort direction
const [sidebarOpen, setSidebarOpen] = useState(true);    // Sidebar collapse
const [modalOpen, setModalOpen] = useState(false);       // Create/edit modal

DERIVED STATE (always useMemo):
const filtered = useMemo(() =>
  items
    .filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sortDir === 'asc' ? a[sortBy].localeCompare(b[sortBy]) : b[sortBy].localeCompare(a[sortBy])),
  [items, query, sortBy, sortDir]
);
`;
