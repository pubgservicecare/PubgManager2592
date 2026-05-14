import { useGetChatMessages, useSendChatMessage, useGetAccount } from "@workspace/api-client-react";
import { useRoute, useLocation, Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  Send,
  User,
  LogIn,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  Gamepad2,
} from "lucide-react";
import { formatDateTime, formatCurrency } from "@/lib/helpers";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSEO } from "@/hooks/use-seo";

export function PublicChat() {
  const [, params] = useRoute("/chat/:sessionId");
  const [, setLocation] = useLocation();
  const { customer, isLoading: authLoading } = useCustomerAuth();

  useSEO({ title: "Live Chat", description: "Chat with our support team." });

  const urlParams = new URLSearchParams(window.location.search);
  const accountIdParam = urlParams.get("accountId");
  const accountId = accountIdParam ? parseInt(accountIdParam) : null;

  const { data: linkedAccount } = useGetAccount(accountId ?? 0, { public: true } as any, {
    query: { enabled: !!accountId && accountId > 0 },
  } as any);

  const sessionId = customer
    ? `customer-${customer.id}`
    : (params?.sessionId || "guest");

  const [guestName, setGuestName] = useState(() => localStorage.getItem("guestName") || "");
  const [isNameSet, setIsNameSet] = useState(false);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customer) setIsNameSet(true);
    else if (guestName) setIsNameSet(true);
  }, [customer, guestName]);

  const { data: messages = [], refetch } = useGetChatMessages(sessionId, {
    query: { enabled: isNameSet, refetchInterval: 3000 } as any,
  });

  const sendMutation = useSendChatMessage({
    mutation: {
      onSuccess: () => {
        setMessage("");
        refetch();
      },
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    localStorage.setItem("guestName", guestName);
    setIsNameSet(true);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const displayName = customer ? customer.name : guestName;
    sendMutation.mutate({
      sessionId,
      data: {
        message,
        sender: "customer",
        guestName: displayName,
        accountId: accountId ?? null,
      },
    });
  };

  const handleBack = () => {
    if (accountId) {
      setLocation(`/account/${accountId}`);
    } else if (customer) {
      setLocation("/my");
    } else {
      setLocation("/");
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#0B0F19] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isNameSet && !customer) {
    return (
      <div className="fixed inset-0 bg-[#0B0F19] flex flex-col">
        {/* Minimal header */}
        <div className="h-14 flex items-center px-4 border-b border-[#1E293B] shrink-0">
          <button
            onClick={handleBack}
            className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="ml-2 font-bold text-white text-sm">Live Chat</span>
        </div>

        {/* Account reference (if coming from an account page) */}
        {linkedAccount && (
          <AccountRefBanner account={linkedAccount} accountId={accountId!} />
        )}

        {/* Name / login gate */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#11151E] w-full max-w-md p-6 rounded-2xl border border-[#1E293B] shadow-2xl">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-5">
              <User className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-center text-white mb-1">Welcome to Support</h2>
            <p className="text-center text-slate-400 mb-5 text-sm">
              Sign in for a better experience, or continue as a guest.
            </p>

            <div className="flex gap-3 mb-5">
              <Link href="/login" className="flex-1">
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all cursor-pointer">
                  <LogIn className="w-4 h-4" />
                  Login
                </div>
              </Link>
              <Link href="/signup" className="flex-1">
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1E293B] hover:bg-[#263348] text-white border border-[#2d3a4f] font-bold text-sm transition-all cursor-pointer">
                  Sign Up
                </div>
              </Link>
            </div>

            <div className="relative flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#1E293B]" />
              <span className="text-[11px] text-slate-500 font-medium uppercase">or as guest</span>
              <div className="flex-1 h-px bg-[#1E293B]" />
            </div>

            <form onSubmit={handleSetName} className="space-y-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-[#0B0F19] border border-[#1E293B] focus:border-primary rounded-xl px-4 py-3 text-white outline-none transition-colors text-base"
                required
              />
              <button
                type="submit"
                className="w-full bg-[#1E293B] hover:bg-[#263348] border border-[#2d3a4f] text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
              >
                Continue as Guest
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const displayName = customer ? customer.name : guestName;

  return (
    <div className="fixed inset-0 bg-[#0B0F19] flex flex-col">
      {/* ── Chat Header ────────────────────────────────────────────── */}
      <div className="shrink-0 bg-[#11151E] border-b border-[#1E293B] px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-base shrink-0">
            A
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight">Admin Support</p>
            <p className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              Replies instantly
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#1E293B] rounded-full px-3 py-1.5 border border-[#2d3a4f]">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-white max-w-[80px] truncate">{displayName}</span>
            {customer && (
              <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full font-bold">
                Member
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Account Reference Card ──────────────────────────────────── */}
      {linkedAccount && (
        <AccountRefBanner account={linkedAccount} accountId={accountId!} />
      )}

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-[#0B0F19]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center px-4">
            <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender === "customer";
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-[#11151E] text-white rounded-tl-sm border border-[#1E293B]"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm break-words">{msg.message}</p>
                </div>
                <span className="text-[10px] text-slate-600 mt-1 font-medium px-1">
                  {formatDateTime(msg.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-[#11151E] border-t border-[#1E293B] px-3 py-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message…"
            className="flex-1 bg-[#0B0F19] border border-[#1E293B] focus:border-primary rounded-xl px-4 py-3 text-white outline-none transition-colors text-base min-w-0"
            disabled={sendMutation.isPending}
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 w-12 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function AccountRefBanner({
  account,
  accountId,
}: {
  account: any;
  accountId: number;
}) {
  const imgs: string[] = account.imageUrls ?? [];
  const thumb = imgs[0] ? `/api/storage${imgs[0]}` : null;

  return (
    <Link href={`/account/${accountId}`}>
      <div className="shrink-0 mx-3 my-2 flex items-center gap-3 bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-orange-500/15 transition-colors">
        {/* Thumbnail */}
        {thumb ? (
          <img
            src={thumb}
            alt={account.title}
            className="w-10 h-10 rounded-lg object-cover border border-[#1E293B] shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#1E293B] flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5 text-slate-500" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">
              Enquiring About
            </span>
          </div>
          <p className="text-sm font-bold text-white truncate leading-tight">{account.title}</p>
        </div>

        {/* Price */}
        <div className="shrink-0 text-right">
          <p className="text-base font-display font-black text-orange-400 leading-none">
            {formatCurrency(account.priceForSale)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">ID · {account.accountId}</p>
        </div>
      </div>
    </Link>
  );
}
