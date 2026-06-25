import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function run(args) {
  const result = spawnSync(node, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run([path.join(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit"]);
run([path.join(root, "node_modules", "vite", "bin", "vite.js"), "build"]);