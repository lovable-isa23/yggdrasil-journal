import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mask email for logging (e.g., "jo***@example.com")
function maskEmail(email: string | null | undefined): string {
  if (!email) return "[no-email]";
  const [local, domain] = email.split("@");
  if (!domain) return "[invalid-email]";
  const maskedLocal = local.length > 2 ? local.slice(0, 2) + "***" : "***";
  return `${maskedLocal}@${domain}`;
}

// Mask UUID for logging (e.g., "abc12***")
function maskId(id: string | null | undefined): string {
  if (!id) return "[no-id]";
  return id.slice(0, 5) + "***";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("[STRIPE-WEBHOOK] No Stripe signature found");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
    } catch (err) {
      console.error("[STRIPE-WEBHOOK] Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[STRIPE-WEBHOOK] Event type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("[STRIPE-WEBHOOK] Processing checkout session:", maskId(session.id));
      console.log("[STRIPE-WEBHOOK] Customer email:", maskEmail(session.customer_email));

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // First, check if we have user_id in metadata (from in-app checkout)
      const metadataUserId = session.metadata?.user_id;
      
      // Check if user already exists with this email or user_id from metadata
      let existingUserId: string | null = null;
      
      if (metadataUserId) {
        // User ID provided in metadata - this is from an existing logged-in user
        existingUserId = metadataUserId;
        console.log("[STRIPE-WEBHOOK] User ID from metadata:", maskId(existingUserId));
      } else {
        // Fallback to email lookup
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(
          u => u.email === session.customer_email
        );
        if (existingUser) {
          existingUserId = existingUser.id;
        }
      }

      if (existingUserId) {
        console.log("[STRIPE-WEBHOOK] Updating existing user:", maskId(existingUserId));
        
        // Update or insert beta_users record
        const { error: upsertError } = await supabaseAdmin.from("beta_users").upsert({
          user_id: existingUserId,
          stripe_customer_id: session.customer as string,
          stripe_checkout_session_id: session.id,
          payment_amount: session.amount_total,
          payment_status: "completed",
        }, { onConflict: 'user_id' });
        
        if (upsertError) {
          console.error("[STRIPE-WEBHOOK] Error upserting beta_users");
        } else {
          console.log("[STRIPE-WEBHOOK] Successfully updated beta_users record");
        }

        return new Response(
          JSON.stringify({ message: "User already exists, updated payment info" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create new user account
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: session.customer_email!,
        email_confirm: false, // Require password setup
      });

      if (userError) {
        console.error("[STRIPE-WEBHOOK] Error creating user");
        throw userError;
      }

      console.log("[STRIPE-WEBHOOK] Created new user:", maskId(newUser.user.id));

      // Insert beta_users record
      const { error: betaError } = await supabaseAdmin.from("beta_users").insert({
        user_id: newUser.user.id,
        stripe_customer_id: session.customer as string,
        stripe_checkout_session_id: session.id,
        payment_amount: session.amount_total,
        payment_status: "completed",
      });

      if (betaError) {
        console.error("[STRIPE-WEBHOOK] Error creating beta user record");
      }

      // Send welcome email
      try {
        await supabaseAdmin.functions.invoke("send-welcome-email", {
          body: {
            email: session.customer_email,
            userId: newUser.user.id,
          },
          headers: {
            "x-internal-secret": Deno.env.get("WELCOME_EMAIL_SECRET") ?? "",
          },
        });
        console.log("[STRIPE-WEBHOOK] Welcome email sent successfully");
      } catch (emailError) {
        console.error("[STRIPE-WEBHOOK] Error sending welcome email");
        // Don't fail the webhook if email fails
      }

      return new Response(
        JSON.stringify({ message: "Beta user created successfully" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ message: "Event not handled" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Webhook error");
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
