import { motion } from "motion/react";
import { X, Loader2, LogOut } from "lucide-react";
import type { Suggestion } from "../types";

export interface AuthModalProps {
  onClose: () => void;
  user: any;
  authEmail: string;
  setAuthEmail: (v: string) => void;
  authPassword: string;
  setAuthPassword: (v: string) => void;
  isSignUp: boolean;
  setIsSignUp: (v: boolean) => void;
  authError: string | null;
  isAuthLoading: boolean;
  signInWithEmail: (email: string, password: string, isSignUp: boolean) => void;
  signInWithGoogle: () => void;
  signInWithGithub: () => void;
  logout: () => void;
  suggestions: Suggestion[];
}

export function AuthModal({
  onClose, user, authEmail, setAuthEmail, authPassword, setAuthPassword,
  isSignUp, setIsSignUp, authError, isAuthLoading,
  signInWithEmail, signInWithGoogle, signInWithGithub, logout, suggestions,
}: AuthModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm overflow-y-auto max-h-[90vh] sm:max-h-[85vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2 sm:hidden" />
          <h2 className="text-base font-semibold text-white">
            {user ? "Account" : isSignUp ? "Create Account" : "Sign In"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                  alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.email?.split("@")[0]}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-lg font-bold text-white">{suggestions.filter((s) => s.user_id === user.uid).length}</p>
                  <p className="text-xs text-gray-400">Ideas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{suggestions.filter((s) => s.user_id === user.uid && s.status === "built").length}</p>
                  <p className="text-xs text-gray-400">Builds</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{suggestions.filter((s) => s.user_id === user.uid).reduce((a, s) => a + (s.votes || 0), 0)}</p>
                  <p className="text-xs text-gray-400">Votes</p>
                </div>
              </div>
              <button onClick={() => { logout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800 rounded-lg text-sm text-red-400 hover:text-red-300 transition-all">
                <LogOut className="w-4 h-4" />Sign Out
              </button>
            </>
          ) : (
            <>
              {authError && <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">{authError}</div>}
              <input type="email" placeholder="Email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              <input type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signInWithEmail(authEmail, authPassword, isSignUp)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors" />
              <button onClick={() => signInWithEmail(authEmail, authPassword, isSignUp)} disabled={isAuthLoading}
                className="w-full flex items-center justify-center py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-all">
                {isAuthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSignUp ? "Create Account" : "Sign In"}
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <button onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-white transition-all">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
              <button onClick={signInWithGithub}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-white transition-all">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.11.825-.26.825-.58 0-.285-.015-1.23-.015-2.23-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .32.225.7.825.58C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
              <button onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1">
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
