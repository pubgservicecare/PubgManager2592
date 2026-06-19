import { useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/api-url";
import { PublicLayout } from "@/components/PublicLayout";
import { useSEO } from "@/hooks/use-seo";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export function ForgotPasswordPage() {
  useSEO({ title: "Forgot Password", noindex: true });

  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Reset failed");
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
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider">
              {step === 3 ? "Password Reset!" : "Forgot Password"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {step === 1 && "Enter your email to receive a reset code."}
              {step === 2 && `Enter the 6-digit code sent to ${email}`}
              {step === 3 && "Your password has been reset successfully."}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleRequestOtp}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold py-3 rounded-xl transition-colors disabled:opacity-60 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? "Sending..." : "Send Reset Code"}
                  </button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleReset}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Verification Code</label>
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-base focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Code expires in 15 minutes.{" "}
                      <button
                        type="button"
                        onClick={() => { setStep(1); setError(""); setOtp(""); }}
                        className="text-primary hover:underline"
                      >
                        Send again
                      </button>
                    </p>
                  </div>

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
                        placeholder="Repeat new password"
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
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </motion.form>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4 space-y-4"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Your password has been updated. You can now log in with your new password.
                  </p>
                  <button
                    onClick={() => setLocation("/login")}
                    className="w-full font-bold py-3 rounded-xl transition-colors bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Go to Login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {step !== 3 && (
              <p className="text-center text-sm text-muted-foreground mt-5">
                <Link href="/login" className="inline-flex items-center gap-1 hover:text-white transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
}
