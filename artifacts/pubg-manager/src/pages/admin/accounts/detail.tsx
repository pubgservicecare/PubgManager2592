import { AdminLayout } from "@/components/AdminLayout";
import { Modal } from "@/components/ui/modal";
import { 
  useGetAccount, useDeleteAccount, useSellAccount, 
  useCreateAccountLink, useUpdateAccountLink, useDeleteAccountLink,
  useAddPayment, useAddScheduledPayment, useEditPayment, useMarkPaymentPaid, useReversePayment,
  useUpdateAccountStatus
} from "@workspace/api-client-react";
import type { Payment } from "@workspace/api-client-react";
import { useLocation, useRoute } from "wouter";
import { useState } from "react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/helpers";
import { ArrowLeft, Edit, Trash2, ShoppingCart, Link as LinkIcon, DollarSign, History, AlertCircle, Plus, Check, Eye, EyeOff, Copy, User as UserIcon, ChevronRight, Calendar, Download, RotateCcw, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link as WLink } from "wouter";

export function AdminAccountDetail() {
  const [, params] = useRoute("/admin/accounts/:id");
  const id = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"info"|"links"|"payments"|"history">("info");
  
  // Modals state
  const [sellModal, setSellModal] = useState(false);
  const [linkModal, setLinkModal] = useState<{isOpen: boolean, editId?: number, type: any, login: string, password: string, value: string, status: any}>({isOpen: false, type: "twitter", login: "", password: "", value: "", status: "my_controlled"});
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [editPaymentModal, setEditPaymentModal] = useState<{open: boolean, payment?: Payment}>({open: false});
  const [reverseModal, setReverseModal] = useState<{open: boolean, payment?: Payment}>({open: false});

  const { data: account, isLoading } = useGetAccount(id);
  const invalidateAll = () => {
    queryClient.invalidateQueries({queryKey: [`/api/accounts/${id}`]});
    queryClient.invalidateQueries({queryKey: [`/api/accounts/${id}/payments`]});
    queryClient.invalidateQueries({queryKey: [`/api/dashboard`]});
  };
  const deleteMutation = useDeleteAccount({ mutation: { onSuccess: () => setLocation("/admin/accounts") } });
  const sellMutation = useSellAccount({ mutation: { onSuccess: () => { setSellModal(false); invalidateAll(); } } });
  
  const createLinkMut = useCreateAccountLink({ mutation: { onSuccess: () => { setLinkModal({isOpen: false, type: "twitter", login: "", password: "", value: "", status: "my_controlled"}); invalidateAll(); } } });
  const updateLinkMut = useUpdateAccountLink({ mutation: { onSuccess: () => { setLinkModal({isOpen: false, type: "twitter", login: "", password: "", value: "", status: "my_controlled"}); invalidateAll(); } } });
  const deleteLinkMut = useDeleteAccountLink({ mutation: { onSuccess: () => invalidateAll() } });
  const addPaymentMut = useAddPayment({ mutation: { onSuccess: () => { setPaymentModal(false); invalidateAll(); } } });
  const addScheduledMut = useAddScheduledPayment({ mutation: { onSuccess: () => { setScheduleModal(false); invalidateAll(); } } });
  const editPaymentMut = useEditPayment({ mutation: { onSuccess: () => { setEditPaymentModal({open: false}); invalidateAll(); } } });
  const markPaidMut = useMarkPaymentPaid({ mutation: { onSuccess: () => invalidateAll() } });
  const reversePaymentMut = useReversePayment({ mutation: { onSuccess: () => { setReverseModal({open: false}); invalidateAll(); } } });
  const updateStatusMut = useUpdateAccountStatus({ mutation: { onSuccess: () => invalidateAll() } });

  if (isLoading || !account) return <AdminLayout><div className="animate-pulse h-96 bg-card rounded-2xl"></div></AdminLayout>;

  const profit = account.finalSoldPrice ? account.finalSoldPrice - (account.purchasePrice || 0) : null;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation("/admin/accounts")} className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{account.title}</h1>
            <p className="text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-3 mt-1">
              <span>ID: {account.accountId}</span>
              <select
                value={account.status}
                onChange={(e) => updateStatusMut.mutate({ id, data: { status: e.target.value as any } })}
                disabled={updateStatusMut.isPending || account.status === "sold" || account.status === "installment"}
                title={account.status === "sold" || account.status === "installment" ? "Use Sell flow to change sold/installment status" : "Change listing status"}
                className="bg-secondary border border-border focus:border-primary rounded-md px-2 py-1 text-[11px] font-bold uppercase text-white outline-none disabled:opacity-60"
              >
                <option value="active">Active</option>
                <option value="reserved">Reserved</option>
                <option value="under_review">Under Review</option>
                <option value="hidden">Hidden</option>
                {(account.status === "sold" || account.status === "installment") && (
                  <option value={account.status}>{account.status}</option>
                )}
              </select>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {account.status === 'active' && (
            <button onClick={() => setSellModal(true)} className="hidden sm:flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-lg">
              <ShoppingCart className="w-4 h-4" /> Sell
            </button>
          )}
          <button onClick={() => setLocation(`/admin/accounts/${id}/edit`)} className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl transition-colors border border-primary/20">
            <Edit className="w-5 h-5" />
          </button>
          <button onClick={() => {if(confirm("Delete this account?")) deleteMutation.mutate({id})}} className="p-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-colors border border-destructive/20">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase">Purchase Price</p>
          <p className="text-lg font-display font-bold text-white mt-1">{formatCurrency(account.purchasePrice)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase">Sale/List Price</p>
          <p className="text-lg font-display font-bold text-primary mt-1">{formatCurrency(account.status === 'active' ? account.priceForSale : account.finalSoldPrice)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase">Profit</p>
          <p className={`text-lg font-display font-bold mt-1 ${profit && profit > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
            {profit ? formatCurrency(profit) : '---'}
          </p>
        </div>
        {account.status === 'installment' && (
          <>
            <div className="bg-card border border-accent/30 rounded-xl p-4">
              <p className="text-xs font-bold text-accent uppercase">Total Paid</p>
              <p className="text-lg font-display font-bold text-white mt-1">{formatCurrency(account.totalPaid)}</p>
            </div>
            <div className="bg-card border border-destructive/30 rounded-xl p-4">
              <p className="text-xs font-bold text-destructive uppercase">Remaining</p>
              <p className="text-lg font-display font-bold text-white mt-1">{formatCurrency(account.remainingAmount)}</p>
            </div>
          </>
        )}
      </div>

      {/* Seller Profile Link (only shown when listing was created by a seller) */}
      {account.sellerId && account.sellerName && (
        <WLink href={`/admin/sellers/${account.sellerId}`}>
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 mb-8 cursor-pointer hover:border-amber-500/60 transition-colors flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Listed by Seller</p>
              <p className="text-base font-display font-bold text-white truncate">{account.sellerName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">View profile, contact &amp; live chat</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-300 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </WLink>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto hide-scrollbar">
        {[
          { id: "info", label: "Details", icon: AlertCircle },
          { id: "links", label: "Access Links", icon: LinkIcon, badge: account.pendingLinksCount },
          { id: "payments", label: "Payments", icon: DollarSign, hide: account.status !== 'installment' },
          { id: "history", label: "History Log", icon: History },
        ].filter(t => !t.hide).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold whitespace-nowrap transition-colors ${
              activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white hover:border-border'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge ? (
              <span className="ml-2 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-2xl p-6 min-h-[400px]">
        {activeTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">Description</h3>
                <div className="bg-secondary/50 rounded-xl p-4 text-white whitespace-pre-wrap">
                  {account.description || <span className="italic opacity-50">No description</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase mb-1">Created At</h3>
                  <p className="text-white">{formatDate(account.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase mb-1">Purchased On</h3>
                  <p className="text-white">{formatDate(account.purchaseDate)}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-1">Old Owner Contact</h3>
                <p className="text-white">{account.previousOwnerContact || "---"}</p>
              </div>
              {account.status !== 'active' && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <h3 className="text-sm font-bold text-primary uppercase mb-2">Buyer Information</h3>
                  <p className="text-white font-bold">{account.customerName}</p>
                  <p className="text-muted-foreground text-sm mt-1">{account.customerContact}</p>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">Showcase Video</h3>
              {account.videoUrl ? (
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-border">
                  {account.videoUrl.includes("youtu") ? (
                    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${account.videoUrl.split("v=")[1]?.split("&")[0] || account.videoUrl.split("youtu.be/")[1]?.split("?")[0]}`} />
                  ) : (
                    <video className="w-full h-full object-contain" src={account.videoUrl} controls />
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-secondary rounded-xl flex items-center justify-center border border-border">
                  <span className="text-muted-foreground font-bold">No Video Provided</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "links" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Login Bindings</h3>
              <button 
                onClick={() => { setShowLinkPassword(false); setLinkModal({isOpen: true, type: "twitter", login: "", password: "", value: "", status: "my_controlled"}); }}
                className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-white px-4 py-2 rounded-xl transition-colors border border-border"
              >
                <Plus className="w-4 h-4" /> Add Link
              </button>
            </div>
            
            <div className="space-y-3">
              {account.links.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">No links added yet.</div>
              ) : (
                account.links.map(link => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onEdit={() => { setShowLinkPassword(false); setLinkModal({isOpen: true, editId: link.id, type: link.type as any, login: link.login, password: link.password, value: link.value, status: link.status as any}); }}
                    onDelete={() => { if(confirm("Delete link?")) deleteLinkMut.mutate({id, linkId: link.id}); }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div>
            {/* Summary tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-secondary/30 border border-border/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground uppercase font-bold">Total Agreed</p>
                <p className="font-display font-bold text-white text-lg">{formatCurrency(account.finalSoldPrice)}</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <p className="text-xs text-green-400 uppercase font-bold">Paid</p>
                <p className="font-display font-bold text-green-400 text-lg">{formatCurrency(account.totalPaid || 0)}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-400 uppercase font-bold">Remaining</p>
                <p className="font-display font-bold text-amber-400 text-lg">{formatCurrency(account.remainingAmount || 0)}</p>
              </div>
              <div className={`border rounded-xl p-3 ${(account.overdueCount || 0) > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-secondary/30 border-border/50'}`}>
                <p className={`text-xs uppercase font-bold ${(account.overdueCount || 0) > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>Overdue / Due Soon</p>
                <p className={`font-display font-bold text-lg ${(account.overdueCount || 0) > 0 ? 'text-red-400' : 'text-white'}`}>{account.overdueCount || 0} / {account.dueSoonCount || 0}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <h3 className="text-lg font-bold text-white">Installment Payments</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleModal(true)}
                  className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm"
                >
                  <Calendar className="w-4 h-4" /> Add Scheduled
                </button>
                <button 
                  onClick={() => setPaymentModal(true)}
                  className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-4 py-2 rounded-xl transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Record Payment
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <PaymentList
                accountId={id}
                onEdit={(p) => setEditPaymentModal({open: true, payment: p})}
                onReverse={(p) => setReverseModal({open: true, payment: p})}
                onMarkPaid={(p) => markPaidMut.mutate({ id, paymentId: p.id, data: {} })}
                isMarkingPaid={markPaidMut.isPending}
              />
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <HistoryList accountId={id} />
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={sellModal} onClose={() => setSellModal(false)} title="SELL ACCOUNT">
        <form onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          sellMutation.mutate({
            id,
            data: {
              customerName: fd.get("name") as string,
              customerContact: fd.get("contact") as string,
              finalSoldPrice: Number(fd.get("price")),
              paymentType: fd.get("type") as any,
              installmentTotal: fd.get("type") === "installment" ? Number(fd.get("total")) : null
            }
          })
        }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Buyer Name</label>
            <input required name="name" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Contact Info</label>
            <input required name="contact" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Final Sold Price (PKR)</label>
            <input required type="number" name="price" defaultValue={account.priceForSale} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
            <p className="text-xs text-muted-foreground">This calculates your profit against purchase price.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Payment Type</label>
            <select required name="type" id="payType" onChange={e => {
              document.getElementById("instGroup")!.style.display = e.target.value === 'installment' ? 'block' : 'none';
            }} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white">
              <option value="full">Full Payment Upfront</option>
              <option value="installment">Installment Plan</option>
            </select>
          </div>
          <div id="instGroup" style={{display: 'none'}} className="space-y-2 p-4 bg-accent/10 border border-accent/20 rounded-xl">
            <label className="text-xs font-bold text-accent uppercase">Total agreed amount (if different from sold price)</label>
            <input type="number" name="total" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
          </div>
          <button disabled={sellMutation.isPending} type="submit" className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl">Confirm Sale</button>
        </form>
      </Modal>

      <Modal isOpen={linkModal.isOpen} onClose={() => setLinkModal({isOpen: false, type: "twitter", login: "", password: "", value: "", status: "my_controlled"})} title={linkModal.editId ? "EDIT LINK" : "ADD LINK"}>
        <form onSubmit={e => {
          e.preventDefault();
          const payload = {
            type: linkModal.type,
            login: linkModal.login,
            password: linkModal.password,
            value: linkModal.login,
            status: linkModal.status,
          };
          if (linkModal.editId) updateLinkMut.mutate({ id, linkId: linkModal.editId, data: payload });
          else createLinkMut.mutate({ id, data: payload });
        }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Link Type</label>
            <select value={linkModal.type} onChange={e => setLinkModal({...linkModal, type: e.target.value as any})} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white">
              {['twitter', 'google', 'facebook', 'game_center', 'apple', 'tiktok', 'whatsapp', 'number', 'mail'].map(t => (
                <option key={t} value={t}>{t.toUpperCase().replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Login / Email / Username</label>
            <input
              required
              placeholder="e.g. user@gmail.com or +923001234567"
              value={linkModal.login}
              onChange={e => setLinkModal({...linkModal, login: e.target.value})}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Password</label>
            <div className="relative">
              <input
                required
                type={showLinkPassword ? "text" : "password"}
                placeholder="Account password"
                value={linkModal.password}
                onChange={e => setLinkModal({...linkModal, password: e.target.value})}
                className="w-full bg-background border border-border rounded-xl px-4 py-2 pr-20 text-white placeholder:text-muted-foreground font-mono"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button type="button" onClick={() => setShowLinkPassword(!showLinkPassword)} className="p-1.5 text-muted-foreground hover:text-white rounded-lg transition-colors">
                  {showLinkPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {linkModal.password && (
                  <button type="button" onClick={() => navigator.clipboard.writeText(linkModal.password)} className="p-1.5 text-muted-foreground hover:text-white rounded-lg transition-colors" title="Copy password">
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Link Status</label>
            <select value={linkModal.status} onChange={e => setLinkModal({...linkModal, status: e.target.value as any})} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white">
              <option value="old_owner">Old Owner Link (Pending)</option>
              <option value="my_controlled">My Controlled Link</option>
              {account.status !== 'active' && <option value="transferred">Transferred to Customer</option>}
            </select>
          </div>
          <button disabled={createLinkMut.isPending || updateLinkMut.isPending} type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl">
            {createLinkMut.isPending || updateLinkMut.isPending ? "Saving..." : "Save Link"}
          </button>
        </form>
      </Modal>

      <Modal isOpen={paymentModal} onClose={() => setPaymentModal(false)} title="RECORD PAYMENT">
        <form onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addPaymentMut.mutate({ id, data: { 
            amount: Number(fd.get("amount")),
            note: (fd.get("note") as string) || null,
            paymentDate: (fd.get("paymentDate") as string) || null,
            dueDate: (fd.get("dueDate") as string) || null,
          } });
        }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Amount Received (PKR)</label>
            <input required type="number" name="amount" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Payment Date</label>
              <input type="date" name="paymentDate" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Due Date (Optional)</label>
              <input type="date" name="dueDate" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Note (Optional)</label>
            <input type="text" name="note" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
          </div>
          <button disabled={addPaymentMut.isPending} type="submit" className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 rounded-xl">Record Payment</button>
        </form>
      </Modal>

      <Modal isOpen={scheduleModal} onClose={() => setScheduleModal(false)} title="ADD SCHEDULED PAYMENT">
        <form onSubmit={e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addScheduledMut.mutate({ id, data: {
            amount: Number(fd.get("amount")),
            dueDate: fd.get("dueDate") as string,
            note: (fd.get("note") as string) || null,
          } });
        }} className="space-y-4">
          <p className="text-xs text-muted-foreground">Customer ko upcoming installment ke liye due date schedule karein. Mark Paid se baad mein receive karain.</p>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Expected Amount (PKR)</label>
            <input required type="number" name="amount" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Due Date</label>
            <input required type="date" name="dueDate" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Note (Optional)</label>
            <input type="text" name="note" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
          </div>
          <button disabled={addScheduledMut.isPending} type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl">Add Scheduled</button>
        </form>
      </Modal>

      <Modal isOpen={editPaymentModal.open} onClose={() => setEditPaymentModal({open: false})} title="EDIT PAYMENT">
        {editPaymentModal.payment && (
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const amountStr = fd.get("amount") as string;
            const paymentDate = fd.get("paymentDate") as string;
            const dueDate = fd.get("dueDate") as string;
            editPaymentMut.mutate({ id, paymentId: editPaymentModal.payment!.id, data: {
              amount: amountStr ? Number(amountStr) : null,
              note: (fd.get("note") as string) || null,
              dueDate: dueDate || null,
              paymentDate: paymentDate || null,
            } });
          }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Amount (PKR)</label>
              <input type="number" name="amount" defaultValue={editPaymentModal.payment.amount} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Payment Date</label>
                <input type="date" name="paymentDate" defaultValue={editPaymentModal.payment.paidAt ? editPaymentModal.payment.paidAt.split('T')[0] : ''} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Due Date</label>
                <input type="date" name="dueDate" defaultValue={editPaymentModal.payment.dueDate ? editPaymentModal.payment.dueDate.split('T')[0] : ''} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Note</label>
              <input type="text" name="note" defaultValue={editPaymentModal.payment.note || ''} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
            </div>
            <button disabled={editPaymentMut.isPending} type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl">Save Changes</button>
          </form>
        )}
      </Modal>

      <Modal isOpen={reverseModal.open} onClose={() => setReverseModal({open: false})} title="REVERSE PAYMENT">
        {reverseModal.payment && (
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            reversePaymentMut.mutate({ id, paymentId: reverseModal.payment!.id, data: {
              reason: (fd.get("reason") as string) || null,
            } });
          }} className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-sm text-red-300">Yeh payment ko reverse karega — ek refund entry banegi (original payment delete nahi hoga, audit ke liye).</p>
              <p className="text-sm text-white mt-2 font-bold">Amount: {formatCurrency(reverseModal.payment.amount)}</p>
              {reverseModal.payment.receiptNumber && <p className="text-xs text-muted-foreground mt-1 font-mono">Receipt: {reverseModal.payment.receiptNumber}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Reason (Optional)</label>
              <input type="text" name="reason" placeholder="e.g. cheque bounced, customer refund" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-white" />
            </div>
            <button disabled={reversePaymentMut.isPending} type="submit" className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white font-bold py-3 rounded-xl">Confirm Reversal</button>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}

// Subcomponents for tabs
import { useGetAccountHistory, useListAccountPayments } from "@workspace/api-client-react";

function HistoryList({ accountId }: { accountId: number }) {
  const { data: history, isLoading } = useGetAccountHistory(accountId);
  if (isLoading) return <div className="animate-pulse h-32 bg-secondary/30 rounded-xl"></div>;
  if (!history?.length) return <div className="text-muted-foreground text-center py-8">No history recorded yet.</div>;
  
  return (
    <div className="relative border-l border-border ml-3 space-y-6 pb-4">
      {history.map(item => (
        <div key={item.id} className="relative pl-6">
          <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-background"></div>
          <p className="font-bold text-white uppercase text-sm">{item.action.replace(/_/g, " ")}</p>
          {item.details && <p className="text-sm text-slate-300 mt-1">{item.details}</p>}
          <p className="text-xs text-muted-foreground mt-1 font-mono">{formatDateTime(item.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function getPaymentStatus(p: Payment): { label: string; color: string; icon: any } {
  if (p.isReversal) return { label: "Reversed", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: RotateCcw };
  if (p.paidAt) return { label: "Paid", color: "text-green-400 bg-green-500/10 border-green-500/30", icon: Check };
  if (p.dueDate) {
    const due = new Date(p.dueDate);
    const today = new Date(); today.setHours(0,0,0,0);
    if (due < today) return { label: "Overdue", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: AlertCircle };
    const diff = (due.getTime() - today.getTime()) / (1000*60*60*24);
    if (diff <= 7) return { label: "Due Soon", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: Clock };
  }
  return { label: "Pending", color: "text-slate-300 bg-secondary border-border", icon: Clock };
}

function PaymentList({
  accountId,
  onEdit,
  onReverse,
  onMarkPaid,
  isMarkingPaid,
}: {
  accountId: number;
  onEdit: (p: Payment) => void;
  onReverse: (p: Payment) => void;
  onMarkPaid: (p: Payment) => void;
  isMarkingPaid: boolean;
}) {
  const { data: payments, isLoading } = useListAccountPayments(accountId);
  if (isLoading) return <div className="animate-pulse h-32 bg-secondary/30 rounded-xl"></div>;
  if (!payments?.length) return <div className="text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">No payments recorded.</div>;

  const downloadReceipt = (paymentId: number) => {
    window.open(`/api/accounts/${accountId}/payments/${paymentId}/receipt`, "_blank");
  };

  return (
    <>
      {payments.map(p => {
        const status = getPaymentStatus(p);
        const StatusIcon = status.icon;
        const isPaid = !!p.paidAt && !p.isReversal;
        const isScheduled = !p.paidAt && !p.isReversal;
        return (
          <div key={p.id} className={`p-4 bg-secondary/30 border border-border/50 rounded-xl ${p.isReversal ? 'opacity-80' : ''}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-display font-bold text-lg ${p.isReversal ? 'text-red-400' : 'text-accent'}`}>
                    {p.isReversal ? '-' : ''}{formatCurrency(p.amount)}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase border px-2 py-0.5 rounded-md ${status.color}`}>
                    <StatusIcon className="w-3 h-3" /> {status.label}
                  </span>
                  {p.receiptNumber && <span className="text-[10px] text-muted-foreground font-mono">#{p.receiptNumber}</span>}
                </div>
                {p.note && <p className="text-sm text-slate-300 mt-1">{p.note}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2 font-mono">
                  {p.dueDate && <span>Due: {formatDate(p.dueDate)}</span>}
                  {p.paidAt && <span>Paid: {formatDate(p.paidAt)}</span>}
                  {!p.paidAt && !p.dueDate && <span>{formatDateTime(p.createdAt)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {isScheduled && (
                  <button onClick={() => onMarkPaid(p)} disabled={isMarkingPaid} className="px-3 py-1.5 text-xs font-bold text-green-400 hover:bg-green-500/10 border border-green-500/30 rounded-lg transition-colors flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Mark Paid
                  </button>
                )}
                {isPaid && p.receiptNumber && (
                  <button onClick={() => downloadReceipt(p.id)} className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 border border-primary/30 rounded-lg transition-colors flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Receipt
                  </button>
                )}
                {!p.isReversal && (
                  <button onClick={() => onEdit(p)} className="px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {isPaid && (
                  <button onClick={() => onReverse(p)} className="px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" /> Reverse
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

type LinkAny = {
  id: number;
  accountId: number;
  type: string;
  login: string;
  password: string;
  value: string;
  status: string;
  isPending: boolean;
  createdAt: string;
};

function LinkCard({ link, onEdit, onDelete }: { link: LinkAny; onEdit: () => void; onDelete: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<"login" | "pass" | null>(null);

  const copyToClipboard = (text: string, field: "login" | "pass") => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-secondary/30 border border-border/50 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${link.isPending ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'}`}>
            {link.isPending ? "Pending" : "Clear"}
          </div>
          <p className="font-bold text-white uppercase tracking-wider">{link.type.replace(/_/g, " ")}</p>
          <span className="text-xs text-muted-foreground border border-border/50 rounded px-2 py-0.5">{link.status.replace(/_/g, " ")}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors">Edit</button>
          <button onClick={onDelete} className="px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-background/50 border border-border/40 rounded-lg px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Login</p>
            <p className="text-sm text-white font-mono truncate">{link.login || <span className="text-muted-foreground italic">—</span>}</p>
          </div>
          {link.login && (
            <button onClick={() => copyToClipboard(link.login, "login")} className="shrink-0 p-1.5 text-muted-foreground hover:text-white rounded transition-colors">
              {copied === "login" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-background/50 border border-border/40 rounded-lg px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Password</p>
            <p className="text-sm text-white font-mono truncate">{showPw ? (link.password || <span className="text-muted-foreground italic">—</span>) : link.password ? "••••••••" : <span className="text-muted-foreground italic">—</span>}</p>
          </div>
          <div className="shrink-0 flex gap-0.5">
            <button onClick={() => setShowPw(!showPw)} className="p-1.5 text-muted-foreground hover:text-white rounded transition-colors">
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            {link.password && (
              <button onClick={() => copyToClipboard(link.password, "pass")} className="p-1.5 text-muted-foreground hover:text-white rounded transition-colors">
                {copied === "pass" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
