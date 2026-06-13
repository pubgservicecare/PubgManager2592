import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Star, ShieldCheck, MessageCircle, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

interface PublicReview {
  id: number;
  accountId: number;
  accountTitle: string;
  accountSlug: string | null;
  rating: number;
  reviewText: string | null;
  reviewerName: string;
  createdAt: string;
}

interface ReviewsResponse {
  reviews: PublicReview[];
  avgRating: number | null;
  totalCount: number;
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-5 h-5" : "w-7 h-7";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${sz} ${n <= rating ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-slate-700"}`}
        />
      ))}
    </div>
  );
}

export function PublicReviews() {
  const { customer } = useCustomerAuth();
  const [activeFilter, setActiveFilter] = useState<number | null>(null);

  const { data, isLoading } = useQuery<ReviewsResponse>({
    queryKey: ["public-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/reviews", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30_000,
  });

  const allReviews = data?.reviews ?? [];
  const filtered = activeFilter ? allReviews.filter((r) => r.rating === activeFilter) : allReviews;
  const avgRating = data?.avgRating ?? null;
  const total = data?.totalCount ?? 0;

  const starBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: allReviews.filter((r) => r.rating === star).length,
    pct: allReviews.length > 0 ? (allReviews.filter((r) => r.rating === star).length / allReviews.length) * 100 : 0,
  }));

  const labels: Record<number, string> = { 5: "Excellent", 4: "Very Good", 3: "Good", 2: "Fair", 1: "Poor" };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#060A12]">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0B1120] to-[#060A12] border-b border-[#1E293B]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,146,60,0.08),transparent_60%)]" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-6">
              <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
              <span className="text-xs font-bold text-orange-300 uppercase tracking-widest">Customer Reviews</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
              What Our Customers Say
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Real reviews from verified customers who bought PUBG accounts on CodexStocks. 100% authentic — every review is manually approved.
            </p>

            {/* Aggregate stat */}
            {avgRating && total > 0 && (
              <div className="mt-10 inline-flex flex-col items-center gap-2">
                <div className="text-6xl font-black text-white">{avgRating.toFixed(1)}</div>
                <Stars rating={Math.round(avgRating)} size="lg" />
                <p className="text-sm text-slate-500 mt-1">Based on {total} verified {total === 1 ? "review" : "reviews"}</p>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Sidebar: breakdown + CTA ─────────────────────────────────── */}
            <div className="space-y-4">

              {/* Star breakdown */}
              {total > 0 && (
                <div className="bg-[#0D1422] border border-[#1E293B] rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Rating Breakdown</h3>
                  <div className="space-y-2">
                    {starBreakdown.map(({ star, count, pct }) => (
                      <button
                        key={star}
                        onClick={() => setActiveFilter(activeFilter === star ? null : star)}
                        className={`w-full flex items-center gap-2 rounded-lg p-1.5 transition-colors ${
                          activeFilter === star ? "bg-orange-500/10" : "hover:bg-[#1E293B]/50"
                        }`}
                      >
                        <span className="text-xs text-slate-500 w-2 shrink-0">{star}</span>
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                        <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-4 text-right">{count}</span>
                      </button>
                    ))}
                  </div>
                  {activeFilter && (
                    <button
                      onClick={() => setActiveFilter(null)}
                      className="mt-3 w-full text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      × Clear filter
                    </button>
                  )}
                </div>
              )}

              {/* Rate this Platform CTA */}
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-5">
                <Star className="w-6 h-6 fill-orange-400 text-orange-400 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Rate this Platform</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Bought a PUBG account from CodexStocks? Share your experience and help other gamers.
                </p>
                {customer ? (
                  <Link href="/accounts">
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors">
                      Browse Accounts to Review <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <Link href="/signup">
                      <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors">
                        <UserPlus className="w-3.5 h-3.5" /> Create Account
                      </button>
                    </Link>
                    <Link href="/login">
                      <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1A2235] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 text-xs font-semibold rounded-xl transition-colors">
                        <LogIn className="w-3.5 h-3.5" /> Login
                      </button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Trust badges */}
              <div className="bg-[#0D1422] border border-[#1E293B] rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Our Promise</h3>
                {[
                  { label: "All reviews manually verified" },
                  { label: "No fake or paid reviews" },
                  { label: "100% real customer feedback" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Reviews list ─────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Filter header */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-orange-400" />
                  {activeFilter ? `${labels[activeFilter]} Reviews (${filtered.length})` : `All Reviews (${total})`}
                </h2>
                {!activeFilter && (
                  <div className="flex items-center gap-1.5">
                    {[5, 4, 3, 2, 1].map((s) => (
                      <button
                        key={s}
                        onClick={() => setActiveFilter(s)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0D1422] border border-[#1E293B] hover:border-orange-500/40 text-slate-400 hover:text-white transition-all"
                      >
                        {s}<Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-[#0D1422] border border-[#1E293B] rounded-2xl p-5 animate-pulse">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-[#1E293B]" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-32 bg-[#1E293B] rounded-full" />
                          <div className="h-3 w-20 bg-[#1E293B] rounded-full" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-3 w-full bg-[#1E293B] rounded-full" />
                        <div className="h-3 w-3/4 bg-[#1E293B] rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {!isLoading && filtered.length === 0 && (
                <div className="bg-[#0D1422] border border-[#1E293B] rounded-2xl p-12 text-center">
                  <Star className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">
                    {activeFilter ? `No ${labels[activeFilter]} reviews yet` : "No reviews yet"}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Be the first to share your experience!</p>
                </div>
              )}

              {/* Review cards */}
              {!isLoading && filtered.map((review) => {
                const accountHref = review.accountSlug ? `/account/${review.accountSlug}` : `/account/${review.accountId}`;
                return (
                  <div key={review.id} className="bg-[#0D1422] border border-[#1E293B] rounded-2xl p-5 hover:border-[#2D3F5E] transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-white">{review.reviewerName[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{review.reviewerName}</span>
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                              <ShieldCheck className="w-2.5 h-2.5" /> Verified
                            </span>
                          </div>
                          <Stars rating={review.rating} size="sm" />
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-600 shrink-0">
                        {new Date(review.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {review.reviewText && (
                      <p className="text-sm text-slate-300 leading-relaxed mb-3">"{review.reviewText}"</p>
                    )}

                    <Link href={accountHref}>
                      <span className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium cursor-pointer">
                        {review.accountTitle}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
          {!isLoading && total > 0 && (
            <div className="mt-12 bg-gradient-to-r from-orange-500/10 via-orange-600/5 to-transparent border border-orange-500/20 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Ready to Rate Your Experience?</h3>
                <p className="text-sm text-slate-400">
                  Browse our accounts, make a purchase, and share your honest feedback.
                </p>
              </div>
              <Link href={customer ? "/accounts" : "/signup"}>
                <button className="shrink-0 flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-sm">
                  {customer ? "Browse Accounts" : "Create Free Account"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
