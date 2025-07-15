import { SupabaseClient } from "@supabase/supabase-js";

export async function insertActivityData(
	supabase: SupabaseClient<any, "public", any>,
	data: any,
    dateQueried: string,
	user_id: string
): Promise<Response | null> {
	try {
		const { goals, summary, activities } = data;
		const { distances } = data.summary

		const { error } = await supabase.from("daily_activity_summary").upsert({
			user_id,
			date_queried: dateQueried,
			goal_active_minutes: goals?.activeMinutes,
			goal_calories_out: goals?.caloriesOut,
			goal_distance: goals?.distance,
			goal_floors: goals?.floors,
			goal_steps: goals?.steps,
			// active_score: summary?.activeScore,
			activity_calories: summary?.activityCalories,
			calorie_estimation_mu: summary?.calorieEstimationMu,
			calories_bmr: summary?.caloriesBMR,
			calories_out: summary?.caloriesOut,
			calories_out_unestimated: summary?.caloriesOutUnestimated,
			elevation: summary?.elevation,
			fairly_active_minutes: summary?.fairlyActiveMinutes,
			floors: summary?.floors,
			lightly_active_minutes: summary?.lightlyActiveMinutes,
			marginal_calories: summary?.marginalCalories,
			resting_heart_rate: summary?.restingHeartRate,
			sedentary_minutes: summary?.sedentaryMinutes,
			steps: summary?.steps,
			use_estimation: summary?.useEstimation,
			very_active_minutes: summary?.veryActiveMinutes,
		});

		if (error) throw error;

		if (Array.isArray(activities) && activities.length > 0) {
			//schema unknown at this time

		}



		if (Array.isArray(distances) && distances.length > 0) {

			for (const entry of distances) {
				const {
					activity,
					distance
				} = entry;
			

				const { error } = await supabase.from("daily_activity_distances").upsert({

					user_id,
					date_queried: dateQueried,
					activity, 
					distance,
				});
			}
		}



			// Insert heart rate zones
	if (Array.isArray(summary?.heartRateZones) && summary.heartRateZones.length > 0) {
		for (const zone of summary.heartRateZones) {
			const { name, min, max, minutes, caloriesOut } = zone;
			const { error: hrError } = await supabase.from("daily_activity_heart_rate_zones").upsert({
				user_id,
				date_queried: dateQueried,
				name,
				min,
				max,
				minutes,
				calories_out: caloriesOut,
			});
			if (hrError) throw hrError;
		}
	}

	// Insert custom heart rate zones
	if (Array.isArray(summary?.customHeartRateZones) && summary.customHeartRateZones.length > 0) {
		for (const zone of summary.customHeartRateZones) {
			const { name, min, max, minutes, caloriesOut } = zone;
			const { error: customHrError } = await supabase.from("daily_activity_custom_hr_zones").upsert({
				user_id,
				date_queried: dateQueried,
				name,
				min,
				max,
				minutes,
				calories_out: caloriesOut,
			});
			if (customHrError) throw customHrError;
		}
	}


		

	} catch (err) {
		console.log({
			source: "insertActivityData",
			message: (err as Error).message,
			stack: (err as Error).stack,
		});
		return new Response("Unexpected error inserting activity data", { status: 500 });
	}

	//success
	return null;
}