#!/usr/bin/env node
/**
 * Start Next.js dev server on the port assigned to this checkout.
 */
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const resolveScript = resolve(scriptDir, "resolve-dev-port.mjs");

const resolveProc = spawn("node", [resolveScript, "--ensure"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "inherit"],
});

let portOutput = "";

resolveProc.stdout.on("data", (chunk) => {
  portOutput += chunk.toString();
});

resolveProc.on("close", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const port = portOutput.trim();
  if (!port) {
    console.error("Could not resolve dev port.");
    process.exit(1);
  }

  console.log(`Starting dev server at http://localhost:${port}`);

  const nextBin = resolve(process.cwd(), "node_modules/.bin/next");
  const child = spawn(nextBin, ["dev", "--port", port], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  child.on("close", (nextCode) => {
    process.exit(nextCode ?? 0);
  });
});
