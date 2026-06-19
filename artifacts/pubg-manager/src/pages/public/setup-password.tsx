import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PublicLayout } from "@/components/PublicLayout";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSEO } from "@/hooks/use-seo";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export function SetupPasswordPage() {
  useSEO({ title: "Set Your Password", noindex: true });

  const { customer, isLoading, setPassword } = useCustomerAuth();
  const [, setLocation] = useLocation();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isLoading && !customer) setLocation("/login");
    if (!isLoading && customer?.hasPassword) setLocation("/my");
  }, [customer, isLoading, setLocation]);

  if (isLoading || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await setPassword(newPassword);
      setDone(true);
      setTimeout(() => setLocation("/my"), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to set password");
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
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider">
              Set Your Password
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a password so you can also sign in with email.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4 space-y-3"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-white font-bold">Password set!</p>
                <p className="text-muted-foreground text-sm">Redirecting to your dashboard…</p>
              </motion.div>
            ) : (
              <>
                {error && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4 text-sm text-primary/90">
                  Welcome, <strong>{customer.name}</strong>! You signed in with Google.
                  Set a password to also use email + password login.
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        required
                        type={showPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground pl-1">Minimum 8 characters</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        required
                        type={showPw ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        autoComplete="new-password"
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold py-3 rounded-xl transition-colors disabled:opacity-60 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? "Setting password..." : "Set Password & Continue"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocation("/my")}
                    className="w-full py-2 rounded-xl text-muted-foreground hover:text-white text-sm transition-colors"
                  >
                    Skip for now (you can set it later in Settings)
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
}
