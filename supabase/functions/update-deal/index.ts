import { handleCors, json } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";

// Fields that must never be overwritten via this function.
const BLOCKED_FIELDS = new Set(["id", "created_at"]);

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

    // Verify the caller's JWT.
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

    // Fetch the deal to verify it exists and inspect its current ownership.
    const { data: existing, error: fetchError } = await admin
      .from("deals")
      .select("id, user_id")
      .eq("id", dealId.trim())
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return json({ error: "Deal not found" }, { status: 404 });
    }

    const existingOwnerId: string | null = existing.user_id;

    // Determine if the caller is allowed to update:
    //  1. They own the deal (user_id matches).
    //  2. The deal is orphaned (user_id is null).
    //  3. The deal's recorded owner no longer exists in auth.users
    //     (e.g., the account was deleted or the user re-registered with a new UID).
    let canUpdate = false;

    if (!existingOwnerId || existingOwnerId === user.id) {
      canUpdate = true;
    } else {
      // Check whether the existing owner's auth account still exists.
      const { data: ownerData, error: ownerErr } = await admin.auth.admin.getUserById(existingOwnerId);
      const ownerExists = !ownerErr && ownerData?.user?.id === existingOwnerId;
      if (!ownerExists) {
        // The original owner's account is gone — allow the current user to claim the deal.
        canUpdate = true;
      }
    }

    if (!canUpdate) {
      return json({ error: "Forbidden: you do not own this deal" }, { status: 403 });
    }

    // Build the update payload, excluding blocked fields.
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const [key, value] of Object.entries(body)) {
      if (key === "dealId" || key === "deal_id") continue;
      if (BLOCKED_FIELDS.has(key)) continue;
      updatePayload[key] = value;
    }

    // Claim ownership when the deal was orphaned or the original owner is gone.
    if (!existingOwnerId || existingOwnerId !== user.id) {
      updatePayload.user_id = user.id;
    }

    const { data, error } = await admin
      .from("deals")
      .update(updatePayload)
      .eq("id", dealId.trim())
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return json({ error: "Deal not found after update" }, { status: 404 });
    }

    return json({ deal: data });
  } catch (e) {
    console.error("update-deal error:", e);
    return json(
      { error: (e as Error)?.message ?? String(e) },
      { status: 500 }
    );
  }
});
