import { PublicLayout } from "@/components/PublicLayout";
import { useListAccounts, useGetSettings } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Play, ShieldCheck, Gamepad2, ChevronRight, Search, Star, Zap, SlidersHorizontal, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useSEO } from "@/hooks/use-seo";
import { WishlistButton } from "@/components/WishlistButton";

type SortKey = "newest" | "oldest" | "price_asc" | "price_desc" | "popular";

export function PublicHome() {
  const [sort, setSort] = useState<SortKey>("newest");
  const { data: accounts, isLoading } = useListAccounts({ status: "active", public: true, sort } as any);
  const { data: settings } = useGetSettings();
  const popularTags = ((settings as any)?.popularSearches ?? "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  const [searchFocused, setSearchFocused] = useState(false);

  useSEO({
    title: "Buy PUBG Mobile Accounts in Pakistan — Verified & Secure",
    description: "Browse 100% verified PUBG Mobile accounts with mythic skins, X-Suits, Glacier weapons & rare items. Instant secure transfer. Pakistan's most trusted PUBG marketplace.",
    canonical: "/",
  });

  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const filtered = useMemo(() => {
    if (!accounts) return [];
    const q = search.trim().toLowerCase();
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);
    return accounts.filter((a) => {
      const price = Number((a as any).priceForSale ?? 0);
      const matchesQuery = !q ||
        a.title.toLowerCase().includes(q) ||
        a.accountId.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false);
      const matchesMin = min === null || isNaN(min) || price >= min;
      const matchesMax = max === null || isNaN(max) || price <= max;
      return matchesQuery && matchesMin && matchesMax;
    });
  }, [accounts, search, minPrice, maxPrice]);

  const priceLabel = useMemo(() => {
    const min = minPrice.trim();
    const max = maxPrice.trim();
    if (!min && !max) return null;
    const fmt = (v: string) => `Rs ${Number(v).toLocaleString("en-PK")}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `≤ ${fmt(max)}`;
  }, [minPrice, maxPrice]);

  const hasActiveFilters = !!search || !!minPrice || !!maxPrice;

  const clearFilters = () => {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <PublicLayout>
      <section id="listings" className="bg-[#0B0F19] font-['Outfit'] selection:bg-orange-500/30 selection:text-orange-200 scroll-mt-24 flex-1">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-6">
            {/* Main column */}
            <div className="flex-1 min-w-0">

              {/* ── SEO Hero Heading ─────────────────────────────────── */}
              <header className="mb-5">
                <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-tight">
                  PUBG Mobile Account Marketplace
                </h1>
                <p className="text-slate-400 mt-1 text-sm sm:text-[15px] leading-relaxed max-w-2xl">
                  Buy 100% verified PUBG Mobile accounts with mythic skins, X-Suits, Glacier weapons &amp; rare items — instant secure transfer, Pakistan's most trusted seller.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <ShieldCheck className="w-3 h-3" /> 100% Verified Accounts
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-400">
                    <Zap className="w-3 h-3" /> Instant Transfer
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400">
                    <Star className="w-3 h-3 fill-current" /> Trusted in Pakistan
                  </span>
                </div>
              </header>

              {/* Toolbar */}
              <div className="flex flex-col gap-3 mb-6 bg-[#11151E] p-3 sm:p-4 rounded-xl border border-[#1E293B]">
                <div className="flex flex-row items-center gap-2 sm:gap-3 flex-nowrap">
                  <div className="relative flex-1 min-w-0 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                      placeholder="Search accounts…"
                      aria-label="Search PUBG Mobile accounts"
                      className="pl-9 pr-3 bg-[#0B0F19] border border-[#1E293B] text-slate-200 placeholder:text-slate-500 h-10 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full rounded-md text-sm"
                      data-testid="marketplace-search"
                    />
                  </div>
                  <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`shrink-0 inline-flex items-center gap-2 h-10 px-3 rounded-md border text-sm font-medium transition-colors ${
                            priceLabel
                              ? "bg-orange-500/10 border-orange-500/40 text-orange-300 hover:bg-orange-500/15"
                              : "bg-[#0B0F19] border-[#1E293B] text-slate-300 hover:bg-[#1E293B]"
                          }`}
                          data-testid="price-range-trigger"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          <span className="hidden sm:inline">{priceLabel ?? "Price"}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-72 bg-[#11151E] border-[#1E293B] text-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-white">Price Range (Rs)</h4>
                          {(minPrice || maxPrice) && (
                            <button
                              type="button"
                              onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                              className="text-[11px] text-slate-400 hover:text-orange-400 inline-flex items-center gap-1"
                              data-testid="clear-price"
                            >
                              <X className="h-3 w-3" /> Clear
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Min</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={minPrice}
                              onChange={(e) => setMinPrice(e.target.value)}
                              placeholder="0"
                              className="w-full h-9 px-2 bg-[#0B0F19] border border-[#1E293B] rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              data-testid="price-min"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Max</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={maxPrice}
                              onChange={(e) => setMaxPrice(e.target.value)}
                              placeholder="Any"
                              className="w-full h-9 px-2 bg-[#0B0F19] border border-[#1E293B] rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              data-testid="price-max"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: "Under 5k", min: "", max: "5000" },
                            { label: "5k–15k", min: "5000", max: "15000" },
                            { label: "15k–30k", min: "15000", max: "30000" },
                            { label: "30k+", min: "30000", max: "" },
                          ].map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              onClick={() => { setMinPrice(p.min); setMaxPrice(p.max); }}
                              className="text-[11px] font-medium py-1 px-2 rounded-full border bg-[#0B0F19] hover:bg-[#1E293B] border-[#1E293B] text-slate-300 transition-colors"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  <span className="text-sm text-slate-400 font-medium hidden lg:block ml-auto">
                    <span className="text-white font-bold">{filtered.length}</span> {filtered.length === 1 ? "Result" : "Results"}
                  </span>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger className="shrink-0 w-[110px] sm:w-[160px] h-10 bg-[#0B0F19] border-[#1E293B] text-slate-200 focus:ring-orange-500 sm:ml-auto lg:ml-0" data-testid="sort-dropdown">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#11151E] border-[#1E293B] text-slate-200">
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="price_asc">Price: Low → High</SelectItem>
                      <SelectItem value="price_desc">Price: High → Low</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {popularTags.length > 0 && (
                  <div
                    className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:m-0 sm:p-0 sm:overflow-visible sm:flex-wrap"
                  >
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Popular:</span>
                    {popularTags.map((tag: string) => {
                      const active = search.toLowerCase() === tag.toLowerCase();
                      return (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setSearch(active ? "" : tag)}
                          className={`shrink-0 font-medium py-1 px-2.5 rounded-full transition-colors text-xs border ${
                            active
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-[#0B0F19] hover:bg-[#1E293B] border-[#1E293B] text-slate-300"
                          }`}
                          data-testid={`popular-${tag.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-[#11151E] rounded-xl aspect-[4/5] animate-pulse border border-[#1E293B]"></div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 sm:py-24 bg-[#11151E] rounded-xl border border-[#1E293B] px-4">
                  <Gamepad2 className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-2xl font-bold text-white">
                    {hasActiveFilters ? "No matches found" : "No accounts available right now."}
                  </h3>
                  <p className="text-slate-400 mt-2 text-sm sm:text-base">
                    {hasActiveFilters ? "Try adjusting your search or filters." : "Check back later for new inventory."}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {filtered.map((account, index) => {
                    const imgs = ((account as any).imageUrls ?? []) as string[];
                    const gradient = pickGradient(account.id);
                    return (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
                      >
                        <Link href={`/account/${account.id}`}>
                          <div className="group relative overflow-hidden rounded-xl border border-[#1E293B] bg-[#11151E] hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.08)] transition-all duration-300 flex flex-col h-full cursor-pointer active:scale-[0.99]">
                            <div className="relative aspect-[4/3] w-full overflow-hidden">
                              {imgs.length > 0 ? (
                                <>
                                  <img
                                    src={`/api/storage${imgs[0]}`}
                                    alt={`${account.title} — Buy PUBG Mobile Account`}
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-[#11151E] via-[#11151E]/30 to-transparent pointer-events-none" />
                                </>
                              ) : (
                                <>
                                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80`} />
                                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#11151E]/60 to-[#11151E]" />
                                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                    {account.videoUrl ? (
                                      <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white">
                                        <Play className="w-5 h-5 ml-1" />
                                      </div>
                                    ) : (
                                      <span className="font-display text-xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] -rotate-3 group-hover:scale-110 transition-transform duration-500 line-clamp-2">
                                        {account.title}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}

                              {imgs.length > 1 && (
                                <div className="absolute bottom-3 right-12 z-10 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                  +{imgs.length - 1}
                                </div>
                              )}

                              {/* Wishlist heart */}
                              <div className="absolute right-3 top-3 z-10" onClick={(e) => e.preventDefault()}>
                                <WishlistButton accountId={account.id} />
                              </div>

                              {/* Top-left badges */}
                              <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 items-start">
                                <span className="bg-black/55 text-[10px] font-bold text-white backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5">
                                  #{account.accountId}
                                </span>
                                {(account as any).isFeatured && (
                                  <span className="inline-flex items-center bg-orange-500/95 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(249,115,22,0.4)] rounded-md px-2 py-0.5">
                                    <Star className="mr-1 h-3 w-3 fill-white" /> Featured
                                  </span>
                                )}
                              </div>

                              {/* Bottom-left instant delivery */}
                              <div className="absolute bottom-3 left-3 z-10">
                                <span className="inline-flex items-center bg-yellow-500/20 text-[10px] font-bold text-yellow-400 backdrop-blur-md border border-yellow-500/20 rounded-md px-2 py-0.5">
                                  <Zap className="mr-1 h-3 w-3 fill-yellow-400" /> Instant
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-1 flex-col p-4">
                              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100 group-hover:text-orange-400 transition-colors mb-3 min-h-[2.5rem]">
                                {account.title}
                              </h3>

                              <div className="mt-auto flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    P
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <div className="flex items-center gap-1">
                                      <span className="truncate text-xs font-medium text-slate-300">
                                        {(account as any).sellerUsername || "Verified Seller"}
                                      </span>
                                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <Star className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                                      <span className="text-orange-400 font-bold">Trusted Seller</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-[#1E293B] pt-3">
                                  <span className="text-lg sm:text-xl font-bold tracking-tight text-orange-500 truncate">
                                    Rs {Number(account.priceForSale ?? 0).toLocaleString("en-PK")}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-orange-400 transition-colors inline-flex items-center gap-1 shrink-0">
                                    View <ChevronRight className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}

const GRADIENTS = [
  "from-cyan-400 to-blue-600",
  "from-amber-400 to-orange-600",
  "from-red-500 to-rose-700",
  "from-sky-300 to-indigo-600",
  "from-purple-500 to-fuchsia-700",
  "from-yellow-200 to-amber-500",
  "from-teal-400 to-emerald-700",
  "from-red-600 to-orange-600",
  "from-indigo-400 to-purple-700",
  "from-slate-400 to-slate-700",
];

function pickGradient(id: number): string {
  const idx = ((id % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length;
  return GRADIENTS[idx];
}

