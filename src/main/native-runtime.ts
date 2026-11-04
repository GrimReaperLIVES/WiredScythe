import { app } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { NativePlayerAvailability } from "../shared/player";

function resolveFromPath(executable: string): string | null {
  const result = spawnSync(process.platform === "win32" ? "where.exe" : "which", [executable], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0 || !result.stdout) return null;
  return (
    result.stdout
      .split(/\r?\n/)
      .map((candidate) => candidate.trim())
      .find((candidate) => candidate.length > 0 && existsSync(candidate)) ?? null
  );
}

function resolveExecutable(
  environmentVariables: string[],
  executable: string,
  bundledPaths: string[],
  knownPaths: string[],
): string | null {
  for (const environmentVariable of environmentVariables) {
    const override = process.env[environmentVariable]?.trim();
    if (override && existsSync(override)) return override;
  }

  const bundled = bundledPaths.find((candidate) => existsSync(candidate));
  if (bundled) return bundled;

  const fromPath = resolveFromPath(executable);
  if (fromPath) return fromPath;

  return knownPaths.find((candidate) => existsSync(candidate)) ?? null;
}

let cachedAvailability: NativePlayerAvailability | null = null;
let availabilityCheckedAt = 0;

export function getNativeRuntimeAvailability(): NativePlayerAvailability {
  if (cachedAvailability && Date.now() - availabilityCheckedAt < 30_000) return { ...cachedAvailability };
  availabilityCheckedAt = Date.now();

  const localAppData = process.env.LOCALAPPDATA ?? "";
  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const nativeResources = app.isPackaged
    ? path.join(process.resourcesPath, "native")
    : process.platform === "darwin" ? path.join(app.getAppPath(), "vendor", "native-mac", process.arch) : path.join(app.getAppPath(), "vendor", "native");
  const streamlinkPath = resolveExecutable(
    ["CYBERWIRE_STREAMLINK_PATH", "WIREDSCYTHE_STREAMLINK_PATH"],
    process.platform === "win32" ? "streamlink.exe" : "streamlink",
    [path.join(nativeResources, "streamlink", "bin", process.platform === "win32" ? "streamlink.exe" : "streamlink")],
    process.platform === "win32" ? [
      path.join(programFiles, "Streamlink", "bin", "streamlink.exe"),
      path.join(localAppData, "Programs", "Streamlink", "bin", "streamlink.exe"),
      path.join(localAppData, "Microsoft", "WinGet", "Links", "streamlink.exe"),
    ] : ["/opt/homebrew/bin/streamlink", "/usr/local/bin/streamlink", "/usr/bin/streamlink"],
  );

  cachedAvailability = streamlinkPath
    ? { available: true, streamlinkPath }
    : {
        available: false,
        reason: process.platform === "darwin" ? "Install Streamlink for macOS, then retry after 30 seconds. Homebrew installations are detected automatically." : "Streamlink is unavailable. Install it, then retry after 30 seconds.",
      };
  return { ...cachedAvailability };
}
