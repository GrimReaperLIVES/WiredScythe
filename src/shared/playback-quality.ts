import type { NativeQualityValue } from "./player";

/** Prefer compatible 720p and lower ladders before using a high-bitrate source. */
export function streamQualitySelector(quality: NativeQualityValue): string {
  return quality === "720p"
    ? "720p,720p30,720p60,480p,480p30,480p60,360p,360p30,best"
    : quality;
}
