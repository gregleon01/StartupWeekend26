import { describe, it, expect } from "vitest";
import { contracts, validateCoordinates, isBreached, COUNTRY_BOUNDS } from "../contracts";

describe("contracts registry", () => {
  it("has all four crops", () => {
    expect(Object.keys(contracts)).toEqual(["cherries", "grapes", "wheat", "sunflower"]);
  });

  it("all contracts have required fields", () => {
    for (const [key, c] of Object.entries(contracts)) {
      expect(c.id, `${key}.id`).toBeTruthy();
      expect(c.triggerVariable, `${key}.triggerVariable`).toBe("temperature_2m");
      expect(c.triggerDirection, `${key}.triggerDirection`).toBe("below");
      expect(c.threshold, `${key}.threshold`).toBeLessThan(0);
      expect(c.durationThreshold, `${key}.durationThreshold`).toBeGreaterThan(0);
      expect(c.payoutPerHectare, `${key}.payout`).toBeGreaterThan(0);
      expect(c.premiumPerHectare, `${key}.premium`).toBeGreaterThan(0);
      expect(c.premiumPerHectare, `${key}.premium < payout`).toBeLessThan(c.payoutPerHectare);
      expect(c.countryCode, `${key}.country`).toBe("BG");
    }
  });

  it("sensitive windows are within March–June", () => {
    for (const [key, c] of Object.entries(contracts)) {
      const [sm] = c.sensitiveStart.split("-").map(Number);
      const [em] = c.sensitiveEnd.split("-").map(Number);
      expect(sm, `${key} start month`).toBeGreaterThanOrEqual(3);
      expect(em, `${key} end month`).toBeLessThanOrEqual(6);
    }
  });
});

describe("validateCoordinates", () => {
  it("accepts Kyustendil (Bulgaria)", () => {
    expect(validateCoordinates(42.283, 22.694)).toBe("BG");
  });

  it("accepts Bucharest (Romania)", () => {
    expect(validateCoordinates(44.4, 26.1)).toBe("RO");
  });

  it("accepts Warsaw (Poland)", () => {
    expect(validateCoordinates(52.2, 21.0)).toBe("PL");
  });

  it("rejects Paris (outside coverage)", () => {
    expect(validateCoordinates(48.85, 2.35)).toBeNull();
  });

  it("rejects NaN coordinates", () => {
    expect(validateCoordinates(NaN, 22.694)).toBeNull();
  });

  it("rejects Infinity coordinates", () => {
    expect(validateCoordinates(Infinity, 22.694)).toBeNull();
  });

  it("rejects out-of-range latitude", () => {
    expect(validateCoordinates(91, 22.694)).toBeNull();
  });
});

describe("isBreached", () => {
  it("returns true when below threshold (direction: below)", () => {
    expect(isBreached(-3, -2, "below")).toBe(true);
  });

  it("returns false when at threshold exactly (direction: below)", () => {
    expect(isBreached(-2, -2, "below")).toBe(false);
  });

  it("returns false when above threshold (direction: below)", () => {
    expect(isBreached(0, -2, "below")).toBe(false);
  });

  it("returns true when above threshold (direction: above)", () => {
    expect(isBreached(40, 35, "above")).toBe(true);
  });

  it("returns false when at threshold exactly (direction: above)", () => {
    expect(isBreached(35, 35, "above")).toBe(false);
  });
});

describe("COUNTRY_BOUNDS", () => {
  it("covers Bulgaria, Romania, Poland", () => {
    expect(Object.keys(COUNTRY_BOUNDS)).toEqual(["BG", "RO", "PL"]);
  });

  it("all bounds have valid ranges", () => {
    for (const [code, b] of Object.entries(COUNTRY_BOUNDS)) {
      expect(b.maxLat, `${code} lat`).toBeGreaterThan(b.minLat);
      expect(b.maxLng, `${code} lng`).toBeGreaterThan(b.minLng);
      expect(b.name, `${code} name`).toBeTruthy();
    }
  });
});
