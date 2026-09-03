"use client";

import { useState } from "react";

/**
 * 불러오지 못한 이미지는 **그냥 사라진다.**
 *
 * 기존 함히보까의 프로필·목표 사진은 Azure Blob(`hamhibokkastorage`)에 있었는데
 * 그 스토리지 계정이 이미 없어져 DB에 남은 주소가 전부 죽은 링크다. 그대로 두면
 * 카드마다 깨진 이미지 아이콘이 뜬다. 주소를 지우지 않고도 화면이 멀쩡하도록
 * 실패한 이미지는 렌더에서 빼 버린다.
 */
export function SafeImage({
  src,
  alt = "",
  className,
  style,
  width,
  height,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
