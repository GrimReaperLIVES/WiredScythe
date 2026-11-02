import { describe, expect, it } from "vitest";
import { clampTilePlacement, loadTilePlacements } from "./tile-layout";
describe("saved custom stream layouts", () => {
  it("keeps dragged and resized tiles within the canvas", () => {
    expect(
      clampTilePlacement({ x: 110, y: -20, width: 40, height: 150 }),
    ).toEqual({ x: 60, y: 0, width: 40, height: 100 });
  });
  it("restores channel placements and clamps old offscreen values", () => {
    expect(
      loadTilePlacements(
        JSON.stringify({
          "kick:xqc": { x: -10, y: 90, width: 50, height: 30 },
        }),
      ),
    ).toEqual({ "kick:xqc": { x: 0, y: 70, width: 50, height: 30 } });
  });
  it("recovers from corrupt saved data", () => {
    expect(loadTilePlacements("not JSON")).toEqual({});
    expect(loadTilePlacements('{"camera":{"x":"bad"}}')).toEqual({});
  });
});
