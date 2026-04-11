import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GlobalLoadingBar } from "@/components/GlobalLoadingBar";
import { YggiChat } from "@/components/YggiChat";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { TrialBadge } from "@/components/TrialBadge";
import { lazy, Suspense } from "react";

// Retry dynamic imports on failure (handles stale chunk errors after deploys)
function lazyRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch(() => {
      // If chunk fails to load, reload the page once
      const hasReloaded = sessionStorage.getItem("lazy-reload");
      if (!hasReloaded) {
        sessionStorage.setItem("lazy-reload", "1");
        window.location.reload();
        return new Promise(() => {}); // never resolves, page will reload
      }
      sessionStorage.removeItem("lazy-reload");
      return importFn(); // retry once more after reload
    })
  );
}

// Lazy load all routes for code splitting
const Index = lazyRetry(() => import("./pages/Index"));
const Topics = lazyRetry(() => import("./pages/Topics"));
const AboutPage = lazyRetry(() => import("./pages/About"));
const ContactPage = lazyRetry(() => import("./pages/Contact"));
const Waitlist = lazyRetry(() => import("./pages/Waitlist"));
const BetaWelcome = lazyRetry(() => import("./pages/BetaWelcome"));
const Login = lazyRetry(() => import("./pages/Login"));
const Signup = lazyRetry(() => import("./pages/Signup"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const UpdatePassword = lazyRetry(() => import("./pages/UpdatePassword"));
const Journal = lazyRetry(() => import("./pages/Journal"));
const Entries = lazyRetry(() => import("./pages/Entries"));
const Insights = lazyRetry(() => import("./pages/Insights"));
const ImportHistory = lazyRetry(() => import("./pages/ImportHistory"));
const Settings = lazyRetry(() => import("./pages/Settings"));
const Goals = lazyRetry(() => import("./pages/Goals"));
const TrialExpired = lazyRetry(() => import("./pages/TrialExpired"));
const PaymentSuccess = lazyRetry(() => import("./pages/PaymentSuccess"));
const Chat = lazyRetry(() => import("./pages/Chat"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalLoadingBar />
      <BrowserRouter>
        <SubscriptionProvider>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/waitlist" element={<Waitlist />} />
              <Route path="/beta-welcome" element={<BetaWelcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/entries" element={<Entries />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/import-history" element={<ImportHistory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/trial-expired" element={<TrialExpired />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/chat" element={<Chat />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <YggiChat />
          <TrialBadge />
        </SubscriptionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;