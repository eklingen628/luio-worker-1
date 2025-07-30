// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

export type UserToken = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
    user_id: string
}

export type FitBitUserIDData ={
    access_token: string;
    expires_at: string | null;
    first_added: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    user_id: string;
}

// ============================================================================
// FITBIT API RESPONSE TYPES
// ============================================================================

// Sleep API Types
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

// Heart Rate API Types
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

export type HeartRateZone = {
  name: string;
  min: number;
  max: number;
  minutes: number;
  caloriesOut: number;
};

// Activity API Types
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

// Activity Intraday API Types
export type ActivityStepsIntradayResponse = {
  "activities-steps": {
    dateTime: string;
    value: string;
  }[];
  "activities-steps-intraday": {
    dataset: {
      time: string; // "HH:MM:SS" format
      value: number;
    }[];
    datasetInterval: number;
    datasetType: string;
  };
};

// Heart Rate Intraday API Types
export type HeartRateIntradayResponse = {
  "activities-heart": {
    dateTime: string;
    value: {
      customHeartRateZones: HeartRateZone[];
      heartRateZones: HeartRateZone[];
      restingHeartRate: number;
    };
  }[];
  "activities-heart-intraday": {
    dataset: {
      time: string; // "HH:MM:SS" format
      value: number;
    }[];
    datasetInterval: number;
    datasetType: string;
  };
};

// HRV API Types
export type HrvResponse = {
  hrv: {
    value: {
      dailyRmssd: number;
      deepRmssd: number;
    };
    dateTime: string;
  }[];
};

// HRV Intraday API Types
export type HrvIntradayResponse = {
  hrv: {
    minutes: {
      minute: string; // ISO timestamp
      value: {
        rmssd: number;
        coverage: number;
        hf: number;
        lf: number;
      };
    }[];
    dateTime: string;
  }[];
};

// Combined API Response Type
export type FitbitApiResponse = SleepApiResponse | ActivitySummaryResponse | HeartApiResponse | ActivityStepsIntradayResponse | HeartRateIntradayResponse | HrvResponse | HrvIntradayResponse;

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export type FitBitError = {
  success: boolean;
  errors: [
    {
      errorType: string;
      message: string;
    }
  ]
}

export type FitBitApiError = {
  success: false;
  errors: Array<{
    errorType: "expired_token" | "invalid_token" | "invalid_grant" | string;
    message: string;
  }>;
}

export class APIError extends Error {
	constructor(message: string, public details?: any) {
		super(message);
		this.name = "APIError";
	}
}



// ============================================================================
// DATABASE TABLE TYPES
// ============================================================================

// Intraday Data Tables
export interface ActivityStepsIntraday {
  user_id: string;
  date_queried: string; // ISO date string
  time: string; // "HH:MM:SS" format
  value: number;
}

export interface HeartRateIntraday {
  user_id: string;
  date_queried: string; // ISO date string
  time: string; // "HH:MM:SS" format
  value: number;
}

// HRV (Heart Rate Variability) Tables
export interface HrvSummary {
  user_id: string;
  date_queried: string; // ISO date string
  daily_rmssd: number | null;
  deep_rmssd: number | null;
}

export interface HrvIntraday {
  user_id: string;
  date_queried: string; // ISO date string
  minute: string; // ISO timestamp string
  rmssd: number | null;
  coverage: number | null;
  hf: number | null;
  lf: number | null;
}