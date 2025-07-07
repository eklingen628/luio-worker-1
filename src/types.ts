export type UserToken = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
    user_id: string
}


export type SleepApiResponse = {
  sleep: SleepEntry[];
  summary: {
    stages: {
      deep: number;
      light: number;
      rem: number;
      wake: number;
    };
    totalMinutesAsleep: number;
    totalSleepRecords: number;
    totalTimeInBed: number;
  };
};

export type SleepEntry = {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  endTime: string;
  infoCode: number;
  isMainSleep: boolean;
  levels: {
    data: SleepLevel[];
    shortData: SleepLevel[];
    summary: {
      [key: string]: {
        count: number;
        minutes: number;
        thirtyDayAvgMinutes: number;
      };
    };
  };
  logId: number;
  minutesAfterWakeup: number;
  minutesAsleep: number;
  minutesAwake: number;
  minutesToFallAsleep: number;
  logType: string;
  startTime: string;
  timeInBed: number;
  type: string;
};

export type SleepLevel = {
  dateTime: string;
  level: string;
  seconds: number;
};



export type FitBitError = {
  success: boolean;
  errors: [
    {
      errorType: string;
      message: string;
    }
  ]
}

