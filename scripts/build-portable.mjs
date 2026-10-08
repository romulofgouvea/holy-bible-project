import { copyFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const build = spawnSync("npx", ["tauri", "build", "--no-bundle"], {
  stdio: "inherit",
  shell: true,
});

if (build.status !== 0) process.exit(build.status ?? 1);

mkdirSync("dist", { recursive: true });
const target = "dist/Biblia Online (Portable).exe";
copyFileSync("src-tauri/target/release/holy-bible.exe", target);
console.log(`Portable gerado: ${target}`);
