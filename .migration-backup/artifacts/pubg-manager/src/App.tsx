import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider } from "@/hooks/use-auth";
import { CustomerAuthProvider } from "@/hooks/use-customer-auth";
import { SellerAuthProvider } from "@/hooks/use-seller-auth";
import { MaintenanceGate } from "@/components/MaintenanceGate";

// Public Pages
import { PublicHome } from "@/pages/public/home";
import { PublicAccountDetail } from "@/pages/public/account-detail";
import { PublicChat } from "@/pages/public/chat";
import { CustomerLoginPage, SellerLoginPage } from "@/pages/public/unified-login";
import { UnifiedSignup, SellerSignupPage } from "@/pages/public/unified-signup";
import { CustomerDashboard } from "@/pages/public/customer-dashboard";
import { CustomerInstallments } from "@/pages/public/customer-installments";
import { WishlistPage } from "@/pages/public/wishlist";
import { FAQPage } from "@/pages/public/faq";
import { SellerDashboard } from "@/pages/public/seller-dashboard";
import { SellerAccountDetail } from "@/pages/public/seller-account-detail";
import { SellerAccountForm } from "@/pages/public/seller-account-form";

// Admin Pages
import { AdminLogin } from "@/pages/admin/login";
import { AdminDashboard } from "@/pages/admin/dashboard";
import { AdminAccountsList } from "@/pages/admin/accounts/list";
import { AdminAccountForm } from "@/pages/admin/accounts/form";
import { AdminAccountDetail } from "@/pages/admin/accounts/detail";
import { AdminCustomersList } from "@/pages/admin/customers/list";
import { AdminCustomerDetail } from "@/pages/admin/customers/detail";
import { AdminSellersList } from "@/pages/admin/sellers/list";
import { AdminSellerDetail } from "@/pages/admin/sellers/detail";
import { AdminChat } from "@/pages/admin/chat";
import { AdminSettings } from "@/pages/admin/settings";
import { AdminActivity } from "@/pages/admin/activity";
import { AdminDocs } from "@/pages/admin/docs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
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
