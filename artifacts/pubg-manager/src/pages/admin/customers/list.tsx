import { AdminLayout } from "@/components/AdminLayout";
import { useListCustomers, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, UserCircle, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/helpers";

interface CustomerLite {
  id: number;
  name: string;
  contact: string;
}

export function AdminCustomersList() {
  const { data: customers, isLoading } = useListCustomers();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerLite | null>(null);
  const [deleting, setDeleting] = useState<CustomerLite | null>(null);
  const qc = useQueryClient();

  const filtered = customers?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact.toLowerCase().includes(search.toLowerCase())
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });

  const updateMut = useUpdateCustomer({ mutation: { onSuccess: () => { invalidate(); setEditing(null); } } });
  const deleteMut = useDeleteCustomer({ mutation: { onSuccess: () => { invalidate(); setDeleting(null); } } });

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white">CUSTOMERS</h1>
        <p className="text-muted-foreground mt-1">Client database and deal history</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border/50 bg-secondary/30">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or contact..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary rounded-xl pl-12 pr-4 py-2.5 text-white outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <th className="px-6 py-4 font-bold">Client Name</th>
                <th className="px-6 py-4 font-bold">Contact</th>
                <th className="px-6 py-4 font-bold">Total Deals</th>
                <th className="px-6 py-4 font-bold">Added On</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No customers found.</td></tr>
              ) : (
                filtered?.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-8 h-8 text-primary" />
                        <span className="font-bold text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-sm">{c.contact}</td>
                    <td className="px-6 py-4 font-bold text-white">
                      <span className="bg-primary/20 text-primary px-2 py-1 rounded-md">{c.deals.length} Account(s)</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">{formatDate(c.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <Link href={`/admin/customers/${c.id}`}>
                          <button className="text-sm font-bold text-primary hover:text-primary-foreground hover:bg-primary px-3 py-2 rounded-lg border border-primary/20 transition-colors">
                            Profile
                          </button>
                        </Link>
                        <button
                          onClick={() => setEditing({ id: c.id, name: c.name, contact: c.contact })}
                          className="p-2 rounded-lg text-white hover:bg-white/10 border border-border transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting({ id: c.id, name: c.name, contact: c.contact })}
                          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditCustomerModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(data) => updateMut.mutate({ id: editing.id, data })}
          isSubmitting={updateMut.isPending}
        />
      )}

      {deleting && (
        <DeleteCustomerModal
          customer={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleteMut.mutate({ id: deleting.id })}
          isSubmitting={deleteMut.isPending}
        />
      )}
    </AdminLayout>
  );
}

export function EditCustomerModal({
  initial,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  initial: { name: string; contact: string };
  onClose: () => void;
  onSubmit: (data: { name: string; contact: string }) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [contact, setContact] = useState(initial.contact);
  const canSubmit = name.trim().length > 0 && contact.trim().length > 0 && !isSubmitting;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-xl font-display font-bold text-white">Edit Customer</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-white outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Contact</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-white outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-white font-bold text-sm"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onSubmit({ name: name.trim(), contact: contact.trim() })}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteCustomerModal({
  customer,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  customer: { name: string; contact: string };
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-destructive/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-display font-bold text-destructive">Delete Customer?</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-300 mb-2">
          You are about to delete <span className="font-bold text-white">{customer.name}</span>{" "}
          <span className="font-mono text-muted-foreground">({customer.contact})</span>.
        </p>
        <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1 mb-5">
          <li>Linked accounts will be detached (NOT deleted) and shown as "No customer".</li>
          <li>Their login (if any) will be removed.</li>
          <li>This action cannot be undone.</li>
        </ul>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-white font-bold text-sm"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-sm disabled:opacity-50"
          >
            {isSubmitting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
