export type NiyamType = "boolean" | "choice" | "count";

export interface NiyamDef {
  id: number;
  sort_order: number;
  name_gu: string;
  name_en: string;
  type: NiyamType;
  points: number;
  points_per_unit: number;
  max_count: number;
}

export interface OptionDef {
  id: number;
  niyam_id: number;
  code: string | null;
  label_gu: string;
  label_en: string;
  points: number;
  sort_order: number;
}

/**
 * Points for one niyam entry, or null when the value is not valid for that niyam.
 *  boolean → `points` when value is 1
 *  choice  → points of the chosen option (value = option id)
 *  count   → value × points_per_unit (value must be 1..max_count)
 */
export function scoreEntry(niyam: NiyamDef, value: number, options: OptionDef[]): number | null {
  if (!Number.isInteger(value)) return null;
  switch (niyam.type) {
    case "boolean":
      return value === 1 ? niyam.points : null;
    case "choice": {
      const opt = options.find((o) => o.niyam_id === niyam.id && o.id === value);
      return opt ? opt.points : null;
    }
    case "count":
      if (value < 1 || value > niyam.max_count) return null;
      return value * niyam.points_per_unit;
  }
}
