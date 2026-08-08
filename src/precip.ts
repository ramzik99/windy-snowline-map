import { valueAt } from './snowLevel';

const PRECIP_KEYS = [
  'past3hprecip-surface',
  'precip-surface',
  'precip',
  'precipitation-surface',
  'precipitation',
];

function firstField(data: Record<string, unknown>): { key: string; field: unknown } | null {
  for (const key of PRECIP_KEYS) {
    if (data[key] != null) return { key, field: data[key] };
  }
  return null;
}

function toMillimetres(key: string, raw: number): number {
  // Windy's documented past3hprecip-surface unit is metres of water equivalent.
  // Keep generic precip aliases conservative because some payloads expose them in mm.
  if (key === 'past3hprecip-surface') return raw * 1000;
  if (Math.abs(raw) < 0.02) return raw * 1000;
  return raw;
}

export function precipMmAt(data: Record<string, unknown>, index: number): number | null {
  const found = firstField(data);
  if (!found) return null;
  const raw = valueAt(found.field, index);
  if (raw === null || !Number.isFinite(raw)) return null;
  return Math.max(0, toMillimetres(found.key, raw));
}

export function formatPrecipMm(mm: number): string {
  if (mm < 0.05) return '0';
  if (mm < 1) return mm.toFixed(1);
  if (mm < 10) return mm.toFixed(1).replace(/\.0$/, '');
  return String(Math.round(mm));
}
