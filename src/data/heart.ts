import { executeQuery } from '../db/connection';
import { HeartRateZone, HeartApiResponse, HrvResponse } from '../types';

export async function insertHRTimeSeries(
	data: HeartApiResponse,
	dateQueried: string,
	user_id: string
): Promise<Response | null> {
	try {
		const entries = data['activities-heart'];

		for (const entry of entries) {
			const { value } = entry;
			const { restingHeartRate, heartRateZones, customHeartRateZones } = value;

			// 1. Upsert summary using (user_id, date_queried) as primary key
			await executeQuery(`
				INSERT INTO heart_activity_summary (user_id, date_queried, resting_heart_rate)
				VALUES ($1, $2, $3)
				ON CONFLICT (user_id, date_queried) 
				DO UPDATE SET resting_heart_rate = EXCLUDED.resting_heart_rate
			`, [user_id, dateQueried, restingHeartRate]);

			// 2. Insert heart_rate_zone using (user_id, date_queried, name) as primary key
			if (heartRateZones?.length) {
				for (const zone of heartRateZones) {
					await executeQuery(`
						INSERT INTO heart_rate_zone (user_id, date_queried, name, min, max, minutes, calories_out)
						VALUES ($1, $2, $3, $4, $5, $6, $7)
						ON CONFLICT (user_id, date_queried, name) 
						DO UPDATE SET 
							min = EXCLUDED.min,
							max = EXCLUDED.max,
							minutes = EXCLUDED.minutes,
							calories_out = EXCLUDED.calories_out
					`, [user_id, dateQueried, zone.name, zone.min, zone.max, zone.minutes, zone.caloriesOut]);
				}
			}

			// 3. Insert custom_heart_rate_zone using (user_id, date_queried, name) as primary key
			if (customHeartRateZones?.length) {
				for (const zone of customHeartRateZones) {
					await executeQuery(`
						INSERT INTO custom_heart_rate_zone (user_id, date_queried, name, min, max, minutes, calories_out)
						VALUES ($1, $2, $3, $4, $5, $6, $7)
						ON CONFLICT (user_id, date_queried, name) 
						DO UPDATE SET 
							min = EXCLUDED.min,
							max = EXCLUDED.max,
							minutes = EXCLUDED.minutes,
							calories_out = EXCLUDED.calories_out
					`, [user_id, dateQueried, zone.name, zone.min, zone.max, zone.minutes, zone.caloriesOut]);
				}
			}
		}

		console.log(`Successfully inserted heart rate data for user ${user_id} on ${dateQueried}`);
		return null;

	} catch (err) {
		console.log({
			source: 'insertHeartData',
			message: (err as Error).message,
			stack: (err as Error).stack,
		});
		return new Response('Unexpected error inserting heart data', { status: 500 });
	}
}


export async function insertHRVData(
	data: HrvResponse,
	dateQueried: string,
	user_id: string
): Promise<Response | null> {
	try {
		const entries = data.hrv;

		for (const entry of entries) {
			const { value } = entry;
			const { dailyRmssd, deepRmssd } = value;
		

			await executeQuery(`INSERT INTO hrv_summary (user_id, date_queried, daily_rmssd, deep_rmssd)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (user_id, date_queried)
				DO UPDATE SET
					daily_rmssd = EXCLUDED.daily_rmssd,
					deep_rmssd = EXCLUDED.deep_rmssd`, 
					[user_id, dateQueried, dailyRmssd, deepRmssd]
				);

		}


		return null;

	} catch (err) {
		console.log({
			source: 'insertHRVData',
			message: (err as Error).message,
			stack: (err as Error).stack,
		});
		return new Response('Unexpected error inserting HRV data', { status: 500 });
	}
}