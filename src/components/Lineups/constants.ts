/**
 * F4 推荐阵容 — 共用常量与配色
 *
 * 集中声明阵容相关的显示层规则:
 *  - 强度 tier (T0/T1/T2/T3) 配色
 *  - 6 维评分(输出/回复/多穿/节奏/打击面/稳定)的轴顺序 + 配色
 *  - 兵种字段 → 中文标签映射
 *
 * 数据 enum 仍然在 src/lib/data/schemas.ts,这里只翻译成 UI 层。
 */
import type { LineupTier, TroopType, LineupRatings } from "@/lib/data/schemas";

// ---------------------------------------------------------------------------
// 强度 tier 配色
// ---------------------------------------------------------------------------

/** 4 个 tier 的色块 / 文字 / 边框 组合 className */
export const TIER_STYLES: Record<
  LineupTier,
  { badge: string; solid: string; label: string; description: string }
> = {
  T0: {
    badge: "bg-red-600 text-white border-red-700",
    solid: "bg-red-600 text-white",
    label: "T0",
    description: "版本最强,出场率高",
  },
  T1: {
    badge: "bg-orange-500 text-white border-orange-600",
    solid: "bg-orange-500 text-white",
    label: "T1",
    description: "强力主流,出场率中高",
  },
  T2: {
    badge: "bg-amber-500 text-white border-amber-600",
    solid: "bg-amber-500 text-white",
    label: "T2",
    description: "可用阵容,需特定环境",
  },
  T3: {
    badge: "bg-stone-500 text-white border-stone-600",
    solid: "bg-stone-500 text-white",
    label: "T3",
    description: "弱势 / 冷门 / 待加强",
  },
};

export const ALL_TIERS: LineupTier[] = ["T0", "T1", "T2", "T3"];

// ---------------------------------------------------------------------------
// 6 维评分轴
// ---------------------------------------------------------------------------

/** 6 维评分的轴 key(LineupRatings 的子集,不含 total) */
export type RatingAxisKey =
  | "output"
  | "recover"
  | "multihit"
  | "rhythm"
  | "coverage"
  | "stability";

/**
 * 6 维评分的轴顺序(横条 / 雷达图 / 详情页全部按这个顺序)。
 * key 必须是 LineupRatings 里的 6 个字段名之一(不含 total)。
 */
export const RATING_AXES: Array<{
  key: RatingAxisKey;
  label: string;
  /** 横条/雷达图主色(用于视觉区分) */
  color: string;
  /** 横条底色(进度条背景) */
  bg: string;
  /** 雷达图轴线 / 雷达线条用色 */
  line: string;
}> = [
  { key: "output", label: "输出", color: "#c84141", bg: "#fde2e2", line: "#c84141" },
  { key: "recover", label: "回复", color: "#5a8a5a", bg: "#dceadc", line: "#5a8a5a" },
  { key: "multihit", label: "多穿", color: "#d4a72c", bg: "#fdf3d3", line: "#d4a72c" },
  { key: "rhythm", label: "节奏", color: "#e07b2a", bg: "#fde5d2", line: "#e07b2a" },
  { key: "coverage", label: "打击面", color: "#7a4ea0", bg: "#e9dff3", line: "#7a4ea0" },
  { key: "stability", label: "稳定", color: "#2f6fb0", bg: "#dce8f5", line: "#2f6fb0" },
];

/** LineupRatings 去掉 total 后的 6 维对象类型(给雷达/横条/折线使用) */
export type SixDimensionalRatings = Pick<
  LineupRatings,
  RatingAxisKey
>;

// ---------------------------------------------------------------------------
// 兵种
// ---------------------------------------------------------------------------

/** TroopType → 中文 + 短标签 */
export const TROOP_LABELS: Record<TroopType, { full: string; short: string }> = {
  cavalry: { full: "骑兵", short: "骑" },
  shield: { full: "盾兵", short: "盾" },
  archer: { full: "弓兵", short: "弓" },
  spear: { full: "枪兵", short: "枪" },
  siege: { full: "器械", short: "器" },
};

export const ALL_TROOPS: TroopType[] = [
  "cavalry",
  "shield",
  "archer",
  "spear",
  "siege",
];

// ---------------------------------------------------------------------------
// 标签
// ---------------------------------------------------------------------------

/** 阵容 tags → 配色(尽量用语义色,标签多时用备用色) */
export const TAG_STYLES: Record<string, string> = {
  打架: "bg-red-100 text-red-700 border-red-300",
  开荒: "bg-emerald-100 text-emerald-700 border-emerald-300",
  PVP: "bg-purple-100 text-purple-700 border-purple-300",
  PVE: "bg-sky-100 text-sky-700 border-sky-300",
  万能: "bg-amber-100 text-amber-700 border-amber-300",
  速攻: "bg-orange-100 text-orange-700 border-orange-300",
  肉盾: "bg-stone-100 text-stone-700 border-stone-300",
};

/** 未识别 tag 时的 fallback 配色(轮换 4 个备用) */
export const TAG_FALLBACK = [
  "bg-stone-100 text-stone-700 border-stone-300",
  "bg-cyan-100 text-cyan-700 border-cyan-300",
  "bg-pink-100 text-pink-700 border-pink-300",
  "bg-lime-100 text-lime-700 border-lime-300",
];

export function tagStyleClass(tag: string, idx: number = 0): string {
  if (TAG_STYLES[tag]) return TAG_STYLES[tag];
  return TAG_FALLBACK[idx % TAG_FALLBACK.length];
}

// ---------------------------------------------------------------------------
// 排序 / 筛选默认值
// ---------------------------------------------------------------------------

export type SortKey = "score" | "heat";
export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "score", label: "综合分" },
  { value: "heat", label: "热度" },
];
