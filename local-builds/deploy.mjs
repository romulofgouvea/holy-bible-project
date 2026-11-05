import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_BUILDS_PATH = dirname(fileURLToPath(import.meta.url));
const PROJECT_PATH = join(LOCAL_BUILDS_PATH, "..");
const OUTPUT_PATH = join(LOCAL_BUILDS_PATH, "outputs");
const SERVICE_ACCOUNT_KEY = join(LOCAL_BUILDS_PATH, "google-service-key.json");
const STATE_PATH = join(LOCAL_BUILDS_PATH, "deploy-state.json");
const UPLOAD_SCRIPT = join(LOCAL_BUILDS_PATH, "google-play-deploy.js");
const TRACK_MAP = { preview: "internal", production: "production", internal: "internal", beta: "beta" };

function readTrack() {
  const flagIndex = process.argv.indexOf("--track");
  const track = flagIndex === -1 ? "internal" : process.argv[flagIndex + 1];
  return TRACK_MAP[track] ?? track;
}

function findLatestAab() {
  if (!existsSync(OUTPUT_PATH)) return null;
  const [latest] = readdirSync(OUTPUT_PATH)
    .filter((name) => name.endsWith(".aab"))
    .map((name) => join(OUTPUT_PATH, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return latest ?? null;
}

const latestAab = findLatestAab();
if (!latestAab) {
  console.error(`Nenhum .aab encontrado em ${OUTPUT_PATH}`);
  process.exit(1);
}

const appJson = JSON.parse(readFileSync(join(PROJECT_PATH, "app.json"), "utf8").replace(/^\uFEFF/, ""));
const packageName = appJson.expo.android.package;

const upload = spawnSync(
  process.execPath,
  [UPLOAD_SCRIPT, packageName, SERVICE_ACCOUNT_KEY, latestAab, readTrack()],
  { stdio: "inherit" },
);
if (upload.status !== 0) process.exit(1);

writeFileSync(STATE_PATH, '{"deployed":true}\n');
