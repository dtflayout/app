import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CreditsProvider } from "./contexts/CreditsContext";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import AppPage from "./pages/AppPage";
import AppPage300 from "./pages/AppPage300";
import { SheetLogs } from "./pages/SheetLogs";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Support from "./pages/Support";
import Settings from "./pages/Settings";
import ImageEnhancerPage from "./pages/ImageEnhancerPage";
import OrderAutomation from "./pages/OrderAutomation";
import WebsiteIntegrationLayout from "./pages/website-integration/WebsiteIntegrationLayout";
import StoreSetup from "./pages/website-integration/StoreSetup";
import Products from "./pages/website-integration/Products";
import ProductForm from "./pages/website-integration/ProductForm";
import Orders from "./pages/website-integration/Orders";
import BuilderSettings from "./pages/website-integration/BuilderSettings";
import { PublicBuilder } from "./pages/public-builder";
import BuilderLanding from "./pages/public-builder/BuilderLanding";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import Home from "./pages/marketing/Home";
import GangSheetBuilder from "./pages/marketing/GangSheetBuilder";
import WebsiteIntegration from "./pages/marketing/WebsiteIntegration";
import QuickStore from "./pages/marketing/QuickStore";
import Pricing from "./pages/marketing/Pricing";
import Contact from "./pages/marketing/Contact";
import PrivacyPolicy from "./pages/marketing/PrivacyPolicy";
import TermsConditions from "./pages/marketing/TermsConditions";
import RefundPolicy from "./pages/marketing/RefundPolicy";
import Faq from "./pages/marketing/Faq";
import DemoBuilder from "./pages/marketing/DemoBuilder";
import DemoWebsiteIntegration from "./pages/marketing/DemoWebsiteIntegration";
import DemoBuilderLive from "./pages/marketing/DemoBuilderLive";
import SavingsCalculatorPage from "./pages/marketing/SavingsCalculatorPage";
import MarketingOrderAutomation from "./pages/marketing/OrderAutomation";

// Quick Store Dashboard Pages (Printer side)
import {
  QuickStoreLayout,
  StoreSetup as QSStoreSetup,
  QSHeader,
  HomepageEditor,
  QSProducts,
  QSProductForm,
  QSOrders,
  QSOrderDetail,
  QSAnalytics,
  QSSettings,
  QSCustomers,
  QSCustomerDetail,
  QSMessages,
  QSBuilderSettings,
} from "./pages/quick-store";

// Storefront Pages (Customer side)
import {
  StorefrontApp,
  StorefrontLayout,
  StoreHome,
  StoreProducts,
  StoreProductDetail,
  StoreBuilder,
  StoreContact,
  StoreOrderStatus,
  StoreNotFound
} from "./pages/storefront";

// Subdomain detection hook
import { useSubdomain } from "./hooks/useSubdomain";

const queryClient = new QueryClient();

function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }

// Inner app component that uses hooks
const AppContent = () => {
  // useSubdomain returns: { isStorefront, isBuilder, storeSlug, isMainSite }
  const { isBuilder, isStorefront, storeSlug } = useSubdomain();

  // If on builder subdomain (builder.dtflayout.com), render public builder routes
  if (isBuilder) {
    return (
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* builder.dtflayout.com/:printerSlug/:productSlug */}
          <Route path="/:printerSlug/:productSlug" element={<PublicBuilder />} />
          {/* builder.dtflayout.com/:printerSlug — product listing/redirect */}
          <Route path="/:printerSlug" element={<BuilderLanding />} />
          {/* Catch-all for builder subdomain */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // If on a storefront subdomain (e.g., thaneprints.dtflayout.com), render storefront app
  if (isStorefront && storeSlug) {
    return (
      <BrowserRouter>
        <StorefrontApp storeSlug={storeSlug} />
      </BrowserRouter>
    );
  }

  // Otherwise, render normal app with routes
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Marketing Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/product/gang-sheet-builder" element={<GangSheetBuilder />} />
        <Route path="/product/website-integration" element={<WebsiteIntegration />} />
        <Route path="/product/quick-store" element={<QuickStore />} />
        <Route path="/product/order-automation" element={<MarketingOrderAutomation />} />
        <Route path="/product" element={<GangSheetBuilder />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/faq" element={<Faq />} />
        
        {/* Demo & Tracked Landing Pages */}
        <Route path="/demo/builder" element={<DemoBuilder />} />
        <Route path="/demo/website-integration" element={<DemoWebsiteIntegration />} />
        <Route path="/demo/builder-live" element={<DemoBuilderLive />} />
        <Route path="/savings-calculator" element={<SavingsCalculatorPage />} />
        
        {/* Auth Pages */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        
        {/* Public Storefront via /s/{slug} path (fallback for subdomain) */}
        <Route path="/s/:storeSlug/*" element={<StorefrontApp />} />
        
        {/* Protected App Pages */}
        <Route
          path="/builder-150"
          element={
            <ProtectedRoute>
              <AppPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder-300"
          element={
            <ProtectedRoute>
              <AppPage300 />
            </ProtectedRoute>
          }
        />
        {/* Redirects from old URLs */}
        <Route path="/app" element={<Navigate to="/builder-150" replace />} />
        <Route path="/app-300" element={<Navigate to="/builder-300" replace />} />
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <SheetLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <Support />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/image-enhancer"
          element={
            <ProtectedRoute>
              <ImageEnhancerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/order-automation"
          element={
            <ProtectedRoute>
              <OrderAutomation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/payment-success"
          element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/website-integration"
          element={
            <ProtectedRoute>
              <WebsiteIntegrationLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="store-setup" replace />} />
          <Route path="store-setup" element={<StoreSetup />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:productId" element={<ProductForm />} />
          <Route path="orders" element={<Orders />} />
          <Route path="builder-settings" element={<BuilderSettings />} />
        </Route>
        
        {/* Quick Store Dashboard Routes (Printer side) */}
        <Route
          path="/app/quick-store"
          element={
            <ProtectedRoute>
              <QuickStoreLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="setup" replace />} />
          <Route path="setup" element={<QSStoreSetup />} />
          <Route path="header" element={<QSHeader />} />
          <Route path="homepage" element={<HomepageEditor />} />
          <Route path="products" element={<QSProducts />} />
          <Route path="products/new" element={<QSProductForm />} />
          <Route path="products/:productId/edit" element={<QSProductForm />} />
          <Route path="orders" element={<QSOrders />} />
          <Route path="orders/:orderId" element={<QSOrderDetail />} />
          <Route path="messages" element={<QSMessages />} />
          <Route path="customers" element={<QSCustomers />} />
          <Route path="customers/:customerId" element={<QSCustomerDetail />} />
          <Route path="analytics" element={<QSAnalytics />} />
          <Route path="settings" element={<QSSettings />} />
          <Route path="builder-settings" element={<QSBuilderSettings />} />
        </Route>
        
        {/* Public Builder (Website Integration) - No auth required */}
        <Route
          path="/builder/:printerSlug/:productSlug"
          element={<PublicBuilder />}
        />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <Sentry.ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Something went wrong</h2>
    <p>The error has been reported. Please refresh the page.</p>
    <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
      Refresh
    </button>
  </div>}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CreditsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </CreditsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
