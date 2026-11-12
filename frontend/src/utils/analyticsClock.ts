/** 使用单调时钟；每次结算最多 15 秒，隐藏页完全不计时，闲置 60 秒后暂停。 */
export class AnalyticsClock {
  private sampled: number;
  private activityAt: number;
  private visible = true;
  constructor(now: number) { this.sampled = now; this.activityAt = now; }
  activity(now: number) { this.activityAt = now; }
  visibility(now: number, visible: boolean) { this.sampled = now; this.visible = visible; if (visible) this.activityAt = now; }
  take(now: number) {
    const duration = this.visible ? Math.max(0, Math.min(now, this.activityAt + 60000) - this.sampled) : 0;
    this.sampled = now;
    return Math.round(Math.min(15000, duration));
  }
}
