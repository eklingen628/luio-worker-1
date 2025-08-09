import { insertSleepData } from '../data/sleep';
import { insertActivityData, insertStepsIntraday, insertActivityLogList } from '../data/activity';
import { insertHRTimeSeries, insertHRVData, insertHeartIntraday, insertHRVIntraday } from '../data/heart';
import { SleepApiResponse, ActivitySummaryResponse, HeartApiResponse, HrvResponse, HeartRateIntradayResponse, HrvIntradayResponse, ActivityStepsIntradayResponse, ActivityLogListResponse } from '../types';

// Define DATA_HANDLERS first, then derive everything from it
const DATA_HANDLERS_IMPL = {
  getSleep: {
    checkFitbitAPIType: (data: any): data is SleepApiResponse => 'sleep' in data,
    checkDate: (firstAdded: string, date: string) => new Date(date).getTime() >= new Date(firstAdded).getTime(),
    insert: (data: SleepApiResponse, date: string, userId: string, firstAdded: string) => insertSleepData(data, date, userId),
    apiCall: (userId: string, date: string) => `/1.2/user/${userId}/sleep/date/${date}.json`
  },
  getActivity: {
    checkFitbitAPIType: (data: any): data is ActivitySummaryResponse => 'activities' in data,
    checkDate: (firstAdded: string, date: string) => new Date(date).getTime() >= new Date(firstAdded).getTime(),
    insert: (data: ActivitySummaryResponse, date: string, userId: string, firstAdded: string) => insertActivityData(data, date, userId),
    apiCall: (userId: string, date: string) => `/1/user/${userId}/activities/date/${date}.json`
  },
  getHRSummary: {
    checkFitbitAPIType: (data: any): data is HeartApiResponse => 'activities-heart' in data,
    checkDate: (firstAdded: string, date: string) => new Date(date).getTime() >= new Date(firstAdded).getTime(),
    insert: async (data: HeartApiResponse, date: string, userId: string, firstAdded: string) => insertHRTimeSeries(data, date, userId),
    apiCall: (userId: string, date: string) => `/1/user/${userId}/activities/heart/date/${date}/1d.json`
  },
  getHRV: {
    checkFitbitAPIType: (data: any): data is HrvResponse => 'hrv' in data,
    checkDate: (firstAdded: string, date: string) => new Date(date).getTime() >= new Date(firstAdded).getTime(),
    insert: (data: HrvResponse, date: string, userId: string, firstAdded: string) => insertHRVData(data, date, userId),
    apiCall: (userId: string, date: string) => `/1/user/${userId}/hrv/date/${date}.json`
  },
  getHRIntraday: {
    checkFitbitAPIType: (data: any): data is HeartRateIntradayResponse => 'activities-heart-intraday' in data,
    checkDate: (firstAdded: string, date: string) => new Date(date).getTime() >= new Date(firstAdded).getTime(),
    insert: (data: HeartRateIntradayResponse, date: string, userId: string, firstAdded: string) => insertHeartIntraday(data, date, userId),
    // 1sec | 1min | 5min | 15min. Currently set to 5min.
    apiCall: (userId: string, date: string) => `/1/user/${userId}/activities/heart/date/${date}/1d/5min.json`  
  },
  getHRVIntraday: {
    checkFitbitAPIType: (data: any): data is HrvIntradayResponse => 'hrv' in data && data['hrv'] && data['hrv'].length > 0 && 'minutes' in data['hrv'][0],
    checkDate: (firstAdded: string, date: string) => new Date(date).getTime() >= new Date(firstAdded).getTime(),
    insert: (data: HrvIntradayResponse, date: string, userId: string, firstAdded: string) => insertHRVIntraday(data, date, userId),
    apiCall: (userId: string, date: string) => `/1/user/${userId}/hrv/date/${date}/all.json`
  },
  getStepsIntraday: {
    checkFitbitAPIType: (data: any): data is ActivityStepsIntradayResponse => 'activities-steps-intraday' in data,
    checkDate: (firstAdded: string, date: string) => new Date(date).getTime() >= new Date(firstAdded).getTime(),
    insert: (data: ActivityStepsIntradayResponse, date: string, userId: string, firstAdded: string) => insertStepsIntraday(data, date, userId),
    //Detail level: 1sec | 1min | 5min | 15min. Currently set to 5min. Resource: Supported: calories | distance | elevation | floors | steps | swimming-strokes
    apiCall: (userId: string, date: string) => `/1/user/${userId}/activities/steps/date/${date}/1d/5min.json`
  },
  getActivityLogList: {
    checkFitbitAPIType: (data: any): data is ActivityLogListResponse => 'pagination' in data && 'activities' in data,
    checkDate: (firstAdded: string, date: string) => new Date(date).getTime() >= new Date(firstAdded).getTime(),
    insert: (data: ActivityLogListResponse, date: string, userId: string, firstAdded: string) => insertActivityLogList(data, date, userId, firstAdded),
    apiCall: (userId: string, date: string) =>  `/1/user/${userId}/activities/list.json?beforeDate=${date}&sort=desc&limit=100&offset=0`
  }
} as const;


// Derive ConfigType from the keys
export type ConfigType = keyof typeof DATA_HANDLERS_IMPL;



export type DataHandler<T> = {
  checkFitbitAPIType: (data: any) => data is T;
  checkDate: (firstAdded: string, date: string,) => boolean;
  insert: (data: T, date: string, userId: string, firstAdded: string) => Promise<any>;
  apiCall: (userId: string, date: string) => string;
};

// Export the typed version
export const DATA_HANDLERS: Record<ConfigType, DataHandler<any>> = DATA_HANDLERS_IMPL;

// Derive SCOPE_ACTIONS from DATA_HANDLERS keys
export const SCOPE_ACTIONS: ConfigType[] = Object.keys(DATA_HANDLERS_IMPL) as ConfigType[];




