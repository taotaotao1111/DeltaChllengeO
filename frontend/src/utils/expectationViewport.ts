type VerticalBounds = Pick<DOMRect, "top" | "bottom">;

/** 优先让整张表单（含提交按钮）可见；极小视口至少保证输入框可见。 */
export function getExpectationScrollDelta(form: VerticalBounds, input: VerticalBounds, top: number, bottom: number): number {
  if (bottom <= top) return 0;
  const target = form.bottom - form.top <= bottom - top ? form : input;
  if (target.bottom > bottom) return target.bottom - bottom;
  if (target.top < top) return target.top - top;
  return 0;
}

/** iOS 键盘通常只缩小 visualViewport，100dvh 的内层滚动页仍可能被它遮挡。 */
export function keepExpectationInView(scene: HTMLElement, form: HTMLFormElement, input: HTMLTextAreaElement, browser: Window = window): () => void {
  const mobile = browser.matchMedia("(max-width:767px)");
  const viewport = browser.visualViewport;
  let frame: number | null = null;
  let stopped = false;
  const timers: number[] = [];
  const clearInset = () => scene.style.removeProperty("--epilogue-keyboard-inset");
  const update = () => {
    frame = null;
    if (stopped) return;
    if (!mobile.matches || scene.ownerDocument.activeElement !== input || (viewport && viewport.scale !== 1)) {
      clearInset();
      return;
    }
    const sceneBounds = scene.getBoundingClientRect();
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? browser.innerHeight);
    // 给内层滚动页补足键盘遮挡的空间，否则即使 scrollIntoView 也滚不到目标位置。
    const inset = Math.max(0, sceneBounds.bottom - viewportBottom);
    scene.style.setProperty("--epilogue-keyboard-inset", `${Math.ceil(inset)}px`);
    const top = Math.max(sceneBounds.top, viewportTop) + 12;
    const bottom = Math.min(sceneBounds.bottom, viewportBottom) - 16;
    const delta = getExpectationScrollDelta(form.getBoundingClientRect(), input.getBoundingClientRect(), top, bottom);
    if (Math.abs(delta) >= 1) scene.scrollBy({ top: delta, behavior: "instant" });
  };
  const schedule = () => {
    if (!stopped && frame === null) frame = browser.requestAnimationFrame(update);
  };
  const focus = () => {
    schedule();
    timers.splice(0).forEach((timer) => browser.clearTimeout(timer));
    // 内置浏览器有时延迟发出可视区变化；只在聚焦时补两次，不持续抢用户滚动。
    timers.push(browser.setTimeout(schedule, 120), browser.setTimeout(schedule, 320));
  };
  input.addEventListener("focus", focus);
  input.addEventListener("blur", schedule);
  browser.addEventListener("resize", schedule);
  viewport?.addEventListener("resize", schedule);
  viewport?.addEventListener("scroll", schedule);
  mobile.addEventListener("change", schedule);
  schedule();
  return () => {
    stopped = true;
    if (frame !== null) browser.cancelAnimationFrame(frame);
    timers.forEach((timer) => browser.clearTimeout(timer));
    input.removeEventListener("focus", focus);
    input.removeEventListener("blur", schedule);
    browser.removeEventListener("resize", schedule);
    viewport?.removeEventListener("resize", schedule);
    viewport?.removeEventListener("scroll", schedule);
    mobile.removeEventListener("change", schedule);
    clearInset();
  };
}
