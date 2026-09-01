interface ChangxinLampIllustrationProps {
  className?: string;
}

/**
 * 长信宫灯 —— DEMO 插画（原创 SVG 矢量绘制，非文物实拍图）
 *
 * 长信宫灯是西汉鎏金铜灯，1968 年河北满城汉墓出土，现藏河北博物院。
 * 造型为跽坐执灯的宫女，右臂中空兼作烟道，灯罩带两片可推动的弧形铜板。
 * 此插画用写意方式还原这些典型特征，用于展厅"敬请期待"卡片的视觉呈现，
 * 暖金色调呼应其鎏金铜质本身的光泽，而非凭空装饰。
 */
export default function ChangxinLampIllustration({ className = "" }: ChangxinLampIllustrationProps) {
  return (
    <svg viewBox="0 0 300 400" className={className} role="img" aria-label="长信宫灯 DEMO 插画">
      <defs>
        <linearGradient id="lampGilt" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e3c98c" />
          <stop offset="45%" stopColor="#c9a76a" />
          <stop offset="55%" stopColor="#a8863f" />
          <stop offset="100%" stopColor="#7a611f" />
        </linearGradient>
        <linearGradient id="lampGiltDark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b89457" />
          <stop offset="50%" stopColor="#8f7238" />
          <stop offset="100%" stopColor="#5c4a1f" />
        </linearGradient>
        <radialGradient id="lampGlow" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(230,190,110,0.5)" />
          <stop offset="100%" stopColor="rgba(230,190,110,0)" />
        </radialGradient>
      </defs>

      {/* 暖金光晕 */}
      <ellipse cx="150" cy="140" rx="120" ry="130" fill="url(#lampGlow)" />

      {/* 底部影 */}
      <ellipse cx="150" cy="378" rx="86" ry="12" fill="#000" opacity="0.35" />

      {/* 跽坐宫女——衣袍轮廓（钟形，稳重跽坐姿态） */}
      <path
        d="M150 210
           C 118 210, 96 226, 90 254
           C 84 282, 82 320, 78 360
           C 76 372, 84 378, 96 378
           L 204 378
           C 216 378, 224 372, 222 360
           C 218 320, 216 282, 210 254
           C 204 226, 182 210, 150 210 Z"
        fill="url(#lampGiltDark)"
        stroke="#4a3b18"
        strokeWidth="1.5"
      />

      {/* 衣袍衣纹线 */}
      <path d="M112 250 C 108 288, 104 330, 100 366" fill="none" stroke="#5c4a1f" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M150 214 C 148 264, 148 322, 148 372" fill="none" stroke="#5c4a1f" strokeOpacity="0.4" strokeWidth="1.5" />
      <path d="M188 250 C 192 288, 196 330, 200 366" fill="none" stroke="#5c4a1f" strokeOpacity="0.5" strokeWidth="1.5" />

      {/* 头部 */}
      <circle cx="150" cy="150" r="30" fill="url(#lampGilt)" stroke="#5c4a1f" strokeWidth="1.5" />
      {/* 发髻 */}
      <path d="M132 128 C 138 116, 162 116, 168 128" fill="none" stroke="#5c4a1f" strokeWidth="3" strokeLinecap="round" />

      {/* 颈与肩 */}
      <path
        d="M132 176 C 132 192, 168 192, 168 176 L 168 200 C 168 208, 132 208, 132 200 Z"
        fill="url(#lampGilt)"
        stroke="#5c4a1f"
        strokeWidth="1.2"
      />

      {/* 右臂延伸——中空烟道，托举灯盘 */}
      <path
        d="M168 196
           C 190 198, 206 192, 214 176
           C 220 164, 218 150, 206 144
           C 198 140, 190 144, 188 152
           C 184 166, 176 178, 160 182"
        fill="none"
        stroke="url(#lampGilt)"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M168 196
           C 190 198, 206 192, 214 176
           C 220 164, 218 150, 206 144"
        fill="none"
        stroke="#5c4a1f"
        strokeOpacity="0.4"
        strokeWidth="1"
      />

      {/* 左臂——扶灯座 */}
      <path
        d="M132 196 C 118 202, 108 214, 108 228"
        fill="none"
        stroke="url(#lampGilt)"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* 灯盘与灯罩（顶端，弧形铜板可调节光照） */}
      <ellipse cx="206" cy="140" rx="26" ry="8" fill="url(#lampGilt)" stroke="#5c4a1f" strokeWidth="1" />
      <path
        d="M186 138 C 186 122, 198 112, 206 112 C 214 112, 226 122, 226 138"
        fill="none"
        stroke="#c9a76a"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="206" cy="126" r="5" fill="#f2ead9" opacity="0.9" />
    </svg>
  );
}
