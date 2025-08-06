// cli.ts
import { genDates } from './date';
import { processUserData } from '../workflow/processors';
import { getOneUserData, getAllUserData } from '../data/user';
import { ConfigType, SCOPE_ACTIONS } from '../handlers/dataHandlers';

async function runOnDemand() {
  const userId = process.argv[2];
  const config = process.argv[3] as ConfigType | 'all';
  const startDate = process.argv[4];
  const endDate = process.argv[5] || undefined; 
  
  if (!userId || !startDate) {
    console.log('Usage: npm run cli <userId> <config> <startDate> [endDate]');
    console.log('Example: npm run cli 12345 getSleep 01-15-2025');
    console.log('Example: npm run cli 12345 getSleep 01-15-2025 01-20-2025');
    console.log('Example: npm run cli all all 01-15-2025 01-20-2025');
    console.log('Valid Configs: ', SCOPE_ACTIONS.join(', '));
    process.exit(1);
  }

  // Validate config type
  const validConfigs: (ConfigType | 'all')[] = ["all", ...SCOPE_ACTIONS];
  if (!validConfigs.includes(config)) {
    console.error(`Invalid config type: ${config}`);
    console.log('Valid configs:', validConfigs.join(', '));
    process.exit(1);
  }

  const dates = genDates(startDate, endDate);

  if (!dates) {
    console.log(`No dates generated for user ${userId}`);
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
        await processUserData(datum, dates, config);

      }
    } else {
      // Handle single user
      const userData = await getOneUserData(userId);
      if (!userData) {
        console.log('No user data found');
        return;
      }

      await processUserData(userData, dates, config);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runOnDemand();