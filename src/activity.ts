import { executeQuery } from "./connection";

export async function insertActivityData(
	data: any,
    dateQueried: string,
	user_id: string
): Promise<Response | null> {
	try {
		const { goals, summary, activities } = data;
		const { distances } = data.summary;

		// Insert daily activity summary
		await executeQuery(`
			INSERT INTO daily_activity_summary (
				user_id, date_queried, goal_active_minutes, goal_calories_out, 
				goal_distance, goal_floors, goal_steps, activity_calories, 
				calorie_estimation_mu, calories_bmr, calories_out, 
				calories_out_unestimated, elevation, fairly_active_minutes, 
				floors, lightly_active_minutes, marginal_calories, 
				resting_heart_rate, sedentary_minutes, steps, use_estimation, 
				very_active_minutes
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
			ON CONFLICT (user_id, date_queried) 
			DO UPDATE SET 
				goal_active_minutes = EXCLUDED.goal_active_minutes,
				goal_calories_out = EXCLUDED.goal_calories_out,
				goal_distance = EXCLUDED.goal_distance,
				goal_floors = EXCLUDED.goal_floors,
				goal_steps = EXCLUDED.goal_steps,
				activity_calories = EXCLUDED.activity_calories,
				calorie_estimation_mu = EXCLUDED.calorie_estimation_mu,
				calories_bmr = EXCLUDED.calories_bmr,
				calories_out = EXCLUDED.calories_out,
				calories_out_unestimated = EXCLUDED.calories_out_unestimated,
				elevation = EXCLUDED.elevation,
				fairly_active_minutes = EXCLUDED.fairly_active_minutes,
				floors = EXCLUDED.floors,
				lightly_active_minutes = EXCLUDED.lightly_active_minutes,
				marginal_calories = EXCLUDED.marginal_calories,
				resting_heart_rate = EXCLUDED.resting_heart_rate,
				sedentary_minutes = EXCLUDED.sedentary_minutes,
				steps = EXCLUDED.steps,
				use_estimation = EXCLUDED.use_estimation,
				very_active_minutes = EXCLUDED.very_active_minutes
		`, [
			user_id, dateQueried, goals?.activeMinutes, goals?.caloriesOut,
			goals?.distance, goals?.floors, goals?.steps, summary?.activityCalories,
			summary?.calorieEstimationMu, summary?.caloriesBMR, summary?.caloriesOut,
			summary?.caloriesOutUnestimated, summary?.elevation, summary?.fairlyActiveMinutes,
			summary?.floors, summary?.lightlyActiveMinutes, summary?.marginalCalories,
			summary?.restingHeartRate, summary?.sedentaryMinutes, summary?.steps,
			summary?.useEstimation, summary?.veryActiveMinutes
		]);

		// Insert activities (schema unknown at this time)
		if (Array.isArray(activities) && activities.length > 0) {
			// TODO: Implement activities insertion when schema is known
			console.log(`Found ${activities.length} activities for user ${user_id} on ${dateQueried}`);
		}

		// Insert distances
		if (Array.isArray(distances) && distances.length > 0) {
			for (const entry of distances) {
				const { activity, distance } = entry;
				
				await executeQuery(`
					INSERT INTO daily_activity_distances (user_id, date_queried, activity, distance)
					VALUES ($1, $2, $3, $4)
					ON CONFLICT (user_id, date_queried, activity) 
					DO UPDATE SET distance = EXCLUDED.distance
				`, [user_id, dateQueried, activity, distance]);
			}
		}

		// Insert heart rate zones
		if (Array.isArray(summary?.heartRateZones) && summary.heartRateZones.length > 0) {
			for (const zone of summary.heartRateZones) {
				const { name, min, max, minutes, caloriesOut } = zone;
				
				await executeQuery(`
					INSERT INTO daily_activity_heart_rate_zones (user_id, date_queried, name, min, max, minutes, calories_out)
					VALUES ($1, $2, $3, $4, $5, $6, $7)
					ON CONFLICT (user_id, date_queried, name) 
					DO UPDATE SET 
						min = EXCLUDED.min,
						max = EXCLUDED.max,
						minutes = EXCLUDED.minutes,
						calories_out = EXCLUDED.calories_out
				`, [user_id, dateQueried, name, min, max, minutes, caloriesOut]);
			}
		}

		// Insert custom heart rate zones
		if (Array.isArray(summary?.customHeartRateZones) && summary.customHeartRateZones.length > 0) {
			for (const zone of summary.customHeartRateZones) {
				const { name, min, max, minutes, caloriesOut } = zone;
				
				await executeQuery(`
					INSERT INTO daily_activity_custom_hr_zones (user_id, date_queried, name, min, max, minutes, calories_out)
					VALUES ($1, $2, $3, $4, $5, $6, $7)
					ON CONFLICT (user_id, date_queried, name) 
					DO UPDATE SET 
						min = EXCLUDED.min,
						max = EXCLUDED.max,
						minutes = EXCLUDED.minutes,
						calories_out = EXCLUDED.calories_out
				`, [user_id, dateQueried, name, min, max, minutes, caloriesOut]);
			}
		}


		return null;

	} catch (err) {
		console.error({
			source: "insertActivityData",
			message: (err as Error).message,
			stack: (err as Error).stack,
		});
		return new Response("Unexpected error inserting activity data", { status: 500 });
	}
}