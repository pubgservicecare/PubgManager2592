import { useEffect, useState } from "react";
import { LogOut, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  variant?: "logout" | "danger";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  busyLabel = "Please wait...",
  variant = "logout",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const Icon = variant === "logout" ? LogOut : AlertTriangle;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={() => !busy && onCancel()}
      data-testid="confirm-dialog-overlay"
    >
      <div
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-4">
            <Icon className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-lg font-display font-black text-white uppercase tracking-wider">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2">{message}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="py-2.5 rounded-xl border border-border hover:border-white/40 text-white font-bold text-sm transition-colors disabled:opacity-50"
            data-testid="confirm-cancel"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className="py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-sm transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
            data-testid="confirm-action"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
