import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ShieldCheck, LogIn, UserPlus, CheckCircle, ThumbsUp, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAccountReviews } from "@/hooks/use-account-reviews";

const AVATAR_COLORS = [
  "bg-orange-500", "bg-violet-500", "bg-emerald-500", "bg-sky-500",
  "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500",
  "bg-pink-500", "bg-cyan-500",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? "s" : ""} ago`;
}

function StarRating({
  rating,
  max = 5,
  size = "sm",
  interactive = false,
  onRate,
}: {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-5 h-5" : "w-7 h-7";
  const display = interactive ? hovered || rating : rating;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          className={`${sz} transition-colors ${
            n <= display ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-slate-700"
          } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onMouseEnter={interactive ? () => setHovered(n) : undefined}
          onMouseLeave={interactive ? () => setHovered(0) : undefined}
          onClick={interactive && onRate ? () => onRate(n) : undefined}
        />
      ))}
    </div>
  );
}

export { useAccountReviews };

export function ReviewSection({ accountId }: { accountId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useAccountReviews(accountId);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async ({ rating, reviewText }: { rating: number; reviewText: string }) => {
      const res = await fetch(`/api/accounts/${accountId}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText: reviewText.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Failed to submit review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", accountId] });
      setRating(0);
      setText("");
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please select a rating first", variant: "destructive" });
      return;
    }
    submitMutation.mutate({ rating, reviewText: text });
  };

  const {
    reviews = [],
    aggregateRating,
    canReview,
    hasReviewed,
    isLoggedIn = false,
  } = data ?? {};

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="space-y-4">

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-[#0D1220] border border-[#1E293B] rounded-2xl p-5 animate-pulse space-y-3">
          <div className="h-4 w-32 bg-[#1E293B] rounded-full" />
          <div className="h-16 bg-[#1E293B] rounded-xl" />
          <div className="h-16 bg-[#1E293B] rounded-xl" />
        </div>
      )}

      {/* ══ RATING SUMMARY ═══════════════════════════════════════════════════ */}
      {!isLoading && aggregateRating && (
        <div className="bg-[#0D1220] border border-[#1E293B] rounded-2xl p-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> Customer Reviews
          </h2>
          <div className="flex items-start gap-6">
            {/* Big number */}
            <div className="flex flex-col items-center shrink-0">
              <span className="text-5xl font-black text-white leading-none">
                {aggregateRating.avgRating.toFixed(1)}
              </span>
              <StarRating rating={Math.round(aggregateRating.avgRating)} size="sm" />
              <span className="text-[11px] text-slate-500 mt-1">
                {aggregateRating.count} review{aggregateRating.count !== 1 ? "s" : ""}
              </span>
            </div>
            {/* Bar breakdown */}
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => r.rating === star).length;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 w-2 text-right shrink-0">{star}</span>
                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 shrink-0" />
                    <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: pct > 60 ? "#facc15" : pct > 30 ? "#fb923c" : "#64748b",
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-600 w-4 shrink-0 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ REVIEWS LIST ═════════════════════════════════════════════════════ */}
      {!isLoading && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => {
            const initial = (review.reviewerName || "A")[0].toUpperCase();
            const color = avatarColor(review.reviewerName || "A");
            return (
              <div
                key={review.id}
                className="bg-[#0D1220] border border-[#1E293B] rounded-2xl p-4 hover:border-[#2A3A52] transition-colors"
              >
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center shrink-0 text-white font-bold text-sm`}>
                    {initial}
                  </div>
                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                      <span className="text-sm font-semibold text-white truncate">
                        {review.reviewerName}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        <ShieldCheck className="w-2.5 h-2.5" /> Verified Purchase
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-[11px] text-slate-500">
                        {relativeTime(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review text */}
                {review.reviewText && (
                  <p className="text-sm text-slate-300 leading-relaxed pl-12">
                    {review.reviewText}
                  </p>
                )}

                {/* Helpful row */}
                <div className="flex items-center gap-1.5 mt-3 pl-12">
                  <ThumbsUp className="w-3 h-3 text-slate-600" />
                  <span className="text-[11px] text-slate-600">Helpful</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No reviews yet */}
      {!isLoading && reviews.length === 0 && (
        <div className="bg-[#0D1220] border border-[#1E293B] rounded-2xl p-6 text-center">
          <div className="flex justify-center gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className="w-5 h-5 text-slate-700 fill-slate-700" />
            ))}
          </div>
          <p className="text-sm text-slate-400 font-medium">No reviews yet</p>
          <p className="text-xs text-slate-600 mt-1">Be the first to rate this account</p>
        </div>
      )}

      {/* ══ SUBMISSION STATES ════════════════════════════════════════════════ */}

      {/* Submitted success */}
      {submitted && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Review submitted!</p>
            <p className="text-xs text-slate-400 mt-0.5">It will appear after approval. Thank you!</p>
          </div>
        </div>
      )}

      {/* Write a review — logged in */}
      {!isLoading && canReview && !submitted && (
        <div className="bg-[#0D1220] border border-orange-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-0.5 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Write a Review
          </h3>
          <p className="text-xs text-slate-500 mb-4">Tap stars to rate, then share your experience.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <StarRating rating={rating} size="lg" interactive onRate={setRating} />
              {rating > 0 && (
                <span className="text-xs text-orange-400 font-semibold">{ratingLabels[rating]}</span>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience with this account... (optional)"
              maxLength={1000}
              rows={3}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3.5 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500/50 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-600">{text.length}/1000</span>
              <button
                type="submit"
                disabled={submitMutation.isPending || rating === 0}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Already reviewed */}
      {!isLoading && hasReviewed && !submitted && (
        <div className="bg-[#0D1220] border border-[#1E293B] rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-slate-400">You have already reviewed this account. Thank you!</p>
        </div>
      )}

      {/* Not logged in */}
      {!isLoading && !isLoggedIn && (
        <div className="bg-[#0D1220] border border-[#1E293B] rounded-2xl p-5">
          <p className="text-xs text-slate-400 font-medium mb-3">
            Login to leave a rating and review
          </p>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#141C2E] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" /> Login
            </Link>
            <Link
              href="/signup"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Sign Up Free
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
