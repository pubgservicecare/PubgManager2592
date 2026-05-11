import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/api-url";
import { PublicLayout } from "@/components/PublicLayout";
import { useSEO } from "@/hooks/use-seo";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSellerAuth } from "@/hooks/use-seller-auth";
import { Gamepad2, AtSign, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export function UnifiedLogin() {
  useSEO({
    title: "Login",
    description: "Login with your phone or email to access PUBG Account Manager.",
  });

  const [, setLocation] = useLocation();
  const { customer, refresh: refreshCustomer } = useCustomerAuth();
  const { refresh: refreshSeller } = useSellerAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in as customer, bounce to marketplace.
  useEffect(() => {
    if (customer) setLocation("/");
  }, [customer, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login failed");
      // Refresh both auth contexts
      await Promise.all([refreshCustomer(), refreshSeller()]);
      if (data.role === "seller") setLocation("/seller/dashboard");
      else setLocation("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 bg-primary/15">
              <Gamepad2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider">
              Login
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Use your phone or email to sign in
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Phone or Email
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    required
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="03001234567 or you@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    data-testid="login-identifier"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    required
                    type={showPw ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold py-3 rounded-xl transition-colors mt-2 disabled:opacity-60 bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="login-submit"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link href="/signup" className="font-bold hover:underline text-primary">
                Sign up
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              <Link href="/" className="text-muted-foreground hover:text-white">← Back to Marketplace</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
}

export function CustomerLoginPage() {
  return <UnifiedLogin />;
}

export function SellerLoginPage() {
  return <UnifiedLogin />;
}
