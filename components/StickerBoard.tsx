/**
 * 스티커판 — 이 앱의 주인공.
 *
 * 목표에 필요한 만큼 칸을 깔고 받은 만큼 금색 씰을 채운다.
 * "12/20"이라고 쓰는 것보다 **남은 칸이 눈에 보이는 것**이 훨씬 잘 통한다.
 *
 * 칸이 아주 많으면(필요 스티커 100개짜리 목표도 있다) 전부 그리지 않고
 * 앞쪽 일부만 그린 뒤 남은 수를 글로 적는다.
 */

const MAX_SLOTS = 60;

export function StickerBoard({
  total,
  filled,
  small = false,
}: {
  total: number;
  filled: number;
  small?: boolean;
}) {
  const safeTotal = Math.max(0, total);
  const safeFilled = Math.min(Math.max(0, filled), safeTotal);
  const shown = Math.min(safeTotal, MAX_SLOTS);
  const hidden = safeTotal - shown;

  return (
    <div className={small ? "sticker-board sticker-board--sm" : "sticker-board"}>
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className={i < safeFilled ? "sticker-slot sticker-slot--filled" : "sticker-slot"}
        />
      ))}
      {hidden > 0 ? <span className="sticker-more">+{hidden}</span> : null}
    </div>
  );
}

/** 막대 하나로 줄여 보여주는 형태 — 목록처럼 자리가 좁은 곳에서 쓴다 */
export function StickerProgress({ total, filled }: { total: number; filled: number }) {
  const safeTotal = Math.max(1, total);
  const safeFilled = Math.min(Math.max(0, filled), safeTotal);
  const done = safeFilled >= safeTotal;
  const percent = Math.round((safeFilled / safeTotal) * 100);

  return (
    <div>
      <div className="progress">
        <div
          className={done ? "progress-fill progress-fill--done" : "progress-fill"}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p
        className="muted"
        style={{ margin: "7px 0 0", fontSize: "0.74rem", fontWeight: 700 }}
      >
        {done ? "다 모았어요 🎉" : `${safeFilled} / ${safeTotal}`}
      </p>
    </div>
  );
}
