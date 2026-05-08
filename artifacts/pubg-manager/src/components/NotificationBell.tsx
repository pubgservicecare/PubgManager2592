import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, X, Check } from "lucide-react";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

interface Notif {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { customer, refresh } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!customer) {
      setItems([]);
      setUnread(0);
      return;
    }
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const r = await fetch("/api/customer/notifications/unread-count", { credentials: "include" });
        if (!r.ok) {
          if (r.status === 401) refresh();
          return;
        }
        const data = await r.json();
        if (!cancelled) setUnread(data.count ?? 0);
      } catch {}
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [customer]);

  useEffect(() => {
    if (!open || !customer) return;
    fetch("/api/customer/notifications", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setItems(Array.isArray(data.items) ? data.items.map((n: any) => ({ ...n, isRead: n.read })) : []))
      .catch(() => {});
  }, [open, customer]);

  const markAllRead = async () => {
    await fetch("/api/customer/notifications/mark-all-read", {
      method: "POST",
      credentials: "include",
    });
    setUnread(0);
    setItems((xs) => xs.map((x) => ({ ...x, isRead: true })));
  };

  const handleClick = async (n: Notif) => {
    if (!n.isRead) {
      await fetch(`/api/customer/notifications/${n.id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) setLocation(n.link);
  };

  if (!customer) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-secondary/60 transition-colors"
        aria-label="Notifications"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-black flex items-center justify-center shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-bold text-white text-sm">Notifications</span>
              <div className="flex items-center gap-1">
                {items.some((x) => !x.isRead) && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-bold text-primary hover:text-white px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 text-muted-foreground hover:text-white rounded-md"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                items.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-border/40 hover:bg-secondary/40 transition-colors ${
                      !n.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm leading-tight">
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
