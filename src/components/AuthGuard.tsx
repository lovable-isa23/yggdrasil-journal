import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess, isLoading: subscriptionLoading } = useSubscription();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Check subscription access after auth is confirmed
  useEffect(() => {
    if (!loading && user && !subscriptionLoading && !hasAccess) {
      // Don't redirect if already on trial-expired or payment pages
      if (location.pathname !== "/trial-expired" && location.pathname !== "/payment-success") {
        navigate("/trial-expired");
      }
    }
  }, [user, loading, hasAccess, subscriptionLoading, navigate, location.pathname]);

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Don't block if user doesn't have access - let the redirect happen
  if (!hasAccess && location.pathname !== "/trial-expired" && location.pathname !== "/payment-success") {
    return null;
  }

  return <>{children}</>;
};
