/**
 * F9 版本特性 — 类型徽章
 *
 * 把 data/patches.json 里 type 字段(武将调整 / 战法调整 / 赛季机制 / 阵法调整 / 新阵法)
 * 映射到 5 种配色,直观区分"加强/削弱/机制/新增"。
 */

/** 徽章变体 — 与 TypeFilterBar 的 4 个筛选项对齐 */
export type PatchTypeVariant =
  | "武将调整"
  | "战法调整"
  | "赛季机制"
  | "阵法调整"
  | "新阵法";

/** 5 种 type 的视觉变体(配色沿用项目主色 + Tailwind 调色板) */
const VARIANT_CLASS: Record<PatchTypeVariant, string> = {
  武将调整: "bg-accent-red/15 text-accent-red border-accent-red/30",
  战法调整: "bg-primary/15 text-primary border-primary/30",
  赛季机制: "bg-accent-green/15 text-accent-green border-accent-green/30",
  阵法调整: "bg-purple-700/15 text-purple-700 border-purple-700/30",
  新阵法: "bg-amber-600/15 text-amber-700 border-amber-600/30",
};

/** 把任意 type 字符串收口成已知变体(防止新数据出现未知 type 时 UI 崩) */
export function resolveTypeVariant(raw: string): PatchTypeVariant {
  if (
    raw === "武将调整" ||
    raw === "战法调整" ||
    raw === "赛季机制" ||
    raw === "阵法调整" ||
    raw === "新阵法"
  ) {
    return raw;
  }
  // 兜底 — 未知 type 用战法调整的中性配色,避免硬错
  return "战法调整";
}

export interface TypeBadgeProps {
  type: string;
}

/** 类型徽章 — 在 Timeline / Section header 复用 */
export function TypeBadge({ type }: TypeBadgeProps) {
  const variant = resolveTypeVariant(type);
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide " +
        VARIANT_CLASS[variant]
      }
    >
      {type}
    </span>
  );
}
