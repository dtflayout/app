import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CreditsProvider } from "./contexts/CreditsContext";
import AuthPage from "./pages/AuthPage";
import AppPage from "./pages/AppPage";
import AppPage300 from "./pages/AppPage300";
import { SheetLogs } from "./pages/SheetLogs";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Support from "./pages/Support";
import ImageEnhancerPage from "./pages/ImageEnhancerPage";
import WebsiteIntegrationLayout from "./pages/website-integration/WebsiteIntegrationLayout";
import StoreSetup from "./pages/website-integration/StoreSetup";
import Products from "./pages/website-integration/Products";
import ProductForm from "./pages/website-integration/ProductForm";
import Orders from "./pages/website-integration/Orders";
import BuilderSettings from "./pages/website-integration/BuilderSettings";
import { PublicBuilder } from "./pages/public-builder";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Home from "./pages/marketing/Home";
import Product from "./pages/marketing/Product";
import Pricing from "./pages/marketing/Pricing";
import Contact from "./pages/marketing/Contact";
import PrivacyPolicy from "./pages/marketing/PrivacyPolicy";
import TermsConditions from "./pages/marketing/TermsConditions";
import RefundPolicy from "./pages/marketing/RefundPolicy";
import Faq from "./pages/marketing/Faq";

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

// Inner app component that uses hooks
const AppContent = () => {
  // useSubdomain returns: { isStorefront, storeSlug, isMainSite }
  const { isStorefront, storeSlug } = useSubdomain();

  // If on a storefront subdomain (e.g., mumbai-prints.dtflayout.com), render storefront app
  if (isStorefront && storeSlug) {
    return <StorefrontApp slug={storeSlug} />;
  }

  // Otherwise, render normal app with routes
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Marketing Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<Product />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/faq" element={<Faq />} />
        
        {/* Auth Pages */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        
        {/* Public Storefront via /s/{slug} path (fallback for subdomain) */}
        <Route path="/s/:storeSlug/*" element={<StorefrontApp />} />
        
        {/* Protected App Pages */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app-300"
          element={
            <ProtectedRoute>
              <AppPage300 />
            </ProtectedRoute>
          }
        />
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
          path="/app/image-enhancer"
          element={
            <ProtectedRoute>
              <ImageEnhancerPage />
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
