import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/api-url";
import { PublicLayout } from "@/components/PublicLayout";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSEO } from "@/hooks/use-seo";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export function CustomerSettingsPage() {
  useSEO({ title: "Account Settings", noindex: true });

  const { customer, isLoading, googleClientId, setPassword, refresh } = useCustomerAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !customer) setLocation("/login");
  }, [customer, isLoading, setLocation]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }
  if (!customer) return null;

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/my">
            <button className="p-2 rounded-xl hover:bg-card transition-colors text-muted-foreground hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-display font-bold text-white">Account Settings</h1>
            <p className="text-muted-foreground text-xs">Manage your profile and security</p>
          </div>
        </div>

        <ProfileSection customer={customer} />
        <PasswordSection customer={customer} setPassword={setPassword} />
        <ConnectedAccountsSection customer={customer} googleClientId={googleClientId} refresh={refresh} />
      </div>
    </PublicLayout>
  );
}

function ProfileSection({ customer }: { customer: NonNullable<ReturnType<typeof useCustomerAuth>["customer"]> }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-5">
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Profile</h2>
      <div className="space-y-3">
        <InfoRow icon={User} label="Name" value={customer.name} />
        {customer.email && <InfoRow icon={Mail} label="Email" value={customer.email} />}
        {customer.phone && <InfoRow icon={Phone} label="Phone" value={customer.phone} />}
      </div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-background/40 rounded-xl px-3 py-2.5">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase font-bold">{label}</p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

function PasswordSection({
  customer,
  setPassword,
}: {
  customer: NonNullable<ReturnType<typeof useCustomerAuth>["customer"]>;
  setPassword: ReturnType<typeof useCustomerAuth>["setPassword"];
}) {
  const hasPassword = customer.hasPassword;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await setPassword(newPassword, hasPassword ? currentPassword : undefined);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          {hasPassword ? "Change Password" : "Set Password"}
        </h2>
      </div>
      {!hasPassword && (
        <p className="text-xs text-muted-foreground mb-4">
          You currently sign in with Google only. Set a password to also use email + password login.
        </p>
      )}

      {success && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Password {hasPassword ? "changed" : "set"} successfully!</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        {hasPassword && (
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showPw}
            onToggle={() => setShowPw(!showPw)}
            placeholder="Your current password"
            autoComplete="current-password"
          />
        )}
        <PasswordInput
          label="New Password"
          value={newPassword}
          onChange={setNewPassword}
          show={showPw}
          onToggle={() => setShowPw(!showPw)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showPw}
          onToggle={() => setShowPw(!showPw)}
          placeholder="Repeat new password"
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
        >
          {loading ? "Saving..." : hasPassword ? "Change Password" : "Set Password"}
        </button>
      </form>
    </section>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-background border border-border rounded-xl pl-10 pr-12 py-2.5 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ConnectedAccountsSection({
  customer,
  googleClientId,
  refresh,
}: {
  customer: NonNullable<ReturnType<typeof useCustomerAuth>["customer"]>;
  googleClientId: string | null;
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLinkGoogle = async (credential: string) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/customer/link-google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to link Google");
      setSuccess(`Google account (${data.email}) linked successfully!`);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to link Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Connected Accounts</h2>
      </div>

      {success && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {customer.hasGoogle ? (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Google Connected</p>
              {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
            </div>
          </div>
        ) : googleClientId ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Link your Google account for faster sign-in.
            </p>
            <GoogleSignInButton
              googleClientId={googleClientId}
              onCredential={handleLinkGoogle}
              disabled={loading}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Google sign-in is not configured.</p>
        )}
      </div>
    </section>
  );
}
