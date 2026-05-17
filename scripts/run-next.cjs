#!/usr/bin/env node

const { spawn } = require("child_process");

const mode = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!mode || !["dev", "start"].includes(mode)) {
  console.error("Usage: node scripts/run-next.cjs <dev|start> [...extraArgs]");
  process.exit(1);
}

const port = process.env.PORT || "3018";
const host = process.env.HOST || process.env.HOSTNAME || "0.0.0.0";
const nextBin = require.resolve("next/dist/bin/next");
const command = [process.execPath, [nextBin, mode, "-p", port, "-H", host, ...extraArgs]];

const child = spawn(command[0], command[1], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: host,
    ...(mode === "dev" ? { NEXT_DISABLE_FILE_SYSTEM_CACHE: "1" } : {}),
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
