import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { getUserModel } from "@/models/User";
import { signSessionToken } from "@/lib/sessionToken";
import { serverError } from "@/lib/auth";

export const runtime = "nodejs";

/** 기존 백엔드와 같은 형식의 도메인 식별자 */
function newUserId(): string {
  return `user_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 이메일 + 비밀번호 회원가입.
 *
 * 통합 회원 컬렉션(`user` DB의 `users`)에 한 줄을 만든다. 다른 세 앱이 쓰는
 * `phone`·`pin`은 비워 두고, 이 계정은 이메일로만 로그인한다.
 */
export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string; nickname?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "JSON 본문이 필요합니다." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "올바른 이메일 주소를 입력해 주세요." },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 },
      );
    }
    if (!nickname || nickname.length > 20) {
      return NextResponse.json(
        { ok: false, error: "닉네임은 1~20자로 입력해 주세요." },
        { status: 400 },
      );
    }

    await connectDB();
    const User = getUserModel();

    const existing = await User.findOne({ email }).lean().exec();
    if (existing) {
      // 다른 myjane 앱에서 이미 가입한 이메일이면 비밀번호만 붙여 준다
      if (!existing.userId && !existing.password) {
        const userId = newUserId();
        const token = signSessionToken(String(existing._id), userId);
        await User.updateOne(
          { _id: existing._id },
          {
            $set: {
              userId,
              nickname,
              password: await bcrypt.hash(password, 10),
              lastLoginAt: new Date(),
            },
          },
        );
        return NextResponse.json({
          ok: true,
          user: {
            id: String(existing._id),
            name: nickname,
            phone: existing.phone ?? "",
            email,
            nickname,
            userId,
          },
          token,
        });
      }

      return NextResponse.json(
        { ok: false, error: "이미 가입된 이메일입니다." },
        { status: 409 },
      );
    }

    /*
      `_id`를 미리 만들어 **쓰기 전에** 토큰을 서명한다.

      먼저 저장하고 나중에 서명하면, 서명이 실패했을 때(예: `SESSION_SECRET`
      누락) 계정만 남고 세션은 없는 상태가 된다. 그러면 다시 가입할 수도 없다
      — "이미 가입된 이메일입니다"만 나온다. 2026-09-03에 실제로 그랬다.
    */
    const userId = newUserId();
    const _id = new mongoose.Types.ObjectId();
    const token = signSessionToken(String(_id), userId);

    const user = await User.create({
      _id,
      userId,
      email,
      nickname,
      name: nickname,
      password: await bcrypt.hash(password, 10),
      phone: null,
      pin: null,
      signupFrom: "2hbk",
      emailVerified: false,
      followApprovalRequired: false,
      tokens: 0,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        name: nickname,
        phone: "",
        email,
        nickname,
        userId,
      },
      token,
    });
  } catch (err) {
    return serverError(err);
  }
}
