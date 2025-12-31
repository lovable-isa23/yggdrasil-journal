import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIAL_HOURS = 72;

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    console.log(`[CHECK-TRIAL] Checking status for user: ${maskId(userId)}`);

    // Check if user has paid (exists in beta_users with completed payment)
    const { data: betaUser } = await supabaseClient
      .from("beta_users")
      .select("*")
      .eq("user_id", userId)
      .eq("payment_status", "completed")
      .maybeSingle();

    if (betaUser) {
      console.log(`[CHECK-TRIAL] User ${maskId(userId)} is a paid user`);
      return new Response(JSON.stringify({
        has_access: true,
        is_trial: false,
        is_legacy_user: false,
        is_paid: true,
        trial_ends_at: null,
        hours_remaining: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get user's profile to check trial_started_at
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("trial_started_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error(`[CHECK-TRIAL] Error fetching profile`);
      throw profileError;
    }

    // If no profile found, create one (shouldn't happen but safety net)
    if (!profile) {
      console.log(`[CHECK-TRIAL] No profile found for user ${maskId(userId)}, creating one`);
      await supabaseClient.from("profiles").insert({
        id: userId,
        email: userEmail,
        trial_started_at: new Date().toISOString(),
      });
      
      const trialEndsAt = new Date(Date.now() + TRIAL_HOURS * 60 * 60 * 1000);
      return new Response(JSON.stringify({
        has_access: true,
        is_trial: true,
        is_legacy_user: false,
        is_paid: false,
        trial_ends_at: trialEndsAt.toISOString(),
        hours_remaining: TRIAL_HOURS,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Legacy user: trial_started_at is NULL = permanent access
    if (!profile.trial_started_at) {
      console.log(`[CHECK-TRIAL] User ${maskId(userId)} is a legacy user with permanent access`);
      return new Response(JSON.stringify({
        has_access: true,
        is_trial: false,
        is_legacy_user: true,
        is_paid: false,
        trial_ends_at: null,
        hours_remaining: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Calculate trial status
    const trialStartedAt = new Date(profile.trial_started_at);
    const trialEndsAt = new Date(trialStartedAt.getTime() + TRIAL_HOURS * 60 * 60 * 1000);
    const now = new Date();
    const hoursRemaining = Math.max(0, (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    const hasAccess = now < trialEndsAt;

    console.log(`[CHECK-TRIAL] User ${maskId(userId)} trial status: hasAccess=${hasAccess}, hoursRemaining=${hoursRemaining.toFixed(1)}`);

    return new Response(JSON.stringify({
      has_access: hasAccess,
      is_trial: hasAccess,
      is_legacy_user: false,
      is_paid: false,
      trial_ends_at: trialEndsAt.toISOString(),
      hours_remaining: hasAccess ? Math.ceil(hoursRemaining) : 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[CHECK-TRIAL] Error:", error?.message || "Unknown error");
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
