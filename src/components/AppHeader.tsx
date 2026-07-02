import { Zap, Settings, User } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";

interface Props {
  user: FirebaseUser | null;
  neuralStatus: string;
  view: "galaxy" | "feed" | "hub" | "water";
  setView: (v: "galaxy" | "feed" | "hub" | "water") => void;
  builtCount: number;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export function AppHeader({ user, neuralStatus, view, setView, builtCount, onOpenSettings, onOpenAuth }: Props) {
  const tabs = ["galaxy", "feed", "hub", "water"] as const;
  return (
    <header className="flex-none h-14 bg-gray-900 border-b border-gray-800 flex items-center px-3 sm:px-4 gap-2 sm:gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white hidden sm:block tracking-wide">EVOLUTIVE</span>
        <span className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${neuralStatus === "IDLE" ? "bg-gray-800 text-gray-500" : "bg-indigo-500/20 text-indigo-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${neuralStatus === "IDLE" ? "bg-gray-600" : "bg-indigo-400 animate-pulse"}`} />
          <span className="hidden sm:inline">{neuralStatus}</span>
        </span>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="flex bg-gray-800 rounded-lg p-1 gap-0.5 sm:gap-1">
          {tabs.map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${view === v ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white"}`}>
              <span className="sm:hidden font-black">{v.charAt(0).toUpperCase()}</span>
              <span className="hidden sm:inline uppercase">{v}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span className="text-xs text-gray-500 hidden sm:block">
          BUILDS: <span className="text-white font-medium">{builtCount}</span>
        </span>
        <button onClick={onOpenSettings}
          className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all">
          <Settings className="w-4 h-4" />
        </button>
        {user ? (
          <button onClick={onOpenAuth}
            className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center sm:gap-2 transition-all">
            <img src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
              alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
            <span className="hidden sm:block max-w-[80px] truncate text-sm text-gray-300">{user.email?.split("@")[0]}</span>
          </button>
        ) : (
          <button onClick={onOpenAuth}
            className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg flex items-center justify-center transition-all">
            <User className="w-4 h-4 text-white sm:hidden" />
            <span className="hidden sm:block text-sm font-medium text-white">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
