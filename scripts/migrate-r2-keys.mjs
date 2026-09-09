/**
 * R2 키 이관 — `profiles/{uuid}` · `goals/{uuid}` → `profiles/{userId}/{uuid}` · `goals/{userId}/{uuid}`
 *
 * 왜: 2026-09-09 전에 올린 파일은 키에 소유자가 없어 탈퇴 폐기 때 DB 에 URL 이 남지 않은
 * 고아 파일을 지울 수 없었다. 새 업로드는 이미 소유자 접두사를 쓴다(lib/r2.ts).
 * 이 스크립트는 **이미 올라간 파일**을 소유자 아래로 옮기고 DB 주소를 바꾼다.
 * DB 에 참조가 없는 옛 파일(고아)은 목록으로 보고하고, `--apply --orphans` 를 주면 지운다.
 *
 *   node scripts/migrate-r2-keys.mjs                    드라이런
 *   node scripts/migrate-r2-keys.mjs --apply            복사 → DB 갱신 → 옛 키 삭제
 *   node scripts/migrate-r2-keys.mjs --apply --orphans  + 참조 없는 옛 파일 삭제
 *
 * 순서: CopyObject 성공 → DB 가 새 주소를 가리킨 뒤에만 옛 키를 지운다. 실패한 항목은 건너뛰고
 * 끝에 목록으로 남긴다 — 옛 URL 이 그대로라 화면은 깨지지 않는다.
 * 소유자: 목표 이미지는 `goals.createdBy`, 프로필은 `users.userId` (둘 다 도메인 식별자 `user_…`).
 * → my-obsidian-vault / 50-Plans/E 개인정보 보호 보강.md 9번(B4)
 */
import fs from "node:fs";
import mongoose from "mongoose";
import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const CRLF = new RegExp("\\r?\\n");
for (const line of fs.readFileSync(".env.local", "utf8").split(CRLF)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
}
const APPLY = process.argv.includes("--apply");
const ORPHANS = process.argv.includes("--orphans");
const { MONGO_URI, MONGO_USER_DB = "user", R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
if (!MONGO_URI || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error("MONGO_URI · R2_* 환경 변수가 필요합니다 (.env.local)");
  process.exit(1);
}
const base = R2_PUBLIC_URL.replace(/\/+$/, "");
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
const OLD_KEY = /^(profiles|goals)\/[^/]+\.[a-z0-9]+$/i;
const keyOf = (url) => (typeof url === "string" && url.startsWith(base + "/") ? url.slice(base.length + 1) : null);
const safe = (s) => String(s ?? "").replace(/[^A-Za-z0-9_-]/g, "");

await mongoose.connect(MONGO_URI, { dbName: "hamhibokka", serverSelectionTimeoutMS: 15000 });
const goals = mongoose.connection.collection("goals");
const users = mongoose.connection.useDb(MONGO_USER_DB, { useCache: true }).collection("users");

const plan = [];
for (const g of await goals.find({ goalImage: { $type: "string" } }, { projection: { goalImage: 1, createdBy: 1 } }).toArray()) {
  const k = keyOf(g.goalImage);
  if (!k || !OLD_KEY.test(k) || !safe(g.createdBy)) continue;
  const file = k.split("/").pop();
  plan.push({ kind: "goal", id: g._id, oldKey: k, newKey: `goals/${safe(g.createdBy)}/${file}`, oldUrl: g.goalImage });
}
for (const u of await users.find({ profileImage: { $type: "string" } }, { projection: { profileImage: 1, userId: 1 } }).toArray()) {
  const k = keyOf(u.profileImage);
  if (!k || !OLD_KEY.test(k) || !safe(u.userId)) continue;
  const file = k.split("/").pop();
  plan.push({ kind: "profile", id: u._id, oldKey: k, newKey: `profiles/${safe(u.userId)}/${file}`, oldUrl: u.profileImage });
}

/* 버킷의 옛 키 전부 — DB 가 가리키지 않는 것이 고아 */
const referenced = new Set(plan.map((p) => p.oldKey));
const orphans = [];
for (const prefix of ["profiles/", "goals/"]) {
  let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: prefix, ContinuationToken: token }));
    for (const o of page.Contents ?? []) if (o.Key && OLD_KEY.test(o.Key) && !referenced.has(o.Key)) orphans.push(o.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

console.log(`옮길 파일 ${plan.length}건 (목표 ${plan.filter((p) => p.kind === "goal").length} · 프로필 ${plan.filter((p) => p.kind === "profile").length}) · 참조 없는 옛 파일(고아) ${orphans.length}건`);
if (!APPLY) {
  for (const p of plan.slice(0, 5)) console.log("  예:", p.oldKey, "→", p.newKey);
  for (const k of orphans.slice(0, 5)) console.log("  고아:", k);
  console.log("드라이런입니다. 실제로 옮기려면 --apply (고아 삭제까지는 --apply --orphans)");
  await mongoose.disconnect();
  process.exit(0);
}

let moved = 0;
const failed = [];
for (const p of plan) {
  try {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: p.oldKey }));
    } catch (e) {
      if (e?.$metadata?.httpStatusCode === 404) { failed.push({ ...p, reason: "옛 파일 없음 (DB 만 남음)" }); continue; }
      throw e;
    }
    await s3.send(new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME,
      CopySource: `/${R2_BUCKET_NAME}/${p.oldKey}`,
      Key: p.newKey,
      MetadataDirective: "COPY",
    }));
    const newUrl = `${base}/${p.newKey}`;
    const r = p.kind === "goal"
      ? await goals.updateOne({ _id: p.id, goalImage: p.oldUrl }, { $set: { goalImage: newUrl } })
      : await users.updateOne({ _id: p.id, profileImage: p.oldUrl }, { $set: { profileImage: newUrl } });
    if (r.modifiedCount !== 1) { failed.push({ ...p, reason: "DB 갱신 0건" }); continue; }
    await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: p.oldKey }));
    moved += 1;
  } catch (e) {
    failed.push({ ...p, reason: e instanceof Error ? e.message : String(e) });
  }
}
console.log(`옮김 ${moved}건 · 실패 ${failed.length}건`);
for (const f of failed) console.log("  실패:", f.kind, String(f.id), f.reason);

if (ORPHANS && orphans.length) {
  let removed = 0;
  for (const k of orphans) {
    try { await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: k })); removed += 1; }
    catch (e) { console.log("  고아 삭제 실패:", k, e instanceof Error ? e.message : e); }
  }
  console.log(`고아 삭제 ${removed}건`);
} else if (orphans.length) {
  console.log(`고아 ${orphans.length}건은 그대로 — 지우려면 --orphans`);
}
await mongoose.disconnect();
