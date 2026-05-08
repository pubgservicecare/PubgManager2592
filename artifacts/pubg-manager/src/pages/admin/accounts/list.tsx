import { AdminLayout } from "@/components/AdminLayout";
import { useListAccounts, ListAccountsStatus, getListAccountsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/helpers";
import {
  Plus,
  Search,
  AlertCircle,
  Image as ImageIcon,
  Play,
  TrendingUp,
  Package,
  ShieldCheck,
  ArrowRight,
  Star,
  Download,
  CheckSquare,
  Square,
  Loader2,
  X,
  Trash2,
  EyeOff,
  Eye,
} from "lucide-react";
import { useMemo, useState } from "react";

const STATUS_STYLES: Record<string, { badge: string; ring: string; label: string }> = {
  active: { badge: "bg-green-500/15 text-green-400 border-green-500/30", ring: "ring-green-500/30", label: "Active" },
  reserved: { badge: "bg-amber-500/15 text-amber-300 border-amber-500/30", ring: "ring-amber-500/30", label: "Reserved" },
  under_review: { badge: "bg-sky-500/15 text-sky-300 border-sky-500/30", ring: "ring-sky-500/30", label: "Under Review" },
  hidden: { badge: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30", ring: "ring-zinc-500/30", label: "Hidden" },
  sold: { badge: "bg-slate-500/15 text-slate-300 border-slate-500/30", ring: "ring-slate-500/30", label: "Sold" },
  installment: { badge: "bg-accent/15 text-accent border-accent/30", ring: "ring-accent/30", label: "Installment" },
};

export function AdminAccountsList() {
  const [statusFilter, setStatusFilter] = useState<ListAccountsStatus | "all">("all");
  const [listedByFilter, setListedByFilter] = useState<"all" | "admin" | "seller">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const queryClient = useQueryClient();

  const params: Record<string, any> = {};
  if (statusFilter !== "all") params.status = statusFilter;
  if (listedByFilter !== "all") params.listedBy = listedByFilter;
  const { data: accounts, isLoading, refetch } = useListAccounts(params);

  const filteredAccounts = useMemo(
    () =>
      accounts?.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.accountId.toLowerCase().includes(search.toLowerCase()),
      ),
    [accounts, search],
  );

  const stats = useMemo(() => {
    const list = accounts ?? [];
    return {
      total: list.length,
      active: list.filter((a) => a.status === "active").length,
      sold: list.filter((a) => a.status === "sold").length,
      pendingLinks: list.reduce((sum, a) => sum + (a.pendingLinksCount || 0), 0),
    };
  }, [accounts]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!filteredAccounts) return;
    if (selected.size === filteredAccounts.length) setSelected(new Set());
    else setSelected(new Set(filteredAccounts.map((a) => a.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const runBulk = async (action: string, payload: Record<string, any> = {}) => {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Soft-delete ${selected.size} account(s)? They will be hidden from the marketplace.`)) {
      return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch("/api/accounts/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action, ...payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Bulk action failed");
        return;
      }
      clearSelection();
      // Invalidate any list-accounts query
      await queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey().slice(0, 1) as any });
      await refetch();
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleFeatured = async (id: number, isFeatured: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch(`/api/accounts/${id}/feature`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !isFeatured }),
    });
    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey().slice(0, 1) as any });
      await refetch();
    }
  };

  const downloadCsv = (kind: "accounts" | "customers" | "payments") => {
    window.open(`/api/exports/${kind}.csv`, "_blank");
  };

  const setBulkPrice = async () => {
    const v = prompt("Set new price (PKR) for selected accounts:");
    if (!v) return;
    const price = Number(v);
    if (!isFinite(price) || price < 0) {
      alert("Enter a valid number.");
      return;
    }
    await runBulk("set_price", { price });
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 mb-1">Inventory</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">ACCOUNTS</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage every account in your marketplace</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-card border border-border hover:border-primary/40 text-white font-bold px-4 py-3 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-30 overflow-hidden">
              <button onClick={() => downloadCsv("accounts")} className="w-full text-left px-4 py-2.5 hover:bg-secondary text-white text-sm font-semibold">
                Accounts
              </button>
              <button onClick={() => downloadCsv("customers")} className="w-full text-left px-4 py-2.5 hover:bg-secondary text-white text-sm font-semibold border-t border-border/50">
                Customers
              </button>
              <button onClick={() => downloadCsv("payments")} className="w-full text-left px-4 py-2.5 hover:bg-secondary text-white text-sm font-semibold border-t border-border/50">
                Payments
              </button>
            </div>
          </div>
          <Link href="/admin/accounts/new">
            <button
              data-testid="button-add-account"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              Add Account
            </button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Package className="w-5 h-5" />} label="Total" value={stats.total} tint="text-white" />
        <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Active" value={stats.active} tint="text-green-400" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Sold" value={stats.sold} tint="text-slate-300" />
        <StatCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Pending Links"
          value={stats.pendingLinks}
          tint={stats.pendingLinks > 0 ? "text-destructive" : "text-muted-foreground"}
        />
      </div>

      {/* Listed-by tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { v: "all", label: "All Accounts" },
            { v: "admin", label: "My Listings" },
            { v: "seller", label: "Seller Listings" },
          ] as const
        ).map((t) => (
          <button
            key={t.v}
            onClick={() => setListedByFilter(t.v)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              listedByFilter === t.v
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + status filter */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border focus:border-primary rounded-xl pl-12 pr-4 py-2.5 text-white outline-none transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-white outline-none w-full sm:w-52 appearance-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="reserved">Reserved</option>
          <option value="under_review">Under Review</option>
          <option value="hidden">Hidden</option>
          <option value="sold">Sold</option>
          <option value="installment">Installment</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {filteredAccounts && filteredAccounts.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 bg-card/60 border border-border rounded-2xl p-3">
          <button
            type="button"
            onClick={selectAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
            data-testid="bulk-select-all"
          >
            {selected.size === filteredAccounts.length && filteredAccounts.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selected.size === filteredAccounts.length && filteredAccounts.length > 0 ? "Unselect all" : "Select all"}
          </button>
          {selected.size > 0 && (
            <>
              <div className="text-xs font-bold text-primary mr-2">{selected.size} selected</div>
              <button
                disabled={bulkBusy}
                onClick={() => runBulk("feature")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-colors disabled:opacity-60"
                data-testid="bulk-feature"
              >
                <Star className="w-3.5 h-3.5" /> Feature
              </button>
              <button
                disabled={bulkBusy}
                onClick={() => runBulk("unfeature")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-secondary text-white hover:bg-secondary/80 border border-border transition-colors disabled:opacity-60"
                data-testid="bulk-unfeature"
              >
                Unfeature
              </button>
              <button
                disabled={bulkBusy}
                onClick={() => runBulk("set_status_active")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-green-500/15 text-green-300 hover:bg-green-500/25 border border-green-500/30 transition-colors disabled:opacity-60"
              >
                <Eye className="w-3.5 h-3.5" /> Activate
              </button>
              <button
                disabled={bulkBusy}
                onClick={() => runBulk("set_status_hidden")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-zinc-500/15 text-zinc-300 hover:bg-zinc-500/25 border border-zinc-500/30 transition-colors disabled:opacity-60"
              >
                <EyeOff className="w-3.5 h-3.5" /> Hide
              </button>
              <button
                disabled={bulkBusy}
                onClick={setBulkPrice}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-colors disabled:opacity-60"
              >
                Set Price
              </button>
              <button
                disabled={bulkBusy}
                onClick={() => runBulk("delete")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30 transition-colors disabled:opacity-60"
                data-testid="bulk-delete"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                disabled={bulkBusy}
                onClick={clearSelection}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
                aria-label="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {bulkBusy && <Loader2 className="w-4 h-4 animate-spin text-primary ml-1" />}
            </>
          )}
        </div>
      )}

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-secondary/40" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-secondary/40 rounded" />
                <div className="h-3 w-1/2 bg-secondary/40 rounded" />
                <div className="h-8 w-full bg-secondary/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !filteredAccounts || filteredAccounts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-white font-bold text-lg">No accounts found</p>
          <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters or add a new account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredAccounts.map((acc) => {
            const cover = (acc as any).imageUrls?.[0] as string | undefined;
            const hasVideo = !!(acc as any).videoUrl;
            const isFeatured = !!(acc as any).isFeatured;
            const isSelected = selected.has(acc.id);
            const style = STATUS_STYLES[acc.status] || STATUS_STYLES.hidden;
            const margin =
              acc.status === "sold" && (acc as any).finalSoldPrice
                ? Number((acc as any).finalSoldPrice) - Number(acc.purchasePrice)
                : Number(acc.priceForSale) - Number(acc.purchasePrice);

            return (
              <div
                key={acc.id}
                className={`relative group bg-card border ${
                  isSelected ? "border-primary" : "border-border"
                } hover:border-primary/60 rounded-2xl overflow-hidden shadow-lg hover:shadow-primary/10 transition-all flex flex-col h-full`}
                data-testid={`card-account-${acc.id}`}
              >
                {/* Top action overlay: select + feature */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSelect(acc.id);
                    }}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/70 backdrop-blur-sm border border-white/20 text-white hover:bg-black/90"
                    }`}
                    aria-label={isSelected ? "Unselect" : "Select"}
                    data-testid={`select-account-${acc.id}`}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </div>
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => toggleFeatured(acc.id, isFeatured, e)}
                    title={isFeatured ? "Unfeature" : "Mark as featured"}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      isFeatured
                        ? "bg-amber-500 text-black"
                        : "bg-black/70 backdrop-blur-sm border border-white/20 text-white hover:text-amber-300"
                    }`}
                    data-testid={`feature-toggle-${acc.id}`}
                  >
                    <Star className={`w-4 h-4 ${isFeatured ? "fill-current" : ""}`} />
                  </button>
                </div>

                <Link href={`/admin/accounts/${acc.id}`}>
                  <div className="cursor-pointer">
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                      {cover ? (
                        <img
                          src={`/api/storage${cover}`}
                          alt={acc.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/40 pointer-events-none" />

                      {/* Status badge — moved next to selection */}
                      <div className="absolute top-12 left-3">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border backdrop-blur-sm ${style.badge}`}>
                          {style.label.toUpperCase()}
                        </span>
                      </div>

                      {/* ID + video */}
                      <div className="absolute top-12 right-3 flex items-center gap-1.5">
                        {hasVideo && (
                          <span className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-full p-1.5">
                            <Play className="w-3 h-3 text-white fill-white" />
                          </span>
                        )}
                        <span className="bg-black/60 backdrop-blur-sm border border-white/10 text-white text-[10px] font-mono font-bold px-2 py-1 rounded-full">
                          #{acc.accountId}
                        </span>
                      </div>

                      {/* Bottom-left: seller / admin tag */}
                      <div className="absolute bottom-3 left-3">
                        {acc.sellerName ? (
                          <span className="inline-block bg-amber-500/90 text-black px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                            Seller: {acc.sellerName}
                          </span>
                        ) : (
                          <span className="inline-block bg-primary/90 text-primary-foreground px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                            Admin
                          </span>
                        )}
                      </div>

                      {/* Bottom-right: pending links */}
                      {acc.pendingLinksCount > 0 && (
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-[10px] font-bold shadow-lg">
                          <AlertCircle className="w-3 h-3" />
                          {acc.pendingLinksCount} Pending
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-display font-bold text-white text-base leading-snug line-clamp-2 mb-3 group-hover:text-primary transition-colors" title={acc.title}>
                        {acc.title}
                      </h3>

                      <div className="bg-secondary/40 border border-border/50 rounded-xl p-3 mb-3">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sell</span>
                          <span className="text-lg font-bold text-primary">{formatCurrency(acc.priceForSale)}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost</span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {formatCurrency(acc.purchasePrice)}
                          </span>
                        </div>
                        {!isNaN(margin) && (
                          <div className="flex items-baseline justify-between mt-1.5 pt-1.5 border-t border-border/50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Margin</span>
                            <span className={`text-xs font-bold ${margin >= 0 ? "text-green-400" : "text-destructive"}`}>
                              {margin >= 0 ? "+" : ""}{formatCurrency(margin)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between text-sm font-bold text-primary group-hover:text-white transition-colors">
                        <span>Manage Account</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-lg">
      <div className={`w-10 h-10 rounded-xl bg-secondary/60 border border-border/50 flex items-center justify-center ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${tint}`}>{value}</p>
      </div>
    </div>
  );
}
