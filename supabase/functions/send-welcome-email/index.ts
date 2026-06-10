import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Internal-only endpoint: require shared secret (called by stripe-webhook server-side)
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("WELCOME_EMAIL_SECRET");
    if (!expectedSecret || internalSecret !== expectedSecret) {
      console.error("[SEND-WELCOME-EMAIL] Forbidden: invalid or missing internal secret");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, userId } = await req.json();

    console.log("Sending welcome email to user:", userId ? userId.slice(0, 5) + "***" : "[no-id]");

    // Create Supabase client to generate password reset link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate password reset link
    const { data: resetData, error: resetError } = 
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: email,
      });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw resetError;
    }

    const passwordSetupLink = resetData.properties.action_link;

    // Send welcome email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Yggdrasil <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to Yggdrasil Beta! 🌳",
        html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 30px 0;
                background: linear-gradient(135deg, #9b87f5 0%, #7e69ab 100%);
                border-radius: 10px;
                margin-bottom: 30px;
              }
              .header h1 {
                color: white;
                margin: 0;
                font-size: 28px;
              }
              .content {
                padding: 20px;
                background: #f9f9f9;
                border-radius: 10px;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                padding: 15px 30px;
                background: #9b87f5;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
              }
              .button:hover {
                background: #7e69ab;
              }
              .discord-section {
                background: #5865f2;
                color: white;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: center;
              }
              .discord-button {
                display: inline-block;
                padding: 12px 25px;
                background: white;
                color: #5865f2;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin-top: 10px;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🌳 Welcome to Yggdrasil Beta!</h1>
            </div>
            
            <div class="content">
              <h2>Your Journey Begins</h2>
              <p>Thank you for joining our beta! We're excited to have you explore Yggdrasil, your AI-powered journaling companion for self-discovery and personal growth.</p>
              
              <h3>Step 1: Set Your Password</h3>
              <p>Click the button below to set your password and activate your account:</p>
              <center>
                <a href="${passwordSetupLink}" class="button">Set My Password</a>
              </center>
              <p style="font-size: 14px; color: #666;">This link will expire in 24 hours for security reasons.</p>
            </div>

            <div class="discord-section">
              <h3>📢 Join Our Beta Community</h3>
              <p>Connect with other beta testers, share feedback, and get early access to new features!</p>
              <a href="https://discord.gg/cVeHVPwqqM" class="discord-button">Join Discord Server</a>
            </div>

            <div class="content">
              <h3>What's Next?</h3>
              <ul>
                <li>Set your password using the link above</li>
                <li>Log in to your Yggdrasil account</li>
                <li>Start your first journal entry</li>
                <li>Explore AI-powered insights and pattern analysis</li>
                <li>Share your feedback in our Discord community</li>
              </ul>
            </div>

            <div class="footer">
              <p>If you have any questions, reach out to us on Discord or reply to this email.</p>
              <p style="color: #999; font-size: 12px;">If you didn't sign up for Yggdrasil, please ignore this email.</p>
            </div>
          </body>
        </html>
      `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
    }

    const data = await emailResponse.json();
    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-welcome-email:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
