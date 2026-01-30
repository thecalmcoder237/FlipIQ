import { handleCors, json } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";

const REALIE_LIMIT = 25;
const RENTCAST_LIMIT = 45;

function yearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json().catch(() => ({}));
    const userId = (body?.userId ?? body?.user_id ?? "").trim();
    if (!userId) {
      return json({ error: "userId is required" }, { status: 400 });
    }

    const ym = yearMonth();
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("api_usage")
      .select("realie_count, rentcast_count")
      .eq("user_id", userId)
      .eq("year_month", ym)
      .maybeSingle();

    const realie_count = (data?.realie_count ?? 0) as number;
    const rentcast_count = (data?.rentcast_count ?? 0) as number;

    return json({
      realie_count,
      rentcast_count,
      realie_limit: REALIE_LIMIT,
      rentcast_limit: RENTCAST_LIMIT,
      year_month: ym,
    });
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, { status: 500 });
  }
});
