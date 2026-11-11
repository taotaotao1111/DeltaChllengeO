import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "../../utils/useScrollLock";
import MemoryPersonalIcon from "./MemoryPersonalIcon";

interface Props {
  note: string;
  onNoteChange: (value: string) => void;
  chars: string[];
  glyphs: (string | null)[] | null;
  onTrace: () => void;
  onRemoveTrace: () => void;
  onClose: () => void;
  onDone: () => void;
  inline?: boolean;
  editing?: boolean;
  tracingContent?: ReactNode;
  onBegin?: () => void;
}

export default function MemoryCardEditor({ note, onNoteChange, chars, glyphs, onTrace, onRemoveTrace, onClose, onDone, inline = false, editing = true, tracingContent, onBegin }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const hasTrace = !!glyphs?.some(Boolean);
  useScrollLock(!inline);
  useEffect(() => {
    if (inline) return;
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [inline]);

  const content = <>
      {!inline && <span className="memory-editor-handle" aria-hidden="true" />}
      <header className="memory-editor-header">
        <div><h2 id="memory-editor-title">完善我的记忆卡</h2><p>留下属于你的千年相遇</p></div>
        {inline ? <button type="button" className="memory-editor-cancel" onClick={onClose} disabled={!editing} aria-hidden={!editing}>取消编辑</button> : <button type="button" className="memory-icon-close" aria-label="关闭编辑" onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>}
      </header>
      <div className="memory-editor-body">
      {tracingContent ?? <>
      <section className="memory-editor-section">
        <div className="memory-editor-section-title"><h3><MemoryPersonalIcon kind="note" />留一句话</h3><span className={!inline && note.trim() ? "memory-editor-status" : ""}>{inline ? `${note.length} / 80` : note.trim() ? "✓ 已填写" : "选填"}</span></div>
        <div className="memory-note-field">
          <textarea aria-label="我留下的话" value={note} onFocus={() => { if (inline && !editing) onBegin?.(); }} onChange={(event) => onNoteChange(event.target.value)} readOnly={!inline && !editing} tabIndex={inline || editing ? 0 : -1} maxLength={80} rows={2} placeholder={inline ? "写下你在这次相遇中的感受…" : "如果能对三千年前的何尊说一句话，你想说什么？"} />
          {!inline && <span>{note.length} / 80</span>}
        </div>
      </section>
      {chars.length > 0 && <section className="memory-editor-section">
        <div className="memory-editor-section-title"><h3><MemoryPersonalIcon kind="trace" />{inline ? "亲手描红" : "我的描红"}</h3><span className={hasTrace ? "memory-editor-status" : ""}>{hasTrace ? "✓ 已完成" : "选填"}</span></div>
        <div className="memory-trace-preview">{chars.map((char, index) => <div className="memory-trace-tile" key={`${index}-${char}`}>
          {glyphs?.[index] ? <img src={glyphs[index]!} alt={`我的描红：${char}`} /> : <span aria-hidden="true">{char}</span>}
        </div>)}</div>
        <div className="memory-trace-actions">
          <button type="button" onClick={onTrace} disabled={!inline && !editing}>{hasTrace ? "重新描红" : "开始描红"}</button>
          {hasTrace && <button type="button" onClick={onRemoveTrace} disabled={!inline && !editing}>移除笔迹</button>}
        </div>
      </section>}
      </>}
      </div>
      {!tracingContent && <button type="button" className="memory-editor-done" onClick={onDone} disabled={!editing}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>完成编辑</button>}
  </>;

  if (inline) return <section className={`memory-editor-inline${editing ? " is-editing" : " is-preview"}`} aria-labelledby="memory-editor-title">{content}</section>;

  return createPortal(<dialog ref={ref} className="memory-editor-dialog" tabIndex={-1} aria-labelledby="memory-editor-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="memory-editor-sheet">{content}</div>
  </dialog>, document.body);
}
