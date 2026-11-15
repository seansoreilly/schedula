// The browser and the API share one definition of a Meeting/Availability and of a valid draft.
export type {
  Availability,
  AvailabilityDraft,
  DraftResult,
  FieldErrors,
  Meeting,
  MeetingDraft,
  MeetingPatch,
} from "../../../shared/contract";
export {
  parseAvailability,
  parseAvailabilityDraft,
  parseAvailabilityList,
  parseMeeting,
  parseMeetingDraft,
} from "../../../shared/contract";
