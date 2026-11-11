import type { HotspotFocusView } from "../types/artifact";

/** 以 Bounds 的取景距离为半径旋转相机，避免硬编码距离造成手机端模型出框。 */
export function getHotspotFocusPosition(distance: number, view: HotspotFocusView, center: [number, number, number] = [0, 0, 0]): [number, number, number] {
  return [
    center[0] + distance * Math.sin(view.polar) * Math.sin(view.azimuth),
    center[1] + distance * Math.cos(view.polar),
    center[2] + distance * Math.sin(view.polar) * Math.cos(view.azimuth),
  ];
}
