
import { SupabaseClient } from "@supabase/supabase-js";



export async function insertSleepData(supabase: SupabaseClient<any, "public", any>, data: any, dateQueried: string, user_id: string): Promise<Response | null> {
	try {


		const sleepEntries = data.sleep;
		const summary = data.summary;


				// sleep_daily_summary
		const { totalMinutesAsleep, totalSleepRecords, totalTimeInBed } = summary;
		const { error: summErr } = await supabase.from("sleep_summary").upsert({
			user_id,
			date_queried: dateQueried,
			total_minutes_asleep: totalMinutesAsleep,
			total_sleep_records: totalSleepRecords,
			total_time_in_bed: totalTimeInBed,
		});
		if (summErr) throw summErr;


		if (Array.isArray(sleepEntries) && sleepEntries.length) {

			for (const entry of sleepEntries) {
				const {
					logId,
					dateOfSleep,
					duration,
					efficiency,
					endTime,
					infoCode,
					isMainSleep,
					startTime,
					logType,
					minutesAfterWakeup,
					minutesAsleep,
					minutesAwake,
					minutesToFallAsleep,
					timeInBed,
					type,
					levels
				} = entry;

				// sleep_log
				const { error: logErr } = await supabase.from("sleep_log").upsert({
					log_id: logId,
					date_queried: dateQueried,
					user_id,
					date_of_sleep: dateOfSleep,
					duration,
					efficiency,
					end_time: endTime,
					info_code: infoCode,
					is_main_sleep: isMainSleep,
					start_time: startTime,
					log_type: logType,
					minutes_after_wakeup: minutesAfterWakeup,
					minutes_asleep: minutesAsleep,
					minutes_awake: minutesAwake,
					minutes_to_fall_asleep: minutesToFallAsleep,
					time_in_bed: timeInBed,
					type,
				});
				if (logErr) throw logErr;

				// sleep_level
				if (levels?.data?.length) {
					const levelEntries = levels.data.map(l => ({
						log_id: logId,
						date_time: l.dateTime,
						level: l.level,
						seconds: l.seconds,
					}));
					const { error: levelErr } = await supabase.from("sleep_level").upsert(levelEntries,{onConflict: "log_id,level"});
					if (levelErr) throw levelErr;
				}

				// sleep_short_level
				if (levels?.shortData?.length) {
					const shortLevelEntries = levels.shortData.map(l => ({
						log_id: logId,
						date_time: l.dateTime,
						level: l.level,
						seconds: l.seconds,
					}));
					const { error: shortErr } = await supabase.from("sleep_short_level").upsert(shortLevelEntries,{onConflict: "log_id,level"});
					if (shortErr) throw shortErr;
				}

				// sleep_level_summary
				if (levels?.summary) {
					const summaryEntries = Object.entries(levels.summary).map(([level, values]) => ({
						log_id: logId,
						level,
						count: values.count,
						minutes: values.minutes,
						thirty_day_avg_minutes: values.thirtyDayAvgMinutes,
					}));
					const { error: sumErr } = await supabase.from("sleep_level_summary").upsert(summaryEntries,{onConflict: "log_id,level"});
					if (sumErr) throw sumErr;
				}
			}
		}


	} catch (err) {
		console.log({
			source: "insertSleepData",
			message: (err as Error).message,
			stack: (err as Error).stack,
		});
		return new Response("Unexpected error inserting sleep data", { status: 500 });
	}

	// Success
	return null;
}
