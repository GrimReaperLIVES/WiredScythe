import { app } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  spawn,
  type ChildProcess,
} from "node:child_process";

interface StreamlinkSpawnOptions {
  windowsHide: boolean;
  stdio: ["ignore", "ignore" | "pipe", "ignore" | "pipe"];
}

function resolveSecureRuntime(): { launcherPath: string; pythonPath: string } | null {
  const nativeRoot = app.isPackaged
    ? path.join(process.resourcesPath, "native")
    : process.platform === "darwin" ? path.join(app.getAppPath(), "vendor", "native-mac", process.arch) : path.join(app.getAppPath(), "vendor", "native");
  const launcherPath = app.isPackaged
    ? path.join(process.resourcesPath, "native", "streamlink-launcher.py")
    : path.join(app.getAppPath(), "native", "streamlink-launcher.py");
  const pythonPath = process.platform === "win32" ? path.join(nativeRoot, "streamlink", "Python", "python.exe") : path.join(nativeRoot, "streamlink", "Python", "bin", "python3");
  return existsSync(launcherPath) && existsSync(pythonPath)
    ? { launcherPath, pythonPath }
    : null;
}

/**
 * Starts Streamlink without placing a Twitch token in Windows' process
 * command line. Anonymous launches keep using the normal executable. For an
 * authenticated launch, the bundled Python runtime receives the token through
 * a private stdin pipe and runs the same Streamlink CLI in-process.
 */
export function spawnStreamlink(
  streamlinkPath: string,
  arguments_: string[],
  playbackToken: string | null,
  options: StreamlinkSpawnOptions,
): ChildProcess {
  const hasCookie = arguments_.some(value => value === "--http-cookie" || value.startsWith("--http-cookie="));
  if (!playbackToken && !hasCookie) return spawn(streamlinkPath, arguments_, options);

  const runtime = resolveSecureRuntime();
  if (!runtime) {
    // Never fall back to putting the secret in argv. External/unbundled
    // Streamlink installs can still play anonymously.
    console.warn(
      "[streamlink] Secure authentication bridge unavailable; continuing anonymously.",
    );
    const anonymousArguments: string[] = [];
    for (let index = 0; index < arguments_.length; index++) {
      if (arguments_[index] === "--http-cookie") { index += 1; continue; }
      if (!arguments_[index].startsWith("--http-cookie=")) anonymousArguments.push(arguments_[index]);
    }
    return spawn(streamlinkPath, anonymousArguments, options);
  }

  const child: ChildProcess = spawn(runtime.pythonPath, ["-I", runtime.launcherPath], {
    ...options,
    stdio: ["pipe", options.stdio[1], options.stdio[2]],
  });
  child.stdin?.on("error", () => {
    // A fast startup failure can close stdin before the payload is flushed.
    // The child error/exit handlers at the call site report the useful error.
  });
  child.stdin?.end(
    `${JSON.stringify({ arguments: arguments_, token: playbackToken })}\n`,
    "utf8",
  );
  return child;
}

export function redactSensitivePlaybackText(text: string): string {
  return text
    .replace(
      /(Authorization(?:=|%3D)OAuth(?:\s|%20)+)[A-Za-z0-9._~-]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /([?&](?:token|sig|signature|authorization)=)[^&\s]+/gi,
      "$1[REDACTED]",
    );
}
