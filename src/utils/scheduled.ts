import { getAllUserData } from '../data/user';
import { genDates } from '../utils/date';
import { processUserData } from '../workflow/processors';


export async function runJob() {
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
      //set the start date to 3 days ago
      startDate.setDate(startDate.getDate() - 3);

      const dates = genDates(startDate.toDateString(), endDate.toISOString());

      if (!dates) {
        console.log(`No dates generated for user ${userData.user_id}`);
        continue;
      }

      await processUserData(userData, dates, 'all');


    }
  } catch (error) {
    throw error;
  }
}

