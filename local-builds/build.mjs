import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { resolveSdkPath, syncLocalProperties } from "../scripts/sync-android-sdk.mjs";

const IS_WINDOWS = process.platform === "win32";
const LOCAL_BUILDS_PATH = dirname(fileURLToPath(import.meta.url));
const PROJECT_PATH = join(LOCAL_BUILDS_PATH, "..");
const ANDROID_PATH = join(PROJECT_PATH, "android");
const APP_JSON_PATH = join(PROJECT_PATH, "app.json");
const KEYSTORE_FILE = "keystore.jks";
const KEYSTORE_PATH = join(LOCAL_BUILDS_PATH, KEYSTORE_FILE);
const CREDENTIALS_PATH = join(LOCAL_BUILDS_PATH, "credentials.md");
const STATE_PATH = join(LOCAL_BUILDS_PATH, "deploy-state.json");
const OUTPUT_PATH = join(LOCAL_BUILDS_PATH, "outputs");
const AAB_PATH = join(ANDROID_PATH, "app", "build", "outputs", "bundle", "release", "app-release.aab");
const GRADLE_JVM_ARGS = "-Xmx8g -XX:MaxMetaspaceSize=512m";
const GRADLEW = IS_WINDOWS ? ".\\gradlew.bat" : "./gradlew";
const NPX = "npx";
const BUILDS_TO_KEEP = 3;
const PROGRESS_WIDTH = 40;
const TOTAL_STEPS = 3;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  if (IS_WINDOWS) {
    return spawnSync([command, ...args].join(" "), { ...options, shell: true });
  }
  return spawnSync(command, args, options);
}

function quoteArg(arg) {
  return IS_WINDOWS ? `"${arg}"` : arg;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function showStep(step, label) {
  const filled = Math.round((step / TOTAL_STEPS) * PROGRESS_WIDTH);
  console.log(`\n  ${"█".repeat(filled)}${"░".repeat(PROGRESS_WIDTH - filled)}`);
  console.log(`  ${label}`);
}

async function askVersion(currentVersion) {
  if (!process.stdin.isTTY) return currentVersion;
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question("  Nova versao     [Enter = manter]: ");
  prompt.close();
  return answer.trim() || currentVersion;
}

function resolveVersionCode(currentCode) {
  const state = existsSync(STATE_PATH) ? readJson(STATE_PATH) : { deployed: true };
  if (state.deployed !== true) {
    console.log(`  versionCode:    ${currentCode} (retry - sem incremento)`);
    return currentCode;
  }
  const nextCode = currentCode + 1;
  console.log(`  versionCode:    ${currentCode} -> ${nextCode}`);
  writeFileSync(STATE_PATH, '{"deployed":false}\n');
  return nextCode;
}

function readCredential(credentials, label) {
  return credentials.match(new RegExp(`${label}:\\s*(.+)`))?.[1]?.trim() ?? "";
}

function stopGradle() {
  if (IS_WINDOWS) {
    run("taskkill", ["/F", "/IM", "java.exe", "/T"], { stdio: "ignore" });
    return;
  }
  if (!existsSync(join(ANDROID_PATH, "gradlew"))) return;
  chmodSync(join(ANDROID_PATH, "gradlew"), 0o755);
  run(GRADLEW, ["--stop"], { cwd: ANDROID_PATH, stdio: "ignore" });
}

function prebuild() {
  const result = run(NPX, ["expo", "prebuild", "--clean"], {
    cwd: PROJECT_PATH,
    env: { ...process.env, CI: "1", EXPO_NO_GIT_STATUS: "1" },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    fail(`Erro no prebuild.\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
}

function compile(credentials) {
  if (!IS_WINDOWS) chmodSync(join(ANDROID_PATH, "gradlew"), 0o755);
  const result = run(
    GRADLEW,
    ["bundleRelease", "--quiet", quoteArg(`-Dorg.gradle.jvmargs=${GRADLE_JVM_ARGS}`)],
    {
      cwd: ANDROID_PATH,
      stdio: "inherit",
      env: {
        ...process.env,
        ANDROID_HOME: resolveSdkPath(),
        "ORG_GRADLE_PROJECT_android.injected.signing.store.file": join(ANDROID_PATH, "app", KEYSTORE_FILE),
        "ORG_GRADLE_PROJECT_android.injected.signing.store.password": credentials.storePassword,
        "ORG_GRADLE_PROJECT_android.injected.signing.key.alias": credentials.keyAlias,
        "ORG_GRADLE_PROJECT_android.injected.signing.key.password": credentials.keyPassword,
      },
    },
  );
  if (result.status !== 0) fail("Erro na compilacao.");
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

function publishToOutputs() {
  if (!existsSync(AAB_PATH)) fail("AAB nao encontrado.");
  mkdirSync(OUTPUT_PATH, { recursive: true });
  const fileName = `${formatTimestamp(new Date())}-holy-bible.aab`;
  copyFileSync(AAB_PATH, join(OUTPUT_PATH, fileName));

  readdirSync(OUTPUT_PATH)
    .filter((name) => name.endsWith("-holy-bible.aab"))
    .map((name) => join(OUTPUT_PATH, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    .slice(BUILDS_TO_KEEP)
    .forEach((path) => rmSync(path, { force: true }));

  return fileName;
}

if (!existsSync(KEYSTORE_PATH)) fail(`Keystore nao encontrado: ${KEYSTORE_PATH}`);
if (!existsSync(CREDENTIALS_PATH)) fail(`Credenciais nao encontradas: ${CREDENTIALS_PATH}`);
if (!existsSync(resolveSdkPath())) fail(`Android SDK nao encontrado: ${resolveSdkPath()}`);

const appJson = readJson(APP_JSON_PATH);
const currentVersion = appJson.expo.version;
const currentCode = appJson.expo.android.versionCode;

console.log(`\n  Versao atual:   ${currentVersion}   (versionCode: ${currentCode})`);
const newVersion = await askVersion(currentVersion);
const newCode = resolveVersionCode(currentCode);

appJson.expo.version = newVersion;
appJson.expo.android.versionCode = newCode;
writeFileSync(APP_JSON_PATH, `${JSON.stringify(appJson, null, 2)}\n`);

const credentialsText = readFileSync(CREDENTIALS_PATH, "utf8");
const credentials = {
  storePassword: readCredential(credentialsText, "Android upload keystore password"),
  keyAlias: readCredential(credentialsText, "Android key alias"),
  keyPassword: readCredential(credentialsText, "Android key password"),
};

showStep(1, "Preparando projeto...");
stopGradle();
prebuild();
mkdirSync(join(ANDROID_PATH, "app"), { recursive: true });
copyFileSync(KEYSTORE_PATH, join(ANDROID_PATH, "app", KEYSTORE_FILE));
syncLocalProperties();

showStep(2, "Compilando AAB...");
compile(credentials);

const fileName = publishToOutputs();
showStep(3, `Build pronto (${fileName}).`);
