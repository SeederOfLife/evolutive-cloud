import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";
import { Copy, Check, Users, Link2, X, QrCode, UserX, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import {
  createInvite, getMyInvites, revokeInvite,
  getLinkedAccounts, unlinkAccount,
  getInviteUrl, Invite, LinkedAccount,
} from "../services/invites";

interface Props {
  user: User;
  onLinkedAccountsChange: () => void;
}

export function NetworkPanel({ user, onLinkedAccountsChange }: Props) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [linked, setLinked] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeInvite, setActiveInvite] = useState<Invite | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inv, lnk] = await Promise.all([
        getMyInvites(user.uid),
        getLinkedAccounts(user.uid),
      ]);
      setInvites(inv);
      setLinked(lnk);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [user.uid]);

  useEffect(() => { load(); }, [load]);

  const pendingInvites = invites.filter(
    inv => !inv.usedBy && !inv.revoked && new Date(inv.expiresAt) > new Date(),
  );

  const makeQR = async (token: string) => {
    const url = getInviteUrl(token);
    const dataUrl = await QRCode.toDataURL(url, {
      width: 180, margin: 2,
      color: { dark: "#ffffff", light: "#111827" },
    });
    setQrDataUrl(dataUrl);
  };

  const handleCreateInvite = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const displayName = user.displayName || user.email?.split("@")[0] || "User";
      const invite = await createInvite(user.uid, user.email || "", displayName);
      await makeQR(invite.token);
      setActiveInvite(invite);
      setInvites(prev => [...prev, invite]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId);
      setInvites(prev => prev.map(inv =>
        inv.id === inviteId ? { ...inv, revoked: true } : inv,
      ));
      if (activeInvite?.id === inviteId) setActiveInvite(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUnlink = async (lnk: LinkedAccount) => {
    try {
      await unlinkAccount(lnk.id, user.uid, lnk.linkedUserId);
      setLinked(prev => prev.filter(l => l.id !== lnk.id));
      onLinkedAccountsChange();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard write failed. Copy the link manually.");
    }
  };

  const handleShowInvite = async (inv: Invite) => {
    await makeQR(inv.token);
    setActiveInvite(inv);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center justify-between gap-2 p-3 bg-red-900/30 border border-red-800 rounded-lg text-xs text-red-300">
          <span className="min-w-0 truncate">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Invite a friend */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Invite a Friend
          </label>
          <button
            onClick={handleCreateInvite}
            disabled={isCreating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 rounded-lg text-xs font-bold text-white transition-all"
          >
            {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
            New Invite
          </button>
        </div>

        <AnimatePresence>
          {activeInvite && qrDataUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-800 rounded-xl p-4 space-y-3 mb-3">
                <button
                  onClick={() => setActiveInvite(null)}
                  className="ml-auto flex text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex justify-center">
                  <div className="rounded-xl overflow-hidden">
                    <img src={qrDataUrl} alt="Invite QR" className="w-32 h-32 block" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={getInviteUrl(activeInvite.token)}
                    className="flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-gray-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(getInviteUrl(activeInvite.token))}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-white transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {copied
                      ? <Check className="w-3 h-3 text-emerald-400" />
                      : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 text-center">
                  Expires {new Date(activeInvite.expiresAt).toLocaleDateString()} · Single use · Share this link or scan the QR code
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {pendingInvites.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">
              Pending ({pendingInvites.length})
            </p>
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center gap-2 px-3 py-2.5 bg-gray-800 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white font-mono">···{inv.token.slice(-8)}</p>
                  <p className="text-[10px] text-gray-500">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleShowInvite(inv)}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Show QR / link"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  title="Revoke invite"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Network */}
      <section>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          My Network ({linked.length})
        </label>
        {linked.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-gray-600 text-center">
            <Users className="w-7 h-7" />
            <p className="text-xs leading-relaxed max-w-[200px]">
              No linked accounts yet.<br />Invite a friend to share your galaxy.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {linked.map(lnk => (
              <div key={lnk.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-800 rounded-lg">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${lnk.linkedEmail}`}
                  alt=""
                  className="w-7 h-7 rounded-full bg-gray-700 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white font-medium truncate">
                    {lnk.linkedDisplayName || lnk.linkedEmail.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">{lnk.linkedEmail}</p>
                </div>
                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {lnk.role}
                </span>
                <button
                  onClick={() => handleUnlink(lnk)}
                  className="shrink-0 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove link"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
