/**
 * F1 武将图鉴 — 共用常量与工具函数
 *
 * 阵营 / 品质 / 兵种适性等 enum 都来自 src/lib/data/schemas.ts,
 * 这里集中声明表现层常量(色块、徽章配色、显示标签),
 * 让 list / detail 两个 page 复用同一套规则。
 */
import type { Camp, Quality, Aptitude } from '@/lib/data/schemas';

// ---------------------------------------------------------------------------
// 阵营(魏 / 蜀 / 吴 / 群)
// ---------------------------------------------------------------------------

/** 阵营 → 中文色名,用于卡片左侧色标 / 名字高亮 */
export const CAMP_COLOR: Record<Camp, string> = {
  魏: 'text-blue-700',
  蜀: 'text-red-700',
  吴: 'text-green-700',
  群: 'text-amber-700',
};

/** 阵营 → 背景色,用于色标徽章 */
export const CAMP_BG: Record<Camp, string> = {
  魏: 'bg-blue-100',
  蜀: 'bg-red-100',
  吴: 'bg-green-100',
  群: 'bg-amber-100',
};

/** 阵营 → 边框色,用于色标左侧色条 */
export const CAMP_BORDER: Record<Camp, string> = {
  魏: 'border-blue-600',
  蜀: 'border-red-600',
  吴: 'border-green-600',
  群: 'border-amber-600',
};

/** 4 个阵营枚举 */
export const ALL_CAMPS: Camp[] = ['魏', '蜀', '吴', '群'];

// ---------------------------------------------------------------------------
// 品质(橙 / 紫 / 蓝)
// ---------------------------------------------------------------------------

/** 品质 → Tailwind 组合徽章背景色 */
export const QUALITY_BADGE: Record<Quality, string> = {
  橙: 'bg-orange-500/90 text-white',
  紫: 'bg-purple-500/90 text-white',
  蓝: 'bg-sky-500/90 text-white',
};

/** 品质 → 简短描述(用于 tooltip / a11y label) */
export const QUALITY_LABEL: Record<Quality, string> = {
  橙: '橙·传说',
  紫: '紫·史诗',
  蓝: '蓝·稀有',
};

export const ALL_QUALITIES: Quality[] = ['橙', '紫', '蓝'];

// ---------------------------------------------------------------------------
// 兵种适性(S / A / B / C)
// ---------------------------------------------------------------------------

/** 适性 → 背景色(色块)— 绿 / 蓝 / 黄 / 灰 */
export const APTITUDE_BG: Record<Aptitude, string> = {
  S: 'bg-emerald-500 text-white',
  A: 'bg-sky-500 text-white',
  B: 'bg-amber-400 text-ink',
  C: 'bg-stone-300 text-ink',
};

/** 5 个兵种 — 列表顺序 + 中文标签 + schema 字段名 */
export const TROOP_TYPES: Array<{
  key: 'cavalry' | 'shield' | 'archer' | 'spear' | 'siege';
  label: string;
}> = [
  { key: 'cavalry', label: '骑' },
  { key: 'shield', label: '盾' },
  { key: 'archer', label: '弓' },
  { key: 'spear', label: '枪' },
  { key: 'siege', label: '器' },
];

// ---------------------------------------------------------------------------
// SP 武将
// ---------------------------------------------------------------------------

export const SP_LABEL = 'SP';

// ---------------------------------------------------------------------------
// 通用类型守卫
// ---------------------------------------------------------------------------

/** 把 URL 里的字符串过滤值统一映射回 enum(用于 server component 解析) */
export function parseCamp(value: string | undefined): Camp | null {
  if (!value) return null;
  if (value === '魏' || value === '蜀' || value === '吴' || value === '群') {
    return value;
  }
  return null;
}

export function parseQuality(value: string | undefined): Quality | null {
  if (!value) return null;
  if (value === '橙' || value === '紫' || value === '蓝') return value;
  return null;
}

/** 5 个兵种之一的 schema 字段名 */
export type TroopKey = (typeof TROOP_TYPES)[number]['key'];
export const ALL_TROOP_KEYS: TroopKey[] = TROOP_TYPES.map((t) => t.key);

export function parseTroopKey(value: string | undefined): TroopKey | null {
  if (!value) return null;
  if (ALL_TROOP_KEYS.includes(value as TroopKey)) {
    return value as TroopKey;
  }
  return null;
}

/** 'true' / '1' / 'yes' 都视为 true */
export function parseBool(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  return value === 'true' || value === '1';
}