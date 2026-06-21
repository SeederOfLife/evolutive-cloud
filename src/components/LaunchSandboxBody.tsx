import { type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Zap, Loader2, MessageSquare } from "lucide-react";
import { AppSandbox } from "./AppSandbox";
import { ChatInputBar, ChatMessages } from "./ChatPanel";

interface Props {
  code: string;
  appType: any;
  onError: (msg: string) => void;
  isTruncated: boolean;
  isFixing: boolean;
  lastError: string | null;
  showChat: boolean;
  setShowChat: React.Dispatch<React.SetStateAction<boolean>>;
  hasRefine: boolean;
  sendMessage: (msg: string) => void;
  messages: { role: "user" | "ai"; text: string }[];
  desktopChatContainerRef: RefObject<HTMLDivElement>;
  mobileChatContainerRef: RefObject<HTMLDivElement>;
  chatProvider?: string;
  chatProviderOptions?: { id: string; label: string }[];
  onChatProviderSwitch?: (id: string) => void;
}

export function LaunchSandboxBody({
  code, appType, onError, isTruncated, isFixing, lastError,
  showChat, setShowChat, hasRefine, sendMessage, messages,
  desktopChatContainerRef, mobileChatContainerRef,
  chatProvider, chatProviderOptions, onChatProviderSwitch,
}: Props) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 relative min-w-0">
        <AppSandbox code={code} appType={appType} className="absolute inset-0 w-full h-full" onError={onError} />

        {/* Truncation overlay */}
        <AnimatePresence>
          {isTruncated && !isFixing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center z-[500] bg-black/50 backdrop-blur-sm pointer-events-none">
              <div className="flex flex-col items-center gap-3 pointer-events-auto px-6 text-center">
                <p className="text-xs font-bold text-amber-300 max-w-[220px] leading-snug">Code was truncated — app is incomplete</p>
                <button
                  onClick={() => sendMessage("The generated code was truncated (incomplete). Please generate a COMPLETE working version. Simplify the design if needed to fit within your response limit.")}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 rounded-xl text-sm font-bold text-black shadow-2xl transition-all active:scale-95">
                  <Zap className="w-4 h-4" />Fix with AI
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Runtime error button */}
        <AnimatePresence>
          {!isTruncated && lastError && !isFixing && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-4 left-0 right-0 flex justify-center z-[9999] pointer-events-none">
              <button onClick={() => sendMessage(`Fix this runtime error: ${lastError}`)}
                className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold text-white shadow-xl transition-all active:scale-95">
                <Zap className="w-4 h-4" />Fix with AI
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile chat FAB */}
        {hasRefine && (
          <button onClick={() => setShowChat(p => !p)}
            className={`sm:hidden absolute bottom-4 right-4 z-20 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90 ${showChat ? "bg-indigo-600 text-white" : "bg-gray-900/80 backdrop-blur-sm border border-white/10 text-white"}`}>
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Desktop side chat */}
      <div className="hidden sm:flex shrink-0">
        <AnimatePresence>
          {showChat && hasRefine && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.18 }}
              className="flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden">
              <div className="flex-none px-4 py-2.5 border-b border-gray-800 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black uppercase tracking-[3px] text-white/50">AI Chat</span>
                {isFixing && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
              </div>
              <ChatMessages messages={messages} containerRef={desktopChatContainerRef} />
              <ChatInputBar lastError={lastError} isFixing={isFixing} onSend={sendMessage}
                aiProvider={chatProvider} providerOptions={chatProviderOptions} onProviderSwitch={onChatProviderSwitch} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile bottom sheet chat */}
      <AnimatePresence>
        {showChat && hasRefine && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="sm:hidden absolute bottom-0 left-0 right-0 z-[200] flex flex-col bg-gray-950 rounded-t-2xl border-t border-gray-800 shadow-2xl overflow-hidden"
            style={{ height: "70%" }}>
            <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-gray-700" /></div>
            <div className="flex-none px-4 py-2 border-b border-gray-800 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[3px] text-white/50">AI Chat</span>
              <div className="flex items-center gap-2">
                {isFixing && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                <button onClick={() => setShowChat(false)} className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <ChatMessages messages={messages} containerRef={mobileChatContainerRef} />
            <ChatInputBar lastError={lastError} isFixing={isFixing} onSend={sendMessage}
              aiProvider={chatProvider} providerOptions={chatProviderOptions} onProviderSwitch={onChatProviderSwitch} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
