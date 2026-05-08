import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { PublicLayout } from "@/components/PublicLayout";
import { useSEO } from "@/hooks/use-seo";
import { useSellerAuth } from "@/hooks/use-seller-auth";
import { Save, ArrowLeft, Loader2, Globe, Lock } from "lucide-react";
import { MultiImageUploadField } from "@/components/MultiImageUploadField";

export function SellerAccountForm() {
  useSEO({ title: "Add Listing — Seller" });
  const { seller, isLoading } = useSellerAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/seller/accounts/:id/edit");
  const editId = params?.id ? parseInt(params.id, 10) : null;

  const [form, setForm] = useState({
    title: "",
    accountId: "",
    purchasePrice: "",
    priceForSale: "",
    videoUrl: "",
    description: "",
  });
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (!isLoading && !seller) setLocation("/seller/login");
  }, [seller, isLoading, setLocation]);

  useEffect(() => {
    if (!editId || !seller) return;
    fetch(`/api/seller/accounts`, { credentials: "include" })
      .then((r) => r.json())
      .then((accounts) => {
        const a = accounts.find((x: any) => x.id === editId);
        if (a) {
          setForm({
            title: a.title,
            accountId: a.accountId,
            purchasePrice: a.purchasePrice != null ? String(a.purchasePrice) : "",
            priceForSale: String(a.priceForSale),
            videoUrl: a.videoUrl || "",
            description: a.description || "",
          });
          setImageUrls(a.imageUrls || []);
          setVisibility(a.visibility === "private" ? "private" : "public");
        }
        setLoaded(true);
      });
  }, [editId, seller]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const url = editId ? `/api/seller/accounts/${editId}` : `/api/seller/accounts`;
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          accountId: form.accountId,
          purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
          priceForSale: parseFloat(form.priceForSale),
          videoUrl: form.videoUrl || null,
          imageUrls,
          description: form.description || null,
          visibility,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      setLocation("/seller/dashboard");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !seller || !loaded) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <Link href="/seller/dashboard">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-white text-sm font-semibold mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-5 sm:p-7">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white mb-1 tracking-wider">
            {editId ? "EDIT LISTING" : "NEW LISTING"}
          </h1>
          <p className="text-muted-foreground text-sm mb-5">Fill in the details for your PUBG account</p>

          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-xl mb-4 text-sm font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Title" value={form.title} onChange={set("title")} required placeholder="e.g. Conqueror M416 Glacier" />
            <Field label="Account ID" value={form.accountId} onChange={set("accountId")} required placeholder="In-game character ID" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Your Purchase Price (Rs)"
                type="number"
                value={form.purchasePrice}
                onChange={set("purchasePrice")}
                placeholder="What you paid"
              />
              <Field
                label="Sale Price (Rs)"
                type="number"
                value={form.priceForSale}
                onChange={set("priceForSale")}
                required
                placeholder="What buyers pay"
              />
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              <span className="text-amber-300 font-semibold">Note:</span> Purchase price is private — only you and admin can see it. Customers only see your Sale Price.
            </p>
            <Field label="Video URL (optional)" value={form.videoUrl} onChange={set("videoUrl")} placeholder="YouTube/Drive link to demo video" />

            <MultiImageUploadField
              label="Account Thumbnail"
              hint="Upload a single thumbnail image for your listing — buyers see this as the cover."
              values={imageUrls}
              onChange={setImageUrls}
              max={1}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase block">Description</label>
              <textarea
                value={form.description}
                onChange={set("description")}
                rows={5}
                placeholder="List skins, tier, gun mastery, achievements..."
                className="w-full bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase block">Visibility</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition ${
                    visibility === "public"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                  data-testid="visibility-public"
                >
                  <div className="flex items-center gap-2">
                    <Globe className={`w-4 h-4 ${visibility === "public" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-bold ${visibility === "public" ? "text-white" : "text-muted-foreground"}`}>Publish</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">Live on marketplace. Buyers can see and buy.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition ${
                    visibility === "private"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                  data-testid="visibility-private"
                >
                  <div className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${visibility === "private" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-bold ${visibility === "private" ? "text-white" : "text-muted-foreground"}`}>Private</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">Hidden from buyers. Only you and admin see it.</p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? "Saving..." : editId ? "Save Changes" : "Create Listing"}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, required }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-background border-2 border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none text-sm"
      />
    </div>
  );
}
