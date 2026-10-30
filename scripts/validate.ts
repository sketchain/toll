import { prices } from "../src/prices";
import { channels } from "./required-models";

const errors: string[] = [];

// Count every name/alias so duplicates anywhere in the table are caught.
const occurrences = new Map<string, string[]>();
for (const e of prices) {
  const label = e.name ?? "<unnamed>";
  if (typeof e.name !== "string" || e.name === "") errors.push(`entry missing name: ${JSON.stringify(e)}`);
  if (!Array.isArray(e.aliases)) errors.push(`${label}: aliases must be an array`);
  for (const key of [e.name, ...(e.aliases ?? [])]) {
    occurrences.set(key, [...(occurrences.get(key) ?? []), label]);
  }

  for (const field of ["input", "output"] as const) {
    const v = e[field];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) errors.push(`${label}: ${field} must be a positive number, got ${v}`);
  }
  for (const field of ["cache_read", "cache_write"] as const) {
    const v = e[field];
    if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v <= 0)) {
      errors.push(`${label}: ${field} must be a positive number when present, got ${v}`);
    }
  }
  if (typeof e.source !== "string" || !/^https?:\/\/\S+$/.test(e.source)) errors.push(`${label}: missing or invalid source URL`);
}

for (const [key, owners] of occurrences) {
  if (owners.length > 1) errors.push(`"${key}" appears ${owners.length} times (in: ${owners.join(", ")})`);
}

for (const [channel, models] of Object.entries(channels)) {
  for (const m of models) {
    if (!occurrences.has(m)) errors.push(`[${channel}] "${m}" not found in any name or aliases`);
  }
}

if (errors.length > 0) {
  console.error(`prices.json validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const keys = occurrences.size;
console.log(`prices.json OK: ${prices.length} entries, ${keys} model keys, all channel models covered.`);
