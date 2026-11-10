import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { animate, useMotionValue } from "framer-motion";
import { clampSheetHeight, resolveSheetSnap, shouldResizeSheet } from "./sheetGesture";

type Gesture = { x: number; y: number; height: number; top: number; expanded: boolean; lastY: number; lastTime: number; velocity: number; moved: boolean };

/** 高度直接跟随手指，只有松手才吸附；正文的普通滚动继续由浏览器处理。 */
export function useSheetResize(desktop: boolean, viewportHeight: number, reduceMotion: boolean | null, listRef: RefObject<HTMLDivElement>, scrollPosition: MutableRefObject<number>) {
  const restingHeight = useRef(viewportHeight);
  const half = Math.min(viewportHeight, restingHeight.current * 0.6);
  const full = viewportHeight;
  const height = useMotionValue(half);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const gestureRef = useRef<Gesture | null>(null);
  const draggedRef = useRef(false);
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);

  const settle = useCallback((next: boolean, velocity = 0) => {
    animationRef.current?.stop();
    expandedRef.current = next;
    setExpanded(next);
    const target = next ? full : half;
    if (reduceMotion) height.set(target);
    else animationRef.current = animate(height, target, { type: "spring", stiffness: 420, damping: 42, mass: 0.8, velocity: -velocity });
  }, [full, half, height, reduceMotion]);

  useLayoutEffect(() => {
    animationRef.current?.stop();
    gestureRef.current = null;
    height.set(expandedRef.current ? full : half);
  }, [desktop, full, half, height]);
  useEffect(() => () => { animationRef.current?.stop(); }, []);

  const begin = useCallback((x: number, y: number, time: number) => {
    draggedRef.current = false;
    gestureRef.current = { x, y, height: height.get(), top: listRef.current?.scrollTop ?? 0, expanded: expandedRef.current, lastY: y, lastTime: time, velocity: 0, moved: false };
  }, [height, listRef]);
  const move = useCallback((x: number, y: number, time: number, fromList: boolean) => {
    const start = gestureRef.current;
    if (!start) return false;
    const dx = x - start.x, dy = y - start.y;
    if (!start.moved) {
      if (fromList ? !shouldResizeSheet(start.expanded, start.top, dx, dy) : Math.abs(dy) < 6 || Math.abs(dy) <= Math.abs(dx)) return false;
      animationRef.current?.stop();
      start.moved = true;
      draggedRef.current = true;
    }
    const elapsed = time - start.lastTime;
    if (elapsed > 0) start.velocity = (y - start.lastY) / elapsed * 1000;
    start.lastY = y;
    start.lastTime = time;
    height.set(clampSheetHeight(start.height - dy, half, full));
    if (fromList && listRef.current) {
      listRef.current.scrollTop = start.top;
      scrollPosition.current = start.top;
    }
    return true;
  }, [full, half, height, listRef, scrollPosition]);
  const end = useCallback((time: number, cancelled = false) => {
    const start = gestureRef.current;
    gestureRef.current = null;
    if (!start?.moved) return;
    const velocity = time - start.lastTime > 100 ? 0 : start.velocity;
    settle(cancelled ? start.expanded : resolveSheetSnap(start.expanded, start.lastY - start.y, velocity, full - half), cancelled ? 0 : velocity);
  }, [full, half, settle]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || desktop) return;
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) { end(event.timeStamp, true); return; }
      const touch = event.touches[0];
      begin(touch.clientX, touch.clientY, event.timeStamp);
    };
    const onMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) { end(event.timeStamp, true); return; }
      const touch = event.touches[0];
      if (move(touch.clientX, touch.clientY, event.timeStamp, true) && event.cancelable) event.preventDefault();
    };
    const onEnd = (event: TouchEvent) => end(event.timeStamp);
    const onCancel = (event: TouchEvent) => end(event.timeStamp, true);
    list.addEventListener("touchstart", onStart, { passive: true });
    list.addEventListener("touchmove", onMove, { passive: false });
    list.addEventListener("touchend", onEnd);
    list.addEventListener("touchcancel", onCancel);
    return () => {
      list.removeEventListener("touchstart", onStart);
      list.removeEventListener("touchmove", onMove);
      list.removeEventListener("touchend", onEnd);
      list.removeEventListener("touchcancel", onCancel);
    };
  }, [begin, desktop, end, listRef, move]);

  return {
    expanded, height, settle,
    toggle() { if (!draggedRef.current) settle(!expandedRef.current); draggedRef.current = false; },
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (desktop || !event.isPrimary || event.button !== 0) return;
      const target = (event.target as HTMLElement).closest("button") ?? event.currentTarget;
      target.setPointerCapture(event.pointerId);
      begin(event.clientX, event.clientY, event.timeStamp);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      if (!desktop && (event.currentTarget.hasPointerCapture(event.pointerId) || (event.target instanceof HTMLElement && event.target.hasPointerCapture(event.pointerId)))) move(event.clientX, event.clientY, event.timeStamp, false);
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) { if (!desktop) end(event.timeStamp); },
    onPointerCancel(event: ReactPointerEvent<HTMLElement>) { if (!desktop) end(event.timeStamp, true); },
    onListClickCapture(event: ReactPointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) {
      if (draggedRef.current) { event.preventDefault(); event.stopPropagation(); draggedRef.current = false; }
    },
  };
}
