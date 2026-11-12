import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getArtifact } from "../../data/artifacts";
import { useGameStore } from "../../store/gameStore";
import { loadEncounter, saveEncounter } from "../../utils/encounterStorage";
import { keepExpectationInView } from "../../utils/expectationViewport";
import { deleteExpectation, getOwnExpectation, submitExpectation } from "../../services/expectationService";
import MemoryPersonalIcon from "../memory/MemoryPersonalIcon";
import "./EpilogueScene.css";
import { track } from "../../utils/tracking";

export default function EpilogueScene() {
  const artifactId = useGameStore((s) => s.currentArtifactId);
  const returnToMemoryCard = useGameStore((s) => s.returnToMemoryCard);
  const artifact = getArtifact(artifactId);
  const [local] = useState(() => loadEncounter(artifactId));
  const [saved, setSaved] = useState(local.expectation);
  const [cloudRecord, setCloudRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formId = useId();
  const revision = useRef(0);

  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const version = revision.current;
    void getOwnExpectation(artifactId, controller.signal).then(({ expectation }) => {
      if (controller.signal.aborted || revision.current !== version) return;
      setCloudRecord(Boolean(expectation));
      // 未送达的本机内容优先保留，旧云端记录不能覆盖用户的新稿。
      if (local.expectationPending && expectation?.content !== local.expectation) {
        return;
      }
      if (expectation) {
        setSaved(expectation.content);
        saveEncounter(artifactId, { expectation: expectation.content, expectationPending: false });
      }
    }).catch(() => { /* 查看失败不阻断故事，也不把本机内容误报为已送达。 */ });
    return () => controller.abort();
  }, [artifactId, local]);
  useEffect(() => {
    if (!editing || !sceneRef.current || !formRef.current || !inputRef.current) return;
    return keepExpectationInView(sceneRef.current, formRef.current, inputRef.current);
  }, [editing]);

  const startEditing = () => {
    revision.current++;
    // 同一次点击中挂载并聚焦，保留 iOS 拉起键盘所需的用户手势。
    flushSync(() => { setDraft(saved); setEditing(true); setNotice(""); });
    inputRef.current?.focus({ preventScroll: !window.matchMedia("(max-width:767px)").matches });
  };

  const send = async (text: string) => {
    if (!text || submitting) return;
    revision.current++;
    saveEncounter(artifactId, { expectation: text, expectationPending: true });
    setSaved(text); setSubmitting(true); setNotice("");
    try {
      await submitExpectation(artifactId, text);
      track("expectation_submit", { artifactId });
      saveEncounter(artifactId, { expectation: text, expectationPending: false });
      setCloudRecord(true); setEditing(false); setNotice("你的期待已送达。");
    } catch {
      setNotice("提交未成功，请稍后再试。");
    } finally { setSubmitting(false); }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); void send(draft.trim());
  };
  const remove = async () => {
    if (submitting) return;
    revision.current++; setSubmitting(true); setNotice("");
    try {
      await deleteExpectation(artifactId);
      const cleared = saveEncounter(artifactId, { expectation: "", expectationPending: false });
      setSaved(""); setDraft(""); setCloudRecord(false); setEditing(false);
      setNotice(cleared ? "已删除这份期待。" : "云端期待已删除，当前浏览器未能清除本机草稿。");
    } catch { setNotice("删除失败，请稍后重试。"); }
    finally { setSubmitting(false); }
  };

  return <main ref={sceneRef} className="epilogue-scene" aria-labelledby="epilogue-title">
    <picture className="epilogue-backdrop" aria-hidden="true">
      <source media="(min-width:768px)" srcSet="images/epilogue/next-encounter-desktop.webp" />
      <img src="images/epilogue/next-encounter-mobile.webp" alt="" width="941" height="1672" fetchPriority="high" />
    </picture>
    <button type="button" className="epilogue-back" onClick={returnToMemoryCard}><span aria-hidden="true">←</span> 回到记忆卡</button>
    <div className="epilogue-content">
      <p className="epilogue-series"><span>物语千年</span><span className="epilogue-continued">未完待续</span></p>
      <h1 id="epilogue-title" ref={titleRef} tabIndex={-1}>下一次相遇<span className="epilogue-seal" aria-hidden="true">物<br />语</span></h1>
      <img className="epilogue-art" src="images/epilogue/next-encounter-artwork.webp" alt="" aria-hidden="true" width="1440" height="811" fetchPriority="high" draggable={false} />
      <section className="epilogue-invitation" aria-label="下一段故事的邀请">
        <h2><span>还有许多故事，</span><span>等待被听见。</span></h2>
        <p className="epilogue-invitation-desktop">{artifact.name}的故事暂告一段落。<br /><span>下一次，你想听哪件文物</span><span>讲述它的千年？</span></p>
        <p className="epilogue-invitation-mobile">{artifact.name}的故事暂告一段落。<br />下一次，你想走进哪个文物？</p>
      </section>
      <div className="epilogue-expectation">
        {!editing ? <>
          <button type="button" className="epilogue-write" disabled={submitting} aria-expanded="false" aria-controls={formId} onClick={startEditing}>
            <MemoryPersonalIcon kind="note" /><span>{saved ? "修改我的期待" : "写下你的期待"}</span><svg className="epilogue-write-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
          </button>
          {saved && <p className="epilogue-saved">我想听：{saved}</p>}
        </> : <form ref={formRef} id={formId} className="epilogue-form" onSubmit={submit}>
          <label htmlFor={`${formId}-text`}>下一次，你想走近谁？</label>
          <div className="epilogue-input"><textarea id={`${formId}-text`} ref={inputRef} value={draft} disabled={submitting} onChange={(event) => setDraft(event.target.value)} maxLength={80} rows={2} placeholder="写下文物名字，或一段你想听的历史…" /><span>{draft.length} / 80</span></div>
          <p className="epilogue-collection-note">提交内容将关联你的 Cowork 登录名称，用于后续文物选题，仅管理员可见。</p>
          <div className="epilogue-form-actions"><button type="button" disabled={submitting} onClick={() => { setEditing(false); setDraft(saved); setNotice(""); }}>暂不填写</button><button type="submit" disabled={!draft.trim() || submitting}>{submitting ? "正在送出…" : "留下期待"}</button></div>
          {cloudRecord && <button type="button" className="epilogue-delete" disabled={submitting} onClick={() => { void remove(); }}>删除已提交的期待</button>}
        </form>}
        <p className="epilogue-notice" role="status">{notice}</p>
      </div>
      <p className="epilogue-signoff">每一件文物，都有自己的千年。</p>
    </div>
  </main>;
}
