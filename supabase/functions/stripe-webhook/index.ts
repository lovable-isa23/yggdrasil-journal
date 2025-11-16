import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("No Stripe signature found");
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
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook event type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("Processing checkout session:", session.id);
      console.log("Customer email:", session.customer_email);

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Check if user already exists with this email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(
        u => u.email === session.customer_email
      );

      if (existingUser) {
        console.log("User already exists:", existingUser.id);
        
        // Update or insert beta_users record
        await supabaseAdmin.from("beta_users").upsert({
          user_id: existingUser.id,
          stripe_customer_id: session.customer as string,
          stripe_checkout_session_id: session.id,
          payment_amount: session.amount_total,
          payment_status: "completed",
        });

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
        console.error("Error creating user:", userError);
        throw userError;
      }

      console.log("Created new user:", newUser.user.id);

      // Insert beta_users record
      const { error: betaError } = await supabaseAdmin.from("beta_users").insert({
        user_id: newUser.user.id,
        stripe_customer_id: session.customer as string,
        stripe_checkout_session_id: session.id,
        payment_amount: session.amount_total,
        payment_status: "completed",
      });

      if (betaError) {
        console.error("Error creating beta user record:", betaError);
      }

      // Send welcome email
      try {
        await supabaseAdmin.functions.invoke("send-welcome-email", {
          body: { 
            email: session.customer_email,
            userId: newUser.user.id 
          },
        });
        console.log("Welcome email sent successfully");
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
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
    console.error("Webhook error:", error);
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
