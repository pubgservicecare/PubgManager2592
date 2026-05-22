import { PublicLayout } from "@/components/PublicLayout";
import { useListAccounts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useSEO } from "@/hooks/use-seo";
import { ShieldCheck, Package, ChevronRight } from "lucide-react";

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

  const active = accounts ?? [];

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
        <header className="mb-8 sm:mb-10">
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

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-[#11151E] animate-pulse" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No accounts available right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {active.map((account) => {
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
