import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_PATH = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANDROID_PATH = join(PROJECT_PATH, "android");
const LOCAL_PROPERTIES_PATH = join(ANDROID_PATH, "local.properties");
const CMAKE_VERSION = "3.31.6";
const PLATFORM_CACHE_DIRS = [".gradle", "build", "app/build", "app/.cxx"];

export function resolveSdkPath() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv) return fromEnv;
  if (process.platform === "win32") {
    return join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  }
  return join(homedir(), "Android", "Sdk");
}

function toPropertyPath(path) {
  return path.replaceAll("\\", "/");
}

function readSdkDir() {
  if (!existsSync(LOCAL_PROPERTIES_PATH)) return null;
  const properties = readFileSync(LOCAL_PROPERTIES_PATH, "utf8");
  return properties.match(/^sdk\.dir=(.*)$/m)?.[1]?.trim() ?? null;
}

export function syncLocalProperties() {
  if (!existsSync(ANDROID_PATH)) return;

  const sdkPath = resolveSdkPath();
  if (!existsSync(sdkPath)) {
    console.error(`Android SDK nao encontrado: ${sdkPath}`);
    process.exit(1);
  }

  const sdkDir = toPropertyPath(sdkPath);
  const previousSdkDir = readSdkDir();
  if (previousSdkDir && previousSdkDir !== sdkDir) {
    console.log(`SDK mudou (${previousSdkDir} -> ${sdkDir}), limpando caches do Gradle...`);
    for (const dir of PLATFORM_CACHE_DIRS) {
      rmSync(join(ANDROID_PATH, dir), { recursive: true, force: true });
    }
  }

  const lines = [`sdk.dir=${sdkDir}`];
  const cmakePath = join(sdkPath, "cmake", CMAKE_VERSION);
  if (existsSync(cmakePath)) lines.push(`cmake.dir=${toPropertyPath(cmakePath)}`);
  writeFileSync(LOCAL_PROPERTIES_PATH, `${lines.join("\n")}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncLocalProperties();
}
