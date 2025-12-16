import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OutsetaProvider } from "./contexts/OutsetaContext";
import { CreditsProvider } from "./contexts/CreditsContext";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AppPage from "./pages/AppPage";
import AppPage300 from "./pages/AppPage300";
import { SheetLogs } from "./pages/SheetLogs";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Support from "./pages/Support";
import ImageEnhancerPage from "./pages/ImageEnhancerPage";
import ReferralPage from "./pages/ReferralPage";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <OutsetaProvider>
      <CreditsProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product" element={<Product />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
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
              path="/referral"
              element={
                <ProtectedRoute>
                  <ReferralPage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </CreditsProvider>
    </OutsetaProvider>
  </QueryClientProvider>
);

export default App;
