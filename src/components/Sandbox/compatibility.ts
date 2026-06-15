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

  // ──────────────────────────────────────────────────────────────────
  // S6 UI 重构 — 新增 4 类提示(全是 additive,不修改上面 3 条逻辑)
  // ──────────────────────────────────────────────────────────────────

  // 5. 主将槽 1 必须是阵法(S6 新规范)
  //    读 mainSkillIds[0]:如果是空 → info(没选);如果非阵法 → error
  //    注:同时仍兼容老 formationSkillId(若已设但 mainSkillIds[0] 是空,
  //    migrateLineup 已把它投影到主将槽 0,这里直接读 mainSkillIds[0] 即可)
  if (lineup.main.generalId) {
    const formationInSlot0 = lineup.mainSkillIds[0];
    if (!formationInSlot0) {
      out.push({
        level: "warn",
        text: `主将槽 1 未选阵法(S6 规范:阵法是战法的一种,必须放主将战法槽 1)`,
      });
    } else {
      const s0 = skillMap.get(formationInSlot0);
      if (s0 && s0.subType !== "阵法") {
        out.push({
          level: "error",
          text: `主将槽 1 "${s0.name}" 不是阵法战法(subType=${s0.subType}),请换成阵法战法`,
        });
      }
    }
  }

  // 6. 副将选了阵法 / 兵种 战法(S6 规则:副将槽不能是阵法/兵种)
  const viceSlots: Array<{ arr: typeof lineup.vice1SkillIds; label: string }> = [
    { arr: lineup.vice1SkillIds, label: "副将 1" },
    { arr: lineup.vice2SkillIds, label: "副将 2" },
  ];
  for (const { arr, label } of viceSlots) {
    arr.forEach((sid, i) => {
      if (!sid) return;
      const s = skillMap.get(sid);
      if (!s) return;
      if (s.subType === "阵法" || s.subType === "兵种") {
        out.push({
          level: "error",
          text: `${label} 槽 ${i + 1} "${s.name}" 是${s.subType}战法,副将槽不能选${s.subType}`,
        });
      }
    });
  }

  // 7. 同阵营 3 人加成未触发
  //    复用 computeCampBonus 的同源逻辑:看 3 个武将是否同 camp
  if (lineup.main.generalId && lineup.vice1.generalId && lineup.vice2.generalId) {
    const camps = [
      generalMap.get(lineup.main.generalId)?.camp,
      generalMap.get(lineup.vice1.generalId)?.camp,
      generalMap.get(lineup.vice2.generalId)?.camp,
    ];
    if (camps.every((c) => c && c === camps[0])) {
      // 已触发 — 不需要警告(campBonus 区域会显示)
    } else {
      // 列出当前分布,提示玩家
      const dist: Record<string, number> = {};
      camps.forEach((c) => {
        if (c) dist[c] = (dist[c] ?? 0) + 1;
      });
      const desc = Object.entries(dist)
        .map(([c, n]) => `${c}×${n}`)
        .join(" + ");
      out.push({
        level: "info",
        text: `未触发同阵营 3S 加成(当前分布:${desc});同阵营可享 +10% 属性加成`,
      });
    }
  }

  // 8. 任意武将 learnableFormationSkillIds 不含主将槽 1 选的阵法
  //    (compatibility.ts 原有 check 3 只检查 lineup.formationSkillId,
  //    S6 新增这条检查 mainSkillIds[0] 这个新位置的阵法)
  if (lineup.main.generalId && lineup.mainSkillIds[0]) {
    const main = generalMap.get(lineup.main.generalId);
    const formation = skillMap.get(lineup.mainSkillIds[0]);
    if (main && formation && formation.subType === "阵法") {
      if (!main.learnableFormationSkillIds.includes(lineup.mainSkillIds[0])) {
        out.push({
          level: "error",
          text: `主将 ${main.name} 没学阵法 "${formation.name}",请换主将或换阵法`,
        });
      }
    }
  }

  return out;
}
