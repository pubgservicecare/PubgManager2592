import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  ShieldAlert, CheckCircle2, XCircle, RefreshCw, Database,
  AlertTriangle, Zap, Mail, Lock, HardDrive, Loader2,
} from "lucide-react";
import { apiUrl } from "@/lib/api-url";
import { useQuery } from "@tanstack/react-query";

interface EnvVar {
  key: string;
  set: boolean;
  category: "critical" | "feature" | "optional";
  label: string;
  description: string;
  badge?: string;
  badgeOk?: boolean;
}

interface EnvCheckData {
  vars: EnvVar[];
  nodeEnv: string;
  isProduction: boolean;
  activeDbSource: string | null;
}

interface SystemHealth {
  timestamp: string;
  db: { ok: boolean; source: string | null; message: string };
  email: { ok: boolean; provider: string | null; message: string };
  session: { ok: boolean; message: string };
  storage: { ok: boolean; provider: string; message: string };
}

async function fetchEnvCheck(): Promise<EnvCheckData> {
  const res = await fetch(apiUrl("/api/admin/env-check"), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const CATEGORIES = [
  {
    key: "critical" as const,
    label: "Critical",
    emoji: "🔴",
    textColor: "text-red-400",
    missingBadge: "bg-red-500/10 text-red-300 border-red-500/20",
  },
  {
    key: "feature" as const,
    label: "Feature Variables",
    emoji: "🟡",
    textColor: "text-orange-400",
    missingBadge: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  },
  {
    key: "optional" as const,
    label: "Optional",
    emoji: "⚪",
    textColor: "text-slate-400",
    missingBadge: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
];

const HEALTH_ITEMS: Array<{
  key: keyof Omit<SystemHealth, "timestamp">;
  label: string;
  icon: React.ElementType;
}> = [
  { key: "db",      label: "Database",     icon: Database },
  { key: "email",   label: "Email",        icon: Mail },
  { key: "session", label: "Session",      icon: Lock },
  { key: "storage", label: "File Storage", icon: HardDrive },
];

export function AdminEnvCheck() {
  const [dbResult, setDbResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [testingDb, setTestingDb] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-env-check"],
    queryFn: fetchEnvCheck,
    staleTime: 0,
  });

  const handleTestDb = async () => {
    setTestingDb(true);
    setDbResult(null);
    try {
      const res = await fetch(apiUrl("/api/admin/test-db-current"), { credentials: "include" });
      setDbResult(await res.json());
    } catch {
      setDbResult({ ok: false, error: "Request failed — API server may be down." });
    } finally {
      setTestingDb(false);
    }
  };

  const handleRunAllTests = async () => {
    setTestingAll(true);
    setHealth(null);
    try {
      const res = await fetch(apiUrl("/api/admin/system-health"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to run tests");
      setHealth(await res.json());
    } catch (e: any) {
      setHealth(null);
    } finally {
      setTestingAll(false);
    }
  };

  const criticalMissing = data?.vars.filter((v) => v.category === "critical" && !v.set).length ?? 0;
  const featureMissing = data?.vars.filter((v) => v.category === "feature" && !v.set).length ?? 0;
  const allCriticalOk = criticalMissing === 0;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white">ENV CHECK</h1>
              <p className="text-muted-foreground mt-0.5">Environment variables &amp; live connectivity status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAllTests}
              disabled={testingAll}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 text-sm"
            >
              {testingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Run All Tests
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 bg-secondary text-foreground px-4 py-2 rounded-xl font-bold hover:bg-secondary/80 transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* System Health Report — shows after Run All Tests */}
        {health && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h2 className="font-bold text-sm text-emerald-400 uppercase tracking-widest">System Health Report</h2>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                {new Date(health.timestamp).toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi" })} PKT
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {HEALTH_ITEMS.map(({ key, label, icon: Icon }) => {
                const item = health[key] as { ok: boolean; message: string };
                return (
                  <div key={key} className="px-5 py-4 flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${item.ok ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      <Icon className={`w-4 h-4 ${item.ok ? "text-emerald-400" : "text-red-400"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${item.ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          {item.ok ? "✓ OK" : "✗ FAIL"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary banner */}
        {!isLoading && data && (
          <div className={`rounded-2xl border p-4 flex items-start gap-3 ${allCriticalOk ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
            {allCriticalOk ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${allCriticalOk ? "text-emerald-300" : "text-red-300"}`}>
                {allCriticalOk
                  ? featureMissing > 0
                    ? `All critical vars set ✅ — ${featureMissing} feature variable${featureMissing > 1 ? "s" : ""} missing (some features disabled)`
                    : "All variables set — fully configured! ✅"
                  : `${criticalMissing} critical variable${criticalMissing > 1 ? "s" : ""} missing ❌ — app may not work`}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="text-xs text-muted-foreground">
                  Environment: <span className="font-mono font-bold text-foreground">{data.nodeEnv}</span>
                  {data.isProduction && (
                    <span className="ml-2 bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold">PRODUCTION</span>
                  )}
                </span>
                {data.activeDbSource && (
                  <span className="text-xs text-muted-foreground">
                    Active DB: <span className="font-mono font-bold text-blue-300">{data.activeDbSource}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[3, 5, 3].map((count, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="px-6 py-4 border-b border-border">
                  <div className="h-3 bg-secondary rounded w-28" />
                </div>
                <div className="divide-y divide-border">
                  {Array.from({ length: count }).map((_, j) => (
                    <div key={j} className="px-6 py-4 flex items-start gap-4">
                      <div className="w-5 h-5 bg-secondary rounded-full mt-0.5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-secondary rounded w-40" />
                        <div className="h-3 bg-secondary rounded w-64" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Variable groups */}
        {data && CATEGORIES.map((cat) => {
          const vars = data.vars.filter((v) => v.category === cat.key);
          if (vars.length === 0) return null;
          const setCount = vars.filter((v) => v.set).length;
          return (
            <div key={cat.key} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className={`font-bold text-xs uppercase tracking-widest ${cat.textColor}`}>
                  {cat.emoji} {cat.label}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
                  {setCount}/{vars.length} set
                </span>
              </div>
              <div className="divide-y divide-border">
                {vars.map((v) => (
                  <div key={v.key} className="px-6 py-4 flex items-start gap-4">
                    <div className="mt-0.5 shrink-0">
                      {v.set ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className={`w-5 h-5 ${cat.key === "critical" ? "text-red-400" : cat.key === "feature" ? "text-orange-400" : "text-slate-500"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <code className="text-sm font-bold text-foreground bg-secondary px-2 py-0.5 rounded-lg">
                          {v.key}
                        </code>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          v.badge
                            ? (v.badgeOk ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-orange-500/10 text-orange-300 border-orange-500/20")
                            : v.set ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : cat.missingBadge
                        }`}>
                          {v.badge ?? (v.set ? "✓ SET" : "✗ MISSING")}
                        </span>
                        {v.label.includes("← active") && v.set && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            ← ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {v.label.replace(" ← active", "")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{v.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* DB connection test */}
        {data && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Database Connection Test</h2>
                {data.activeDbSource && (
                  <span className="text-[11px] font-mono text-muted-foreground">via {data.activeDbSource}</span>
                )}
              </div>
              <button
                onClick={handleTestDb}
                disabled={testingDb}
                className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {testingDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {testingDb ? "Testing…" : "Test Now"}
              </button>
            </div>
            {!dbResult && (
              <p className="text-sm text-muted-foreground">Click to verify live database connectivity using the currently active DB URL.</p>
            )}
            {dbResult && (
              <div className={`rounded-xl border p-3 flex items-center gap-2 text-sm font-medium ${dbResult.ok ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                {dbResult.ok
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 shrink-0" />}
                {dbResult.ok ? dbResult.message : dbResult.error}
              </div>
            )}
          </div>
        )}

        {/* Setup guide */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            How to Set These Variables
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="font-bold text-foreground mb-1 text-sm">🟣 Replit (Development)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Lock icon (🔒) in Replit sidebar → <strong className="text-foreground">Secrets</strong> tab → Add secret with key &amp; value → Restart workflows
              </p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 border border-border">
              <p className="font-bold text-foreground mb-1 text-sm">🟠 Render (Production)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">dashboard.render.com</strong> → Your Service → <strong className="text-foreground">Environment</strong> tab → Add Environment Variable → Save Changes
              </p>
            </div>
          </div>
          <div className="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <p className="text-xs text-blue-200/80 leading-relaxed">
              <strong className="text-blue-300">Database tip:</strong> On Render, set <code className="bg-blue-500/10 px-1 rounded">NEON_DATABASE_URL</code> to your Neon connection string. If you use Render's own PostgreSQL, it auto-sets <code className="bg-blue-500/10 px-1 rounded">DATABASE_URL</code> — the app will use whichever is present.
            </p>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
