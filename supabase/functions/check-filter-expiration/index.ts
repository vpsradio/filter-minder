import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const today = new Date();
    const in15Days = new Date(today);
    in15Days.setDate(today.getDate() + 15);
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Fetch filters expiring within 30 days that haven't been notified
    const { data: filters30, error: err30 } = await supabase
      .from("filters")
      .select("id, location, filter_type, expiration_date, user_id, notification_30d_sent")
      .lte("expiration_date", formatDate(in30Days))
      .gt("expiration_date", formatDate(today))
      .eq("notification_30d_sent", false);

    const { data: filters15, error: err15 } = await supabase
      .from("filters")
      .select("id, location, filter_type, expiration_date, user_id, notification_15d_sent")
      .lte("expiration_date", formatDate(in15Days))
      .gt("expiration_date", formatDate(today))
      .eq("notification_15d_sent", false);

    const notifications: string[] = [];

    // Process 30-day notifications
    if (filters30 && filters30.length > 0) {
      for (const filter of filters30) {
        // Get user email from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", filter.user_id)
          .maybeSingle();

        if (profile?.email) {
          notifications.push(
            `30d: ${profile.email} - ${filter.filter_type} en ${filter.location} caduca el ${filter.expiration_date}`
          );
        }

        // Mark as sent
        await supabase
          .from("filters")
          .update({ notification_30d_sent: true })
          .eq("id", filter.id);
      }
    }

    // Process 15-day notifications
    if (filters15 && filters15.length > 0) {
      for (const filter of filters15) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", filter.user_id)
          .maybeSingle();

        if (profile?.email) {
          notifications.push(
            `15d: ${profile.email} - ${filter.filter_type} en ${filter.location} caduca el ${filter.expiration_date}`
          );
        }

        await supabase
          .from("filters")
          .update({ notification_15d_sent: true })
          .eq("id", filter.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: notifications.length,
        details: notifications,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
