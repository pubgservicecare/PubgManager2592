import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/api-url";
import { PublicLayout } from "@/components/PublicLayout";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSEO } from "@/hooks/use-seo";
import { formatCurrency } from "@/lib/helpers";
import { Heart, Gamepad2, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { clearWishlistCache } from "@/components/WishlistButton";

interface WishlistItem {
  id: number;
  accountId: number;
  createdAt: string;
  account: {
    id: number;
    title: string;
    accountId: string;
    priceForSale: number;
    status: string;
    imageUrls?: string[];
  } | null;
}

export function WishlistPage() {
  const { customer, isLoading } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  useSEO({ title: "My Wishlist", description: "Saved PUBG accounts you love." });

  useEffect(() => {
    if (!isLoading && !customer) setLocation("/login");
  }, [customer, isLoading, setLocation]);

  const reload = async () => {
    const r = await fetch(apiUrl("/api/wishlist"), { credentials: "include" });
    if (r.ok) setItems(await r.json());
  };

  useEffect(() => {
    if (customer) reload();
  }, [customer]);

  const remove = async (accId: number) => {
    setRemoving(accId);
    try {
      await fetch(apiUrl(`/api/wishlist/${accId}`), {
        method: "DELETE",
        credentials: "include",
      });
      clearWishlistCache();
      await reload();
    } finally {
      setRemoving(null);
    }
  };

  if (isLoading || !customer) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
            Saved For Later
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">My Wishlist</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Quick access to the accounts you're keeping an eye on.
          </p>
        </div>

        {items === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl aspect-[3/4] animate-pulse border border-border/50" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border px-4">
            <Heart className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">Your wishlist is empty</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Tap the heart on any account to save it here.
            </p>
            <Link href="/">
              <button className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                Browse Accounts
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((it) => {
              const a = it.account;
              if (!a) return null;
              return (
                <div
                  key={it.id}
                  className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col group hover:border-primary/40 transition-all"
                  data-testid={`wishlist-item-${a.id}`}
                >
                  <Link href={`/account/${a.id}`}>
                    <div className="relative aspect-video bg-secondary border-b border-border overflow-hidden cursor-pointer">
                      {(a.imageUrls?.length ?? 0) > 0 ? (
                        <img
                          src={`/api/storage${a.imageUrls![0]}`}
                          alt={a.title}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Gamepad2 className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          #{a.accountId}
                        </span>
                      </div>
                      {a.status !== "active" && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full bg-zinc-700 text-white text-xs font-bold uppercase">
                            {a.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <Link href={`/account/${a.id}`}>
                      <h3 className="font-bold text-white text-base line-clamp-2 leading-tight cursor-pointer hover:text-primary">
                        {a.title}
                      </h3>
                    </Link>
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(a.priceForSale)}
                      </span>
                      <Link href={`/account/${a.id}`}>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary cursor-pointer">
                          View <ChevronRight className="w-3 h-3" />
                        </span>
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      disabled={removing === a.id}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/10 transition-colors disabled:opacity-60"
                      data-testid={`wishlist-remove-${a.id}`}
                    >
                      {removing === a.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
