import { AdminLayout } from "@/components/AdminLayout";
import { useCreateAccount, useGetAccount, useUpdateAccount } from "@workspace/api-client-react";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Star } from "lucide-react";
import { Link } from "wouter";
import { MultiImageUploadField } from "@/components/MultiImageUploadField";
import { apiUrl } from "@/lib/api-url";

export function AdminAccountForm() {
  const [, params] = useRoute("/admin/accounts/:id/edit");
  const isEdit = !!params?.id;
  const accountId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();

  const { data: account, isLoading: isFetching } = useGetAccount(accountId, {}, { query: { enabled: isEdit } as any });
  
  const [formData, setFormData] = useState({
    title: "",
    accountId: "",
    purchasePrice: "",
    priceForSale: "",
    purchaseDate: "",
    previousOwnerContact: "",
    videoUrl: "",
    description: ""
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState("");
  const [featureBusy, setFeatureBusy] = useState(false);

  useEffect(() => {
    if (account && isEdit) {
      setFormData({
        title: account.title || "",
        accountId: account.accountId || "",
        purchasePrice: account.purchasePrice?.toString() || "",
        priceForSale: account.priceForSale?.toString() || "",
        purchaseDate: account.purchaseDate ? account.purchaseDate.split('T')[0] : "",
        previousOwnerContact: account.previousOwnerContact || "",
        videoUrl: account.videoUrl || "",
        description: account.description || ""
      });
      setImageUrls((account as any).imageUrls || []);
      setIsFeatured(!!(account as any).isFeatured);
      setFeaturedOrder((account as any).featuredOrder?.toString() ?? "");
    }
  }, [account, isEdit]);

  const saveFeatured = async () => {
    if (!isEdit) return;
    setFeatureBusy(true);
    try {
      await fetch(apiUrl(`/api/accounts/${accountId}/feature`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFeatured,
          featuredOrder: featuredOrder !== "" ? Number(featuredOrder) : null,
        }),
      });
    } finally {
      setFeatureBusy(false);
    }
  };

  const createMutation = useCreateAccount({
    mutation: {
      onSuccess: (res) => setLocation(`/admin/accounts/${res.id}`)
    }
  });

  const updateMutation = useUpdateAccount({
    mutation: {
      onSuccess: () => setLocation(`/admin/accounts/${accountId}`)
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      accountId: formData.accountId,
      purchasePrice: Number(formData.purchasePrice),
      priceForSale: Number(formData.priceForSale),
      purchaseDate: formData.purchaseDate || null,
      previousOwnerContact: formData.previousOwnerContact || null,
      videoUrl: formData.videoUrl || null,
      imageUrls,
      description: formData.description || null
    };

    if (isEdit) {
      updateMutation.mutate({ id: accountId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isFetching) return <AdminLayout><div className="animate-pulse h-96 bg-card rounded-2xl"></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href={isEdit ? `/admin/accounts/${accountId}` : "/admin/accounts"}>
            <button className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">
              {isEdit ? "EDIT ACCOUNT" : "NEW ACCOUNT"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEdit ? "Update inventory details" : "Add new inventory to the marketplace"}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase">Title <span className="text-destructive">*</span></label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none" placeholder="e.g. Glacier M416 Max" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase">In-Game ID <span className="text-destructive">*</span></label>
                <input required type="text" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none" placeholder="5123456789" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-secondary/30 rounded-xl border border-border/50">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase flex justify-between">
                  <span>Purchase Price <span className="text-destructive">*</span></span>
                  <span className="text-xs text-primary bg-primary/10 px-2 rounded-full border border-primary/20">Admin Only</span>
                </label>
                <input required type="number" min="0" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase flex justify-between">
                  <span>Sale Price <span className="text-destructive">*</span></span>
                  <span className="text-xs text-green-500 bg-green-500/10 px-2 rounded-full border border-green-500/20">Public View</span>
                </label>
                <input required type="number" min="0" value={formData.priceForSale} onChange={e => setFormData({...formData, priceForSale: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none" placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase">Purchase Date</label>
                <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none [color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase">Old Owner Contact</label>
                <input type="text" value={formData.previousOwnerContact} onChange={e => setFormData({...formData, previousOwnerContact: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none" placeholder="WhatsApp / FB Link" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase flex justify-between">
                <span>Showcase Video URL</span>
                <span className="text-xs normal-case">YouTube or MP4</span>
              </label>
              <input type="url" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none" placeholder="https://youtube.com/..." />
            </div>

            <MultiImageUploadField
              label="Account Images"
              hint="Upload up to 6 screenshots — first image becomes the cover thumbnail."
              values={imageUrls}
              onChange={setImageUrls}
              max={6}
              accountTitle={formData.title}
              uploadContext={{
                uploadType: "account-image",
                accountId: isEdit ? accountId : undefined,
                accountSlug: account?.slug ?? undefined,
              }}
            />

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Description</label>
              <textarea rows={5} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none resize-none" placeholder="Inventory details, rare items..." />
            </div>

            {isEdit && (
              <div className="space-y-4 p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-amber-300 uppercase tracking-wider">Homepage Pinning</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFeatured((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ${
                      isFeatured ? "bg-amber-500 border-amber-500" : "bg-secondary border-border"
                    }`}
                    role="switch"
                    aria-checked={isFeatured}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform duration-200 mt-0.5 ${
                        isFeatured ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <label className="text-sm font-semibold text-white cursor-pointer" onClick={() => setIsFeatured((v) => !v)}>
                    {isFeatured ? "Pinned to homepage" : "Not featured"}
                  </label>
                </div>
                {isFeatured && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Display Order <span className="normal-case text-muted-foreground/60 font-normal">(lower = first, leave blank for auto)</span></label>
                    <input
                      type="number"
                      min="1"
                      value={featuredOrder}
                      onChange={(e) => setFeaturedOrder(e.target.value)}
                      className="w-full sm:w-40 bg-background border border-border focus:border-amber-500 rounded-xl px-4 py-2.5 text-white outline-none"
                      placeholder="e.g. 1"
                    />
                  </div>
                )}
                <button
                  type="button"
                  disabled={featureBusy}
                  onClick={saveFeatured}
                  className="inline-flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  <Star className={`w-4 h-4 ${isFeatured ? "fill-amber-300" : ""}`} />
                  {featureBusy ? "Saving..." : "Save Featured Settings"}
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-border/50">
              <button disabled={isPending} type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                <Save className="w-5 h-5" />
                {isPending ? "SAVING..." : "SAVE ACCOUNT"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
