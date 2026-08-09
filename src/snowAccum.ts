import type { TerrainPrecipType } from './precipType';

export interface NewSnowStep {
  hourlyCm: number;
  cumulativeCm: number;
}

/**
 * Estimate NEW snow depth produced during the forecast. This is deliberately
 * not total lying snow depth: it starts from zero and uses precipitation,
 * terrain-aware precipitation type and surface wet-bulb temperature.
 *
 * Precipitation is supplied as a 3-hour amount (mm/3h). The conversion below
 * scales that amount by dt/3 so changing the displayed precipitation unit does
 * not artificially triple forecast-created snow.
 */
function snowToLiquidRatio(phase: TerrainPrecipType): number {
  const tw = phase.surfaceWetBulbC;
  if (phase.key === 'snow') {
    if (tw <= -8) return 18;
    if (tw <= -5) return 15;
    if (tw <= -3) return 12;
    if (tw <= -1) return 9;
    return 7;
  }
  if (phase.key === 'wet-snow') return tw <= -0.5 ? 7 : tw <= 0.2 ? 5 : 3.5;
  if (phase.key === 'mix') return 2.2;
  if (phase.key === 'ice-pellets') return 1.2;
  return 0;
}

function solidFraction(phase: TerrainPrecipType): number {
  if (phase.key === 'snow') return 1;
  if (phase.key === 'wet-snow') return 0.85;
  if (phase.key === 'mix') return 0.35;
  if (phase.key === 'ice-pellets') return 0.65;
  return 0;
}

export function estimateNewSnowStep(
  precipMm3h: number | null,
  phase: TerrainPrecipType | null,
  previousCm: number,
  hours = 1,
): NewSnowStep {
  const dt = Math.max(0.25, Math.min(6, Number(hours) || 1));
  let snowpack = Math.max(0, previousCm);

  if (!phase) {
    snowpack *= Math.pow(0.997, dt);
    return { hourlyCm: 0, cumulativeCm: snowpack };
  }

  const tw = phase.surfaceWetBulbC;
  const settlePerHour = tw >= -0.5 ? 0.010 : tw >= -3 ? 0.006 : 0.003;
  snowpack *= Math.pow(1 - settlePerHour, dt);

  if (tw > 0) {
    const meltCmH = Math.min(1.8, 0.18 + 0.22 * tw);
    snowpack = Math.max(0, snowpack - meltCmH * dt);
  }

  if (precipMm3h === null || !Number.isFinite(precipMm3h) || precipMm3h <= 0) {
    return { hourlyCm: 0, cumulativeCm: snowpack };
  }

  const slr = snowToLiquidRatio(phase);
  const fraction = solidFraction(phase);
  // Convert the 3-hour liquid amount to the current dt interval before SLR.
  const liquidMm = Math.max(0, precipMm3h) * (dt / 3);
  const addedCm = liquidMm * slr * fraction / 10;
  snowpack += addedCm;
  return { hourlyCm: addedCm / dt, cumulativeCm: snowpack };
}

export function formatNewSnowCm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value < 0.05) return '0 cm';
  if (value < 10) return `${value.toFixed(1).replace(/\.0$/, '')} cm`;
  return `${Math.round(value)} cm`;
}
