import type { Quality, SkillSubType } from "@/lib/data/schemas";

/**
 * 战法 subType 徽章配色。
 *
 * 配色是 F2 的核心 UX — 让玩家一眼看出「主动 vs 被动 vs 阵法」区别。
 * 主动 = 朱砂红(最有攻击性);被动 = 翠绿(辅助向);阵法 = 紫(战略感);
 * 兵种 = 黄(战场金色);指挥 = 蓝;突击 = 橙(区分于阵法紫)。
 *
 * 颜色名沿用 globals.css 的语义色 / Tailwind utility。
 * 这里返回的 className **必须** 出现在 globals.css 的 safelist 中
 * (Tailwind v4 默认对动态拼接的 className 也能识别,只要出现完整字面量)。
 */

const SUBTYPE_STYLES: Record<SkillSubType, string> = {
  主动: "bg-accent-red/15 text-accent-red border-accent-red/30",
  被动: "bg-accent-green/15 text-accent-green border-accent-green/30",
  指挥: "bg-blue-100 text-blue-700 border-blue-300",
  突击: "bg-orange-100 text-orange-700 border-orange-300",
  阵法: "bg-purple-100 text-purple-700 border-purple-300",
  兵种: "bg-amber-100 text-amber-800 border-amber-400",
};

/** subType 短描述(用于详情页 / 列表卡 tooltip) */
const SUBTYPE_DESC: Record<SkillSubType, string> = {
  主动: "战斗中按概率发动,造成伤害或施加控制",
  被动: "战斗中被动生效,提供属性或增益",
  指挥: "战斗开始前/开始时生效,持续整场",
  突击: "普通攻击后追击发动",
  阵法: "改变我方站位/分担体系,持续整场",
  兵种: "限定某兵种生效,持续整场",
};

export function SubTypeBadge({
  subType,
  size = "md",
}: {
  subType: SkillSubType;
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
      title={SUBTYPE_DESC[subType]}
      className={`inline-flex items-center rounded border font-medium ${sizeCls} ${SUBTYPE_STYLES[subType]}`}
    >
      {subType}
    </span>
  );
}

/** subType 配色(供卡片边框 / 顶部色条使用) */
export function subTypeAccentClass(subType: SkillSubType): string {
  switch (subType) {
    case "主动":
      return "border-l-accent-red";
    case "被动":
      return "border-l-accent-green";
    case "指挥":
      return "border-l-blue-500";
    case "突击":
      return "border-l-orange-500";
    case "阵法":
      return "border-l-purple-500";
    case "兵种":
      return "border-l-amber-500";
  }
}

// ---------------------------------------------------------------------------
// Quality (品质) 徽章
// ---------------------------------------------------------------------------

const QUALITY_STYLES: Record<Quality, string> = {
  橙: "bg-orange-100 text-orange-800 border-orange-300",
  紫: "bg-purple-100 text-purple-800 border-purple-300",
  蓝: "bg-blue-100 text-blue-800 border-blue-300",
};

const QUALITY_LABEL: Record<Quality, string> = {
  橙: "橙·S",
  紫: "紫·A",
  蓝: "蓝·B",
};

export function QualityBadge({
  quality,
  size = "md",
}: {
  quality: Quality;
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
      className={`inline-flex items-center rounded border font-medium ${sizeCls} ${QUALITY_STYLES[quality]}`}
    >
      {QUALITY_LABEL[quality]}
    </span>
  );
}
