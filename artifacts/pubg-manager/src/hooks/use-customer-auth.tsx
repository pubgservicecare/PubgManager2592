import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiUrl } from "@/lib/api-url";

export interface CustomerUser {
  id: number;
  phone: string | null;
  name: string;
  customerId: number;
  referralCode?: string | null;
  email?: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  authProvider?: string;
}

interface CustomerAuthContext {
  customer: CustomerUser | null;
  isLoading: boolean;
  googleClientId: string | null;
  refresh: () => Promise<void>;
  signup: (name: string, phone: string, password: string, referralCode?: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  setPassword: (password: string, currentPassword?: string) => Promise<void>;
}

const CustomerAuthCtx = createContext<CustomerAuthContext | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/customer/me"), { credentials: "include" });
      setCustomer(res.ok ? await res.json() : null);
    } catch {
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      refresh(),
      fetch(apiUrl("/api/auth/config"))
        .then((r) => r.json())
        .then((d) => {
          if (d?.googleClientId) setGoogleClientId(d.googleClientId);
        })
        .catch(() => {}),
    ]).finally(() => setIsLoading(false));
  }, [refresh]);

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

  const loginWithGoogle = async (credential: string) => {
    const res = await fetch(apiUrl("/api/auth/google/callback"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Google sign-in failed");
    }
    await refresh();
  };

  const setPassword = async (password: string, currentPassword?: string) => {
    const res = await fetch(apiUrl("/api/customer/set-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newPassword: password, currentPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to set password");
    }
    await refresh();
  };

  return (
    <CustomerAuthCtx.Provider
      value={{
        customer,
        isLoading,
        googleClientId,
        refresh,
        signup,
        login,
        logout,
        loginWithGoogle,
        setPassword,
      }}
    >
      {children}
    </CustomerAuthCtx.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthCtx);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
