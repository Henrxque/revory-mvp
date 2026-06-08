import { spawn } from "node:child_process";

function log(message: string) {
  console.log(`[launch-readiness-qa] ${message}`);
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

log(`Using local app server at ${appUrl}.`);
log(
  "Start the app server before this command. For non-AI launch QA, run the server with REVORY_LLM_ENABLED=false.",
);
log(
  "Use npm run smoke:ai-csv-provider separately when explicitly validating the real AI CSV provider.",
);

const child = spawn(process.execPath, ["scripts/run-clean-rerun.mjs"], {
  env: process.env,
  shell: false,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[launch-readiness-qa] Clean rerun stopped by signal ${signal}.`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
