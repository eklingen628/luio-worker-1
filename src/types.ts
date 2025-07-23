import { Database } from "../database.types";


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
    stages: Record<SleepStageLevel, number>;
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
    summary: Record<SleepStageLevel, SleepStageSummary>;
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
  level: SleepStageLevel;
  seconds: number;
};

export type SleepStageLevel = "wake" | "light" | "deep" | "rem";

export type SleepStageSummary = {
  count: number;
  minutes: number;
  thirtyDayAvgMinutes: number;
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


export class APIError extends Error {
	constructor(message: string, public details?: any) {
		super(message);
		this.name = "APIError";
	}
}


export type HeartApiResponse = {
  "activities-heart": {
    dateTime: string;
    value: {
      restingHeartRate: number;
      heartRateZones: HeartRateZone[];
      customHeartRateZones: HeartRateZone[];
    };
  }[];
};




export type ActivitySummaryResponse = {
  activities: any[]; // or define this if known
  goals: {
    activeMinutes: number;
    caloriesOut: number;
    distance: number;
    floors: number;
    steps: number;
  };
  summary: {
    activeScore: number;
    activityCalories: number;
    calorieEstimationMu: number;
    caloriesBMR: number;
    caloriesOut: number;
    caloriesOutUnestimated: number;
    customHeartRateZones: HeartRateZone[];
    distances: {
      activity: string;
      distance: number;
    }[];
    elevation: number;
    fairlyActiveMinutes: number;
    floors: number;
    heartRateZones: HeartRateZone[];
    lightlyActiveMinutes: number;
    marginalCalories: number;
    restingHeartRate: number;
    sedentaryMinutes: number;
    steps: number;
    useEstimation: boolean;
    veryActiveMinutes: number;
  };
};

export type HeartRateZone = {
  name: string;
  min: number;
  max: number;
  minutes: number;
  caloriesOut: number;
};



export type FitbitApiResponse = SleepApiResponse | ActivitySummaryResponse | HeartApiResponse;

// export type FitBitUserIDData = Database['public']['Tables']['fitbit_users']['Row']

export type FitBitUserIDData ={
    access_token: string;
    expires_at: string | null;
    first_added: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    user_id: string;
}
