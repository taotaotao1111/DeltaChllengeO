/** 仅调系统文件面板，不把 blob URL 导航成图片页。 */
export interface ImageTransferNavigator {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}
export type ImagePanelResult = "finished" | "cancelled" | "unsupported" | "failed";

export function isMobileDevice(nav: Pick<ImageTransferNavigator, "userAgent" | "platform" | "maxTouchPoints"> = navigator) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)
    || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
}

function panelError(reason: unknown): ImagePanelResult {
  return reason && typeof reason === "object" && "name" in reason && reason.name === "AbortError" ? "cancelled" : "failed";
}

/** 必须在点击处理函数内立即调用；文件在海报生成时准备好，调用前不 fetch / await。 */
export function openImagePanel(file: File, nav: ImageTransferNavigator = navigator): Promise<ImagePanelResult> {
  try {
    if (typeof nav.share !== "function" || typeof nav.canShare !== "function" || !nav.canShare({ files: [file] })) {
      return Promise.resolve("unsupported");
    }
    return nav.share({ files: [file], title: "物语千年 · 我的千年相遇" })
      .then<ImagePanelResult>(() => "finished").catch(panelError);
  } catch (reason) {
    return Promise.resolve(panelError(reason));
  }
}
