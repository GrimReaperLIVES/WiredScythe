import process from "node:process";
import console from "node:console";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

if (process.platform !== "darwin") throw new Error("Mac package verification needs macOS.");
for (const arch of ["arm64", "x64"]) {
  const resources = path.resolve("release", arch === "arm64" ? "mac-arm64" : "mac", "Cyber Wire.app", "Contents", "Resources");
  const runtime = path.join(resources, "native", "streamlink");
  const python = path.join(runtime, "Python", "bin", "python3");
  assert(existsSync(python), `${arch} portable Python is missing from the packaged app`);
  const binary = spawnSync("file", ["-b", "-L", python], { encoding: "utf8" });
  assert.equal(binary.status, 0);
  assert(binary.stdout.includes(arch === "arm64" ? "arm64" : "x86_64"), `${arch} package has the wrong Python architecture`);
  if (arch !== process.arch) continue;
  const version = spawnSync(path.join(runtime, "bin", "streamlink"), ["--version"], { encoding: "utf8" });
  assert.equal(version.status, 0, version.stderr); assert(version.stdout.includes("8.4.0"));
  const privateLaunch = spawnSync(python, ["-I", path.join(resources, "native", "streamlink-launcher.py")], { input: JSON.stringify({ arguments: ["--version"], token: "fixture-token" }) + "\n", encoding: "utf8" });
  assert.equal(privateLaunch.status, 0, privateLaunch.stderr); assert(privateLaunch.stdout.includes("8.4.0"));
}
console.log("Packaged Mac runtimes: both architectures present; host anonymous/private launches pass.");
