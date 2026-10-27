import { ApiError } from "@/integrations/api/client";
import type { DraftResult } from "@/integrations/api/types";

export interface ToastContent {
  title: string;
  description: string;
}

/** Maps the first contract reason of a rejected draft onto the toast the forms show. */
export function describeDraftFailure(
  failure: Extract<DraftResult<unknown>, { ok: false }>
): ToastContent {
  const reason = failure.error;

  if (reason.includes("required")) {
    return { title: "Missing Information", description: reason };
  }
  if (reason.includes("after")) {
    return { title: "Invalid Time Range", description: reason };
  }
  return { title: "Invalid Information", description: reason };
}

/** A server-side 400 explains itself; anything else gets the caller's generic wording. */
export function describeSubmitError(error: unknown, fallback: string): ToastContent {
  const isRejection = error instanceof ApiError && error.status === 400;
  return {
    title: "Error",
    description: isRejection ? error.message : fallback,
  };
}
