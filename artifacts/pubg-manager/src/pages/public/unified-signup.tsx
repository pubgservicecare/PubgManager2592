import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * `/signup` — customer signup ONLY. Per the new policy every account starts as
 * a customer; sellers come from the post-signin "Become a Seller" flow.
 */
export function UnifiedSignup() {
  useSEO({
    title: "Sign Up — Create Your Customer Account",
    description:
      "Create a customer account on PUBG Account Manager. After signing in, you can apply to become a verified seller.",
  });
  return <CustomerSignupForm />;
}

/**
 * `/seller/signup` — single legacy URL with new behavior:
 *   - logged-in seller   → redirect to /seller/dashboard
 *   - logged-in customer → render the CNIC verification form (pre-filled)
 *   - guest              → "create a customer account first" landing page
 */
export function SellerSignupPage() {
  const [, setLocation] = useLocation();
  const { customer, isLoading: customerLoading } = useCustomerAuth();
  const { seller, isLoading: sellerLoading } = useSellerAuth();

  useSEO({
    title: "Become a Seller",
    description: "Apply to become a verified seller on PUBG Account Manager.",
  });

  useEffect(() => {
    if (!sellerLoading && seller) {
      setLocation("/seller/dashboard");
    }
  }, [seller, sellerLoading, setLocation]);

  if (customerLoading || sellerLoading) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      </PublicLayout>
    );
  }
  if (seller) return null; // redirect in flight

  if (customer) {
    return <SellerSignupForm prefillName={customer.name} prefillPhone={(customer as any).phone || ""} />;
  }
  return <BecomeSellerLanding />;
}

function BecomeSellerLanding() {
  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 rounded-2xl mb-3">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wider">
                Become a Seller
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                For trust and safety, every seller starts as a customer. Sign up or log in first, then apply for verification.
              </p>
            </div>

            <ol className="space-y-3 mb-6">
              <Step n={1} title="Create your customer account" desc="Quick signup with name, phone, and password." />
              <Step n={2} title="Click 'Become a Seller'" desc="Visible in the top header once you're logged in." />
              <Step n={3} title="Submit verification" desc="CNIC photos, selfie, and contact details for admin review." />
            </ol>

            <div className="grid sm:grid-cols-2 gap-3">
              <Link href="/signup">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-colors"
                  data-testid="seller-signup-redirect-create"
                >
                  Create Customer Account <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/login">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-white font-bold py-3 rounded-xl transition-colors border border-border"
                  data-testid="seller-signup-redirect-login"
                >
                  Already Registered — Log In
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
      <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-sm flex items-center justify-center">
        {n}
      </div>
      <div className="min-w-0">
        <p className="text-white font-bold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

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

  // Pick up ?ref=CODE from the URL on first render
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref.trim().toUpperCase());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
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
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/15 rounded-2xl mb-3">
              <Gamepad2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider">
              Create Your Account
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sign up to chat with us, place orders, and apply to become a seller.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldRow icon={User} label="Your Name">
                <input
                  required
                  type="text"
                  placeholder="e.g. Ali Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  data-testid="customer-signup-name"
                />
              </FieldRow>

              <FieldRow icon={Phone} label="Phone Number">
                <input
                  required
                  type="tel"
                  placeholder="e.g. 03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  data-testid="customer-signup-phone"
                />
              </FieldRow>

              <FieldRow icon={Lock} label="Password">
                <input
                  required
                  type={showPw ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-12 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  data-testid="customer-signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </FieldRow>
              <p className="text-xs text-muted-foreground">Minimum 6 characters</p>

              <FieldRow icon={CheckCircle2} label="Referral Code (optional)">
                <input
                  type="text"
                  placeholder="Got a code from a friend?"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary uppercase tracking-wider"
                  data-testid="customer-signup-referral"
                  maxLength={20}
                />
              </FieldRow>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-bold py-3 rounded-xl transition-colors mt-2"
                data-testid="customer-signup-submit"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-200/90 flex items-start gap-2">
              <Store className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Want to sell? After signing in, click <strong>"Become a Seller"</strong> in the header to apply for verification.
              </p>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-bold">Login</Link>
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

function SellerSignupForm({ prefillName, prefillPhone }: { prefillName: string; prefillPhone: string }) {
  const [, setLocation] = useLocation();
  const { refresh: refreshSeller } = useSellerAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: prefillName || "",
    username: "",
    email: "",
    phone: prefillPhone || "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    cnicNumber: "",
  });
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username.trim())) {
      setErrorMsg("Username must be 3-20 characters: letters, numbers, or underscore only");
      return;
    }
    if (!cnicFront || !cnicBack || !selfie) {
      setErrorMsg("Please upload CNIC front, back, and selfie");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/signup", {
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
      setSuccess(true);
      // Refresh seller auth in case the backend already attached an approved seller session.
      await refreshSeller();
      setTimeout(() => setLocation("/"), 3500);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border rounded-3xl p-8 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white mb-2">Application Submitted!</h1>
            <p className="text-muted-foreground text-sm mb-4">
              Thank you. Our admin team will review your CNIC and selfie within 24 hours. You'll see seller features once approved.
            </p>
            <p className="text-xs text-muted-foreground">Redirecting to your account…</p>
          </motion.div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex-1 px-4 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl mx-auto bg-card border border-border rounded-3xl p-6 sm:p-8"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <Store className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wider">BECOME A SELLER</h1>
            <p className="text-muted-foreground text-sm mt-1">Get verified and start listing accounts</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-sm text-amber-200">
            <div className="flex gap-2 items-start">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <p>For trust and safety, all sellers must verify their identity with CNIC photos and a selfie. Your documents are private and only used for verification.</p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-xl mb-5 text-sm font-bold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Personal Info</h2>

            <Field icon={User} label="Full Name" value={form.name} onChange={set("name")} required testId="seller-signup-name" />
            <div>
              <Field
                icon={AtSign}
                label="Public Username (shown on your listings)"
                value={form.username}
                onChange={(e: any) => setForm({ ...form, username: e.target.value.replace(/\s/g, "") })}
                placeholder="e.g. PMG_Official"
                required
                testId="seller-signup-username"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5 pl-1">
                3-20 characters · letters, numbers, or underscore. This is the name buyers will see.
              </p>
            </div>
            <Field icon={Mail} label="Email" type="email" value={form.email} onChange={set("email")} required testId="seller-signup-email" />
            <Field
              icon={Phone}
              label="Phone Number (from your customer account)"
              value={form.phone}
              onChange={() => {}}
              placeholder="03XX-XXXXXXX"
              required
              readOnly
              testId="seller-signup-phone"
            />
            <Field icon={MessageCircle} label="WhatsApp (optional)" value={form.whatsapp} onChange={set("whatsapp")} placeholder="03XX-XXXXXXX" />

            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider pt-4">Password</h2>
            <Field icon={Lock} label="Password (min 6 chars)" type="password" value={form.password} onChange={set("password")} required testId="seller-signup-password" />
            <Field icon={Lock} label="Confirm Password" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} required testId="seller-signup-confirm" />

            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider pt-4">Identity Verification</h2>
            <Field icon={IdCard} label="CNIC Number (13 digits)" value={form.cnicNumber} onChange={set("cnicNumber")} placeholder="12345-1234567-1" required testId="seller-signup-cnic" />

            <FileUploadField
              label="CNIC Front Photo"
              hint="Clear photo of the front of your CNIC card"
              value={cnicFront}
              onChange={setCnicFront}
            />
            <FileUploadField
              label="CNIC Back Photo"
              hint="Clear photo of the back of your CNIC card"
              value={cnicBack}
              onChange={setCnicBack}
            />
            <FileUploadField
              label="Selfie with CNIC"
              hint="Hold your CNIC next to your face — must be clearly visible"
              value={selfie}
              onChange={setSelfie}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 mt-6"
              data-testid="seller-signup-submit"
            >
              {submitting ? "Submitting..." : "Submit Seller Application"}
            </button>
          </form>
        </motion.div>
      </div>
    </PublicLayout>
  );
}

function FieldRow({ icon: Icon, label, children }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-muted-foreground uppercase">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, type = "text", value, onChange, placeholder, required, readOnly, testId }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          data-testid={testId}
          className={`w-full bg-background border-2 border-border focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-white outline-none transition-colors text-sm ${readOnly ? "opacity-70 cursor-not-allowed focus:border-border" : ""}`}
        />
      </div>
    </div>
  );
}
