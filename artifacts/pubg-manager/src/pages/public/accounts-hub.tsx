import { useState, useMemo, useRef, useEffect } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { useListAccounts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useSEO } from "@/hooks/use-seo";
import { ShieldCheck, Package, ChevronRight, Search, X, SlidersHorizontal } from "lucide-react";

const GRADIENTS = [
  "from-orange-600 to-rose-700",
  "from-violet-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-sky-600 to-blue-700",
  "from-amber-500 to-orange-600",
  "from-pink-600 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-purple-600 to-violet-700",
];

function formatCurrency(value: any) {
  const num = parseFloat(String(value ?? 0));
  if (isNaN(num)) return "Rs 0";
  return `Rs ${num.toLocaleString("en-PK")}`;
}

export function AccountsHub() {
  const { data: accounts, isLoading } = useListAccounts({ status: "active", public: true } as any);
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showRange, setShowRange] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) {
        setShowRange(false);
      }
    }
    if (showRange) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showRange]);

  const active = accounts ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice !== "" ? parseFloat(minPrice) : null;
    const max = maxPrice !== "" ? parseFloat(maxPrice) : null;
    return active.filter((a) => {
      if (q && !(a.title?.toLowerCase().includes(q) || (a as any).description?.toLowerCase().includes(q))) return false;
      const price = parseFloat(String((a as any).priceForSale ?? 0));
      if (min !== null && !isNaN(min) && price < min) return false;
      if (max !== null && !isNaN(max) && price > max) return false;
      return true;
    });
  }, [active, query, minPrice, maxPrice]);

  const POPULAR_TAGS = ["Mythic", "X-Suit", "Glacier", "Sport Car", "Alan Walker", "Under 50K", "Under 100K", "Rare Items"];

  const hasFilters = query || minPrice || maxPrice;
  const clearAll = () => { setQuery(""); setMinPrice(""); setMaxPrice(""); };

  const applyTag = (tag: string) => {
    if (tag === "Under 50K") { setMinPrice(""); setMaxPrice("50000"); setQuery(""); }
    else if (tag === "Under 100K") { setMinPrice(""); setMaxPrice("100000"); setQuery(""); }
    else { setQuery((prev) => prev === tag ? "" : tag); setMinPrice(""); setMaxPrice(""); }
  };

  const activeTag = POPULAR_TAGS.find((t) => {
    if (t === "Under 50K") return maxPrice === "50000" && !minPrice && !query;
    if (t === "Under 100K") return maxPrice === "100000" && !minPrice && !query;
    return query === t;
  });

  useSEO({
    title: "All PUBG Mobile Accounts for Sale",
    description: `Browse all ${active.length > 0 ? active.length + " " : ""}verified PUBG Mobile accounts available on CodexStocks. Mythic skins, X-Suits, Glacier weapons, Sport Cars and rare items. Pakistan's most trusted PUBG account marketplace.`,
    canonical: "/accounts",
  });

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300 font-medium">All Accounts</span>
        </nav>

        {/* Page header */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white mb-2">
            PUBG Mobile Accounts for Sale
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
            {isLoading
              ? "Loading verified listings…"
              : active.length > 0
                ? <>Browse all <strong className="text-slate-300">{active.length}</strong> verified listings. Mythic skins, X-Suits, Glacier weapons, and rare items — instant secure transfer guaranteed.</>
                : "No accounts available right now. Check back soon."}
          </p>
        </header>

        {/* Filter bar */}
        {!isLoading && active.length > 0 && (
          <div className="mb-6 flex items-center gap-2">
            {/* Search — full width */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search accounts…"
                className="w-full bg-[#0D1117] border border-[#1E293B] hover:border-[#334155] focus:border-orange-500/50 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Range button + dropdown */}
            <div ref={rangeRef} className="relative shrink-0">
              <button
                onClick={() => setShowRange((v) => !v)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  minPrice || maxPrice
                    ? "bg-orange-500/10 border-orange-500/50 text-orange-400"
                    : "bg-[#0D1117] border-[#1E293B] hover:border-[#334155] text-slate-400 hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Range</span>
                {(minPrice || maxPrice) && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
              </button>

              {showRange && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#0D1117] border border-[#1E293B] rounded-xl shadow-xl shadow-black/40 p-4 z-50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Price Range (Rs)</p>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Min</label>
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full bg-[#11151E] border border-[#1E293B] focus:border-orange-500/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <span className="text-slate-600 mt-5">—</span>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Max</label>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Any"
                        min="0"
                        className="w-full bg-[#11151E] border border-[#1E293B] focus:border-orange-500/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                      className="flex-1 py-2 rounded-lg border border-[#1E293B] text-xs text-slate-400 hover:text-slate-200 hover:border-[#334155] transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowRange(false)}
                      className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-xs text-white font-semibold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clear all — only when active */}
            {hasFilters && (
              <button onClick={clearAll} className="shrink-0 text-xs text-slate-500 hover:text-orange-400 transition-colors font-medium">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Popular tags */}
        {!isLoading && active.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {POPULAR_TAGS.map((tag) => {
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => applyTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "bg-[#0D1117] border-[#1E293B] text-slate-400 hover:border-orange-500/40 hover:text-slate-200"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-[#11151E] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            {query ? (
              <>
                <p className="text-slate-400 font-medium">No accounts found for "<span className="text-orange-400">{query}</span>"</p>
                <button
                  onClick={() => setQuery("")}
                  className="mt-3 text-sm text-orange-400 hover:text-orange-300 transition-colors underline"
                >
                  Clear search
                </button>
              </>
            ) : (
              <p className="text-slate-400">No accounts available right now. Check back soon.</p>
            )}
          </div>
        ) : (
          <>
            {query && (
              <p className="text-xs text-slate-500 mb-4">
                Showing <span className="text-slate-300 font-semibold">{filtered.length}</span> of {active.length} accounts
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filtered.map((account) => {
                const slug = (account as any).slug as string | null | undefined;
                const href = slug ? `/account/${slug}` : `/account/${account.id}`;
                const imgs = ((account as any).imageUrls ?? []) as string[];
                const gradient = GRADIENTS[account.id % GRADIENTS.length];
                return (
                  <Link key={account.id} href={href}>
                    <article className="group relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#11151E] hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.08)] transition-all duration-300 flex flex-col h-full cursor-pointer">
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80`} />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#11151E]/60 to-[#11151E]" />
                        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                          <span className="font-display text-base font-black italic tracking-tighter text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] -rotate-3 group-hover:scale-110 transition-transform duration-500 line-clamp-2">
                            {account.title}
                          </span>
                        </div>
                        {imgs.length > 0 && (
                          <>
                            <img
                              src={`/api/storage${imgs[0]}`}
                              alt={`${account.title} — Buy PUBG Mobile Account`}
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#11151E] via-[#11151E]/30 to-transparent pointer-events-none" />
                          </>
                        )}
                      </div>
                      <div className="p-3 mt-auto">
                        <p className="text-xs text-slate-400 font-medium line-clamp-1 mb-1">{account.title}</p>
                        <p className="text-sm font-bold text-orange-400">{formatCurrency((account as any).priceForSale)}</p>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Trust strip */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-8 text-xs text-slate-500 border-t border-[#1E293B] pt-8">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Verified Accounts</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Instant Secure Transfer</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Pakistan's Trusted Marketplace</span>
        </div>

      </div>
    </PublicLayout>
  );
}
