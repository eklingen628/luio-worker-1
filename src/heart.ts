import { SupabaseClient } from "@supabase/supabase-js";
import { HeartRateZone, HeartApiResponse } from "./types";




export async function insertHRTimeSeries(
  supabase: SupabaseClient<any, "public", any>,
  data: HeartApiResponse,
  dateQueried: string,
  user_id: string
): Promise<Response | null> {
  try {
    const entries = data["activities-heart"];

    for (const entry of entries) {
      const { value } = entry;
      const { restingHeartRate, heartRateZones, customHeartRateZones } = value;

      // 1. Upsert summary
      const { data: summaryRow, error: summaryError } = await supabase
        .from("heart_activity_summary")
        .upsert({
          user_id,
          date_queried: dateQueried,
          resting_heart_rate: restingHeartRate,
        }, { onConflict: "user_id,date_queried" })
        .select("summary_id")
        .single();

      if (summaryError || !summaryRow) throw summaryError;

      const summary_id = summaryRow.summary_id;

      // 2. Delete existing zones
      await Promise.all([
        supabase.from("heart_rate_zone").delete().eq("summary_id", summary_id),
        supabase.from("custom_heart_rate_zone").delete().eq("summary_id", summary_id),
      ]);

      // 3. Insert heart_rate_zone
      if (heartRateZones?.length) {
        const zones = heartRateZones.map(z => ({
          summary_id,
          name: z.name,
          min: z.min,
          max: z.max,
          minutes: z.minutes,
          calories_out: z.caloriesOut,
        }));

        const { error: zoneErr } = await supabase.from("heart_rate_zone").insert(zones);
        if (zoneErr) throw zoneErr;
      }

      // 4. Insert custom_heart_rate_zone
      if (customHeartRateZones?.length) {
        const customZones = customHeartRateZones.map(z => ({
          summary_id,
          name: z.name,
          min: z.min,
          max: z.max,
          minutes: z.minutes,
          calories_out: z.caloriesOut,
        }));

        const { error: customErr } = await supabase.from("custom_heart_rate_zone").insert(customZones);
        if (customErr) throw customErr;
      }
    }
  } catch (err) {
    console.log({
      source: "insertHeartData",
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return new Response("Unexpected error inserting heart data", { status: 500 });
  }

  return null;
}
