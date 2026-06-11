"use client";

/**
 * F3 配将模拟器 — 兵种下拉
 *
 * 兵种是 5 个固定枚举(cavalry/shield/archer/spear/siege),
 * 数据上"兵种战法"指向 Skill.subType=兵种,但本任务只关心"选哪种兵种",
 * 不需要选具体战法(简化 MVP)。
 *
 * 与 SkillSelect 不同:这里只暴露 5 个固定选项,提供一个空 placeholder。
 */
import type { TroopType } from "@/lib/data/schemas";
import { TROOP_TYPES, type TroopKey } from "@/components/Generals/constants";

const TROOP_LABEL: Record<TroopType, string> = {
  cavalry: "骑",
  shield: "盾",
  archer: "弓",
  spear: "枪",
  siege: "器",
};

export const ALL_TROOPS: TroopType[] = TROOP_TYPES.map(
  (t) => t.key,
) as TroopType[];

export function TroopSelect({
  value,
  onChange,
  className,
}: {
  value: TroopType | null;
  onChange: (t: TroopType | null) => void;
  className?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) =>
        onChange(
          e.target.value === "" ? null : (e.target.value as TroopType),
        )
      }
      className={
        // 16px 防止 iOS 自动放大,min-h-[2.75rem] 满足 44x44 触摸目标
        "w-full min-h-[2.75rem] rounded-md border border-line bg-card px-2 py-1.5 text-base text-ink outline-none focus:border-primary sm:text-sm " +
        (className ?? "")
      }
    >
      <option value="">未选</option>
      {ALL_TROOPS.map((t) => (
        <option key={t} value={t}>
          {TROOP_LABEL[t as TroopKey]} ({t})
        </option>
      ))}
    </select>
  );
}
