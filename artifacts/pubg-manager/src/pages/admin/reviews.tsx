import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Star, CheckCircle, XCircle, Trash2, MessageCircle, Home, Globe, Gamepad2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface AdminReview {
  id: number;
  accountId: number | null;
  accountTitle: string | null;
  reviewType: string;
  customerUserId: number;
  customerName: string;
  customerPhone: string;
  rating: number;
  reviewText: string | null;
  approved: boolean;
  featuredOnHome: boolean;
  createdAt: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <Star key={n} className={`w-3 h-3 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-slate-600"}`} />
      ))}
    </div>
  );
}

type StatusFilter = "all" | "pending" | "approved";
type TypeFilter = "all" | "account" | "platform";

export function AdminReviews() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: reviews = [], isLoading } = useQuery<AdminReview[]>({
    queryKey: ["admin-reviews", statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const qs = params.toString();
      const res = await fetch(`/api/admin/reviews${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Record<string, boolean> }) => {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update review");
      return res.json();
    },
    onSuccess: (_, { patch }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      if ("approved" in patch) toast({ title: patch.approved ? "Review approved ✓" : "Review unapproved" });
      if ("featuredOnHome" in patch) toast({ title: patch.featuredOnHome ? "⭐ Added to Home Page" : "Removed from Home Page" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setDeleteId(null);
      toast({ title: "Review deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pending = reviews.filter((r) => !r.approved).length;
  const featuredCount = reviews.filter((r) => r.featuredOnHome).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-primary" /> Customer Reviews
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Moderate account reviews &amp; platform reviews. Feature platform reviews on the home page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {featuredCount > 0 && (
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" /> {featuredCount} on home
              </span>
            )}
            {pending > 0 && (
              <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-sm font-bold px-3 py-1.5 rounded-full">
                {pending} pending
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 flex items-start gap-3">
          <Home className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-orange-300 font-semibold">Home Page:</span> Only <span className="text-orange-300 font-semibold">Platform Reviews</span> can be featured on the home page. Approve a platform review first, then click "Show on Home".
          </p>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3">
          {/* Type filter */}
          <div className="flex gap-1.5">
            {([
              { val: "all", label: "All Types" },
              { val: "account", label: "Account", Icon: Gamepad2 },
              { val: "platform", label: "Platform", Icon: Globe },
            ] as { val: TypeFilter; label: string; Icon?: any }[]).map(({ val, label, Icon }) => (
              <button
                key={val}
                onClick={() => setTypeFilter(val)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  typeFilter === val
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary border border-transparent"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />} {label}
              </button>
            ))}
          </div>

          <div className="w-px bg-border self-stretch" />

          {/* Status filter */}
          <div className="flex gap-1.5">
            {(["all", "pending", "approved"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors capitalize ${
                  statusFilter === f
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary border border-transparent"
                }`}
              >
                {f}
                {f === "pending" && pending > 0 && (
                  <span className="ml-1.5 bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded-full">{pending}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-card rounded-2xl animate-pulse border border-border" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No reviews found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`bg-card border rounded-2xl p-5 transition-colors ${
                  review.featuredOnHome ? "border-orange-500/30" : !review.approved ? "border-yellow-500/20" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type + Account + Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {/* Type badge */}
                      {review.reviewType === "platform" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
                          <Globe className="w-2.5 h-2.5" /> Platform
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                          <Gamepad2 className="w-2.5 h-2.5" /> Account
                        </span>
                      )}

                      {review.accountTitle && review.accountId && (
                        <Link href={`/admin/accounts/${review.accountId}`}>
                          <span className="text-sm font-semibold text-primary hover:underline truncate max-w-xs cursor-pointer">
                            {review.accountTitle}
                          </span>
                        </Link>
                      )}
                      {review.reviewType === "platform" && !review.accountTitle && (
                        <span className="text-sm font-semibold text-slate-400">CodexStocks Platform</span>
                      )}

                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        review.approved
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}>
                        {review.approved ? "Approved" : "Pending"}
                      </span>
                      {review.featuredOnHome && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-1">
                          <Home className="w-2.5 h-2.5" /> On Home
                        </span>
                      )}
                    </div>

                    {/* Customer + rating */}
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">{review.customerName}</span>
                      <span className="text-xs text-muted-foreground opacity-60">{review.customerPhone}</span>
                      <StarDisplay rating={review.rating} />
                      <span className="text-xs text-muted-foreground opacity-60">{review.rating}/5</span>
                    </div>

                    {review.reviewText && (
                      <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/30 rounded-xl px-3 py-2 mt-1">
                        "{review.reviewText}"
                      </p>
                    )}

                    <p className="text-[11px] text-muted-foreground/40 mt-2">
                      {new Date(review.createdAt).toLocaleString("en-PK", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!review.approved ? (
                      <button
                        onClick={() => patchMutation.mutate({ id: review.id, patch: { approved: true } })}
                        disabled={patchMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => patchMutation.mutate({ id: review.id, patch: { approved: false } })}
                        disabled={patchMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Unapprove
                      </button>
                    )}

                    {/* "Show on Home" only for approved PLATFORM reviews */}
                    {review.approved && review.reviewType === "platform" && (
                      <button
                        onClick={() => patchMutation.mutate({ id: review.id, patch: { featuredOnHome: !review.featuredOnHome } })}
                        disabled={patchMutation.isPending}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 border ${
                          review.featuredOnHome
                            ? "bg-orange-500/20 hover:bg-orange-500/10 text-orange-400 border-orange-500/30"
                            : "bg-secondary hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400 border-border hover:border-orange-500/30"
                        }`}
                      >
                        <Home className="w-3.5 h-3.5" />
                        {review.featuredOnHome ? "Remove from Home" : "Show on Home"}
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteId(review.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
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
