import { ApiError, request } from "./client";
import { getOwnerToken, saveOwnerToken } from "@/lib/ownerToken";
import type {
  Availability,
  AvailabilityDraft,
  Meeting,
  MeetingDraft,
  MeetingPatch,
} from "./types";
import {
  parseAvailability,
  parseAvailabilityList,
  parseMeeting,
} from "./types";

function sendJson(method: "POST" | "PUT", data: unknown): RequestInit {
  return { method, body: JSON.stringify(data) };
}

async function nullOnNotFound<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

function ownerHeaders(meetingId: string): Record<string, string> {
  const token = getOwnerToken(meetingId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const meetingQueries = {
  async create(data: MeetingDraft): Promise<Meeting> {
    const body = await request("/meetings", sendJson("POST", data));
    const meeting = parseMeeting(body);
    // The server returns the owner token exactly once, on creation.
    const token = typeof body === "object" && body !== null ? (body as Record<string, unknown>).owner_token : undefined;
    if (typeof token === "string" && token.length > 0) {
      saveOwnerToken(meeting.id, token);
    }
    return meeting;
  },

  async findById(id: string): Promise<Meeting | null> {
    return nullOnNotFound(async () =>
      parseMeeting(await request(`/meetings/${encodeURIComponent(id)}`))
    );
  },

  async update(id: string, data: MeetingPatch): Promise<Meeting | null> {
    return nullOnNotFound(async () =>
      parseMeeting(
        await request(`/meetings/${encodeURIComponent(id)}`, {
          ...sendJson("PUT", data),
          headers: ownerHeaders(id),
        })
      )
    );
  },
};

export const availabilityQueries = {
  async create(data: AvailabilityDraft): Promise<Availability> {
    return parseAvailability(await request("/availability", sendJson("POST", data)));
  },

  async findByMeetingId(meetingId: string): Promise<Availability[]> {
    const searchParams = new URLSearchParams({ meeting_id: meetingId });
    return parseAvailabilityList(await request(`/availability?${searchParams.toString()}`));
  },
};
