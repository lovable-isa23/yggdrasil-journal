import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, MessageCircle } from "lucide-react";

const BetaWelcome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Welcome to Yggdrasil Beta! 🌳</CardTitle>
          <CardDescription className="text-lg">
            Your payment was successful and your account is being created
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Check Your Email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent you a welcome email with instructions to set your password. 
                  The link will expire in 24 hours for security.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Join Our Discord</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect with other beta testers and share your feedback!
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://discord.gg/cVeHVPwqqM', '_blank')}
                >
                  Join Discord Server
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">What's Next?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground ml-5 list-decimal">
              <li>Check your email and click the "Set My Password" button</li>
              <li>Choose a strong password for your account</li>
              <li>Log in to Yggdrasil and start your journaling journey</li>
              <li>Explore AI-powered insights and pattern analysis</li>
              <li>Share your feedback with us on Discord</li>
            </ol>
          </div>

          <div className="flex gap-3 pt-4">
            <Button asChild className="flex-1">
              <Link to="/login">Go to Login</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-4">
            Didn't receive the email? Check your spam folder or contact us on Discord.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BetaWelcome;
