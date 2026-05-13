import { PublicLayout } from "@/components/PublicLayout";
import { useGetAccount, useGetSettings } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { formatCurrency } from "@/lib/helpers";
import { MessageSquare, Phone, ShieldCheck, Info, ChevronLeft } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from "react";
import { useSEO } from "@/hooks/use-seo";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import { Link } from "wouter";

function VideoPlayer({ url }: { url: string }) {
  if (!url) return null;

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0];
    return (
      <iframe
        className="w-full aspect-video rounded-2xl shadow-2xl border border-border"
        src={`https://www.youtube.com/embed/${videoId}?mute=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    );
  }

  return (
    <video
      src={url}
      controls
      muted
      playsInline
      className="w-full aspect-video rounded-2xl shadow-2xl border border-border bg-black object-contain"
    />
  );
}

export function PublicAccountDetail() {
  const [, params] = useRoute("/account/:id");
  const id = parseInt(params?.id || "0");
  const [imgIndex, setImgIndex] = useState(0);

  const { data: account, isLoading, isError } = useGetAccount(id, { public: true });
  const { data: settings } = useGetSettings();

  const price = account ? String(Number(account.priceForSale ?? 0)) : undefined;

  useSEO({
    title: account ? `${account.title} — Buy PUBG Account` : "Account Details",
    description: account
      ? `Buy ${account.title} for ${formatCurrency(account.priceForSale)}. Verified PUBG Mobile account — instant secure transfer guaranteed. ${account.description?.slice(0, 80) || ""}`
      : undefined,
    canonical: `/account/${id}`,
    type: "product",
    price,
  });

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
    window.location.href = `/chat/${sid}?accountId=${id}`;
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !account) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center py-24 px-4">
          <div className="text-center bg-card p-10 rounded-3xl border border-border max-w-md w-full">
            <h2 className="text-2xl font-bold text-destructive mb-2">Account Not Found</h2>
            <p className="text-muted-foreground mb-6">The account may have been sold or removed.</p>
            <Link href="/">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm">
                <ChevronLeft className="w-4 h-4" /> Back to Marketplace
              </button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const imgs = ((account as any).imageUrls ?? []) as string[];

  return (
    <PublicLayout>
      {/* Main content — add bottom padding on mobile for sticky CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 pb-32 lg:pb-10">

        {/* Back link */}
        <Link href="/">
          <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors mb-5">
            <ChevronLeft className="w-4 h-4" /> Marketplace
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">

          {/* ── Left Column: Media & Description ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Account title on mobile (shown above media) */}
            <div className="lg:hidden">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full text-xs border border-primary/20 tracking-wider">
                  ID · {account.accountId}
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 font-bold px-2.5 py-1 rounded-full text-xs border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">
                {account.title}
              </h1>
              <p className="text-2xl font-display font-bold text-primary mt-2">
                {formatCurrency(account.priceForSale)}
              </p>
            </div>

            {/* Image gallery */}
            {imgs.length > 0 && (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="relative aspect-[4/3] w-full bg-secondary">
                  <img
                    key={imgs[imgIndex]}
                    src={`/api/storage${imgs[imgIndex]}`}
                    alt={`${account.title} screenshot ${imgIndex + 1}`}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  {imgs.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                      {imgIndex + 1} / {imgs.length}
                    </div>
                  )}
                </div>
                {imgs.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto">
                    {imgs.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                          i === imgIndex ? "border-primary" : "border-border opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={`/api/storage${img}`}
                          alt={`Thumbnail ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Video */}
            {account.videoUrl && <VideoPlayer url={account.videoUrl} />}

            {/* Description */}
            <div className="bg-card rounded-2xl border border-border p-5 md:p-7">
              <h2 className="text-base font-display font-bold text-primary mb-3 flex items-center gap-2 uppercase tracking-wide">
                <Info className="w-4 h-4" /> Account Details
              </h2>
              {account.description ? (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-300 text-sm sm:text-base">
                  {account.description}
                </p>
              ) : (
                <p className="italic text-muted-foreground text-sm">No description provided for this account.</p>
              )}
            </div>

            {/* Trust badges — desktop only shows here, mobile shows in sticky bar */}
            <div className="bg-card rounded-2xl border border-border p-5 hidden lg:block">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Why Buy Here?</h2>
              <div className="space-y-3">
                {[
                  "100% verified and secure transfer process",
                  "Full login details provided instantly after payment",
                  "Dedicated support via WhatsApp & live chat",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3 text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Column: Desktop CTA (hidden on mobile) ── */}
          <div className="hidden lg:block">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xl shadow-black/50 sticky top-24 overflow-hidden relative">
              <div className="absolute -top-24 -right-24 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="inline-flex items-center bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full text-xs border border-primary/20 tracking-wider">
                    ID · {account.accountId}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 font-bold px-2.5 py-1 rounded-full text-xs border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                </div>

                <h1 className="text-xl font-bold text-white leading-tight mb-5">
                  {account.title}
                </h1>

                <div className="bg-gradient-to-br from-primary/15 via-secondary to-secondary rounded-2xl p-4 border border-primary/20 mb-5">
                  <p className="text-[11px] font-bold text-primary/80 uppercase tracking-widest mb-1">Buy Now Price</p>
                  <p className="text-3xl font-display font-bold text-primary leading-tight">
                    {formatCurrency(account.priceForSale)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">One-time · Instant transfer</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold text-base py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-[#25D366]/20"
                  >
                    <Phone className="w-5 h-5" /> Buy via WhatsApp
                  </button>
                  <button
                    onClick={handleLiveChat}
                    className="w-full flex items-center justify-center gap-3 bg-secondary hover:bg-secondary/80 text-white font-bold py-3 rounded-xl border border-border transition-all active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" /> Live Chat
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <WishlistButton accountId={id} variant="button" />
                    <ShareButton accountId={id} title={account.title} />
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border/50 space-y-2">
                  {[
                    "100% verified & secure transfer",
                    "Full login details sent instantly",
                  ].map((text) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Sticky Bottom CTA ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-pb">
        <div className="px-4 py-3 flex gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-[#25D366]/20 text-sm"
          >
            <Phone className="w-4 h-4" /> Buy via WhatsApp
          </button>
          <button
            onClick={handleLiveChat}
            className="flex items-center justify-center gap-2 bg-secondary text-white font-bold py-3.5 px-4 rounded-xl border border-border transition-all active:scale-95 text-sm"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <WishlistButton accountId={id} />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
