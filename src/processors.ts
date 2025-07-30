import { getData } from './fetch';
import { FitBitUserIDData } from './types.d';
import { ConfigType, DATA_HANDLERS, SCOPE_ACTIONS } from './dataHandlers';



export async function processEntireUserDataForDate(
  userData: FitBitUserIDData, 
  dateQueried: string
): Promise<void> {
  for (const action of SCOPE_ACTIONS) {
    await processUserDataForDateAndAction(userData, dateQueried, action);
  }
}

export async function processUserDataForDateAndAction(
  userData: FitBitUserIDData, 
  dateQueried: string,
  action: ConfigType
): Promise<void> {
  const queriedData = await getData(userData, action, dateQueried);

  if (!queriedData) {
    console.log(`No data returned for ${action} on ${dateQueried} for user ${userData.user_id}`);
    return;
  }

  console.log(`Processing ${action} data for user ${userData.user_id} on ${dateQueried}`);
  
  const handler = DATA_HANDLERS[action];
  if (handler && handler.check(queriedData.dataFromQuery)) {
    await handler.insert(queriedData.dataFromQuery, dateQueried, userData.user_id);
  } else {
    console.log(`Type mismatch for ${action} data - expected data type not found`);
  }
}