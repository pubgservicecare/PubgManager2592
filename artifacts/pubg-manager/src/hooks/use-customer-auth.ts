import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiUrl } from "@/lib/api-url";

interface CustomerUser {
  id: number;
  phone: string | null;
  email: string | null;
  name: string;
  customerId: number;
  referralCode?: string | null;
  hasPassword?: boolean;
  hasGoogle?: boolean;
}

interface CustomerAuthContext {
  customer: CustomerUser | null;
  isLoading: boolean;
  googleClientId: string | null;
  refresh: () => Promise<void>;
  signup: (name: string, phone: string, password: string, referralCode?: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<{ isNewAccount: boolean }>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  setPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CustomerAuthCtx = createContext<CustomerAuthContext | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

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
    fetch(apiUrl("/api/auth/config"))
      .then((r) => r.json())
      .then((d) => setGoogleClientId(d.googleClientId || null))
      .catch(() => {});
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

  const loginWithGoogle = async (credential: string): Promise<{ isNewAccount: boolean }> => {
    const res = await fetch(apiUrl("/api/auth/google/callback"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Google login failed");
    }
    const data = await res.json();
    setCustomer(data);
    return { isNewAccount: data.isNewAccount ?? false };
  };

  const loginWithEmail = async (email: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier: email.trim(), password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Login failed");
    }
    const data = await res.json();
    if (data.role === "customer" && data.user) {
      setCustomer(data.user);
    } else {
      throw new Error("This email belongs to a seller account. Please use the seller login.");
    }
  };

  const setPassword = async (newPassword: string, currentPassword?: string) => {
    const res = await fetch(apiUrl("/api/customer/set-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newPassword, currentPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Failed to set password");
    }
    await refresh();
  };

  const logout = async () => {
    await fetch(apiUrl("/api/customer/logout"), { method: "POST", credentials: "include" });
    setCustomer(null);
  };

  return React.createElement(
    CustomerAuthCtx.Provider,
    {
      value: {
        customer,
        isLoading,
        googleClientId,
        refresh,
        signup,
        login,
        loginWithGoogle,
        loginWithEmail,
        setPassword,
        logout,
      },
    },
    children,
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthCtx);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
