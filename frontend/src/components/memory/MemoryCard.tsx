import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../../store/gameStore";
import { getArtifact } from "../../data/artifacts";
import { renderCard } from "./cardCanvas";
import { buildMemoryPosterData, type MemoryPosterData } from "./memoryPoster";
import { openImagePanel, isMobileDevice } from "./memoryTransfer";
import { useScrollLock } from "../../utils/useScrollLock";
import TraceGlyphs from "../story/TraceGlyphs";
import ExtraDialog from "../shared/ExtraDialog";
import MemoryCardEditor from "./MemoryCardEditor";
import MemoryPersonalIcon from "./MemoryPersonalIcon";
import { createDecodedMemoryPreview } from "./memoryPreview";
import "./MemoryCard.css";

function formatToday() {
  const date = new Date();
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function useDesktopMemoryLayout() {
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width:1024px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width:1024px)");
    const update = () => setDesktop(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}

export default function MemoryCard() {
  const open = useGameStore((state) => state.memoryCardOpen);
  const prewarm = useGameStore((state) => state.stage === "timeline");
  const closeCard = useGameStore((state) => state.closeMemoryCard);
  const discovered = useGameStore((state) => state.discoveredDetails);
  const selectedLine = useGameStore((state) => state.selectedMemoryLine);
  const messages = useGameStore((state) => state.chatMessages);
  const userLegacyLine = useGameStore((state) => state.userLegacyLine);
  const setUserLegacyLine = useGameStore((state) => state.setUserLegacyLine);
  const snapshot = useGameStore((state) => state.artifactSnapshot);
  const tracedGlyphs = useGameStore((state) => state.tracedGlyphs);
  const setTracedGlyphs = useGameStore((state) => state.setTracedGlyphs);
  const artifactId = useGameStore((state) => state.currentArtifactId);
  const artifact = getArtifact(artifactId);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [date] = useState(formatToday);
  const [panel, setPanel] = useState<"note" | "initial-trace" | "edit" | "trace" | null>(null);
  const [draft, setDraft] = useState("");
  const [draftGlyphs, setDraftGlyphs] = useState<(string | null)[] | null>(null);
  const [rendered, setRendered] = useState<{ url: string; file: File; width: number; height: number; editorTop: string; editorHeight: string; posterRatio: number; data: MemoryPosterData } | null>(null);
  const [presentationReady, setPresentationReady] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [shareHint, setShareHint] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [saveToast, setSaveToast] = useState(0);
  const desktop = useDesktopMemoryLayout();
  const shouldPrepare = open || prewarm;
  const data = useMemo(() => buildMemoryPosterData(artifact, discovered, messages, {
    memoryLine: selectedLine, legacyLine: userLegacyLine, snapshot, tracedGlyphs, date,
  }), [artifact, discovered, messages, selectedLine, userLegacyLine, snapshot, tracedGlyphs, date]);
  useScrollLock(open);

  useEffect(() => {
    if (!open || !saveToast) return;
    const timer = window.setTimeout(() => setSaveToast(0), 2600);
    return () => window.clearTimeout(timer);
  }, [open, saveToast]);

  useLayoutEffect(() => {
    if (!open) { setPresentationReady(false); return; }
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    dialog?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open && rendered?.data === data) setPresentationReady(true);
  }, [open, rendered, data]);

  // 图片的生命周期跟随缓存本身；收起弹窗不能释放仍被保留的图片地址。
  useEffect(() => () => { if (rendered) URL.revokeObjectURL(rendered.url); }, [rendered]);

  useEffect(() => {
    if (!shouldPrepare || rendered?.data === data) { setRendering(false); return; }
    let cancelled = false;
    // 更新海报时保留上一帧，避免提交编辑后因加载占位而挤动布局。
    setRendering(true); setError("");
    void (async () => {
      try {
        const { canvas, personalTop } = await renderCard(data);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("无法生成图片")), "image/png"));
        if (cancelled) return;
        const url = await createDecodedMemoryPreview(blob);
        if (cancelled) { URL.revokeObjectURL(url); return; }
        setRendered({ url, file: new File([blob], "物语千年-我的千年相遇.png", { type: "image/png" }), width: canvas.width, height: canvas.height, editorTop: `${personalTop / canvas.height * 100}%`, editorHeight: `${210 / canvas.height * 100}%`, posterRatio: canvas.width / canvas.height, data });
      } catch {
        if (!cancelled) setError("记忆卡暂时没有生成成功，请再试一次。");
      } finally { if (!cancelled) setRendering(false); }
    })();
    return () => { cancelled = true; };
  }, [shouldPrepare, data, retry, rendered]);

  const close = () => { setPanel(null); setShareHint(""); setSaveToast(0); closeCard(); };
  const startEditing = (next: "edit" | "trace" = "edit") => { setDraft(userLegacyLine ?? ""); setDraftGlyphs(tracedGlyphs); setPanel(next); setSaveToast(0); };
  const editCard = () => startEditing();
  const writeFirstNote = () => { if (desktop) { editCard(); return; } setDraft(userLegacyLine ?? ""); setPanel("note"); setSaveToast(0); };
  const startFirstTrace = () => { if (desktop) { startEditing("trace"); return; } setSaveToast(0); setPanel("initial-trace"); };
  const finishEditing = () => { setUserLegacyLine(draft.trim()); setTracedGlyphs(draftGlyphs); setPanel(null); };
  const share = () => {
    if (!rendered || rendered.data !== data || transferring) return;
    setShareHint("");
    setTransferring(true);
    void openImagePanel(rendered.file).then((result) => {
      if (result === "unsupported" || result === "failed") {
        setShareHint("当前浏览器暂不支持直接分享，可保存后发送给好友。");
      }
      // 面板关闭不等于已经存入相册；取消或正常返回都不弹成功提示。
    }).finally(() => setTransferring(false));
  };
  const save = () => {
    if (!rendered || rendered.data !== data || transferring) return;
    if (isMobileDevice()) {
      setShareHint("");
      setSaveToast((value) => value + 1);
      return;
    }
    const link = document.createElement("a"); link.href = rendered.url; link.download = rendered.file.name;
    document.body.appendChild(link); link.click(); link.remove();
    setShareHint("");
  };
  const hasPersonal = !!data.legacyLine || data.tracedGlyphs.length > 0;
  const desktopEditing = desktop && panel !== null;
  const alt = `物语千年，我的千年相遇。${data.identity}。${data.quote.replace(/\n/g, "")}。${data.discoveryLabel}：${data.discovery}。${data.stats.map((stat) => `${stat.count}${stat.unit}`).join("，")}${data.legacyLine ? `。我留下的话：${data.legacyLine}` : ""}${data.tracedGlyphs.length ? `。我的描红：${data.tracedGlyphs.map((glyph) => glyph.char).join("、")}` : ""}`;

  if (!open) return null;
  return createPortal(<>
    <dialog ref={dialogRef} tabIndex={-1} aria-label="我的千年相遇记忆卡" className="memory-dialog"
      onCancel={(event) => { event.preventDefault(); if (desktopEditing) setPanel(panel === "trace" || panel === "initial-trace" ? "edit" : null); else close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className={`memory-workspace${presentationReady ? "" : " is-preparing"}`} aria-hidden={!presentationReady} style={{ "--memory-poster-ratio": rendered?.posterRatio ?? .75 } as CSSProperties}>
        <div className="memory-close-row"><button type="button" className="memory-icon-close memory-card-close" aria-label="关闭记忆卡" onClick={close}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
        <div className="memory-layout">
        <div className="memory-preview-column">
        <div className="memory-card-scroll">
          <div className="memory-poster" aria-busy={rendering}>
            {rendered ? <img className="memory-poster-image" src={rendered.url} alt={alt} width={rendered.width} height={rendered.height} /> : <div className="memory-poster-loading" role="status">
              <p>我的千年相遇</p><span>{error || "正在收拢这次相遇的光影…"}</span>
              {error && <button type="button" onClick={() => setRetry((value) => value + 1)}>重新生成</button>}
            </div>}
            {!desktop && rendered && rendered.data === data && !hasPersonal && <div className="memory-poster-editors" style={{ top: rendered.editorTop, height: rendered.editorHeight }}>
              <button type="button" onClick={writeFirstNote}><span className="memory-editor-title"><MemoryPersonalIcon kind="note" />留下一句话</span><span>把你的感受，留在这次相遇里</span><strong>＋ 写一句话</strong></button>
              {artifact.traceGlyphs && <button type="button" onClick={startFirstTrace}><span className="memory-editor-title"><MemoryPersonalIcon kind="trace" />亲手描红</span><span>临摹一字，留下你的笔迹</span><strong>＋ 开始描红</strong></button>}
            </div>}
          </div>
        </div>
        <div className={`memory-controls${hasPersonal ? " memory-controls-personal" : ""}`}>
          {!desktop && hasPersonal && <button type="button" className="memory-edit-entry" onClick={editCard}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z" /></svg><span><strong>完善我的记忆卡</strong><small>留一句话 · 修改描红</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </button>}
          <footer className="memory-actions" aria-busy={transferring}>
            <button type="button" className="memory-action memory-action-save" disabled={!rendered || rendered.data !== data || rendering || transferring || desktopEditing} onClick={save}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg>保存图片</button>
            <button type="button" className="memory-action memory-action-share" disabled={!rendered || rendered.data !== data || rendering || transferring || desktopEditing} onClick={share}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4" /></svg>分享</button>
          </footer>
        </div>
        {shareHint && <p role="status" className="memory-action-hint">{shareHint}</p>}
        </div>
        {desktop && <aside className="memory-desktop-editor"><MemoryCardEditor inline editing={desktopEditing}
          note={desktopEditing ? draft : userLegacyLine ?? ""} onBegin={editCard}
          onNoteChange={(value) => { if (!desktopEditing) startEditing(); setDraft(value); }} chars={artifact.traceGlyphs?.chars ?? []}
          glyphs={desktopEditing ? draftGlyphs : tracedGlyphs} onTrace={() => { if (!desktopEditing) startEditing("trace"); else setPanel("trace"); }}
          onRemoveTrace={() => { if (!desktopEditing) startEditing(); setDraftGlyphs(null); }}
          onClose={() => setPanel(null)} onDone={finishEditing}
          tracingContent={(panel === "trace" || panel === "initial-trace") && artifact.traceGlyphs ? <TraceGlyphs embedded compact returnLabel="返回编辑" chars={artifact.traceGlyphs.chars} onComplete={(images) => { setDraftGlyphs(images); setPanel("edit"); }} onSkip={() => setPanel("edit")} /> : undefined} />
        </aside>}
        </div>
      </div>
      {!presentationReady && <div className="memory-preparing" role="status"><p>{error || "正在收拢这次相遇的光影…"}</p>
        {error && <button type="button" onClick={() => setRetry((value) => value + 1)}>重新生成</button>}
        <button type="button" onClick={close}>关闭</button>
      </div>}
      {saveToast > 0 && <div className="memory-save-toast" role="status" aria-live="polite">长按图片进行保存呦～</div>}
    </dialog>
    {!desktop && panel === "note" && <ExtraDialog title="我留下的话" onClose={() => setPanel(null)}><div className="memory-note-editor">
      <p><MemoryPersonalIcon kind="note" />这次与{artifact.name}相遇，你想留下什么？</p>
      <textarea autoFocus aria-label="我留下的话" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={80} rows={4} placeholder="可以是一点发现，也可以是一句感受。" />
      <span>{draft.length} / 80</span>
      <button type="button" className="memory-primary" disabled={!draft.trim()} onClick={() => { setUserLegacyLine(draft.trim()); setPanel(null); }}>写进记忆卡</button>
    </div></ExtraDialog>}
    {!desktop && panel === "initial-trace" && artifact.traceGlyphs && <ExtraDialog title="我的描红" onClose={() => setPanel(null)}><TraceGlyphs embedded chars={artifact.traceGlyphs.chars} onComplete={(images) => { setTracedGlyphs(images); setPanel(null); }} onSkip={() => setPanel(null)} /></ExtraDialog>}
    {!desktop && (panel === "edit" || panel === "trace") && <MemoryCardEditor note={draft} onNoteChange={setDraft} chars={artifact.traceGlyphs?.chars ?? []} glyphs={draftGlyphs}
      onTrace={() => setPanel("trace")} onRemoveTrace={() => setDraftGlyphs(null)} onClose={() => setPanel(null)}
      onDone={finishEditing} />}
    {!desktop && panel === "trace" && artifact.traceGlyphs && <ExtraDialog title="我的描红" onClose={() => setPanel("edit")}><TraceGlyphs embedded returnLabel="返回编辑" chars={artifact.traceGlyphs.chars} onComplete={(images) => { setDraftGlyphs(images); setPanel("edit"); }} onSkip={() => setPanel("edit")} /></ExtraDialog>}
  </>, document.body);
}
