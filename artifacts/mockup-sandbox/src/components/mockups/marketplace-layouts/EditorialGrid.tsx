import React from 'react';
import './EditorialGrid.css';
import { ShieldCheck, Zap, Star, Play, ChevronRight, ArrowRight, Trophy, Flame } from 'lucide-react';

const accounts = [
  { id:1, accountId:"X3K9", title:"M416 Glacier with Wandering Tyrant + X-Suit", priceForSale:50000, isFeatured:true, sellerUsername:"ProSeller", gradient:"from-amber-400 to-orange-600", image: "/__mockup/images/hero-m416.png" },
  { id:2, accountId:"Z7F2", title:"Glacier Max Season 4 Face + Hair, Old Rare", priceForSale:22000, isFeatured:true, sellerUsername:"CODEX_Ali", gradient:"from-cyan-400 to-blue-600", image: "/__mockup/images/side1-glacier.png" },
  { id:3, accountId:"M1K4", title:"Fool + Sport Car 42 Gunlab Under 35K", priceForSale:35000, isFeatured:false, sellerUsername:"PakStore", gradient:"from-red-500 to-rose-700", image: "/__mockup/images/side2-fool.png" },
  { id:4, accountId:"P9Q1", title:"Cheapest 72 Collection Rare Account Under 50K", priceForSale:48500, isFeatured:false, sellerUsername:"TopSeller", gradient:"from-purple-500 to-fuchsia-700", image: "/__mockup/images/side3-cheap.png" },
  { id:5, accountId:"K2T8", title:"Loaded Account Under 5K Only", priceForSale:5000, isFeatured:false, sellerUsername:"FastSales", gradient:"from-teal-400 to-emerald-700", image: "/__mockup/images/grid1.png" },
  { id:6, accountId:"R5V3", title:"Full Mythic Set + Conqueror Frame", priceForSale:75000, isFeatured:false, sellerUsername:"ElitePK", gradient:"from-sky-300 to-indigo-600", image: "/__mockup/images/grid2.png" },
];

const reviews = [
  "Bought M416 Glacier, fast transfer! ⭐⭐⭐⭐⭐",
  "Trusted seller, got my account in 10 mins. ⭐⭐⭐⭐⭐",
  "Best prices in the market! ⭐⭐⭐⭐⭐",
  "Smooth transaction, highly recommended. ⭐⭐⭐⭐⭐",
  "CODEX is the best platform. ⭐⭐⭐⭐⭐",
  "Got my X-Suit today, thanks! ⭐⭐⭐⭐⭐"
];

export function EditorialGrid() {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price).replace('INR', 'Rs');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-['Outfit'] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1E293B] bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-orange-500 w-8 h-8" />
            <span className="text-2xl font-bold tracking-tight">CODE X <span className="text-orange-500">STOCKS</span></span>
          </div>
          <nav className="flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#" className="text-white hover:text-orange-500 transition-colors">Accounts</a>
            <a href="#" className="hover:text-white transition-colors">Sellers</a>
            <a href="#" className="hover:text-white transition-colors">How it works</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </nav>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">Log in</button>
            <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors">Sell Account</button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-8 pb-20">
        <div className="max-w-[1800px] mx-auto px-6 w-full flex-1 flex flex-col gap-8">
          
          {/* Top Section: Editorial Hero (60/40 Split) */}
          <section className="flex flex-col lg:flex-row gap-6 h-[600px]">
            {/* Hero Card (60%) */}
            <div className="lg:w-[60%] relative rounded-3xl overflow-hidden group cursor-pointer bg-[#11151E] border border-[#1E293B]">
              <img src={accounts[0].image} alt={accounts[0].title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/60 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19]/80 to-transparent"></div>
              
              <div className="absolute inset-0 p-10 flex flex-col justify-end">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Featured Pick
                  </span>
                  <span className="bg-[#1E293B] text-slate-300 text-xs font-bold px-3 py-1 rounded-full">{accounts[0].accountId}</span>
                </div>
                
                <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 max-w-3xl leading-tight">
                  {accounts[0].title}
                </h1>
                
                <div className="flex items-end justify-between mt-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-slate-400 text-sm flex items-center gap-2">
                      Verified Seller <ShieldCheck className="w-4 h-4 text-green-400" /> <span className="text-slate-200 font-medium">{accounts[0].sellerUsername}</span>
                    </span>
                    <span className="text-4xl font-bold text-orange-500">{formatPrice(accounts[0].priceForSale)}</span>
                  </div>
                  
                  <button className="bg-white text-black font-bold px-8 py-4 rounded-xl flex items-center gap-2 hover:bg-slate-200 transition-colors">
                    View Details <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column (40%) */}
            <div className="lg:w-[40%] flex flex-col gap-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> Trending Now</h2>
                <a href="#" className="text-sm text-slate-400 hover:text-white flex items-center">View all <ChevronRight className="w-4 h-4" /></a>
              </div>
              
              <div className="flex-1 flex flex-col gap-4">
                {accounts.slice(1, 4).map((account) => (
                  <div key={account.id} className="flex-1 rounded-2xl overflow-hidden relative group cursor-pointer bg-[#11151E] border border-[#1E293B] flex">
                    <div className="w-1/3 relative">
                      <img src={account.image} alt={account.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#11151E]"></div>
                    </div>
                    <div className="flex-1 p-5 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-slate-400 font-medium">{account.accountId}</span>
                        {account.isFeatured && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Featured</span>}
                      </div>
                      <h3 className="text-lg font-bold leading-tight mb-3 line-clamp-2 group-hover:text-orange-400 transition-colors">{account.title}</h3>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-slate-400 text-xs">By {account.sellerUsername}</span>
                        <span className="text-xl font-bold text-white">{formatPrice(account.priceForSale)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Trust Bar */}
          <section className="bg-[#11151E] border border-[#1E293B] rounded-2xl p-6 flex flex-wrap justify-around items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/10 p-3 rounded-full"><Trophy className="text-orange-500 w-6 h-6" /></div>
              <div>
                <div className="font-bold text-lg">2,400+</div>
                <div className="text-slate-400 text-sm">Accounts Sold</div>
              </div>
            </div>
            <div className="w-px h-10 bg-[#1E293B] hidden md:block"></div>
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-3 rounded-full"><ShieldCheck className="text-green-500 w-6 h-6" /></div>
              <div>
                <div className="font-bold text-lg">150+</div>
                <div className="text-slate-400 text-sm">Verified Sellers</div>
              </div>
            </div>
            <div className="w-px h-10 bg-[#1E293B] hidden md:block"></div>
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/10 p-3 rounded-full"><Star className="text-yellow-500 w-6 h-6 fill-yellow-500" /></div>
              <div>
                <div className="font-bold text-lg">4.9/5</div>
                <div className="text-slate-400 text-sm">Customer Rating</div>
              </div>
            </div>
          </section>

          {/* Masonry Grid Section */}
          <section>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-extrabold mb-2">New Arrivals</h2>
                <p className="text-slate-400">Fresh premium accounts added today</p>
              </div>
              <button className="bg-[#1E293B] hover:bg-slate-700 text-white font-medium px-5 py-2 rounded-lg transition-colors">
                Browse Directory
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* This mimics masonry by making alternating items taller. We use hardcoded styles to show the concept based on the sample data. */}
              {accounts.map((account, index) => {
                const isTall = index % 3 === 0;
                return (
                  <div key={`grid-${account.id}`} className={`rounded-2xl overflow-hidden bg-[#11151E] border border-[#1E293B] group cursor-pointer flex flex-col ${isTall ? 'row-span-2 lg:min-h-[400px]' : 'lg:min-h-[300px]'}`}>
                    <div className="relative flex-1 overflow-hidden">
                      <img src={account.image} alt={account.title} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#11151E] via-transparent to-transparent"></div>
                      <div className="absolute top-4 left-4">
                        <span className="bg-[#0B0F19]/80 backdrop-blur text-slate-300 text-xs font-bold px-2 py-1 rounded">{account.accountId}</span>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col justify-end bg-[#11151E]">
                      <h3 className="font-bold text-lg leading-snug mb-3 line-clamp-2 group-hover:text-orange-400 transition-colors">{account.title}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> {account.sellerUsername}
                        </div>
                        <span className="font-bold text-lg">{formatPrice(account.priceForSale)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Extra dummy cards to fill the grid for visual completeness */}
              {[1, 2].map((i) => (
                <div key={`dummy-${i}`} className={`rounded-2xl overflow-hidden bg-[#11151E] border border-[#1E293B] group cursor-pointer flex flex-col lg:min-h-[300px]`}>
                   <div className="relative flex-1 bg-slate-800 flex items-center justify-center">
                      <span className="text-slate-600 font-medium">Account Placeholder</span>
                   </div>
                   <div className="p-5 bg-[#11151E]">
                      <div className="h-5 bg-slate-800 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-slate-800 rounded w-1/2 mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                        <div className="h-5 bg-slate-800 rounded w-1/3"></div>
                      </div>
                   </div>
                </div>
              ))}

            </div>
          </section>
        </div>
      </main>

      {/* Marquee Footer */}
      <footer className="bg-[#11151E] border-t border-[#1E293B] py-4 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#11151E] to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#11151E] to-transparent z-10"></div>
        
        <div className="flex w-[200%] animate-marquee whitespace-nowrap">
          <div className="flex w-1/2 justify-around items-center">
            {reviews.map((review, i) => (
              <span key={`r1-${i}`} className="text-slate-400 font-medium px-8 text-sm">
                "{review}"
              </span>
            ))}
          </div>
          <div className="flex w-1/2 justify-around items-center">
            {reviews.map((review, i) => (
              <span key={`r2-${i}`} className="text-slate-400 font-medium px-8 text-sm">
                "{review}"
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
