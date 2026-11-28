export type NiyamType = "boolean" | "choice" | "count" | "multi";

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

/** A multi-choice entry stores the ticked options as bits: option 1 → 1, option 2 → 2, option 3 → 4 … */
export const optionBit = (o: { sort_order: number }) => 1 << (o.sort_order - 1);

/** The options ticked in a multi-choice entry. */
export const pickedOptions = (niyamId: number, value: number, options: OptionDef[]) =>
  options.filter((o) => o.niyam_id === niyamId && (value & optionBit(o)) !== 0);

/**
 * Points for one niyam entry, or null when the value is not valid for that niyam.
 *  boolean → `points` when value is 1
 *  choice  → points of the chosen option (value = option id)
 *  count   → value × points_per_unit (value must be 1..max_count)
 *  multi   → sum of the ticked options (value = their bits added together)
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
    case "multi": {
      const picked = pickedOptions(niyam.id, value, options);
      // every bit must belong to an option of this niyam
      if (value < 1 || picked.reduce((bits, o) => bits | optionBit(o), 0) !== value) return null;
      return picked.reduce((sum, o) => sum + o.points, 0);
    }
  }
}
