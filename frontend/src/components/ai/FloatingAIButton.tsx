import "./FloatingAIButton.css";

type FloatingAIButtonProps = {
  onClick: () => void;
  artifactName?: string;
  disabled?: boolean;
  hasNewReply?: boolean;
  hidden?: boolean;
};

export default function FloatingAIButton({
  onClick,
  artifactName = "何尊",
  disabled = false,
  hasNewReply = false,
  hidden = false,
}: FloatingAIButtonProps) {
  if (hidden) return null;
  const label = hasNewReply ? `问问${artifactName}，有新回复` : `问问${artifactName}`;
  return (
    <button type="button" className="floating-ai" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <span className="floating-ai__halo" aria-hidden="true" />
      <span className="floating-ai__surface" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="24" height="24" fill="none" aria-hidden="true">
          <path d="M12 12.5C15.1 9.6 19.3 8 24 8c9.4 0 17 6.6 17 15s-7.6 15-17 15c-2.3 0-4.6-.4-6.6-1.2L9 41l2.2-9C8.5 29.5 7 26.4 7 23c0-4.1 1.9-7.8 5-10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="17" cy="23" r="2" fill="currentColor" />
          <circle cx="24" cy="23" r="2" fill="currentColor" />
          <circle cx="31" cy="23" r="2" fill="currentColor" />
        </svg>
      </span>
      <svg className="floating-ai__spark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 1.5 14.6 9.4 22.5 12l-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6L12 1.5Z" fill="currentColor" />
      </svg>
      {hasNewReply && <span className="floating-ai__dot" aria-hidden="true" />}
    </button>
  );
}
