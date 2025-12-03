import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, Leaf, ArrowRight } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkStatus, hasAccess, isPaid, isLoading } = useSubscription();
  const [checking, setChecking] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Check status multiple times to handle webhook delay
    const checkPayment = async () => {
      for (let i = 0; i < 5; i++) {
        await checkStatus();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      setChecking(false);
    };

    checkPayment();
  }, [checkStatus]);

  const handleContinue = () => {
    navigate("/journal");
  };

  if (checking || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <CardTitle>Confirming Your Payment</CardTitle>
            <CardDescription>Please wait while we verify your purchase...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/10 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/yggdrasil-hero-bg.png')] bg-cover bg-center opacity-5" />
      
      <Card className="max-w-md w-full relative z-10 border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-serif">Welcome to Yggdrasil!</CardTitle>
          <CardDescription className="text-base">
            Your payment was successful. You now have lifetime access to all features.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-accent/20 rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Your journey begins now</h3>
            <p className="text-sm text-muted-foreground">
              Start journaling to unlock deep insights about your inner world. Yggi is ready to guide you through spiritual frameworks and help you discover patterns in your thoughts and experiences.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Leaf className="w-4 h-4 text-primary" />
            <span>Thank you for supporting Yggdrasil</span>
          </div>

          <Button 
            onClick={handleContinue} 
            className="w-full" 
            size="lg"
          >
            Continue to Journal
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
