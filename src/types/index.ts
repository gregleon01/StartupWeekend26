export type AppState =
  | "MAP_SELECT"
  | "CROP_SELECT"
  | "HISTORY"
  | "COVERAGE"
  | "SIMULATION";

export type CropKey = "cherries" | "grapes" | "wheat" | "sunflower";

export interface ParametricContract {
  crop: string;
  cropBg: string;
  icon: string;
  sensitiveStart: string; // MM-DD
  sensitiveEnd: string; // MM-DD
  temperatureThreshold: number; // °C
  durationThreshold: number; // hours
  payoutPerHectare: number; // EUR
  premiumPerHectare: number; // EUR
  avgYieldPerHectare: number; // EUR
}

export interface FrostEvent {
  date: string;
  minTemp: number;
  durationHours: number;
  triggered: boolean;
  estimatedLoss: number;
  year: number;
}

export interface HourlyDataPoint {
  time: string;
  temperature: number;
}

export interface FieldPin {
  lat: number;
  lng: number;
}

export interface MockField {
  id: number;
  lat: number;
  lng: number;
  crop: CropKey;
  hectares: number;
  covered: boolean;
  riskScore: number;
  payoutTriggered: boolean;
  payoutAmount: number;
}
