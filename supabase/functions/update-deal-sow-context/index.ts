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
    const sowContextMessages = body?.sowContextMessages ?? body?.sow_context_messages;
    const rehabSow = body?.rehabSow ?? body?.rehab_sow;

    if (!dealId || typeof dealId !== "string" || dealId.trim() === "") {
      return json({ error: "dealId is required" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (sowContextMessages !== undefined) {
      updatePayload.sow_context_messages = Array.isArray(sowContextMessages)
        ? sowContextMessages.filter((m: unknown) => typeof m === "string")
        : [];
    }

    if (typeof rehabSow === "string") {
      updatePayload.rehab_sow = rehabSow;
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("deals")
      .update(updatePayload)
      .eq("id", dealId.trim())
      .select("id, sow_context_messages, rehab_sow, updated_at")
      .single();

    if (error) throw error;
    if (!data) {
      return json({ error: "Deal not found" }, { status: 404 });
    }

    return json({ deal: data });
  } catch (e) {
    console.error("update-deal-sow-context error:", e);
    return json(
      { error: (e as Error)?.message ?? String(e) },
      { status: 500 }
    );
  }
});
