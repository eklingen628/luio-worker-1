import { getData } from './getData';
import { insertSleepData } from './sleep';
import { insertActivityData } from './activity';
import { insertHRTimeSeries, insertHRVData } from './heart';
import { SleepApiResponse, ActivitySummaryResponse, HeartApiResponse, ConfigType, FitBitUserIDData, HrvResponse } from './types';

type DataHandler<T> = {
  check: (data: any) => data is T;
  insert: (data: T, date: string, userId: string) => Promise<any>;
};

const DATA_HANDLERS: Record<ConfigType, DataHandler<any>> = {
  getSleep: {
    check: (data): data is SleepApiResponse => 'sleep' in data,
    insert: (data, date, userId) => insertSleepData(data, date, userId)
  },
  getActivity: {
    check: (data): data is ActivitySummaryResponse => 'activities' in data,
    insert: (data, date, userId) => insertActivityData(data, date, userId)
  },
  getHeartRateTimeSeriesByDate: {
    check: (data): data is HeartApiResponse => 'activities-heart' in data,
    insert: async (data, date, userId) => insertHRTimeSeries(data, date, userId)
  },
  getHRV: {
    check: (data): data is HrvResponse => 'hrv' in data,
    insert: (data, date, userId) => insertHRVData(data, date, userId)
  }
};

// Dynamically extract all ConfigType values from DATA_HANDLERS
const SCOPE_ACTIONS: ConfigType[] = Object.keys(DATA_HANDLERS) as ConfigType[];

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