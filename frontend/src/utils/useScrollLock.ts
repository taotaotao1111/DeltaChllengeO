import { useEffect } from "react";

/**
 * 弹层打开期间锁住页面滚动。
 *
 * 为什么不能只写 `body { overflow: hidden }`：**iOS Safari 不认这一条**。
 * 手指按在全屏弹层上拖动时，触摸会穿透到 document，整页跟着上下左右乱滑
 * （记忆卡在手机上"到处滑动"就是这个原因）。
 *
 * 可靠做法是把 body 定位成 fixed 并用负 top 顶住当前滚动位置，关闭时再还原并
 * 滚回原处——这样文档在弹层期间根本不可滚动，也就没有可穿透的滚动容器。
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const { body } = document;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      body.style.overscrollBehavior = prev.overscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
