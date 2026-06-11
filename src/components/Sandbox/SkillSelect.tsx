"use client";

/**
 * F3 配将模拟器 — 战法 / 阵法 / 兵种 / 兵书 / 特技 下拉
 *
 * 一个轻量的 <select> 包装:
 *  - 顶部 placeholder 行
 *  - 每个 option 显示:名字 + subType 徽章(只对 skill 类型有意义)
 *
 * 不在这里做弹窗 — 战法/兵书选项数量都不大(战法 19 个、兵书 3 个、特技 5 个),
 * 原生 <select> 已经够用且零依赖。
 */
import type {
  Skill,
  Tactics,
  Trait,
  SkillSubType,
  TroopType,
} from "@/lib/data/schemas";
import { SubTypeBadge } from "@/components/Skills/Badges";

export type SelectableKind = "skill" | "tactic" | "trait" | "troop";

export interface SkillSelectProps {
  kind: SelectableKind;
  value: string | null;
  onChange: (id: string | null) => void;
  options:
    | Skill[]
    | Tactics[]
    | Trait[]
    | { value: TroopType; label: string }[];
  /** skill 类型时按 subType 过滤(主动/被动/指挥/突击/阵法/兵种) */
  filterSubType?: SkillSubType;
  /** 占位文字 */
  placeholder: string;
  /** 整行 className */
  className?: string;
  /** 哪些 ID 应该被排除(已被同队武将携带的战法) */
  excludeIds?: string[];
}

export function SkillSelect({
  kind,
  value,
  onChange,
  options,
  filterSubType,
  placeholder,
  className,
  excludeIds = [],
}: SkillSelectProps) {
  // 过滤(只有 skill 类型有 subType 过滤)
  const filtered = (() => {
    if (kind !== "skill" || !filterSubType) return options;
    return (options as Skill[]).filter((s) => s.subType === filterSubType);
  })();

  // 检查 value 是否在 filtered 内(避免传了不存在的 id)
  const validValue =
    value !== null && filtered.some((o) => getId(o) === value)
      ? value
      : null;

  return (
    <select
      value={validValue ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className={
        // 16px 防止 iOS 自动放大,min-h-[2.75rem] 满足 44x44 触摸目标
        "w-full min-h-[2.75rem] rounded-md border border-line bg-card px-2 py-1.5 text-base text-ink outline-none focus:border-primary sm:text-sm " +
        (className ?? "")
      }
    >
      <option value="">{placeholder}</option>
      {filtered.map((o) => {
        const id = getId(o);
        const isExcluded = excludeIds.includes(id) && id !== value;
        return (
          <option key={id} value={id} disabled={isExcluded}>
            {labelOf(o)}
            {isExcluded ? " (已被同队携带)" : ""}
          </option>
        );
      })}
    </select>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function getId(o: unknown): string {
  // Skill / Tactics / Trait 都有 id:string
  // troop 选项的 id 我们用 value
  if (o && typeof o === "object" && "id" in (o as Record<string, unknown>)) {
    return (o as { id: string }).id;
  }
  if (o && typeof o === "object" && "value" in (o as Record<string, unknown>)) {
    return (o as { value: string }).value;
  }
  return "";
}

function labelOf(o: unknown): string {
  if (
    o &&
    typeof o === "object" &&
    "subType" in (o as Record<string, unknown>)
  ) {
    const s = o as Skill;
    return `${s.name} [${s.subType}]`;
  }
  if (
    o &&
    typeof o === "object" &&
    "slot" in (o as Record<string, unknown>)
  ) {
    const t = o as Tactics;
    return `${t.name} [${t.slot === "major" ? "大" : "小"}]`;
  }
  if (
    o &&
    typeof o === "object" &&
    "category" in (o as Record<string, unknown>) &&
    "triggerCondition" in (o as Record<string, unknown>)
  ) {
    const t = o as Trait;
    return `${t.name} [${t.category}]`;
  }
  if (o && typeof o === "object" && "label" in (o as Record<string, unknown>)) {
    return (o as { label: string }).label;
  }
  return "";
}

// 重导出 SubTypeBadge 以便 Sandbox 主组件里其他场景也能用
export { SubTypeBadge };
