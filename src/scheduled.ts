import { pool } from './db';
import { getAllUserData } from './user';
import { genDates } from './date';
import { processEntireUserDataForDate } from './processors';

export async function runDailyJob() {
  // TODO: Implement your daily scheduled logic here
  // Example: Query users, refresh tokens, fetch/insert data, etc.
  console.log('Running daily scheduled job...');


  try {
    // Get all user data
    const data = await getAllUserData();

    if (!data) {
      console.error('No user data found after token refresh');
      return;
    }

    // Process data for each user
    for (const userData of data) {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 3);

      const dates = genDates(startDate.toDateString(), endDate.toISOString());

      if (!dates) {
        console.log(`No dates generated for user ${userData.user_id}`);
        continue;
      }

      for (const dateQueried of dates) {
        await processEntireUserDataForDate(userData, dateQueried);
      }
    }
  } catch (error) {
    console.error('Error in scheduled job:', error);
  }
}

export async function jobTest() {
  let data = await getAllUserData();

    if (!data) {
      console.log('No user data found');
      return;
    }
  console.log(data);
}