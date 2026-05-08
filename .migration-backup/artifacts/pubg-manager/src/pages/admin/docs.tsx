import { AdminLayout } from "@/components/AdminLayout";
import { Printer, BookOpen } from "lucide-react";

export function AdminDocs() {
  const handlePrint = () => window.print();

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white">DOCUMENTATION</h1>
              <p className="text-muted-foreground mt-1">Operating manual — print as PDF or share with your team.</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="bg-primary text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Download / Print PDF
          </button>
        </div>

        <article id="docs-print" className="bg-card border border-border rounded-2xl p-6 sm:p-10 prose prose-invert max-w-none print:bg-white print:text-black print:border-0 print:p-0">
          <header className="mb-8 not-prose">
            <h1 className="text-3xl font-bold print:text-black text-white">PUBG Account Manager — Documentation</h1>
            <p className="text-muted-foreground print:text-gray-600">Version 1.0 · {new Date().toLocaleDateString()}</p>
          </header>

          <h2 className="text-xl font-bold mt-6 mb-2 print:text-black text-white">1. Overview</h2>
          <p className="text-muted-foreground print:text-gray-700">
            PUBG Account Manager is a multi-seller marketplace for buying, selling, and managing PUBG game accounts.
            It supports admin-managed inventory, third-party seller listings (with KYC verification), customer accounts,
            chat, and full transaction tracking.
          </p>

          <h2 className="text-xl font-bold mt-6 mb-2 print:text-black text-white">2. Roles</h2>
          <ul className="list-disc pl-6 text-muted-foreground print:text-gray-700">
            <li><strong>Admin</strong> — full access; manages inventory, sellers, customers, settings, and activity logs.</li>
            <li><strong>Seller</strong> — registers, completes CNIC + selfie verification, and submits listings (which go to the under-review queue).</li>
            <li><strong>Customer</strong> — browses public listings, chats with admin, and views their purchase history.</li>
          </ul>

          <h2 className="text-xl font-bold mt-6 mb-2 print:text-black text-white">3. Account Statuses</h2>
          <table className="w-full text-left text-sm print:text-black text-muted-foreground border border-border print:border-gray-300">
            <thead>
              <tr className="bg-secondary/50 print:bg-gray-100">
                <th className="p-2 border border-border print:border-gray-300">Status</th>
                <th className="p-2 border border-border print:border-gray-300">Public visible</th>
                <th className="p-2 border border-border print:border-gray-300">Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="p-2 border border-border print:border-gray-300"><b>active</b></td><td className="p-2 border border-border print:border-gray-300">Yes</td><td className="p-2 border border-border print:border-gray-300">Listed and ready to sell.</td></tr>
              <tr><td className="p-2 border border-border print:border-gray-300"><b>reserved</b></td><td className="p-2 border border-border print:border-gray-300">No</td><td className="p-2 border border-border print:border-gray-300">Held for a specific buyer.</td></tr>
              <tr><td className="p-2 border border-border print:border-gray-300"><b>under_review</b></td><td className="p-2 border border-border print:border-gray-300">No</td><td className="p-2 border border-border print:border-gray-300">Submitted by seller, pending admin approval.</td></tr>
              <tr><td className="p-2 border border-border print:border-gray-300"><b>hidden</b></td><td className="p-2 border border-border print:border-gray-300">No</td><td className="p-2 border border-border print:border-gray-300">Manually removed from the storefront.</td></tr>
              <tr><td className="p-2 border border-border print:border-gray-300"><b>sold</b></td><td className="p-2 border border-border print:border-gray-300">No</td><td className="p-2 border border-border print:border-gray-300">Full payment completed.</td></tr>
              <tr><td className="p-2 border border-border print:border-gray-300"><b>installment</b></td><td className="p-2 border border-border print:border-gray-300">No</td><td className="p-2 border border-border print:border-gray-300">Sold with pending installments.</td></tr>
            </tbody>
          </table>

          <h2 className="text-xl font-bold mt-6 mb-2 print:text-black text-white">4. Seller Onboarding</h2>
          <ol className="list-decimal pl-6 text-muted-foreground print:text-gray-700">
            <li>Every new user first signs up as a <strong>customer</strong> at <code>/signup</code> (name, phone, password).</li>
            <li>After login, the customer clicks <strong>"Become a Seller"</strong> in the header to open the verification form (CNIC #, CNIC front + back photo, selfie).</li>
            <li>Admin reviews the application at <strong>Admin → Sellers</strong>, opens the detail page, verifies documents.</li>
            <li>Admin clicks <strong>Approve</strong> (or Reject with reason). Approved users immediately gain seller access — they don't need a separate seller login.</li>
            <li>Approved seller submits listings; each listing enters <code>under_review</code> until an admin moves it to <code>active</code>.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6 mb-2 print:text-black text-white">5. Selling Workflow</h2>
          <ol className="list-decimal pl-6 text-muted-foreground print:text-gray-700">
            <li>Open the account in <strong>Admin → Accounts</strong>.</li>
            <li>Click <strong>Sell</strong>, fill in customer name + contact + final price.</li>
            <li>Choose <strong>Full</strong> (one-shot) or <strong>Installment</strong>.</li>
            <li>For installment, record each payment under the account detail page.</li>
            <li>Update <strong>links</strong> (twitter, google, mail, etc.) as ownership transfers — old_owner → my_controlled → transferred.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6 mb-2 print:text-black text-white">6. Activity Log</h2>
          <p className="text-muted-foreground print:text-gray-700">
            Every important action — seller approvals, account creation, status changes, settings updates, sales — is recorded in
            <strong> Admin → Activity</strong>. Use it as your audit trail and for resolving disputes.
          </p>

          <h2 className="text-xl font-bold mt-6 mb-2 print:text-black text-white">7. Settings</h2>
          <p className="text-muted-foreground print:text-gray-700">
            Customize the public site (name, tagline, footer, support email, WhatsApp), toggle seller registration, and rotate
            admin credentials at <strong>Admin → Settings</strong>.
          </p>

          <h2 className="text-xl font-bold mt-6 mb-2 print:text-black text-white">8. Data &amp; Backups</h2>
          <p className="text-muted-foreground print:text-gray-700">
            All data lives in the project's PostgreSQL database. Verification photos and listing images are stored in object storage
            and served through an authenticated <code>/api/storage/objects/*</code> route.
          </p>

          <footer className="mt-10 pt-4 border-t border-border print:border-gray-300 text-xs text-muted-foreground print:text-gray-500">
            Generated from the live admin panel — print to PDF for an offline copy.
          </footer>
        </article>

        <style>{`
          @media print {
            body { background: white !important; }
            aside, nav, header, .print\\:hidden { display: none !important; }
            #docs-print, #docs-print * { color: black !important; }
            #docs-print { padding: 0 !important; }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}
