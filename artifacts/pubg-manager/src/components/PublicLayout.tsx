import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/api-url";
import {
  Gamepad2,
  ShoppingCart,
  MessageSquare,
  User,
  LogOut,
  LogIn,
  Menu,
  X,
  UserPlus,
  Store,
  Loader2,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  MessageCircle,
  MapPin,
  Mail,
} from "lucide-react";
import { useGetSettings } from "@workspace/api-client-react";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSellerAuth } from "@/hooks/use-seller-auth";
import { useState, useEffect } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { HelpCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: settings } = useGetSettings();
  const { customer, logout } = useCustomerAuth();
  const { seller, isLoading: sellerLoading, refresh: refreshSeller, logout: logoutSeller } = useSellerAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [becomingSeller, setBecomingSeller] = useState(false);
  const [becomingSellerError, setBecomingSellerError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutConfirm = async () => {
    // Destroy whichever session is active (customer takes priority; seller-only uses seller logout)
    if (customer) {
      await logout();
      await refreshSeller(); // session destroyed, seller state should now be 401
    } else {
      await logoutSeller();
    }
    setShowLogoutConfirm(false);
    setMobileOpen(false);
    setLocation("/");
  };

  const handleBecomeSeller = async () => {
    if (becomingSeller) return;
    setBecomingSeller(true);
    try {
      const res = await fetch(apiUrl("/api/customer/become-seller"), {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (data.linked) {
        await refreshSeller();
        setMobileOpen(false);
        setLocation("/seller/dashboard");
        return;
      }
      if (data.status === "none" || !data.status) {
        setMobileOpen(false);
        setLocation("/seller/signup");
        return;
      }
      // Pending/rejected/suspended — surface to the user
      setBecomingSellerError(data.message || "Your seller account is unavailable right now.");
    } catch {
      setBecomingSellerError("Something went wrong. Please try again.");
    } finally {
      setBecomingSeller(false);
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Lock body scroll when mobile menu is open.
  // iOS Safari ignores overflow:hidden on body — must use position:fixed
  // with the current scroll offset saved so we can restore it on close.
  useEffect(() => {
    if (!mobileOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  const navItems = customer
    ? [
        { href: "/", label: "Marketplace", icon: ShoppingCart, active: location === "/" },
        { href: "/my", label: "My Account", icon: User, active: location === "/my" },
        { href: "/chat", label: "Live Chat", icon: MessageSquare, active: location.startsWith("/chat") },
        { href: "/faq", label: "Help / FAQ", icon: HelpCircle, active: location === "/faq" },
      ]
    : [
        { href: "/", label: "Marketplace", icon: ShoppingCart, active: location === "/" },
        { href: "/chat/guest", label: "Live Chat", icon: MessageSquare, active: location.startsWith("/chat") },
        { href: "/faq", label: "Help / FAQ", icon: HelpCircle, active: location === "/faq" },
      ];

  const logoUrl = (settings as any)?.logoUrl as string | undefined;
  const bannerEnabled = (settings as any)?.bannerEnabled as boolean | undefined;
  const bannerText = (settings as any)?.bannerText as string | undefined;
  const socials = [
    { url: (settings as any)?.facebookUrl, icon: Facebook, label: "Facebook" },
    { url: (settings as any)?.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: (settings as any)?.youtubeUrl, icon: Youtube, label: "YouTube" },
    { url: (settings as any)?.tiktokUrl, icon: Music2, label: "TikTok" },
    { url: (settings as any)?.discordUrl, icon: MessageCircle, label: "Discord" },
  ].filter((s): s is { url: string; icon: any; label: string } => !!s.url);
  const businessAddress = (settings as any)?.businessAddress as string | undefined;
  const supportEmail = (settings as any)?.supportEmail as string | undefined;
  const footerText = (settings as any)?.footerText as string | undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Promo Banner */}
      {bannerEnabled && bannerText && (
        <div className="bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground text-center text-xs sm:text-sm font-bold py-2 px-4 relative overflow-hidden">
          <div className="max-w-7xl mx-auto truncate">{bannerText}</div>
        </div>
      )}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/50">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0">
              {logoUrl ? (
                <img
                  src={`/api/storage${logoUrl}`}
                  alt={settings?.siteName || "Logo"}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform shrink-0"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform shrink-0">
                  <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
              )}
              <h1 className="text-lg sm:text-2xl font-display font-bold tracking-wider sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 truncate">
                {settings?.siteName || "PUBG MARKET"}
              </h1>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3">
            <Link href="/">
              <div className={`flex items-center gap-2 font-semibold transition-colors cursor-pointer px-2 ${location === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm">MARKETPLACE</span>
              </div>
            </Link>

            {!sellerLoading && seller ? (
              <Link href="/seller/dashboard">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer font-semibold text-sm">
                  <Store className="w-4 h-4" />
                  <span>SELLER PANEL</span>
                </div>
              </Link>
            ) : customer ? (
              <button
                type="button"
                onClick={handleBecomeSeller}
                disabled={becomingSeller}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-300 hover:text-white border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer font-semibold text-sm disabled:opacity-60"
                data-testid="become-seller-btn"
              >
                {becomingSeller ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Store className="w-4 h-4" />
                )}
                <span>BECOME A SELLER</span>
              </button>
            ) : null}
            {customer ? (
              <>
                <NotificationBell />
                <Link href="/my">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer font-semibold text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span>MY ACCOUNT</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-white font-semibold max-w-[120px] truncate">{customer.name}</span>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Logout"
                    data-testid="header-logout-button"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : seller ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-sm">
                <Store className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-semibold max-w-[120px] truncate">{seller.name}</span>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Logout"
                  data-testid="seller-header-logout-button"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link href="/chat/guest">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-white border border-border hover:border-border/80 transition-all cursor-pointer font-semibold text-sm">
                    <MessageSquare className="w-4 h-4" />
                    <span>SUPPORT</span>
                  </div>
                </Link>
                <Link href="/login">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all cursor-pointer font-bold text-sm">
                    <LogIn className="w-4 h-4" />
                    <span>LOGIN</span>
                  </div>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile: avatar/cta + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {customer && <NotificationBell />}
            {!customer && !seller && (
              <Link href="/login">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>LOGIN</span>
                </div>
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-white hover:bg-secondary transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          ></div>
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-white tracking-wider">MENU</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-secondary"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User pill */}
            {customer && (
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-lg">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{customer.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Nav items */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold cursor-pointer transition-colors ${
                      item.active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-white"
                    }`}>
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="p-3 border-t border-border space-y-2">
              {customer || seller ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 font-bold transition-colors"
                  data-testid="mobile-logout-button"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <>
                  <Link href="/login">
                    <div className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-border text-white hover:bg-secondary font-bold cursor-pointer transition-colors">
                      <LogIn className="w-4 h-4" />
                      Login
                    </div>
                  </Link>
                  <Link href="/signup">
                    <div className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer transition-all">
                      <UserPlus className="w-4 h-4" />
                      Sign Up
                    </div>
                  </Link>
                </>
              )}
              {!sellerLoading && seller ? (
                <Link href="/seller/dashboard">
                  <div className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold cursor-pointer transition-colors hover:bg-emerald-500 hover:text-white">
                    <Store className="w-4 h-4" />
                    Seller Panel
                  </div>
                </Link>
              ) : customer ? (
                <>
                  <button
                    type="button"
                    onClick={handleBecomeSeller}
                    disabled={becomingSeller}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 font-bold transition-colors disabled:opacity-60"
                    data-testid="become-seller-btn-mobile"
                  >
                    {becomingSeller ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                    Become a Seller
                  </button>
                  {becomingSellerError && (
                    <p className="text-xs text-destructive text-center px-2">{becomingSellerError}</p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="bg-gradient-to-b from-card to-background border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/">
                    <span className="text-muted-foreground hover:text-primary cursor-pointer transition-colors">Marketplace</span>
                  </Link>
                </li>
                <li>
                  <Link href="/faq">
                    <span className="text-muted-foreground hover:text-primary cursor-pointer transition-colors">FAQ / Help</span>
                  </Link>
                </li>
                <li>
                  <Link href="/chat/guest">
                    <span className="text-muted-foreground hover:text-primary cursor-pointer transition-colors">Contact Support</span>
                  </Link>
                </li>
                <li>
                  <Link href="/seller/signup">
                    <span className="text-muted-foreground hover:text-primary cursor-pointer transition-colors">Become a Seller</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
                Get in Touch
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {supportEmail && (
                  <li className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <a href={`mailto:${supportEmail}`} className="hover:text-white transition-colors break-all">
                      {supportEmail}
                    </a>
                  </li>
                )}
                {settings?.whatsappNumber && (
                  <li className="flex items-start gap-2.5">
                    <MessageCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {settings.whatsappNumber}
                    </a>
                  </li>
                )}
                {businessAddress && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <span>{businessAddress}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Follow Us */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
                Follow Us
              </h4>
              {socials.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {socials.map((s) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.label}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={s.label}
                        title={s.label}
                        className="w-10 h-10 rounded-lg bg-secondary/60 border border-border hover:bg-primary hover:border-primary hover:text-primary-foreground text-muted-foreground flex items-center justify-center transition-all hover:-translate-y-0.5"
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Stay tuned — social links coming soon.
                </p>
              )}
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
            {footerText || `© ${new Date().getFullYear()} ${settings?.siteName || "PUBG Account Manager"} — All rights reserved.`}
          </div>
        </div>
      </footer>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Logout Confirm"
        message="Kya aap waqai logout karna chahte hain? Aapko dobara login karna hoga."
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        busyLabel="Logging out..."
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
