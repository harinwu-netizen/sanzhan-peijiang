/**
 * F3 配将模拟器 — 兼容性 & 加成计算
 *
 * 输出两类东西:
 *   1. computeBonuses(...) — 阵营加成 / 兵种加成(给 UI 实时显示)
 *   2. computeWarnings(...) — 兼容性提示(给 UI 警告区)
 *
 * 都是纯函数,不依赖 React,便于以后 vitest 覆盖。
 */
import type { General, Skill, TroopType, Aptitude } from "@/lib/data/schemas";
import { TROOP_TYPES, type TroopKey } from "@/components/Generals/constants";
import type { SandboxLineup } from "./types";

const APTITUDE_RANK: Record<Aptitude, number> = { S: 4, A: 3, B: 2, C: 1 };

/** 一个军师(troopKey) → 中文标签 的工具 */
function troopLabel(key: TroopKey): string {
  return TROOP_TYPES.find((t) => t.key === key)?.label ?? key;
}

/** 队伍里所有非空武将 */
function lineupGenerals(lineup: SandboxLineup, generals: General[]): General[] {
  const map = new Map(generals.map((g) => [g.id, g]));
  const ids = [lineup.main, lineup.vice1, lineup.vice2]
    .map((s) => s.generalId)
    .filter((id): id is string => id !== null);
  return ids.map((id) => map.get(id)!).filter(Boolean);
}

// ---------------------------------------------------------------------------
// 加成计算
// ---------------------------------------------------------------------------

export interface CampBonus {
  /** 阵营名(如 "蜀"),null = 没有同阵营 */
  camp: string | null;
  /** 几 S 满级,3 表示 3 人同阵营 */
  count: number;
  /** 描述 */
  text: string;
}

export interface TroopBonus {
  /** 兵种键名(cavalry/shield/...),null = 队伍没选兵种 */
  troopKey: TroopKey | null;
  /** 3 人适性等级(S/A/B/C),长度 3 */
  grades: Aptitude[];
  /** 描述 */
  text: string;
}

export function computeCampBonus(
  lineup: SandboxLineup,
  generals: General[],
): CampBonus {
  const gs = lineupGenerals(lineup, generals);
  if (gs.length < 3) {
    return { camp: null, count: gs.length, text: "未满 3 人,无加成" };
  }
  const camps = new Set(gs.map((g) => g.camp));
  if (camps.size === 1) {
    const c = gs[0].camp;
    return { camp: c, count: 3, text: `${c} 3S (+10% 属加成)` };
  }
  // 2 同 1 异也算部分加成(2v1)
  const arr = gs.map((g) => g.camp);
  if (arr[0] === arr[1] && arr[0] !== arr[2]) {
    return { camp: arr[0], count: 2, text: `${arr[0]} 2+1 (部分加成)` };
  }
  if (arr[1] === arr[2] && arr[1] !== arr[0]) {
    return { camp: arr[1], count: 2, text: `${arr[1]} 1+2 (部分加成)` };
  }
  if (arr[0] === arr[2] && arr[0] !== arr[1]) {
    return { camp: arr[0], count: 2, text: `${arr[0]} 2+1 (部分加成)` };
  }
  return { camp: null, count: 0, text: "无加成" };
}

export function computeTroopBonus(
  lineup: SandboxLineup,
  generals: General[],
  troopTypes: Skill[],
): TroopBonus {
  if (!lineup.troop) {
    return { troopKey: null, grades: [], text: "未选兵种" };
  }
  // 把 lineup.troop(cavalry/...) 反查成 Skill 中 subType=兵种 的 ID
  // 我们的数据里兵种战法 ID 形如 xi_liang_tie_qi,这里用 troop 字段对应一个 key
  // PRD 中 troop 是单选,先简单按"选了兵种类型 → 所有武将该适性等级"
  // 这里 troop 是 schema 中的 TroopType("cavalry"/"shield"/...)直接对应 General 字段
  const troopKey = lineup.troop as TroopKey;
  const gs = lineupGenerals(lineup, generals);
  if (gs.length === 0) {
    return { troopKey, grades: [], text: "无武将" };
  }
  const grades = gs.map((g) => g[troopKey]);
  const sCount = grades.filter((g) => g === "S").length;
  if (sCount === 3) {
    return { troopKey, grades, text: `${troopLabel(troopKey)} 3S` };
  }
  if (sCount === 2) {
    return { troopKey, grades, text: `${troopLabel(troopKey)} 2S+1` };
  }
  return { troopKey, grades, text: `${troopLabel(troopKey)} ${sCount}S` };
}

// ---------------------------------------------------------------------------
// 兼容性 / 冲突警告
// ---------------------------------------------------------------------------

export type WarningLevel = "error" | "warn" | "info";

export interface CompatWarning {
  level: WarningLevel;
  text: string;
}

/**
 * 收集当前 lineup 的所有兼容性提示。
 * @param lineup 当前队伍
 * @param generals 全武将表
 * @param skills 全战法表
 */
export function computeWarnings(
  lineup: SandboxLineup,
  generals: General[],
  skills: Skill[],
): CompatWarning[] {
  const out: CompatWarning[] = [];
  const generalMap = new Map(generals.map((g) => [g.id, g]));
  const skillMap = new Map(skills.map((s) => [s.id, s]));

  // 1. 兵种适性 < A 的武将(对所选兵种)
  if (lineup.troop) {
    const troopKey = lineup.troop as TroopKey;
    const slots = [lineup.main, lineup.vice1, lineup.vice2];
    const slotLabels = ["主将", "副将1", "副将2"];
    slots.forEach((slot, idx) => {
      if (!slot.generalId) return;
      const g = generalMap.get(slot.generalId);
      if (!g) return;
      const apt = g[troopKey];
      if (APTITUDE_RANK[apt] < APTITUDE_RANK.A) {
        out.push({
          level: "warn",
          text: `${g.name}(${slotLabels[idx]}) 兵种适性 ${apt},低于 A,会显著削弱兵种效果`,
        });
      }
    });
  }

  // 2. 同队武将携带同一战法(收集所有战法 ID,看重复)
  const allSkillIds: string[] = [
    ...lineup.mainSkillIds,
    ...lineup.vice1SkillIds,
    ...lineup.vice2SkillIds,
  ].filter((id): id is string => id !== null);
  const counts = new Map<string, number>();
  for (const id of allSkillIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    if (n > 1) {
      const s = skillMap.get(id);
      out.push({
        level: "error",
        text: `战法 "${s?.name ?? id}" 已被同队武将携带 ${n} 次,系统会强制去重`,
      });
    }
  }

  // 3. 阵法与主将 — 主将必须能学该阵法
  if (lineup.formationSkillId && lineup.main.generalId) {
    const main = generalMap.get(lineup.main.generalId);
    const formation = skillMap.get(lineup.formationSkillId);
    if (main && formation) {
      if (!main.learnableFormationSkillIds.includes(lineup.formationSkillId)) {
        out.push({
          level: "error",
          text: `主将 ${main.name} 没学阵法 "${formation.name}",请换主将或换阵法`,
        });
      }
    }
  }

  // 4. 兵书超过 3 个:仅统计非空 — 不会超长,这里只提示未选满
  // (省略 — 任务说"0-2 个/武将"对应特技,兵书是 3+3 固定)

  return out;
}
