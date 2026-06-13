import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Star, CheckCircle, XCircle, Trash2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface AdminReview {
  id: number;
  accountId: number;
  accountTitle: string;
  customerUserId: number;
  customerName: string;
  customerPhone: string;
  rating: number;
  reviewText: string | null;
  approved: boolean;
  createdAt: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          className={`w-3 h-3 ${
            n <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-transparent text-slate-600"
          }`}
        />
      ))}
    </div>
  );
}

export function AdminReviews() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: reviews = [], isLoading } = useQuery<AdminReview[]>({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/reviews${params}`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      approved,
    }: {
      id: number;
      approved: boolean;
    }) => {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error("Failed to update review");
      return res.json();
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: approved ? "Review approved ✓" : "Review unapproved" });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setDeleteId(null);
      toast({ title: "Review deleted" });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pending = reviews.filter((r) => !r.approved).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-primary" />
              Customer Reviews
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Moderate and approve customer reviews before they appear publicly.
            </p>
          </div>
          {pending > 0 && (
            <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-sm font-bold px-3 py-1.5 rounded-full">
              {pending} pending
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "pending", "approved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${
                filter === f
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f}
              {f === "pending" && pending > 0 && (
                <span className="ml-1.5 bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded-full">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Review list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 bg-card rounded-2xl animate-pulse border border-border"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No reviews found.</p>
            <p className="text-xs mt-1 opacity-60">
              Reviews appear here after customers submit them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`bg-card border rounded-2xl p-5 transition-colors ${
                  !review.approved
                    ? "border-yellow-500/20"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Account + status badge */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Link href={`/admin/accounts/${review.accountId}`}>
                        <span className="text-sm font-semibold text-primary hover:underline truncate max-w-xs cursor-pointer">
                          {review.accountTitle}
                        </span>
                      </Link>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          review.approved
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }`}
                      >
                        {review.approved ? "Approved" : "Pending"}
                      </span>
                    </div>

                    {/* Customer + rating */}
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {review.customerName}
                      </span>
                      <span className="text-xs text-muted-foreground opacity-60">
                        {review.customerPhone}
                      </span>
                      <StarDisplay rating={review.rating} />
                      <span className="text-xs text-muted-foreground opacity-60">
                        {review.rating}/5
                      </span>
                    </div>

                    {/* Review text */}
                    {review.reviewText && (
                      <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 rounded-xl px-3 py-2 mt-1">
                        "{review.reviewText}"
                      </p>
                    )}

                    {/* Date */}
                    <p className="text-[11px] text-muted-foreground/40 mt-2">
                      {new Date(review.createdAt).toLocaleString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!review.approved ? (
                      <button
                        onClick={() =>
                          approveMutation.mutate({
                            id: review.id,
                            approved: true,
                          })
                        }
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          approveMutation.mutate({
                            id: review.id,
                            approved: false,
                          })
                        }
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Unapprove
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteId(review.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                      title="Delete review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Review"
        message="This review will be permanently deleted and cannot be recovered."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        busyLabel="Deleting..."
        onConfirm={() => { if (deleteId !== null) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </AdminLayout>
  );
}
