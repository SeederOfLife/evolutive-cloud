import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Share2, Copy, Check, QrCode, X } from "lucide-react";
import QRCode from "qrcode";

interface Props {
  appId: string;
  appTitle: string;
}

export function ShareMenu({ appId, appTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const shareUrl = `${window.location.origin}/app/${appId}`;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleShowQR = async () => {
    setOpen(false);
    const dataUrl = await QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#ffffff", light: "#111827" },
    });
    setQrDataUrl(dataUrl);
    setShowQR(true);
  };

  const handleShareX = () => {
    const text = encodeURIComponent(`Check out this app I built on Evolutive: "${appTitle}"`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={() => setOpen(p => !p)}
          className={`flex w-8 h-8 rounded-lg items-center justify-center transition-all ${
            open ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
          title="Share app"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute top-full right-0 mt-1.5 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[9998]"
            >
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy link"}
              </button>

              <button
                onClick={handleShareX}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-all"
              >
                {/* X (Twitter) logo */}
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </button>

              <button
                onClick={handleShowQR}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-all"
              >
                <QrCode className="w-3.5 h-3.5" />
                Show QR code
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QR modal */}
      <AnimatePresence>
        {showQR && qrDataUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between w-full">
                <p className="text-sm font-semibold text-white">Scan to open</p>
                <button onClick={() => setShowQR(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden">
                <img src={qrDataUrl} alt="App QR code" className="w-48 h-48 block" />
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-all"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy link"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
