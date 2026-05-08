import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useLocation } from "wouter";

let cachedIds: Set<number> | null = null;
const subscribers = new Set<(s: Set<number>) => void>();

async function loadWishlistIds(force = false): Promise<Set<number>> {
  if (cachedIds && !force) return cachedIds;
  try {
    const r = await fetch("/api/wishlist/ids", { credentials: "include" });
    if (r.ok) {
      const ids: number[] = await r.json();
      cachedIds = new Set(ids);
    } else {
      cachedIds = new Set();
    }
  } catch {
    cachedIds = new Set();
  }
  subscribers.forEach((cb) => cb(cachedIds!));
  return cachedIds;
}

export function clearWishlistCache() {
  cachedIds = null;
}

export function useWishlistIds() {
  const { customer } = useCustomerAuth();
  const [ids, setIds] = useState<Set<number>>(cachedIds ?? new Set());
  useEffect(() => {
    if (!customer) {
      setIds(new Set());
      cachedIds = null;
      return;
    }
    loadWishlistIds().then(setIds);
    subscribers.add(setIds);
    return () => {
      subscribers.delete(setIds);
    };
  }, [customer]);
  return ids;
}

export function WishlistButton({
  accountId,
  className = "",
  variant = "icon",
}: {
  accountId: number;
  className?: string;
  variant?: "icon" | "button";
}) {
  const { customer } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const ids = useWishlistIds();
  const [busy, setBusy] = useState(false);
  const inWishlist = ids.has(accountId);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!customer) {
      setLocation("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (inWishlist) {
        await fetch(`/api/wishlist/${accountId}`, {
          method: "DELETE",
          credentials: "include",
        });
        cachedIds?.delete(accountId);
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });
        cachedIds?.add(accountId);
      }
      const next = new Set(cachedIds ?? []);
      cachedIds = next;
      subscribers.forEach((cb) => cb(next));
    } finally {
      setBusy(false);
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 ${
          inWishlist
            ? "bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25"
            : "bg-secondary border-border text-white hover:border-rose-500/40 hover:text-rose-300"
        } ${className}`}
        data-testid={`wishlist-toggle-${accountId}`}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
        )}
        <span className="truncate">{inWishlist ? "In Wishlist" : "Wishlist"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 transition-colors ${
        inWishlist ? "text-rose-400" : "text-white hover:text-rose-300"
      } ${className}`}
      data-testid={`wishlist-toggle-${accountId}`}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
      )}
    </button>
  );
}
