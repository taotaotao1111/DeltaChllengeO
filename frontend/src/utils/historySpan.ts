/** 公元前后跨越时扣除不存在的公元 0 年；年代仍为作品采用的估算口径。 */
export function getHistorySpan(castYear: number, foundYear: number, currentYear: number) {
  const elapsed = (from: number, to: number) => to - from - (from < 0 && to > 0 ? 1 : 0);
  const beforeDiscovery = Math.max(0, elapsed(castYear, foundYear));
  const sinceDiscovery = Math.max(0, currentYear - foundYear);
  const total = beforeDiscovery + sinceDiscovery;
  return {
    beforeDiscovery,
    sinceDiscovery,
    percent: total > 0 ? Math.min(100, sinceDiscovery / total * 100) : 0,
    approximateBefore: Math.round(beforeDiscovery / 100) * 100,
  };
}
