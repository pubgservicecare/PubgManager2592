import { useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { useSEO } from "@/hooks/use-seo";
import { useGetSettings } from "@workspace/api-client-react";
import { ChevronDown, HelpCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How does buying a PUBG account work?",
    a: "Browse the marketplace, pick an account you like, then click 'Buy via WhatsApp' or use Live Chat. Our admin team verifies the account, accepts your payment (full or installment), and securely transfers the credentials to you.",
  },
  {
    q: "Are the accounts safe? Can I get banned?",
    a: "Every listing is hand-checked by our team before going live. We use proven, low-risk transfer methods. As long as you follow the change-password and email steps we share at handover, your account stays safe.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept JazzCash, EasyPaisa, bank transfer, and Crypto for full payments. Installment plans are also available — talk to support for the schedule that fits you.",
  },
  {
    q: "How long does the transfer take?",
    a: "Most transfers are completed within 30 minutes after payment is confirmed. For installment accounts, you get full credentials once the final payment is settled.",
  },
  {
    q: "Can I pay in installments?",
    a: "Yes. Many of our accounts support installment plans. The account stays in 'reserved' status while you make payments, and is released to you once cleared.",
  },
  {
    q: "What if the account doesn't match the description?",
    a: "Open Live Chat or message us on WhatsApp within 24 hours. If a listed item is missing or wrong, we will resolve it — refund, swap, or fix.",
  },
  {
    q: "How do I become a seller on the platform?",
    a: "Sign up for a customer account, then click 'Become a Seller' in the header. Submit your CNIC + selfie for verification. Once approved, you can list your own accounts.",
  },
  {
    q: "Is there a referral program?",
    a: "Yes! Share your unique referral code from your dashboard. You'll get a notification each time someone signs up using it.",
  },
  {
    q: "How can I contact support?",
    a: "Use Live Chat from the menu (24/7), WhatsApp from any account page, or email us. We respond fast.",
  },
];

export function FAQPage() {
  useSEO({
    title: "Frequently Asked Questions",
    description: "Everything you need to know about buying PUBG accounts safely from us.",
  });

  const { data: settings } = useGetSettings();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const wa = settings?.whatsappNumber?.replace(/\D/g, "") || "";

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 mb-4">
            <HelpCircle className="w-7 h-7 text-primary" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">
            Help Center
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Quick answers to the most common questions from our buyers and sellers.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const open = openIdx === i;
            return (
              <div
                key={i}
                className={`bg-card border rounded-2xl overflow-hidden transition-colors ${
                  open ? "border-primary/40" : "border-border"
                }`}
                data-testid={`faq-item-${i}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-bold text-white text-sm sm:text-base pr-4">{f.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${
                      open ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {open && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
            Still have a question?
          </h2>
          <p className="text-muted-foreground text-sm mb-5">
            Our team is here 24/7 to help with anything else.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/chat/guest">
              <button className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm w-full sm:w-auto">
                <MessageCircle className="w-4 h-4" /> Open Live Chat
              </button>
            </Link>
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi, I have a question.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white font-bold text-sm"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Us
              </a>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
