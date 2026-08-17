import { nextWintryEvent, type EventConfidence, type WintryEventSummary } from './eventOutlook';

export interface ElevationOutlookRow {
  elevationM: number;
  event: WintryEventSummary | null;
}

export interface ElevationImpactSummary {
  rows: ElevationOutlookRow[];
  snowFavouredAboveM: number | null;
  marginalBandLowM: number | null;
  marginalBandHighM: number | null;
  confidence: EventConfidence | null;
}

function sampleElevations(terrainM: number): number[] {
  const base = Math.max(0, Math.round(terrainM / 250) * 250);
  const values = new Set<number>();
  for (let d = -750; d <= 1250; d += 250) values.add(Math.max(0, Math.min(4500, base + d)));
  values.add(Math.max(0, Math.min(4500, Math.round(terrainM / 50) * 50)));
  return [...values].sort((a, b) => a - b);
}

export function elevationImpactOutlook(point: any, terrainM: number | null, fromTime: number): ElevationImpactSummary | null {
  if (!point?.times?.length || terrainM === null || !Number.isFinite(terrainM)) return null;
  const rows = sampleElevations(terrainM).map(elevationM => ({ elevationM, event: nextWintryEvent(point, elevationM, fromTime) }));

  const snowRows = rows.filter(r => r.event && (r.event.dominantPhase.key === 'snow' || r.event.dominantPhase.key === 'wet-snow'));
  const marginalRows = rows.filter(r => r.event && (r.event.dominantPhase.key === 'wet-snow' || r.event.dominantPhase.key === 'mix'));
  const confidenceRank: Record<EventConfidence, number> = { low: 1, medium: 2, high: 3 };
  let confidence: EventConfidence | null = null;
  for (const row of rows) {
    const c = row.event?.confidence;
    if (!c) continue;
    if (!confidence || confidenceRank[c] < confidenceRank[confidence]) confidence = c;
  }

  return {
    rows,
    snowFavouredAboveM: snowRows.length ? Math.min(...snowRows.map(r => r.elevationM)) : null,
    marginalBandLowM: marginalRows.length ? Math.min(...marginalRows.map(r => r.elevationM)) : null,
    marginalBandHighM: marginalRows.length ? Math.max(...marginalRows.map(r => r.elevationM)) : null,
    confidence,
  };
}
