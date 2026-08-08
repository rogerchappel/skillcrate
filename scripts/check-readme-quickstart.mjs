import { readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const quickstart = readme.match(/## Quickstart\s+```bash\n([\s\S]*?)\n```/);

if (!quickstart) {
  throw new Error("README Quickstart bash block not found");
}

const commands = quickstart[1].split("\n").filter(Boolean);
if (commands.length === 0) {
  throw new Error("README Quickstart bash block is empty");
}

rmSync(new URL("../.tmp", import.meta.url), { recursive: true, force: true });

for (const command of commands) {
  const result = spawnSync(command, {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`README Quickstart command failed (${result.status}): ${command}`);
  }
}

console.log(`README Quickstart smoke passed (${commands.length} commands)`);
