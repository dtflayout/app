import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OutsetaProvider } from "./contexts/OutsetaContext";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import AppPage from "./pages/AppPage";
import { SheetLogs } from "./pages/SheetLogs";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Home from "./pages/marketing/Home";
import Product from "./pages/marketing/Product";
import ProductNew from "./pages/marketing/ProductNew";
import Pricing from "./pages/marketing/Pricing";
import PricingNew from "./pages/marketing/PricingNew";
import Pricing3 from "./pages/marketing/Pricing3";
import Contact from "./pages/marketing/Contact";
import PrivacyPolicy from "./pages/marketing/PrivacyPolicy";
import TermsConditions from "./pages/marketing/TermsConditions";
import RefundPolicy from "./pages/marketing/RefundPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <OutsetaProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product" element={<Product />} />
            <Route path="/product-new" element={<ProductNew />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/pricing-new" element={<PricingNew />} />
            <Route path="/pricing-3" element={<Pricing3 />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppPage />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </OutsetaProvider>
  </QueryClientProvider>
);

export default App;
