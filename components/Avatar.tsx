"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

/**
 * 사람 아이콘. 사진이 있으면 사진, 없으면 닉네임 첫 글자를 쓴다.
 *
 * 사진 주소가 죽어 있으면(옛 Azure 스토리지에 있던 사진들이 그렇다) 첫 글자로
 * 되돌아간다. 깨진 이미지 아이콘이 줄줄이 뜨는 것보다 낫다 → components/SafeImage.tsx
 */
export function Avatar({
  nickname,
  src,
  size = 38,
}: {
  nickname: string;
  src?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
  };

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="avatar"
        style={style}
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="avatar" style={style} aria-hidden="true">
      {[...nickname.trim()][0] ?? "?"}
    </span>
  );
}
