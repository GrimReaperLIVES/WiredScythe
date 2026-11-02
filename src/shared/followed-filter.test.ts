import { describe, expect, it } from "vitest";
import { visibleLocalFavorites } from "./followed-filter";

describe("followed sidebar service filters", () => {
  const favorites = new Set(["same_name", "kick:same_name", "another"]);
  it("keeps only Twitch favorites under Twitch", () => {
    expect(visibleLocalFavorites(favorites, [], "twitch")).toEqual(["same_name", "another"]);
  });
  it("keeps only Kick favorites under Kick", () => {
    expect(visibleLocalFavorites(favorites, [], "kick")).toEqual(["kick:same_name"]);
  });
  it("keeps same-name channels distinct under Both without duplicating follows", () => {
    expect(visibleLocalFavorites(favorites, [{ login: "same_name" }], "both")).toEqual(["kick:same_name", "another"]);
  });
});
