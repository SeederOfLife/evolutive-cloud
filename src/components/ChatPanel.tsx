import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, ChevronRight, ChevronLeft, Wrench, Loader2, ArrowRight } from "lucide-react";

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  content: string;
  kind: 'text' | 'image';
}

const CHAT_SKILLS = [
  { id: 'phone',    label: '📱 Phone'    },
  { id: 'desktop',  label: '🖥️ Desktop'  },
  { id: 'game',     label: '🎮 Game'     },
  { id: 'terminal', label: '⌨️ Terminal' },
  { id: 'music',    label: '🎵 Music'    },
  { id: 'art',      label: '🎨 Art'      },
] as const;

interface ChatInputBarProps {
  lastError: string | null;
  isFixing: boolean;
  onSend: (text: string) => void;
  aiProvider?: string;
  providerOptions?: { id: string; label: string }[];
  onProviderSwitch?: (id: string) => void;
}

export const ChatInputBar = React.memo(function ChatInputBar({
  lastError, isFixing, onSend, aiProvider, providerOptions, onProviderSwitch,
}: ChatInputBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuSection, setMenuSection] = useState<null | 'skill' | 'provider'>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setMenuSection(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const formatSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

  const handleFiles = (files: FileList | null, kind: 'text' | 'image') => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          id: Math.random().toString(36).slice(2),
          name: file.name, size: file.size,
          content: kind === 'text' ? (reader.result as string) : '',
          kind,
        }]);
      };
      if (kind === 'image') reader.readAsDataURL(file);
      else reader.readAsText(file);
    });
    if (fileInputRef.current)  fileInputRef.current.value  = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeAttachment = (id: string) =>
    setAttachments(prev => prev.filter(a => a.id !== id));

  const submit = () => {
    const rawText = inputRef.current?.value.trim() ?? "";
    if (isFixing || (!rawText && attachments.length === 0)) return;

    const userText = rawText || `Use the attached ${attachments.length === 1 ? 'file' : 'files'} as reference.`;
    const MAX_CHARS = 4000;
    let totalChars = 0;
    const ctxParts: string[] = [];

    for (const att of attachments) {
      if (att.kind === 'image') { ctxParts.push(`[Reference image attached: ${att.name}]`); continue; }
      const remaining = MAX_CHARS - totalChars;
      if (remaining <= 0) { ctxParts.push(`[${att.name}: omitted — 4000-char context limit reached]`); continue; }
      const snippet = att.content.length > remaining ? att.content.slice(0, remaining) + '\n[... truncated]' : att.content;
      ctxParts.push(`REFERENCE FILE (${att.name}):\n${snippet}`);
      totalChars += snippet.length;
    }

    const fullMessage = ctxParts.length > 0 ? `${ctxParts.join('\n\n')}\n\n${userText}` : userText;
    onSend(fullMessage.trim());
    if (inputRef.current) inputRef.current.value = "";
    setAttachments([]);
  };

  return (
    <div className="flex-none p-3 border-t border-gray-800 space-y-2">
      {lastError && !isFixing && (
        <button onClick={() => onSend(`Fix this error: ${lastError}`)}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 rounded-lg text-[11px] font-bold text-red-400 transition-all">
          <Wrench className="w-3 h-3" /> Fix Error
        </button>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-indigo-950/60 border border-indigo-700/50 rounded-full text-[10px] text-indigo-300 max-w-[180px]">
              <span className="shrink-0">{att.kind === 'image' ? '🖼️' : '📎'}</span>
              <span className="truncate">{att.name}</span>
              <span className="text-indigo-500 shrink-0 ml-0.5">({formatSize(att.size)})</span>
              <button onClick={() => removeAttachment(att.id)}
                className="shrink-0 ml-0.5 w-3.5 h-3.5 rounded-full bg-indigo-800/50 hover:bg-red-700/60 flex items-center justify-center transition-colors">
                <X className="w-2 h-2" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <div className="relative shrink-0" ref={menuRef}>
          <input ref={fileInputRef} type="file" accept=".txt,.csv,.json,.md" multiple className="hidden"
            onChange={e => { handleFiles(e.target.files, 'text'); setShowMenu(false); }} />
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { handleFiles(e.target.files, 'image'); setShowMenu(false); }} />

          <button type="button" onClick={() => { setMenuSection(null); setShowMenu(s => !s); }} disabled={isFixing}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all disabled:opacity-40 ${showMenu ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="Attach files or switch options">
            <Plus className="w-3.5 h-3.5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.1 }}
                className="absolute bottom-full left-0 mb-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[300]"
              >
                {menuSection === null && (
                  <div className="py-1">
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => fileInputRef.current?.click()}>
                      <span className="text-base leading-none">📎</span><span className="flex-1">Attach file</span><span className="text-[9px] text-gray-600">.txt .csv .json .md</span>
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => imageInputRef.current?.click()}>
                      <span className="text-base leading-none">🖼️</span><span className="flex-1">Attach image</span>
                    </button>
                    <div className="h-px bg-gray-800 mx-3 my-1" />
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => setMenuSection('skill')}>
                      <span className="text-base leading-none">🎯</span><span className="flex-1">Choose skill</span><ChevronRight className="w-3 h-3 opacity-40" />
                    </button>
                    {providerOptions && providerOptions.length > 0 && (
                      <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left" onClick={() => setMenuSection('provider')}>
                        <span className="text-base leading-none">⚙️</span><span className="flex-1">AI provider</span><ChevronRight className="w-3 h-3 opacity-40" />
                      </button>
                    )}
                  </div>
                )}

                {menuSection === 'skill' && (
                  <div className="py-1">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
                      <button onClick={() => setMenuSection(null)} className="text-gray-500 hover:text-gray-300 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                      <span className="text-[9px] font-black uppercase tracking-[3px] text-gray-500">Choose Skill</span>
                    </div>
                    {CHAT_SKILLS.map(skill => (
                      <button key={skill.id} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-left"
                        onClick={() => {
                          const msg = `Rebuild this as a ${skill.id} type app — adapt design, layout, and interactions for ${skill.id}.`;
                          if (inputRef.current) { inputRef.current.value = msg; inputRef.current.focus(); }
                          setShowMenu(false); setMenuSection(null);
                        }}>
                        <span className="text-base leading-none">{skill.label.split(' ')[0]}</span>
                        <span>{skill.label.split(' ').slice(1).join(' ')}</span>
                      </button>
                    ))}
                  </div>
                )}

                {menuSection === 'provider' && (
                  <div className="py-1">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
                      <button onClick={() => setMenuSection(null)} className="text-gray-500 hover:text-gray-300 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                      <span className="text-[9px] font-black uppercase tracking-[3px] text-gray-500">AI Provider</span>
                    </div>
                    {(providerOptions || []).map(p => (
                      <button key={p.id}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] transition-colors text-left ${aiProvider === p.id ? 'text-indigo-300 bg-indigo-500/10' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                        onClick={() => { onProviderSwitch?.(p.id); setShowMenu(false); setMenuSection(null); }}>
                        {aiProvider === p.id ? <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-0.5" /> : <span className="w-1.5 h-1.5 shrink-0" />}
                        <span className="flex-1">{p.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input ref={inputRef} type="text"
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && submit()}
          placeholder={attachments.length > 0 ? "What to do with these files?" : "Improve or change this app..."}
          disabled={isFixing}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} name="chat-message"
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40"
        />

        <button onClick={submit} disabled={isFixing}
          className="w-9 h-9 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 rounded-lg flex items-center justify-center text-white transition-all shrink-0">
          {isFixing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
});

interface ChatMessagesProps {
  messages: Array<{ role: string; text: string }>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessages = React.memo(function ChatMessages({ messages, containerRef }: ChatMessagesProps) {
  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
      {messages.length === 0 && (
        <p className="text-[11px] text-gray-600 text-center mt-8 leading-relaxed px-2">
          Describe changes or ask the AI to fix errors.
        </p>
      )}
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[88%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
            msg.role === "user" ? "bg-indigo-600 text-white"
            : msg.text.startsWith("⚠️") ? "bg-red-900/30 text-red-300 border border-red-800/40"
            : msg.text.startsWith("↑") ? "bg-amber-900/30 text-amber-300 border border-amber-800/40"
            : msg.text.startsWith("↻") ? "bg-orange-900/30 text-orange-300 border border-orange-800/40"
            : "bg-gray-800 text-gray-300 border border-gray-700/60"
          }`}>{msg.text}</div>
        </div>
      ))}
    </div>
  );
});
