import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User } from "firebase/auth";
import { Check, X, UserPlus, Loader2 } from "lucide-react";
import { getInviteByToken, acceptInvite, Invite } from "../services/invites";

interface Props {
  token: string;
  user: User | null;
  onAccepted: () => void;
  onClose: () => void;
  onSignInRequired: () => void;
}

export function JoinModal({ token, user, onAccepted, onClose, onSignInRequired }: Props) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the invite
  useEffect(() => {
    getInviteByToken(token)
      .then(inv => {
        if (!inv) { setError("Invite not found or invalid."); return; }
        if (inv.revoked) { setError("This invite has been revoked."); return; }
        if (inv.usedBy) { setError("This invite has already been used."); return; }
        if (new Date(inv.expiresAt) < new Date()) { setError("This invite has expired."); return; }
        setInvite(inv);
      })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  // Auto-accept once both user and a valid invite are loaded
  useEffect(() => {
    if (!user || !invite || accepted || isAccepting || error) return;
    if (invite.ownerId === user.uid) {
      setError("You can't accept your own invite.");
      return;
    }
    handleAccept();
  }, [user?.uid, invite?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async () => {
    if (!user || !invite) return;
    setIsAccepting(true);
    setError(null);
    try {
      const displayName = user.displayName || user.email?.split("@")[0] || "User";
      await acceptInvite(invite, user.uid, user.email || "", displayName);
      setAccepted(true);
      setTimeout(() => {
        window.history.replaceState({}, "", "/");
        onAccepted();
      }, 1800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSignInRequired = () => {
    localStorage.setItem("pending_invite_token", token);
    onSignInRequired();
    onClose();
  };

  const handleClose = () => {
    window.history.replaceState({}, "", "/");
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-gray-400">Checking invite...</p>
          </div>

        ) : accepted ? (
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Connected!</h2>
              <p className="text-gray-400 text-sm">
                You're now linked with{" "}
                <span className="text-white font-semibold">
                  {invite?.ownerDisplayName || invite?.ownerEmail?.split("@")[0] || "your friend"}
                </span>.
              </p>
              <p className="text-indigo-400 text-xs mt-2">Their apps will appear in your galaxy.</p>
            </div>
          </div>

        ) : error ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Can't Join</h2>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
            <button
              onClick={handleClose}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl transition-all"
            >
              Go to App
            </button>
          </div>

        ) : invite ? (
          <div className="flex flex-col items-center gap-5">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[4px] text-indigo-400 mb-2">
                Workspace Invite
              </p>
              <h2 className="text-white text-xl font-bold mb-2">
                <span className="text-indigo-300">
                  {invite.ownerDisplayName || invite.ownerEmail.split("@")[0]}
                </span>{" "}
                invited you
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Link your account to share your galaxy and apps with each other.
              </p>
            </div>

            {user ? (
              <div className="w-full space-y-2">
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  {isAccepting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />}
                  Accept & Link
                </button>
                <button
                  onClick={handleClose}
                  className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                  Decline
                </button>
              </div>
            ) : (
              <div className="w-full space-y-3">
                <p className="text-xs text-gray-500">Sign in or create an account to accept this invite.</p>
                <button
                  onClick={handleSignInRequired}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign In to Accept
                </button>
                <button
                  onClick={handleClose}
                  className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                  Maybe later
                </button>
              </div>
            )}
          </div>

        ) : null}
      </motion.div>
    </motion.div>
  );
}
