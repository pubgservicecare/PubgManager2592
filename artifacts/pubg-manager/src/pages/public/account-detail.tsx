import { PublicLayout } from "@/components/PublicLayout";
import { useGetAccount, useGetSettings } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { formatCurrency } from "@/lib/helpers";
import {
  MessageSquare,
  Phone,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
  Star,
  Lock,
  Info,
  Play,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useState, useCallback } from "react";
import { useSEO } from "@/hooks/use-seo";
import { WishlistButton } from "@/components/WishlistButton";
import { ShareButton } from "@/components/ShareButton";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import { Link } from "wouter";

const SITE_URL = "https://www.codexstocks.org";

// ── Lightweight YouTube embed ─────────────────────────────────────────────────
function VideoSection({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);

  const isYT =
    url.includes("youtube.com") || url.includes("youtu.be");
  const videoId = isYT
    ? url.split("v=")[1]?.split("&")[0] ||
      url.split("youtu.be/")[1]?.split("?")[0]
    : null;
  const thumbUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  if (isYT && videoId) {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-[#1E293B] shadow-xl">
        {playing ? (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group"
          >
            {thumbUrl && (
              <img
                src={thumbUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                <Play className="w-7 h-7 text-white ml-1 fill-white" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              Watch Showcase
            </div>
          </button>
        )}
      </div>
    );
  }

  return (
    <video
      src={url}
      controls
      playsInline
      className="w-full aspect-video rounded-2xl border border-[#1E293B] bg-black object-contain shadow-xl"
    />
  );
}

// ── Image gallery with swipe-friendly nav ────────────────────────────────────
function ImageGallery({
  imgs,
  title,
}: {
  imgs: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);

  const prev = useCallback(() => {
    setIndex((i) => (i === 0 ? imgs.length - 1 : i - 1));
  }, [imgs.length]);

  const next = useCallback(() => {
    setIndex((i) => (i === imgs.length - 1 ? 0 : i + 1));
  }, [imgs.length]);

  if (imgs.length === 0) return null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#0B0F19] border border-[#1E293B] shadow-xl">
      {/* Main image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          key={imgs[index]}
          src={`/api/storage${imgs[index]}`}
          alt={`${title} screenshot ${index + 1}`}
          className="w-full h-full object-cover"
          loading="eager"
        />

        {/* Gradient overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0B0F19] to-transparent pointer-events-none" />

        {/* Nav arrows — only when multiple images */}
        {imgs.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/90 transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/90 transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Counter badge */}
        {imgs.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/75 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
            {index + 1} / {imgs.length}
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {imgs.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3">
          {imgs.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                i === index
                  ? "w-5 h-2 bg-orange-500"
                  : "w-2 h-2 bg-white/25 hover:bg-white/50"
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trust strip ───────────────────────────────────────────────────────────────
function TrustStrip() {
  const items = [
    { icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />, text: "100% Verified" },
    { icon: <Zap className="w-4 h-4 text-yellow-400" />, text: "Instant Transfer" },
    { icon: <Lock className="w-4 h-4 text-blue-400" />, text: "Secure Payment" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ icon, text }) => (
        <div
          key={text}
          className="flex flex-col items-center gap-1.5 bg-[#11151E] border border-[#1E293B] rounded-xl py-3 px-2 text-center"
        >
          {icon}
          <span className="text-[11px] font-semibold text-slate-300 leading-tight">{text}</span>
        </div>
      ))}
    </div>
  );
}

// ── How it works (beginner guide) ────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "1", text: "Contact us on WhatsApp or Live Chat" },
    { n: "2", text: "Make payment via the agreed method" },
    { n: "3", text: "Receive full account login instantly" },
  ];
  return (
    <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        How it works
      </h3>
      <div className="space-y-2.5">
        {steps.map(({ n, text }) => (
          <div key={n} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-orange-400">{n}</span>
            </div>
            <span className="text-sm text-slate-300">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function PublicAccountDetail() {
  const [, params] = useRoute("/account/:id");
  const id = parseInt(params?.id || "0");

  const { data: account, isLoading, isError } = useGetAccount(id, {
    public: true,
  });
  const { data: settings } = useGetSettings();

  const price = account
    ? String(Number(account.priceForSale ?? 0))
    : undefined;

  useSEO({
    title: account
      ? `${account.title} — Buy PUBG Account`
      : "Account Details",
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

  // WhatsApp — auto-includes full account context so buyer doesn't need to explain
  const handleWhatsApp = () => {
    if (!settings?.whatsappNumber || !account) return;
    const link = `${SITE_URL}/account/${id}`;
    const msg =
      `Hi! I'm interested in buying this PUBG account:\n\n` +
      `🎮 *${account.title}*\n` +
      `🆔 Account ID: ${account.accountId}\n` +
      `💰 Price: ${formatCurrency(account.priceForSale)}\n` +
      `🔗 ${link}\n\n` +
      `Is it still available?`;
    window.open(
      `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  // Live Chat — passes accountId in URL so support can see context immediately
  const handleLiveChat = () => {
    let sid = localStorage.getItem("chatSessionId");
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem("chatSessionId", sid);
    }
    window.location.href = `/chat/${sid}?accountId=${id}`;
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-4 animate-pulse">
          <div className="h-5 w-28 bg-[#1E293B] rounded-full" />
          <div className="aspect-[4/3] w-full bg-[#11151E] rounded-2xl" />
          <div className="h-8 w-3/4 bg-[#1E293B] rounded-xl" />
          <div className="h-5 w-1/3 bg-[#1E293B] rounded-xl" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#11151E] rounded-xl" />
            ))}
          </div>
          <div className="h-14 bg-[#11151E] rounded-xl" />
          <div className="h-12 bg-[#11151E] rounded-xl" />
        </div>
      </PublicLayout>
    );
  }

  // ── Error / Not Found ────────────────────────────────────────────────────
  if (isError || !account) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center py-24 px-4">
          <div className="text-center bg-[#11151E] p-10 rounded-3xl border border-[#1E293B] max-w-sm w-full">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Info className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Account Not Found
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              This account may have been sold or removed.
            </p>
            <Link href="/">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back to Marketplace
              </button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const imgs = ((account as any).imageUrls ?? []) as string[];
  const hasMedia = imgs.length > 0 || !!account.videoUrl;

  return (
    <PublicLayout>
      {/*
        Layout:
        Mobile  → single column, sticky bottom CTA
        Desktop → 2/3 + 1/3 grid, sticky right sidebar
      */}
      <div className="bg-[#0B0F19] min-h-screen font-['Outfit']">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8
                        pb-36 lg:pb-10">

          {/* Back nav */}
          <Link href="/">
            <button className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-5 group">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Marketplace
            </button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">

            {/* ── LEFT: Media + Info ─────────────────────────────────────── */}
            <div className="space-y-4">

              {/* ── MOBILE ONLY: title + price above media ── */}
              <div className="lg:hidden space-y-3">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-[#11151E] border border-[#1E293B] text-slate-400 font-bold px-2.5 py-1 rounded-full text-[11px] tracking-wider">
                    ID · {account.accountId}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 font-bold px-2.5 py-1 rounded-full text-[11px] border border-emerald-500/25">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                  {(account as any).isFeatured && (
                    <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-300 font-bold px-2.5 py-1 rounded-full text-[11px] border border-orange-500/25">
                      <Star className="w-3 h-3 fill-current" /> Featured
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-white leading-tight">
                  {account.title}
                </h1>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-bold text-orange-400 tracking-tight">
                    {formatCurrency(account.priceForSale)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    one-time · instant transfer
                  </span>
                </div>
              </div>

              {/* ── Media: Images ── */}
              {imgs.length > 0 && (
                <ImageGallery imgs={imgs} title={account.title} />
              )}

              {/* ── Media: Video ── */}
              {account.videoUrl && (
                <VideoSection url={account.videoUrl} />
              )}

              {/* No media placeholder */}
              {!hasMedia && (
                <div className="aspect-[4/3] w-full rounded-2xl bg-[#11151E] border border-[#1E293B] flex flex-col items-center justify-center gap-3 text-slate-600">
                  <div className="w-14 h-14 rounded-2xl bg-[#1E293B] flex items-center justify-center">
                    <Play className="w-6 h-6" />
                  </div>
                  <span className="text-sm">No media uploaded</span>
                </div>
              )}

              {/* ── Trust strip (mobile only — desktop shows in sidebar) ── */}
              <div className="lg:hidden">
                <TrustStrip />
              </div>

              {/* ── Account Description ── */}
              <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" /> Account Details
                </h2>
                {account.description ? (
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {account.description}
                  </p>
                ) : (
                  <p className="text-slate-600 text-sm italic">
                    No description provided.
                  </p>
                )}
              </div>

              {/* ── How it works (mobile) ── */}
              <div className="lg:hidden">
                <HowItWorks />
              </div>

            </div>

            {/* ── RIGHT: Desktop sticky sidebar ─────────────────────────── */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-4">

                {/* Price card */}
                <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5 relative overflow-hidden">
                  {/* Glow */}
                  <div className="absolute -top-20 -right-20 w-44 h-44 bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative space-y-4">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-background border border-[#1E293B] text-slate-400 font-bold px-2.5 py-1 rounded-full text-[11px] tracking-wider">
                        ID · {account.accountId}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 font-bold px-2.5 py-1 rounded-full text-[11px] border border-emerald-500/25">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                      {(account as any).isFeatured && (
                        <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-300 font-bold px-2.5 py-1 rounded-full text-[11px] border border-orange-500/25">
                          <Star className="w-3 h-3 fill-current" /> Featured
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h1 className="text-lg font-bold text-white leading-snug">
                      {account.title}
                    </h1>

                    {/* Price box */}
                    <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/15 rounded-xl p-4">
                      <p className="text-[10px] font-bold text-orange-400/70 uppercase tracking-[0.2em] mb-1">
                        Buy Now Price
                      </p>
                      <p className="text-3xl font-display font-bold text-orange-400 leading-none">
                        {formatCurrency(account.priceForSale)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1.5">
                        One-time payment · Full account access
                      </p>
                    </div>

                    {/* CTA buttons */}
                    <CTAButtons
                      onWhatsApp={handleWhatsApp}
                      onLiveChat={handleLiveChat}
                      accountId={id}
                      title={account.title}
                    />
                  </div>
                </div>

                {/* Trust strip */}
                <TrustStrip />

                {/* How it works */}
                <HowItWorks />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── MOBILE: Sticky bottom CTA bar ──────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50">
        {/* Glass background */}
        <div className="bg-[#0B0F19]/95 backdrop-blur-xl border-t border-[#1E293B] px-4 pt-3 pb-5 safe-area-pb">
          {/* Price reminder */}
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <span className="text-xs text-slate-500 font-medium truncate max-w-[55%]">
              {account.title}
            </span>
            <span className="text-base font-bold text-orange-400">
              {formatCurrency(account.priceForSale)}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5">
            {/* WhatsApp — primary, takes most space */}
            <button
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1DA851] active:scale-95 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#25D366]/20 transition-all text-sm"
            >
              <Phone className="w-4 h-4 shrink-0" />
              Buy via WhatsApp
            </button>

            {/* Live Chat — icon + label */}
            <button
              onClick={handleLiveChat}
              className="flex items-center justify-center gap-2 bg-[#11151E] hover:bg-[#1E293B] active:scale-95 text-slate-200 font-bold py-3.5 px-4 rounded-xl border border-[#1E293B] transition-all text-sm"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Chat</span>
            </button>

            {/* Wishlist icon */}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <WishlistButton accountId={id} />
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

// ── Reusable CTA buttons block (used in desktop sidebar) ─────────────────────
function CTAButtons({
  onWhatsApp,
  onLiveChat,
  accountId,
  title,
}: {
  onWhatsApp: () => void;
  onLiveChat: () => void;
  accountId: number;
  title: string;
}) {
  return (
    <div className="space-y-2.5">
      {/* Primary: WhatsApp */}
      <button
        onClick={onWhatsApp}
        className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DA851] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#25D366]/15 transition-all text-[15px]"
      >
        <Phone className="w-5 h-5 shrink-0" />
        Buy via WhatsApp
      </button>

      {/* Secondary: Live Chat */}
      <button
        onClick={onLiveChat}
        className="w-full flex items-center justify-center gap-3 bg-background hover:bg-[#1E293B] active:scale-[0.98] text-slate-200 font-bold py-3 rounded-xl border border-[#1E293B] hover:border-slate-600 transition-all text-sm"
      >
        <MessageSquare className="w-4 h-4 shrink-0" />
        Live Chat Support
      </button>

      {/* Tertiary: Save + Share */}
      <div className="grid grid-cols-2 gap-2">
        <WishlistButton accountId={accountId} variant="button" />
        <ShareButton accountId={accountId} title={title} />
      </div>
    </div>
  );
}
