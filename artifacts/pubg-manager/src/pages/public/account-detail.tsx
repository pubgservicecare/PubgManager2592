import { PublicLayout } from "@/components/PublicLayout";
import { useGetAccount, useGetSettings } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { formatCurrency } from "@/lib/helpers";
import { MessageSquare, Phone, ShieldCheck, Info } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { useEffect } from "react";
import { useSEO } from "@/hooks/use-seo";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { addRecentlyViewed } from "@/lib/recently-viewed";

function VideoPlayer({ url }: { url: string }) {
  if (!url) return (
    <div className="aspect-video w-full bg-card border border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
      <Info className="w-12 h-12 mb-4 opacity-50" />
      <span className="font-bold">No Showcase Video Available</span>
    </div>
  );
  
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0];
    return (
      <iframe 
        className="w-full aspect-video rounded-2xl shadow-2xl border border-border" 
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`} 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowFullScreen 
      />
    );
  }
  
  return (
    <video 
      src={url} 
      controls 
      autoPlay
      muted
      className="w-full aspect-video rounded-2xl shadow-2xl border border-border bg-black object-contain" 
    />
  );
}

export function PublicAccountDetail() {
  const [, params] = useRoute("/account/:id");
  const id = parseInt(params?.id || "0");

  const { data: account, isLoading, isError } = useGetAccount(id, { public: true });
  const { data: settings } = useGetSettings();

  useSEO({
    title: account ? `${account.title} (ID: ${account.accountId})` : "Account Details",
    description: account
      ? `${account.title} — Premium PUBG Mobile account for ${formatCurrency(account.priceForSale)}. ${account.description?.slice(0, 100) || "Verified, secure, instant transfer."}`
      : undefined,
  });

  // Track view + remember in localStorage
  useEffect(() => {
    if (!id || !account) return;
    addRecentlyViewed(id);
    fetch(`/api/accounts/${id}/view`, { method: "POST" }).catch(() => {});
  }, [id, account]);

  const handleWhatsApp = () => {
    if (!settings?.whatsappNumber || !account) return;
    const msg = `Hi, I am interested in purchasing this account:\n\n*${account.title}*\nID: ${account.accountId}\nPrice: ${formatCurrency(account.priceForSale)}\n\nIs it still available?`;
    window.open(`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleLiveChat = () => {
    let sid = localStorage.getItem("chatSessionId");
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem("chatSessionId", sid);
    }
    // Set account intent in local storage to send a system message maybe, or just navigate
    window.location.href = `/chat/${sid}?accountId=${id}`;
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PublicLayout>
    );
  }

  if (isError || !account) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-card p-12 rounded-3xl border border-border max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-destructive mb-2">Account Not Found</h2>
            <p className="text-muted-foreground">The account may have been sold or removed.</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Left Column: Video & Desc */}
          <div className="lg:col-span-2 space-y-8">
            <VideoPlayer url={account.videoUrl || ""} />

            {((account as any).imageUrls?.length ?? 0) > 0 && (
              <div className="bg-card rounded-2xl border border-border p-4 md:p-6">
                <h2 className="text-lg font-display font-bold text-primary mb-3">
                  {(account as any).imageUrls.length === 1 ? "THUMBNAIL" : "SCREENSHOTS"}
                </h2>
                {(account as any).imageUrls.length === 1 ? (
                  <a
                    href={`/api/storage${(account as any).imageUrls[0]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full aspect-video rounded-xl overflow-hidden border border-border bg-secondary hover:border-primary transition-colors"
                  >
                    <img
                      src={`/api/storage${(account as any).imageUrls[0]}`}
                      alt={`${account.title} thumbnail`}
                      loading="lazy"
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </a>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(account as any).imageUrls.map((p: string, i: number) => (
                      <a
                        key={i}
                        href={`/api/storage${p}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square rounded-xl overflow-hidden border border-border bg-secondary hover:border-primary transition-colors"
                      >
                        <img
                          src={`/api/storage${p}`}
                          alt={`${account.title} screenshot ${i + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
              <h2 className="text-xl font-display font-bold text-primary mb-4 flex items-center gap-2">
                <Info className="w-5 h-5" />
                ACCOUNT DETAILS
              </h2>
              <div className="prose prose-invert max-w-none text-slate-300">
                {account.description ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{account.description}</p>
                ) : (
                  <p className="italic opacity-50">No description provided for this account.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & CTA */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 md:p-7 shadow-xl shadow-black/50 sticky top-28 overflow-hidden relative">
              {/* Subtle decorative glow */}
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                  <span className="inline-flex items-center bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full text-xs border border-primary/20 tracking-wider">
                    ID · {account.accountId}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 font-bold px-2.5 py-1 rounded-full text-xs border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-6">
                  {account.title}
                </h1>

                <div className="bg-gradient-to-br from-primary/15 via-secondary to-secondary rounded-2xl p-5 border border-primary/20 mb-6">
                  <p className="text-[11px] font-bold text-primary/80 uppercase tracking-[0.18em] mb-1">
                    Buy Now Price
                  </p>
                  <p className="text-4xl font-display font-bold text-primary leading-tight">
                    {formatCurrency(account.priceForSale)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    One-time payment · Instant transfer
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold text-lg py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#25D366]/20"
                  >
                    <Phone className="w-6 h-6" />
                    Buy via WhatsApp
                  </button>

                  <button
                    onClick={handleLiveChat}
                    className="w-full flex items-center justify-center gap-3 bg-secondary hover:bg-secondary/80 text-white font-bold py-3.5 rounded-xl border border-border transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Live Chat Support
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <WishlistButton accountId={id} variant="button" />
                    <ShareButton accountId={id} title={account.title} />
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-border/50 space-y-2.5">
                  <div className="flex items-start gap-3 text-sm">
                    <span className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </span>
                    <span className="text-slate-300 pt-0.5">
                      100% verified and secure transfer process.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <span className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </span>
                    <span className="text-slate-300 pt-0.5">
                      Full login details provided instantly after payment.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
}

