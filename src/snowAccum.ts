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
 * The conversion uses a bounded snow-to-liquid ratio (SLR), then applies
 * simple settling/melt to the running fresh-snow layer. It is meant as a
 * terrain-aware forecast aid when no independent snow-depth state is exposed.
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
  precipMmH: number | null,
  phase: TerrainPrecipType | null,
  previousCm: number,
  hours = 1,
): NewSnowStep {
  const dt = Math.max(0.25, Math.min(6, Number(hours) || 1));
  let snowpack = Math.max(0, previousCm);

  if (!phase) {
    // Slow background settling when no type can be diagnosed.
    snowpack *= Math.pow(0.997, dt);
    return { hourlyCm: 0, cumulativeCm: snowpack };
  }

  const tw = phase.surfaceWetBulbC;
  // Fresh-snow settling: faster near melting, slower in cold snow.
  const settlePerHour = tw >= -0.5 ? 0.010 : tw >= -3 ? 0.006 : 0.003;
  snowpack *= Math.pow(1 - settlePerHour, dt);

  // Melt the forecast-created fresh snow when terrain wet-bulb rises above 0 C.
  if (tw > 0) {
    const meltCmH = Math.min(1.8, 0.18 + 0.22 * tw);
    snowpack = Math.max(0, snowpack - meltCmH * dt);
  }

  if (precipMmH === null || !Number.isFinite(precipMmH) || precipMmH <= 0) {
    return { hourlyCm: 0, cumulativeCm: snowpack };
  }

  const slr = snowToLiquidRatio(phase);
  const fraction = solidFraction(phase);
  // 1 mm liquid * SLR gives mm snow; divide by 10 for cm.
  const addedCm = Math.max(0, precipMmH) * dt * slr * fraction / 10;
  snowpack += addedCm;
  return { hourlyCm: addedCm / dt, cumulativeCm: snowpack };
}

export function formatNewSnowCm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value < 0.05) return '0 cm';
  if (value < 10) return `${value.toFixed(1).replace(/\.0$/, '')} cm`;
  return `${Math.round(value)} cm`;
}
