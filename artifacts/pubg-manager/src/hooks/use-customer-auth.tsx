import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiUrl } from "@/lib/api-url";

interface CustomerUser {
  id: number;
  phone: string;
  name: string;
  customerId: number;
  referralCode?: string | null;
}

interface CustomerAuthContext {
  customer: CustomerUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signup: (name: string, phone: string, password: string, referralCode?: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CustomerAuthCtx = createContext<CustomerAuthContext | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/customer/me"), { credentials: "include" });
      setCustomer(res.ok ? await res.json() : null);
    } catch {
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const signup = async (name: string, phone: string, password: string, referralCode?: string) => {
    const res = await fetch(apiUrl("/api/customer/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, phone, password, referralCode: referralCode || undefined }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Signup failed");
    }
    const data = await res.json();
    setCustomer(data);
  };

  const login = async (phone: string, password: string) => {
    const res = await fetch(apiUrl("/api/customer/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    setCustomer(data);
  };

  const logout = async () => {
    await fetch(apiUrl("/api/customer/logout"), { method: "POST", credentials: "include" });
    setCustomer(null);
  };

  return (
    <CustomerAuthCtx.Provider value={{ customer, isLoading, refresh, signup, login, logout }}>
      {children}
    </CustomerAuthCtx.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthCtx);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
