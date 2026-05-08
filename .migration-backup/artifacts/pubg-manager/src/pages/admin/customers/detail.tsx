import { AdminLayout } from "@/components/AdminLayout";
import {
  useGetCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  getGetCustomerQueryKey,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useRoute, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  UserCircle,
  Phone,
  Calendar,
  Pencil,
  Trash2,
  Gamepad2,
  ExternalLink,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDate, formatCurrency } from "@/lib/helpers";
import { EditCustomerModal, DeleteCustomerModal } from "./list";

export function AdminCustomerDetail() {
  const [, params] = useRoute("/admin/customers/:id");
  const id = parseInt(params?.id || "0");
  const { data: customer, isLoading } = useGetCustomer(id);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const updateMut = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCustomerQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        setEditing(false);
      },
    },
  });
  const deleteMut = useDeleteCustomer({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        setLocation("/admin/customers");
      },
    },
  });

  if (isLoading || !customer) return <AdminLayout><div className="animate-pulse h-96 bg-card rounded-2xl"></div></AdminLayout>;

  const totalSpent = customer.deals.reduce((acc, deal) => acc + (deal.finalSoldPrice || 0), 0);

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <Link href="/admin/customers">
          <button className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold text-white uppercase">Client Profile</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-white font-bold text-sm"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={() => setDeleting(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive font-bold text-sm"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl h-max">
          <div className="flex flex-col items-center text-center border-b border-border/50 pb-6 mb-6">
            <UserCircle className="w-20 h-20 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
            <div className="flex items-center gap-2 text-muted-foreground mt-2 bg-secondary px-3 py-1 rounded-full text-sm">
              <Phone className="w-4 h-4" /> {customer.contact}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm font-semibold uppercase">Added</span>
              <span className="text-white font-medium flex items-center gap-2"><Calendar className="w-4 h-4 text-primary"/> {formatDate(customer.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm font-semibold uppercase">Deals</span>
              <span className="text-white font-bold">{customer.deals.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm font-semibold uppercase">Total Value</span>
              <span className="text-primary font-display font-bold text-xl">{formatCurrency(totalSpent)}</span>
            </div>
          </div>
        </div>

        {/* Deals List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <Gamepad2 className="w-5 h-5 text-primary" /> Purchase History
          </h3>

          {customer.deals.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">No accounts purchased yet.</div>
          ) : (
            customer.deals.map(deal => (
              <div key={deal.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/50 transition-colors">
                <div>
                  <h4 className="font-bold text-lg text-white mb-1">{deal.title}</h4>
                  <p className="text-xs text-muted-foreground font-mono">ID: {deal.accountId}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Price</p>
                    <p className="font-display font-bold text-primary text-xl">{formatCurrency(deal.finalSoldPrice ?? deal.priceForSale)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Status</p>
                    <p className={`text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded-md ${deal.status === 'sold' ? 'bg-slate-500/20 text-slate-300' : 'bg-accent/20 text-accent'}`}>{deal.status}</p>
                  </div>
                  <Link href={`/admin/accounts/${deal.id}`}>
                    <button className="p-3 bg-secondary hover:bg-primary/20 hover:text-primary text-white rounded-xl transition-colors">
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editing && (
        <EditCustomerModal
          initial={{ name: customer.name, contact: customer.contact }}
          onClose={() => setEditing(false)}
          onSubmit={(data) => updateMut.mutate({ id, data })}
          isSubmitting={updateMut.isPending}
        />
      )}

      {deleting && (
        <DeleteCustomerModal
          customer={{ name: customer.name, contact: customer.contact }}
          onClose={() => setDeleting(false)}
          onConfirm={() => deleteMut.mutate({ id })}
          isSubmitting={deleteMut.isPending}
        />
      )}
    </AdminLayout>
  );
}
