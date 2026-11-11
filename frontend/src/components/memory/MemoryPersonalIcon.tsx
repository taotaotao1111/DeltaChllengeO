import { MEMORY_PERSONAL_ICONS } from "./memoryIcons";

export default function MemoryPersonalIcon({ kind }: { kind: keyof typeof MEMORY_PERSONAL_ICONS }) {
  return <img className="memory-personal-icon" src={MEMORY_PERSONAL_ICONS[kind]} alt="" aria-hidden="true" draggable={false} />;
}
