import { insertSleepData } from './sleep';
import { insertActivityData } from './activity';
import { insertHRTimeSeries, insertHRVData } from './heart';
import { SleepApiResponse, ActivitySummaryResponse, HeartApiResponse, HrvResponse } from './types';

// Define ConfigType locally since it's not being imported correctly
export type ConfigType = 'getSleep' | 'getActivity' | 'getHeartRateTimeSeriesByDate' | 'getHRV';



export type DataHandler<T> = {
  check: (data: any) => data is T;
  insert: (data: T, date: string, userId: string) => Promise<any>;
  apiCall: (userId: string, date: string) => string;
};

export const DATA_HANDLERS: Record<ConfigType, DataHandler<any>> = {
  getSleep: {
    check: (data): data is SleepApiResponse => 'sleep' in data,
    insert: (data, date, userId) => insertSleepData(data, date, userId),
    apiCall: (userId, date) => `/1.2/user/${userId}/sleep/date/${date}.json`
  },
  getActivity: {
    check: (data): data is ActivitySummaryResponse => 'activities' in data,
    insert: (data, date, userId) => insertActivityData(data, date, userId),
    apiCall: (userId, date) => `/1/user/${userId}/activities/date/${date}.json`
  },
  getHeartRateTimeSeriesByDate: {
    check: (data): data is HeartApiResponse => 'activities-heart' in data,
    insert: async (data, date, userId) => insertHRTimeSeries(data, date, userId),
    apiCall: (userId, date) => `/1/user/${userId}/activities/heart/date/${date}/1d.json`
  },
  getHRV: {
    check: (data): data is HrvResponse => 'hrv' in data,
    insert: (data, date, userId) => insertHRVData(data, date, userId),
    apiCall: (userId, date) => `/1/user/${userId}/hrv/date/${date}.json`
  }
};

// Dynamically extract all ConfigType values from DATA_HANDLERS
export const SCOPE_ACTIONS: ConfigType[] = Object.keys(DATA_HANDLERS) as ConfigType[];




