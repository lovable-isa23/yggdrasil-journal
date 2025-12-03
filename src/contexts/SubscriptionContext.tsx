import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionStatus {
  hasAccess: boolean;
  isTrial: boolean;
  isLegacyUser: boolean;
  isPaid: boolean;
  trialEndsAt: string | null;
  hoursRemaining: number | null;
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionContextType extends SubscriptionStatus {
  checkStatus: () => Promise<void>;
  startCheckout: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasAccess: true, // Default to true to prevent flash
    isTrial: false,
    isLegacyUser: false,
    isPaid: false,
    trialEndsAt: null,
    hoursRemaining: null,
    isLoading: true,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setStatus(prev => ({
          ...prev,
          hasAccess: false,
          isLoading: false,
        }));
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-trial-status");
      
      if (error) {
        console.error("[SubscriptionContext] Error checking status:", error);
        // On error, give access to prevent blocking users
        setStatus(prev => ({
          ...prev,
          hasAccess: true,
          isLoading: false,
          error: error.message,
        }));
        return;
      }

      setStatus({
        hasAccess: data.has_access,
        isTrial: data.is_trial,
        isLegacyUser: data.is_legacy_user,
        isPaid: data.is_paid,
        trialEndsAt: data.trial_ends_at,
        hoursRemaining: data.hours_remaining,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error("[SubscriptionContext] Error:", err);
      setStatus(prev => ({
        ...prev,
        hasAccess: true, // Fail open
        isLoading: false,
        error: err.message,
      }));
    }
  }, []);

  const startCheckout = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("[SubscriptionContext] Checkout error:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Refresh status every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        checkStatus();
      } else if (event === "SIGNED_OUT") {
        setStatus({
          hasAccess: false,
          isTrial: false,
          isLegacyUser: false,
          isPaid: false,
          trialEndsAt: null,
          hoursRemaining: null,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [checkStatus]);

  return (
    <SubscriptionContext.Provider value={{ ...status, checkStatus, startCheckout }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
