import { PublicLayout } from "@/components/PublicLayout";
import { useRoute, Link, useLocation } from "wouter";
import { formatCurrency, formatDateTime } from "@/lib/helpers";
import {
  Info,
  ShieldCheck,
  CheckCircle,
  Pencil,
  Trash2,
  Globe,
  Lock,
  X,
  ArrowLeft,
  Eye,
  TrendingUp,
  Calendar,
  Hash,
  DollarSign,
  Image as ImageIcon,
  ExternalLink,
  Activity,
  Clock,
  PieChart,
  Tag,
  User,
  Phone,
  ImageOff,
  Copy,
  Check,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useSellerAuth } from "@/hooks/use-seller-auth";
import { useSEO } from "@/hooks/use-seo";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type SellerAccount = {
  id: number;
  title: string;
  accountId: string;
  purchasePrice: number | null;
  priceForSale: number;
  finalSoldPrice: number | null;
  status: string;
  visibility: "public" | "private";
  videoUrl: string | null;
  imageUrls: string[];
  description: string | null;
  customerName: string | null;
  customerContact: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

function VideoPlayer({ url }: { url: string }) {
  if (!url)
    return (
      <div className="aspect-video w-full bg-card border border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
        <Info className="w-12 h-12 mb-4 opacity-50" />
        <span className="font-bold">No Showcase Video Available</span>
      </div>
    );

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0];
    return (
      <iframe
        className="w-full aspect-video rounded-2xl shadow-2xl border border-border"
        src={`https://www.youtube.com/embed/${videoId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <video
      src={url}
      controls
      muted
      className="w-full aspect-video rounded-2xl shadow-2xl border border-border bg-black object-contain"
    />
  );
}

const statusBadge: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  sold: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  under_review: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  installment: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  hidden: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  reserved: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

export function SellerAccountDetail() {
  const [, params] = useRoute("/seller/accounts/:id");
  const id = parseInt(params?.id || "0");
  const isValidId = Number.isFinite(id) && id > 0;
  const { seller, isLoading: authLoading } = useSellerAuth();
  const [, setLocation] = useLocation();

  const [account, setAccount] = useState<SellerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSell, setShowSell] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [togglingVis, setTogglingVis] = useState(false);

  useSEO({
    title: account ? `${account.title} — Seller View` : "Listing — Seller View",
  });

  useEffect(() => {
    if (!authLoading && !seller) setLocation("/seller/login");
  }, [seller, authLoading, setLocation]);

  const reload = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/seller/accounts/${id}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) setErrorMsg("Listing not found or you don't have access");
        else setErrorMsg("Could not load listing");
        setAccount(null);
      } else {
        setAccount(await res.json());
      }
    } catch {
      setErrorMsg("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isValidId) {
      setErrorMsg("Invalid listing id");
      setLoading(false);
      return;
    }
    if (seller) reload();
  }, [seller, id, isValidId]);

  const toggleVisibility = async () => {
    if (!account || togglingVis) return;
    const next = account.visibility === "private" ? "public" : "private";
    setTogglingVis(true);
    try {
      const res = await fetch(`/api/seller/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) reload();
      else alert("Could not update visibility");
    } finally {
      setTogglingVis(false);
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/seller/accounts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setShowDelete(false);
      setLocation("/seller/dashboard");
    } else {
      alert("Could not delete");
    }
  };

  if (authLoading || !seller || loading) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PublicLayout>
    );
  }

  if (errorMsg || !account) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 py-20">
          <div className="text-center bg-card p-12 rounded-3xl border border-border">
            <h2 className="text-2xl font-bold text-destructive mb-2">{errorMsg || "Listing not found"}</h2>
            <Link href="/seller/dashboard">
              <button className="mt-4 inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-black font-bold px-5 py-2.5 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const isEditable = account.status === "active" || account.status === "under_review" || account.status === "hidden";
  const canMarkSold = account.status === "active" || account.status === "under_review";
  const isPrivate = account.visibility === "private";
  const isSold = account.status === "sold" || account.status === "installment";
  const profit = account.finalSoldPrice != null && account.purchasePrice != null
    ? account.finalSoldPrice - account.purchasePrice
    : null;
  const expectedProfit = account.purchasePrice != null
    ? account.priceForSale - account.purchasePrice
    : null;
  const margin = account.purchasePrice != null && account.purchasePrice > 0
    ? Math.round(((account.priceForSale - account.purchasePrice) / account.purchasePrice) * 100)
    : null;
  const daysListed = Math.max(1, Math.floor(
    (Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const lastUpdatedDays = Math.floor(
    (Date.now() - new Date(account.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <PublicLayout>
      {/* Hero header strip */}
      <div className="relative bg-gradient-to-b from-primary/10 via-card/60 to-transparent border-b border-border/50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.10),transparent_60%)] pointer-events-none" />
        <div className="absolute -top-24 -right-12 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          {/* Breadcrumb / back */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-5">
            <Link href="/seller/dashboard">
              <button className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-white transition" data-testid="back-to-dashboard">
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-white">Listing</span>
          </div>

          {/* Title row */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-1 rounded-full border ${
                    statusBadge[account.status] || "bg-secondary text-muted-foreground border-border"
                  }`}
                  data-testid="status-badge"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {account.status.replace("_", " ")}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-1 rounded-full border ${
                    isPrivate
                      ? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  }`}
                  data-testid="visibility-badge"
                >
                  {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  {isPrivate ? "Private" : "Public"}
                </span>
                <CopyableId accountId={account.accountId} />
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white leading-tight tracking-tight">
                {account.title}
              </h1>
              <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Listed {formatDateTime(account.createdAt)} · {daysListed} day{daysListed !== 1 ? "s" : ""} live
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isPrivate && account.status === "active" && (
                <Link href={`/account/${account.id}`}>
                  <button
                    className="inline-flex items-center gap-2 border border-border hover:border-primary/50 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition"
                    data-testid="preview-buyer-btn"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview as Buyer
                  </button>
                </Link>
              )}
              {canMarkSold && (
                <button
                  onClick={() => setShowSell(true)}
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-black font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                  data-testid="mark-sold-btn-hero"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Sold
                </button>
              )}
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
            <KpiCard
              icon={<Tag className="w-4 h-4" />}
              label="Listed Price"
              value={formatCurrency(account.priceForSale)}
              tone="primary"
            />
            {isSold && account.finalSoldPrice != null ? (
              <KpiCard
                icon={<CheckCircle className="w-4 h-4" />}
                label="Sold For"
                value={formatCurrency(account.finalSoldPrice)}
                tone="emerald"
              />
            ) : (
              <KpiCard
                icon={<DollarSign className="w-4 h-4" />}
                label={account.purchasePrice != null ? "Purchase Cost" : "Cost"}
                value={account.purchasePrice != null ? formatCurrency(account.purchasePrice) : "—"}
                tone="amber"
              />
            )}
            <KpiCard
              icon={<TrendingUp className="w-4 h-4" />}
              label={isSold ? "Net Profit" : "Expected Profit"}
              value={
                isSold && profit != null
                  ? formatCurrency(profit)
                  : expectedProfit != null
                  ? formatCurrency(expectedProfit)
                  : "—"
              }
              hint={margin != null ? `${margin}% margin` : undefined}
              tone={
                isSold
                  ? profit != null && profit >= 0
                    ? "emerald"
                    : "destructive"
                  : expectedProfit != null && expectedProfit >= 0
                  ? "emerald"
                  : "muted"
              }
            />
            <KpiCard
              icon={<Eye className="w-4 h-4" />}
              label="Total Views"
              value={account.viewCount.toLocaleString()}
              hint={daysListed > 0 ? `~${(account.viewCount / daysListed).toFixed(1)}/day` : undefined}
              tone="sky"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left column: Media + content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Showcase */}
            <SectionCard
              title="SHOWCASE VIDEO"
              icon={<Activity className="w-4 h-4" />}
              compact
            >
              <VideoPlayer url={account.videoUrl || ""} />
            </SectionCard>

            {/* Thumbnail */}
            <SectionCard
              title="THUMBNAIL"
              icon={<ImageIcon className="w-4 h-4" />}
            >
              {account.imageUrls.length > 0 ? (
                <a
                  href={`/api/storage${account.imageUrls[0]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block w-full max-w-md mx-auto aspect-video rounded-xl overflow-hidden border border-border bg-secondary hover:border-primary/60 transition-colors"
                >
                  <img
                    src={`/api/storage${account.imageUrls[0]}`}
                    alt="thumbnail"
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </span>
                </a>
              ) : (
                <EmptyState icon={<ImageOff className="w-8 h-8" />} text="No thumbnail uploaded" />
              )}
            </SectionCard>

            {/* Description */}
            <SectionCard title="DESCRIPTION" icon={<Info className="w-4 h-4" />}>
              {account.description ? (
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{account.description}</p>
              ) : (
                <EmptyState text="No description provided yet." />
              )}
            </SectionCard>

            {/* Sale info — only when sold */}
            {isSold && (
              <div className="bg-gradient-to-br from-emerald-500/10 via-card to-card rounded-2xl border border-emerald-500/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-emerald-500/20 flex items-center justify-between">
                  <h2 className="text-sm font-display font-bold text-emerald-300 inline-flex items-center gap-2 tracking-wider">
                    <CheckCircle className="w-4 h-4" />
                    SALE COMPLETED
                  </h2>
                  {profit != null && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${profit >= 0 ? "bg-emerald-500/20 text-emerald-200" : "bg-destructive/20 text-destructive"}`}>
                      {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                    </span>
                  )}
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SaleField icon={<DollarSign className="w-3.5 h-3.5" />} label="Final Sold Price" value={account.finalSoldPrice != null ? formatCurrency(account.finalSoldPrice) : "—"} highlight />
                  {profit !== null && (
                    <SaleField
                      icon={<TrendingUp className="w-3.5 h-3.5" />}
                      label="Profit"
                      value={formatCurrency(profit)}
                      tone={profit >= 0 ? "emerald" : "destructive"}
                    />
                  )}
                  {account.customerName && (
                    <SaleField icon={<User className="w-3.5 h-3.5" />} label="Customer Name" value={account.customerName} />
                  )}
                  {account.customerContact && (
                    <SaleField icon={<Phone className="w-3.5 h-3.5" />} label="Customer Contact" value={account.customerContact} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column: actions + analytics */}
          <div className="space-y-5">
            {/* Manage actions */}
            <div className="bg-card rounded-2xl border border-border p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-display font-bold text-primary tracking-wider inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  MANAGE LISTING
                </h3>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Owner</span>
              </div>
              <div className="space-y-2.5">
                {canMarkSold && (
                  <button
                    onClick={() => setShowSell(true)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-black font-bold py-3 rounded-xl text-sm transition active:scale-[0.98] shadow-md shadow-emerald-500/20"
                    data-testid="mark-sold-btn"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Sold
                  </button>
                )}
                {canMarkSold && (
                  <button
                    onClick={toggleVisibility}
                    disabled={togglingVis}
                    className="w-full inline-flex items-center justify-center gap-2 border border-border hover:border-primary/40 hover:bg-primary/5 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
                    data-testid="toggle-visibility-btn"
                  >
                    {isPrivate ? (
                      <>
                        <Globe className="w-4 h-4" />
                        Make Public
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Make Private
                      </>
                    )}
                  </button>
                )}
                {isEditable && (
                  <Link href={`/seller/accounts/${id}/edit`}>
                    <button
                      className="w-full inline-flex items-center justify-center gap-2 border border-border hover:border-primary/40 hover:bg-primary/5 text-white font-bold py-2.5 rounded-xl text-sm transition"
                      data-testid="edit-btn"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Listing
                    </button>
                  </Link>
                )}
                {isEditable && (
                  <button
                    onClick={() => setShowDelete(true)}
                    className="w-full inline-flex items-center justify-center gap-2 border border-destructive/30 text-destructive hover:bg-destructive/10 font-bold py-2.5 rounded-xl text-sm transition"
                    data-testid="delete-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Listing
                  </button>
                )}
                {!canMarkSold && !isEditable && (
                  <div className="text-center py-4 px-3 rounded-xl bg-secondary/30 border border-border/50">
                    <p className="text-xs text-muted-foreground italic">
                      No actions available for status:{" "}
                      <span className="text-white font-bold uppercase">{account.status.replace("_", " ")}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Visibility helper note */}
              {!isPrivate && account.status === "active" ? null : (
                <p className="mt-4 text-[11px] text-muted-foreground italic text-center pt-3 border-t border-border/50">
                  {isPrivate
                    ? "This listing is private — only you can see it."
                    : `Status "${account.status.replace("_", " ")}" is not visible to buyers.`}
                </p>
              )}
            </div>

            {/* Pricing breakdown */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-xs font-display font-bold text-primary tracking-wider mb-4 inline-flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                PRICING BREAKDOWN
              </h3>
              <div className="space-y-3 text-sm">
                {account.purchasePrice != null && (
                  <PriceLine label="Purchase Cost" value={formatCurrency(account.purchasePrice)} tone="amber" />
                )}
                <PriceLine label="Listed Price" value={formatCurrency(account.priceForSale)} tone="primary" bold />
                {expectedProfit != null && !isSold && (
                  <PriceLine
                    label="Expected Profit"
                    value={formatCurrency(expectedProfit)}
                    tone={expectedProfit >= 0 ? "emerald" : "destructive"}
                  />
                )}
                {isSold && account.finalSoldPrice != null && (
                  <>
                    <div className="border-t border-border/50 pt-3" />
                    <PriceLine label="Final Sold Price" value={formatCurrency(account.finalSoldPrice)} tone="emerald" bold />
                    {profit !== null && (
                      <PriceLine
                        label="Net Profit"
                        value={formatCurrency(profit)}
                        tone={profit >= 0 ? "emerald" : "destructive"}
                      />
                    )}
                  </>
                )}
                {margin != null && (
                  <div className="bg-secondary/30 rounded-lg px-3 py-2 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider">Margin</span>
                      <span className={`font-bold ${margin >= 0 ? "text-emerald-300" : "text-destructive"}`}>{margin}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Activity / timestamps */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-xs font-display font-bold text-primary tracking-wider mb-4 inline-flex items-center gap-2">
                <Clock className="w-4 h-4" />
                ACTIVITY
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-xs">Listed</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(account.createdAt)}</p>
                  </div>
                </li>
                {account.updatedAt !== account.createdAt && (
                  <li className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-xs">Last Updated</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(account.updatedAt)}
                        {lastUpdatedDays > 0 && <> · {lastUpdatedDays} day{lastUpdatedDays !== 1 ? "s" : ""} ago</>}
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showSell && (
        <MarkSoldDialog
          accountId={id}
          title={account.title}
          defaultPrice={account.priceForSale}
          onClose={() => setShowSell(false)}
          onSuccess={() => {
            setShowSell(false);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={showDelete}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Listing?"
        message="This listing will be hidden from buyers. You cannot undo this."
        confirmLabel="Delete"
        variant="danger"
      />
    </PublicLayout>
  );
}

/* ---------- helpers ---------- */

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "emerald" | "amber" | "destructive" | "sky" | "muted";
}) {
  const toneMap: Record<string, { ring: string; text: string; chip: string }> = {
    primary: { ring: "border-primary/30", text: "text-primary", chip: "bg-primary/15 text-primary" },
    emerald: { ring: "border-emerald-500/30", text: "text-emerald-300", chip: "bg-emerald-500/15 text-emerald-300" },
    amber: { ring: "border-amber-500/30", text: "text-amber-300", chip: "bg-amber-500/15 text-amber-300" },
    destructive: { ring: "border-destructive/30", text: "text-destructive", chip: "bg-destructive/15 text-destructive" },
    sky: { ring: "border-sky-500/30", text: "text-sky-300", chip: "bg-sky-500/15 text-sky-300" },
    muted: { ring: "border-border", text: "text-white", chip: "bg-secondary text-muted-foreground" },
  };
  const t = toneMap[tone];
  return (
    <div className={`bg-card/80 backdrop-blur rounded-2xl border ${t.ring} p-3.5 md:p-4 transition hover:bg-card`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`w-7 h-7 rounded-lg ${t.chip} flex items-center justify-center`}>{icon}</span>
      </div>
      <p className={`text-lg md:text-xl font-display font-bold ${t.text} leading-tight tracking-tight`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  compact,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="bg-card rounded-2xl border border-border overflow-hidden">
      <header className="px-5 md:px-6 py-3.5 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-xs font-display font-bold text-primary tracking-wider inline-flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </header>
      <div className={compact ? "p-2 md:p-2.5" : "p-5 md:p-6"}>{children}</div>
    </section>
  );
}

function EmptyState({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground py-8 gap-2">
      {icon && <div className="opacity-50">{icon}</div>}
      <p className="text-xs italic opacity-80">{text}</p>
    </div>
  );
}

function SaleField({
  icon,
  label,
  value,
  highlight,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "emerald" | "destructive";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "destructive"
      ? "text-destructive"
      : highlight
      ? "text-emerald-300"
      : "text-white";
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider inline-flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={`text-base md:text-lg font-bold ${valueClass} mt-1 break-words`}>{value}</p>
    </div>
  );
}

function PriceLine({
  label,
  value,
  tone = "primary",
  bold,
}: {
  label: string;
  value: string;
  tone?: "primary" | "emerald" | "amber" | "destructive";
  bold?: boolean;
}) {
  const toneMap: Record<string, string> = {
    primary: "text-primary",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    destructive: "text-destructive",
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">{label}</span>
      <span className={`${toneMap[tone]} ${bold ? "font-bold text-base" : "font-bold"}`}>{value}</span>
    </div>
  );
}

function CopyableId({ accountId }: { accountId: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/15 text-primary font-bold px-3 py-1 rounded-full text-[11px] border border-primary/20 tracking-wider transition group"
      title="Click to copy"
      data-testid="copy-account-id"
    >
      <Hash className="w-3 h-3" />
      <span className="font-mono">{accountId}</span>
      {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />}
    </button>
  );
}

/* ---------- mark sold dialog ---------- */

function MarkSoldDialog({
  accountId,
  title,
  defaultPrice,
  onClose,
  onSuccess,
}: {
  accountId: number;
  title: string;
  defaultPrice: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [finalSoldPrice, setFinalSoldPrice] = useState(String(defaultPrice));
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!finalSoldPrice || isNaN(parseFloat(finalSoldPrice))) {
      setErrorMsg("Sale price required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/seller/accounts/${accountId}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          finalSoldPrice: parseFloat(finalSoldPrice),
          customerName: customerName.trim() || null,
          customerContact: customerContact.trim() || null,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark sold");
      }
      onSuccess();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-300">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white tracking-wider text-base">MARK AS SOLD</h3>
              <p className="text-[11px] text-muted-foreground truncate max-w-[260px]">{title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-secondary/40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase block">Final Sold Price (Rs) *</label>
            <input
              type="number"
              value={finalSoldPrice}
              onChange={(e) => setFinalSoldPrice(e.target.value)}
              required
              className="w-full bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-2.5 text-white outline-none text-sm"
              data-testid="sell-price-input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase block">Customer Name (optional)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Buyer's name"
              className="w-full bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-2.5 text-white outline-none text-sm"
              data-testid="sell-customer-name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase block">Customer Contact (optional)</label>
            <input
              type="text"
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              placeholder="Phone or email"
              className="w-full bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-2.5 text-white outline-none text-sm"
              data-testid="sell-customer-contact"
            />
            <p className="text-[10px] text-muted-foreground">Customer info is private — only you and admin will see it.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase block">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Anything to remember about this sale..."
              className="w-full bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-2.5 text-white outline-none text-sm resize-none"
              data-testid="sell-note"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-white hover:bg-secondary/40 font-bold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-emerald-500 hover:bg-emerald-500/90 text-black font-bold py-2.5 rounded-xl text-sm transition active:scale-[0.98] disabled:opacity-50 inline-flex items-center justify-center gap-2"
              data-testid="sell-confirm-btn"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? "Saving..." : "Confirm Sold"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
