import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 — 프로필·목표 이미지 저장소.
 *
 * 원래 함히보까는 Azure Blob(`hamhibokkastorage`)을 썼다. myjane의 다른 앱이
 * 모두 R2를 쓰고 있어 이관하면서 함께 옮겼다 → 40-Infra/Cloudflare R2.md
 * 브라우저에서 직접 PUT 하지 않고 **서버를 거쳐** 올리므로 CORS 설정이 필요 없다.
 */

let _client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_PUBLIC_URL,
  );
}

function getClient(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 환경 변수가 없습니다. R2_ACCOUNT_ID · R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY 를 확인하세요.");
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function getBucket(): string {
  return process.env.R2_BUCKET_NAME ?? "2hbk";
}

function getPublicBase(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error("R2_PUBLIC_URL 환경 변수가 없습니다.");
  return url.replace(/\/+$/, "");
}

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** 업로드하고 공개 URL을 돌려준다 */
export async function uploadImage(
  file: File,
  prefix: "profiles" | "goals",
): Promise<string> {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new Error("JPG · PNG · WEBP · GIF 이미지만 올릴 수 있습니다.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("이미지는 8MB 이하만 올릴 수 있습니다.");

  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${getPublicBase()}/${key}`;
}

/**
 * 올렸던 이미지를 지운다 — **DB 에 적힌 공개 URL 을 역산해서.**
 *
 * ⚠️ 이 앱의 키는 `profiles/{uuid}` · `goals/{uuid}` 라 **누구 것인지가 남아
 * 있지 않다.** 그래서 접두사로 쓸어 담을 수 없고 URL 이 유일한 단서다.
 * DB 행이 없는 고아 파일은 지울 방법이 없다 — 정말 해결하려면 업로드할 때
 * 키에 사용자를 넣도록 바꿔야 한다.
 *
 * 실패해도 던지지 않는다. 파일이 안 지워졌다고 회원 폐기를 멈추면 그 사람은
 * 영영 폐기되지 않는다 — 방침에 적은 6개월이 지켜지지 않는다.
 *
 * → my-obsidian-vault / 50-Plans/C 법적 페이지.md
 */
export async function deleteImages(urls: string[]): Promise<number> {
  if (!isR2Configured()) return 0;
  const base = getPublicBase();
  const keys = Array.from(
    new Set(
      urls
        .filter((u) => typeof u === "string" && u.startsWith(base))
        .map((u) => u.slice(base.length).replace(/^\/+/, ""))
        .filter(Boolean),
    ),
  );
  if (keys.length === 0) return 0;

  let removed = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    try {
      const res = await getClient().send(
        new DeleteObjectsCommand({
          Bucket: getBucket(),
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      removed += chunk.length - (res.Errors?.length ?? 0);
      for (const e of res.Errors ?? []) {
        console.error(`[purge] R2 삭제 실패 ${e.Key} — ${e.Code} ${e.Message}`);
      }
    } catch (e) {
      console.error("[purge] R2 삭제 요청 실패", e);
    }
  }
  return removed;
}
