import { useEffect, useState } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/api-url";
import { AdminLayout } from "@/components/AdminLayout";
import { Store, Eye, Clock, CheckCircle, XCircle, Ban, Loader2 } from "lucide-react";

interface Seller {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  totalListings: number;
  totalSold: number;
  totalEarnings: number;
  createdAt: string;
}

const STATUS_TABS = [
  { value: "", label: "All", icon: Store },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "approved", label: "Approved", icon: CheckCircle },
  { value: "rejected", label: "Rejected", icon: XCircle },
  { value: "suspended", label: "Suspended", icon: Ban },
];

export function AdminSellersList() {
  const [filter, setFilter] = useState("");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/sellers"), { credentials: "include" });
      if (!res.ok) {
        setSellers([]);
        return;
      }
      const all: Seller[] = await res.json();
      if (!Array.isArray(all)) {
        setSellers([]);
        return;
      }
      setCounts({
        "": all.length,
        pending: all.filter((s) => s.status === "pending").length,
        approved: all.filter((s) => s.status === "approved").length,
        rejected: all.filter((s) => s.status === "rejected").length,
        suspended: all.filter((s) => s.status === "suspended").length,
      });
      setSellers(filter ? all.filter((s) => s.status === filter) : all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      rejected: "bg-destructive/15 text-destructive border-destructive/30",
      suspended: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    };
    return map[s] || "bg-secondary";
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-wider">SELLERS</h1>
            <p className="text-muted-foreground text-sm">Manage seller verification and accounts</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-thin">
          {STATUS_TABS.map((t) => {
            const Icon = t.icon;
            const active = filter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {counts[t.value] !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${active ? "bg-primary-foreground/20" : "bg-background/50"}`}>
                    {counts[t.value]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : sellers.length === 0 ? (
          <div className="py-16 text-center bg-card border border-border rounded-2xl">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No sellers in this category</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_1fr_120px_100px_100px_120px] gap-3 px-4 py-3 bg-secondary/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <div>Seller</div>
              <div>Contact</div>
              <div>Status</div>
              <div>Listings</div>
              <div>Sold</div>
              <div>Action</div>
            </div>
            {sellers.map((s) => (
              <div key={s.id} className="border-t border-border px-4 py-3 hover:bg-secondary/20 transition-colors md:grid md:grid-cols-[1fr_1fr_120px_100px_100px_120px] md:gap-3 md:items-center">
                <div className="flex items-center gap-3 mb-2 md:mb-0 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-black shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-2 md:mb-0 truncate">{s.phone}</div>
                <div className="mb-2 md:mb-0">
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full border ${statusBadge(s.status)}`}>
                    {s.status}
                  </span>
                </div>
                <div className="text-sm text-white mb-1 md:mb-0">
                  <span className="md:hidden text-xs text-muted-foreground mr-1">Listings:</span>
                  {s.totalListings}
                </div>
                <div className="text-sm text-white mb-2 md:mb-0">
                  <span className="md:hidden text-xs text-muted-foreground mr-1">Sold:</span>
                  {s.totalSold}
                </div>
                <Link href={`/admin/sellers/${s.id}`}>
                  <button className="flex items-center gap-1.5 bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground px-3 py-1.5 rounded-lg font-bold text-xs transition-all">
                    <Eye className="w-3.5 h-3.5" />
                    Review
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
