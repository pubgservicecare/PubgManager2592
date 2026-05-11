import { AdminLayout } from "@/components/AdminLayout";
import { apiUrl } from "@/lib/api-url";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import {
  Save,
  Settings as SettingsIcon,
  Palette,
  Phone,
  Megaphone,
  CreditCard,
  Power,
  ShieldCheck,
  Share2,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  MessageCircle,
  Mail,
  Percent,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Search,
  Plus,
  X,
  Cloud,
  BookOpen,
  HardDrive,
  Wifi,
  FolderOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUploadField } from "@/components/FileUploadField";

type FormState = {
  siteName: string;
  siteDescription: string;
  heroTagline: string;
  footerText: string;
  logoUrl: string | null;
  supportEmail: string;
  whatsappNumber: string;
  businessAddress: string | null;
  allowSellerRegistration: boolean;
  defaultSellerCommissionPercent: number;
  showSellerNamesPublicly: boolean;
  bannerEnabled: boolean;
  bannerText: string | null;
  popularSearches: string;
  paymentMethodsInfo: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  discordUrl: string | null;
  adminUsername: string;
  adminPassword: string;
  // Storage fields
  storageProvider: string;
  gcsBucketName: string | null;
  gcsKeyJson: string | null;
  gcsFolderPath: string | null;
};

const TABS = [
  { id: "branding", label: "Branding", icon: Palette },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "marketplace", label: "Marketplace", icon: ShieldCheck },
  { id: "search", label: "Search Engine", icon: Search },
  { id: "promo", label: "Promo Banner", icon: Megaphone },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "social", label: "Social Media", icon: Share2 },
  { id: "maintenance", label: "Site Status", icon: Power },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "storage", label: "File Storage", icon: Cloud },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminSettings() {
  const { data: settings, isLoading } = useGetSettings();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("branding");
  const [showPassword, setShowPassword] = useState(false);
  const [showJsonKey, setShowJsonKey] = useState(false);
  const [showCompleteNote, setShowCompleteNote] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const [form, setForm] = useState<FormState>({
    siteName: "",
    siteDescription: "",
    heroTagline: "",
    footerText: "",
    logoUrl: null,
    supportEmail: "",
    whatsappNumber: "",
    businessAddress: "",
    allowSellerRegistration: true,
    defaultSellerCommissionPercent: 10,
    showSellerNamesPublicly: true,
    bannerEnabled: false,
    bannerText: "",
    popularSearches: "",
    paymentMethodsInfo: "",
    maintenanceMode: false,
    maintenanceMessage: "",
    facebookUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    tiktokUrl: "",
    discordUrl: "",
    adminUsername: "",
    adminPassword: "",
    storageProvider: "local",
    gcsBucketName: "",
    gcsKeyJson: "",
    gcsFolderPath: "",
  });

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setForm({
        siteName: s.siteName ?? "",
        siteDescription: s.siteDescription ?? "",
        heroTagline: s.heroTagline ?? "",
        footerText: s.footerText ?? "",
        logoUrl: s.logoUrl ?? null,
        supportEmail: s.supportEmail ?? "",
        whatsappNumber: s.whatsappNumber ?? "",
        businessAddress: s.businessAddress ?? "",
        allowSellerRegistration: s.allowSellerRegistration ?? true,
        defaultSellerCommissionPercent: s.defaultSellerCommissionPercent ?? 10,
        showSellerNamesPublicly: s.showSellerNamesPublicly ?? true,
        bannerEnabled: s.bannerEnabled ?? false,
        bannerText: s.bannerText ?? "",
        popularSearches: s.popularSearches ?? "",
        paymentMethodsInfo: s.paymentMethodsInfo ?? "",
        maintenanceMode: s.maintenanceMode ?? false,
        maintenanceMessage: s.maintenanceMessage ?? "",
        facebookUrl: s.facebookUrl ?? "",
        instagramUrl: s.instagramUrl ?? "",
        youtubeUrl: s.youtubeUrl ?? "",
        tiktokUrl: s.tiktokUrl ?? "",
        discordUrl: s.discordUrl ?? "",
        adminUsername: s.adminUsername ?? "",
        adminPassword: "",
        storageProvider: s.storageProvider ?? "local",
        gcsBucketName: s.gcsBucketName ?? "",
        gcsKeyJson: s.gcsKeyJson ?? "",
        gcsFolderPath: s.gcsFolderPath ?? "",
      });
    }
  }, [settings]);

  const updateMut = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast({ title: "Settings Saved", description: "Your platform configurations have been updated.", variant: "default" });
        setForm((f) => ({ ...f, adminPassword: "" }));
      },
      onError: (e: any) => {
        toast({ title: "Save failed", description: e?.message || "Could not save settings", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (!payload.adminPassword) delete payload.adminPassword;
    updateMut.mutate({ data: payload });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch(apiUrl("/api/storage/test-connection"), { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Connection Successful", description: data.message || "Storage is working correctly.", variant: "default" });
      } else {
        toast({ title: "Connection Failed", description: data.error || "Could not connect to storage.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection Failed", description: "Network error. Please check server is running.", variant: "destructive" });
    } finally {
      setTestingConnection(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="animate-pulse h-96 bg-card rounded-2xl"></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
              <SettingsIcon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 mb-1">Configuration</p>
              <h1 className="text-3xl font-display font-bold text-white">SYSTEM SETTINGS</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Configure your marketplace, branding, and store policies.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {form.maintenanceMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Maintenance Mode ON
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Site Live
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start space-y-1.5 bg-card border border-border rounded-2xl p-3 shadow-xl">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-white hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-left flex-1">{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === "branding" && (
              <Section title="Branding" subtitle="How your store presents itself everywhere." icon={<Palette className="w-5 h-5" />}>
                <FileUploadField
                  label="Site Logo"
                  hint="Square or wide — shows in the header and footer. Leave blank to use the default icon."
                  value={form.logoUrl}
                  onChange={(v) => set("logoUrl", v)}
                  accept="image/*"
                />

                <Field label="Site Name" required value={form.siteName} onChange={(v) => set("siteName", v)} />
                <Field
                  label="Hero Tagline"
                  value={form.heroTagline}
                  placeholder="The #1 PUBG Account Marketplace"
                  onChange={(v) => set("heroTagline", v)}
                  hint="Big tagline shown at the top of the public homepage."
                />
                <TextArea
                  label="Site Description"
                  value={form.siteDescription}
                  placeholder="Short description used for SEO meta tags and the homepage."
                  onChange={(v) => set("siteDescription", v)}
                />
                <Field
                  label="Footer Text"
                  value={form.footerText}
                  placeholder="© 2026 Your Brand. All rights reserved."
                  onChange={(v) => set("footerText", v)}
                />
              </Section>
            )}

            {activeTab === "search" && (
              <Section
                title="Search Engine"
                subtitle="Manage the quick-click tags shown under the marketplace search bar."
                icon={<Search className="w-5 h-5" />}
              >
                <TagInputField
                  label="Popular Searches"
                  value={form.popularSearches}
                  onChange={(v) => set("popularSearches", v)}
                  placeholder="Type a tag (e.g. Glacier) and press Add"
                  hint="Type a tag and click Add — it will appear below as a chip. Click the × on any chip to remove it. Leave empty to hide chips on the marketplace."
                />
              </Section>
            )}

            {activeTab === "contact" && (
              <Section title="Contact & Support" subtitle="How customers reach you." icon={<Phone className="w-5 h-5" />}>
                <Field
                  label="WhatsApp Number (For Sales)"
                  required
                  value={form.whatsappNumber}
                  onChange={(v) => set("whatsappNumber", v)}
                  placeholder="+923001234567"
                  hint="Include country code. Customers will be redirected here when they click Buy."
                  leftIcon={<MessageCircle className="w-4 h-4" />}
                />
                <Field
                  label="Support Email"
                  type="email"
                  value={form.supportEmail}
                  placeholder="support@yourbrand.com"
                  onChange={(v) => set("supportEmail", v)}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <TextArea
                  label="Business Address"
                  value={form.businessAddress ?? ""}
                  placeholder="Your office / mailing address (shown on receipts and footer)"
                  onChange={(v) => set("businessAddress", v)}
                />
              </Section>
            )}

            {activeTab === "marketplace" && (
              <Section title="Marketplace Rules" subtitle="Seller policies and visibility." icon={<ShieldCheck className="w-5 h-5" />}>
                <Toggle
                  label="Allow new seller registrations"
                  description="When off, the public seller signup page will be disabled. Existing sellers can still log in."
                  checked={form.allowSellerRegistration}
                  onChange={(v) => set("allowSellerRegistration", v)}
                />
                <Toggle
                  label="Show seller names publicly"
                  description="Display the seller's name on listings. Turn off to keep listings anonymous."
                  checked={form.showSellerNamesPublicly}
                  onChange={(v) => set("showSellerNamesPublicly", v)}
                />
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground uppercase block">
                    Default Seller Commission
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Percentage of sale price your store keeps when a seller-listed account is sold.
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.defaultSellerCommissionPercent}
                      onChange={(e) => set("defaultSellerCommissionPercent", Number(e.target.value))}
                      className="w-full bg-background border border-border focus:border-primary rounded-xl pl-4 pr-12 py-3 text-white outline-none"
                    />
                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Section>
            )}

            {activeTab === "promo" && (
              <Section title="Promo Banner" subtitle="Announcement bar shown at the top of every public page." icon={<Megaphone className="w-5 h-5" />}>
                <Toggle
                  label="Show promo banner"
                  description="Display a banner at the top of the public pages with your message."
                  checked={form.bannerEnabled}
                  onChange={(v) => set("bannerEnabled", v)}
                />
                <TextArea
                  label="Banner Message"
                  value={form.bannerText ?? ""}
                  placeholder="🎁 Eid Sale — 20% off all premium accounts this week!"
                  onChange={(v) => set("bannerText", v)}
                />
                {form.bannerEnabled && form.bannerText && (
                  <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-center text-sm font-bold py-2 px-4 rounded-xl">
                    {form.bannerText}
                  </div>
                )}
              </Section>
            )}

            {activeTab === "payments" && (
              <Section title="Payment Methods" subtitle="What customers see when they're ready to pay." icon={<CreditCard className="w-5 h-5" />}>
                <TextArea
                  label="Payment Methods Info"
                  value={form.paymentMethodsInfo ?? ""}
                  placeholder={"JazzCash: 0300-1234567 (Ali Khan)\nEasyPaisa: 0300-1234567 (Ali Khan)\nBank: HBL — 1234-5678-9012-3456"}
                  onChange={(v) => set("paymentMethodsInfo", v)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground -mt-2">
                  This text is shown to buyers on the WhatsApp redirect / receipt pages. Use one method per line.
                </p>
              </Section>
            )}

            {activeTab === "social" && (
              <Section title="Social Media" subtitle="Links shown in the footer of every public page." icon={<Share2 className="w-5 h-5" />}>
                <Field
                  label="Facebook URL"
                  value={form.facebookUrl ?? ""}
                  onChange={(v) => set("facebookUrl", v)}
                  placeholder="https://facebook.com/yourpage"
                  leftIcon={<Facebook className="w-4 h-4" />}
                />
                <Field
                  label="Instagram URL"
                  value={form.instagramUrl ?? ""}
                  onChange={(v) => set("instagramUrl", v)}
                  placeholder="https://instagram.com/yourhandle"
                  leftIcon={<Instagram className="w-4 h-4" />}
                />
                <Field
                  label="YouTube URL"
                  value={form.youtubeUrl ?? ""}
                  onChange={(v) => set("youtubeUrl", v)}
                  placeholder="https://youtube.com/@yourchannel"
                  leftIcon={<Youtube className="w-4 h-4" />}
                />
                <Field
                  label="TikTok URL"
                  value={form.tiktokUrl ?? ""}
                  onChange={(v) => set("tiktokUrl", v)}
                  placeholder="https://tiktok.com/@yourhandle"
                  leftIcon={<Music2 className="w-4 h-4" />}
                />
                <Field
                  label="Discord URL"
                  value={form.discordUrl ?? ""}
                  onChange={(v) => set("discordUrl", v)}
                  placeholder="https://discord.gg/your-invite"
                  leftIcon={<MessageCircle className="w-4 h-4" />}
                />
              </Section>
            )}

            {activeTab === "maintenance" && (
              <Section title="Site Status" subtitle="Take the public site offline temporarily without affecting admin." icon={<Power className="w-5 h-5" />}>
                <Toggle
                  label="Maintenance mode"
                  description="When ON, all public visitors see a maintenance page. Admin and seller logins still work."
                  checked={form.maintenanceMode}
                  onChange={(v) => set("maintenanceMode", v)}
                  variant="danger"
                />
                <TextArea
                  label="Maintenance Message"
                  value={form.maintenanceMessage}
                  placeholder="We're performing scheduled maintenance. Please check back soon."
                  onChange={(v) => set("maintenanceMessage", v)}
                />
                {form.maintenanceMode && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold mb-1">Public site will be hidden</p>
                      <p>Customers visiting your store will only see your maintenance message until you turn this off.</p>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {activeTab === "security" && (
              <Section title="Admin Credentials" subtitle="Change your admin username or password." icon={<ShieldCheck className="w-5 h-5" />} danger>
                <Field
                  label="Admin Username"
                  required
                  value={form.adminUsername}
                  onChange={(v) => set("adminUsername", v)}
                />
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground uppercase block">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.adminPassword}
                      placeholder="Leave blank to keep current"
                      onChange={(e) => set("adminPassword", e.target.value)}
                      className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 pr-12 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use a strong password — at least 8 characters with letters and numbers.
                  </p>
                </div>
              </Section>
            )}

            {activeTab === "storage" && (
              <>
                <Section
                  title="File Storage"
                  subtitle="Configure where uploaded files (logos, account screenshots, etc.) are stored."
                  icon={<Cloud className="w-5 h-5" />}
                >
                  {/* Provider Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground uppercase block">Storage Provider</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => set("storageProvider", "local")}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          form.storageProvider === "local"
                            ? "border-primary bg-primary/10 text-white"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <HardDrive className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                          <p className="font-bold text-sm">Local Storage</p>
                          <p className="text-xs opacity-70">Store on server disk</p>
                        </div>
                        {form.storageProvider === "local" && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => set("storageProvider", "gcs")}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          form.storageProvider === "gcs"
                            ? "border-primary bg-primary/10 text-white"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <Cloud className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                          <p className="font-bold text-sm">Google Cloud</p>
                          <p className="text-xs opacity-70">Cloud object storage</p>
                        </div>
                        {form.storageProvider === "gcs" && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                      </button>
                    </div>
                  </div>

                  {form.storageProvider === "local" && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-bold mb-1">Local Storage Active</p>
                        <p className="opacity-80">Files are stored on the server's disk. This works out of the box without any extra configuration. When you're ready to scale, switch to Google Cloud Storage above.</p>
                      </div>
                    </div>
                  )}

                  {form.storageProvider === "gcs" && (
                    <div className="space-y-5">
                      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-bold mb-1">3 fields required — that's it</p>
                          <p className="opacity-80">Fill in the fields below, click <strong>Save Settings</strong>, then <strong>Test Connection</strong>. Click <strong>Complete Note</strong> if you need help getting these values.</p>
                        </div>
                      </div>

                      <Field
                        label="Bucket Name"
                        value={form.gcsBucketName ?? ""}
                        onChange={(v) => set("gcsBucketName", v)}
                        placeholder="my-pubg-uploads"
                        hint="The name of your Google Cloud Storage bucket (e.g. my-pubg-uploads)."
                        leftIcon={<FolderOpen className="w-4 h-4" />}
                      />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-muted-foreground uppercase block">Service Account JSON Key</label>
                          <button
                            type="button"
                            onClick={() => setShowJsonKey((v) => !v)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                          >
                            {showJsonKey ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Show</>}
                          </button>
                        </div>
                        <textarea
                          rows={5}
                          value={showJsonKey ? (form.gcsKeyJson ?? "") : (form.gcsKeyJson ? "••••••••••••••••••••••••••••••••" : "")}
                          readOnly={!showJsonKey}
                          placeholder={showJsonKey ? '{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  "client_email": "..."\n}' : "Paste your JSON key file here (click Show first)"}
                          onChange={(e) => showJsonKey && set("gcsKeyJson", e.target.value)}
                          className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none resize-none font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Download the JSON key file from Google Cloud Console → IAM &amp; Admin → Service Accounts → Keys → Add Key. Paste the entire file contents here.
                        </p>
                        {form.gcsKeyJson && (
                          <div className="flex items-center gap-2 text-xs text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> JSON key is saved
                          </div>
                        )}
                      </div>

                      <Field
                        label="Upload Folder (optional)"
                        value={form.gcsFolderPath ?? ""}
                        onChange={(v) => set("gcsFolderPath", v)}
                        placeholder="uploads"
                        hint="Subfolder inside the bucket for new uploads. Leave blank to use the bucket root."
                        leftIcon={<FolderOpen className="w-4 h-4" />}
                      />
                    </div>
                  )}
                </Section>

                {/* Actions row */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">Storage Actions</p>
                    <p className="text-xs text-muted-foreground mt-1">Save settings first, then test the connection to verify everything works.</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/50 text-primary hover:bg-primary/10 font-bold text-sm transition-all disabled:opacity-50"
                    >
                      {testingConnection ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                      ) : (
                        <><Wifi className="w-4 h-4" /> Test Connection</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCompleteNote(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-white hover:border-primary/40 font-bold text-sm transition-all"
                    >
                      <BookOpen className="w-4 h-4" /> Complete Note
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Save bar */}
            <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground hidden sm:block">
                Changes apply immediately to the live site.
              </p>
              <button
                disabled={updateMut.isPending}
                type="submit"
                data-testid="button-save-settings"
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {updateMut.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> SAVING...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> SAVE SETTINGS
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Complete Note Modal */}
      {showCompleteNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-white">Google Cloud Storage — Setup Guide</h2>
                  <p className="text-xs text-muted-foreground">What each field means and how to get the values</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteNote(false)}
                className="p-2 text-muted-foreground hover:text-white rounded-lg hover:bg-secondary/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick summary */}
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
                <p className="text-sm font-bold text-white mb-1">You only need 3 things</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1. <strong className="text-white">Bucket Name</strong> — the name of the storage bucket you create.<br />
                  2. <strong className="text-white">Service Account JSON Key</strong> — a file you download from Google Cloud. Paste the whole file.<br />
                  3. <strong className="text-white">Upload Folder</strong> — optional subfolder (e.g. <code className="bg-secondary px-1 rounded">uploads</code>).
                </p>
              </div>

              {/* Setup steps */}
              <div>
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Step-by-step Setup
                </h3>
                <div className="space-y-2">
                  {[
                    { step: 1, title: "Create a Google Cloud account", desc: "Go to cloud.google.com — sign in with your Google account. New accounts get free credits." },
                    { step: 2, title: "Create a project", desc: "Click the project dropdown at the top of GCP Console → New Project. Give it any name." },
                    { step: 3, title: "Enable Cloud Storage", desc: "Go to APIs & Services → Library → search Cloud Storage → click Enable." },
                    { step: 4, title: "Create a bucket", desc: "Go to Cloud Storage → Buckets → Create. Pick a unique name — this is your Bucket Name. Note it down." },
                    { step: 5, title: "Create a service account", desc: "Go to IAM & Admin → Service Accounts → Create Service Account. Assign the role: Storage Object Admin." },
                    { step: 6, title: "Download the JSON key", desc: "Open the service account → Keys tab → Add Key → Create new key → JSON. A .json file will download to your computer." },
                    { step: 7, title: "Paste everything here", desc: "Enter your Bucket Name. Click Show on the JSON Key field, open the downloaded .json file in any text editor, select all, copy, and paste it in. Save settings, then Test Connection." },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-3 p-3 rounded-xl hover:bg-secondary/20">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {s.step}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security warning */}
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-destructive">Keep the JSON key secret</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    The JSON key gives full access to your bucket. Never share it, post it publicly, or put it in code. If it leaks, revoke it immediately: Google Cloud Console → IAM &amp; Admin → Service Accounts → Keys → delete the key, then create a new one.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteNote(false)}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Section({
  title,
  subtitle,
  icon,
  danger,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl">
      <header className="flex items-start gap-3 pb-5 mb-6 border-b border-border/50">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
        <div>
          <h3 className={`text-xl font-display font-bold ${danger ? "text-destructive" : "text-white"}`}>
            {title}
          </h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  hint,
  leftIcon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  leftIcon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-muted-foreground uppercase">{label}</label>
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </span>
        )}
        <input
          type={type}
          required={required}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-background border border-border focus:border-primary rounded-xl ${
            leftIcon ? "pl-10" : "pl-4"
          } pr-4 py-3 text-white outline-none`}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-muted-foreground uppercase">{label}</label>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none resize-none"
      />
    </div>
  );
}

function TagInputField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState("");
  const tags = value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const addTag = () => {
    const t = draft.trim();
    if (!t) return;
    const exists = tags.some((existing) => existing.toLowerCase() === t.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    const next = [...tags, t];
    onChange(next.join(", "));
    setDraft("");
  };

  const removeTag = (index: number) => {
    const next = tags.filter((_, i) => i !== index);
    onChange(next.join(", "));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-muted-foreground uppercase">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none"
          data-testid="tag-input"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!draft.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="tag-add-button"
        >
          <Plus className="w-4 h-4" />
          Add Tag
        </button>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-2">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-semibold"
              data-testid={`tag-chip-${i}`}
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(i)}
                aria-label={`Remove ${tag}`}
                className="inline-flex items-center justify-center w-5 h-5 rounded-md hover:bg-destructive/20 hover:text-destructive transition-colors"
                data-testid={`tag-remove-${i}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic pt-1">
          No tags added yet. Type one above and click Add.
        </p>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  variant = "default",
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  variant?: "default" | "danger";
}) {
  const onColor = variant === "danger" ? "bg-destructive" : "bg-primary";
  return (
    <label
      className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${
        checked
          ? variant === "danger"
            ? "bg-destructive/5 border-destructive/30"
            : "bg-primary/5 border-primary/30"
          : "bg-secondary/40 border-border hover:border-primary/40"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${variant === "danger" && checked ? "text-destructive" : "text-white"}`}>
          {label}
        </p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked ? onColor : "bg-secondary border border-border"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
