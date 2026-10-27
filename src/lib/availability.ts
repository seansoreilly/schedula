import type { Availability } from "@/integrations/api/types";
import {
  END_OF_DAY,
  formatTimeOfDay,
  parseTimeOfDay,
} from "../../shared/time-of-day";

export interface AvailabilityDefaults {
  availableDate: string;
  startTime: string;
  endTime: string;
}

export interface CommonAvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  participants: string[];
}

export interface AvailabilityDay {
  date: string;
  entries: Availability[];
}

const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;
const END_OF_DAY_MINUTES = parseTimeOfDay(END_OF_DAY) ?? 0;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function toLocalDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Start + 30 minutes, capped at 23:59 because ranges never cross midnight. "" if `start` is not a time. */
export function defaultEndTime(start: string): string {
  const startMinutes = parseTimeOfDay(start);
  if (startMinutes === null) {
    return "";
  }

  const endMinutes = startMinutes + SLOT_MINUTES;
  return endMinutes >= END_OF_DAY_MINUTES ? END_OF_DAY : formatTimeOfDay(endMinutes);
}

export function todayDateInputValue(now: Date = new Date()): string {
  return toLocalDateInputValue(now);
}

export function getAvailabilityDefaults(now: Date = new Date()): AvailabilityDefaults {
  const start = new Date(now);
  start.setSeconds(0, 0);

  const minutesToNextHalfHour = start.getMinutes() < 30
    ? 30 - start.getMinutes()
    : 60 - start.getMinutes();
  start.setMinutes(start.getMinutes() + minutesToNextHalfHour);

  // The API stores one date per range, so avoid a default that crosses midnight.
  if (start.getHours() === 23 && start.getMinutes() === 30) {
    start.setMinutes(start.getMinutes() + 30);
  }

  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;

  return {
    availableDate: toLocalDateInputValue(start),
    startTime,
    endTime: defaultEndTime(startTime),
  };
}

/** 00:00, 00:30 … 23:30 */
export function createStartTimeOptions(): string[] {
  return Array.from({ length: SLOTS_PER_DAY }, (_, slot) => formatTimeOfDay(slot * SLOT_MINUTES));
}

/** 00:30, 01:00 … 23:30, 23:59 */
export function createEndTimeOptions(): string[] {
  return [...createStartTimeOptions().slice(1), END_OF_DAY];
}

/** "13:30" → "1:30 PM" */
export function formatTimeLabel(time: string): string {
  const totalMinutes = parseTimeOfDay(time);
  if (totalMinutes === null) {
    return time;
  }

  const hours = Math.floor(totalMinutes / 60);
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${pad(totalMinutes % 60)} ${hours >= 12 ? "PM" : "AM"}`;
}

/** "2026-01-02" → "Friday, January 2, 2026" */
export function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Orders rows by date, then start time. */
export function compareAvailability(left: Availability, right: Availability): number {
  return left.available_date.localeCompare(right.available_date)
    || left.start_time.localeCompare(right.start_time);
}

/** Dates ascending; each day's rows by start time. Does not mutate the input. */
export function groupAvailabilityByDate(availability: Availability[]): AvailabilityDay[] {
  const days = new Map<string, Availability[]>();
  for (const entry of [...availability].sort(compareAvailability)) {
    const entries = days.get(entry.available_date);
    if (entries) {
      entries.push(entry);
    } else {
      days.set(entry.available_date, [entry]);
    }
  }

  return [...days].map(([date, entries]) => ({ date, entries }));
}

function minutesOf(time: string): number {
  return parseTimeOfDay(time) ?? 0;
}

function haveSameParticipants(left: string[], right: string[]): boolean {
  return left.length === right.length
    && left.every((participant, index) => participant === right[index]);
}

export function findCommonAvailabilitySlots(
  availability: Availability[]
): CommonAvailabilitySlot[] {
  if (availability.length < 2) {
    return [];
  }

  const commonSlots: CommonAvailabilitySlot[] = [];

  for (const { date, entries: dailyAvailability } of groupAvailabilityByDate(availability)) {
    if (new Set(dailyAvailability.map((entry) => entry.participant_name)).size < 2) {
      continue;
    }

    const timePoints = new Set<number>();
    for (const entry of dailyAvailability) {
      timePoints.add(minutesOf(entry.start_time));
      timePoints.add(minutesOf(entry.end_time));
    }

    const sortedTimePoints = [...timePoints].sort((left, right) => left - right);
    const elementarySlots: CommonAvailabilitySlot[] = [];

    for (let index = 0; index < sortedTimePoints.length - 1; index += 1) {
      const intervalStart = sortedTimePoints[index];
      const intervalEnd = sortedTimePoints[index + 1];
      const participants = new Set<string>();

      for (const entry of dailyAvailability) {
        if (
          minutesOf(entry.start_time) <= intervalStart
          && minutesOf(entry.end_time) >= intervalEnd
        ) {
          participants.add(entry.participant_name);
        }
      }

      if (participants.size >= 2) {
        elementarySlots.push({
          date,
          startTime: formatTimeOfDay(intervalStart),
          endTime: formatTimeOfDay(intervalEnd),
          participants: [...participants].sort(),
        });
      }
    }

    const [firstSlot, ...remainingSlots] = elementarySlots;
    if (!firstSlot) {
      continue;
    }

    let currentSlot = { ...firstSlot };
    for (const nextSlot of remainingSlots) {
      if (
        nextSlot.startTime === currentSlot.endTime
        && haveSameParticipants(nextSlot.participants, currentSlot.participants)
      ) {
        currentSlot.endTime = nextSlot.endTime;
      } else {
        commonSlots.push(currentSlot);
        currentSlot = { ...nextSlot };
      }
    }
    commonSlots.push(currentSlot);
  }

  return commonSlots;
}
