export type SpectatorPreset = "two" | "four" | "main";
export function spectatorFrames(preset: SpectatorPreset, count: number, width: number, height: number) {
  if (count < 1 || count > 9 || width <= 0 || height <= 0) throw new Error("Invalid camera layout.");
  if (preset === "main" && count > 1) {
    const mainWidth = width * 0.75;
    return [{ x: 0, y: 0, width: mainWidth, height }, ...Array.from({ length: count - 1 }, (_, index) => ({ x: mainWidth, y: index * height / (count - 1), width: width - mainWidth, height: height / (count - 1) }))];
  }
  const columns = preset === "two" && count <= 2 ? count : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, index) => ({ x: index % columns * width / columns, y: Math.floor(index / columns) * height / rows, width: width / columns, height: height / rows }));
}
