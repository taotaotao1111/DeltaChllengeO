export interface FogPoint { x: number; y: number }

/** 只在模型就绪时抓一帧；保留真实画布位置，雾后轮廓与擦开的模型对齐。 */
export interface FogSceneSnapshot { image: HTMLCanvasElement; element: HTMLCanvasElement }

/** 低分辨率雾后画面的一次性模糊，不依赖移动 Safari 的 Canvas filter 支持。 */
export function blurFogPixels(pixels: Uint8ClampedArray, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.round(radius));
  if (!r || !width || !height) return;
  const scratch = new Uint8ClampedArray(pixels.length);
  const diameter = r * 2 + 1;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < height; y++) {
      for (let channel = 0; channel < 4; channel++) {
        const offset = y * width * 4 + channel;
        let sum = 0;
        for (let x = -r; x <= r; x++) sum += pixels[offset + Math.max(0, Math.min(width - 1, x)) * 4];
        for (let x = 0; x < width; x++) {
          scratch[offset + x * 4] = sum / diameter;
          sum += pixels[offset + Math.min(width - 1, x + r + 1) * 4] - pixels[offset + Math.max(0, x - r) * 4];
        }
      }
    }
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 4; channel++) {
        const offset = x * 4 + channel;
        let sum = 0;
        for (let y = -r; y <= r; y++) sum += scratch[offset + Math.max(0, Math.min(height - 1, y)) * width * 4];
        for (let y = 0; y < height; y++) {
          pixels[offset + y * width * 4] = sum / diameter;
          sum += scratch[offset + Math.min(height - 1, y + r + 1) * width * 4] - scratch[offset + Math.max(0, y - r) * width * 4];
        }
      }
    }
  }
}

/** 擦除面积按 alpha 损失计算，羽化边缘按实际透明度计入，重复擦同处不会虚增。 */
export function getFogClearedRatio(pixels: Uint8ClampedArray): number {
  if (!pixels.length) return 0;
  let removed = 0;
  for (let i = 3; i < pixels.length; i += 4) removed += 255 - pixels[i];
  return removed / (255 * (pixels.length / 4));
}

/** 细分高速移动的轨迹，柔边笔刷连续擦除同一张玻璃遮罩。 */
export function wipeFogStroke(ctx: CanvasRenderingContext2D, from: FogPoint | null, to: FogPoint, radius: number) {
  const start = from ?? to;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - start.x, to.y - start.y) / (radius * 0.3)));
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = start.x + (to.x - start.x) * t;
    const y = start.y + (to.y - start.y) * t;
    const brush = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius);
    brush.addColorStop(0, "rgba(0,0,0,1)");
    brush.addColorStop(0.62, "rgba(0,0,0,.92)");
    brush.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = brush;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.restore();
}
