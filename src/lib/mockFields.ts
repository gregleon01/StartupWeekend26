import type { MockField, CropKey } from "@/types";

// Seeded pseudo-random for deterministic demo data
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const crops: CropKey[] = ["cherries", "grapes", "wheat", "sunflower"];

/**
 * Generates 207 mock fields scattered across the Kyustendil region.
 * 15 fields have active payout triggers (simulating a recent frost).
 * Deterministic — same data every render.
 */
export function generateMockFields(): MockField[] {
  const rand = seededRandom(42);
  const fields: MockField[] = [];

  // Kyustendil bounding box
  const minLat = 42.2;
  const maxLat = 42.4;
  const minLng = 22.5;
  const maxLng = 22.8;

  for (let i = 0; i < 207; i++) {
    const lat = minLat + rand() * (maxLat - minLat);
    const lng = minLng + rand() * (maxLng - minLng);
    const crop = crops[Math.floor(rand() * crops.length)];
    const hectares = +(1 + rand() * 12).toFixed(1);
    const covered = rand() > 0.12; // ~88% coverage rate
    const riskScore = +(rand() * 100).toFixed(0);
    const payoutTriggered = i < 15; // first 15 have triggered payouts
    const payoutAmounts: Record<CropKey, number> = {
      cherries: 340,
      grapes: 280,
      wheat: 180,
      sunflower: 220,
    };

    fields.push({
      id: i + 1,
      lat,
      lng,
      crop,
      hectares,
      covered,
      riskScore: +riskScore,
      payoutTriggered: covered && payoutTriggered,
      payoutAmount: payoutTriggered ? payoutAmounts[crop] : 0,
    });
  }

  return fields;
}

/** Precomputed stats for the dashboard header */
export function computeFieldStats(fields: MockField[]) {
  const insured = fields.filter((f) => f.covered);
  const totalHa = insured.reduce((sum, f) => sum + f.hectares, 0);
  const premiums: Record<CropKey, number> = {
    cherries: 15,
    grapes: 12,
    wheat: 8,
    sunflower: 10,
  };
  const totalPremiums = insured.reduce(
    (sum, f) => sum + f.hectares * premiums[f.crop],
    0,
  );
  const triggered = fields.filter((f) => f.payoutTriggered);
  const totalPaidOut = triggered.reduce(
    (sum, f) => sum + f.payoutAmount * f.hectares,
    0,
  );

  return {
    fieldsInsured: insured.length,
    hectaresCovered: Math.round(totalHa),
    premiumsCollected: Math.round(totalPremiums),
    payoutsTriggered: triggered.length,
    totalPaidOut: Math.round(totalPaidOut),
  };
}
