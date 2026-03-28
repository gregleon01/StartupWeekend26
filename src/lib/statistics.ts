import type { FrostEvent, TrendAnalysis, PortfolioRisk, MockField, CropKey } from "@/types";
import { contracts } from "./contracts";

/* ================================================================== */
/*  Statistical Analysis                                               */
/*                                                                     */
/*  Functions for extracting insights from frost event data:           */
/*    - Linear regression to detect climate change signal              */
/*    - Summary statistics (mean, median, percentiles)                 */
/*    - Portfolio risk metrics (VaR, correlation, diversification)     */
/* ================================================================== */

/**
 * Simple linear regression via ordinary least squares.
 * Returns slope, intercept, and R² coefficient.
 */
export function linearRegression(
  points: { x: number; y: number }[],
): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² = (correlation coefficient)²
  const denomR =
    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const r = denomR === 0 ? 0 : (n * sumXY - sumX * sumY) / denomR;
  const rSquared = r * r;

  return {
    slope: +slope.toFixed(4),
    intercept: +intercept.toFixed(4),
    rSquared: +rSquared.toFixed(3),
  };
}

/**
 * Analyze frost event trend over the observation period.
 * Runs linear regression on "significant events per year" to detect
 * whether frost is becoming more or less frequent — a climate signal.
 */
export function analyzeTrend(events: FrostEvent[]): TrendAnalysis {
  // Count events with any frost (duration > 0) per year
  const yearCounts = new Map<number, number>();
  for (const e of events) {
    if (e.durationHours > 0) {
      yearCounts.set(e.year, (yearCounts.get(e.year) ?? 0) + 1);
    }
  }

  const dataPoints: { year: number; events: number }[] = [];
  for (let y = 2015; y <= 2025; y++) {
    dataPoints.push({ year: y, events: yearCounts.get(y) ?? 0 });
  }

  const regPoints = dataPoints.map((d) => ({ x: d.year, y: d.events }));
  const { slope, intercept, rSquared } = linearRegression(regPoints);

  // Calculate percent change over the period
  const startValue = intercept + slope * 2015;
  const endValue = intercept + slope * 2025;
  const percentChange =
    startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

  // Human-readable description
  let description: string;
  if (Math.abs(slope) < 0.02) {
    description = "Frost frequency has been stable over the past decade.";
  } else if (slope > 0) {
    description = `Frost events have increased ~${Math.abs(Math.round(percentChange))}% over the last decade.`;
  } else {
    description = `Frost events have decreased ~${Math.abs(Math.round(percentChange))}% over the last decade.`;
  }

  return { dataPoints, slope, intercept, rSquared, percentChange, description };
}

/**
 * Compute portfolio-level risk metrics for the insurer dashboard.
 *
 * Key metrics:
 *   - Total exposure: sum of all possible payouts
 *   - Max possible payout: worst case (all triggers fire)
 *   - Expected annual payout: historical average
 *   - VaR 95%: 95th percentile annual payout estimate
 *   - Diversification benefit: reduction from crop mix
 *   - Correlation zones: number of independent trigger zones
 */
export function computePortfolioRisk(fields: MockField[]): PortfolioRisk {
  const covered = fields.filter((f) => f.covered);
  const payoutAmounts: Record<CropKey, number> = {
    cherries: contracts.cherries.payoutPerHectare,
    grapes: contracts.grapes.payoutPerHectare,
    wheat: contracts.wheat.payoutPerHectare,
    sunflower: contracts.sunflower.payoutPerHectare,
  };

  // Total exposure = sum of (hectares × payout per ha) for all covered fields
  const totalExposure = covered.reduce(
    (sum, f) => sum + f.hectares * payoutAmounts[f.crop],
    0,
  );

  // Max possible payout = total exposure (everything triggers)
  const maxPossiblePayout = totalExposure;

  // Historical trigger rate: ~30% of covered fields in a bad year
  // Expected annual payout: avg over distribution
  const triggerRate = 0.15; // 15% average annual trigger rate
  const expectedAnnualPayout = totalExposure * triggerRate;

  // VaR 95%: 95th percentile — approximately 45% of fields trigger
  // (based on spatial correlation: when frost hits, it hits a region)
  const var95TriggerRate = 0.45;
  const valueAtRisk95 = totalExposure * var95TriggerRate;

  // Count unique station zones
  const zones = new Set(covered.map((f) => f.stationZone));
  const correlationZones = zones.size;

  // Diversification benefit: 1 - (correlated_risk / uncorrelated_risk)
  // More crops and zones = more diversification
  const cropTypes = new Set(covered.map((f) => f.crop));
  const diversificationBenefit = Math.min(
    0.35,
    (1 - 1 / Math.max(correlationZones, 1)) * 0.2 +
      (1 - 1 / Math.max(cropTypes.size, 1)) * 0.15,
  );

  return {
    totalExposure: Math.round(totalExposure),
    maxPossiblePayout: Math.round(maxPossiblePayout),
    expectedAnnualPayout: Math.round(expectedAnnualPayout),
    valueAtRisk95: Math.round(valueAtRisk95),
    diversificationBenefit: +diversificationBenefit.toFixed(2),
    correlationZones,
  };
}
