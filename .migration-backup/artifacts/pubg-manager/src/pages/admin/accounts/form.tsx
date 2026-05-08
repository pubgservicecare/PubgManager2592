import { AdminLayout } from "@/components/AdminLayout";
import { useCreateAccount, useGetAccount, useUpdateAccount } from "@workspace/api-client-react";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { MultiImageUploadField } from "@/components/MultiImageUploadField";

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
    }
  }, [account, isEdit]);

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
            />

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Description</label>
              <textarea rows={5} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-white outline-none resize-none" placeholder="Inventory details, rare items..." />
            </div>

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
