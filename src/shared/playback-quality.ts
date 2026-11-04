import type { NativeQualityValue } from "./player";

/** Prefer compatible 720p and lower ladders before using a high-bitrate source. */
export function streamQualitySelector(quality: NativeQualityValue): string {
  const height = Number.parseInt(quality, 10);
  if (Number.isFinite(height) && height <= 480) {
    const lower = [480, 432, 360, 240, 234, 180, 160, 144].filter(value => value <= height)
      .flatMap(value => [`${value}p`, `${value}p30`, `${value}p60`, `${value}p25`, `${value}p50`]);
    return [...new Set([quality, ...lower])].join(",");
  }
  return quality === "720p"
    ? "720p,720p30,720p60,480p,480p30,480p60,360p,360p30,best"
    : quality;
}
