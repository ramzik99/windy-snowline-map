import type { ProfilePoint } from './snowLevel';

export interface TerrainDiagnostics {
  tempC: number;
  dewpointC: number;
  wetBulbC: number;
  rhPct: number;
  pressureHpa: number;
  extrapolated: boolean;
  lapseRateCPerKm: number | null;
  snowGrowthRhPct: number | null;
  convectiveEnvironment: boolean;
}

function saturationVapourPressure(tempC: number): number {
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
}

export function relativeHumidityPct(tempC: number, dewpointC: number): number {
  const td = Math.min(tempC, dewpointC);
  const rh = 100 * saturationVapourPressure(td) / saturationVapourPressure(tempC);
  return Math.max(0, Math.min(100, rh));
}

function interpolate(a: ProfilePoint, b: ProfilePoint, heightM: number): ProfilePoint {
  const dz = b.heightM - a.heightM;
  const f = Math.abs(dz) < 1e-6 ? 0 : (heightM - a.heightM) / dz;
  const lerp = (x: number, y: number) => x + f * (y - x);
  return {
    level: a.level,
    pressureHpa: Math.exp(lerp(Math.log(a.pressureHpa), Math.log(b.pressureHpa))),
    heightM,
    tempC: lerp(a.tempC, b.tempC),
    dewpointC: lerp(a.dewpointC, b.dewpointC),
    wetBulbC: lerp(a.wetBulbC, b.wetBulbC),
  };
}

export function profileAtHeight(profile: ProfilePoint[], heightM: number): { point: ProfilePoint; extrapolated: boolean } | null {
  const p = profile
    .filter(v => Number.isFinite(v.heightM) && Number.isFinite(v.tempC) && Number.isFinite(v.dewpointC))
    .sort((a, b) => a.heightM - b.heightM);
  if (p.length < 2 || !Number.isFinite(heightM) || heightM > p[p.length - 1].heightM) return null;

  if (heightM <= p[0].heightM) return { point: { ...p[0], heightM }, extrapolated: true };

  for (let i = 0; i < p.length - 1; i++) {
    if (heightM >= p[i].heightM && heightM <= p[i + 1].heightM) {
      return { point: interpolate(p[i], p[i + 1], heightM), extrapolated: false };
    }
  }
  return null;
}

function layerPoint(profile: ProfilePoint[], targetM: number): ProfilePoint | null {
  return profileAtHeight(profile, targetM)?.point ?? null;
}

/**
 * Compact profile-only convective-snow environment diagnostic.
 *
 * This is intentionally not a thunder/lightning forecast. It flags a profile
 * that can support convective snow showers: steep low/mid-level lapse rate and
 * a moist dendritic-growth zone (-18 to -12 C). The precipitation-type routine
 * decides whether falling precipitation is actually snow/wet snow.
 */
export function terrainDiagnostics(profile: ProfilePoint[], terrainM: number): TerrainDiagnostics | null {
  const surface = profileAtHeight(profile, terrainM);
  if (!surface) return null;

  const topTarget = terrainM + 3000;
  const top = layerPoint(profile, topTarget);
  const lapseRateCPerKm = top
    ? (surface.point.tempC - top.tempC) / Math.max(0.1, (top.heightM - terrainM) / 1000)
    : null;

  const dgz = profile.filter(v =>
    v.heightM >= terrainM &&
    v.tempC <= -12 && v.tempC >= -18 &&
    Number.isFinite(v.dewpointC)
  );
  const snowGrowthRhPct = dgz.length
    ? dgz.reduce((sum, v) => sum + relativeHumidityPct(v.tempC, v.dewpointC), 0) / dgz.length
    : null;

  // 6.5 C/km is a deliberately conservative "steep" profile threshold;
  // 80% RH requires a reasonably moist dendritic-growth layer.
  const convectiveEnvironment =
    lapseRateCPerKm !== null && lapseRateCPerKm >= 6.5 &&
    snowGrowthRhPct !== null && snowGrowthRhPct >= 80;

  return {
    tempC: surface.point.tempC,
    dewpointC: surface.point.dewpointC,
    wetBulbC: surface.point.wetBulbC,
    rhPct: relativeHumidityPct(surface.point.tempC, surface.point.dewpointC),
    pressureHpa: surface.point.pressureHpa,
    extrapolated: surface.extrapolated,
    lapseRateCPerKm,
    snowGrowthRhPct,
    convectiveEnvironment,
  };
}
