import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Sparkles, Clock, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";

const TrialExpired = () => {
  const navigate = useNavigate();
  const { startCheckout, checkStatus, hasAccess, isLoading: subscriptionLoading } = useSubscription();
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  // Redirect users who have access away from this page
  useEffect(() => {
    if (!subscriptionLoading && hasAccess) {
      navigate("/journal");
    }
  }, [hasAccess, subscriptionLoading, navigate]);

  const handleUpgrade = async () => {
    setIsButtonLoading(true);
    try {
      await startCheckout();
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setIsButtonLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleRefresh = async () => {
    setIsButtonLoading(true);
    await checkStatus();
    setIsButtonLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/10 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/yggdrasil-hero-bg.png')] bg-cover bg-center opacity-5" />
      
      <Card className="max-w-md w-full relative z-10 border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">Your Trial Has Ended</CardTitle>
          <CardDescription className="text-base">
            Your 72-hour free trial of Yggdrasil has concluded. Continue your journey of self-discovery with lifetime access.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-accent/20 rounded-lg p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              What you'll get
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Unlimited journal entries with AI analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Personal knowledge graph mapping your inner world</span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Pattern insights across 10 psychological and spiritual lenses</span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Yggi, your personal spiritual guide</span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Lifetime access - no recurring fees</span>
              </li>
            </ul>
          </div>

          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-primary">$5.99</div>
            <p className="text-sm text-muted-foreground">One-time payment • Lifetime access</p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleUpgrade} 
              className="w-full" 
              size="lg"
              disabled={isButtonLoading}
            >
              {isButtonLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Unlock Lifetime Access
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                className="flex-1"
                disabled={isButtonLoading}
              >
                Already paid? Refresh
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSignOut}
                className="flex-1"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialExpired;
