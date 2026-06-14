import { PublicLayout } from "@/components/PublicLayout";
import { useListAccounts, useGetSettings } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Play, ShieldCheck, Gamepad2, ChevronRight, Star, Zap, ArrowRight, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useSEO } from "@/hooks/use-seo";
import { WishlistButton } from "@/components/WishlistButton";

interface HomeReview {
  id: number;
  accountId: number;
  accountTitle: string;
  accountSlug: string | null;
  rating: number;
  reviewText: string | null;
  reviewerName: string;
  createdAt: string;
}

export function PublicHome() {
  const { data: accounts, isLoading } = useListAccounts({ status: "active", public: true, sort: "newest" } as any);
  const { data: settings } = useGetSettings();
  const popularTags = ((settings as any)?.popularSearches ?? "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);

  const { data: homeReviewsData } = useQuery<{ reviews: HomeReview[] }>({
    queryKey: ["home-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/home-reviews");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60_000,
  });
  const homeReviews = homeReviewsData?.reviews ?? [];

  useSEO({
    title: "Buy & Sell PUBG Mobile Accounts Safely",
    description: "Browse verified PUBG Mobile accounts with mythic skins, X-Suits, Glacier weapons and rare items. Secure transfers, transparent listings, and a buying experience built for trust.",
    canonical: "/",
    isHomepage: true,
  });

  // Show only first 5 accounts
  const top5 = (accounts ?? []).slice(0, 5);

  return (
    <PublicLayout>
      <section className="bg-[#0B0F19] font-['Outfit'] selection:bg-orange-500/30 selection:text-orange-200 flex-1">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-8">

            {/* ── SEO Hero ────────────────────────────────────────────── */}
            <header className="mb-1">
              <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-tight">
                {(settings as any)?.heroTagline || "PUBG Mobile Account Marketplace"}
              </h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-[15px] leading-relaxed max-w-2xl">
                {(settings as any)?.siteDescription || "Browse verified PUBG Mobile accounts with secure transfers and transparent listings."}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> 100% Verified Accounts
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-400">
                  <Zap className="w-3 h-3" /> Instant Transfer
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400">
                  <Star className="w-3 h-3 fill-current" /> Globally Trusted
                </span>
              </div>
              {popularTags.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto mt-3 pb-1 -mx-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Popular:</span>
                  {popularTags.map((tag: string) => (
                    <Link key={tag} href={`/accounts?q=${encodeURIComponent(tag)}`}>
                      <span className="shrink-0 font-medium py-1 px-2.5 rounded-full text-xs border bg-[#11151E] hover:bg-[#1E293B] border-[#1E293B] text-slate-300 cursor-pointer transition-colors">
                        {tag}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </header>

            {/* ── 5 Accounts Grid ─────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-orange-400" />
                  Latest Accounts
                </h2>
                <Link href="/accounts">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer">
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-[#11151E] rounded-xl aspect-[4/5] animate-pulse border border-[#1E293B]" />
                  ))}
                </div>
              ) : top5.length === 0 ? (
                <div className="text-center py-16 bg-[#11151E] rounded-xl border border-[#1E293B] px-4">
                  <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white">No accounts available right now.</h3>
                  <p className="text-slate-400 mt-2 text-sm">Check back later for new inventory.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {top5.map((account, index) => {
                    const imgs = ((account as any).imageUrls ?? []) as string[];
                    const gradient = pickGradient(account.id);
                    return (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4) }}
                      >
                        <Link href={`/account/${(account as any).slug || account.id}`}>
                          <div className="group relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#11151E] hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.08)] transition-all duration-300 flex flex-col h-full cursor-pointer active:scale-[0.99]">
                            <div className="relative aspect-[4/3] w-full overflow-hidden">
                              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80`} />
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#11151E]/60 to-[#11151E]" />
                              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                {account.videoUrl ? (
                                  <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white">
                                    <Play className="w-5 h-5 ml-1" />
                                  </div>
                                ) : (
                                  <span className="font-display text-xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] -rotate-3 group-hover:scale-110 transition-transform duration-500 line-clamp-2">
                                    {account.title}
                                  </span>
                                )}
                              </div>
                              {imgs.length > 0 && (
                                <>
                                  <img
                                    src={`/api/storage${imgs[0]}`}
                                    alt={`${account.title} — Buy PUBG Mobile Account`}
                                    loading="lazy"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-[#11151E] via-[#11151E]/30 to-transparent pointer-events-none" />
                                </>
                              )}
                              {imgs.length > 1 && (
                                <div className="absolute bottom-3 right-12 z-10 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                  +{imgs.length - 1}
                                </div>
                              )}
                              <div className="absolute right-3 top-3 z-10" onClick={(e) => e.preventDefault()}>
                                <WishlistButton accountId={account.id} />
                              </div>
                              <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 items-start">
                                <span className="bg-black/55 text-[10px] font-bold text-white backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5">
                                  #{account.accountId}
                                </span>
                                {(account as any).isFeatured && (
                                  <span className="inline-flex items-center bg-orange-500/95 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(249,115,22,0.4)] rounded-md px-2 py-0.5">
                                    <Star className="mr-1 h-3 w-3 fill-white" /> Featured
                                  </span>
                                )}
                              </div>
                              <div className="absolute bottom-3 left-3 z-10">
                                <span className="inline-flex items-center bg-yellow-500/20 text-[10px] font-bold text-yellow-400 backdrop-blur-md border border-yellow-500/20 rounded-md px-2 py-0.5">
                                  <Zap className="mr-1 h-3 w-3 fill-yellow-400" /> Instant
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-1 flex-col p-4">
                              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100 group-hover:text-orange-400 transition-colors mb-3 min-h-[2.5rem]">
                                {account.title}
                              </h3>
                              <div className="mt-auto flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold shrink-0">P</div>
                                  <div className="flex flex-col overflow-hidden">
                                    <div className="flex items-center gap-1">
                                      <span className="truncate text-xs font-medium text-slate-300">{(account as any).sellerUsername || "Verified Seller"}</span>
                                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <Star className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                                      <span className="text-orange-400 font-bold">Trusted Seller</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-[#1E293B] pt-3">
                                  <span className="text-lg sm:text-xl font-bold tracking-tight text-orange-500 truncate">
                                    Rs {Number(account.priceForSale ?? 0).toLocaleString("en-PK")}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-orange-400 transition-colors inline-flex items-center gap-1 shrink-0">
                                    View <ChevronRight className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* View All Accounts CTA */}
              <div className="mt-5 text-center">
                <Link href="/accounts">
                  <button className="inline-flex items-center gap-2 px-6 py-2.5 border border-orange-500/30 hover:border-orange-500/60 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 font-bold rounded-xl text-sm transition-all">
                    Browse All Accounts <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

            {/* ── Featured Reviews Section ─────────────────────────────── */}
            {homeReviews.length > 0 && (
              <div className="pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    What Customers Say
                  </h2>
                  <Link href="/reviews">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer">
                      See All Reviews <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homeReviews.map((review, index) => {
                    const accountHref = review.accountSlug
                      ? `/account/${review.accountSlug}`
                      : `/account/${review.accountId}`;
                    return (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: Math.min(index * 0.08, 0.4) }}
                        className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#2D3F5E] transition-colors"
                      >
                        {/* Stars */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-3.5 h-3.5 ${n <= review.rating ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-slate-700"}`}
                            />
                          ))}
                        </div>

                        {/* Review text */}
                        {review.reviewText ? (
                          <div className="flex gap-2 flex-1">
                            <Quote className="w-3.5 h-3.5 text-orange-400/40 shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{review.reviewText}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic flex-1">No written review</p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-bold text-white">{review.reviewerName[0]?.toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">{review.reviewerName}</p>
                              <Link href={accountHref}>
                                <span className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors cursor-pointer truncate max-w-[120px] block">
                                  {review.accountTitle}
                                </span>
                              </Link>
                            </div>
                          </div>
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" title="Verified Review" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* See All Reviews */}
                <div className="mt-5 text-center">
                  <Link href="/reviews">
                    <button className="inline-flex items-center gap-2 px-6 py-2.5 border border-orange-500/30 hover:border-orange-500/60 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 font-bold rounded-xl text-sm transition-all">
                      See All Reviews <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

const GRADIENTS = [
  "from-cyan-400 to-blue-600",
  "from-amber-400 to-orange-600",
  "from-red-500 to-rose-700",
  "from-sky-300 to-indigo-600",
  "from-purple-500 to-fuchsia-700",
  "from-yellow-200 to-amber-500",
  "from-teal-400 to-emerald-700",
  "from-red-600 to-orange-600",
  "from-indigo-400 to-purple-700",
  "from-slate-400 to-slate-700",
];

function pickGradient(id: number): string {
  const idx = ((id % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length;
  return GRADIENTS[idx];
}
