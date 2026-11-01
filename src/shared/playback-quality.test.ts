import { describe, expect, it } from "vitest";
import { streamQualitySelector } from "./playback-quality";
import { appPreferencesPatchSchema } from "./preferences";

describe("playback quality choices", () => {
  it("tries all supported 720p variants before lower ladders and source fallback", () => {
    const choices = streamQualitySelector("720p").split(",");
    expect(choices.slice(0, 3)).toEqual(["720p", "720p30", "720p60"]);
    expect(choices.indexOf("480p")).toBeLessThan(choices.indexOf("best"));
  });
  it.each(["1080p60", "1440p", "source", "best", "audio_only"])("preserves explicit choice %s", (quality) => {
    expect(streamQualitySelector(quality)).toBe(quality);
  });
  it("validates remembered qualities separately per platform", () => {
    const patch = { channelQualityOverrides: { xqc: "1080p60", "kick:xqc": "480p" } };
    expect(appPreferencesPatchSchema.parse(patch)).toEqual(patch);
    expect(appPreferencesPatchSchema.safeParse({ channelQualityOverrides: { xqc: "bad;command" } }).success).toBe(false);
  });
});
