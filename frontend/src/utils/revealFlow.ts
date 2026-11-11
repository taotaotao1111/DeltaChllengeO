import type { RevealModuleData } from "../types/artifact";

export type RevealPhase = "lead-in" | "derust" | "compare" | "focus" | "guess" | "closing";

/** 省略配图说明不等于省略发现：竞猜之前必须先看见关键文字。 */
export function getRevealSteps(data: RevealModuleData): RevealPhase[] {
  return [
    "lead-in",
    ...(data.derust ? ["derust" as const] : []),
    ...(data.compare ? ["compare" as const] : []),
    ...(data.focus?.characters.length ? ["focus" as const] : []),
    ...(data.guess ? ["guess" as const] : []),
    "closing",
  ];
}
