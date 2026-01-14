// Lovable Cloud Function: bootstrap-admin
// Creates the very first admin user when the database is empty.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  username: string;
  password: string;
  fullName?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      console.log("bootstrap-admin: missing env", { hasUrl: !!url, hasServiceKey: !!serviceKey });
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(url, serviceKey);

    const body = (await req.json()) as Payload;
    const username = (body.username || "").trim().toLowerCase();
    const password = body.password || "";
    const fullName = (body.fullName || "Administrator").trim();

    console.log("bootstrap-admin: request", { username, fullNameLength: fullName.length });

    if (!username || username.length < 3) {
      return new Response(JSON.stringify({ error: "Username minimal 3 karakter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password minimal 6 karakter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow once: if any profile exists, block.
    const { count, error: countErr } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (countErr) {
      console.log("bootstrap-admin: count profiles error", countErr);
      return new Response(JSON.stringify({ error: countErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Setup sudah dilakukan. Silakan login." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use a system email (login UI uses username, not email)
    const email = `${username}@local.invalid`;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createErr || !created.user) {
      console.log("bootstrap-admin: createUser error", createErr);
      return new Response(JSON.stringify({ error: createErr?.message || "Gagal membuat user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user.id;
    console.log("bootstrap-admin: created", { userId });

    // Ensure profile exists (trigger may be async / delayed)
    let foundProfile = false;
    for (let i = 0; i < 6; i++) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (p?.user_id) {
        foundProfile = true;
        break;
      }
      await sleep(300);
    }

    if (!foundProfile) {
      console.log("bootstrap-admin: profile not created by trigger, inserting manually");
      await supabaseAdmin.from("profiles").insert({
        user_id: userId,
        full_name: fullName || "Administrator",
        username,
        email,
      });
    } else {
      await supabaseAdmin.from("profiles").update({ username, email }).eq("user_id", userId);
    }

    // Ensure exactly one role row: admin.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });

    console.log("bootstrap-admin: done");

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log("bootstrap-admin: unexpected", message);
    return new Response(JSON.stringify({ error: message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
