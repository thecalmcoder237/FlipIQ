import { handleCors, json } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    let token: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body?.token ?? null;
    }

    if (!token || typeof token !== "string" || token.trim() === "") {
      return json({ error: "token is required" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("deals")
      .select("*, scenarios:scenarios!deal_id(*)")
      .eq("share_token", token.trim())
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return json({ error: "Not found" }, { status: 404 });
    }

    return json({ deal: data });
  } catch (e) {
    return json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
});
