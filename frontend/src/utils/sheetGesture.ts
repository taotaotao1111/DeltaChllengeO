export function clampSheetHeight(height: number, half: number, full: number) {
  return Math.max(half, Math.min(full, height));
}

export function shouldResizeSheet(expanded: boolean, scrollTop: number, dx: number, dy: number) {
  if (Math.abs(dy) < 6 || Math.abs(dy) <= Math.abs(dx) * 1.2) return false;
  return expanded ? scrollTop <= 1 && dy > 0 : dy < 0;
}

/** 上拉展开、下拉收回；短距离的轻点和反向甩动不会误触。 */
export function resolveSheetSnap(expanded: boolean, offsetY: number, velocityY: number, travel: number) {
  const threshold = Math.min(64, Math.max(32, travel * 0.18));
  if (!expanded && (offsetY < -threshold || (offsetY < -10 && velocityY < -450))) return true;
  if (expanded && (offsetY > threshold || (offsetY > 10 && velocityY > 450))) return false;
  return expanded;
}
