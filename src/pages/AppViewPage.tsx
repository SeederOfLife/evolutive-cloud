import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc } from "firebase/firestore";
import { Lock, Sparkles, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { getLinkedAccounts } from "../services/invites";
import { AppSandbox } from "../components/AppSandbox";
import { Suggestion } from "../types";

export function AppViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthLoading } = useAuth();

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  // Load the app from Firestore
  useEffect(() => {
    if (!id) { setError("No app ID provided."); setIsLoading(false); return; }
    getDoc(doc(db, "suggestions", id))
      .then(snap => {
        if (!snap.exists()) { setError("App not found."); return; }
        const s = { id: snap.id, ...snap.data() } as Suggestion;
        if (s.status !== "built" || !s.built_code) { setError("This app hasn't been built yet."); return; }
        setSuggestion(s);
      })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  // Check access once both auth state and suggestion are resolved
  useEffect(() => {
    if (isAuthLoading || !suggestion) return;
    if (!suggestion.visibility || suggestion.visibility === "public") {
      setAccessGranted(true);
      return;
    }
    // Private: owner always has access
    if (user && suggestion.user_id && user.uid === suggestion.user_id) {
      setAccessGranted(true);
      return;
    }
    // Private: linked accounts have access
    if (user && suggestion.user_id) {
      getLinkedAccounts(user.uid)
        .then(accounts => {
          const linked = accounts.some(a => a.linkedUserId === suggestion.user_id);
          setAccessGranted(linked);
          if (!linked) setError("This app is private. You need to be linked with its creator to view it.");
        })
        .catch(() => setError("This app is private."));
    } else {
      setError("This app is private. Sign in to check if you have access.");
    }
  }, [isAuthLoading, suggestion, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delayed CTA
  useEffect(() => {
    if (!accessGranted) return;
    const t = setTimeout(() => setShowCTA(true), 2500);
    return () => clearTimeout(t);
  }, [accessGranted]);

  const title = suggestion
    ? (suggestion.content.length > 50 ? suggestion.content.substring(0, 50) + "…" : suggestion.content)
    : "Loading…";

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ height: "100dvh" }}>
      {/* Top bar */}
      <div className="flex-none h-10 bg-gray-900/95 border-b border-gray-800 flex items-center px-3 gap-3 shrink-0 z-10">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors shrink-0"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold tracking-wide">Evolutive</span>
        </Link>

        <span className="text-gray-700 text-sm shrink-0">/</span>

        <span className="flex-1 text-xs text-white/70 truncate min-w-0">{title}</span>

        {suggestion?.visibility === "private" && (
          <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        )}

        <a
          href="/"
          className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all shrink-0"
        >
          Try Free
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading || isAuthLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-white text-base font-semibold max-w-xs">{error}</p>
            <a
              href="/"
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-all"
            >
              Go to Evolutive
            </a>
          </div>
        ) : accessGranted && suggestion?.built_code ? (
          <AppSandbox code={suggestion.built_code} appType={suggestion.app_type} className="w-full h-full" />
        ) : null}
      </div>

      {/* Delayed bottom CTA */}
      <AnimatePresence>
        {showCTA && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          >
            <a
              href="/"
              className="flex items-center gap-2 px-5 py-3 bg-gray-900/95 border border-gray-700 rounded-full shadow-2xl text-white text-xs font-semibold whitespace-nowrap backdrop-blur-sm hover:border-indigo-500/50 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              Build your own app on Evolutive — it's free
              <button
                onClick={e => { e.preventDefault(); setShowCTA(false); }}
                className="ml-1 text-gray-500 hover:text-white transition-colors"
              >
                ×
              </button>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
