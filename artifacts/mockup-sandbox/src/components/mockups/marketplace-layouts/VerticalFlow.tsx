import React from "react";
import {
  ShieldCheck,
  Zap,
  Star,
  Play,
  ChevronRight,
  ArrowRight,
  Search,
  Menu,
  ShoppingCart,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

const accounts = [
  {
    id: 1,
    accountId: "X3K9",
    title: "M416 Glacier with Wandering Tyrant + X-Suit",
    priceForSale: 50000,
    isFeatured: true,
    sellerUsername: "ProSeller",
    gradient: "from-amber-400 to-orange-600",
  },
  {
    id: 2,
    accountId: "Z7F2",
    title: "🔥 Glacier Max Season 4 Face + Hair, Old Rare",
    priceForSale: 22000,
    isFeatured: true,
    sellerUsername: "CODEX_Ali",
    gradient: "from-cyan-400 to-blue-600",
  },
  {
    id: 3,
    accountId: "M1K4",
    title: "Fool + Sport Car 42 Gunlab Under 35K",
    priceForSale: 35000,
    isFeatured: false,
    sellerUsername: "PakStore",
    gradient: "from-red-500 to-rose-700",
  },
  {
    id: 4,
    accountId: "P9Q1",
    title: "Cheapest 72 Collection Rare Account Under 50K",
    priceForSale: 48500,
    isFeatured: false,
    sellerUsername: "TopSeller",
    gradient: "from-purple-500 to-fuchsia-700",
  },
  {
    id: 5,
    accountId: "K2T8",
    title: "Loaded Account Under 5K Only",
    priceForSale: 5000,
    isFeatured: false,
    sellerUsername: "FastSales",
    gradient: "from-teal-400 to-emerald-700",
  },
  {
    id: 6,
    accountId: "R5V3",
    title: "Full Mythic Set + Conqueror Frame Season 3",
    priceForSale: 75000,
    isFeatured: false,
    sellerUsername: "ElitePK",
    gradient: "from-sky-300 to-indigo-600",
  },
];

const reviews = [
  { id: 1, user: "Ahmed", rating: 5, text: "Fast delivery, account works perfectly." },
  { id: 2, user: "Slayer99", rating: 5, text: "Trusted seller. X-Suit is exactly as described!" },
  { id: 3, user: "KingKhan", rating: 4, text: "Good prices, smooth transaction via middleman." },
  { id: 4, user: "Phantom", rating: 5, text: "Got my Glacier account in 10 minutes. Superb!" },
];

export function VerticalFlow() {
  const featuredAccounts = accounts.filter((a) => a.isFeatured);
  const regularAccounts = accounts.filter((a) => !a.isFeatured);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .glass-panel { background: rgba(17, 21, 30, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(30, 41, 59, 0.8); }
        .glass-card { background: linear-gradient(180deg, #11151E 0%, rgba(17, 21, 30, 0.8) 100%); border: 1px solid #1E293B; }
      `}</style>

      <div className="font-outfit">
        {/* Navigation */}
        <nav className="absolute top-0 w-full z-50 glass-panel border-b-0 border-white/5">
          <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
                <span className="text-[#F97316]">CODE X</span>
                <span>STOCKS</span>
              </div>
              <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                <a href="#" className="text-white hover:text-[#F97316] transition-colors">Marketplace</a>
                <a href="#" className="hover:text-white transition-colors">Sellers</a>
                <a href="#" className="hover:text-white transition-colors">Middleman</a>
                <a href="#" className="hover:text-white transition-colors">Support</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-white text-slate-300 transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <button className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-white text-slate-300 transition-colors">
                <ShoppingCart className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-[#1E293B] mx-2 hidden md:block"></div>
              <button className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E293B] transition-colors">
                Log In
              </button>
              <button className="text-sm font-medium px-5 py-2 rounded-lg bg-[#F97316] text-white hover:bg-[#ea580c] transition-colors shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                Sell Account
              </button>
              <button className="md:hidden text-slate-300">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </nav>

        {/* Cinematic Hero Section */}
        <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
          {/* Background Image / Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src="/__mockup/images/pubg-hero.png" 
              alt="Hero Background" 
              className="w-full h-full object-cover opacity-60 mix-blend-lighten"
            />
            {/* Gradients to blend into background */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/60 to-transparent z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-transparent to-[#0B0F19] z-10"></div>
            {/* Radial glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#F97316]/10 rounded-full blur-[120px] pointer-events-none z-10"></div>
          </div>

          <div className="relative z-20 max-w-[1280px] w-full mx-auto px-6 text-center mt-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1E293B]/50 border border-[#F97316]/30 text-[#F97316] text-sm font-semibold mb-6 backdrop-blur-md">
              <Zap className="w-4 h-4 fill-current" />
              <span>Over 5,000+ Verified Accounts</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight leading-[1.05] mb-6 drop-shadow-2xl">
              DOMINATE WITH <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-amber-400">MYTHIC GEAR</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 font-medium">
              The premier marketplace for rare, safe, and secure PUBG accounts. 
              Middleman protected. Instant delivery.
            </p>

            <div className="max-w-3xl mx-auto glass-panel p-2 rounded-2xl flex flex-col md:flex-row items-center gap-2 mb-12">
              <div className="flex-1 flex items-center px-4 w-full h-12 md:h-auto">
                <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search for M416 Glacier, X-Suits, Conqueror..." 
                  className="w-full bg-transparent border-none outline-none text-white placeholder-slate-500 font-medium h-full"
                />
              </div>
              <button className="w-full md:w-auto h-12 px-8 rounded-xl bg-[#F97316] text-white font-bold hover:bg-[#ea580c] transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_4px_20px_rgba(249,115,22,0.4)]">
                Find Accounts <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>100% Secure Trading</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#F97316]" />
                <span>Verified Sellers Only</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span>Lifetime Support</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Horizontal Strip */}
        <section className="relative z-30 -mt-24 mb-20 max-w-[1280px] mx-auto">
          <div className="px-6 mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#F97316] fill-current" />
                Premium Drops
              </h2>
              <p className="text-sm text-slate-400 mt-1">Hand-picked accounts of the week</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-[#1E293B] text-white transition-colors">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <button className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-[#1E293B] text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrolling Row */}
          <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-6 pb-8 hide-scrollbar">
            {featuredAccounts.map((account) => (
              <div key={account.id} className="snap-start shrink-0 w-[85vw] sm:w-[500px] glass-card rounded-2xl overflow-hidden group hover:border-[#F97316]/50 transition-colors cursor-pointer">
                <div className={`h-48 w-full bg-gradient-to-br ${account.gradient} relative overflow-hidden`}>
                  {/* Faux image background texture */}
                  <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1 border border-white/10">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Featured
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <div className="text-sm text-white/80 font-medium mb-1">ID: {account.accountId}</div>
                    <div className="text-2xl font-bold text-white drop-shadow-md">Rs {account.priceForSale.toLocaleString()}</div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 leading-snug group-hover:text-[#F97316] transition-colors">
                    {account.title}
                  </h3>
                  <div className="flex items-center justify-between border-t border-[#1E293B] pt-4 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                        {account.sellerUsername.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-300">{account.sellerUsername}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400 ml-1" />
                    </div>
                    <button className="text-[#F97316] text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                      View <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories / Tags */}
        <section className="max-w-[1280px] mx-auto px-6 mb-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-slate-400 mr-2">Popular:</span>
            {["M416 Glacier", "X-Suits", "Conqueror Account", "Mythic Fashion", "Under 10k", "Level 80+"].map((tag, i) => (
              <button key={i} className="px-4 py-2 rounded-full border border-[#1E293B] bg-[#11151E] text-sm font-medium text-slate-300 hover:bg-[#1E293B] hover:text-white transition-colors">
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* Masonry-like Grid for All Accounts */}
        <section className="max-w-[1280px] mx-auto px-6 mb-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Latest Arrivals</h2>
            <button className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {accounts.map((account) => (
              <div key={`grid-${account.id}`} className="glass-card rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full">
                <div className={`h-40 w-full bg-gradient-to-br ${account.gradient} relative overflow-hidden shrink-0`}>
                  <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-slate-300 border border-white/10 uppercase">
                    ID: {account.accountId}
                  </div>
                  {account.isFeatured && (
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1 rounded text-[10px] font-bold text-white uppercase shadow-lg">
                      Hot
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-base font-bold text-slate-100 mb-2 line-clamp-2 leading-tight group-hover:text-[#F97316] transition-colors flex-1">
                    {account.title}
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="text-xl font-extrabold text-white mb-4">
                      Rs {account.priceForSale.toLocaleString()}
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-[#1E293B] pt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">{account.sellerUsername}</span>
                        <ShieldCheck className="w-3 h-3 text-blue-400" />
                      </div>
                      <div className="text-xs font-bold text-slate-500">Just now</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews Strip */}
        <section className="border-t border-[#1E293B] bg-[#0B0F19]/50 relative z-10 py-16">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">Trusted by Gamers</h2>
              <p className="text-slate-400">Join thousands of satisfied players who bought their dream accounts here.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {reviews.map((review) => (
                <div key={review.id} className="glass-card p-5 rounded-2xl flex flex-col">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-[#F97316] text-[#F97316]" : "fill-slate-800 text-slate-800"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 font-medium mb-4 flex-1">"{review.text}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-white">
                      {review.user.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{review.user}</div>
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Buyer
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Simple Footer Block to complete the page visually */}
        <footer className="border-t border-[#1E293B] bg-[#070A11] py-12">
          <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
              <span className="text-[#F97316]">CODE X</span>
              <span>STOCKS</span>
            </div>
            <p className="text-sm font-medium text-slate-600">
              &copy; {new Date().getFullYear()} Code X Stocks. All rights reserved. Not affiliated with Tencent Games or Krafton.
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
