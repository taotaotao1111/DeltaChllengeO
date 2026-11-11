import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import type { FlipCardData } from "../../../types/artifact";

/** 导航独立于卡片切换动画，回看时按钮与键盘焦点保持在原位。 */
export default function FlipCardProgress({ cards, currentIndex, readIds, panelId, onSelect }: {
  cards: FlipCardData[];
  currentIndex: number;
  readIds: string[];
  panelId: string;
  onSelect: (index: number) => void;
}) {
  const hoverTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const cancelHover = useCallback(() => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }, []);
  useEffect(() => cancelHover, [cancelHover, currentIndex]);

  const moveWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    const last = cards.length - 1;
    const next = event.key === "ArrowLeft" ? Math.max(0, currentIndex - 1)
      : event.key === "ArrowRight" ? Math.min(last, currentIndex + 1)
        : event.key === "Home" ? 0 : event.key === "End" ? last : null;
    if (next === null || next < 0) return;
    event.preventDefault();
    cancelHover();
    onSelect(next);
    buttons.current[next]?.focus({ preventScroll: true });
  };

  return <nav className="flip-card-progress" aria-label="故事卡片进度，可回看" onKeyDown={moveWithKeyboard} onPointerLeave={cancelHover}>
    {cards.map((card, index) => <button type="button" key={card.id}
      ref={(node) => { buttons.current[index] = node; }}
      className={`flip-card-progress__button${index === currentIndex ? " is-current" : ""}${readIds.includes(card.id) ? " is-read" : ""}`}
      aria-label={`查看第 ${index + 1} 张${readIds.includes(card.id) ? "，已读" : ""}`}
      title={`第 ${index + 1} 张：${card.front.split("\n")[0]}`}
      aria-current={index === currentIndex ? "step" : undefined} aria-controls={panelId}
      tabIndex={index === currentIndex ? 0 : -1}
      onClick={() => { cancelHover(); onSelect(index); }}
      onPointerEnter={(event) => {
        cancelHover();
        if (index === currentIndex || event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
        // 短暂停留再切换，避免鼠标经过一排点时连续跳卡。
        hoverTimer.current = window.setTimeout(() => { hoverTimer.current = null; onSelect(index); }, 180);
      }}
      onPointerLeave={cancelHover}>
      <span className="flip-card-progress__dot" aria-hidden="true" />
    </button>)}
  </nav>;
}
