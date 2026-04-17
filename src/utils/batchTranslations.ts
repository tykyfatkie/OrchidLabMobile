const BATCH_UNIT_VI_MAP: Record<string, string> = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  meter: 'm',
  meters: 'm',
  inch: 'inch',
  inches: 'inch',
  ft: 'ft',
  feet: 'ft',
};

export const translateBatchUnitVi = (unit?: string | null) => {
  if (!unit) return 'N/A';

  const normalized = String(unit).trim().toLowerCase();
  return BATCH_UNIT_VI_MAP[normalized] ?? String(unit).trim();
};