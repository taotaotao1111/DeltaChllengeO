import type { HotspotType } from "../../types/artifact";

interface HezunIllustrationProps {
  className?: string;
  /** 当前被聚焦的热点类型，对应区域会有轻微高亮，帮助用户建立"部位-故事"的关联 */
  activeHotspot?: HotspotType | null;
}

/**
 * 何尊 —— DEMO 插画（原创 SVG 矢量绘制，非文物实拍图）
 *
 * 说明：这是本 Demo 用于 2.5D 展示的占位艺术图，用写意的方式还原
 * 「喇叭形大口 · 鼓腹 · 圈足 · 兽面纹 · 扉棱」等何尊的典型器型特征，
 * 用于呈现交互效果。后续接入真实授权图片 / 3D 模型时，只需替换
 * ArtifactViewer 对应的渲染分支，不影响其余业务逻辑。
 */
export default function HezunIllustration({
  className = "",
  activeHotspot = null,
}: HezunIllustrationProps) {
  const patternActive = activeHotspot === "pattern";
  const inscriptionActive = activeHotspot === "inscription";
  const formActive = activeHotspot === "form";

  return (
    <svg
      viewBox="0 0 400 540"
      className={className}
      role="img"
      aria-label="何尊 DEMO 插画"
    >
      <defs>
        <linearGradient id="bronzeBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6b7566" />
          <stop offset="45%" stopColor="#4a5245" />
          <stop offset="55%" stopColor="#3c4438" />
          <stop offset="100%" stopColor="#242a20" />
        </linearGradient>
        <linearGradient id="bronzeRim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8a9280" />
          <stop offset="50%" stopColor="#5b6459" />
          <stop offset="100%" stopColor="#2e3427" />
        </linearGradient>
        <radialGradient id="mouthShadow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#050504" />
          <stop offset="100%" stopColor="#1c2018" />
        </radialGradient>
        <radialGradient id="pedestalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(201,167,106,0.28)" />
          <stop offset="100%" stopColor="rgba(201,167,106,0)" />
        </radialGradient>
      </defs>

      {/* 底部聚光/影 */}
      <ellipse cx="200" cy="486" rx="120" ry="18" fill="url(#pedestalGlow)" />
      <ellipse cx="200" cy="490" rx="86" ry="10" fill="#000" opacity="0.45" />

      {/* ===== 器身主体轮廓 ===== */}
      <path
        d="M 108 30
           C 108 16, 292 16, 292 30
           C 292 44, 268 52, 246 58
           C 230 90, 224 112, 224 138
           C 224 158, 250 172, 268 200
           C 286 232, 292 258, 292 284
           C 292 322, 268 344, 246 356
           C 236 378, 232 398, 246 414
           C 264 424, 278 438, 278 456
           C 278 476, 244 492, 200 492
           C 156 492, 122 476, 122 456
           C 122 438, 136 424, 154 414
           C 168 398, 164 378, 154 356
           C 132 344, 108 322, 108 284
           C 108 258, 114 232, 132 200
           C 150 172, 176 158, 176 138
           C 176 112, 170 90, 154 58
           C 132 52, 108 44, 108 30 Z"
        fill="url(#bronzeBody)"
        stroke="#171b13"
        strokeWidth="1.5"
      />

      {/* 口部内凹（中空提示） */}
      <ellipse cx="200" cy="30" rx="92" ry="13" fill="url(#mouthShadow)" />
      <ellipse
        cx="200"
        cy="30"
        rx="92"
        ry="13"
        fill="none"
        stroke="#8a9280"
        strokeOpacity="0.5"
        strokeWidth="1"
      />

      {/* 颈部与圈足处的凸弦纹（横向装饰带） */}
      <path d="M 154 58 C 178 66, 222 66, 246 58" fill="none" stroke="#8a9280" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M 132 200 C 168 186, 232 186, 268 200" fill="none" stroke="#8a9280" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M 132 284 C 168 298, 232 298, 268 284" fill="none" stroke="#8a9280" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M 154 356 C 178 348, 222 348, 246 356" fill="none" stroke="#8a9280" strokeOpacity="0.3" strokeWidth="2" />

      {/* ===== 扉棱（两侧凸起装饰脊）===== */}
      <g opacity={formActive ? 1 : 0.85} style={{ transition: "opacity .5s" }}>
        <path d="M 134 205 L 128 240 L 134 280 L 128 284" fill="none" stroke="#9aa38d" strokeWidth="3" strokeLinecap="round" />
        <path d="M 266 205 L 272 240 L 266 280 L 272 284" fill="none" stroke="#9aa38d" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* ===== 饕餮纹（兽面纹）装饰带：鼓腹位置 ===== */}
      <g opacity={patternActive ? 1 : 0.75} style={{ transition: "opacity .5s" }}>
        {/* 中央兽面：两个对称卷目 + 中脊 */}
        <path d="M 200 210 L 200 270" stroke="#c9a76a" strokeOpacity={patternActive ? 0.9 : 0.45} strokeWidth="2" />
        {[-1, 1].map((dir) => (
          <g key={dir} transform={`translate(${200 + dir * 0}, 0)`}>
            <circle cx={200 + dir * 26} cy="228" r="9" fill="none" stroke="#c9a76a" strokeOpacity={patternActive ? 0.9 : 0.5} strokeWidth="2" />
            <circle cx={200 + dir * 26} cy="228" r="3" fill="#c9a76a" fillOpacity={patternActive ? 0.9 : 0.5} />
            <path
              d={`M ${200 + dir * 16} 244 C ${200 + dir * 30} 252, ${200 + dir * 40} 246, ${200 + dir * 46} 232`}
              fill="none"
              stroke="#c9a76a"
              strokeOpacity={patternActive ? 0.9 : 0.45}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d={`M ${200 + dir * 18} 260 C ${200 + dir * 34} 266, ${200 + dir * 44} 258, ${200 + dir * 50} 244`}
              fill="none"
              stroke="#c9a76a"
              strokeOpacity={patternActive ? 0.85 : 0.35}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        ))}
        {patternActive && (
          <ellipse cx="200" cy="240" rx="80" ry="46" fill="none" stroke="#c9a76a" strokeOpacity="0.5" strokeWidth="1" />
        )}
      </g>

      {/* ===== 铭文提示点（象征内壁铭文位置） ===== */}
      <g style={{ transition: "opacity .5s" }} opacity={inscriptionActive ? 1 : 0.6}>
        <circle cx="200" cy="330" r={inscriptionActive ? 30 : 5} fill="none" stroke="#c9a76a" strokeWidth="1" opacity={inscriptionActive ? 0.5 : 0} />
        <circle cx="200" cy="330" r="4" fill="#e3c98c" />
      </g>

      {/* 圈足底部装饰带 */}
      <path d="M 150 452 C 172 462, 228 462, 250 452" fill="none" stroke="#8a9280" strokeOpacity="0.35" strokeWidth="2" />

      {/* 口沿高光 */}
      <path
        d="M 112 30 C 112 20, 288 20, 288 30"
        fill="none"
        stroke="url(#bronzeRim)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* 左侧高光竖纹，暗示金属反光 */}
      <path
        d="M 148 60 C 140 130, 138 200, 150 280 C 140 340, 142 400, 156 452"
        fill="none"
        stroke="#c9d3bd"
        strokeOpacity="0.12"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
