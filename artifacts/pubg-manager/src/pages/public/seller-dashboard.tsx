import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { PublicLayout } from "@/components/PublicLayout";
import { useSEO } from "@/hooks/use-seo";
import { useSellerAuth } from "@/hooks/use-seller-auth";
import {
  Plus,
  LogOut,
  Package,
  TrendingUp,
  TrendingDown,
  Wallet,
  Pencil,
  Loader2,
  MessageCircle,
  Send,
  Shield,
  ShieldCheck,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  ChevronDown,
  Activity,
  ArrowRight,
  Layers,
  AlertCircle,
  AtSign,
  Save,
  Globe,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDateTime, formatCurrency } from "@/lib/helpers";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface SellerStats {
  totalListings: number;
  activeListings: number;
  underReviewListings: number;
  soldListings: number;
  totalEarnings: number;
  totalInvestment: number;
  netProfit: number;
}

interface SellerAccount {
  id: number;
  title: string;
  accountId: string;
  purchasePrice: number | null;
  priceForSale: number;
  finalSoldPrice: number | null;
  status: string;
  visibility?: "public" | "private";
  videoUrl: string | null;
  description: string | null;
  customerName: string | null;
  createdAt: string;
}

type StatusFilter = "all" | "active" | "under_review" | "sold" | "pending";

export function SellerDashboard() {
  useSEO({ title: "Seller Dashboard — PUBG Marketplace" });
  const { seller, isLoading, logout } = useSellerAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [accounts, setAccounts] = useState<SellerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [chatUnread, setChatUnread] = useState(0);

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    if (!isLoading && !seller) setLocation("/");
  }, [seller, isLoading, setLocation]);

  const reload = async () => {
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        fetch("/api/seller/dashboard", { credentials: "include" }),
        fetch("/api/seller/accounts", { credentials: "include" }),
      ]);
      if (sRes.ok) {
        const s = await sRes.json();
        setStats(s);
      }
      if (aRes.ok) {
        const a = await aRes.json();
        setAccounts(Array.isArray(a) ? a : []);
      } else {
        setAccounts([]);
      }
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seller) reload();
  }, [seller]);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!a.title.toLowerCase().includes(q) && !a.accountId.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [accounts, filter, search]);

  if (isLoading || !seller) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  const isApproved = seller.status === "approved";
  const profitMargin =
    stats && stats.totalEarnings > 0
      ? Math.round((stats.netProfit / stats.totalEarnings) * 100)
      : 0;
  const profitPositive = (stats?.netProfit ?? 0) >= 0;

  const inventoryData = stats
    ? [
        { name: "Active", value: stats.activeListings, fill: "hsl(var(--primary))" },
        { name: "Under Review", value: stats.underReviewListings, fill: "#f59e0b" },
        { name: "Sold", value: stats.soldListings, fill: "#3b82f6" },
      ].filter((d) => d.value > 0)
    : [];
  const totalInventory =
    (stats?.activeListings ?? 0) + (stats?.underReviewListings ?? 0) + (stats?.soldListings ?? 0);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PublicLayout>
      <div className="flex-1 px-4 py-6 sm:py-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">
              Seller Portal
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wider truncate">
                DASHBOARD OVERVIEW
              </h1>
              <SellerStatusBadge status={seller.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, <span className="text-white font-semibold">{seller.name}</span> · {today}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isApproved && (
              <Link href="/seller/accounts/new">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition shadow-lg shadow-primary/20"
                  data-testid="add-listing-btn"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Listing</span>
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Public username — shown on listings */}
        <UsernameCard seller={seller} />

        {/* Headline financial KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <KpiCard
            label="Total Investment"
            value={formatCurrency(stats?.totalInvestment ?? 0)}
            icon={Wallet}
            accent="blue"
            subline="Capital deployed"
          />
          <KpiCard
            label="Total Earnings"
            value={formatCurrency(stats?.totalEarnings ?? 0)}
            icon={TrendingUp}
            accent="emerald"
            subline="Gross sales"
          />
          <KpiCard
            label="Net Profit"
            value={formatCurrency(stats?.netProfit ?? 0)}
            icon={profitPositive ? TrendingUp : TrendingDown}
            accent={profitPositive ? "primary" : "destructive"}
            subline={`${profitMargin >= 0 ? "+" : ""}${profitMargin}% margin`}
            highlight
          />
        </div>

        {/* Secondary metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <MetricTile icon={Package} label="Total Listings" value={stats?.totalListings ?? 0} color="primary" />
          <MetricTile icon={CheckCircle2} label="Active" value={stats?.activeListings ?? 0} color="emerald" />
          <MetricTile icon={Clock} label="Under Review" value={stats?.underReviewListings ?? 0} color="amber" />
          <MetricTile icon={Layers} label="Sold" value={stats?.soldListings ?? 0} color="blue" />
        </div>

        {/* Bottom grid: chart + status panel */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          {/* Inventory chart */}
          <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white tracking-wider">
                    LISTINGS BREAKDOWN
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {totalInventory} tracked listings
                  </p>
                </div>
              </div>
            </div>

            {totalInventory === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-secondary/40 flex items-center justify-center mb-3">
                  <Package className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground">No listings yet</p>
                {isApproved && (
                  <Link href="/seller/accounts/new">
                    <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                      Create your first listing <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {inventoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          color: "white",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  {inventoryData.map((d) => {
                    const pct = Math.round((d.value / totalInventory) * 100);
                    return (
                      <div key={d.name} className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: d.fill }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-bold text-white">{d.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {d.value} · {pct}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: d.fill }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Status panel */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white tracking-wider">
                    YOUR STATUS
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Seller activity overview</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <StatusItem
                icon={Clock}
                label="Awaiting Approval"
                count={stats?.underReviewListings ?? 0}
                onClick={() => setFilter("under_review")}
                color="amber"
                emptyText="None pending"
                activeText="In admin queue"
              />
              <StatusItem
                icon={CheckCircle2}
                label="Live Listings"
                count={stats?.activeListings ?? 0}
                onClick={() => setFilter("active")}
                color="primary"
                emptyText="Nothing live"
                activeText="Visible to buyers"
              />
              <StatusItem
                icon={MessageCircle}
                label="Admin Chat"
                count={chatUnread}
                onClick={() => {
                  document.getElementById("seller-chat-panel")?.scrollIntoView({ behavior: "smooth" });
                }}
                color="emerald"
                emptyText="Up to date"
                activeText="New messages"
              />
            </div>
          </div>
        </div>

        {/* Collapsible admin chat */}
        <div id="seller-chat-panel">
          <AdminChatPanel sellerId={seller.id} onUnreadChange={setChatUnread} />
        </div>

        {/* Listings */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-display font-bold text-white tracking-wider">YOUR LISTINGS</h2>
                <p className="text-[11px] text-muted-foreground">
                  {accounts.length} total · showing {filtered.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search listings..."
                  className="w-full bg-background border border-border focus:border-primary rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none transition"
                  data-testid="listing-search"
                />
              </div>
              {isApproved && (
                <Link href="/seller/accounts/new">
                  <button
                    className="shrink-0 inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition active:scale-95"
                    data-testid="add-account-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Account</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </Link>
              )}
            </div>
          </div>

          <div className="px-5 sm:px-6 py-3 border-b border-border flex items-center gap-2 overflow-x-auto">
            {(["all", "active", "under_review", "sold", "pending"] as StatusFilter[]).map((f) => {
              const count =
                f === "all" ? accounts.length : accounts.filter((a) => a.status === f).length;
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/40 text-muted-foreground hover:text-white hover:bg-secondary"
                  }`}
                  data-testid={`filter-${f}`}
                >
                  <span>{f.replace("_", " ")}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? "bg-black/20" : "bg-background/50"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary/40 flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-muted-foreground/60" />
                </div>
                {accounts.length === 0 ? (
                  <>
                    <p className="text-white font-bold">No listings yet</p>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">Create your first PUBG account listing to start selling</p>
                    {isApproved && (
                      <Link href="/seller/accounts/new">
                        <button className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm transition">
                          <Plus className="w-4 h-4" /> Create First Listing
                        </button>
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No listings match your filters.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((a) => (
                  <ListingRow key={a.id} a={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Logout"
        message="Kya aap waqai logout karna chahte hain?"
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        busyLabel="Logging out..."
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </PublicLayout>
  );
}

function UsernameCard({ seller }: { seller: { username?: string | null } }) {
  const { refresh } = useSellerAuth();
  const initial = seller.username || "";
  const [editing, setEditing] = useState(!initial);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = async () => {
    setErr("");
    const v = value.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) {
      setErr("3-20 characters: letters, numbers, or underscore only");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/seller/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: v }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to update");
      }
      await refresh();
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!editing && initial) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
          <AtSign className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Public Username</p>
          <p className="text-white font-mono text-sm font-bold truncate">{initial}</p>
        </div>
        {savedFlash && (
          <span className="text-[11px] text-emerald-400 font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        <button
          onClick={() => { setValue(initial); setEditing(true); setErr(""); }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white border border-border hover:border-primary/40 px-3 py-1.5 rounded-lg"
          data-testid="edit-seller-username"
        >
          <Pencil className="w-3.5 h-3.5" />
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 mb-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
          <AtSign className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-200">
            {initial ? "Change your public username" : "Choose your public username"}
          </p>
          <p className="text-[11px] text-amber-200/70 mt-0.5">
            This is the only name buyers see on your listings. 3-20 characters · letters, numbers, or underscore.
          </p>
        </div>
      </div>
      <div className="flex items-stretch gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
            placeholder="e.g. PMG_Official"
            maxLength={20}
            className="w-full bg-background border-2 border-border focus:border-amber-500 rounded-xl pl-9 pr-3 py-2.5 text-white outline-none text-sm font-mono"
            data-testid="seller-username-input"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold disabled:opacity-50"
          data-testid="save-seller-username"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
        {initial && (
          <button
            onClick={() => { setEditing(false); setErr(""); setValue(initial); }}
            className="inline-flex items-center px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-white text-sm font-semibold"
          >
            Cancel
          </button>
        )}
      </div>
      {err && (
        <p className="text-xs text-destructive mt-2 font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {err}
        </p>
      )}
    </div>
  );
}

function SellerStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    approved: { label: "Verified", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: ShieldCheck },
    pending: { label: "Under Review", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: Clock },
    suspended: { label: "Suspended", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: Shield },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: Shield },
  };
  const { label, cls, icon: Icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  subline,
  highlight,
}: {
  label: string;
  value: string;
  icon: any;
  accent: "blue" | "emerald" | "primary" | "destructive";
  subline?: string;
  highlight?: boolean;
}) {
  const palette: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    blue: {
      bg: "bg-blue-500/15",
      text: "text-blue-300",
      border: "border-blue-500/20",
      glow: "from-blue-500/15",
    },
    emerald: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-300",
      border: "border-emerald-500/20",
      glow: "from-emerald-500/15",
    },
    primary: {
      bg: "bg-primary/15",
      text: "text-primary",
      border: "border-primary/30",
      glow: "from-primary/20",
    },
    destructive: {
      bg: "bg-destructive/15",
      text: "text-destructive",
      border: "border-destructive/30",
      glow: "from-destructive/20",
    },
  };
  const p = palette[accent];
  return (
    <div
      className={`relative bg-card border ${
        highlight ? p.border : "border-border"
      } rounded-2xl p-5 overflow-hidden group hover:border-white/20 transition`}
    >
      <div
        className={`absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br ${p.glow} to-transparent rounded-full blur-3xl pointer-events-none`}
      />
      <div className="relative flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${p.bg} ${p.text} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest">
        {label}
      </p>
      <p className="text-2xl sm:text-3xl font-display font-black text-white mt-1">{value}</p>
      {subline && <p className={`text-[11px] mt-1 font-semibold ${p.text}`}>{subline}</p>}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: "primary" | "emerald" | "blue" | "amber";
}) {
  const palette: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-300",
    blue: "bg-blue-500/10 text-blue-300",
    amber: "bg-amber-500/10 text-amber-300",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${palette[color]} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
          {label}
        </p>
        <p className="text-lg sm:text-xl font-display font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function StatusItem({
  icon: Icon,
  label,
  count,
  onClick,
  color,
  emptyText,
  activeText,
}: {
  icon: any;
  label: string;
  count: number;
  onClick: () => void;
  color: "amber" | "primary" | "emerald";
  emptyText: string;
  activeText: string;
}) {
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    amber: {
      bg: "bg-amber-500/10 hover:bg-amber-500/15",
      text: "text-amber-300",
      ring: "border-amber-500/20 hover:border-amber-500/40",
    },
    primary: {
      bg: "bg-primary/10 hover:bg-primary/15",
      text: "text-primary",
      ring: "border-primary/20 hover:border-primary/40",
    },
    emerald: {
      bg: "bg-emerald-500/10 hover:bg-emerald-500/15",
      text: "text-emerald-300",
      ring: "border-emerald-500/20 hover:border-emerald-500/40",
    },
  };
  const p = palette[color];
  const empty = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border transition cursor-pointer group text-left ${
        empty
          ? "bg-secondary/20 border-border hover:border-white/15"
          : `${p.bg} ${p.ring}`
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            empty ? "bg-secondary/40 text-muted-foreground" : `${p.text} bg-background/30`
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold truncate ${empty ? "text-muted-foreground" : "text-white"}`}>
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground">{empty ? emptyText : activeText}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-lg font-display font-black ${
            empty ? "text-muted-foreground/50" : p.text
          }`}
        >
          {count}
        </span>
        <ArrowRight
          className={`w-4 h-4 transition group-hover:translate-x-0.5 ${
            empty ? "text-muted-foreground/40" : p.text
          }`}
        />
      </div>
    </button>
  );
}

function ListingRow({ a }: { a: SellerAccount }) {
  const profit = a.purchasePrice != null ? a.priceForSale - a.purchasePrice : null;
  const statusMap: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    sold: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    under_review: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
  const isPrivate = a.visibility === "private";
  return (
    <Link href={`/seller/accounts/${a.id}`}>
      <div
        role="link"
        tabIndex={0}
        className="group block cursor-pointer bg-secondary/20 hover:bg-secondary/40 border border-border hover:border-primary/40 rounded-xl p-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
        data-testid="listing-row"
      >
        <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white truncate group-hover:text-primary transition" title={a.title}>{a.title}</h3>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  statusMap[a.status] || "bg-secondary text-muted-foreground border-border"
                }`}
              >
                {a.status.replace("_", " ")}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  isPrivate
                    ? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                    : "bg-primary/15 text-primary border-primary/30"
                }`}
                title={isPrivate ? "Hidden from buyers" : "Live on marketplace"}
              >
                {isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {isPrivate ? "Private" : "Public"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">#{a.accountId}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
              {a.purchasePrice != null && (
                <PriceTag label="Cost" value={a.purchasePrice} color="amber" />
              )}
              <PriceTag label="Sale" value={a.priceForSale} color="primary" />
              {profit != null && (
                <PriceTag label="Profit" value={profit} color={profit >= 0 ? "emerald" : "destructive"} />
              )}
              {a.finalSoldPrice != null && (
                <PriceTag label="Sold" value={a.finalSoldPrice} color="blue" />
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Open</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function PriceTag({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    amber: "text-amber-300",
    primary: "text-primary",
    emerald: "text-emerald-300",
    destructive: "text-destructive",
    blue: "text-blue-300",
  };
  return (
    <span className="inline-flex items-baseline gap-1 text-muted-foreground">
      <span className="text-[10px] uppercase font-semibold tracking-wider">{label}</span>
      <span className={`font-bold ${colors[color]}`}>Rs {value.toLocaleString()}</span>
    </span>
  );
}

function AdminChatPanel({
  sellerId,
  onUnreadChange,
}: {
  sellerId: number;
  onUnreadChange?: (n: number) => void;
}) {
  const sessionId = `seller-${sellerId}`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; message: string; createdAt: string }>>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSeenId, setLastSeenId] = useState<number>(() => {
    try {
      const v = localStorage.getItem(`seller-chat-last-seen-${sellerId}`);
      return v ? parseInt(v, 10) : 0;
    } catch {
      return 0;
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    if (open && messages.length > 0) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      const maxId = messages[messages.length - 1].id;
      setLastSeenId(maxId);
      try {
        localStorage.setItem(`seller-chat-last-seen-${sellerId}`, String(maxId));
      } catch {}
    }
  }, [messages, open, sellerId]);

  useEffect(() => {
    const unread = messages.filter((m) => m.sender === "admin" && m.id > lastSeenId).length;
    onUnreadChange?.(unread);
  }, [messages, lastSeenId, onUnreadChange]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sender: "seller", message: msg }),
      });
      if (res.ok) {
        setText("");
        await load();
      } else {
        alert("Could not send message");
      }
    } finally {
      setSending(false);
    }
  };

  const lastMsg = messages[messages.length - 1];
  const unreadFromAdmin = messages.filter((m) => m.sender === "admin" && m.id > lastSeenId).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl mb-6 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-secondary/20 transition"
        data-testid="chat-toggle"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-300 shrink-0">
            <MessageCircle className="w-5 h-5" />
            {unreadFromAdmin > 0 && !open && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center border-2 border-card">
                {unreadFromAdmin}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-display font-bold text-white tracking-wider">CHAT WITH ADMIN</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Shield className="w-3 h-3" /> Direct Line
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {lastMsg
                ? `${lastMsg.sender === "admin" ? "Admin: " : "You: "}${lastMsg.message}`
                : "Send admin a message anytime"}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-4 sm:p-5">
              <div ref={scrollRef} className="bg-secondary/20 border border-border rounded-xl p-3 h-56 overflow-y-auto space-y-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No messages yet. Send admin a message anytime.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "seller" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                        m.sender === "seller"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-white border border-border"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                        <p className={`text-[10px] mt-1 ${m.sender === "seller" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {m.sender === "admin" ? "Admin · " : ""}{formatDateTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={send} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none text-sm"
                  data-testid="chat-input"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 rounded-xl flex items-center gap-2 disabled:opacity-50 transition"
                  data-testid="chat-send"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
