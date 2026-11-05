import { copyFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const build = spawnSync("npx", ["tauri", "build", "--no-bundle"], {
  stdio: "inherit",
  shell: true,
});

if (build.status !== 0) process.exit(build.status ?? 1);

mkdirSync("dist", { recursive: true });
const extension = process.platform === "win32" ? ".exe" : "";
const target = `dist/Biblia Online (Portable)${extension}`;
copyFileSync(`src-tauri/target/release/holy-bible${extension}`, target);
console.log(`Portable gerado: ${target}`);
