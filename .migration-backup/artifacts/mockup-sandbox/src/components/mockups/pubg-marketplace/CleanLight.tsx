import React, { useState } from "react";
import {
  ShieldCheck,
  Star,
  Zap,
  Heart,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Filter,
  Menu,
  ChevronRight,
  List,
  Grid
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ACCOUNTS = [
  { id: "#PMG-2451", title: "M416 Glacier Max + Mummy X-Suit Bundle", price: "Rs 45,000", seller: "PMG_Official", rating: "4.9", reviews: "2,341", instant: true, featured: true, imageText: "M416 GLACIER MAX", bg: "bg-gradient-to-br from-cyan-400 to-blue-600" },
  { id: "#PMG-1832", title: "Pharaoh X-Suit + Conqueror Tier", price: "Rs 38,500", seller: "ProAccts_PK", rating: "4.8", reviews: "1,872", instant: true, featured: false, imageText: "PHARAOH X-SUIT", bg: "bg-gradient-to-br from-amber-300 to-orange-500" },
  { id: "#PMG-9241", title: "AKM Wanderer + Avenger Set", price: "Rs 18,200", seller: "GamerVault", rating: "4.7", reviews: "956", instant: false, delivery: "Within 1h", featured: false, imageText: "AKM WANDERER", bg: "bg-gradient-to-br from-red-400 to-rose-600" },
  { id: "#PMG-4482", title: "Mythic Glacier M24 + Car Skin", price: "Rs 27,000", seller: "PUBG_Pro_KHI", rating: "4.9", reviews: "3,108", instant: true, featured: false, hot: true, imageText: "M24 GLACIER", bg: "bg-gradient-to-br from-blue-300 to-indigo-600" },
  { id: "#PMG-5129", title: "Ace Tier Account Lvl 75 — Rare Outfits", price: "Rs 12,500", seller: "AccountHaven", rating: "4.6", reviews: "412", instant: false, delivery: "Within 24h", featured: false, imageText: "ACE TIER LVL 75", bg: "bg-gradient-to-br from-emerald-400 to-teal-600" },
  { id: "#PMG-2210", title: "Mummy X-Suit Set + Glacier UMP", price: "Rs 33,000", seller: "PMG_Official", rating: "4.9", reviews: "2,341", instant: true, featured: false, imageText: "MUMMY X-SUIT", bg: "bg-gradient-to-br from-yellow-200 to-yellow-500" },
  { id: "#PMG-8834", title: "Helmet Mythic + AKM Glacier", price: "Rs 22,000", seller: "ElitePubgPK", rating: "4.5", reviews: "288", instant: false, delivery: "Within 1h", featured: false, imageText: "AKM GLACIER", bg: "bg-gradient-to-br from-sky-400 to-cyan-600" },
  { id: "#PMG-1193", title: "Conqueror Lvl 80 — Full Loadout", price: "Rs 56,000", seller: "TopTierShop", rating: "5.0", reviews: "174", instant: true, featured: true, imageText: "CONQUEROR LVL 80", bg: "bg-gradient-to-br from-fuchsia-500 to-purple-700" },
  { id: "#PMG-7621", title: "M762 Pharaoh + Mythic Pan", price: "Rs 19,800", seller: "GamerVault", rating: "4.7", reviews: "956", instant: false, delivery: "Within 1h", featured: false, imageText: "M762 PHARAOH", bg: "bg-gradient-to-br from-orange-400 to-red-500" },
  { id: "#PMG-3394", title: "Crown Tier Lvl 65 — Starter Skins", price: "Rs 7,500", seller: "AccountHaven", rating: "4.6", reviews: "412", instant: false, delivery: "Within 24h", featured: false, imageText: "CROWN TIER LVL 65", bg: "bg-gradient-to-br from-slate-400 to-gray-600" },
];

const SEARCH_CHIPS = [
  "Glacier M416", "Mummy X-Suit", "AKM Wanderer", "Mythic Outfit", "Conqueror Tier", "Car Skin", "M24 Glacier", "Pharaoh X-Suit"
];

function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="font-bold text-xl tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            PUBG Account Manager
          </div>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="text-blue-600">Marketplace</a>
            <a href="#" className="hover:text-slate-900">How it Works</a>
            <a href="#" className="hover:text-slate-900">Sell</a>
            <a href="#" className="hover:text-slate-900">Support</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden sm:inline-flex text-slate-600 hover:text-slate-900 font-medium">
            Sign In
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
            Sign Up
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <div className="w-64 shrink-0 hidden md:block space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Price Range (PKR)</h3>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="Min" className="h-9 text-sm" />
          <span className="text-slate-400">-</span>
          <Input type="number" placeholder="Max" className="h-9 text-sm" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Delivery Time</h3>
        <div className="space-y-2.5">
          {["Instant", "Within 1 hour", "Within 24h"].map((item) => (
            <div key={item} className="flex items-center space-x-2">
              <Checkbox id={`del-${item}`} />
              <label htmlFor={`del-${item}`} className="text-sm text-slate-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {item}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Skin Rarity</h3>
        <div className="space-y-2.5">
          {["Mythic", "Legendary", "Epic", "Rare"].map((item) => (
            <div key={item} className="flex items-center space-x-2">
              <Checkbox id={`rarity-${item}`} />
              <label htmlFor={`rarity-${item}`} className="text-sm text-slate-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {item}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Tier</h3>
        <div className="space-y-2.5">
          {["Conqueror", "Ace", "Crown", "Diamond"].map((item) => (
            <div key={item} className="flex items-center space-x-2">
              <Checkbox id={`tier-${item}`} />
              <label htmlFor={`tier-${item}`} className="text-sm text-slate-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {item}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Server</h3>
        <div className="space-y-2.5">
          {["Asia", "Europe", "NA", "KRJP"].map((item) => (
            <div key={item} className="flex items-center space-x-2">
              <Checkbox id={`server-${item}`} />
              <label htmlFor={`server-${item}`} className="text-sm text-slate-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {item}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-4 pt-2 border-t border-slate-200">
        <div className="flex items-center space-x-2">
          <Checkbox id="verified-only" defaultChecked />
          <label htmlFor="verified-only" className="text-sm font-medium text-slate-900 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Verified Accounts Only
          </label>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: typeof ACCOUNTS[0] }) {
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col h-full">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className={`absolute inset-0 flex items-center justify-center ${account.bg} p-4 text-center group-hover:scale-105 transition-transform duration-500`}>
          <span className="font-black text-white text-xl sm:text-2xl drop-shadow-md tracking-tight leading-tight">
            {account.imageText}
          </span>
        </div>
        
        {/* Badges overlays */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {account.featured && (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold border-none shadow-sm text-[10px] px-2 py-0">
              FEATURED
            </Badge>
          )}
          {account.hot && (
            <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold border-none shadow-sm text-[10px] px-2 py-0">
              HOT
            </Badge>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <button 
            onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-slate-400 hover:text-rose-500 hover:scale-110 transition-all shadow-sm"
          >
            <Heart className={`w-4 h-4 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        </div>
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded-md border border-white/10">
            {account.id}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2 text-sm">
            {account.title}
          </h3>
        </div>

        {/* Seller Info */}
        <div className="flex items-center gap-2 mt-auto mb-3">
          <Avatar className="w-5 h-5 border border-slate-200">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-[9px] font-bold">
              {account.seller.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-slate-700 leading-none flex items-center gap-1">
              {account.seller}
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
            </span>
            <div className="flex items-center text-[10px] text-slate-500 mt-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
              <span className="font-medium text-slate-700">{account.rating}</span>
              <span className="ml-1">({account.reviews})</span>
            </div>
          </div>
        </div>

        {/* Price & Delivery */}
        <div className="pt-3 border-t border-slate-100 flex items-end justify-between mt-auto">
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Price</div>
            <div className="text-lg font-bold text-slate-900 tracking-tight">{account.price}</div>
          </div>
          <div className="flex flex-col items-end">
            {account.instant ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                <Zap className="w-3 h-3 fill-blue-600" /> INSTANT
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {account.delivery}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-12 py-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          PUBG Account Manager
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <a href="#" className="hover:text-slate-900">Terms of Service</a>
          <a href="#" className="hover:text-slate-900">Privacy Policy</a>
          <a href="#" className="hover:text-slate-900">Contact Us</a>
        </div>
        <div className="text-sm text-slate-400">
          © {new Date().getFullYear()} PUBG Account Manager. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export function CleanLight() {
  return (
    <div className="min-h-screen bg-slate-50 font-['Inter'] flex flex-col">
      <Header />
      
      {/* Breadcrumb / Slim Hero */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <a href="#" className="hover:text-slate-900">Home</a>
            <ChevronRight className="w-4 h-4" />
            <a href="#" className="hover:text-slate-900">PUBG Mobile</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-medium">Accounts for Sale</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Buy Verified PUBG Mobile Accounts
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Browse our marketplace of secure, admin-verified PUBG accounts with rare skins and instant delivery.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 flex gap-8">
        <Sidebar />
        
        <div className="flex-1 min-w-0">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by ID, title, or skin name..." 
                className="pl-9 bg-slate-50 border-slate-200 text-sm focus-visible:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <div className="text-sm font-medium text-slate-500 whitespace-nowrap">
                {ACCOUNTS.length} Results
              </div>
              <Select defaultValue="newest">
                <SelectTrigger className="w-[160px] h-9 text-sm bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest Listed</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>
              <div className="hidden sm:flex items-center gap-1 border border-slate-200 rounded-md p-1 bg-slate-50">
                <button className="p-1 rounded bg-white shadow-sm text-blue-600"><Grid className="w-4 h-4" /></button>
                <button className="p-1 rounded text-slate-400 hover:text-slate-600"><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Popular Tag Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Popular:</span>
            {SEARCH_CHIPS.map(chip => (
              <button key={chip} className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors whitespace-nowrap">
                {chip}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {ACCOUNTS.map(account => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>

          {/* Pagination / Load More */}
          <div className="mt-10 flex justify-center">
            <Button variant="outline" className="w-full sm:w-auto sm:px-12 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold shadow-sm">
              Load More Accounts
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
