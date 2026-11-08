const STORAGE_PREFIX = "schedula:owner-token:";

export function saveOwnerToken(meetingId: string, token: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${meetingId}`, token);
  } catch {
    // Storage unavailable (private mode, blocked): the creator just won't be able to edit.
  }
}

export function getOwnerToken(meetingId: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${meetingId}`);
  } catch {
    return null;
  }
}
