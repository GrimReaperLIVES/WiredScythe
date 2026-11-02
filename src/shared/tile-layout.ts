import { z } from "zod";
export const tilePlacementSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite(),
  height: z.number().finite(),
});
export type TilePlacement = z.infer<typeof tilePlacementSchema>;
export function clampTilePlacement(value: TilePlacement): TilePlacement {
  const width = Math.max(12, Math.min(100, value.width));
  const height = Math.max(12, Math.min(100, value.height));
  return {
    width,
    height,
    x: Math.max(0, Math.min(100 - width, value.x)),
    y: Math.max(0, Math.min(100 - height, value.y)),
  };
}
export function loadTilePlacements(
  raw: string | null,
): Record<string, TilePlacement> {
  try {
    const parsed = z
      .record(z.string().max(50), tilePlacementSchema)
      .parse(JSON.parse(raw ?? "{}"));
    return Object.fromEntries(
      Object.entries(parsed)
        .slice(0, 500)
        .map(([key, value]) => [key, clampTilePlacement(value)]),
    );
  } catch {
    return {};
  }
}
