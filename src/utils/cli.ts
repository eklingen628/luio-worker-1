// cli.ts
import { genDates } from './date';
import { processUserData } from '../workflow/processors';
import { getOneUserData, getAllUserData } from '../data/user';
import { ConfigType, SCOPE_ACTIONS } from '../handlers/dataHandlers';
import { sendEmail, dataDump } from './email';



async function getDataOnDemand() {
  const userId = process.argv[3];
  const config = process.argv[4] as ConfigType | 'all';
  const startDate = process.argv[5];
  const endDate = process.argv[6] || undefined; 
  
  if (!userId || !startDate) {
    console.log('Usage: npm run cli get <userId> <config> <startDate> [endDate]');
    console.log('Example: npm run cli get 12345 getSleep 01-15-2025');
    console.log('Example: npm run cli get 12345 getSleep 01-15-2025 01-20-2025');
    console.log('Example: npm run cli get all all 01-15-2025 01-20-2025');
    console.log('Valid Configs: ', ["all", ...SCOPE_ACTIONS].join(', '));
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


async function runOnDemand() {

  // console.log("Argv0: ",process.argv[0])
  // console.log("Argv1: ",process.argv[1])
  // console.log("Argv2: ",process.argv[2])
  // console.log("Argv3: ",process.argv[3])

  

  const flag = process.argv[2];

  
  if (!flag) {
    console.log('Invalid. You must provide a flag.');
    console.log('Valid flags: email or get');
    process.exit(1);
  }
  
  if (flag === 'email') {
    await sendEmail(dataDump);
  } else if (flag === 'get') {
    await getDataOnDemand();
  } else {
    console.log('Invalid flag.');
    console.log('Valid flags: email or get');
    process.exit(1);
  }
}








runOnDemand();