import { executeQuery } from '../db/connection';
import { SleepApiResponse } from '../types';
import logger from '../logger/logger';  

export async function insertSleepData(
  data: SleepApiResponse,
  dateQueried: string,
  user_id: string
): Promise<Response | null> {
  try {
    const sleepEntries = data.sleep;
    const summary = data.summary;

    // sleep_summary
    const { totalMinutesAsleep, totalSleepRecords, totalTimeInBed } = summary;
    await executeQuery(
      `INSERT INTO sleep_summary (user_id, date_queried, total_minutes_asleep, total_sleep_records, total_time_in_bed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date_queried) DO UPDATE SET
         total_minutes_asleep = EXCLUDED.total_minutes_asleep,
         total_sleep_records = EXCLUDED.total_sleep_records,
         total_time_in_bed = EXCLUDED.total_time_in_bed`,
      [user_id, dateQueried, totalMinutesAsleep, totalSleepRecords, totalTimeInBed]
    );

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
        await executeQuery(
          `INSERT INTO sleep_log (log_id, date_queried, user_id, date_of_sleep, duration, efficiency, end_time, info_code, is_main_sleep, start_time, log_type, minutes_after_wakeup, minutes_asleep, minutes_awake, minutes_to_fall_asleep, time_in_bed, type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (log_id) DO UPDATE SET
             date_queried = EXCLUDED.date_queried,
             user_id = EXCLUDED.user_id,
             date_of_sleep = EXCLUDED.date_of_sleep,
             duration = EXCLUDED.duration,
             efficiency = EXCLUDED.efficiency,
             end_time = EXCLUDED.end_time,
             info_code = EXCLUDED.info_code,
             is_main_sleep = EXCLUDED.is_main_sleep,
             start_time = EXCLUDED.start_time,
             log_type = EXCLUDED.log_type,
             minutes_after_wakeup = EXCLUDED.minutes_after_wakeup,
             minutes_asleep = EXCLUDED.minutes_asleep,
             minutes_awake = EXCLUDED.minutes_awake,
             minutes_to_fall_asleep = EXCLUDED.minutes_to_fall_asleep,
             time_in_bed = EXCLUDED.time_in_bed,
             type = EXCLUDED.type`,
          [
            logId,
            dateQueried,
            user_id,
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
          ]
        );

        // sleep_level
        if (levels?.data?.length) {
          for (const l of levels.data) {
            await executeQuery(
              `INSERT INTO sleep_level (log_id, date_time, level, seconds)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (log_id, date_time, level) DO UPDATE SET
                 seconds = EXCLUDED.seconds`,
              [logId, l.dateTime, l.level, l.seconds]
            );
          }
        }

        // sleep_short_level
        if (levels?.shortData?.length) {
          for (const l of levels.shortData) {
            await executeQuery(
              `INSERT INTO sleep_short_level (log_id, date_time, level, seconds)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (log_id, date_time, level) DO UPDATE SET
                 seconds = EXCLUDED.seconds`,
              [logId, l.dateTime, l.level, l.seconds]
            );
          }
        }

        // sleep_level_summary
        if (levels?.summary) {
          for (const [level, values] of Object.entries(levels.summary)) {
            await executeQuery(
              `INSERT INTO sleep_level_summary (log_id, level, count, minutes, thirty_day_avg_minutes)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (log_id, level) DO UPDATE SET
                 count = EXCLUDED.count,
                 minutes = EXCLUDED.minutes,
                 thirty_day_avg_minutes = EXCLUDED.thirty_day_avg_minutes`,
              [logId, level, values.count, values.minutes, values.thirtyDayAvgMinutes]
            );
          }
        }
      }
    }

    return null;

  } catch (err) {
    logger.info({
      source: 'insertSleepData',
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return new Response('Unexpected error inserting sleep data', { status: 500 });
  }
}
