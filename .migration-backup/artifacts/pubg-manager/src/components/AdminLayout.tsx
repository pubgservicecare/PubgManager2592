import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Gamepad2, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  Store,
  Activity,
  BookOpen
} from "lucide-react";
import { useState, useEffect } from "react";
import { useGetDashboard } from "@workspace/api-client-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutConfirm = async () => {
    await logout();
    setShowLogoutConfirm(false);
  };
  
  const { data: stats } = useGetDashboard({
    query: { enabled: !!user?.authenticated, refetchInterval: 30000 } as any
  });

  useEffect(() => {
    if (!isLoading && (!user || !user.authenticated)) {
      setLocation("/admin/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user?.authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/accounts", label: "Accounts", icon: Gamepad2 },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/sellers", label: "Sellers", icon: Store },
    { 
      href: "/admin/chat", 
      label: "Live Chat", 
      icon: MessageSquare,
      badge: stats?.unreadChatsCount ? stats.unreadChatsCount : null
    },
    { href: "/admin/activity", label: "Activity Log", icon: Activity },
    { href: "/admin/docs", label: "Docs", icon: BookOpen },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="h-20 flex items-center px-6 border-b border-border/50">
          <Gamepad2 className="w-8 h-8 text-primary mr-3" />
          <h1 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            PUBG MANAGER
          </h1>
        </div>

        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                <div className={`
                  flex items-center px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
                  ${isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }
                `}>
                  <Icon className="w-5 h-5 mr-4" />
                  <span className="font-semibold">{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/50">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            data-testid="admin-logout-button"
          >
            <LogOut className="w-5 h-5 mr-4" />
            <span className="font-semibold">Logout Admin</span>
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Logout Admin"
        message="Kya aap waqai admin panel se logout karna chahte hain?"
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        busyLabel="Logging out..."
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-card/50 backdrop-blur-md border-b border-border/50 flex items-center px-6 sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-semibold text-muted-foreground">Admin Online</span>
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
