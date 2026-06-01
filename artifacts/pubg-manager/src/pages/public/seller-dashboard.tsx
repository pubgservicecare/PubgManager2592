import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/api-url";
import { PublicLayout } from "@/components/PublicLayout";
import { useSEO } from "@/hooks/use-seo";
import { useSellerAuth } from "@/hooks/use-seller-auth";
import {
  Plus,
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
  AlertCircle,
  AtSign,
  Save,
  Globe,
  Lock,
  ArrowRight,
  LogOut,
  Layers,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDateTime, formatCurrency } from "@/lib/helpers";
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
        fetch(apiUrl("/api/seller/dashboard"), { credentials: "include" }),
        fetch(apiUrl("/api/seller/accounts"), { credentials: "include" }),
      ]);
      if (sRes.ok) setStats(await sRes.json());
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
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  const isApproved = seller.status === "approved";
  const profitPositive = (stats?.netProfit ?? 0) >= 0;
  const profitMargin =
    stats && stats.totalEarnings > 0
      ? Math.round((stats.netProfit / stats.totalEarnings) * 100)
      : 0;

  return (
    <PublicLayout>
      <div className="flex-1 w-full max-w-2xl mx-auto px-3 py-4 space-y-3">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-display font-black text-white tracking-wide truncate">
                {seller.name}
              </h1>
              <SellerStatusBadge status={seller.status} />
            </div>
            <p className="text-[11px] text-muted-foreground">Seller Dashboard</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isApproved && (
              <Link href="/seller/accounts/new">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition shadow-lg shadow-primary/20 active:scale-95">
                  <Plus className="w-4 h-4" />
                  <span>New</span>
                </button>
              </Link>
            )}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-xl border border-border text-muted-foreground hover:text-white hover:border-white/20 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Username card (only if not set) ── */}
        <UsernameCard seller={seller} />

        {/* ── Compact Stats Grid 2×3 ── */}
        <div className="grid grid-cols-3 gap-2">
          <StatChip
            label="Investment"
            value={formatCurrency(stats?.totalInvestment ?? 0)}
            color="blue"
            icon={Wallet}
          />
          <StatChip
            label="Earnings"
            value={formatCurrency(stats?.totalEarnings ?? 0)}
            color="emerald"
            icon={TrendingUp}
          />
          <StatChip
            label="Profit"
            value={formatCurrency(stats?.netProfit ?? 0)}
            sub={`${profitMargin >= 0 ? "+" : ""}${profitMargin}%`}
            color={profitPositive ? "primary" : "red"}
            icon={profitPositive ? TrendingUp : TrendingDown}
          />
          <StatChip
            label="Total"
            value={String(stats?.totalListings ?? 0)}
            color="muted"
            icon={Layers}
          />
          <StatChip
            label="Active"
            value={String(stats?.activeListings ?? 0)}
            color="primary"
            icon={CheckCircle2}
          />
          <StatChip
            label="Review"
            value={String(stats?.underReviewListings ?? 0)}
            color="amber"
            icon={Clock}
          />
        </div>

        {/* ── Admin Chat (collapsed by default) ── */}
        <AdminChatPanel sellerId={seller.id} onUnreadChange={setChatUnread} unread={chatUnread} />

        {/* ── Listings ── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search listings..."
                className="w-full bg-background border border-border focus:border-primary rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none transition"
              />
            </div>
            {isApproved && (
              <Link href="/seller/accounts/new">
                <button className="shrink-0 inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg font-bold text-xs transition active:scale-95">
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </Link>
            )}
          </div>

          {/* Filter chips */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(["all", "active", "under_review", "sold"] as StatusFilter[]).map((f) => {
              const count = f === "all" ? accounts.length : accounts.filter((a) => a.status === f).length;
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/40 text-muted-foreground hover:text-white"
                  }`}
                >
                  {f.replace("_", " ")}
                  <span className={`text-[10px] px-1 py-0.5 rounded ${active ? "bg-black/20" : "bg-background/50"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="p-3">
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                {accounts.length === 0 ? (
                  <>
                    <p className="text-white font-bold text-sm">No listings yet</p>
                    <p className="text-muted-foreground text-xs mt-1 mb-3">Create your first listing to start selling</p>
                    {isApproved && (
                      <Link href="/seller/accounts/new">
                        <button className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm transition">
                          <Plus className="w-4 h-4" /> Create Listing
                        </button>
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No listings match your filters.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
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

/* ─── Compact Stat Chip ─────────────────────────────────────────────────────── */

function StatChip({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "blue" | "emerald" | "primary" | "red" | "amber" | "muted";
  icon: any;
}) {
  const palette: Record<string, { icon: string; val: string }> = {
    blue:    { icon: "text-blue-300 bg-blue-500/15",    val: "text-blue-200" },
    emerald: { icon: "text-emerald-300 bg-emerald-500/15", val: "text-emerald-200" },
    primary: { icon: "text-primary bg-primary/15",       val: "text-primary" },
    red:     { icon: "text-red-400 bg-red-500/15",        val: "text-red-400" },
    amber:   { icon: "text-amber-300 bg-amber-500/15",    val: "text-amber-200" },
    muted:   { icon: "text-muted-foreground bg-secondary/40", val: "text-white" },
  };
  const p = palette[color];
  return (
    <div className="bg-card border border-border rounded-xl p-2.5 flex flex-col gap-1 min-w-0">
      <div className={`w-6 h-6 rounded-lg ${p.icon} flex items-center justify-center`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className={`text-sm font-display font-black leading-none ${p.val} truncate`}>{value}</p>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide truncate">{sub || label}</p>
    </div>
  );
}

/* ─── Username Card ─────────────────────────────────────────────────────────── */

function UsernameCard({ seller }: { seller: { username?: string | null } }) {
  const { refresh } = useSellerAuth();
  const initial = seller.username || "";
  const [editing, setEditing] = useState(!initial);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  if (!editing && initial) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-2">
        <AtSign className="w-4 h-4 text-orange-400 shrink-0" />
        <span className="text-white font-mono text-sm font-bold flex-1 truncate">{initial}</span>
        {savedFlash && (
          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Saved
          </span>
        )}
        <button
          onClick={() => { setValue(initial); setEditing(true); setErr(""); }}
          className="text-xs font-bold text-muted-foreground hover:text-white border border-border hover:border-primary/40 px-2 py-1 rounded-lg transition"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    setErr("");
    const v = value.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) {
      setErr("3-20 characters: letters, numbers, or underscore only");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/seller/username"), {
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

  return (
    <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3">
      <p className="text-xs font-bold text-amber-300 mb-2">
        {initial ? "Change username" : "Choose your public username"}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
            placeholder="e.g. PMG_Official"
            maxLength={20}
            className="w-full bg-background border-2 border-border focus:border-amber-500 rounded-xl pl-8 pr-3 py-2 text-white outline-none text-sm font-mono"
            data-testid="seller-username-input"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold disabled:opacity-50"
          data-testid="save-seller-username"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
        {initial && (
          <button
            onClick={() => { setEditing(false); setErr(""); setValue(initial); }}
            className="px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-white text-sm font-semibold"
          >
            ✕
          </button>
        )}
      </div>
      {err && (
        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {err}
        </p>
      )}
    </div>
  );
}

/* ─── Status Badge ──────────────────────────────────────────────────────────── */

function SellerStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    approved: { label: "Verified",     cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: ShieldCheck },
    pending:  { label: "Under Review", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",       icon: Clock },
    suspended:{ label: "Suspended",    cls: "bg-destructive/15 text-destructive border-destructive/30",  icon: Shield },
    rejected: { label: "Rejected",     cls: "bg-destructive/15 text-destructive border-destructive/30",  icon: Shield },
  };
  const { label, cls, icon: Icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

/* ─── Listing Row ───────────────────────────────────────────────────────────── */

function ListingRow({ a }: { a: SellerAccount }) {
  const statusMap: Record<string, string> = {
    active:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    sold:        "bg-blue-500/15 text-blue-300 border-blue-500/30",
    under_review:"bg-sky-500/15 text-sky-300 border-sky-500/30",
    pending:     "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
  const isPrivate = a.visibility === "private";
  const profit = a.purchasePrice != null ? a.priceForSale - a.purchasePrice : null;

  return (
    <Link href={`/seller/accounts/${a.id}`}>
      <div
        role="link"
        tabIndex={0}
        className="group block cursor-pointer bg-secondary/20 hover:bg-secondary/40 border border-border hover:border-primary/40 rounded-xl p-3 transition-all"
        data-testid="listing-row"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-sm truncate group-hover:text-primary transition">{a.title}</h3>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${statusMap[a.status] || "bg-secondary text-muted-foreground border-border"}`}>
                {a.status.replace("_", " ")}
              </span>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${isPrivate ? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" : "bg-primary/15 text-primary border-primary/30"}`}>
                {isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                {isPrivate ? "Private" : "Public"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">#{a.accountId}</p>
            <div className="flex flex-wrap gap-x-3 mt-1 text-[11px]">
              <span className="text-muted-foreground">
                Sale: <span className="text-primary font-bold">Rs {a.priceForSale.toLocaleString()}</span>
              </span>
              {profit != null && (
                <span className="text-muted-foreground">
                  Profit: <span className={`font-bold ${profit >= 0 ? "text-emerald-300" : "text-red-400"}`}>Rs {profit.toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>
          <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition shrink-0 mt-0.5" />
        </div>
      </div>
    </Link>
  );
}

/* ─── Admin Chat ────────────────────────────────────────────────────────────── */

function AdminChatPanel({
  sellerId,
  onUnreadChange,
  unread,
}: {
  sellerId: number;
  onUnreadChange?: (n: number) => void;
  unread: number;
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
      if (res.ok) setMessages(await res.json());
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    if (open && messages.length > 0) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      const maxId = messages[messages.length - 1].id;
      setLastSeenId(maxId);
      try { localStorage.setItem(`seller-chat-last-seen-${sellerId}`, String(maxId)); } catch {}
    }
  }, [messages, open, sellerId]);

  useEffect(() => {
    const u = messages.filter((m) => m.sender === "admin" && m.id > lastSeenId).length;
    onUnreadChange?.(u);
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
      if (res.ok) { setText(""); await load(); }
      else alert("Could not send message");
    } finally {
      setSending(false);
    }
  };

  const lastMsg = messages[messages.length - 1];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-secondary/20 transition"
        data-testid="chat-toggle"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-300 shrink-0">
            <MessageCircle className="w-4 h-4" />
            {unread > 0 && !open && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center border-2 border-card">
                {unread}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Chat with Admin</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {lastMsg
                ? `${lastMsg.sender === "admin" ? "Admin: " : "You: "}${lastMsg.message}`
                : "Send admin a message anytime"}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-border"
          >
            <div className="p-3">
              <div ref={scrollRef} className="bg-secondary/20 border border-border rounded-xl p-2.5 h-48 overflow-y-auto space-y-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No messages yet.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "seller" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                        m.sender === "seller"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-white border border-border"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                        <p className={`text-[10px] mt-0.5 ${m.sender === "seller" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {m.sender === "admin" ? "Admin · " : ""}{formatDateTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={send} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-background border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-white outline-none text-sm"
                  data-testid="chat-input"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition"
                  data-testid="chat-send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
