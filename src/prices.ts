import table from "../prices.json";

export interface PriceEntry {
  name: string;
  aliases: string[];
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
  source: string;
  note?: string;
}

export const prices = table as PriceEntry[];

// new-api baseline: ratio 1 = $2 per 1M tokens.
const USD_PER_RATIO = 2;

export interface RatioConfig {
  model_ratio: Record<string, number>;
  completion_ratio: Record<string, number>;
  cache_ratio: Record<string, number>;
  create_cache_ratio: Record<string, number>;
}

// Trim float noise such as 0.30000000000000004 without losing real precision.
export function round(n: number): number {
  return Number.parseFloat(n.toPrecision(12));
}

export function buildRatios(entries: PriceEntry[]): RatioConfig {
  const out: RatioConfig = {
    model_ratio: {},
    completion_ratio: {},
    cache_ratio: {},
    create_cache_ratio: {},
  };
  for (const e of entries) {
    for (const key of [e.name, ...e.aliases]) {
      out.model_ratio[key] = round(e.input / USD_PER_RATIO);
      out.completion_ratio[key] = round(e.output / e.input);
      if (e.cache_read !== undefined) out.cache_ratio[key] = round(e.cache_read / e.input);
      if (e.cache_write !== undefined) out.create_cache_ratio[key] = round(e.cache_write / e.input);
    }
  }
  return out;
}
