import type { FlipCardData, FlipModuleData } from "../../../types/artifact";

/** 仅负责纸面和排版；翻面角度、手势与进度由 FlipCardModule 统一维护。 */
export default function ArchiveCardFace({ face, artwork, artifactName, card, hidden, decorative = false, onReadScroll }: {
  face: "front" | "back";
  artwork: NonNullable<FlipModuleData["cardArtwork"]>;
  artifactName: string;
  card: FlipCardData;
  hidden: boolean;
  /** 结尾叠纸复用相同纸面，仅作视觉回顾，不重复进入阅读或键盘焦点。 */
  decorative?: boolean;
  onReadScroll: () => void;
}) {
  const back = face === "back";
  const [lead, ...body] = card.front.split("\n").filter(Boolean);
  return <div className={`archive-card-face archive-card-face--${face}`} aria-hidden={hidden || decorative}
    style={{ pointerEvents: hidden || decorative ? "none" : "auto" }}>
    <picture className="archive-card-face__paper" aria-hidden="true">
      <source media="(min-width: 1024px)" srcSet={artwork[face].desktop} />
      <img src={artwork[face].mobile} alt="" draggable={false} decoding="async" />
    </picture>
    <div className="archive-card-face__interior">
      <div className="archive-card-face__heading">
        <span className="archive-card-face__label">{back ? "史实档案" : `${artifactName}的讲述`}</span>
        {back && <span className={`archive-card-face__stamp${card.back.confidence === "verified" ? " is-verified" : ""}`}>
          {card.back.confidence === "verified" ? "已核实" : "合理推测"}
        </span>}
      </div>
      <div className="archive-card-face__copy" tabIndex={hidden || decorative ? -1 : 0} onScroll={onReadScroll}
        aria-label={back ? "史实与来源，可滚动阅读" : `${artifactName}讲述，可滚动阅读`}>
        {back ? <>
          <p className="archive-card-face__fact">{card.back.content}</p>
          {card.hint && <p className="archive-card-face__note">{card.hint}</p>}
          <div className="archive-card-face__source">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 5c-2-1.5-4-1.5-7-1v12c3-.5 5-.5 7 1 2-1.5 4-1.5 7-1V4c-3-.5-5-.5-7 1Zm0 0v12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            <p>来源：{card.back.source}</p>
          </div>
        </> : <>
          <blockquote>“{lead}”</blockquote>
          {body.length > 0 && <p className="archive-card-face__story">{body.join("\n")}</p>}
        </>}
      </div>
    </div>
  </div>;
}
