/**
 * F3 配将模拟器 — 阵容状态类型
 *
 * SandboxLineup 是"用户当前配的队"的状态形状。
 * 它刻意做成"扁平 ID 引用"而不是内联对象,这样:
 *   1. 序列化到 localStorage / URL 时更省字节
 *   2. 切换/复制队伍时是纯数据操作,不需要重新查表
 *   3. 与 Lineup schema 的"已落盘阵容"区分开 — 这里只描述"还没起名"的草稿
 *
 * S6 UI 重构后:
 *   - 阵法的归属从顶层 formationSkillId 下沉到 mainSkillIds[0](主将槽 1)
 *   - 增加 qilueSkillId(全队共享的"战法联动 / 奇略",类主动技能)
 *   - 列顺序:main / vice1 / vice2(每个槽位对应 GeneralColumn 中的 1 列)
 */
import type { TroopType } from "@/lib/data/schemas";

/** 队伍中一个武将位的状态(主将或副将) */
export interface SandboxGeneralSlot {
  /** 武将 ID(指向 General.id),null = 该位空着 */
  generalId: string | null;
  /** 该武将的红度(0-5) */
  redLevel: number;
  /** 该武将的特技 ID 列表(0-2 个) */
  traitIds: string[];
}

// ---------------------------------------------------------------------------
// S6 UI 重构 — 列 / 槽位辅助类型
// ---------------------------------------------------------------------------

/** 武将槽位键(主将 / 副将 1 / 副将 2)— UI 索引用 */
export type GeneralColumnKey = "main" | "vice1" | "vice2";

/** 三列的固定顺序(给数组 .map 用,避免在多处硬编码 ["main","vice1","vice2"]) */
export const GENERAL_COLUMNS: readonly GeneralColumnKey[] = [
  "main",
  "vice1",
  "vice2",
] as const;

/** 列的中文标签(主将 / 副将 1 / 副将 2) */
export const GENERAL_COLUMN_LABELS: Record<GeneralColumnKey, string> = {
  main: "主将",
  vice1: "副将 1",
  vice2: "副将 2",
};

/**
 * 单个战法槽位的规则(S6 新规范)
 *  - 主将槽 1:必须是阵法(subType=阵法) — 这是 user 给出的硬性规则
 *  - 主将槽 2/3:任意 subType(主动/被动/指挥/突击,不能是阵法/兵种)
 *  - 副将 1/2 槽 1/2:任意 subType,**不能是阵法/兵种**
 *
 * 注:阵法是战法的一种(v0.5.1 schema),不再作为独立字段;主将槽 1 = 阵法槽。
 */
export type SkillSlotRole =
  | "main-formation" // 主将槽 1 — 必为阵法
  | "main-other" // 主将槽 2/3
  | "vice"; // 副将 1/2 槽 1/2

/** 战法槽位的 ID(用于追踪和 key) */
export interface SkillSlotRef {
  column: GeneralColumnKey;
  /** 槽位索引:主将是 0/1/2,副将是 0/1 */
  index: number;
  role: SkillSlotRole;
}

/** 兵书槽位的 ID(主将 1 大 + 2 小 / 副将 1 大 + 2 小) */
export interface TacticSlotRef {
  column: GeneralColumnKey;
  /** 大 = "major" / 小 = "minor" */
  size: "major" | "minor";
  /** 小兵书可能有 2 个,这是第几个(0/1);大兵书只 1 个,固定 0 */
  index: number;
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
  /**
   * 主将战法 = 3 个槽(主将)
   *   - 槽 0 (mainSkillIds[0])在 S6 新 UI 中语义变为"阵法槽",必须是 subType=阵法
   *   - 槽 1/2:任意 subType(主动/被动/指挥/突击)
   * 注:compatibility.ts 仍兼容旧的顶层 formationSkillId 字段(已 deprecated),
   * 但新 UI 不再单独暴露阵法选择器,而是把阵法作为主将战法槽 0。
   */
  mainSkillIds: [string | null, string | null, string | null];
  /** 副将 1 战法 = 2 槽(任意 subType,但不能是阵法/兵种) */
  vice1SkillIds: [string | null, string | null];
  /** 副将 2 战法 = 2 槽(任意 subType,但不能是阵法/兵种) */
  vice2SkillIds: [string | null, string | null];
  /** 大兵书 = 3 槽(对应主将、副将 1、副将 2)— 每槽最多 1 个 */
  majorTacticIds: [string | null, string | null, string | null];
  /** 小兵书 = 3 槽(对应主将、副将 1、副将 2)— 每槽最多 1 个 */
  minorTacticIds: [string | null, string | null, string | null];
  /**
   * 全队共享"战法联动 / 奇略"(S6 新增)
   * 类主动技能,1 个,作用于全队。可空。
   *
   * 兼容说明:此字段是新增的,旧 localStorage 数据 loadFromStorage 后
   * 在 loadAndMigrate 中会被补上默认值 null;序列化时正常写入,旧版本
   * 读到缺失字段会忽略。
   */
  qilueSkillId: string | null;
  /**
   * 阵法战法 ID(S6 deprecated)
   * 新 UI 中阵法 = mainSkillIds[0],此字段保留仅用于向后兼容老 localStorage
   * 和兼容性提示(compatibility.ts 仍在读)。
   */
  formationSkillId: string | null;
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
    qilueSkillId: null,
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

// ---------------------------------------------------------------------------
// S6 兼容:旧 localStorage 数据 loadAndMigrate
// ---------------------------------------------------------------------------

/**
 * 把 loadFromStorage() 读出来的"老 lineup"补齐 S6 新增字段。
 * - qilueSkillId 缺失 → null
 * - formationSkillId 已有 → 保留(deprecated,但 compatibility.ts 仍在用)
 * - 主将槽 0(原 formationSkillId 投影):如果 formationSkillId 有值且
 *   mainSkillIds[0] 为空,把 formationSkillId 复制到 mainSkillIds[0],
 *   这样新 UI 的"主将槽 1 = 阵法"规则能直接读出该阵法(渐进迁移)
 *
 * 注:此处只"读时迁移",不写回 localStorage(由 saveToStorage 自然完成
 * 后续写回)。loadFromStorage 不变,所以 serialization.ts 文件保持不动。
 */
export function migrateLineup(raw: unknown): SandboxLineup | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SandboxLineup> & {
    mainSkillIds?: unknown;
  };
  // 必须有 id/name(序列化层的最简校验)
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;

  // 主将 / 副将 / 兵书 / 战法的基本兜底
  const slot = (s: unknown): SandboxGeneralSlot => ({
    generalId:
      s && typeof s === "object" && "generalId" in (s as object)
        ? ((s as SandboxGeneralSlot).generalId ?? null)
        : null,
    redLevel:
      s && typeof s === "object" && "redLevel" in (s as object)
        ? ((s as SandboxGeneralSlot).redLevel ?? 0)
        : 0,
    traitIds: Array.isArray(
      s && typeof s === "object" && "traitIds" in (s as object)
        ? (s as SandboxGeneralSlot).traitIds
        : undefined,
    )
      ? ((s as SandboxGeneralSlot).traitIds as string[])
      : [],
  });

  const triple = (a: unknown): [string | null, string | null, string | null] => {
    if (!Array.isArray(a) || a.length !== 3) return [null, null, null];
    return [
      typeof a[0] === "string" ? a[0] : null,
      typeof a[1] === "string" ? a[1] : null,
      typeof a[2] === "string" ? a[2] : null,
    ];
  };

  const pair = (a: unknown): [string | null, string | null] => {
    if (!Array.isArray(a) || a.length !== 2) return [null, null];
    return [
      typeof a[0] === "string" ? a[0] : null,
      typeof a[1] === "string" ? a[1] : null,
    ];
  };

  const mainSkills = triple(r.mainSkillIds);
  const formation =
    typeof r.formationSkillId === "string" ? r.formationSkillId : null;

  // 渐进迁移:旧 formationSkillId 有值 → 同步到 mainSkillIds[0]
  // 如果 mainSkillIds[0] 已经是阵法,保留原值;否则用 formationSkillId 覆盖
  if (formation && mainSkills[0] === null) {
    mainSkills[0] = formation;
  }

  return {
    id: r.id,
    name: r.name,
    main: slot(r.main),
    vice1: slot(r.vice1),
    vice2: slot(r.vice2),
    troop:
      typeof r.troop === "string"
        ? (r.troop as SandboxLineup["troop"])
        : null,
    formationSkillId: formation,
    mainSkillIds: mainSkills,
    vice1SkillIds: pair(r.vice1SkillIds),
    vice2SkillIds: pair(r.vice2SkillIds),
    majorTacticIds: triple(r.majorTacticIds),
    minorTacticIds: triple(r.minorTacticIds),
    qilueSkillId:
      typeof r.qilueSkillId === "string" ? r.qilueSkillId : null,
  };
}
