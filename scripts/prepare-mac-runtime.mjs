import process from "node:process";
import console from "node:console";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync, writeFileSync, cpSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") throw new Error("Mac runtimes must be prepared on macOS.");
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = "3.12.16";
const release = "20261026";
const builds = [
  { arch: "arm64", triple: "aarch64", hash: "fbf4afef53c2a6b72bb741bc06d5671a9dfaf87bd84e5aa73ac9b3d0d589f14e", platforms: ["macosx_11_0_arm64", "macosx_11_0_universal2", "macosx_10_9_universal2"] },
  { arch: "x64", triple: "x86_64", hash: "a962e47df522889eaa7ff0d6a56203f1079f68aabb65ffdbe8455f362bc769f3", platforms: ["macosx_11_0_x86_64", "macosx_10_9_x86_64", "macosx_11_0_universal2", "macosx_10_9_universal2"] },
];
function run(command, args) {
  const result = spawnSync(command, args, { cwd: workspace, stdio: "inherit" });
  if (result.error || result.status !== 0) throw new Error(`${command} failed while preparing Mac playback.`);
}
for (const build of builds) {
  const archiveName = `cpython-${version}+${release}-${build.triple}-apple-darwin-install_only.tar.gz`;
  const cache = path.join(workspace, ".cache", "native-mac", build.arch);
  const destination = path.join(workspace, "vendor", "native-mac", build.arch);
  const runtime = path.join(destination, "streamlink");
  mkdirSync(cache, { recursive: true }); mkdirSync(runtime, { recursive: true });
  const archive = path.join(cache, "python.tar.gz");
  const url = `https://github.com/astral-sh/python-build-standalone/releases/download/${release}/${encodeURIComponent(archiveName)}`;
  run("curl", ["--fail", "--location", "--retry", "3", "--output", archive, url]);
  if (createHash("sha256").update(readFileSync(archive)).digest("hex") !== build.hash) throw new Error("Portable Python checksum mismatch.");
  run("tar", ["-xzf", archive, "-C", cache]);
  cpSync(path.join(cache, "python"), path.join(runtime, "Python"), { recursive: true, verbatimSymlinks: true });
  run("python3", ["-m", "pip", "install", "--disable-pip-version-check", "--no-compile", "--only-binary=:all:", ...build.platforms.flatMap(platform => ["--platform", platform]), "--implementation", "cp", "--python-version", "3.12", "--abi", "cp312", "--abi", "abi3", "--abi", "none", "--target", path.join(runtime, "pkgs"), "streamlink==8.4.0", "typing_extensions", "exceptiongroup"]);
  mkdirSync(path.join(runtime, "bin"), { recursive: true });
  writeFileSync(path.join(runtime, "run-streamlink.py"), 'import sys\nfrom pathlib import Path\nsys.path.insert(0, str(Path(__file__).resolve().parent / "pkgs"))\nfrom streamlink_cli.main import main\nmain()\n');
  const launcher = path.join(runtime, "bin", "streamlink");
  writeFileSync(launcher, '#!/bin/sh\nROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"\nexec "$ROOT/Python/bin/python3" -I "$ROOT/run-streamlink.py" "$@"\n');
  chmodSync(launcher, 0o755);
  writeFileSync(path.join(destination, "versions.json"), JSON.stringify({ python: version, pythonRelease: release, pythonSha256: build.hash, streamlink: "8.4.0", architecture: build.arch }, null, 2));
  writeFileSync(path.join(destination, "NATIVE_RUNTIME_SOURCES.md"), `Portable Python ${version}: ${url}\nSHA256: ${build.hash}\nSource: https://github.com/astral-sh/python-build-standalone\nStreamlink 8.4.0 and dependencies: https://pypi.org/project/streamlink/8.4.0/\nPython license files and dependency dist-info licenses remain in the bundled runtime.\n`);
  console.log(`Prepared ${build.arch} Mac playback runtime.`);
}
const hostRuntime = path.join(workspace, "vendor", "native-mac", process.arch, "streamlink");
run(path.join(hostRuntime, "bin", "streamlink"), ["--version"]);
const secure = spawnSync(path.join(hostRuntime, "Python", "bin", "python3"), [path.join(workspace, "native", "streamlink-launcher.py")], { input: JSON.stringify({ arguments: ["--version"], token: "fixture-token" }) + "\n", encoding: "utf8" });
if (secure.status !== 0 || !secure.stdout.includes("8.4.0")) throw new Error(`Mac private authentication runtime check failed: ${secure.stderr}`);
