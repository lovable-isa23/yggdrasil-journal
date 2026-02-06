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

// Lazy load all routes for code splitting
const Index = lazy(() => import("./pages/Index"));
const Waitlist = lazy(() => import("./pages/Waitlist"));
const BetaWelcome = lazy(() => import("./pages/BetaWelcome"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Journal = lazy(() => import("./pages/Journal"));
const Entries = lazy(() => import("./pages/Entries"));
const Insights = lazy(() => import("./pages/Insights"));
const ImportHistory = lazy(() => import("./pages/ImportHistory"));
const Settings = lazy(() => import("./pages/Settings"));
const Goals = lazy(() => import("./pages/Goals"));
const TrialExpired = lazy(() => import("./pages/TrialExpired"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Chat = lazy(() => import("./pages/Chat"));
const NotFound = lazy(() => import("./pages/NotFound"));

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