import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Mail,
  Send,
  BarChart3,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  ShoppingBag,
  User,
  ChevronRight,
  Loader2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const API = "/api";

type Tab = "overview" | "send" | "campaigns" | "logs";

interface Stats {
  totalEmails: number;
  failedEmails: number;
  totalCampaigns: number;
  sentCampaigns: number;
}

interface Campaign {
  id: number;
  title: string;
  subject: string;
  htmlContent: string;
  target: string;
  status: "draft" | "sent";
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt: string | null;
}

interface EmailLog {
  id: number;
  emailType: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  campaignId: number | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  otp_signup: "OTP – Signup",
  otp_reset: "OTP – Reset",
  "otp_email-change": "OTP – Email Change",
  welcome: "Welcome",
  password_changed: "Password Changed",
  password_reset_done: "Password Reset",
  google_linked: "Google Linked",
  email_changed: "Email Changed",
  purchase_confirmation: "Purchase Confirm",
  campaign: "Campaign",
  admin_single: "Admin (Single)",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" });
}

export function AdminEmailCenter() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsOffset, setLogsOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [campaignSending, setCampaignSending] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();

  // ── Send Single form ──────────────────────────────────────────────────────
  const [singleTo, setSingleTo] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleSubject, setSingleSubject] = useState("");
  const [singleBody, setSingleBody] = useState("");

  // ── Send Bulk form ────────────────────────────────────────────────────────
  const [bulkTarget, setBulkTarget] = useState<"all" | "buyers">("all");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");

  // ── New Campaign form ─────────────────────────────────────────────────────
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campTitle, setCampTitle] = useState("");
  const [campSubject, setCampSubject] = useState("");
  const [campBody, setCampBody] = useState("");
  const [campTarget, setCampTarget] = useState<"all" | "buyers">("all");
  const [campSaving, setCampSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin/email/stats`);
      if (r.ok) setStats(await r.json());
    } catch {}
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin/email/campaigns`);
      if (r.ok) setCampaigns(await r.json());
    } catch {}
  }, []);

  const fetchLogs = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/email/logs?limit=50&offset=${offset}`);
      if (r.ok) {
        const data = await r.json();
        setLogs(data.logs);
        setLogsTotal(data.total);
        setLogsOffset(offset);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (tab === "campaigns") fetchCampaigns();
    if (tab === "logs") fetchLogs(0);
  }, [tab, fetchCampaigns, fetchLogs]);

  // ── Send Single ────────────────────────────────────────────────────────────
  async function handleSendSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!singleTo || !singleSubject || !singleBody) return;
    setSendLoading(true);
    try {
      const r = await fetch(`${API}/admin/email/send-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: singleTo, name: singleName || undefined, subject: singleSubject, htmlContent: singleBody }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast({ title: "Email Sent!", description: `Sent to ${singleTo}` });
      setSingleTo(""); setSingleName(""); setSingleSubject(""); setSingleBody("");
      fetchStats();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSendLoading(false);
    }
  }

  // ── Send Bulk ──────────────────────────────────────────────────────────────
  async function handleSendBulk(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkSubject || !bulkBody) return;
    setSendLoading(true);
    try {
      const r = await fetch(`${API}/admin/email/send-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: bulkTarget, subject: bulkSubject, htmlContent: bulkBody }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast({ title: "Bulk Email Sent!", description: `${data.sent} sent, ${data.failed} failed out of ${data.total}` });
      setBulkSubject(""); setBulkBody("");
      fetchStats();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSendLoading(false);
    }
  }

  // ── Create Campaign ────────────────────────────────────────────────────────
  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!campTitle || !campSubject || !campBody) return;
    setCampSaving(true);
    try {
      const r = await fetch(`${API}/admin/email/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: campTitle, subject: campSubject, htmlContent: campBody, target: campTarget }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast({ title: "Campaign Created!", description: `"${campTitle}" saved as draft` });
      setCampTitle(""); setCampSubject(""); setCampBody(""); setCampTarget("all");
      setShowCampaignForm(false);
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setCampSaving(false);
    }
  }

  // ── Send Campaign ──────────────────────────────────────────────────────────
  async function handleSendCampaign(campaign: Campaign) {
    setCampaignSending(campaign.id);
    try {
      const r = await fetch(`${API}/admin/email/campaigns/${campaign.id}/send`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast({ title: "Campaign Sent!", description: `${data.sent} sent, ${data.failed} failed out of ${data.total}` });
      fetchCampaigns();
      fetchStats();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setCampaignSending(null);
    }
  }

  // ── Delete Campaign ────────────────────────────────────────────────────────
  async function handleDeleteCampaign() {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`${API}/admin/email/campaigns/${deleteTarget.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      toast({ title: "Deleted", description: `Campaign "${deleteTarget.title}" removed` });
      setDeleteTarget(null);
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "send", label: "Send Email", icon: Send },
    { id: "campaigns", label: "Campaigns", icon: Mail },
    { id: "logs", label: "Logs", icon: Clock },
  ];

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Email Center</h1>
            <p className="text-sm text-muted-foreground">Send emails, manage campaigns, view delivery logs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-8 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center ${
              tab === id
                ? "bg-card text-foreground shadow border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Sent", value: stats?.totalEmails ?? "—", icon: Send, color: "text-green-400" },
              { label: "Failed", value: stats?.failedEmails ?? "—", icon: XCircle, color: "text-red-400" },
              { label: "Campaigns", value: stats?.totalCampaigns ?? "—", icon: Mail, color: "text-primary" },
              { label: "Sent Campaigns", value: stats?.sentCampaigns ?? "—", icon: CheckCircle, color: "text-blue-400" },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</span>
                </div>
                <p className="text-3xl font-display font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          <button
            onClick={fetchStats}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Stats
          </button>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: "Send email to all customers", action: () => { setTab("send"); setBulkTarget("all"); } },
                  { label: "Send email to buyers only", action: () => { setTab("send"); setBulkTarget("buyers"); } },
                  { label: "Create new campaign", action: () => { setTab("campaigns"); setShowCampaignForm(true); } },
                  { label: "View email logs", action: () => setTab("logs") },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={a.action}
                    className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary rounded-lg text-sm text-foreground transition-colors"
                  >
                    <span>{a.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3">Automated Emails</h3>
              <div className="space-y-2 text-sm">
                {[
                  "OTP — Email Signup Verification",
                  "OTP — Password Reset",
                  "OTP — Email Change",
                  "Welcome — After Email Signup",
                  "Security — Password Changed",
                  "Security — Password Reset Done",
                  "Security — Google Account Linked",
                  "Security — Email Changed",
                  "Purchase — Order Confirmation",
                ].map((e) => (
                  <div key={e} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SEND EMAIL TAB ────────────────────────────────────────────────── */}
      {tab === "send" && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Single Email */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-lg">Send to Single Customer</h3>
            </div>
            <form onSubmit={handleSendSingle} className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Recipient Email *</Label>
                <Input
                  type="email"
                  placeholder="customer@email.com"
                  value={singleTo}
                  onChange={(e) => setSingleTo(e.target.value)}
                  required
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Recipient Name (optional)</Label>
                <Input
                  placeholder="Ali Khan"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Subject *</Label>
                <Input
                  placeholder="Email subject"
                  value={singleSubject}
                  onChange={(e) => setSingleSubject(e.target.value)}
                  required
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Message (HTML allowed) *</Label>
                <Textarea
                  placeholder="<p>Your message here...</p>"
                  value={singleBody}
                  onChange={(e) => setSingleBody(e.target.value)}
                  required
                  rows={8}
                  className="bg-secondary/50 font-mono text-sm resize-none"
                />
              </div>
              <Button type="submit" disabled={sendLoading} className="w-full">
                {sendLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Email
              </Button>
            </form>
          </div>

          {/* Bulk Email */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground text-lg">Send Bulk Email</h3>
            </div>
            <form onSubmit={handleSendBulk} className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Target Audience *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "all", label: "All Customers", icon: Users },
                    { value: "buyers", label: "Buyers Only", icon: ShoppingBag },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBulkTarget(value as any)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold transition-all ${
                        bulkTarget === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {bulkTarget === "all"
                    ? "Sends to all registered customers who have an email address."
                    : "Sends only to customers who have purchased at least one account."}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Subject *</Label>
                <Input
                  placeholder="New accounts available!"
                  value={bulkSubject}
                  onChange={(e) => setBulkSubject(e.target.value)}
                  required
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">Message (HTML allowed) *</Label>
                <Textarea
                  placeholder="<p>Check out our latest PUBG accounts...</p>"
                  value={bulkBody}
                  onChange={(e) => setBulkBody(e.target.value)}
                  required
                  rows={8}
                  className="bg-secondary/50 font-mono text-sm resize-none"
                />
              </div>
              <Button type="submit" disabled={sendLoading} className="w-full" variant="outline">
                {sendLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send to {bulkTarget === "all" ? "All Customers" : "Buyers Only"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── CAMPAIGNS TAB ─────────────────────────────────────────────────── */}
      {tab === "campaigns" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
            <Button onClick={() => setShowCampaignForm(!showCampaignForm)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>

          {/* New Campaign Form */}
          {showCampaignForm && (
            <div className="bg-card border border-primary/20 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Create Campaign</h3>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1.5 block">Campaign Title *</Label>
                    <Input placeholder="June Promotion" value={campTitle} onChange={(e) => setCampTitle(e.target.value)} required className="bg-secondary/50" />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1.5 block">Target</Label>
                    <select
                      value={campTarget}
                      onChange={(e) => setCampTarget(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-secondary/50 text-sm text-foreground"
                    >
                      <option value="all">All Customers</option>
                      <option value="buyers">Buyers Only</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">Email Subject *</Label>
                  <Input placeholder="🔥 New Mythic Accounts Available!" value={campSubject} onChange={(e) => setCampSubject(e.target.value)} required className="bg-secondary/50" />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-1.5 block">Email Body (HTML) *</Label>
                  <Textarea placeholder="<h2>New accounts just listed!</h2><p>Check them out...</p>" value={campBody} onChange={(e) => setCampBody(e.target.value)} required rows={8} className="bg-secondary/50 font-mono text-sm resize-none" />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={campSaving}>
                    {campSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Save as Draft
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowCampaignForm(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          )}

          {/* Campaign List */}
          {campaigns.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No campaigns yet. Create your first one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground">{c.title}</h4>
                        <Badge variant={c.status === "sent" ? "default" : "secondary"} className="text-xs">
                          {c.status === "sent" ? "Sent" : "Draft"}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">{c.target}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{c.subject}</p>
                      {c.status === "sent" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="text-green-400">{c.sentCount} sent</span>
                          {c.failedCount > 0 && <span className="text-red-400 ml-2">{c.failedCount} failed</span>}
                          {c.sentAt && <span className="ml-2">· {fmtDate(c.sentAt)}</span>}
                        </p>
                      )}
                      {c.status === "draft" && (
                        <p className="text-xs text-muted-foreground mt-1">Created {fmtDate(c.createdAt)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewCampaign(c)}
                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {c.status === "draft" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSendCampaign(c)}
                            disabled={campaignSending === c.id}
                          >
                            {campaignSending === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            <span className="ml-1.5">Send</span>
                          </Button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LOGS TAB ──────────────────────────────────────────────────────── */}
      {tab === "logs" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{logsTotal} total email records</p>
            <button onClick={() => fetchLogs(0)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No email logs yet.</p>
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-secondary/30">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Recipient</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide hidden md:table-cell">Subject</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide hidden lg:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground font-medium">
                              {TYPE_LABELS[log.emailType] || log.emailType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground text-xs leading-tight">{log.recipientEmail}</div>
                            {log.recipientName && <div className="text-xs text-muted-foreground">{log.recipientName}</div>}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-muted-foreground truncate max-w-[200px] block">{log.subject}</span>
                          </td>
                          <td className="px-4 py-3">
                            {log.status === "sent" ? (
                              <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" /> Sent
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-400 text-xs font-medium" title={log.errorMessage || undefined}>
                                <XCircle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(log.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {logsTotal > 50 && (
                <div className="flex justify-center gap-3 mt-4">
                  <Button variant="outline" size="sm" disabled={logsOffset === 0} onClick={() => fetchLogs(Math.max(0, logsOffset - 50))}>
                    Previous
                  </Button>
                  <span className="flex items-center text-sm text-muted-foreground">
                    {logsOffset + 1}–{Math.min(logsOffset + 50, logsTotal)} of {logsTotal}
                  </span>
                  <Button variant="outline" size="sm" disabled={logsOffset + 50 >= logsTotal} onClick={() => fetchLogs(logsOffset + 50)}>
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewCampaign(null)}>
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">{previewCampaign.title}</h3>
                <p className="text-sm text-muted-foreground">{previewCampaign.subject}</p>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-4">
              <pre className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-4 overflow-auto whitespace-pre-wrap font-mono">
                {previewCampaign.htmlContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Campaign"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        busyLabel="Deleting..."
        onConfirm={handleDeleteCampaign}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
