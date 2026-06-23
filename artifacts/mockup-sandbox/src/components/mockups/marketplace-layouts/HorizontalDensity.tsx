import React from 'react';
import { ShieldCheck, Zap, Star, Play, ChevronRight, ArrowRight, Filter, SlidersHorizontal, TrendingUp, Search, UserCheck } from 'lucide-react';

const accounts = [
  { id:1, accountId:"X3K9", title:"M416 Glacier with Wandering Tyrant + X-Suit", priceForSale:50000, isFeatured:true, sellerUsername:"ProSeller", gradient:"from-amber-400 to-orange-600" },
  { id:2, accountId:"Z7F2", title:"Glacier Max Season 4 Face + Hair, Old Rare", priceForSale:22000, isFeatured:true, sellerUsername:"CODEX_Ali", gradient:"from-cyan-400 to-blue-600" },
  { id:3, accountId:"M1K4", title:"Fool + Sport Car 42 Gunlab Under 35K", priceForSale:35000, isFeatured:false, sellerUsername:"PakStore", gradient:"from-red-500 to-rose-700" },
  { id:4, accountId:"P9Q1", title:"Cheapest 72 Collection Rare Account Under 50K", priceForSale:48500, isFeatured:false, sellerUsername:"TopSeller", gradient:"from-purple-500 to-fuchsia-700" },
  { id:5, accountId:"K2T8", title:"Loaded Account Under 5K Only", priceForSale:5000, isFeatured:false, sellerUsername:"FastSales", gradient:"from-teal-400 to-emerald-700" },
  { id:6, accountId:"R5V3", title:"Full Mythic Set + Conqueror Frame", priceForSale:75000, isFeatured:false, sellerUsername:"ElitePK", gradient:"from-sky-300 to-indigo-600" },
];

export function HorizontalDensity() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-['Outfit'] flex">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 border-r border-[#1E293B] bg-[#0B0F19] flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-[#1E293B]">
          <h1 className="text-xl font-bold tracking-tight">
            CODE X <span className="text-[#F97316]">STOCKS</span>
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Discover</div>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#F97316]/10 text-[#F97316] font-medium transition-colors">
              <Zap className="w-4 h-4" />
              Featured Accounts
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#11151E] transition-colors">
              <TrendingUp className="w-4 h-4" />
              Trending Now
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#11151E] transition-colors">
              <Star className="w-4 h-4" />
              Top Rated Sellers
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Filters</div>
            {['Mythic Fashion', 'Upgraded Guns', 'X-Suits', 'Conqueror'].map(tag => (
              <label key={tag} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 cursor-pointer group">
                <div className="w-4 h-4 rounded border border-[#1E293B] group-hover:border-slate-500 flex items-center justify-center"></div>
                {tag}
              </label>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#11151E] border border-[#1E293B]">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
              Trusted Platform
            </div>
            <div className="text-xs text-slate-400">Over 5,000+ successful transactions with guaranteed middleman protection.</div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1E293B]">
          <button className="w-full py-3 px-4 bg-[#F97316] hover:bg-[#ea580c] text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
            Sell Your Account
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Available Accounts</h2>
              <p className="text-slate-400 text-sm">Showing 1,245 verified listings</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search by ID or name..." 
                  className="pl-10 pr-4 py-2 bg-[#11151E] border border-[#1E293B] rounded-lg text-sm focus:outline-none focus:border-[#F97316] w-64"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#11151E] border border-[#1E293B] rounded-lg text-sm hover:bg-[#1E293B] transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
                Sort: Newest
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex flex-col gap-3">
            {accounts.map(acc => (
              <div key={acc.id} className="group flex items-center p-3 pr-5 bg-[#11151E] border border-[#1E293B] rounded-xl hover:border-[#F97316]/50 transition-all duration-200">
                <div className={`w-20 h-20 rounded-lg bg-gradient-to-br ${acc.gradient} flex-shrink-0 flex items-center justify-center relative overflow-hidden mr-5`}>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                  <Play className="w-6 h-6 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                  {acc.isFeatured && (
                    <div className="absolute top-0 left-0 right-0 bg-[#F97316] text-[9px] font-bold text-white text-center py-0.5 uppercase tracking-wider">
                      Featured
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-[#1E293B] text-slate-300 px-2 py-0.5 rounded">#{acc.accountId}</span>
                    <h3 className="text-base font-medium text-slate-100 truncate">{acc.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <UserCheck className="w-3.5 h-3.5" />
                      {acc.sellerUsername}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Verified
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-0.5">Price</div>
                    <div className="text-xl font-bold text-white whitespace-nowrap">Rs {acc.priceForSale.toLocaleString()}</div>
                  </div>
                  <button className="px-5 py-2.5 bg-[#1E293B] hover:bg-[#2A3950] text-slate-100 rounded-lg text-sm font-medium transition-colors">
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="mt-10 grid grid-cols-4 gap-4 p-6 border border-[#1E293B] rounded-2xl bg-[#11151E]">
            <div>
              <div className="text-2xl font-bold text-white mb-1">12K+</div>
              <div className="text-sm text-slate-400">Accounts Sold</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">500+</div>
              <div className="text-sm text-slate-400">Verified Sellers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 mb-1">0%</div>
              <div className="text-sm text-slate-400">Scam Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#F97316] mb-1">24/7</div>
              <div className="text-sm text-slate-400">Middleman Support</div>
            </div>
          </div>

          {/* Reviews Strip */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[
                { name: "Ali K.", text: "Fastest delivery. Got the account in 5 minutes.", acc: "M416 Glacier" },
                { name: "Hassan M.", text: "Trusted middleman, smooth process without issues.", acc: "Season 2 Max" },
                { name: "Usman R.", text: "Best prices in the market right now.", acc: "X-Suit Lv 4" }
              ].map((rev, i) => (
                <div key={i} className="flex-1 min-w-[280px] p-4 bg-[#11151E] border border-[#1E293B] rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-[#F97316] text-[#F97316]" />)}
                    </div>
                    <p className="text-sm text-slate-300 mb-3">"{rev.text}"</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs font-medium text-slate-400">{rev.name}</span>
                    <span className="text-xs text-slate-500">Purchased {rev.acc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
