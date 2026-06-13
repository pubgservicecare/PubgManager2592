import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ShieldCheck, MessageCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAccountReviews } from "@/hooks/use-account-reviews";
export type { ReviewsData } from "@/hooks/use-account-reviews";

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
  const sz =
    size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-5 h-5" : "w-7 h-7";
  const display = interactive ? hovered || rating : rating;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          className={`${sz} transition-colors ${
            n <= display
              ? "fill-yellow-400 text-yellow-400"
              : "fill-transparent text-slate-600"
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

  const submitMutation = useMutation({
    mutationFn: async ({
      rating,
      reviewText,
    }: {
      rating: number;
      reviewText: string;
    }) => {
      const res = await fetch(`/api/accounts/${accountId}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          reviewText: reviewText.trim() || undefined,
        }),
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
      toast({
        title: "Review submitted!",
        description: "Your review is pending admin approval.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to submit",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    submitMutation.mutate({ rating, reviewText: text });
  };

  if (isLoading) {
    return (
      <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-36 bg-[#1E293B] rounded-full mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-[#1E293B] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const {
    reviews = [],
    aggregateRating,
    canReview,
    hasReviewed,
    myReview,
    isLoggedIn = false,
  } = data ?? {};

  return (
    <div className="space-y-4">
      {/* ── Aggregate Rating Summary ─────────────────────────────────────── */}
      <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5" /> Customer Reviews
          </h2>
          {aggregateRating && (
            <span className="text-[11px] text-slate-500 font-medium">
              {aggregateRating.count} verified{" "}
              {aggregateRating.count === 1 ? "review" : "reviews"}
            </span>
          )}
        </div>

        {aggregateRating ? (
          <div className="flex items-center gap-5">
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold text-white leading-none">
                {aggregateRating.avgRating.toFixed(1)}
              </div>
              <div className="mt-1.5">
                <StarRating
                  rating={Math.round(aggregateRating.avgRating)}
                  size="sm"
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">out of 5</div>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => r.rating === star).length;
                const pct =
                  reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-3 text-right shrink-0">
                      {star}
                    </span>
                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400 shrink-0" />
                    <div className="flex-1 h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-600 w-4 shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No reviews yet. Be the first verified buyer to leave a review!
          </p>
        )}
      </div>

      {/* ── Pending review notice ─────────────────────────────────────────── */}
      {hasReviewed && myReview && !myReview.approved && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">
              Review Pending Approval
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              You gave this account {myReview.rating} star
              {myReview.rating !== 1 ? "s" : ""}. It will appear publicly once
              approved by our team.
            </p>
          </div>
        </div>
      )}

      {/* ── Review form (verified purchasers only) ──────────────────────── */}
      {canReview && (
        <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Leave a
            Verified Review
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium mb-2 block">
                Your Rating *
              </label>
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onRate={setRating}
              />
              {rating > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {
                    ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][
                      rating
                    ]
                  }
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-2 block">
                Your Review{" "}
                <span className="text-slate-600">(optional)</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell other buyers about your experience with this account..."
                maxLength={1000}
                rows={3}
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3.5 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500/50 resize-none"
              />
              <p className="text-[11px] text-slate-600 mt-1 text-right">
                {text.length}/1000
              </p>
            </div>
            <button
              type="submit"
              disabled={submitMutation.isPending || rating === 0}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      )}

      {/* ── Auth / purchase prompt ────────────────────────────────────────── */}
      {!canReview && !hasReviewed && !isLoading && (
        <>
          {!isLoggedIn ? (
            <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-4 text-center">
              <p className="text-sm text-slate-500">
                <Link
                  href="/login"
                  className="text-orange-400 hover:text-orange-300 font-medium"
                >
                  Login
                </Link>{" "}
                after purchasing this account to leave a verified review.
              </p>
            </div>
          ) : (
            <div className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-4 flex items-center gap-3">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <p className="text-sm text-slate-500">
                Only verified purchasers of this account can leave a review.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Individual reviews ───────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-white">
                      {review.reviewerName}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-2.5 h-2.5" /> Verified Purchase
                    </span>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <span className="text-[11px] text-slate-600 shrink-0 ml-3">
                  {new Date(review.createdAt).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {review.reviewText && (
                <p className="text-sm text-slate-300 leading-relaxed mt-2">
                  {review.reviewText}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
