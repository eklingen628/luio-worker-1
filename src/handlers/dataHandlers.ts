import { insertSleepData } from '../data/sleep';
import { insertActivityData, insertStepsIntraday } from '../data/activity';
import { insertHRTimeSeries, insertHRVData, insertHeartIntraday, insertHRVIntraday } from '../data/heart';
import { SleepApiResponse, ActivitySummaryResponse, HeartApiResponse, HrvResponse, HeartRateIntradayResponse, HrvIntradayResponse, ActivityStepsIntradayResponse } from '../types';

// Define DATA_HANDLERS first, then derive everything from it
const DATA_HANDLERS_IMPL = {
  getSleep: {
    check: (data: any): data is SleepApiResponse => 'sleep' in data,
    insert: (data: SleepApiResponse, date: string, userId: string) => insertSleepData(data, date, userId),
    apiCall: (userId: string, date: string) => `/1.2/user/${userId}/sleep/date/${date}.json`
  },
  getActivity: {
    check: (data: any): data is ActivitySummaryResponse => 'activities' in data,
    insert: (data: ActivitySummaryResponse, date: string, userId: string) => insertActivityData(data, date, userId),
    apiCall: (userId: string, date: string) => `/1/user/${userId}/activities/date/${date}.json`
  },
  getHRSummary: {
    check: (data: any): data is HeartApiResponse => 'activities-heart' in data,
    insert: async (data: HeartApiResponse, date: string, userId: string) => insertHRTimeSeries(data, date, userId),
    apiCall: (userId: string, date: string) => `/1/user/${userId}/activities/heart/date/${date}/1d.json`
  },
  getHRV: {
    check: (data: any): data is HrvResponse => 'hrv' in data,
    insert: (data: HrvResponse, date: string, userId: string) => insertHRVData(data, date, userId),
    apiCall: (userId: string, date: string) => `/1/user/${userId}/hrv/date/${date}.json`
  },
  getHRIntraday: {
    check: (data: any): data is HeartRateIntradayResponse => 'activities-heart-intraday' in data,
    insert: (data: HeartRateIntradayResponse, date: string, userId: string) => insertHeartIntraday(data, date, userId),
    // 1sec | 1min | 5min | 15min. Currently set to 5min.
    apiCall: (userId: string, date: string) => `/1/user/${userId}/activities/heart/date/${date}/1d/5min.json`  
  },
  getHRVIntraday: {
    check: (data: any): data is HrvIntradayResponse => 'hrv' in data && 'minutes' in data['hrv'][0],
    insert: (data: HrvIntradayResponse, date: string, userId: string) => insertHRVIntraday(data, date, userId),
    apiCall: (userId: string, date: string) => `/1/user/${userId}/hrv/date/${date}/all.json`
  },
  getStepsIntraday: {
    check: (data: any): data is ActivityStepsIntradayResponse => 'activities-steps-intraday' in data,
    insert: (data: ActivityStepsIntradayResponse, date: string, userId: string) => insertStepsIntraday(data, date, userId),
    //Detail level: 1sec | 1min | 5min | 15min. Currently set to 5min. Resource: Supported: calories | distance | elevation | floors | steps | swimming-strokes
    apiCall: (userId: string, date: string) => `/1/user/${userId}/activities/[resource]/date/${date}/1d/5min.json`
  }
} as const;

// Derive ConfigType from the keys
export type ConfigType = keyof typeof DATA_HANDLERS_IMPL;



export type DataHandler<T> = {
  check: (data: any) => data is T;
  insert: (data: T, date: string, userId: string) => Promise<any>;
  apiCall: (userId: string, date: string) => string;
};

// Export the typed version
export const DATA_HANDLERS: Record<ConfigType, DataHandler<any>> = DATA_HANDLERS_IMPL;

// Derive SCOPE_ACTIONS from DATA_HANDLERS keys
export const SCOPE_ACTIONS: ConfigType[] = Object.keys(DATA_HANDLERS_IMPL) as ConfigType[];




