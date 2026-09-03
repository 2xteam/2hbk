/**
 * DB에 남아 있는 이미지 주소가 아직 살아 있는지 확인한다.
 *
 * 함히보까의 프로필·목표 사진은 Azure Blob(`hamhibokkastorage`)에 있었다.
 * 이관 시점(2026-09-03)에 그 스토리지 계정은 이미 사라진 상태였다 —
 * 호스트 이름이 공용 DNS에서 NXDOMAIN이다. 그래서 옮겨올 파일이 없다.
 *
 *   node scripts/check-images.mjs         살아 있는지만 확인
 *   node scripts/check-images.mjs --clean 죽은 주소를 DB에서 비운다 (백업 후)
 *
 * 화면은 죽은 주소를 만나면 이미지를 감추므로(components/SafeImage.tsx)
 * 비우지 않아도 깨져 보이지는 않는다. 정리는 선택이다.
 */
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { loadEnv, ROOT } from "./env.mjs";

loadEnv();

const CLEAN = process.argv.includes("--clean");
const APP_DB = process.env.MONGO_DB || "hamhibokka";
const USER_DB = process.env.MONGO_USER_DB || "user";

/** HEAD 요청 한 번. 호스트가 없으면 fetch가 바로 던진다 */
async function alive(url) {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    return res.ok ? "ok" : `HTTP ${res.status}`;
  } catch (e) {
    return e.cause?.code ?? e.name ?? "실패";
  }
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 25000 });
  await client.connect();

  const goals = client.db(APP_DB).collection("goals");
  const users = client.db(USER_DB).collection("users");

  const goalRows = await goals.find({ goalImage: { $type: "string", $ne: "" } }).toArray();
  const userRows = await users.find({ profileImage: { $type: "string", $ne: "" } }).toArray();

  console.log(`\n== 대상 ==`);
  console.log(`  목표 사진 ${goalRows.length}건 · 프로필 사진 ${userRows.length}건`);

  const dead = { goals: [], users: [] };

  console.log(`\n== 확인 ==`);
  for (const g of goalRows) {
    const status = await alive(g.goalImage);
    console.log(`  [${status}] goal ${g.goalId} — ${g.goalImage.slice(0, 72)}…`);
    if (status !== "ok") dead.goals.push(g);
  }
  for (const u of userRows) {
    const status = await alive(u.profileImage);
    console.log(`  [${status}] user ${u.userId} — ${u.profileImage.slice(0, 72)}…`);
    if (status !== "ok") dead.users.push(u);
  }

  console.log(`\n== 결과 ==`);
  console.log(`  죽은 주소 — 목표 ${dead.goals.length}건 · 프로필 ${dead.users.length}건`);

  if (!CLEAN) {
    if (dead.goals.length || dead.users.length) {
      console.log(`\n  DB에서 비우려면 --clean 을 붙여 다시 실행하세요.`);
    }
    await client.close();
    return;
  }

  if (dead.goals.length === 0 && dead.users.length === 0) {
    await client.close();
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(ROOT, "scripts", "backup", stamp);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "dead-images.json"),
    JSON.stringify(
      {
        goals: dead.goals.map((g) => ({ goalId: g.goalId, goalImage: g.goalImage })),
        users: dead.users.map((u) => ({ userId: u.userId, profileImage: u.profileImage })),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\n  백업 → scripts/backup/${stamp}/dead-images.json`);

  if (dead.goals.length) {
    await goals.updateMany(
      { _id: { $in: dead.goals.map((g) => g._id) } },
      { $unset: { goalImage: "" } },
    );
  }
  if (dead.users.length) {
    await users.updateMany(
      { _id: { $in: dead.users.map((u) => u._id) } },
      { $set: { profileImage: null } },
    );
  }
  console.log(`  비웠습니다.`);

  await client.close();
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
