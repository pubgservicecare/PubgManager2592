import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/api-url";
import { PublicLayout } from "@/components/PublicLayout";
import { FileUploadField } from "@/components/FileUploadField";
import { useSEO } from "@/hooks/use-seo";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSellerAuth } from "@/hooks/use-seller-auth";
import {
  Gamepad2,
  Store,
  User,
  AtSign,
  Mail,
  Phone,
  Lock,
  MessageCircle,
  IdCard,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function UnifiedSignup() {
  useSEO({
    title: "Sign Up — Create Your Customer Account",
    description:
      "Create a customer account on PUBG Account Manager. After signing in, you can apply to become a verified seller.",
    noindex: true,
  });
  return <CustomerSignupForm />;
}

export function SellerSignupPage() {
  const [, setLocation] = useLocation();
  const { customer, isLoading: customerLoading } = useCustomerAuth();
  const { seller, isLoading: sellerLoading } = useSellerAuth();
  const [submitted, setSubmitted] = useState(false);

  useSEO({
    title: "Become a Seller",
    description: "Apply to become a verified seller on PUBG Account Manager.",
    noindex: true,
  });

  useEffect(() => {
    if (!submitted && !sellerLoading && seller) setLocation("/seller/dashboard");
  }, [seller, sellerLoading, setLocation, submitted]);

  // Show success screen — locked here so auth changes don't interrupt it
  if (submitted) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-card border border-border rounded-3xl p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-display font-bold text-white mb-2">Application Submitted!</h1>
            <p className="text-muted-foreground text-sm">
              Our admin team will review your CNIC within 24 hours. You'll see seller features once approved.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Redirecting to marketplace…</p>
          </motion.div>
        </div>
      </PublicLayout>
    );
  }

  if (customerLoading || sellerLoading) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      </PublicLayout>
    );
  }
  if (seller) return null;
  if (customer) {
    return (
      <SellerSignupForm
        prefillName={customer.name}
        prefillPhone={(customer as any).phone || ""}
        onSuccess={() => setSubmitted(true)}
      />
    );
  }
  return <BecomeSellerLanding />;
}

/* ─── Landing for guests ─────────────────────────────────────────────────── */

function BecomeSellerLanding() {
  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-3xl p-6">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/15 rounded-2xl mb-3">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider">
                Become a Seller
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Every seller starts as a customer. Sign up first, then apply for verification.
              </p>
            </div>

            <ol className="space-y-2.5 mb-5">
              <Step n={1} title="Create customer account" desc="Name, phone, and password." />
              <Step n={2} title="Click 'Become a Seller'" desc="In the header once you're logged in." />
              <Step n={3} title="Submit CNIC & selfie" desc="Admin review within 24 hours." />
            </ol>

            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/signup">
                <button type="button" className="w-full inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition text-sm">
                  Sign Up <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/login">
                <button type="button" className="w-full inline-flex items-center justify-center bg-muted hover:bg-muted/80 text-white font-bold py-3 rounded-xl transition border border-border text-sm">
                  Log In
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3 bg-background/40 border border-border rounded-xl p-3">
      <div className="w-6 h-6 shrink-0 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center">
        {n}
      </div>
      <div>
        <p className="text-white font-bold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

/* ─── Customer Signup ────────────────────────────────────────────────────── */

function CustomerSignupForm() {
  const { signup } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setReferralCode(ref.trim().toUpperCase());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await signup(name, phone, password, referralCode || undefined);
      setLocation("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/15 rounded-2xl mb-3">
              <Gamepad2 className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider">Create Account</h1>
            <p className="text-muted-foreground mt-1 text-sm">Sign up to buy accounts or become a seller.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xl">
            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <InputField icon={User} label="Your Name" type="text" value={name} onChange={setName} placeholder="e.g. Ali Khan" required autoComplete="name" testId="customer-signup-name" />
              <InputField icon={Phone} label="Phone Number" type="tel" value={phone} onChange={setPhone} placeholder="e.g. 03001234567" required autoComplete="tel" testId="customer-signup-phone" />
              <div>
                <InputField
                  icon={Lock}
                  label="Password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 6 characters"
                  required
                  autoComplete="new-password"
                  testId="customer-signup-password"
                  suffix={
                    <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-white">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <p className="text-xs text-muted-foreground mt-1 pl-1">Minimum 6 characters</p>
              </div>
              <InputField icon={CheckCircle2} label="Referral Code (optional)" type="text" value={referralCode} onChange={(v) => setReferralCode(v.toUpperCase())} placeholder="Got a code from a friend?" autoComplete="off" testId="customer-signup-referral" />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold py-3 rounded-xl transition active:scale-[0.98] mt-1"
                data-testid="customer-signup-submit"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2.5 text-xs text-emerald-200/90 flex items-start gap-2">
              <Store className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>Want to sell? After signing in, click <strong>"Become a Seller"</strong> in the header.</p>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-bold">Login</Link>
            </p>
            <p className="text-center text-sm text-muted-foreground mt-1.5">
              <Link href="/" className="text-muted-foreground hover:text-white text-xs">← Back to Marketplace</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
}

/* ─── Seller Signup — 3-Step Wizard ─────────────────────────────────────── */

const STEPS = [
  { label: "Info",    icon: User },
  { label: "Password", icon: Lock },
  { label: "Verify",  icon: IdCard },
];

function SellerSignupForm({ prefillName, prefillPhone, onSuccess }: { prefillName: string; prefillPhone: string; onSuccess: () => void }) {
  const [, setLocation] = useLocation();
  const { refresh: refreshSeller } = useSellerAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back

  const [form, setForm] = useState({
    name: prefillName || "",
    username: "",
    email: "",
    whatsapp: "",
    phone: prefillPhone || "",
    password: "",
    confirmPassword: "",
    cnicNumber: "",
  });
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const goNext = () => {
    setErrorMsg("");

    if (step === 0) {
      if (!form.name.trim()) { setErrorMsg("Full name is required"); return; }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username.trim())) {
        setErrorMsg("Username: 3-20 characters, letters/numbers/underscore only"); return;
      }
      if (!form.email.trim()) { setErrorMsg("Email is required"); return; }
    }

    if (step === 1) {
      if (form.password.length < 6) { setErrorMsg("Password must be at least 6 characters"); return; }
      if (form.password !== form.confirmPassword) { setErrorMsg("Passwords do not match"); return; }
    }

    setDir(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setErrorMsg("");
    setDir(-1);
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.cnicNumber.replace(/\D/g, "").length) {
      setErrorMsg("CNIC number is required"); return;
    }
    if (!cnicFront || !cnicBack || !selfie) {
      setErrorMsg("Please upload CNIC front, back, and selfie"); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/seller/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          username: form.username.trim(),
          email: form.email,
          phone: form.phone,
          whatsapp: form.whatsapp || undefined,
          password: form.password,
          cnicNumber: form.cnicNumber,
          cnicFrontUrl: cnicFront,
          cnicBackUrl: cnicBack,
          selfieUrl: selfie,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Signup failed");
      }
      onSuccess();
      setTimeout(() => setLocation("/"), 3000);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex-1 px-4 py-5 flex flex-col items-center">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <Store className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-display font-bold text-white tracking-wider">BECOME A SELLER</h1>
            <p className="text-muted-foreground text-xs mt-1">Get verified and start listing accounts</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-0 mb-5">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={i} className="flex items-center">
                  <div className={`flex flex-col items-center gap-1 transition-all`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                      done    ? "bg-emerald-500 border-emerald-500 text-white" :
                      active  ? "bg-primary border-primary text-primary-foreground" :
                                "bg-background border-border text-muted-foreground"
                    }`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? "text-white" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 w-10 mx-1 mb-4 transition-all ${i < step ? "bg-emerald-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">

            {/* Error */}
            {errorMsg && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border-b border-destructive/20 px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Step Content */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: dir * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -30 }}
                transition={{ duration: 0.2 }}
                className="p-5 space-y-4"
              >
                {/* ── Step 0: Personal Info ── */}
                {step === 0 && (
                  <>
                    <p className="text-xs text-muted-foreground -mt-1 mb-1">Fill in your public seller information.</p>

                    <InputField
                      icon={User}
                      label="Full Name"
                      value={form.name}
                      onChange={set("name")}
                      required
                      autoComplete="name"
                      testId="seller-signup-name"
                    />
                    <div>
                      <InputField
                        icon={AtSign}
                        label="Public Username"
                        value={form.username}
                        onChange={(v) => set("username")(v.replace(/\s/g, ""))}
                        placeholder="e.g. PMG_Official"
                        required
                        autoComplete="off"
                        testId="seller-signup-username"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1 pl-1">
                        3-20 chars · letters, numbers, underscore. Buyers see this name.
                      </p>
                    </div>
                    <InputField
                      icon={Mail}
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      required
                      autoComplete="email"
                      testId="seller-signup-email"
                    />
                    <InputField
                      icon={MessageCircle}
                      label="WhatsApp (optional)"
                      value={form.whatsapp}
                      onChange={set("whatsapp")}
                      placeholder="03XX-XXXXXXX"
                      autoComplete="tel"
                    />
                    {/* Phone (read-only) */}
                    <div className="flex items-center gap-2 bg-background/50 border border-border rounded-xl px-3 py-2.5">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Phone (from your account)</p>
                        <p className="text-sm text-white/70 font-mono">{form.phone || "—"}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Step 1: Password ── */}
                {step === 1 && (
                  <>
                    <p className="text-xs text-muted-foreground -mt-1 mb-1">Set a password for your seller account.</p>

                    <InputField
                      icon={Lock}
                      label="Password"
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      placeholder="At least 6 characters"
                      required
                      autoComplete="new-password"
                      testId="seller-signup-password"
                      suffix={
                        <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted-foreground hover:text-white">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <InputField
                      icon={Lock}
                      label="Confirm Password"
                      type={showCPw ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={set("confirmPassword")}
                      placeholder="Repeat your password"
                      required
                      autoComplete="new-password"
                      testId="seller-signup-confirm"
                      suffix={
                        <button type="button" onClick={() => setShowCPw(!showCPw)} className="text-muted-foreground hover:text-white">
                          {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2.5 text-xs text-blue-200/80 flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p>This password is for your seller account login. Keep it safe.</p>
                    </div>
                  </>
                )}

                {/* ── Step 2: Identity Verification ── */}
                {step === 2 && (
                  <form onSubmit={handleSubmit} id="seller-verify-form" className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 text-xs text-amber-200 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Your documents are private and only used for identity verification by our admin team.</p>
                    </div>

                    <InputField
                      icon={IdCard}
                      label="CNIC Number (13 digits)"
                      value={form.cnicNumber}
                      onChange={set("cnicNumber")}
                      placeholder="12345-1234567-1"
                      required
                      autoComplete="off"
                      testId="seller-signup-cnic"
                    />

                    <FileUploadField
                      label="CNIC Front Photo"
                      hint="Clear photo of the front of your CNIC"
                      value={cnicFront}
                      onChange={setCnicFront}
                    />
                    <FileUploadField
                      label="CNIC Back Photo"
                      hint="Clear photo of the back of your CNIC"
                      value={cnicBack}
                      onChange={setCnicBack}
                    />
                    <FileUploadField
                      label="Selfie holding CNIC"
                      hint="Hold your CNIC next to your face — must be clearly visible"
                      value={selfie}
                      onChange={setSelfie}
                    />
                  </form>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className={`px-5 pb-5 flex gap-2.5 ${step > 0 ? "justify-between" : "justify-end"}`}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-white hover:border-white/20 font-bold text-sm transition active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition active:scale-[0.98] text-sm"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="seller-verify-form"
                  disabled={submitting}
                  onClick={handleSubmit as any}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition active:scale-[0.98] disabled:opacity-50 text-sm"
                  data-testid="seller-signup-submit"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            <Link href="/" className="hover:text-white">← Back to Marketplace</Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

/* ─── Shared Field Components ────────────────────────────────────────────── */

function InputField({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  readOnly,
  testId,
  autoComplete,
  suffix,
}: {
  icon: any;
  label?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  testId?: string;
  autoComplete?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-bold text-muted-foreground uppercase block">{label}</label>
      )}
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          data-testid={testId}
          autoComplete={autoComplete}
          className={`w-full bg-background border-2 border-border focus:border-emerald-500 rounded-xl pl-10 ${suffix ? "pr-10" : "pr-4"} py-3 text-white outline-none transition-colors text-sm ${
            readOnly ? "opacity-60 cursor-not-allowed focus:border-border" : ""
          }`}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
    </div>
  );
}
