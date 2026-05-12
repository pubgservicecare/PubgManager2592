import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider } from "@/hooks/use-auth";
import { CustomerAuthProvider } from "@/hooks/use-customer-auth";
import { SellerAuthProvider } from "@/hooks/use-seller-auth";
import { MaintenanceGate } from "@/components/MaintenanceGate";

// Public Pages — lazy loaded (each becomes its own JS chunk)
const PublicHome = lazy(() =>
  import("@/pages/public/home").then((m) => ({ default: m.PublicHome }))
);
const PublicAccountDetail = lazy(() =>
  import("@/pages/public/account-detail").then((m) => ({ default: m.PublicAccountDetail }))
);
const PublicChat = lazy(() =>
  import("@/pages/public/chat").then((m) => ({ default: m.PublicChat }))
);
const CustomerLoginPage = lazy(() =>
  import("@/pages/public/unified-login").then((m) => ({ default: m.CustomerLoginPage }))
);
const SellerLoginPage = lazy(() =>
  import("@/pages/public/unified-login").then((m) => ({ default: m.SellerLoginPage }))
);
const UnifiedSignup = lazy(() =>
  import("@/pages/public/unified-signup").then((m) => ({ default: m.UnifiedSignup }))
);
const SellerSignupPage = lazy(() =>
  import("@/pages/public/unified-signup").then((m) => ({ default: m.SellerSignupPage }))
);
const CustomerDashboard = lazy(() =>
  import("@/pages/public/customer-dashboard").then((m) => ({ default: m.CustomerDashboard }))
);
const CustomerInstallments = lazy(() =>
  import("@/pages/public/customer-installments").then((m) => ({ default: m.CustomerInstallments }))
);
const WishlistPage = lazy(() =>
  import("@/pages/public/wishlist").then((m) => ({ default: m.WishlistPage }))
);
const FAQPage = lazy(() =>
  import("@/pages/public/faq").then((m) => ({ default: m.FAQPage }))
);
const SellerDashboard = lazy(() =>
  import("@/pages/public/seller-dashboard").then((m) => ({ default: m.SellerDashboard }))
);
const SellerAccountDetail = lazy(() =>
  import("@/pages/public/seller-account-detail").then((m) => ({ default: m.SellerAccountDetail }))
);
const SellerAccountForm = lazy(() =>
  import("@/pages/public/seller-account-form").then((m) => ({ default: m.SellerAccountForm }))
);

// Admin Pages — lazy loaded
const AdminLogin = lazy(() =>
  import("@/pages/admin/login").then((m) => ({ default: m.AdminLogin }))
);
const AdminDashboard = lazy(() =>
  import("@/pages/admin/dashboard").then((m) => ({ default: m.AdminDashboard }))
);
const AdminAccountsList = lazy(() =>
  import("@/pages/admin/accounts/list").then((m) => ({ default: m.AdminAccountsList }))
);
const AdminAccountForm = lazy(() =>
  import("@/pages/admin/accounts/form").then((m) => ({ default: m.AdminAccountForm }))
);
const AdminAccountDetail = lazy(() =>
  import("@/pages/admin/accounts/detail").then((m) => ({ default: m.AdminAccountDetail }))
);
const AdminCustomersList = lazy(() =>
  import("@/pages/admin/customers/list").then((m) => ({ default: m.AdminCustomersList }))
);
const AdminCustomerDetail = lazy(() =>
  import("@/pages/admin/customers/detail").then((m) => ({ default: m.AdminCustomerDetail }))
);
const AdminSellersList = lazy(() =>
  import("@/pages/admin/sellers/list").then((m) => ({ default: m.AdminSellersList }))
);
const AdminSellerDetail = lazy(() =>
  import("@/pages/admin/sellers/detail").then((m) => ({ default: m.AdminSellerDetail }))
);
const AdminChat = lazy(() =>
  import("@/pages/admin/chat").then((m) => ({ default: m.AdminChat }))
);
const AdminSettings = lazy(() =>
  import("@/pages/admin/settings").then((m) => ({ default: m.AdminSettings }))
);
const AdminActivity = lazy(() =>
  import("@/pages/admin/activity").then((m) => ({ default: m.AdminActivity }))
);
const AdminDocs = lazy(() =>
  import("@/pages/admin/docs").then((m) => ({ default: m.AdminDocs }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public Routes */}
        <Route path="/" component={PublicHome} />
        <Route path="/account/:id" component={PublicAccountDetail} />
        <Route path="/chat" component={PublicChat} />
        <Route path="/chat/:sessionId" component={PublicChat} />
        <Route path="/login" component={CustomerLoginPage} />
        <Route path="/signup" component={UnifiedSignup} />
        <Route path="/my" component={CustomerDashboard} />
        <Route path="/my/installments" component={CustomerInstallments} />
        <Route path="/my/wishlist" component={WishlistPage} />
        <Route path="/faq" component={FAQPage} />
        <Route path="/seller/signup" component={SellerSignupPage} />
        <Route path="/seller/login" component={SellerLoginPage} />
        <Route path="/seller/dashboard" component={SellerDashboard} />
        <Route path="/seller/accounts/new" component={SellerAccountForm} />
        <Route path="/seller/accounts/:id/edit" component={SellerAccountForm} />
        <Route path="/seller/accounts/:id" component={SellerAccountDetail} />

        {/* Admin Routes */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/accounts" component={AdminAccountsList} />
        <Route path="/admin/accounts/new" component={AdminAccountForm} />
        <Route path="/admin/accounts/:id" component={AdminAccountDetail} />
        <Route path="/admin/accounts/:id/edit" component={AdminAccountForm} />
        <Route path="/admin/customers" component={AdminCustomersList} />
        <Route path="/admin/customers/:id" component={AdminCustomerDetail} />
        <Route path="/admin/sellers" component={AdminSellersList} />
        <Route path="/admin/sellers/:id" component={AdminSellerDetail} />
        <Route path="/admin/chat" component={AdminChat} />
        <Route path="/admin/activity" component={AdminActivity} />
        <Route path="/admin/docs" component={AdminDocs} />
        <Route path="/admin/settings" component={AdminSettings} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <CustomerAuthProvider>
              <SellerAuthProvider>
                <MaintenanceGate>
                  <Router />
                </MaintenanceGate>
              </SellerAuthProvider>
            </CustomerAuthProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
