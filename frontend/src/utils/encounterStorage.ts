/** 本机缓存片尾状态与期待草稿；只有服务端确认后，界面才显示已送达。 */
export interface EncounterRecord {
  completed: boolean;
  epilogueSeen: boolean;
  expectation: string;
  expectationPending: boolean;
}

const key = (artifactId: string) => `wuyu-encounter-v1:${artifactId}`;

export function loadEncounter(artifactId: string): EncounterRecord {
  try {
    const value = JSON.parse(window.localStorage.getItem(key(artifactId)) ?? "null");
    return {
      completed: value?.completed === true,
      epilogueSeen: value?.epilogueSeen === true,
      expectation: typeof value?.expectation === "string" ? value.expectation.slice(0, 80) : "",
      expectationPending: value?.expectationPending === true,
    };
  } catch {
    return { completed: false, epilogueSeen: false, expectation: "", expectationPending: false };
  }
}

export function saveEncounter(artifactId: string, patch: Partial<EncounterRecord>): boolean {
  try {
    window.localStorage.setItem(key(artifactId), JSON.stringify({ ...loadEncounter(artifactId), ...patch }));
    return true;
  } catch {
    return false;
  }
}
