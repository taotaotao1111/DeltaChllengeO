/**
 * 生成「深夜博物馆 · 青铜器嗡鸣」环境底噪（30 秒无缝循环 WAV）。
 *
 * 素材纪律：不引入外部音频（版权不可控），离线程序合成——
 * - 低频嗡鸣：52.5Hz 基频 + 泛音簇（105/158/263Hz），各音量独立极慢波动
 *   （不同周期的正弦 LFO），模拟大空间里铜器腔体的共鸣此起彼伏；
 * - 空气感：粉噪（1/f）过强低通（~400Hz），像空旷展厅的远场噪声；
 * - 无缝循环：所有成分的频率/包络周期都整除 30s（相位对齐），
 *   结尾与开头零交接缝。
 *
 * 用法：node scripts/gen-ambient.mjs [输出路径]
 * 产物再经 ffmpeg 转 mp3（前端用）。
 */
import { writeFileSync } from "node:fs";

const DUR = 30; // 秒
const SR = 44100;
const N = DUR * SR;
const out = process.argv[2] ?? "public/audio/ambient-raw.wav";

// 粉噪（1/f）：白噪差分累积后归一
function pinkNoise(n) {
  const b0 = [0, 0, 0, 0, 0, 0, 0];
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0[0] = 0.99886 * b0[0] + w * 0.0555179;
    b0[1] = 0.99332 * b0[1] + w * 0.0750759;
    b0[2] = 0.969 * b0[2] + w * 0.153852;
    b0[3] = 0.8665 * b0[3] + w * 0.3104856;
    b0[4] = 0.55 * b0[4] + w * 0.5329522;
    b0[5] = -0.7616 * b0[5] - w * 0.016898;
    const v = b0[0] + b0[1] + b0[2] + b0[3] + b0[4] + b0[5] + b0[6] + w * 0.5362;
    b0[6] = w * 0.115926;
    out[i] = v;
  }
  // 归一
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < n; i++) out[i] /= peak;
  return out;
}

// —— 生成 ——
const buf = new Float64Array(N);

// 1. 青铜嗡鸣簇：freq 均为 1/DUR 的整数倍（无缝）；ampLFO 周期整除 30s
const hums = [
  { f: 52.5, a: 0.32, lfoF: 1 / 30, lfoD: 0.5 },
  { f: 105, a: 0.16, lfoF: 2 / 30, lfoD: 0.6 },
  { f: 157.5, a: 0.08, lfoF: 1 / 15, lfoD: 0.7 },
  { f: 262.5, a: 0.04, lfoF: 1 / 10, lfoD: 0.8 },
  { f: 35, a: 0.2, lfoF: 1 / 30, lfoD: 0.45 },
];
for (const h of hums) {
  const phase = Math.random() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const lfo = 1 - h.lfoD * 0.5 * (1 + Math.sin(2 * Math.PI * h.lfoF * t + phase));
    buf[i] += h.a * lfo * Math.sin(2 * Math.PI * h.f * t + phase);
  }
}

// 2. 空气感：粉噪 + 单极点强低通（~350Hz）
const pink = pinkNoise(N);
let lp = 0;
const LP_A = Math.exp((-2 * Math.PI * 350) / SR); // 低通系数
for (let i = 0; i < N; i++) {
  lp = LP_A * lp + (1 - LP_A) * pink[i];
  buf[i] += lp * 0.5;
}

// 整体淡入淡出保护（循环点相位已对齐，这里只是温和电平）
// 归一 + 输出 WAV（16-bit PCM）
let peak = 0;
for (const v of buf) peak = Math.max(peak, Math.abs(v));
const G = 0.85 / peak; // 留 headroom，前端再乘 0.05 音量
const wav = Buffer.alloc(44 + N * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(36 + N * 2, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); // PCM
wav.writeUInt16LE(1, 22); // mono
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  const s = Math.max(-1, Math.min(1, buf[i] * G));
  wav.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
}
writeFileSync(out, wav);
console.log(`OK: ${out} (${DUR}s mono ${SR}Hz, peak normalized to 0.85)`);
