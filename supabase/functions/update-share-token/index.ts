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

    // Verify the caller is a valid authenticated user
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

    // Use admin client to bypass RLS (which may block update if user_id is stale/mismatched)
    const admin = createSupabaseAdminClient();
    const shareToken = crypto.randomUUID();

    const { data, error } = await admin
      .from("deals")
      .update({
        share_token: shareToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId.trim())
      .select("id, share_token")
      .single();

    if (error) throw error;
    if (!data) {
      return json({ error: "Deal not found" }, { status: 404 });
    }

    return json({ shareToken: data.share_token });
  } catch (e) {
    console.error("update-share-token error:", e);
    return json(
      { error: (e as Error)?.message ?? String(e) },
      { status: 500 }
    );
  }
});
