import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useGetSettings } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/PublicLayout";
import {
  MessageSquare,
  Phone,
  LogOut,
  ChevronRight,
  CreditCard,
  Heart,
  Gift,
  Copy,
  Check,
  Clock,
  Gamepad2,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  Bell,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/helpers";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface ChatStatus {
  sessionId: string;
  customerUnreadCount: number;
  hasChat: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

interface RecentlyViewedAccount {
  id: number;
  title: string;
  accountId: string;
  priceForSale: number;
  status: string;
  imageUrls?: string[];
}

interface InstallmentAccount {
  id: number;
  remainingAmount: number;
  totalPaid: number;
  overdueCount: number;
  dueSoonCount: number;
}

export function CustomerDashboard() {
  const { customer, isLoading, logout } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const { data: settings } = useGetSettings();
  const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null);
  const [referral, setReferral] = useState<{ referralCode: string | null; referralCount: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<RecentlyViewedAccount[]>([]);
  const [installments, setInstallments] = useState<InstallmentAccount[] | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!isLoading && !customer) {
      setLocation("/login");
    }
  }, [customer, isLoading]);

  useEffect(() => {
    if (!customer) return;
    const fetchStatus = () => {
      fetch("/api/customer/chat-status", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setChatStatus(data))
        .catch(() => {});
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    fetch("/api/customer/referral", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setReferral(d))
      .catch(() => {});

    fetch("/api/customer/installments", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setInstallments(Array.isArray(d) ? d : []))
      .catch(() => setInstallments([]));

    fetch("/api/customer/wishlist", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d)) setWishlistCount(d.length);
        else if (d && Array.isArray(d.items)) setWishlistCount(d.items.length);
      })
      .catch(() => {});
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    const ids = getRecentlyViewed();
    if (ids.length === 0) {
      setRecentAccounts([]);
      return;
    }
    Promise.all(
      ids.slice(0, 6).map((id) =>
        fetch(`/api/accounts/${id}?public=true`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((rows) => setRecentAccounts(rows.filter(Boolean) as RecentlyViewedAccount[]));
  }, [customer]);

  if (isLoading || !customer) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
        </div>
      </PublicLayout>
    );
  }

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    setLocation("/");
  };

  const whatsappNumber = settings?.whatsappNumber?.replace(/\D/g, "") || "";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hi, I'm ${encodeURIComponent(
    customer.name,
  )} (${customer.phone}). I need help with my order.`;

  const unreadCount = chatStatus?.customerUnreadCount ?? 0;

  const activeInstallments = installments?.length ?? 0;
  const outstandingBalance = (installments ?? []).reduce((s, a) => s + (a.remainingAmount || 0), 0);
  const overdueCount = (installments ?? []).reduce((s, a) => s + (a.overdueCount || 0), 0);
  const dueSoonCount = (installments ?? []).reduce((s, a) => s + (a.dueSoonCount || 0), 0);

  const copyReferralLink = async () => {
    if (!referral?.referralCode) return;
    const url = `${window.location.origin}/signup?ref=${referral.referralCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-4xl sm:text-5xl font-black text-primary-foreground">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-black" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 mb-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-[11px] font-bold text-primary uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Verified Customer
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wider truncate">
                {customer.name}
              </h1>
              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                {customer.phone}
              </p>
            </div>
            {unreadCount > 0 && (
              <Link href="/chat">
                <div className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive font-bold text-sm hover:bg-destructive/25 transition-colors">
                  <Bell className="w-4 h-4 animate-pulse" />
                  {unreadCount} new {unreadCount === 1 ? "reply" : "replies"}
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<CreditCard className="w-5 h-5" />}
            label="Active Installments"
            value={activeInstallments.toString()}
            tone="amber"
            href={activeInstallments > 0 ? "/my/installments" : undefined}
          />
          <StatCard
            icon={<Wallet className="w-5 h-5" />}
            label="Outstanding"
            value={formatCurrency(outstandingBalance)}
            tone="primary"
            href={activeInstallments > 0 ? "/my/installments" : undefined}
          />
          <StatCard
            icon={<Heart className="w-5 h-5" />}
            label="Wishlist"
            value={wishlistCount.toString()}
            tone="rose"
            href="/my/wishlist"
          />
          <StatCard
            icon={<Gift className="w-5 h-5" />}
            label="Referrals"
            value={(referral?.referralCount ?? 0).toString()}
            tone="emerald"
          />
        </div>

        {/* Alert Banners */}
        {overdueCount > 0 && (
          <Link href="/my/installments">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 cursor-pointer hover:bg-destructive/15 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-destructive">
                  {overdueCount} payment{overdueCount === 1 ? "" : "s"} overdue
                </p>
                <p className="text-sm text-muted-foreground">Please clear your dues to avoid service interruption.</p>
              </div>
              <ChevronRight className="w-5 h-5 text-destructive shrink-0" />
            </div>
          </Link>
        )}
        {overdueCount === 0 && dueSoonCount > 0 && (
          <Link href="/my/installments">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/15 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-300">
                  {dueSoonCount} payment{dueSoonCount === 1 ? "" : "s"} due within 7 days
                </p>
                <p className="text-sm text-muted-foreground">View schedule and download receipts anytime.</p>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400 shrink-0" />
            </div>
          </Link>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left: Quick Actions */}
          <div className="lg:col-span-2 space-y-5">
            <SectionCard title="Quick Actions" icon={<Sparkles className="w-4 h-4 text-primary" />}>
              <div className="grid sm:grid-cols-2 gap-3">
                <ActionTile
                  href="/chat"
                  icon={<MessageSquare className="w-5 h-5" />}
                  iconColor="text-primary"
                  bg="bg-primary/10"
                  hoverBorder="hover:border-primary/40"
                  title="Live Chat"
                  subtitle={
                    chatStatus?.lastMessage
                      ? `Last: "${chatStatus.lastMessage.slice(0, 30)}${
                          chatStatus.lastMessage.length > 30 ? "…" : ""
                        }"`
                      : "Chat with our support team"
                  }
                  badge={unreadCount > 0 ? `${unreadCount > 9 ? "9+" : unreadCount}` : undefined}
                />
                {whatsappNumber && (
                  <ActionTile
                    href={whatsappUrl}
                    external
                    icon={
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    }
                    iconColor="text-green-500"
                    bg="bg-green-500/10"
                    hoverBorder="hover:border-green-500/40"
                    title="WhatsApp Support"
                    subtitle="Message us directly"
                  />
                )}
                <ActionTile
                  href="/my/installments"
                  icon={<CreditCard className="w-5 h-5" />}
                  iconColor="text-amber-400"
                  bg="bg-amber-500/10"
                  hoverBorder="hover:border-amber-500/40"
                  title="My Installments"
                  subtitle="Payments, due dates & receipts"
                />
                <ActionTile
                  href="/my/wishlist"
                  icon={<Heart className="w-5 h-5" />}
                  iconColor="text-rose-400"
                  bg="bg-rose-500/10"
                  hoverBorder="hover:border-rose-400/40"
                  title="My Wishlist"
                  subtitle="Saved accounts you're watching"
                />
                <ActionTile
                  href="/"
                  icon={<ShoppingBag className="w-5 h-5" />}
                  iconColor="text-white"
                  bg="bg-secondary"
                  hoverBorder="hover:border-primary/40"
                  title="Browse Marketplace"
                  subtitle="View all available accounts"
                />
              </div>
            </SectionCard>

            {/* Recently Viewed */}
            {recentAccounts.length > 0 && (
              <SectionCard title="Recently Viewed" icon={<Clock className="w-4 h-4 text-primary" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {recentAccounts.slice(0, 6).map((a) => (
                    <Link key={a.id} href={`/account/${a.id}`}>
                      <div
                        className="bg-background rounded-xl border border-border overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                        data-testid={`recently-viewed-${a.id}`}
                      >
                        <div className="relative aspect-square bg-secondary overflow-hidden">
                          {(a.imageUrls?.length ?? 0) > 0 ? (
                            <img
                              src={`/api/storage${a.imageUrls![0]}`}
                              alt={a.title}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Gamepad2 className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-white line-clamp-1 leading-tight">{a.title}</p>
                          <p className="text-sm font-black text-primary mt-1">{formatCurrency(a.priceForSale)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-5">
            {/* Account Info */}
            <SectionCard title="Account Details" icon={<ShieldCheck className="w-4 h-4 text-primary" />}>
              <div className="space-y-3">
                <DetailRow label="Full Name" value={customer.name} />
                <DetailRow label="Phone" value={customer.phone} />
                <DetailRow label="Account Type" value="Customer" />
              </div>
            </SectionCard>

            {/* Referral Card */}
            {referral?.referralCode && (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-card to-card p-5">
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">Refer & Earn</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-amber-300 font-bold">{referral.referralCount}</span>{" "}
                        {referral.referralCount === 1 ? "friend referred" : "friends referred"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="px-4 py-3 rounded-xl bg-background border border-border font-mono text-amber-300 font-black tracking-widest text-center text-lg">
                      {referral.referralCode}
                    </div>
                    <button
                      type="button"
                      onClick={copyReferralLink}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
                      data-testid="referral-copy-link"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy Referral Link"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:border-destructive/40 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-colors font-semibold text-sm"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Logout Confirm"
        message="Kya aap waqai logout karna chahte hain? Aapko dobara login karna hoga."
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        busyLabel="Logging out..."
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </PublicLayout>
  );
}

/* ---------- Sub-components ---------- */

function StatCard({
  icon,
  label,
  value,
  tone,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "amber" | "rose" | "emerald";
  href?: string;
}) {
  const toneMap = {
    primary: { iconBg: "bg-primary/15", iconColor: "text-primary", border: "hover:border-primary/40" },
    amber: { iconBg: "bg-amber-500/15", iconColor: "text-amber-400", border: "hover:border-amber-500/40" },
    rose: { iconBg: "bg-rose-500/15", iconColor: "text-rose-400", border: "hover:border-rose-400/40" },
    emerald: { iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", border: "hover:border-emerald-400/40" },
  }[tone];

  const inner = (
    <div
      className={`bg-card border border-border rounded-2xl p-4 transition-all ${
        href ? `cursor-pointer ${toneMap.border} hover:shadow-lg hover:-translate-y-0.5` : ""
      }`}
    >
      <div className={`w-10 h-10 rounded-xl ${toneMap.iconBg} ${toneMap.iconColor} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xl sm:text-2xl font-black text-white mt-0.5 truncate">{value}</p>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-bold text-white text-sm uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ActionTile({
  href,
  external,
  icon,
  iconColor,
  bg,
  hoverBorder,
  title,
  subtitle,
  badge,
}: {
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  iconColor: string;
  bg: string;
  hoverBorder: string;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 p-4 bg-background border border-border ${hoverBorder} rounded-xl cursor-pointer group transition-all hover:shadow-md`}
    >
      <div className={`relative w-11 h-11 rounded-xl ${bg} ${iconColor} flex items-center justify-center shrink-0`}>
        {icon}
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-white text-[10px] font-black flex items-center justify-center shadow-lg">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors shrink-0" />
    </div>
  );

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link href={href}>{inner}</Link>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-white truncate text-right">{value}</span>
    </div>
  );
}
