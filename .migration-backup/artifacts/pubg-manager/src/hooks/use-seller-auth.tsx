import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface SellerUser {
  id: number;
  name: string;
  username?: string | null;
  email: string;
  phone?: string;
  whatsapp?: string | null;
  status: string;
  totalListings?: number;
  totalSold?: number;
  totalEarnings?: number;
}

interface SellerAuthContext {
  seller: SellerUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SellerAuthCtx = createContext<SellerAuthContext | undefined>(undefined);

export function SellerAuthProvider({ children }: { children: ReactNode }) {
  const [seller, setSeller] = useState<SellerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/seller/me", { credentials: "include" });
      if (res.ok) {
        setSeller(await res.json());
      } else {
        setSeller(null);
      }
    } catch {
      setSeller(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/seller/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
    await refresh();
  };

  const logout = async () => {
    await fetch("/api/seller/logout", { method: "POST", credentials: "include" });
    setSeller(null);
  };

  return (
    <SellerAuthCtx.Provider value={{ seller, isLoading, refresh, login, logout }}>
      {children}
    </SellerAuthCtx.Provider>
  );
}

export function useSellerAuth() {
  const ctx = useContext(SellerAuthCtx);
  if (!ctx) throw new Error("useSellerAuth must be used within SellerAuthProvider");
  return ctx;
}
