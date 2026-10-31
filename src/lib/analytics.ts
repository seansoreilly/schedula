/**
 * Google Analytics event tracking.
 *
 * Thin typed wrapper around the global `gtag` function. Page views are sent
 * automatically by the `gtag('config', ...)` call in index.html, so only
 * custom events go through here.
 *
 * Events are only sent from the production hostnames so preview deployments,
 * localhost and *.vercel.app traffic don't pollute GA reports.
 *
 * @see https://developers.google.com/analytics/devguides/collection/ga4/events
 */

const PRODUCTION_HOSTNAMES: readonly string[] = [
  "www.schedula.xyz",
  "schedula.xyz",
];

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: object) => void;
  }
}

/** Event names and their parameters. Keep in sync with GA4 custom dimensions. */
export interface AnalyticsEvents {
  /** Primary conversion: a new meeting poll was created. */
  meeting_created: Record<string, never>;
  meeting_create_error: { error_type: ErrorType };
  /** A participant submitted availability for a meeting. */
  availability_added: { duration_minutes: number };
  availability_add_error: { error_type: ErrorType };
  /** GA4 recommended event: the meeting link was shared or copied. */
  share: { method: "copy_link" | "web_share"; content_type: "meeting" };
  meeting_load_error: { error_type: ErrorType };
}

export type ErrorType = "network" | "server";

/** True when the hostname is one of the production hostnames. */
export const isProductionHostname = (hostname: string): boolean =>
  PRODUCTION_HOSTNAMES.includes(hostname);

const shouldSend = (): boolean =>
  typeof window !== "undefined" &&
  isProductionHostname(window.location.hostname) &&
  typeof window.gtag === "function";

/** Classifies a thrown value as a transport failure (fetch rejects with TypeError) or a server-side one. */
export const classifyError = (error: unknown): ErrorType =>
  error instanceof TypeError ? "network" : "server";

/**
 * Sends a custom event to Google Analytics.
 *
 * Off the production hostnames the event is logged to the console instead.
 * Never throws.
 */
export const track = <K extends keyof AnalyticsEvents>(
  eventName: K,
  params: AnalyticsEvents[K]
): void => {
  if (!shouldSend()) {
    console.log(`[Analytics Event]: ${eventName}`, params);
    return;
  }

  try {
    window.gtag?.("event", eventName, params);
  } catch (error) {
    console.error(`[Analytics]: Failed to track event "${eventName}":`, error);
  }
};
