import { AdminLayout } from "@/components/AdminLayout";
import { useState } from "react";
import { useListActivityLogs } from "@workspace/api-client-react";
import { Activity, Shield, Store, User, Server, Filter } from "lucide-react";

const ACTOR_ICONS: Record<string, any> = {
  admin: Shield,
  seller: Store,
  customer: User,
  system: Server,
};

const ACTOR_COLORS: Record<string, string> = {
  admin: "text-primary border-primary/30 bg-primary/10",
  seller: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  customer: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  system: "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

export function AdminActivity() {
  const [actorType, setActorType] = useState<string>("");
  const { data: logs, isLoading } = useListActivityLogs({
    limit: 200,
    ...(actorType ? { actorType } : {}),
  } as any);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">ACTIVITY LOG</h1>
            <p className="text-muted-foreground mt-1">Audit trail of all important platform actions.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {[
            { v: "", l: "All" },
            { v: "admin", l: "Admin" },
            { v: "seller", l: "Sellers" },
            { v: "customer", l: "Customers" },
            { v: "system", l: "System" },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setActorType(f.v)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                actorType === f.v
                  ? "bg-primary text-black border-primary"
                  : "bg-secondary/40 border-border text-muted-foreground hover:text-white"
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : !logs || logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No activity yet.</div>
          ) : (
            <ul className="divide-y divide-border/50">
              {logs.map((log: any) => {
                const Icon = ACTOR_ICONS[log.actorType] || Activity;
                const color = ACTOR_COLORS[log.actorType] || "text-muted-foreground border-border bg-secondary";
                return (
                  <li key={log.id} className="p-4 flex items-start gap-3 hover:bg-secondary/20">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold text-white">{log.actorName}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${color}`}>{log.actorType}</span>
                        <span className="text-sm text-muted-foreground">— {log.action}</span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">{log.details}</p>
                      )}
                      <div className="text-[11px] text-muted-foreground/80 mt-1 flex gap-2">
                        {log.targetType && (
                          <span>
                            {log.targetType}#{log.targetId ?? "—"}
                          </span>
                        )}
                        <span>· {new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
