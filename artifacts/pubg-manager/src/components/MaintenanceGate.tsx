import { useGetSettings } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Wrench, MessageCircle, Mail } from "lucide-react";

const ALLOWED_PATHS = ["/admin"];

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: settings } = useGetSettings();

  const isAllowed = ALLOWED_PATHS.some((p) => location === p || location.startsWith(p + "/"));

  if (!settings?.maintenanceMode || isAllowed) {
    return <>{children}</>;
  }

  const wa = (settings as any).whatsappNumber as string | undefined;
  const email = (settings as any).supportEmail as string | undefined;
  const siteName = settings.siteName || "Our Store";
  const message =
    (settings as any).maintenanceMessage ||
    "We're performing scheduled maintenance. Please check back soon.";
  const logo = (settings as any).logoUrl as string | undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-card border border-border rounded-3xl p-8 sm:p-12 text-center shadow-2xl">
        {logo ? (
          <img
            src={`/api/storage${logo}`}
            alt={siteName}
            className="w-16 h-16 mx-auto mb-6 object-contain rounded-2xl"
          />
        ) : (
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Wrench className="w-8 h-8 text-primary-foreground" />
          </div>
        )}
        <p className="text-xs font-bold text-primary uppercase tracking-[0.3em] mb-3">
          {siteName}
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
          We'll be right back
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed mb-8">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {wa && (
            <a
              href={`https://wa.me/${wa.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp Support
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all"
            >
              <Mail className="w-4 h-4" /> Email Us
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
