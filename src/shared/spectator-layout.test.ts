import { describe, expect, it } from "vitest";
import { spectatorFrames } from "./spectator-layout";
describe("spectator camera frames", () => {
  it.each([1, 2, 4, 9])("keeps %i cameras within the canvas", (count) => {
    for (const frame of spectatorFrames("four", count, 1920, 1080)) {
      expect(frame.x).toBeGreaterThanOrEqual(0); expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.width).toBeLessThanOrEqual(1920);
      expect(frame.y + frame.height).toBeLessThanOrEqual(1080);
    }
  });
  it("reserves the main camera beside smaller cameras", () => {
    const frames = spectatorFrames("main", 4, 1920, 1080);
    expect(frames[0].width).toBe(1440);
    expect(frames.slice(1).every((frame) => frame.x === 1440)).toBe(true);
  });
  it("rejects empty layouts", () => { expect(() => spectatorFrames("two", 0, 1920, 1080)).toThrow(); });
});
