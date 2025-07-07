import { FitBitError, SleepApiResponse } from "./types";


//potentially add more dynamic date generation
function genSleepQueryDate() {



}


export async function getSleep(supabase: SupabaseClient<any, "public", any>, data): 
Promise<{
    sleepQueryDate: string;
    dataFromQuery: SleepApiResponse;
} | null>  {

	//date is 24 hours in the past
	const date = new Date(Date.now() - (24 * 60 * 60 * 1000))
	
	const dateIso = date.toISOString()

	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // 01-12
	const day   = String(date.getUTCDate()).padStart(2, "0");      // 01-31

	const dateString = `${year}-${month}-${day}`; // YYYY-MM-DD


	const userQuery = `/1.2/user/${data.user_id}/sleep/date/${dateString}.json`

	let res;

	try {
		res = await fetch(`https://api.fitbit.com/${userQuery}`, {
			headers: {
				"Authorization": `Bearer ${data.access_token}`
			}
		});
	}
	catch (err) {
		console.log({
			source: "getSleep",
			message: (err as Error).message,
	})};

	if (!res.ok) {
		console.log(res)
		return null

	}

	const resData = await res?.json() as SleepApiResponse

	return {
		"sleepQueryDate": dateIso,
		"dataFromQuery": resData

	}
		
}



export async function insertSleepData(supabase: SupabaseClient<any, "public", any>, data: any, queryDate: string, user_id: string): Promise<Response | null> {
	try {

		const query_id = crypto.randomUUID();
		const sleepEntries = data.sleep;
		const summary = data.summary;

		// if (Array.isArray(sleepEntries) || sleepEntries.length === 0) return null;

		if (Array.isArray(sleepEntries) && sleepEntries.length > 0) {

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
					query_id,
				});
				if (logErr) throw logErr;

				// sleep_level
				if (levels?.data?.length) {
					const levelEntries = levels.data.map(l => ({
						log_id: logId,
						datetime: l.dateTime,
						level: l.level,
						seconds: l.seconds,
					}));
					const { error: levelErr } = await supabase.from("sleep_level").upsert(levelEntries);
					if (levelErr) throw levelErr;
				}

				// sleep_short_level
				if (levels?.shortData?.length) {
					const shortLevelEntries = levels.shortData.map(l => ({
						log_id: logId,
						datetime: l.dateTime,
						level: l.level,
						seconds: l.seconds,
					}));
					const { error: shortErr } = await supabase.from("sleep_short_level").upsert(shortLevelEntries);
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
					const { error: sumErr } = await supabase.from("sleep_level_summary").upsert(summaryEntries);
					if (sumErr) throw sumErr;
				}
			}
		}
		// sleep_daily_summary
		const { totalMinutesAsleep, totalSleepRecords, totalTimeInBed } = summary;
		const { error } = await supabase.from("sleep_summary").upsert({
			user_id,
			query_id,
			query_date: queryDate,
			total_minutes_asleep: totalMinutesAsleep,
			total_sleep_records: totalSleepRecords,
			total_time_in_bed: totalTimeInBed,
		});
		if (error) throw error;


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
