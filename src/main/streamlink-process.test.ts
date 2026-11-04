import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runtimeAvailable: true,
  spawn: vi.fn(),
  stdin: {
    end: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock("electron", () => ({
  app: {
    getAppPath: () => "C:\\WiredScythe",
    isPackaged: false,
  },
}));

vi.mock("node:fs", () => ({
  existsSync: () => mocks.runtimeAvailable,
}));

vi.mock("node:child_process", () => ({
  spawn: mocks.spawn,
}));

import {
  redactSensitivePlaybackText,
  spawnStreamlink,
} from "./streamlink-process";

describe("secure Streamlink launching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtimeAvailable = true;
    mocks.spawn.mockReturnValue({ stdin: mocks.stdin });
  });

  it("sends authenticated launch data over stdin without putting the token in argv", () => {
    const token = "abcdefghijklmnopqrstuvwxyz0123";
    const arguments_ = ["--no-config", "https://www.twitch.tv/example", "best"];

    spawnStreamlink("C:\\Streamlink\\streamlink.exe", arguments_, token, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const [executable, processArguments] = mocks.spawn.mock.calls[0] as [
      string,
      string[],
    ];
    expect(executable).toMatch(/python(?:\.exe|3)$/i);
    expect(processArguments.join(" ")).not.toContain(token);
    expect(mocks.stdin.end).toHaveBeenCalledWith(
      `${JSON.stringify({ arguments: arguments_, token })}\n`,
      "utf8",
    );
  });

  it("continues anonymously instead of leaking a token when the secure runtime is unavailable", () => {
    const token = "abcdefghijklmnopqrstuvwxyz0123";
    const arguments_ = ["--no-config", "https://www.twitch.tv/example", "best"];
    mocks.runtimeAvailable = false;

    spawnStreamlink("C:\\Streamlink\\streamlink.exe", arguments_, token, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const [executable, processArguments] = mocks.spawn.mock.calls[0] as [
      string,
      string[],
    ];
    expect(executable).toBe("C:\\Streamlink\\streamlink.exe");
    expect(processArguments).toEqual(arguments_);
    expect(processArguments.join(" ")).not.toContain(token);
    expect(mocks.stdin.end).not.toHaveBeenCalled();
  });

  it("redacts playback credentials and signed URL parameters from diagnostics", () => {
    expect(
      redactSensitivePlaybackText(
        "Authorization=OAuth secret123 https://usher.ttvnw.net/a.m3u8?sig=abc&token=def",
      ),
    ).toBe(
      "Authorization=OAuth [REDACTED] https://usher.ttvnw.net/a.m3u8?sig=[REDACTED]&token=[REDACTED]",
    );
  });
  it("keeps Kick cookies off the operating system command line", () => {
    const arguments_ = ["--http-cookie", "session=fixture-secret", "https://kick.com/example", "720p"];
    spawnStreamlink("streamlink", arguments_, null, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    expect(mocks.spawn.mock.calls[0][1].join(" ")).not.toContain("fixture-secret");
    expect(mocks.stdin.end).toHaveBeenCalledWith(`${JSON.stringify({ arguments: arguments_, token: null })}\n`, "utf8");
  });
  it("removes private cookies when no secure runtime is available", () => {
    mocks.runtimeAvailable = false;
    spawnStreamlink("streamlink", ["--http-cookie", "session=fixture-secret", "https://kick.com/example", "720p"], null, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    expect(mocks.spawn.mock.calls[0][1]).toEqual(["https://kick.com/example", "720p"]);
  });
});
