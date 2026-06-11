import type { TraitCategory } from "@/lib/data/schemas";

/**
 * 特技 category 徽章配色。
 *
 * 配色约定(任务约定):
 *  - 攻击 = 朱砂红(沿用 accent-red)
 *  - 防御 = 翠绿(沿用 accent-green)
 *  - 谋略 = 黄(amber)
 *  - 速度 = 蓝(blue)
 *  - 特殊 = 紫(purple)
 */
const CATEGORY_STYLES: Record<TraitCategory, string> = {
  攻击: "bg-accent-red/15 text-accent-red border-accent-red/30",
  防御: "bg-accent-green/15 text-accent-green border-accent-green/30",
  谋略: "bg-amber-100 text-amber-800 border-amber-400",
  速度: "bg-blue-100 text-blue-700 border-blue-300",
  特殊: "bg-purple-100 text-purple-700 border-purple-300",
};

/** 短描述(用于 tooltip / 详情页) */
const CATEGORY_DESC: Record<TraitCategory, string> = {
  攻击: "提供伤害加成 / 暴击 / 穿透等输出向属性",
  防御: "提供减伤 / 抗性 / 护盾等生存向属性",
  谋略: "提供谋略伤害 / 策略发动率等智力向属性",
  速度: "提供先手 / 速度加成 / 追击触发等节奏向属性",
  特殊: "其他特殊机制(战术、控制、变身等)",
};

export function CategoryBadge({
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

/** 用于卡片左色条 */
export function categoryAccentClass(category: TraitCategory): string {
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

/** 通用 vs 专属 徽章 */
export function OwnershipBadge({
  isUnique,
  size = "sm",
}: {
  isUnique: boolean;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "md"
      ? "text-xs px-2 py-0.5"
      : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded border font-medium ${sizeCls} ${
        isUnique
          ? "bg-purple-100 text-purple-700 border-purple-300"
          : "bg-stone-100 text-stone-600 border-stone-300"
      }`}
    >
      {isUnique ? "专属" : "通用"}
    </span>
  );
}
