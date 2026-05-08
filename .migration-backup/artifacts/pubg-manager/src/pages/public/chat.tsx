import { PublicLayout } from "@/components/PublicLayout";
import { useGetChatMessages, useSendChatMessage } from "@workspace/api-client-react";
import { useRoute, useLocation, Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Send, User, MessageSquare, LogIn, ArrowLeft, X } from "lucide-react";
import { formatDateTime } from "@/lib/helpers";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSEO } from "@/hooks/use-seo";

export function PublicChat() {
  const [, params] = useRoute("/chat/:sessionId");
  const [, setLocation] = useLocation();
  const { customer, isLoading: authLoading } = useCustomerAuth();

  useSEO({ title: "Live Chat Support", description: "Chat with our support team for any questions about PUBG accounts." });

  const sessionId = customer
    ? `customer-${customer.id}`
    : (params?.sessionId || "guest");

  const [guestName, setGuestName] = useState(() => localStorage.getItem("guestName") || "");
  const [isNameSet, setIsNameSet] = useState(false);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customer) {
      setIsNameSet(true);
    } else if (guestName) {
      setIsNameSet(true);
    }
  }, [customer, guestName]);

  const { data: messages = [], refetch } = useGetChatMessages(sessionId, {
    query: { enabled: isNameSet, refetchInterval: 3000 } as any
  });

  const sendMutation = useSendChatMessage({
    mutation: {
      onSuccess: () => {
        setMessage("");
        refetch();
      }
    }
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

    const urlParams = new URLSearchParams(window.location.search);
    const accountId = urlParams.get("accountId");
    const displayName = customer ? customer.name : guestName;

    sendMutation.mutate({
      sessionId,
      data: {
        message,
        sender: "customer",
        guestName: displayName,
        accountId: accountId ? parseInt(accountId) : null
      }
    });
  };

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
        </div>
      </PublicLayout>
    );
  }

  if (!isNameSet && !customer) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-border shadow-2xl">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6">
              <User className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-center text-white mb-2">Welcome to Support</h2>
            <p className="text-center text-muted-foreground mb-5 sm:mb-6 text-sm sm:text-base">Sign in for a better experience, or continue as a guest.</p>

            <div className="flex gap-3 mb-5 sm:mb-6">
              <Link href="/login" className="flex-1">
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all cursor-pointer">
                  <LogIn className="w-4 h-4" />
                  Login
                </div>
              </Link>
              <Link href="/signup" className="flex-1">
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-white border border-border font-bold text-sm transition-all cursor-pointer">
                  Sign Up
                </div>
              </Link>
            </div>

            <div className="relative flex items-center gap-3 mb-5 sm:mb-6">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase">or continue as guest</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <form onSubmit={handleSetName} className="space-y-3">
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none transition-colors"
                required
              />
              <button
                type="submit"
                className="w-full bg-secondary hover:bg-secondary/80 border border-border text-white font-bold py-3 rounded-xl transition-all active:scale-95"
              >
                Continue as Guest
              </button>
            </form>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const displayName = customer ? customer.name : guestName;

  return (
    <PublicLayout>
      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto sm:px-4 sm:py-6">
        <div className="flex-1 flex flex-col bg-card sm:rounded-2xl sm:border sm:border-border sm:shadow-xl overflow-hidden h-[calc(100dvh-64px)] sm:h-[calc(100dvh-180px)]">
          {/* Header */}
          <div className="px-3 sm:px-4 py-3 bg-secondary border-b border-border flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setLocation(customer ? "/my" : "/")}
                className="p-2 -ml-1 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                A
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white truncate">Admin Support</h3>
                <p className="text-[10px] sm:text-xs text-green-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="truncate">Replies instantly</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium text-white max-w-[100px] truncate">{displayName}</span>
                {customer && <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full">Member</span>}
              </div>
              <button
                onClick={() => setLocation(customer ? "/my" : "/")}
                className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-background/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground px-4 text-center">
                <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-20" />
                <p className="text-sm sm:text-base">Send a message to start the conversation.</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender === "customer";
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-secondary text-white rounded-tl-sm border border-border'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm sm:text-base break-words">{msg.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 font-medium px-1">
                      {formatDateTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 bg-secondary border-t border-border shrink-0">
            <form onSubmit={handleSend} className="flex gap-2 sm:gap-3">
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message…"
                className="flex-1 bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none transition-colors text-sm sm:text-base min-w-0"
                disabled={sendMutation.isPending}
              />
              <button
                type="submit"
                disabled={!message.trim() || sendMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:hover:bg-primary w-12 sm:w-14 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
                aria-label="Send"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
