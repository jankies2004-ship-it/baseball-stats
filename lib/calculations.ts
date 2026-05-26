// 打率 = 安打 ÷ 打数
export function calcAVG(h: number, ab: number): number {
  if (ab === 0) return 0
  return h / ab
}

// 出塁率 = (安打 + 四球) ÷ (打数 + 四球)  ※死球・犠飛未収録のため簡略式
export function calcOBP(h: number, bb: number, ab: number): number {
  const denom = ab + bb
  if (denom === 0) return 0
  return (h + bb) / denom
}

// 塁打数 = 単打×1 + 二塁打×2 + 三塁打×3 + 本塁打×4
// 単打 = 安打 - 二塁打 - 三塁打 - 本塁打
// → 塁打数 = 安打 + 二塁打 + 三塁打×2 + 本塁打×3
export function calcTB(h: number, b2: number, b3: number, hr: number): number {
  return h + b2 + 2 * b3 + 3 * hr
}

// 長打率 = 塁打数 ÷ 打数
export function calcSLG(h: number, b2: number, b3: number, hr: number, ab: number): number {
  if (ab === 0) return 0
  return calcTB(h, b2, b3, hr) / ab
}

// OPS = 出塁率 + 長打率
export function calcOPS(obp: number, slg: number): number {
  return obp + slg
}

// .300 形式（先頭の0を省略）。OPS など1超えの場合はそのまま
export function formatRate(rate: number): string {
  if (isNaN(rate) || !isFinite(rate)) return '---'
  const fixed = rate.toFixed(3)
  return rate < 1 ? fixed.replace(/^0/, '') : fixed
}
