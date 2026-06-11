import type { TraitCategory } from "@/lib/data/schemas";

/**
 * 特技 category 徽章配色。
 *
 * 与 F2 战法 subType 徽章思路一致:用颜色把"特性属于哪一类"传达出来,
 * 让玩家在列表里一眼区分攻击 / 防御 / 谋略 / 速度 / 特殊 五类。
 *
 * 配色与 task 要求严格对应:
 *   攻击 = 朱砂红
 *   防御 = 翠绿
 *   谋略 = 琥珀黄
 *   速度 = 蓝
 *   特殊 = 紫
 *
 * Tailwind v4 对完整字面量 className 有原生 safelist,只要常量字符串
 * 出现在源码里,build 后就不会被 purge 掉。
 */

const CATEGORY_STYLES: Record<TraitCategory, string> = {
  攻击: "bg-accent-red/15 text-accent-red border-accent-red/30",
  防御: "bg-accent-green/15 text-accent-green border-accent-green/30",
  谋略: "bg-amber-100 text-amber-800 border-amber-400",
  速度: "bg-blue-100 text-blue-700 border-blue-300",
  特殊: "bg-purple-100 text-purple-700 border-purple-300",
};

/** category 短描述(用于 tooltip / 详情页) */
const CATEGORY_DESC: Record<TraitCategory, string> = {
  攻击: "提升输出、暴击、伤害加成等攻击属性",
  防御: "降低受击、减伤、护盾等防御属性",
  谋略: "提升策略伤害、谋略加成等智力向属性",
  速度: "影响出手顺序、连击、追击等节奏型属性",
  特殊: "机制特殊、无法归入前 4 类的特性",
};

export function TraitCategoryBadge({
  category,
  size = "md",
}: {
  category: TraitCategory;
  size?: "sm" | "md" | "lg";
}) {
  const sizeCls =
    size === "sm"
      ? "text-[10px] px-1.5 py-0.5"
      : size === "lg"
        ? "text-sm px-3 py-1"
        : "text-xs px-2 py-0.5";
  return (
    <span
      title={CATEGORY_DESC[category]}
      className={`inline-flex items-center rounded border font-medium ${sizeCls} ${CATEGORY_STYLES[category]}`}
    >
      {category}
    </span>
  );
}

/** category 配色(供卡片左侧色条 / 顶部色条使用) */
export function traitCategoryAccentClass(category: TraitCategory): string {
  switch (category) {
    case "攻击":
      return "border-l-accent-red";
    case "防御":
      return "border-l-accent-green";
    case "谋略":
      return "border-l-amber-500";
    case "速度":
      return "border-l-blue-500";
    case "特殊":
      return "border-l-purple-500";
  }
}

// ---------------------------------------------------------------------------
// 通用 / 专属 徽章
// ---------------------------------------------------------------------------

const UNIQUE_STYLES = {
  通用: "bg-blue-100 text-blue-700 border-blue-300",
  专属: "bg-accent-red/15 text-accent-red border-accent-red/30",
} as const;

const UNIQUE_DESC = {
  通用: "任何武将都可装备,无武将限制",
  专属: "仅专属武将可装备,其他人无法触发",
} as const;

export function UniqueBadge({
  kind,
  size = "sm",
}: {
  kind: keyof typeof UNIQUE_STYLES;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "sm"
      ? "text-[10px] px-1.5 py-0.5"
      : "text-xs px-2 py-0.5";
  return (
    <span
      title={UNIQUE_DESC[kind]}
      className={`inline-flex items-center rounded border font-medium ${sizeCls} ${UNIQUE_STYLES[kind]}`}
    >
      {kind}
    </span>
  );
}