import { createSupabaseAdminClient } from "./supabaseAdmin.ts";

export function yearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function getUsage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  ym: string
): Promise<{ realie_count: number; rentcast_count: number }> {
  const { data } = await supabase
    .from("api_usage")
    .select("realie_count, rentcast_count")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();
  if (data) return { realie_count: data.realie_count ?? 0, rentcast_count: data.rentcast_count ?? 0 };
  await supabase.from("api_usage").upsert(
    { user_id: userId, year_month: ym, realie_count: 0, rentcast_count: 0, updated_at: new Date().toISOString() },
    { onConflict: "user_id,year_month" }
  );
  return { realie_count: 0, rentcast_count: 0 };
}

export async function incrementUsage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  ym: string,
  type: "rentcast"
): Promise<void> {
  const { data: row } = await supabase
    .from("api_usage")
    .select("realie_count, rentcast_count")
    .eq("user_id", userId)
    .eq("year_month", ym)
    .maybeSingle();
  const rentcast = ((row?.rentcast_count ?? 0) as number) + (type === "rentcast" ? 1 : 0);
  await supabase
    .from("api_usage")
    .upsert(
      {
        user_id: userId,
        year_month: ym,
        realie_count: (row?.realie_count ?? 0) as number,
        rentcast_count: rentcast,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year_month" }
    );
}
