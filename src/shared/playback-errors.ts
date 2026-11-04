/** Streamlink distinguishes an absent rendition from an unavailable URL/service. */
export function isMissingRendition(error: unknown): boolean {
  return error instanceof Error && error.name !== "AbortError" &&
    /specified stream\(s\).*could not be found/i.test(error.message);
}

export function isConfirmedOffline(error: string | undefined): boolean {
  return error === "Stream is offline.";
}
