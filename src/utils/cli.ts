// cli.ts
import { genDates } from './date';
import { processUserData } from '../workflow/processors';
import { getOneUserData, getAllUserData } from '../data/user';
import { ConfigType, SCOPE_ACTIONS } from '../handlers/dataHandlers';
import { sendEmail, dataDump } from './email';
import { runComprehensiveUsageValidation } from './scheduled';



async function checkCLIDataConfig(argv: string[]) {
  const userId = argv[3];
  const config = argv[4] as ConfigType | 'all';
  const startDate = argv[5];
  const endDate = argv[6] || undefined; 
  
  if (!userId || !startDate) {
    console.log('Usage: npm run cli get <userId> <config> <startDate> [endDate]');
    console.log('Example: npm run cli get 12345 getSleep 2025-01-15');
    console.log('Example: npm run cli get 12345 getSleep 2025-01-15 2025-01-20');
    console.log('Example: npm run cli get all all 2025-01-15 2025-01-20');
    console.log('Valid Configs: ', ["all", ...SCOPE_ACTIONS].join(', '));
    throw new Error("Bad config");
  }

  // Validate config type
  const validConfigs: (ConfigType | 'all')[] = ["all", ...SCOPE_ACTIONS];
  if (!validConfigs.includes(config)) {
    console.error(`Invalid config type: ${config}`);
    console.log('Valid configs:', validConfigs.join(', '));
    throw new Error("Bad config");
  }

  return {
    userId,
    config,
    startDate,
    endDate
  }
}

   
export async function processUserDataCLI(userId: string, dates: string[], config: ConfigType | "all") {

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
    console.error('Error trying to get user data via CLI:', error);
    throw error;
  }
}


export function genDatesCLI(startDate: string, endDate: string | undefined) {

  try {
  
    const dates = genDates(true, startDate, endDate);
  
    if (!dates) {
      throw new Error(`No dates were generated for start=${startDate}, end=${endDate}`);
    }

    return dates
  } catch (error) {
    console.error("Error while generating dates: ", error)
    throw error;
  }
}







async function runOnDemand() {

  const flag = process.argv[2];

  
  if (!flag) {
    console.log('Invalid. You must provide a flag.');
    console.log('Valid flags: email, get, validate');
    process.exit(1);
  }
  
  if (flag === 'email') {
    await sendEmail(dataDump);
    console.log('Email send completed');
    process.exit(0);
  } else if (flag === 'get') {

    try {
      const {userId, config, startDate, endDate} = await checkCLIDataConfig(process.argv)
      const dates = genDatesCLI(startDate, endDate) 
      await processUserDataCLI(userId, dates, config)

      console.log('Data import completed');
      process.exit(0);

    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
    
  } else if (flag === 'validate') {
    try {
      await runComprehensiveUsageValidation();
      console.log('Usage validation completed');
      process.exit(0);
    } catch (err) {
      console.error('Validation error:', err);
      process.exit(1);
    }
  } else {
    console.log('Invalid flag.');
    console.log('Valid flags: email, get, validate');
    process.exit(1);
  }
}






if (require.main === module) {
  runOnDemand();
}