import { NextResponse } from "next/server";
import { badRequest, requireViewer, serverError } from "@/lib/auth";
import { isR2Configured, uploadImage } from "@/lib/r2";

export const runtime = "nodejs";

/** 프로필 사진 올리기 */
export async function POST(req: Request) {
  try {
    const auth = await requireViewer(req);
    if ("error" in auth) return auth.error;
    const { doc } = auth.viewer;

    if (!isR2Configured()) {
      return NextResponse.json(
        { ok: false, error: "이미지 저장소가 설정되지 않았습니다." },
        { status: 503 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("이미지 파일이 필요합니다.");

    const url = await uploadImage(file, "profiles");
    doc.profileImage = url;
    await doc.save();

    return NextResponse.json({ ok: true, profileImage: url });
  } catch (err) {
    return serverError(err);
  }
}
