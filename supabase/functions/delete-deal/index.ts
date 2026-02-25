import { handleCors, json } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized: missing Authorization header" }, { status: 401 });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) {
      return json({ error: "Server configuration error" }, { status: 500 });
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized: invalid or expired session" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const dealId = body?.dealId ?? body?.deal_id;

    if (!dealId || typeof dealId !== "string" || dealId.trim() === "") {
      return json({ error: "dealId is required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: existing, error: fetchError } = await admin
      .from("deals")
      .select("id, user_id")
      .eq("id", dealId.trim())
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return json({ error: "Deal not found" }, { status: 404 });
    }

    const isOwner = existing.user_id === user.id;

    let isAdmin = false;
    if (!isOwner) {
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const profileRole = profile?.role != null ? String(profile.role).toLowerCase() : "";
      const metaRole = user.app_metadata?.role != null ? String(user.app_metadata.role).toLowerCase() : "";
      isAdmin = profileRole === "admin" || metaRole === "admin";
    }

    if (!isOwner && !isAdmin) {
      return json({ error: "Forbidden: you do not own this deal" }, { status: 403 });
    }

    const { error: deleteError } = await admin
      .from("deals")
      .delete()
      .eq("id", dealId.trim());

    if (deleteError) throw deleteError;

    return json({ success: true });
  } catch (e) {
    console.error("delete-deal error:", e);
    return json(
      { error: (e as Error)?.message ?? String(e) },
      { status: 500 }
    );
  }
});
