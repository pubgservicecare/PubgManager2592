import { Link } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { useGetDashboard } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/helpers";
import {
  Gamepad2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Link as LinkIcon,
  MessageSquare,
  CreditCard,
  ArrowRight,
  Plus,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  CalendarClock,
  Server,
  Cpu,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatDate } from "@/lib/helpers";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboard();

  if (isLoading || !stats) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-12 w-72 bg-card rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-card rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-card rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2].map((i) => <div key={i} className="h-72 bg-card rounded-2xl" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const profitMargin =
    stats.totalRevenue > 0
      ? Math.round((stats.netProfit / stats.totalRevenue) * 100)
      : 0;
  const profitPositive = stats.netProfit >= 0;

  const inventoryData = [
    { name: "Active", value: stats.activeAccounts, fill: "hsl(var(--primary))" },
    { name: "Sold", value: stats.soldAccounts, fill: "#3b82f6" },
    { name: "Installment", value: stats.installmentAccounts, fill: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const totalInventory =
    stats.activeAccounts + stats.soldAccounts + stats.installmentAccounts;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">
            Command Center
          </p>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-wider">
            DASHBOARD OVERVIEW
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/chat">
            <button className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-white hover:border-white/30 transition">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Open Chats</span>
            </button>
          </Link>
          <Link href="/admin/accounts/new">
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition shadow-lg shadow-primary/20"
              data-testid="quick-add-account"
            >
              <Plus className="w-4 h-4" />
              <span>New Account</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Due / Overdue alerts */}
      {stats.dueAlerts && (stats.dueAlerts.overdueCount > 0 || stats.dueAlerts.dueSoonCount > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {stats.dueAlerts.overdueCount > 0 && (
            <DueAlertCard
              tone="red"
              icon={AlertTriangle}
              title={`${stats.dueAlerts.overdueCount} OVERDUE PAYMENT${stats.dueAlerts.overdueCount === 1 ? '' : 'S'}`}
              items={stats.dueAlerts.overdue}
            />
          )}
          {stats.dueAlerts.dueSoonCount > 0 && (
            <DueAlertCard
              tone="amber"
              icon={CalendarClock}
              title={`${stats.dueAlerts.dueSoonCount} DUE WITHIN 7 DAYS`}
              items={stats.dueAlerts.dueSoon}
            />
          )}
        </div>
      )}

      {/* Headline financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <KpiCard
          label="Total Investment"
          value={formatCurrency(stats.totalInvestment)}
          icon={Wallet}
          accent="blue"
          subline="Capital deployed"
        />
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={TrendingUp}
          accent="emerald"
          subline="Gross sales"
        />
        <KpiCard
          label="Net Profit"
          value={formatCurrency(stats.netProfit)}
          icon={profitPositive ? TrendingUp : TrendingDown}
          accent={profitPositive ? "primary" : "destructive"}
          subline={`${profitMargin >= 0 ? "+" : ""}${profitMargin}% margin`}
          highlight
        />
      </div>

      {/* Secondary metric tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricTile icon={Gamepad2} label="Total Accounts" value={stats.totalAccounts} color="primary" />
        <MetricTile icon={CheckCircle2} label="Active" value={stats.activeAccounts} color="emerald" />
        <MetricTile icon={Layers} label="Sold" value={stats.soldAccounts} color="blue" />
        <MetricTile icon={Clock} label="Installment" value={stats.installmentAccounts} color="amber" />
      </div>

      {/* Server Status Widget */}
      <div className="mb-4">
        <ServerStatusWidget />
      </div>

      {/* Bottom grid: chart + action queue */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Inventory chart */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white tracking-wider">
                  INVENTORY BREAKDOWN
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {totalInventory} tracked accounts
                </p>
              </div>
            </div>
            <Link href="/admin/accounts">
              <button className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>

          {totalInventory === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary/40 flex items-center justify-center mb-3">
                <Gamepad2 className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">No accounts yet</p>
              <Link href="/admin/accounts/new">
                <button className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                  Add your first account <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
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

        {/* Action queue */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white tracking-wider">
                  ACTION QUEUE
                </h3>
                <p className="text-[11px] text-muted-foreground">Items needing your attention</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <ActionItem
              icon={LinkIcon}
              label="Pending Links"
              count={stats.pendingLinksCount}
              href="/admin/accounts"
              color="destructive"
            />
            <ActionItem
              icon={CreditCard}
              label="Pending Payments"
              count={stats.pendingPaymentsCount}
              href="/admin/accounts"
              color="amber"
            />
            <ActionItem
              icon={MessageSquare}
              label="Unread Chats"
              count={stats.unreadChatsCount}
              href="/admin/chat"
              color="primary"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
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
      {subline && (
        <p className={`text-[11px] mt-1 font-semibold ${p.text}`}>{subline}</p>
      )}
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

function ActionItem({
  icon: Icon,
  label,
  count,
  href,
  color,
}: {
  icon: any;
  label: string;
  count: number;
  href: string;
  color: "destructive" | "amber" | "primary";
}) {
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    destructive: {
      bg: "bg-destructive/10 hover:bg-destructive/15",
      text: "text-destructive",
      ring: "border-destructive/20 hover:border-destructive/40",
    },
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
  };
  const p = palette[color];
  const empty = count === 0;
  return (
    <Link href={href}>
      <div
        className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition cursor-pointer group ${
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
            <p className="text-[11px] text-muted-foreground">
              {empty ? "All clear" : "Needs review"}
            </p>
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
      </div>
    </Link>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

type HealthData = {
  success: boolean;
  message: string;
  uptime: number;
  timestamp: string;
};

function ServerStatusWidget() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } =
    useQuery<HealthData>({
      queryKey: ["server-health"],
      queryFn: async () => {
        const res = await fetch("/health");
        if (!res.ok) throw new Error("Server unhealthy");
        return res.json();
      },
      refetchInterval: 30_000,
      retry: 1,
    });

  const online = !isError && !!data?.success;
  const lastChecked = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-white tracking-wider">
              SERVER STATUS
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Render backend · auto-refresh every 30s
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-secondary transition disabled:opacity-40"
          title="Refresh now"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Online / Offline */}
        <div className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isLoading
                ? "bg-secondary/50 text-muted-foreground"
                : online
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {online ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</p>
            {isLoading ? (
              <div className="h-5 w-16 bg-secondary/60 rounded animate-pulse mt-1" />
            ) : (
              <p
                className={`text-lg font-display font-black ${
                  online ? "text-emerald-300" : "text-destructive"
                }`}
              >
                {online ? "ONLINE" : "DOWN"}
              </p>
            )}
          </div>
        </div>

        {/* Uptime */}
        <div className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Uptime</p>
            {isLoading ? (
              <div className="h-5 w-20 bg-secondary/60 rounded animate-pulse mt-1" />
            ) : online && data ? (
              <p className="text-lg font-display font-black text-white">{formatUptime(data.uptime)}</p>
            ) : (
              <p className="text-lg font-display font-black text-muted-foreground/50">—</p>
            )}
          </div>
        </div>

        {/* Memory */}
        <div className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Memory</p>
            <p className="text-[10px] text-muted-foreground mt-1">Via /api/healthz log</p>
          </div>
        </div>

        {/* Last Checked */}
        <div className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Last Check</p>
            {lastChecked ? (
              <p className="text-sm font-display font-bold text-white">{lastChecked}</p>
            ) : (
              <div className="h-5 w-16 bg-secondary/60 rounded animate-pulse mt-1" />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div
        className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${
          isLoading
            ? "bg-secondary/30 text-muted-foreground"
            : online
            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
            : "bg-destructive/10 text-destructive border border-destructive/20"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isLoading
              ? "bg-muted-foreground animate-pulse"
              : online
              ? "bg-emerald-400 animate-pulse"
              : "bg-destructive"
          }`}
        />
        {isLoading
          ? "Checking server status…"
          : online
          ? `Server is alive · Render backend responding normally · Next check in ~30s`
          : "Server is not responding — may be cold-starting or down"}
      </div>
    </div>
  );
}

function DueAlertCard({
  tone,
  icon: Icon,
  title,
  items,
}: {
  tone: "red" | "amber";
  icon: any;
  title: string;
  items: Array<{ paymentId: number; accountId: number; accountTitle: string; customerName?: string | null; amount: number; dueDate: string; daysUntilDue: number }>;
}) {
  const palette = tone === "red"
    ? { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", iconBg: "bg-destructive/20" }
    : { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300", iconBg: "bg-amber-500/20" };
  return (
    <div className={`${palette.bg} ${palette.border} border rounded-2xl p-4`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${palette.iconBg} ${palette.text} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className={`font-display font-black tracking-wider text-sm ${palette.text}`}>{title}</h3>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {items.slice(0, 5).map((it) => (
          <Link key={it.paymentId} href={`/admin/accounts/${it.accountId}`}>
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/30 hover:bg-background/50 cursor-pointer transition">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{it.accountTitle}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {it.customerName || "—"} · {formatDate(it.dueDate)}
                  {tone === "red" ? ` · ${Math.abs(it.daysUntilDue)}d late` : ` · ${it.daysUntilDue}d left`}
                </p>
              </div>
              <div className={`font-display font-bold text-sm ${palette.text} shrink-0`}>{formatCurrency(it.amount)}</div>
            </div>
          </Link>
        ))}
        {items.length > 5 && (
          <p className="text-[11px] text-muted-foreground text-center pt-1">+{items.length - 5} more</p>
        )}
      </div>
    </div>
  );
}
