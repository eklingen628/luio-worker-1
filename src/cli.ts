// cli.ts
import { genDates } from './date';
import { processEntireUserDataForDate, processUserDataForDateAndAction } from './processors';
import { getOneUserData, getAllUserData } from './user';
import { ConfigType } from './types';

  //TODO: add a way to run the job for a specific user and date range and config type 

async function runOnDemand() {
  const userId = process.argv[2];
  const config = process.argv[3] as ConfigType | 'all';
  const startDate = process.argv[4];
  const endDate = process.argv[5] || undefined; 
  
  if (!userId || !startDate) {
    console.log('Usage: npm run cli <userId> <config> <startDate> [endDate]');
    console.log('Example: npm run cli 12345 getSleep 2024-01-15');
    console.log('Example: npm run cli 12345 getSleep 2024-01-15 2024-01-20');
    console.log('Example: npm run cli all all 2024-01-15 2024-01-20');
    process.exit(1);
  }

  const dates = genDates(startDate, endDate);

  if (!dates) {
    console.log(`No dates generated for user`);
    return;
  }

  try {
    // Handle case where userId is 'all'
    if (userId === 'all') {
      const userData = await getAllUserData();
      if (!userData) {
        console.log('No user data found');
        return;
      }
      
      for (const datum of userData) { 
        for (const dateQueried of dates) {  
          if (config === 'all') {
            await processEntireUserDataForDate(datum, dateQueried);
          } else {
            await processUserDataForDateAndAction(datum, dateQueried, config as ConfigType);
          }
        }
      }
    } else {
      // Handle single user
      const userData = await getOneUserData(userId);
      if (!userData) {
        console.log('No user data found');
        return;
      }

      for (const dateQueried of dates) {
        if (config === 'all') {
          await processEntireUserDataForDate(userData, dateQueried);
        } else {
          await processUserDataForDateAndAction(userData, dateQueried, config as ConfigType);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

runOnDemand();