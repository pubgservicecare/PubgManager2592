import React, { useState } from "react";
import { Search, ChevronDown, Filter, ShieldCheck, Star, Zap, Heart, LayoutGrid, List, SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const MOCK_DATA = [
  {
    id: "PMG-2451",
    title: "M416 Glacier Max + Mummy X-Suit Bundle",
    price: 45000,
    seller: "PMG_Official",
    rating: 4.9,
    reviews: 2341,
    delivery: "Instant",
    featured: true,
    bg: "from-cyan-400 to-blue-600",
    label: "M416 GLACIER",
  },
  {
    id: "PRO-8821",
    title: "Pharaoh X-Suit + Conqueror Tier",
    price: 38500,
    seller: "ProAccts_PK",
    rating: 4.8,
    reviews: 1872,
    delivery: "Instant",
    featured: false,
    bg: "from-amber-400 to-orange-600",
    label: "PHARAOH X-SUIT",
  },
  {
    id: "VAU-9932",
    title: "AKM Wanderer + Avenger Set",
    price: 18200,
    seller: "GamerVault",
    rating: 4.7,
    reviews: 956,
    delivery: "Within 1h",
    featured: false,
    bg: "from-red-500 to-rose-700",
    label: "AKM WANDERer",
  },
  {
    id: "KHI-1102",
    title: "Mythic Glacier M24 + Car Skin",
    price: 27000,
    seller: "PUBG_Pro_KHI",
    rating: 4.9,
    reviews: 3108,
    delivery: "Instant",
    featured: false,
    hot: true,
    bg: "from-sky-300 to-indigo-600",
    label: "M24 GLACIER",
  },
  {
    id: "HAV-4491",
    title: "Ace Tier Account Lvl 75 — Rare Outfits",
    price: 12500,
    seller: "AccountHaven",
    rating: 4.6,
    reviews: 412,
    delivery: "Within 24h",
    featured: false,
    bg: "from-purple-500 to-fuchsia-700",
    label: "ACE TIER LVL 75",
  },
  {
    id: "PMG-2900",
    title: "Mummy X-Suit Set + Glacier UMP",
    price: 33000,
    seller: "PMG_Official",
    rating: 4.9,
    reviews: 2341,
    delivery: "Instant",
    featured: false,
    bg: "from-yellow-200 to-amber-500",
    label: "MUMMY X-SUIT",
  },
  {
    id: "ELI-7721",
    title: "Helmet Mythic + AKM Glacier",
    price: 22000,
    seller: "ElitePubgPK",
    rating: 4.5,
    reviews: 288,
    delivery: "Within 1h",
    featured: false,
    bg: "from-teal-400 to-emerald-700",
    label: "MYTHIC HELMET",
  },
  {
    id: "TOP-1188",
    title: "Conqueror Lvl 80 — Full Loadout",
    price: 56000,
    seller: "TopTierShop",
    rating: 5.0,
    reviews: 174,
    delivery: "Instant",
    featured: true,
    bg: "from-red-600 to-orange-600",
    label: "CONQUEROR LVL 80",
  },
  {
    id: "VAU-8822",
    title: "M762 Pharaoh + Mythic Pan",
    price: 19800,
    seller: "GamerVault",
    rating: 4.7,
    reviews: 956,
    delivery: "Within 1h",
    featured: false,
    bg: "from-indigo-400 to-purple-700",
    label: "M762 PHARAOH",
  },
  {
    id: "HAV-3392",
    title: "Crown Tier Lvl 65 — Starter Skins",
    price: 7500,
    seller: "AccountHaven",
    rating: 4.6,
    reviews: 412,
    delivery: "Within 24h",
    featured: false,
    bg: "from-slate-400 to-slate-700",
    label: "CROWN TIER",
  },
];

const POPULAR_TAGS = [
  "Glacier M416", "Mummy X-Suit", "AKM Wanderer", "Mythic Outfit", "Conqueror Tier", "Car Skin", "M24 Glacier", "Pharaoh X-Suit"
];

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1E293B] bg-[#0B0F19]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F19]/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white font-bold">
            P
          </div>
          <span className="text-xl font-bold tracking-tight text-white hidden sm:inline-block">PUBG Account Manager</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a href="#" className="text-orange-500 font-semibold transition-colors hover:text-orange-400">Marketplace</a>
          <a href="#" className="transition-colors hover:text-white">How it Works</a>
          <a href="#" className="transition-colors hover:text-white">Sell</a>
          <a href="#" className="transition-colors hover:text-white">Support</a>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">Sign In</Button>
          <Button className="bg-orange-500 text-white hover:bg-orange-600 font-bold hidden sm:flex">Sign Up</Button>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="hidden lg:block w-64 shrink-0 flex-col gap-6 sticky top-24 self-start h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-hide text-slate-200">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-white mb-4">Price Range (PKR)</h3>
          <div className="space-y-4">
            <Slider defaultValue={[0, 100000]} max={100000} step={1000} className="py-2" />
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Min" className="h-9 bg-[#11151E] border-[#1E293B] text-slate-200 focus-visible:ring-orange-500" />
              <span className="text-slate-500">-</span>
              <Input type="number" placeholder="Max" className="h-9 bg-[#11151E] border-[#1E293B] text-slate-200 focus-visible:ring-orange-500" />
            </div>
          </div>
        </div>

        <div className="border-t border-[#1E293B] pt-6">
          <h3 className="font-semibold text-white mb-4">Skin Rarity</h3>
          <div className="space-y-3">
            {["Mythic", "Legendary", "Epic", "Rare"].map((rarity) => (
              <div key={rarity} className="flex items-center space-x-3">
                <Checkbox id={`r-${rarity}`} className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
                <label htmlFor={`r-${rarity}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {rarity}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#1E293B] pt-6">
          <h3 className="font-semibold text-white mb-4">Account Level</h3>
          <div className="space-y-3">
            {["50+", "60+", "70+", "80+"].map((lvl) => (
              <div key={lvl} className="flex items-center space-x-3">
                <Checkbox id={`l-${lvl}`} className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
                <label htmlFor={`l-${lvl}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Level {lvl}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#1E293B] pt-6">
          <h3 className="font-semibold text-white mb-4">Delivery Time</h3>
          <div className="space-y-3">
            {["Instant", "Within 1 hour", "Within 24h"].map((time) => (
              <div key={time} className="flex items-center space-x-3">
                <Checkbox id={`t-${time}`} className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
                <label htmlFor={`t-${time}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {time}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#1E293B] pt-6 pb-8">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Verified Only</h3>
            <Checkbox id="v-only" className="border-slate-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 h-5 w-5 rounded" defaultChecked />
          </div>
        </div>
      </div>
    </aside>
  );
}

function ProductCard({ item }: { item: typeof MOCK_DATA[0] }) {
  return (
    <Card className="group relative overflow-hidden rounded-xl border-[#1E293B] bg-[#11151E] hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.05)] transition-all duration-300 flex flex-col h-full">
      <div className="relative aspect-[4/3] w-full overflow-hidden p-2">
        <div className={`absolute inset-0 bg-gradient-to-br ${item.bg} opacity-80`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#11151E]/60 to-[#11151E]" />
        
        {/* Heart icon */}
        <button className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-2 text-white/70 backdrop-blur-sm transition hover:bg-black/60 hover:text-orange-500">
          <Heart className="h-4 w-4" />
        </button>

        {/* Top Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 items-start">
          <Badge variant="secondary" className="bg-black/50 text-[10px] font-bold text-white backdrop-blur-md border-white/10 hover:bg-black/60">
            #{item.id}
          </Badge>
          {item.featured && (
            <Badge variant="secondary" className="bg-orange-500/90 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(249,115,22,0.4)] hover:bg-orange-500 border-none">
              <Star className="mr-1 h-3 w-3 fill-white" /> Featured
            </Badge>
          )}
          {item.hot && (
            <Badge variant="secondary" className="bg-red-500/90 text-[10px] font-bold text-white hover:bg-red-500 border-none">
              🔥 Hot
            </Badge>
          )}
        </div>

        {/* Thumbnail Center Text */}
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <span className="font-display text-2xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] -rotate-3 scale-110 group-hover:scale-125 transition-transform duration-500">
            {item.label}
          </span>
        </div>

        {/* Bottom Delivery Badge */}
        {item.delivery === "Instant" && (
          <div className="absolute bottom-3 left-3 z-10">
            <Badge variant="secondary" className="bg-yellow-500/20 text-[10px] font-bold text-yellow-400 backdrop-blur-md border border-yellow-500/20">
              <Zap className="mr-1 h-3 w-3 fill-yellow-400" /> Instant Delivery
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100 group-hover:text-orange-400 transition-colors mb-3">
          {item.title}
        </h3>
        
        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {item.seller.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs font-medium text-slate-300">{item.seller}</span>
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className="text-orange-400 font-bold">{item.rating}</span>
                <Star className="h-2.5 w-2.5 fill-orange-400 text-orange-400" />
                <span>({item.reviews})</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-t border-[#1E293B] pt-3">
            <span className="text-xl font-bold tracking-tight text-orange-500">
              Rs {item.price.toLocaleString()}
            </span>
            <Button size="sm" className="bg-[#1E293B] text-white hover:bg-orange-500 hover:text-white transition-colors h-8 rounded-lg px-3">
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#1E293B] bg-[#0B0F19] py-8 mt-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-orange-500 text-white font-bold text-xs">P</div>
          <span className="font-semibold text-slate-200">PUBG Account Manager</span>
        </div>
        <p>© 2025 PUBG Account Manager. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-orange-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-orange-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-orange-400 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
}

export function HybridDarkOrange() {
  return (
    <div className="min-h-screen bg-[#0B0F19] font-['Outfit'] selection:bg-orange-500/30 selection:text-orange-200">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb / Slim Hero Area */}
        <div className="mb-8">
          <div className="flex items-center text-xs text-slate-400 mb-4">
            <a href="#" className="hover:text-orange-400">Home</a>
            <span className="mx-2">/</span>
            <span className="text-slate-200">Marketplace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Buy Verified PUBG Mobile Accounts</h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">Browse the largest marketplace for safe and secure PUBG accounts in Pakistan. Instant delivery and 100% money-back guarantee.</p>
        </div>

        {/* Popular Tags */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-2">Popular:</span>
          {POPULAR_TAGS.map((tag) => (
            <Badge key={tag} variant="outline" className="shrink-0 bg-[#11151E] hover:bg-[#1E293B] border-[#1E293B] text-slate-300 font-medium py-1.5 px-3 cursor-pointer rounded-full transition-colors">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <Sidebar />

          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-[#11151E] p-3 sm:p-4 rounded-xl border border-[#1E293B]">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input 
                  placeholder="Search accounts..." 
                  className="pl-9 bg-[#0B0F19] border-[#1E293B] text-slate-200 h-10 focus-visible:ring-orange-500 w-full"
                />
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-sm text-slate-400 font-medium"><span className="text-white">1,248</span> Results</span>
                <div className="flex items-center gap-2">
                  <Select defaultValue="newest">
                    <SelectTrigger className="w-[140px] h-10 bg-[#0B0F19] border-[#1E293B] text-slate-200 focus:ring-orange-500">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#11151E] border-[#1E293B] text-slate-200">
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="hidden sm:flex items-center border border-[#1E293B] rounded-md bg-[#0B0F19] p-0.5">
                    <button className="p-1.5 rounded text-white bg-[#1E293B] shadow-sm"><LayoutGrid className="h-4 w-4" /></button>
                    <button className="p-1.5 rounded text-slate-500 hover:text-slate-300"><List className="h-4 w-4" /></button>
                  </div>
                  <Button variant="outline" size="icon" className="sm:hidden h-10 w-10 bg-[#0B0F19] border-[#1E293B] text-slate-200">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
              {MOCK_DATA.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-12 flex flex-col items-center justify-center gap-4">
              <Button variant="outline" className="w-full sm:w-auto min-w-[200px] border-orange-500/50 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white font-semibold h-12 rounded-xl transition-all">
                Load More Accounts
              </Button>
              <span className="text-xs text-slate-500">Showing 10 of 1,248</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
