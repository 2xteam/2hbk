/**
 * 2hbk(함히보까) 회원을 myjane 통합 회원 컬렉션으로 옮긴다.
 *
 *   hamhibokka.users  →  user.users
 *
 * 목표·팔로우·초대 문서는 Mongo `_id`가 아니라 **`userId` 문자열**을 참조하므로
 * 그 값만 그대로 보존하면 도메인 데이터는 한 건도 손댈 필요가 없다.
 * 비밀번호는 bcrypt 해시를 그대로 옮겨 기존 비밀번호로 계속 로그인된다.
 *
 *   node scripts/migrate-users.mjs --dry   계획만 출력
 *   node scripts/migrate-users.mjs --run   실제 반영 (백업을 먼저 남긴다)
 *
 * 원본 `hamhibokka.users`는 지우지 않는다. 되돌릴 근거로 남겨 둔다.
 */
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { loadEnv, ROOT } from "./env.mjs";

loadEnv();

const RUN = process.argv.includes("--run");
const APP_DB = process.env.MONGO_DB || "hamhibokka";
const USER_DB = process.env.MONGO_USER_DB || "user";
const SIGNUP_FROM = "2hbk";

const mask = (e) => (typeof e === "string" ? e.replace(/^(.{2}).*?(@.*)$/, "$1***$2") : "-");

async function backup(client, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const targets = [
    [APP_DB, "users"],
    [APP_DB, "goals"],
    [APP_DB, "follows"],
    [APP_DB, "goalinvitations"],
    [USER_DB, "users"],
  ];
  for (const [db, col] of targets) {
    const docs = await client.db(db).collection(col).find({}).toArray();
    fs.writeFileSync(path.join(dir, db + "." + col + ".json"), JSON.stringify(docs, null, 2), "utf8");
    console.log("  백업 " + db + "." + col + " → " + docs.length + "건");
  }
}

/** 목표·팔로우·초대가 참조하는 모든 userId를 모은다 */
async function collectReferencedIds(db) {
  const ids = new Set();
  const add = (v) => { if (typeof v === "string" && v) ids.add(v); };

  for (const g of await db.collection("goals").find({}).toArray()) {
    add(g.createdBy); add(g.updatedBy);
    for (const p of g.participants ?? []) add(p.userId);
  }
  for (const f of await db.collection("follows").find({}).toArray()) {
    add(f.followerId); add(f.followingId); add(f.createdBy); add(f.updatedBy);
  }
  for (const i of await db.collection("goalinvitations").find({}).toArray()) {
    add(i.fromUserId); add(i.toUserId); add(i.createdBy); add(i.updatedBy);
  }
  return ids;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI 가 없습니다.");

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 25000 });
  await client.connect();

  const appDb = client.db(APP_DB);
  const userCol = client.db(USER_DB).collection("users");
  const srcCol = appDb.collection("users");

  const source = await srcCol.find({}).toArray();
  const existing = await userCol.find({}).toArray();

  const byUserId = new Map(existing.filter((u) => u.userId).map((u) => [u.userId, u]));
  const byEmail = new Map(
    existing
      .filter((u) => typeof u.email === "string" && u.email)
      .map((u) => [u.email.trim().toLowerCase(), u]),
  );

  // ── 계획 세우기 ──
  const plan = [];
  for (const h of source) {
    const email = (h.email ?? "").trim().toLowerCase();
    const hit = byUserId.get(h.userId) ?? (email ? byEmail.get(email) : undefined);

    if (!hit) plan.push({ action: "insert", src: h });
    else if (hit.userId === h.userId) plan.push({ action: "refresh", src: h, target: hit });
    else plan.push({ action: "merge", src: h, target: hit });
  }

  console.log("\n== 대상 ==");
  console.log("  " + APP_DB + ".users  " + source.length + "건");
  console.log("  " + USER_DB + ".users " + existing.length + "건 (기존 통합 회원)");

  console.log("\n== 계획 ==");
  for (const p of plan) {
    const label = p.action === "insert" ? "신규" : p.action === "merge" ? "병합" : "갱신";
    const to = p.target
      ? ' → 기존 계정 "' + (p.target.name ?? p.target.nickname) + '" (' + p.target._id + ")"
      : "";
    console.log("  [" + label + "] " + p.src.userId + " " + mask(p.src.email) + ' "' + p.src.nickname + '"' + to);
  }
  const counts = {};
  for (const p of plan) counts[p.action] = (counts[p.action] ?? 0) + 1;
  console.log("  → 신규 " + (counts.insert ?? 0) + " · 병합 " + (counts.merge ?? 0) + " · 갱신 " + (counts.refresh ?? 0));

  if (!RUN) {
    console.log("\n드라이런입니다. 반영하려면 --run 을 붙여 다시 실행하세요.");
    await client.close();
    return;
  }

  // ── 백업 ──
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(ROOT, "scripts", "backup", stamp);
  console.log("\n== 백업 → scripts/backup/" + stamp + " ==");
  await backup(client, dir);

  // ── 반영 ──
  console.log("\n== 반영 ==");
  for (const p of plan) {
    const h = p.src;
    const hamhi = {
      userId: h.userId,
      nickname: h.nickname ?? null,
      email: (h.email ?? "").trim().toLowerCase() || null,
      password: h.password ?? null,
      profileImage: h.profileImage ?? null,
      emailVerified: h.emailVerified ?? false,
      followApprovalRequired: h.followApprovalRequired ?? false,
    };

    if (p.action === "insert") {
      await userCol.insertOne({
        _id: h._id,                  // 원본 _id 보존
        name: h.nickname ?? null,    // 통합 회원의 표시 이름
        phone: null,                 // 전화번호+PIN 로그인은 쓰지 않는다
        pin: null,
        tokens: 0,
        createdAt: h.createdAt ?? new Date(),
        lastLoginAt: null,
        signupFrom: SIGNUP_FROM,
        heightCm: null,
        gender: null,
        birthYear: null,
        ...hamhi,
      });
      console.log("  + " + h.userId + " 신규");
    } else {
      // 병합·갱신 — 기존 계정의 name·phone·pin은 건드리지 않는다
      const set = {
        userId: hamhi.userId,
        nickname: hamhi.nickname,
        password: hamhi.password,
        emailVerified: hamhi.emailVerified,
        followApprovalRequired: hamhi.followApprovalRequired,
      };
      if (hamhi.profileImage) set.profileImage = hamhi.profileImage;
      if (!p.target.email && hamhi.email) set.email = hamhi.email;
      await userCol.updateOne({ _id: p.target._id }, { $set: set });
      console.log("  ~ " + h.userId + " " + (p.action === "merge" ? "병합" : "갱신") + " → " + p.target._id);
    }
  }

  // ── 인덱스 ──
  console.log("\n== 인덱스 ==");
  const names = (await userCol.indexes()).map((i) => i.name);
  if (!names.includes("userId_1")) {
    await userCol.createIndex(
      { userId: 1 },
      { unique: true, partialFilterExpression: { userId: { $type: "string" } } },
    );
    console.log("  userId 부분 유일 인덱스 생성");
  } else {
    console.log("  userId 인덱스 이미 있음");
  }

  // ── 검증 ──
  console.log("\n== 검증 ==");
  const after = await userCol.find({}).toArray();
  const known = new Set(after.filter((u) => u.userId).map((u) => u.userId));
  const referenced = await collectReferencedIds(appDb);
  const missing = [...referenced].filter((id) => !known.has(id));

  console.log("  통합 회원 " + after.length + "건 (userId 보유 " + known.size + "건)");
  console.log("  도메인 데이터가 참조하는 userId " + referenced.size + "건");
  console.log(
    missing.length
      ? "  ⚠ 통합 회원에서 찾을 수 없는 userId " + missing.length + "건: " + missing.join(", ")
      : "  ✓ 참조된 userId가 모두 통합 회원에 있습니다",
  );

  const seen = {};
  for (const u of after) if (u.userId) seen[u.userId] = (seen[u.userId] ?? 0) + 1;
  const dups = Object.keys(seen).filter((k) => seen[k] > 1);
  console.log(dups.length ? "  ⚠ userId 중복: " + dups.join(", ") : "  ✓ userId 중복 없음");

  const emails = after.filter((u) => typeof u.email === "string" && u.email).map((u) => u.email.toLowerCase());
  const dupEmail = [...new Set(emails.filter((e, i) => emails.indexOf(e) !== i))];
  console.log(dupEmail.length ? "  ⚠ 이메일 중복: " + dupEmail.map(mask).join(", ") : "  ✓ 이메일 중복 없음");

  const noPassword = after.filter((u) => u.userId && !u.password);
  console.log(
    noPassword.length
      ? "  ⚠ 비밀번호 없는 2hbk 계정 " + noPassword.length + "건"
      : "  ✓ 2hbk 계정 모두 비밀번호 보유",
  );

  await client.close();
  console.log("\n완료.");
}

main().catch((e) => { console.error("실패:", e); process.exit(1); });
