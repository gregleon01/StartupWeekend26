import { describe, it, expect } from "vitest";
import {
  haversineKm,
  findNearestStation,
  calculateBasisRiskConfidence,
  assignStationZone,
  WEATHER_STATIONS,
} from "../basisRisk";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(42.283, 22.694, 42.283, 22.694)).toBe(0);
  });

  it("calculates known distance — Sofia to Plovdiv (~130km)", () => {
    const dist = haversineKm(42.698, 23.322, 42.150, 24.750);
    expect(dist).toBeGreaterThan(120);
    expect(dist).toBeLessThan(140);
  });

  it("is symmetric", () => {
    const ab = haversineKm(42.283, 22.694, 42.698, 23.322);
    const ba = haversineKm(42.698, 23.322, 42.283, 22.694);
    expect(Math.abs(ab - ba)).toBeLessThan(0.01);
  });
});

describe("findNearestStation", () => {
  it("finds Kyustendil for a field near Kyustendil", () => {
    const { station, distanceKm } = findNearestStation({ lat: 42.28, lng: 22.7 });
    expect(station.id).toBe("bg-kyustendil");
    expect(distanceKm).toBeLessThan(1);
  });

  it("finds Sofia for a field in Sofia", () => {
    const { station } = findNearestStation({ lat: 42.7, lng: 23.33 });
    expect(station.id).toBe("bg-sofia");
  });

  it("always returns a station (never null)", () => {
    // Even for a point far from all stations
    const { station } = findNearestStation({ lat: 44.0, lng: 28.0 });
    expect(station).toBeDefined();
    expect(station.id).toBeTruthy();
  });
});

describe("calculateBasisRiskConfidence", () => {
  it("returns high confidence for nearby station at same elevation", () => {
    const conf = calculateBasisRiskConfidence(2, 500, 520);
    expect(conf).toBeGreaterThan(0.85);
  });

  it("returns lower confidence for distant station", () => {
    const conf = calculateBasisRiskConfidence(20, 500, 500);
    expect(conf).toBeLessThanOrEqual(0.5);
    // 20km station should be much worse than 2km station
    const nearConf = calculateBasisRiskConfidence(2, 500, 500);
    expect(conf).toBeLessThan(nearConf);
  });

  it("returns lower confidence for large elevation difference", () => {
    const near = calculateBasisRiskConfidence(2, 200, 200);
    const elevDiff = calculateBasisRiskConfidence(2, 200, 700);
    expect(elevDiff).toBeLessThan(near);
  });

  it("never returns negative", () => {
    const conf = calculateBasisRiskConfidence(100, 0, 1000);
    expect(conf).toBeGreaterThanOrEqual(0);
  });

  it("caps at 1.0", () => {
    const conf = calculateBasisRiskConfidence(0, 500, 500);
    expect(conf).toBeLessThanOrEqual(1);
  });
});

describe("assignStationZone", () => {
  it("returns station id for zone assignment", () => {
    const zone = assignStationZone(42.283, 22.694);
    expect(zone).toBe("bg-kyustendil");
  });

  it("groups nearby fields into same zone", () => {
    const z1 = assignStationZone(42.28, 22.69);
    const z2 = assignStationZone(42.29, 22.70);
    expect(z1).toBe(z2);
  });
});

describe("WEATHER_STATIONS", () => {
  it("has 20 Bulgarian stations", () => {
    expect(WEATHER_STATIONS.length).toBe(20);
  });

  it("all stations have valid coordinates within Bulgaria", () => {
    for (const s of WEATHER_STATIONS) {
      expect(s.lat).toBeGreaterThan(41);
      expect(s.lat).toBeLessThan(45);
      expect(s.lng).toBeGreaterThan(22);
      expect(s.lng).toBeLessThan(29);
      expect(s.elevation).toBeGreaterThan(0);
    }
  });
});
