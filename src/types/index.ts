/* ------------------------------------------------------------------ */
/*  Application state                                                  */
/* ------------------------------------------------------------------ */

export type AppState =
  | "MAP_SELECT"
  | "CROP_SELECT"
  | "HISTORY"
  | "COVERAGE"
  | "SIMULATION";

/* ------------------------------------------------------------------ */
/*  Generic Parametric Contract Schema                                 */
/*                                                                     */
/*  Every parametric product — frost, drought, hail, excess rain —     */
/*  is defined by the same structure. The trigger engine is generic:   */
/*  it takes any contract + any weather data stream and evaluates it.  */
/*  Adding a new crop or country is adding a JSON object, not code.   */
/* ------------------------------------------------------------------ */

export type TriggerVariable = "temperature_2m" | "precipitation" | "wind_speed_10m";
export type TriggerDirection = "below" | "above";
export type CropKey = "cherries" | "grapes" | "wheat" | "sunflower";

export interface ParametricContract {
  /** Unique identifier for this contract type */
  id: string;
  /** Human-readable crop name */
  crop: string;
  /** Bulgarian name */
  cropBg: string;
  /** Emoji icon */
  icon: string;

  /** Which weather variable triggers this contract */
  triggerVariable: TriggerVariable;
  /** Direction of breach: "below" means trigger when value < threshold */
  triggerDirection: TriggerDirection;
  /** Threshold value in the variable's native unit (°C, mm, m/s) */
  threshold: number;
  /** Unit label for display */
  thresholdUnit: string;
  /** Minimum consecutive hours the condition must persist to trigger */
  durationThreshold: number;

  /** Start of sensitive period (MM-DD) */
  sensitiveStart: string;
  /** End of sensitive period (MM-DD) */
  sensitiveEnd: string;

  /** Payout per hectare in EUR */
  payoutPerHectare: number;
  /** Premium per hectare per season in EUR */
  premiumPerHectare: number;
  /** Average yield per hectare for context (EUR) */
  avgYieldPerHectare: number;

  /** Country code (ISO 3166-1 alpha-2) */
  countryCode: string;
}

/* ------------------------------------------------------------------ */
/*  Trigger Engine Types                                               */
/* ------------------------------------------------------------------ */

/**
 * Finite State Machine states for the parametric trigger engine.
 *
 *   MONITORING  — Normal conditions. Watching for threshold breach.
 *   COUNTING    — Threshold breached. Accumulating consecutive hours.
 *   EVALUATING  — Condition ended. Checking if duration was sufficient.
 *   TRIGGERED   — Payout authorized. Terminal state for this event.
 *   RESET       — Duration insufficient. Return to MONITORING.
 */
export type TriggerFSMState =
  | "MONITORING"
  | "COUNTING"
  | "EVALUATING"
  | "TRIGGERED"
  | "RESET";

export interface FrostEvent {
  /** ISO date of event start */
  date: string;
  /** Minimum (or maximum, depending on direction) temperature reached */
  minTemp: number;
  /** Consecutive hours the condition persisted */
  durationHours: number;
  /** Whether this event met the trigger criteria */
  triggered: boolean;
  /** Estimated financial loss in EUR */
  estimatedLoss: number;
  /** Year of the event */
  year: number;
  /** FSM state transitions that led to this event (for audit trail) */
  stateLog?: FSMTransition[];
}

export interface FSMTransition {
  hour: string;
  from: TriggerFSMState;
  to: TriggerFSMState;
  value: number;
  reason: string;
}

/* ------------------------------------------------------------------ */
/*  Weather data                                                       */
/* ------------------------------------------------------------------ */

export interface HourlyDataPoint {
  time: string;
  temperature: number;
  /** Quality flag: "ok" | "interpolated" | "suspect" */
  quality?: "ok" | "interpolated" | "suspect";
}

/* ------------------------------------------------------------------ */
/*  Geospatial                                                         */
/* ------------------------------------------------------------------ */

export interface FieldPin {
  lat: number;
  lng: number;
}

/** A farmer-drawn polygon parcel with assigned crop and computed area */
export interface FarmerParcel {
  id: string;
  /** GeoJSON polygon coordinates [lng, lat][] */
  coordinates: [number, number][];
  /** Computed area in hectares from Turf.js */
  hectares: number;
  /** Assigned crop type */
  crop: CropKey;
  /** Centroid for weather data fetch */
  centroid: FieldPin;
}

export interface FieldEnrichment {
  municipality: string;
  elevation: number;
  nearestStation: WeatherStation;
  stationDistance: number;
  basisRiskConfidence: number;
}

export interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevation: number;
}

/* ------------------------------------------------------------------ */
/*  Statistics                                                         */
/* ------------------------------------------------------------------ */

export interface TrendAnalysis {
  /** Events per year data points for regression */
  dataPoints: { year: number; events: number }[];
  /** Linear regression slope (events per year) */
  slope: number;
  /** Linear regression intercept */
  intercept: number;
  /** R² coefficient of determination */
  rSquared: number;
  /** Percent change over the analysis period */
  percentChange: number;
  /** Human-readable trend description */
  description: string;
}

export interface PortfolioRisk {
  totalExposure: number;
  maxPossiblePayout: number;
  expectedAnnualPayout: number;
  valueAtRisk95: number;
  diversificationBenefit: number;
  correlationZones: number;
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

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
  /** Weather station zone for correlation grouping */
  stationZone: string;
}
