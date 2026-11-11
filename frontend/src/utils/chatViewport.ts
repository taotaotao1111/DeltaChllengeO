/** 手机直接占满可见视口；软键盘弹出时让输入栏跟随可见区域。 */
export function getChatPanelBounds(desktop: boolean, layoutHeight: number, visualHeight = layoutHeight, visualTop = 0) {
  const visible = Math.max(0, Math.min(layoutHeight, visualHeight));
  const inset = desktop ? 16 : 0;
  return {
    height: Math.max(0, visible - inset * 2),
    bottom: Math.max(0, layoutHeight - visible - visualTop) + inset,
  };
}
