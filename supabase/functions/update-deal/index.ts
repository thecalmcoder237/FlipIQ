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

    // Check if caller is admin: profiles.role = 'admin' or app_metadata.role = 'admin'.
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const profileRole = profile?.role != null ? String(profile.role).toLowerCase() : "";
    const metaRole = user.app_metadata?.role != null ? String(user.app_metadata.role).toLowerCase() : "";
    const isAdmin = profileRole === "admin" || metaRole === "admin";

    // Determine if the caller is allowed to update:
    //  1. They are an admin (can update any deal; do not change ownership).
    //  2. They own the deal (user_id matches).
    //  3. The deal is orphaned (user_id is null).
    //  4. The deal's recorded owner no longer exists in auth.users (claim the deal).
    let canUpdate = false;
    let preserveOwnership = false; // true when admin editing another's deal

    if (isAdmin) {
      canUpdate = true;
      preserveOwnership = !!existingOwnerId && existingOwnerId !== user.id;
    } else if (!existingOwnerId || existingOwnerId === user.id) {
      canUpdate = true;
    } else {
      const { data: ownerData, error: ownerErr } = await admin.auth.admin.getUserById(existingOwnerId);
      const ownerExists = !ownerErr && ownerData?.user?.id === existingOwnerId;
      if (!ownerExists) {
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

    // Claim ownership only when not preserving (admin editing) and deal was orphaned or owner gone.
    if (!preserveOwnership && (!existingOwnerId || existingOwnerId !== user.id)) {
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
