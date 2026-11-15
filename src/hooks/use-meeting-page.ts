import { useCallback, useEffect, useReducer, useState } from "react";
import { availabilityQueries, meetingQueries } from "@/integrations/api/queries";
import type { AvailabilityDraft } from "@/integrations/api/types";
import { track } from "@/lib/analytics";
import {
  initialMeetingPageState,
  loadMeetingPage,
  meetingPageReducer,
  renameMeeting,
  submitAvailability,
} from "@/lib/meeting-page";
import type { MeetingPageQueries, MeetingPageState } from "@/lib/meeting-page";

const queries: MeetingPageQueries = {
  meetings: meetingQueries,
  availability: availabilityQueries,
};

export interface MeetingPage extends MeetingPageState {
  reload: () => void;
  /** Resolves true when renamed, false when the meeting no longer exists. Rejects on failure. */
  rename: (title: string) => Promise<boolean>;
  /** Appends the created row locally. Rejects on failure. */
  addAvailability: (draft: AvailabilityDraft) => Promise<void>;
}

export function useMeetingPage(meetingId: string | undefined): MeetingPage {
  const [state, dispatch] = useReducer(meetingPageReducer, initialMeetingPageState);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;

    dispatch({ type: "loading" });
    void loadMeetingPage(queries, meetingId).then((event) => {
      if (!isCurrentRequest) {
        return;
      }

      // A missing meeting has always been reported as a server-side load error; a missing id is not.
      if (event.type === "failed") {
        track("meeting_load_error", { error_type: event.errorType });
      } else if (event.type === "not-found" && meetingId) {
        track("meeting_load_error", { error_type: "server" });
      }
      dispatch(event);
    });

    return () => {
      isCurrentRequest = false;
    };
  }, [meetingId, reloadCount]);

  const reload = useCallback((): void => {
    setReloadCount((count) => count + 1);
  }, []);

  const rename = useCallback(
    async (title: string): Promise<boolean> => {
      if (!meetingId) {
        return false;
      }
      const event = await renameMeeting(queries, meetingId, title);
      dispatch(event);
      return event.type === "renamed";
    },
    [meetingId]
  );

  const addAvailability = useCallback(async (draft: AvailabilityDraft): Promise<void> => {
    dispatch(await submitAvailability(queries, draft));
  }, []);

  return { ...state, reload, rename, addAvailability };
}
