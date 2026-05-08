import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useGetCustomerInstallments } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/PublicLayout";
import { formatCurrency, formatDate } from "@/lib/helpers";
import { ArrowLeft, AlertTriangle, Clock, Check, Download, RotateCcw, CalendarClock, CreditCard } from "lucide-react";

export function CustomerInstallments() {
  const { customer, isLoading: authLoading } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const { data: accounts, isLoading } = useGetCustomerInstallments({
    query: { enabled: !!customer, queryKey: ["/api/customer/installments"] },
  });

  useEffect(() => {
    if (!authLoading && !customer) setLocation("/login");
  }, [customer, authLoading, setLocation]);

  if (authLoading || !customer || isLoading) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
        </div>
      </PublicLayout>
    );
  }

  const totalOverdue = (accounts || []).reduce((s, a) => s + (a.overdueCount || 0), 0);
  const totalDueSoon = (accounts || []).reduce((s, a) => s + (a.dueSoonCount || 0), 0);

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/my">
            <button className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider">My Installments</h1>
            <p className="text-sm text-muted-foreground">Payments, due dates &amp; receipts</p>
          </div>
        </div>

        {totalOverdue > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-destructive">{totalOverdue} payment{totalOverdue === 1 ? "" : "s"} overdue</p>
              <p className="text-sm text-muted-foreground">Please clear your dues to avoid account hold.</p>
            </div>
          </div>
        )}
        {totalOverdue === 0 && totalDueSoon > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <CalendarClock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">{totalDueSoon} payment{totalDueSoon === 1 ? "" : "s"} due within 7 days</p>
              <p className="text-sm text-muted-foreground">Please prepare to make your upcoming payment.</p>
            </div>
          </div>
        )}

        {(!accounts || accounts.length === 0) ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-white font-bold">No installment plans yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your installment purchases will appear here.</p>
          </div>
        ) : (
          accounts.map((acc) => (
            <div key={acc.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-display font-bold text-white">{acc.title}</h2>
                  <p className="text-xs text-muted-foreground font-mono">ID: {acc.accountId}</p>
                </div>
                {acc.nextDueDate && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Next Due</p>
                    <p className="text-sm font-bold text-amber-400">{formatDate(acc.nextDueDate)}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/30 border border-border/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Total</p>
                  <p className="font-bold text-white text-sm">{formatCurrency(acc.finalSoldPrice)}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-green-400 uppercase font-bold">Paid</p>
                  <p className="font-bold text-green-400 text-sm">{formatCurrency(acc.totalPaid)}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-amber-400 uppercase font-bold">Remaining</p>
                  <p className="font-bold text-amber-400 text-sm">{formatCurrency(acc.remainingAmount)}</p>
                </div>
              </div>

              {acc.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {acc.payments.map((p) => {
                    const isPaid = !!p.paidAt && !p.isReversal;
                    const isReversed = p.isReversal;
                    let badgeClass = "text-slate-300 bg-secondary border-border";
                    let label = "Pending";
                    let Icon: any = Clock;
                    if (isReversed) { badgeClass = "text-red-400 bg-red-500/10 border-red-500/30"; label = "Reversed"; Icon = RotateCcw; }
                    else if (isPaid) { badgeClass = "text-green-400 bg-green-500/10 border-green-500/30"; label = "Paid"; Icon = Check; }
                    else if (p.dueDate) {
                      const due = new Date(p.dueDate);
                      const today = new Date(); today.setHours(0,0,0,0);
                      if (due < today) { badgeClass = "text-red-400 bg-red-500/10 border-red-500/30"; label = "Overdue"; Icon = AlertTriangle; }
                      else if ((due.getTime() - today.getTime()) / 86400000 <= 7) { badgeClass = "text-amber-400 bg-amber-500/10 border-amber-500/30"; label = "Due Soon"; Icon = CalendarClock; }
                    }

                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-secondary/30 border border-border/50 rounded-xl">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-display font-bold ${isReversed ? 'text-red-400' : 'text-white'}`}>
                              {isReversed ? '-' : ''}{formatCurrency(p.amount)}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase border px-2 py-0.5 rounded-md ${badgeClass}`}>
                              <Icon className="w-3 h-3" /> {label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-1 font-mono">
                            {p.dueDate && <span>Due: {formatDate(p.dueDate)}</span>}
                            {p.paidAt && <span>Paid: {formatDate(p.paidAt)}</span>}
                            {p.receiptNumber && <span>#{p.receiptNumber}</span>}
                          </div>
                        </div>
                        {isPaid && (
                          <a
                            href={`/api/customer/payments/${p.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 border border-primary/30 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" /> Receipt
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </PublicLayout>
  );
}
