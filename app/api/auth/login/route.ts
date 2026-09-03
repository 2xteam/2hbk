import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { getUserModel } from "@/models/User";
import { signSessionToken } from "@/lib/sessionToken";
import { serverError } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * 이메일 + 비밀번호 로그인.
 *
 * 운영 도메인에서는 포털(`www.myjane.co.kr`)이 로그인을 맡고 이 라우트는 로컬 개발용이다.
 * 다만 두 곳이 **같은 형식의 세션과 서명 토큰**을 만들어야 하므로 로직은 동일하게 둔다.
 */
export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON 본문이 필요합니다." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "이메일과 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    await connectDB();
    const User = getUserModel();
    const user = await User.findOne({ email }).exec();

    // 계정이 없는 경우와 비밀번호가 틀린 경우를 구분해 알려주지 않는다
    const invalid = NextResponse.json(
      { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );

    if (!user || !user.password) return invalid;
    if (!(await bcrypt.compare(password, user.password))) return invalid;

    if (!user.userId) {
      return NextResponse.json(
        { ok: false, error: "이 계정은 2hbk를 사용할 수 없습니다." },
        { status: 403 },
      );
    }

    user.lastLoginAt = new Date();
    await user.save();

    return NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        name: user.nickname ?? user.name ?? "",
        phone: user.phone ?? "",
        email: user.email ?? "",
        nickname: user.nickname ?? "",
        userId: user.userId,
      },
      token: signSessionToken(String(user._id), user.userId),
    });
  } catch (err) {
    return serverError(err);
  }
}
