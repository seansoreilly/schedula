// Runtime-agnostic: imported by the API functions (Vercel's native ESM runtime), the browser bundle and vitest.
// Relative imports in shared/ must carry a .js extension (tests/api/esm-imports.test.ts enforces it).

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export const MINUTES_PER_DAY = 24 * 60;

/** The latest representable end of an availability range (ranges never cross midnight). */
export const END_OF_DAY = "23:59";

export function parseTimeOfDay(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = TIME_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatTimeOfDay(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/** Accepts HH:MM or HH:MM:SS (as Postgres returns `time`) and returns HH:MM, or null. */
export function normalizeTimeOfDay(value: unknown): string | null {
  const minutes = parseTimeOfDay(value);
  return minutes === null ? null : formatTimeOfDay(minutes);
}
