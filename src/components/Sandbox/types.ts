/**
 * F3 配将模拟器 — 阵容状态类型
 *
 * SandboxLineup 是"用户当前配的队"的状态形状。
 * 它刻意做成"扁平 ID 引用"而不是内联对象,这样:
 *   1. 序列化到 localStorage / URL 时更省字节
 *   2. 切换/复制队伍时是纯数据操作,不需要重新查表
 *   3. 与 Lineup schema 的"已落盘阵容"区分开 — 这里只描述"还没起名"的草稿
 */
import type { TroopType } from "@/lib/data/schemas";

/** 队伍中一个武将位的状态(主将或副将) */
export interface SandboxGeneralSlot {
  /** 武将 ID(指向 General.id),null = 该位空着 */
  generalId: string | null;
  /** 该武将的红度(0-5) */
  redLevel: number;
  /** 该武将装备的 2 个战法 ID(主将 3 个但后两个由"主+副"分配,见下) */
  // 注:战法分配采用 Lineup schema 的语义 — main = 整个队伍的主将战法(1 主 + 2 副),
  // vice = 每个副将各自的 2 个战法。这样对 UI "主战法区 / 副战法区"映射最直接。
  /** 该武将的特技 ID 列表(0-2 个) */
  traitIds: string[];
}

/** 队伍状态(完整草稿) */
export interface SandboxLineup {
  /** 草稿 ID(本地唯一,用于多队伍切换) */
  id: string;
  /** 草稿名(默认"队伍 1") */
  name: string;
  /** 主将(武将 0 号位) */
  main: SandboxGeneralSlot;
  /** 副将 1(武将 1 号位) */
  vice1: SandboxGeneralSlot;
  /** 副将 2(武将 2 号位) */
  vice2: SandboxGeneralSlot;
  /** 兵种 TroopType(可选) */
  troop: TroopType | null;
  /** 阵法战法 ID(指向 Skill.subType=阵法 的 ID;可选) */
  formationSkillId: string | null;
  /** 主将战法 = 1 主 + 2 副(主将 + 副将 1 + 副将 2 共 3 个槽) */
  mainSkillIds: [string | null, string | null, string | null];
  /** 副将 1 战法 = 2 槽 */
  vice1SkillIds: [string | null, string | null];
  /** 副将 2 战法 = 2 槽 */
  vice2SkillIds: [string | null, string | null];
  /** 大兵书 = 3 槽(对应主将、副将 1、副将 2) */
  majorTacticIds: [string | null, string | null, string | null];
  /** 小兵书 = 3 槽(对应主将、副将 1、副将 2) */
  minorTacticIds: [string | null, string | null, string | null];
}

/** 多队伍持久化的容器 */
export interface SandboxLineupSet {
  /** 全部草稿 */
  lineups: SandboxLineup[];
  /** 当前激活的 lineup id */
  activeId: string;
}

/** 默认空槽 */
export function emptySlot(): SandboxGeneralSlot {
  return { generalId: null, redLevel: 0, traitIds: [] };
}

/** 默认空队伍(用于"新建"按钮) */
export function emptyLineup(name: string = "新队伍"): SandboxLineup {
  return {
    id: makeLineupId(),
    name,
    main: emptySlot(),
    vice1: emptySlot(),
    vice2: emptySlot(),
    troop: null,
    formationSkillId: null,
    mainSkillIds: [null, null, null],
    vice1SkillIds: [null, null],
    vice2SkillIds: [null, null],
    majorTacticIds: [null, null, null],
    minorTacticIds: [null, null, null],
  };
}

/** 生成一个短 id(足够本地唯一即可,不需要加密强度) */
export function makeLineupId(): string {
  return `l_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** 默认初始队伍(空 + 队伍名"队伍 1") */
export function defaultLineupSet(): SandboxLineupSet {
  const l = emptyLineup("队伍 1");
  return { lineups: [l], activeId: l.id };
}
