import React from "react";
import { 
  Search, SlidersHorizontal, ChevronDown, CheckCircle2, 
  Zap, Heart, Star, ShieldCheck, Grid as GridIcon, List, MapPin, 
  Gamepad2, UserCircle2, ChevronRight, Menu 
} from "lucide-react";

// Data
const TAGS = ["Glacier M416", "Mummy X-Suit", "AKM Wanderer", "Mythic Outfit", "Conqueror Tier", "Car Skin", "M24 Glacier", "Pharaoh X-Suit"];

const ACCOUNTS = [
  { id: "PMG-2451", title: "M416 Glacier Max + Mummy X-Suit Bundle", price: "Rs 45,000", seller: "PMG_Official", rating: "4.9", reviews: "2,341", delivery: "Instant", featured: true, hot: false, bgFrom: "from-cyan-500", bgTo: "to-blue-900", label: "M416 GLACIER" },
  { id: "PMG-8832", title: "Pharaoh X-Suit + Conqueror Tier", price: "Rs 38,500", seller: "ProAccts_PK", rating: "4.8", reviews: "1,872", delivery: "Instant", featured: false, hot: false, bgFrom: "from-yellow-500", bgTo: "to-amber-900", label: "PHARAOH X-SUIT" },
  { id: "PMG-1029", title: "AKM Wanderer + Avenger Set", price: "Rs 18,200", seller: "GamerVault", rating: "4.7", reviews: "956", delivery: "Within 1h", featured: false, hot: false, bgFrom: "from-red-500", bgTo: "to-rose-900", label: "AKM WANDERER" },
  { id: "PMG-9921", title: "Mythic Glacier M24 + Car Skin", price: "Rs 27,000", seller: "PUBG_Pro_KHI", rating: "4.9", reviews: "3,108", delivery: "Instant", featured: false, hot: true, bgFrom: "from-emerald-400", bgTo: "to-teal-900", label: "M24 GLACIER" },
  { id: "PMG-4452", title: "Ace Tier Account Lvl 75 — Rare Outfits", price: "Rs 12,500", seller: "AccountHaven", rating: "4.6", reviews: "412", delivery: "Within 24h", featured: false, hot: false, bgFrom: "from-purple-500", bgTo: "to-indigo-900", label: "ACE TIER" },
  { id: "PMG-7731", title: "Mummy X-Suit Set + Glacier UMP", price: "Rs 33,000", seller: "PMG_Official", rating: "4.9", reviews: "2,341", delivery: "Instant", featured: false, hot: false, bgFrom: "from-stone-400", bgTo: "to-stone-800", label: "MUMMY X-SUIT" },
  { id: "PMG-3321", title: "Helmet Mythic + AKM Glacier", price: "Rs 22,000", seller: "ElitePubgPK", rating: "4.5", reviews: "288", delivery: "Within 1h", featured: false, hot: false, bgFrom: "from-sky-400", bgTo: "to-blue-800", label: "HELMET MYTHIC" },
  { id: "PMG-5510", title: "Conqueror Lvl 80 — Full Loadout", price: "Rs 56,000", seller: "TopTierShop", rating: "5.0", reviews: "174", delivery: "Instant", featured: true, hot: false, bgFrom: "from-fuchsia-500", bgTo: "to-purple-900", label: "CONQUEROR" },
  { id: "PMG-2199", title: "M762 Pharaoh + Mythic Pan", price: "Rs 19,800", seller: "GamerVault", rating: "4.7", reviews: "956", delivery: "Within 1h", featured: false, hot: false, bgFrom: "from-orange-500", bgTo: "to-red-900", label: "M762 PHARAOH" },
  { id: "PMG-6623", title: "Crown Tier Lvl 65 — Starter Skins", price: "Rs 7,500", seller: "AccountHaven", rating: "4.6", reviews: "412", delivery: "Within 24h", featured: false, hot: false, bgFrom: "from-slate-500", bgTo: "to-slate-800", label: "CROWN TIER" }
];

export function PremiumCardHeavy() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 font-['Outfit',sans-serif] selection:bg-cyan-500/30">
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageIntro />
        <TagChips />
        
        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          <Sidebar />
          <div className="flex-1 min-w-0">
            <Toolbar />
            <Grid accounts={ACCOUNTS} />
            <Pagination />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black font-['Space_Grotesk',sans-serif] text-xl shadow-[0_0_15px_rgba(34,211,238,0.4)] group-hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all">
              P
            </div>
            <span className="font-['Space_Grotesk',sans-serif] font-bold text-xl text-white tracking-tight hidden sm:block">
              PUBG<span className="text-cyan-400">Manager</span>
            </span>
          </a>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-cyan-400">Marketplace</a>
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How it Works</a>
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Sell</a>
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Support</a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-slate-400 border-r border-white/10 pr-4 mr-1">
            <span>PKR (₨)</span>
          </div>
          <button className="text-slate-300 hover:text-white hover:bg-white/5 font-medium hidden sm:flex px-4 py-2 rounded-md transition-colors text-sm">Sign In</button>
          <button className="bg-cyan-500 hover:bg-cyan-400 text-[#0a0a0f] font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)] px-4 py-2 rounded-md transition-all text-sm">
            Sign Up
          </button>
          <button className="md:hidden text-slate-300 p-2">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PageIntro() {
  return (
    <div className="py-4 sm:py-6">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
        <a href="#" className="hover:text-cyan-400 transition-colors">Home</a>
        <ChevronRight className="w-3 h-3" />
        <a href="#" className="hover:text-cyan-400 transition-colors">Games</a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-300">PUBG Mobile</span>
      </div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-['Space_Grotesk',sans-serif] text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
            Buy Verified <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">PUBG Accounts</span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-2xl">
            Premium skins, high-tier ranks, and verified sellers. 100% secured transactions with instant delivery on selected accounts.
          </p>
        </div>
      </div>
    </div>
  );
}

function TagChips() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mt-6">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300 whitespace-nowrap">
        <Search className="w-3.5 h-3.5" /> Popular Searches:
      </div>
      {TAGS.map(tag => (
        <button key={tag} className="px-4 py-1.5 rounded-full bg-[#13131a] border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-xs font-medium text-slate-300 hover:text-cyan-400 transition-all whitespace-nowrap">
          {tag}
        </button>
      ))}
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
      <div className="bg-[#13131a] border border-white/5 rounded-2xl p-5">
        <h3 className="font-['Space_Grotesk',sans-serif] font-bold text-white mb-4">Price Range (PKR)</h3>
        <div className="flex items-center gap-3 mb-4">
          <input type="number" placeholder="Min" className="w-full bg-[#0a0a0f] border border-white/10 text-white placeholder:text-slate-600 h-9 px-3 rounded-md text-sm outline-none focus:border-cyan-500" />
          <span className="text-slate-500">-</span>
          <input type="number" placeholder="Max" className="w-full bg-[#0a0a0f] border border-white/10 text-white placeholder:text-slate-600 h-9 px-3 rounded-md text-sm outline-none focus:border-cyan-500" />
        </div>
        <div className="relative h-2 bg-white/10 rounded-full mt-6">
          <div className="absolute left-[20%] right-[30%] h-full bg-cyan-500 rounded-full"></div>
          <div className="absolute left-[20%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 cursor-pointer"></div>
          <div className="absolute right-[30%] top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 cursor-pointer"></div>
        </div>
      </div>

      <FilterGroup title="Delivery Time" options={["Instant", "Within 1 hour", "Within 24h"]} />
      <FilterGroup title="Skin Rarity" options={["Mythic", "Legendary", "Epic", "Rare"]} />
      <FilterGroup title="Tier" options={["Conqueror", "Ace", "Crown", "Diamond"]} />
      <FilterGroup title="Account Level" options={["80+", "70+", "60+", "50+"]} />
      <FilterGroup title="Server" options={["Asia", "Europe", "NA", "KRJP"]} />

      <div className="bg-[#13131a] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="font-['Space_Grotesk',sans-serif] font-bold text-white text-sm">Verified Only</h3>
          <p className="text-xs text-slate-500">Trusted sellers</p>
        </div>
        <button className="w-10 h-6 rounded-full bg-cyan-500 relative flex items-center px-1 cursor-pointer">
          <div className="w-4 h-4 rounded-full bg-[#0a0a0f] absolute right-1"></div>
        </button>
      </div>
    </aside>
  );
}

function FilterGroup({ title, options }: { title: string, options: string[] }) {
  return (
    <div className="bg-[#13131a] border border-white/5 rounded-2xl p-5">
      <h3 className="font-['Space_Grotesk',sans-serif] font-bold text-white mb-4">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <button key={i} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${i === 0 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-[#0a0a0f] border-white/10 text-slate-400 hover:border-white/30'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toolbar() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-[#13131a] border border-white/5 rounded-2xl p-2 pr-4">
      <div className="relative w-full sm:w-auto flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input placeholder="Search accounts, items, IDs..." className="w-full bg-transparent border-0 text-white placeholder:text-slate-600 pl-9 h-10 focus:outline-none focus:ring-0 text-sm" />
      </div>
      
      <div className="flex items-center gap-4 w-full sm:w-auto shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-4">
        <div className="text-sm font-medium text-slate-400">
          <span className="text-white">1,248</span> results
        </div>
        
        <select className="bg-[#0a0a0f] border border-white/10 text-white text-sm rounded-md px-3 py-2 outline-none focus:border-cyan-500 appearance-none">
          <option value="newest">Newest Listed</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>

        <div className="hidden sm:flex items-center gap-1 bg-[#0a0a0f] border border-white/10 p-1 rounded-lg">
          <button className="p-1.5 rounded-md bg-white/10 text-white"><GridIcon className="w-4 h-4" /></button>
          <button className="p-1.5 rounded-md text-slate-500 hover:text-white"><List className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function Grid({ accounts }: { accounts: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {accounts.map((acc, i) => (
        <Card key={i} account={acc} />
      ))}
    </div>
  );
}

function Card({ account }: { account: any }) {
  return (
    <div className={`group relative bg-[#13131a] border rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${account.featured ? 'border-cyan-500/50 hover:shadow-cyan-500/20' : 'border-white/5 hover:border-white/20'}`}>
      
      <div className={`relative aspect-[4/3] bg-gradient-to-br ${account.bgFrom} ${account.bgTo} p-6 flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgyMHYyMEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ0iTTAgMGgxdjIwSDB6TTAgMGgyMHYxSDB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#13131a] to-transparent opacity-80" />
        
        <h3 className="relative z-10 font-['Space_Grotesk',sans-serif] font-black text-3xl text-white text-center tracking-tighter mix-blend-overlay rotate-[-5deg] scale-110 group-hover:scale-125 transition-transform duration-500">
          {account.label}
        </h3>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          {account.featured && (
            <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-[10px] px-2 py-1 rounded-md shadow-[0_0_10px_rgba(34,211,238,0.4)]">
              FEATURED
            </span>
          )}
          {account.hot && (
            <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-[10px] px-2 py-1 rounded-md shadow-[0_0_10px_rgba(249,115,22,0.4)]">
              HOT
            </span>
          )}
        </div>
        
        <div className="absolute top-3 right-3 z-20">
          <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-rose-500 hover:bg-black/60 transition-colors">
            <Heart className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 z-20">
          <span className="bg-black/40 backdrop-blur-md border border-white/10 text-white font-mono text-[10px] px-2 py-1 rounded-md">
            {account.id}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 relative z-10">
        <h4 className="font-bold text-white text-lg leading-tight mb-3 line-clamp-2 group-hover:text-cyan-400 transition-colors">
          {account.title}
        </h4>
        
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
              <UserCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-slate-300">{account.seller}</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span className="text-amber-500 font-medium">{account.rating}</span>
                <span>({account.reviews})</span>
              </div>
            </div>
          </div>
          
          {account.delivery === "Instant" && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-md">
              <Zap className="w-3 h-3 fill-cyan-400" />
              INSTANT
            </div>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Price</div>
            <div className="font-['Space_Grotesk',sans-serif] font-bold text-2xl text-white">
              {account.price}
            </div>
          </div>
          <button className="bg-white/10 hover:bg-cyan-500 hover:text-[#0a0a0f] text-white font-bold px-3 py-1.5 rounded-md text-sm transition-colors">
            View
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 mt-12 mb-8">
      <button className="bg-transparent border border-white/10 text-white hover:bg-white/5 font-bold w-full sm:w-auto min-w-[200px] px-4 py-2.5 rounded-lg transition-colors text-sm">
        Load More Accounts
      </button>
      <div className="text-xs text-slate-500">Showing 10 of 1,248 results</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0a0a0f] mt-12 py-8">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black font-['Space_Grotesk',sans-serif] text-sm">
            P
          </div>
          <span className="font-['Space_Grotesk',sans-serif] font-bold text-sm text-slate-300">
            PUBG Account Manager
          </span>
        </div>
        
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Contact Support</a>
        </div>
        
        <div className="text-xs text-slate-600">
          © 2024 PUBG Account Manager. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
