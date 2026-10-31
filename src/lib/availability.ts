import type { Availability } from "@/integrations/api/types";

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

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function toLocalDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);

  return {
    availableDate: toLocalDateInputValue(start),
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  };
}

export function createTimeOptions(): string[] {
  const times: string[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      times.push(`${pad(hour)}:${pad(minute)}`);
    }
  }

  return times;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${pad(hours)}:${pad(minutes)}`;
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

  const availabilityByDate = availability.reduce<Record<string, Availability[]>>(
    (grouped, entry) => {
      (grouped[entry.available_date] ??= []).push(entry);
      return grouped;
    },
    {}
  );
  const commonSlots: CommonAvailabilitySlot[] = [];

  for (const [date, dailyAvailability] of Object.entries(availabilityByDate)) {
    if (new Set(dailyAvailability.map((entry) => entry.participant_name)).size < 2) {
      continue;
    }

    const timePoints = new Set<number>();
    for (const entry of dailyAvailability) {
      timePoints.add(timeToMinutes(entry.start_time));
      timePoints.add(timeToMinutes(entry.end_time));
    }

    const sortedTimePoints = [...timePoints].sort((left, right) => left - right);
    const elementarySlots: CommonAvailabilitySlot[] = [];

    for (let index = 0; index < sortedTimePoints.length - 1; index += 1) {
      const intervalStart = sortedTimePoints[index];
      const intervalEnd = sortedTimePoints[index + 1];
      const participants = new Set<string>();

      for (const entry of dailyAvailability) {
        if (
          timeToMinutes(entry.start_time) <= intervalStart
          && timeToMinutes(entry.end_time) >= intervalEnd
        ) {
          participants.add(entry.participant_name);
        }
      }

      if (participants.size >= 2) {
        elementarySlots.push({
          date,
          startTime: minutesToTime(intervalStart),
          endTime: minutesToTime(intervalEnd),
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

  return commonSlots.sort((left, right) => {
    const dateComparison = left.date.localeCompare(right.date);
    return dateComparison !== 0
      ? dateComparison
      : timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
  });
}
