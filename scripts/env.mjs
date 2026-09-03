import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** `.env.local`을 읽어 process.env에 채운다 (Next 밖에서 도는 스크립트용) */
export function loadEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) {
    throw new Error(".env.local 이 없습니다. .env.example 을 복사해 채우세요.");
  }
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export const ROOT = root;
