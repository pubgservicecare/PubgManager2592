import { useEffect, useRef, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { ArrowLeft, IdCard, Mail, Phone, MessageCircle, CheckCircle, XCircle, Ban, RefreshCw, Trash2, Loader2, Package, TrendingUp, DollarSign, Image as ImageIcon, Send, User as UserIcon, X, Calendar } from "lucide-react";
const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
import { formatCurrency, formatDateTime } from "@/lib/helpers";

interface Seller {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  cnicNumber: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  selfieUrl: string;
  status: string;
  rejectionReason: string | null;
  totalListings: number;
  totalSold: number;
  totalEarnings: number;
  approvedAt: string | null;
  createdAt: string;
  accounts?: number;
}

interface SellerDashboardData {
  stats: {
    totalListings: number;
    activeListings: number;
    underReviewListings: number;
    soldListings: number;
    totalRevenue: number;
    totalInvestment: number;
    netProfit: number;
  };
  accounts: Array<{
    id: number;
    title: string;
    accountId: string;
    purchasePrice: number | null;
    priceForSale: number;
    finalSoldPrice: number | null;
    status: string;
    imageUrls: string[];
    customerName: string | null;
    createdAt: string;
  }>;
}

export function AdminSellerDetail() {
  const [, params] = useRoute("/admin/sellers/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id, 10) : null;
  const [seller, setSeller] = useState<Seller | null>(null);
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sRes, dRes] = await Promise.all([
        fetch(`/api/admin/sellers/${id}`, { credentials: "include" }),
        fetch(`/api/admin/sellers/${id}/dashboard`, { credentials: "include" }),
      ]);
      if (!sRes.ok) {
        setSeller(null);
        return;
      }
      setSeller(await sRes.json());
      if (dRes.ok) setDashboard(await dRes.json());
      else setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const action = async (path: string, body?: any) => {
    if (!id) return;
    setActioning(true);
    try {
      await fetch(`/api/admin/sellers/${id}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      await load();
    } finally {
      setActioning(false);
    }
  };

  const approve = () => action("approve");
  const reject = () => {
    const reason = prompt("Reason for rejection?");
    if (reason === null) return;
    action("reject", { reason });
  };
  const suspend = () => {
    const reason = prompt("Reason for suspension?");
    if (reason === null) return;
    action("suspend", { reason });
  };
  const reinstate = () => action("reinstate");

  const remove = async () => {
    if (!id) return;
    if (!confirm("Permanently delete this seller? This cannot be undone.")) return;
    await fetch(`/api/admin/sellers/${id}`, { method: "DELETE", credentials: "include" });
    setLocation("/admin/sellers");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      </AdminLayout>
    );
  }

  if (!seller) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-muted-foreground">Seller not found</div>
      </AdminLayout>
    );
  }

  const objectUrl = (path: string) => `/api/storage${path}`;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Link href="/admin/sellers">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm font-semibold mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Sellers
          </button>
        </Link>

        {/* Header: avatar + name + status + admin actions */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-black text-2xl shrink-0">
              {seller.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-white truncate">{seller.name}</h1>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border shrink-0 ${
                  seller.status === "pending" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                  seller.status === "approved" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                  seller.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" :
                  "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                }`}>
                  {seller.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Joined {new Date(seller.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {seller.rejectionReason && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 text-sm text-destructive">
              <strong>Reason:</strong> {seller.rejectionReason}
            </div>
          )}

          {/* Compact action chips — WhatsApp, Chat, Personal Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <ActionTile
              icon={SiWhatsapp}
              label="WhatsApp"
              color="emerald"
              disabled={!seller.whatsapp}
              href={seller.whatsapp ? `https://wa.me/${(seller.whatsapp || "").replace(/\D/g, "")}` : undefined}
              external
            />
            <ActionTile
              icon={MessageCircle}
              label="Live Chat"
              color="primary"
              onClick={() => {
                setShowChat(true);
                setTimeout(() => chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
              }}
            />
            <ActionTile
              icon={UserIcon}
              label="Personal Info"
              color="amber"
              onClick={() => setShowInfoModal(true)}
            />
          </div>

          {/* Admin moderation buttons (compact) */}
          <div className="flex flex-wrap gap-2">
            {seller.status === "pending" && (
              <>
                <ActionBtn onClick={approve} disabled={actioning} icon={CheckCircle} label="Approve" color="emerald" />
                <ActionBtn onClick={reject} disabled={actioning} icon={XCircle} label="Reject" color="destructive" />
              </>
            )}
            {seller.status === "approved" && (
              <ActionBtn onClick={suspend} disabled={actioning} icon={Ban} label="Suspend" color="amber" />
            )}
            {(seller.status === "rejected" || seller.status === "suspended") && (
              <ActionBtn onClick={reinstate} disabled={actioning} icon={RefreshCw} label="Approve / Reinstate" color="emerald" />
            )}
            <ActionBtn onClick={remove} disabled={actioning} icon={Trash2} label="Delete" color="destructive" outline />
          </div>
        </div>

        {/* Per-seller dashboard (stats + accounts) */}
        {dashboard && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-4">
            <h2 className="text-lg font-display font-bold text-white tracking-wider mb-4">SELLER ACCOUNTS</h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <DashStat icon={Package} label="Listings" value={dashboard.stats.totalListings} sub={`${dashboard.stats.activeListings} active · ${dashboard.stats.underReviewListings} pending`} color="primary" />
              <DashStat icon={DollarSign} label="Investment" value={formatCurrency(dashboard.stats.totalInvestment)} color="amber" />
              <DashStat icon={TrendingUp} label="Revenue" value={formatCurrency(dashboard.stats.totalRevenue)} sub={`${dashboard.stats.soldListings} sold`} color="blue" />
              <DashStat icon={DollarSign} label="Net Profit" value={formatCurrency(dashboard.stats.netProfit)} color={dashboard.stats.netProfit >= 0 ? "emerald" : "destructive"} />
            </div>

            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">Listings</h3>
            {dashboard.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center bg-secondary/20 rounded-xl">No listings yet from this seller.</p>
            ) : (
              <div className="space-y-2">
                {dashboard.accounts.map((a) => (
                  <Link key={a.id} href={`/admin/accounts/${a.id}`}>
                    <div className="bg-secondary/30 border border-border hover:border-primary/50 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {a.imageUrls?.[0] ? (
                          <img src={`/api/storage${a.imageUrls[0]}`} alt={a.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white truncate">{a.title}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            a.status === "active" ? "bg-emerald-500/15 text-emerald-300" :
                            a.status === "sold" || a.status === "installment" ? "bg-blue-500/15 text-blue-300" :
                            a.status === "under_review" ? "bg-sky-500/15 text-sky-300" :
                            "bg-amber-500/15 text-amber-300"
                          }`}>
                            {a.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">ID: {a.accountId}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px]">
                          {a.purchasePrice != null && (
                            <span className="text-muted-foreground">P: <span className="font-bold text-amber-300">{formatCurrency(a.purchasePrice)}</span></span>
                          )}
                          <span className="text-muted-foreground">S: <span className="font-bold text-primary">{formatCurrency(a.priceForSale)}</span></span>
                          {a.finalSoldPrice != null && (
                            <span className="text-muted-foreground">Sold: <span className="font-bold text-blue-300">{formatCurrency(a.finalSoldPrice)}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live chat with seller — collapsed by default; opens via the Chat tile */}
        {showChat && (
          <div ref={chatRef}>
            <SellerLiveChatPanel sellerId={seller.id} sellerName={seller.name} onClose={() => setShowChat(false)} />
          </div>
        )}

        {/* Personal Info Modal */}
        {showInfoModal && (
          <PersonalInfoModal
            seller={seller}
            objectUrl={objectUrl}
            onClose={() => setShowInfoModal(false)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function ActionTile({ icon: Icon, label, color, onClick, href, external, disabled }: any) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-emerald-300",
    primary: "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50 text-primary",
    amber: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 text-amber-300",
  };
  const cls = `inline-flex items-center gap-2 ${colors[color]} border rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`;
  const inner = (
    <>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </>
  );
  if (href && !disabled) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}

function PersonalInfoModal({ seller, objectUrl, onClose }: any) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 my-0 sm:my-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-display font-bold text-white tracking-wider">PERSONAL INFORMATION</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <InfoRow icon={UserIcon} label="Full Name" value={seller.name} />
          <InfoRow icon={Mail} label="Email" value={seller.email} href={`mailto:${seller.email}`} />
          <InfoRow icon={Phone} label="Phone" value={seller.phone} href={`tel:${seller.phone}`} />
          <InfoRow
            icon={SiWhatsapp}
            label="WhatsApp"
            value={seller.whatsapp || "—"}
            href={seller.whatsapp ? `https://wa.me/${(seller.whatsapp || "").replace(/\D/g, "")}` : undefined}
            external
            accent="emerald"
          />
          <InfoRow icon={IdCard} label="CNIC #" value={seller.cnicNumber} />
          <InfoRow icon={Calendar} label="Joined" value={new Date(seller.createdAt).toLocaleDateString()} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="Listings" value={seller.totalListings} />
          <Stat label="Sold" value={seller.totalSold} />
          <Stat label="Earnings" value={`Rs ${seller.totalEarnings.toLocaleString()}`} />
        </div>

        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-3">Verification Documents</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <DocCard label="CNIC Front" url={objectUrl(seller.cnicFrontUrl)} />
          <DocCard label="CNIC Back" url={objectUrl(seller.cnicBackUrl)} />
          <DocCard label="Selfie" url={objectUrl(seller.selfieUrl)} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, href, external, accent }: any) {
  const accentClasses: Record<string, string> = {
    emerald: "text-emerald-300 hover:text-emerald-200",
  };
  const valueCls = `text-sm truncate ${accent ? accentClasses[accent] : "text-white hover:text-primary"} ${href ? "underline-offset-2 hover:underline" : ""}`;
  const inner = (
    <div className={`flex items-center gap-3 bg-secondary/30 rounded-xl p-3 ${href ? "cursor-pointer hover:bg-secondary/50 transition-colors" : ""}`}>
      <Icon className={`w-4 h-4 shrink-0 ${accent === "emerald" ? "text-emerald-400" : "text-primary"}`} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
        <p className={valueCls}>{value}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        {inner}
      </a>
    );
  }
  return inner;
}

function Stat({ label, value }: any) {
  return (
    <div className="bg-secondary/30 rounded-xl p-3 text-center">
      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-display font-bold text-white">{value}</p>
    </div>
  );
}

function DashStat({ icon: Icon, label, value, sub, color }: any) {
  const colors: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 text-primary",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-300",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-300",
    destructive: "from-destructive/20 to-destructive/5 text-destructive",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.primary} border border-border rounded-2xl p-4`}>
      <Icon className="w-5 h-5 mb-2 opacity-80" />
      <p className="text-[10px] uppercase font-bold opacity-70 mb-0.5">{label}</p>
      <p className="font-display font-bold text-white text-lg leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ActionBtn({ onClick, disabled, icon: Icon, label, color, outline }: any) {
  const colors: Record<string, string> = {
    emerald: outline ? "border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" : "bg-emerald-500 hover:bg-emerald-600 text-white",
    destructive: outline ? "border border-destructive/40 text-destructive hover:bg-destructive/10" : "bg-destructive hover:bg-destructive/90 text-white",
    amber: outline ? "border border-amber-500/40 text-amber-300 hover:bg-amber-500/10" : "bg-amber-500 hover:bg-amber-600 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${colors[color]}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function DocCard({ label, url }: { label: string; url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-secondary/30 border border-border rounded-xl overflow-hidden hover:border-primary transition-all text-left"
      >
        <div className="aspect-video bg-background flex items-center justify-center overflow-hidden">
          <img src={url} alt={label} className="w-full h-full object-cover" />
        </div>
        <div className="p-3">
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="text-xs text-muted-foreground">Tap to view fullscreen</p>
        </div>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <img src={url} alt={label} className="max-w-full max-h-full object-contain" />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 bg-card text-white px-4 py-2 rounded-lg font-bold"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}

function SellerLiveChatPanel({ sellerId, sellerName, onClose }: { sellerId: number; sellerName: string; onClose?: () => void }) {
  const sessionId = `seller-${sellerId}`;
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; message: string; createdAt: string }>>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sender: "admin", message: msg, guestName: sellerName }),
      });
      if (res.ok) {
        setText("");
        await load();
      }
    } finally {
      setSending(false);
    }
  };

  const markRead = async () => {
    try {
      await fetch(`/api/chat/sessions/${sessionId}/read`, { method: "POST", credentials: "include" });
    } catch {}
  };

  useEffect(() => {
    markRead();
  }, [sessionId, messages.length]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-4">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-display font-bold text-white tracking-wider">LIVE CHAT WITH {sellerName.toUpperCase()}</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Direct line</span>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-white flex items-center justify-center transition"
              aria-label="Close chat"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="bg-secondary/20 border border-border rounded-xl p-3 h-64 overflow-y-auto space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No messages yet. Say hello to {sellerName}.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                m.sender === "admin"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-white border border-border"
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                <p className={`text-[10px] mt-1 ${m.sender === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${sellerName}...`}
          className="flex-1 bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none text-sm"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 rounded-xl flex items-center gap-2 disabled:opacity-50 transition"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
