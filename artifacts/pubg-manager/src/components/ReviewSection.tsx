import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ShieldCheck, MessageCircle, LogIn, UserPlus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAccountReviews } from "@/hooks/use-account-reviews";

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
  const sz = size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-8 h-8";
  const display = interactive ? hovered || rating : rating;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          className={`${sz} transition-colors ${
            n <= display ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-slate-600"
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

  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="space-y-4">

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5 animate-pulse">
          <div className="h-4 w-40 bg-[#1E293B] rounded-full mb-4" />
          <div className="h-10 bg-[#1E293B] rounded-xl" />
        </div>
      )}

      {/* Submitted confirmation — no "pending" language */}
      {submitted && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Review submitted!</p>
            <p className="text-xs text-slate-400 mt-0.5">Thank you for your feedback.</p>
          </div>
        </div>
      )}

      {/* Logged-in user who can review → show form */}
      {!isLoading && canReview && !submitted && (
        <div className="bg-[#11151E] border border-orange-500/30 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Rate this account
          </h3>
          <p className="text-xs text-slate-400 mb-4">Tap a star to rate, then optionally write a review.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <StarRating rating={rating} size="lg" interactive onRate={setRating} />
              {rating > 0 && (
                <p className="text-xs text-orange-400 font-medium mt-1.5">{labels[rating]}</p>
              )}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your review here... (optional)"
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

      {/* Already reviewed — silent, no pending message */}
      {!isLoading && hasReviewed && !submitted && (
        <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-slate-400">You have already reviewed this account. Thank you!</p>
        </div>
      )}

      {/* Not logged in */}
      {!isLoading && !isLoggedIn && (
        <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className="w-6 h-6 text-slate-700 fill-slate-700" />
              ))}
            </div>
            <span className="text-sm text-slate-400 font-medium">Rate this account</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Login or create a free account to leave a rating and review.</p>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A2235] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" /> Login
            </Link>
            <Link
              href="/signup"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Create Account
            </Link>
          </div>
        </div>
      )}

      {/* ══ REVIEWS LIST ═════════════════════════════════════════════════════ */}
      <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5" /> Customer Reviews
            {aggregateRating && (
              <span className="text-slate-600 font-normal normal-case tracking-normal">({aggregateRating.count})</span>
            )}
          </h2>
          {aggregateRating && (
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-white">{aggregateRating.avgRating.toFixed(1)}</span>
              <span className="text-[11px] text-slate-500">/ 5</span>
            </div>
          )}
        </div>

        {aggregateRating ? (
          <div className="space-y-1.5 mb-5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 w-3 text-right shrink-0">{star}</span>
                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 shrink-0" />
                  <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-600 w-4 shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 mb-4">No reviews yet — be the first to rate this account!</p>
        )}

        {reviews.length > 0 && (
          <div className="space-y-3 pt-1 border-t border-[#1E293B]">
            {reviews.map((review) => (
              <div key={review.id} className="pt-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{review.reviewerName}</span>
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ShieldCheck className="w-2.5 h-2.5" /> Verified
                      </span>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <span className="text-[11px] text-slate-600 shrink-0 ml-3">
                    {new Date(review.createdAt).toLocaleDateString("en-PK", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
                {review.reviewText && (
                  <p className="text-sm text-slate-300 leading-relaxed mt-1.5">{review.reviewText}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
