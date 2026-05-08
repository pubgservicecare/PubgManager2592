import { useState, useEffect } from "react";
import {
  Share2,
  Check,
  MessageCircle,
  Copy,
  Facebook,
  X,
  Send,
  Link as LinkIcon,
  Twitter,
} from "lucide-react";

export function ShareButton({
  accountId,
  title,
  className = "",
}: {
  accountId: number;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/share/account/${accountId}`
      : `/api/share/account/${accountId}`;

  const message = `Check out this PUBG account: ${title}`;
  const fullMessage = `${message}\n${shareUrl}`;

  // Lock background scroll when sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleNative = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title,
          text: message,
          url: shareUrl,
        });
        return;
      } catch {
        // user dismissed — fall back to our sheet
      }
    }
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const channels: {
    key: string;
    label: string;
    href: string;
    icon: React.ReactNode;
    bg: string;
    text: string;
    border: string;
  }[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(fullMessage)}`,
      icon: <MessageCircle className="w-5 h-5" />,
      bg: "bg-[#25D366]/10 hover:bg-[#25D366]/20",
      text: "text-[#25D366]",
      border: "border-[#25D366]/30",
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        shareUrl,
      )}`,
      icon: <Facebook className="w-5 h-5" />,
      bg: "bg-[#1877F2]/10 hover:bg-[#1877F2]/20",
      text: "text-[#4F9CFF]",
      border: "border-[#1877F2]/30",
    },
    {
      key: "twitter",
      label: "Twitter / X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        message,
      )}&url=${encodeURIComponent(shareUrl)}`,
      icon: <Twitter className="w-5 h-5" />,
      bg: "bg-white/5 hover:bg-white/10",
      text: "text-white",
      border: "border-white/15",
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(
        shareUrl,
      )}&text=${encodeURIComponent(message)}`,
      icon: <Send className="w-5 h-5" />,
      bg: "bg-[#229ED9]/10 hover:bg-[#229ED9]/20",
      text: "text-[#5AC8F2]",
      border: "border-[#229ED9]/30",
    },
  ];

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleNative}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50 font-bold text-sm transition-all hover:scale-[1.02] active:scale-95"
        data-testid={`share-account-${accountId}`}
        aria-label="Share this account"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          data-testid="share-sheet-overlay"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom sm:fade-in">
            {/* Drag handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <Share2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-display font-bold text-white">
                    Share Account
                  </h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[220px] sm:max-w-[260px]">
                    {title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-white hover:bg-secondary/60 transition-colors"
                aria-label="Close share menu"
                data-testid="share-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Channels grid */}
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3 px-1">
                Share via
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {channels.map((ch) => (
                  <a
                    key={ch.key}
                    href={ch.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${ch.bg} ${ch.text} ${ch.border} font-bold text-sm transition-colors`}
                    data-testid={`share-channel-${ch.key}`}
                  >
                    {ch.icon}
                    <span className="truncate">{ch.label}</span>
                  </a>
                ))}
              </div>

              {/* Copy link */}
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2 px-1">
                  Or copy link
                </p>
                <div className="flex items-stretch gap-2 bg-background border border-border rounded-xl p-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0 px-2 text-sm text-muted-foreground">
                    <LinkIcon className="w-4 h-4 flex-shrink-0 text-primary/70" />
                    <span className="truncate" title={shareUrl}>
                      {shareUrl.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copy}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-colors ${
                      copied
                        ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    data-testid="share-copy-link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:text-white hover:border-white/30 font-bold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
