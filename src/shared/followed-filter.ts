import { parseChannelKey, type Platform } from "./platform";

export function visibleLocalFavorites(
  favorites: Iterable<string>,
  followed: readonly { login: string }[],
  filter: Platform | "both",
): string[] {
  const followedKeys = new Set(followed.map((channel) => channel.login));
  return [...favorites].filter((key) =>
    (filter === "both" || parseChannelKey(key).platform === filter) && !followedKeys.has(key),
  );
}
