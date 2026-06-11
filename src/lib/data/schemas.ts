/**
 * Zod schemas for 三战配将 data entities.
 *
 * PRD v0.5.2 §8 数据模型 — 8 entities:
 *  - 8.1 General   武将
 *  - 8.2 Skill     战法
 *  - 8.3 Tactics   兵书
 *  - 8.4 Lineup    阵容
 *  - 8.5 Trait     特技 / 特性
 *  - 8.6 Item      装备 / 物品
 *  - 8.7 Patch     版本特性
 *  - 8.8 SimConfig 模拟交战配置
 *
 * 这里只定义数据形状,不做任何业务逻辑。
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

/** 阵营(魏/蜀/吴/群) */
export const CampSchema = z.enum(['魏', '蜀', '吴', '群']);
export type Camp = z.infer<typeof CampSchema>;

/** 品质(橙/紫/蓝) */
export const QualitySchema = z.enum(['橙', '紫', '蓝']);
export type Quality = z.infer<typeof QualitySchema>;

/** 兵种适性(S/A/B/C) */
export const AptitudeSchema = z.enum(['S', 'A', 'B', 'C']);
export type Aptitude = z.infer<typeof AptitudeSchema>;

/** 战法 6 类 subType — 阵法是战法的一种(v0.5.1 明确) */
export const SkillSubTypeSchema = z.enum(['主动', '被动', '指挥', '突击', '阵法', '兵种']);
export type SkillSubType = z.infer<typeof SkillSubTypeSchema>;

/** 战法来源类型 */
export const SkillSourceTypeSchema = z.enum(['自带', '传承', '拆解', '通用']);
export type SkillSourceType = z.infer<typeof SkillSourceTypeSchema>;

/** 兵书槽位:大兵书 / 小兵书 */
export const TacticsSlotSchema = z.enum(['major', 'minor']);
export type TacticsSlot = z.infer<typeof TacticsSlotSchema>;

/** 阵容强度评级 */
export const LineupTierSchema = z.enum(['T0', 'T1', 'T2', 'T3']);
export type LineupTier = z.infer<typeof LineupTierSchema>;

/** 兵种类型(用于阵容 troop 字段) */
export const TroopTypeSchema = z.enum(['cavalry', 'shield', 'archer', 'spear', 'siege']);
export type TroopType = z.infer<typeof TroopTypeSchema>;

/** 特技分类 */
export const TraitCategorySchema = z.enum(['攻击', '防御', '谋略', '速度', '特殊']);
export type TraitCategory = z.infer<typeof TraitCategorySchema>;

/** 装备部位 */
export const ItemSlotSchema = z.enum(['头', '甲', '马', '盾', '武器']);
export type ItemSlot = z.infer<typeof ItemSlotSchema>;

// ---------------------------------------------------------------------------
// 8.1 General — 武将
// ---------------------------------------------------------------------------

/** 武将四维属性(武力/智力/统率/速度) */
export const GeneralStatsSchema = z.object({
  武力: z.number().int().min(0).max(300),
  智力: z.number().int().min(0).max(300),
  统率: z.number().int().min(0).max(300),
  速度: z.number().int().min(0).max(300),
});
export type GeneralStats = z.infer<typeof GeneralStatsSchema>;

export const GeneralSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  camp: CampSchema,
  quality: QualitySchema,

  /** 四维属性 */
  stats: GeneralStatsSchema,

  /** 兵种适性(骑/盾/弓/枪/器) */
  cavalry: AptitudeSchema, // 骑
  shield: AptitudeSchema, // 盾
  archer: AptitudeSchema, // 弓
  spear: AptitudeSchema, // 枪
  siege: AptitudeSchema, // 器

  /** 自带战法的类型(主动/被动/...) */
  trait: SkillSubTypeSchema,

  /** 自带战法 ID(指向 Skill.id) */
  selfSkillId: z.string().min(1),

  /** 传承战法 ID(可空:有些武将没有传承战法) */
  inheritSkillId: z.string().nullable(),

  /** v0.5 红度/进阶数:0 = 白板,1-5 = 一红到满红 */
  redLevel: z.number().int().min(0).max(5),

  /** v0.5.1 可学的阵法战法 ID 列表(引用 Skill 中 subType = 阵法) */
  learnableFormationSkillIds: z.array(z.string().min(1)),

  /** v0.5 可选兵书(大/小) */
  tacticsOptions: z.object({
    major: z.array(z.string().min(1)),
    minor: z.array(z.string().min(1)),
  }),

  /** v0.5.1 可装备的特性(特技)数量上限,通常是 0-2 */
  equippableTraitCount: z.number().int().min(0).max(3),

  /** 是否 SP 武将(可选字段) */
  isSP: z.boolean().optional(),
});
export type General = z.infer<typeof GeneralSchema>;

// ---------------------------------------------------------------------------
// 8.2 Skill — 战法(含阵法/兵种 6 类)
// ---------------------------------------------------------------------------

export const SkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  /** v0.5.1 战法 6 类之一 */
  subType: SkillSubTypeSchema,

  quality: QualitySchema,
  description: z.string(),

  /** 来源描述,例如"诸葛亮自带""张角传承""通用" */
  source: z.string(),
  sourceType: SkillSourceTypeSchema,

  /** 哪些武将能学(指向 General.id) */
  carrierIds: z.array(z.string().min(1)),

  /** 发动概率(主动/突击类;被动/指挥/阵法/兵种通常 1.0 或 null) */
  triggerRate: z.number().min(0).max(1).nullable(),

  /** v0.5 是否多目标(影响多穿评分) */
  multiTarget: z.boolean(),

  /** v0.5 战法首次可能发动的回合(影响节奏评分) */
  startRound: z.number().int().min(1).max(8),
});
export type Skill = z.infer<typeof SkillSchema>;

// ---------------------------------------------------------------------------
// 8.3 Tactics — 兵书(非战法的可装备系统)
// ---------------------------------------------------------------------------

export const TacticsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  /** 大兵书(major)/ 小兵书(minor) */
  slot: TacticsSlotSchema,

  /** 分类描述,例如"输出"/"防御"/"辅助" */
  category: z.string(),

  /** 效果描述 */
  effect: z.string(),

  /** 作用对象,例如"主将"/"全队"/"副将" */
  appliesTo: z.string(),
});
export type Tactics = z.infer<typeof TacticsSchema>;

// ---------------------------------------------------------------------------
// 8.4 Lineup — 阵容
// ---------------------------------------------------------------------------

/** 6 维评分(v0.5 新增,MVP 阶段手填,M2 改 F7 自动算) */
export const LineupRatingsSchema = z.object({
  output: z.number().min(0).max(100),
  recover: z.number().min(0).max(100),
  multihit: z.number().min(0).max(100),
  rhythm: z.number().min(0).max(100),
  coverage: z.number().min(0).max(100),
  stability: z.number().min(0).max(100),
  total: z.number().min(0).max(100),
});
export type LineupRatings = z.infer<typeof LineupRatingsSchema>;

export const LineupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  /** 玩家圈强度评级 */
  tier: LineupTierSchema,

  /** 标签,例如["打架","PVP","开荒"] */
  tags: z.array(z.string()),

  /** 3 个武将 ID */
  generalIds: z.array(z.string().min(1)).length(3),

  /** v0.5 每个武将的红度(武将 ID -> 0-5) */
  generalRedLevels: z.record(z.string(), z.number().int().min(0).max(5)),

  /** v0.5.1 阵法战法 ID(指向 Skill 中 subType = 阵法) */
  formationSkillId: z.string().nullable(),

  /** 兵种 */
  troop: TroopTypeSchema,

  /** 战法分配 */
  skills: z.object({
    /** 主将战法 = 1 主 + 2 副 */
    main: z.record(z.string(), z.tuple([z.string(), z.string(), z.string()])),
    /** 副将战法 = 每人 2 个 */
    vice: z.record(z.string(), z.tuple([z.string(), z.string()])),
  }),

  /** v0.5 兵书(3 大 + 3 小,按武将顺序对应 generalIds) */
  tactics: z.object({
    major: z.tuple([z.string(), z.string(), z.string()]),
    minor: z.tuple([z.string(), z.string(), z.string()]),
  }),

  /** v0.5.1 装备的特性 ID(原 specials 改名) */
  equippedTraitIds: z.array(z.string().min(1)),

  description: z.string(),

  /** 克制的阵容名 */
  counters: z.array(z.string()),
  /** 被什么阵容克制 */
  counteredBy: z.array(z.string()),

  /** 6 维评分 */
  ratings: LineupRatingsSchema,

  /** 按综合分推算的等级(冗余字段,方便排序时直接读) */
  tierByScore: LineupTierSchema,
});
export type Lineup = z.infer<typeof LineupSchema>;

// ---------------------------------------------------------------------------
// 8.5 Trait — 特技 / 特性(装备附带的特性)
// ---------------------------------------------------------------------------

export const TraitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  /** 专属武将 ID(可空:通用特性谁都能带) */
  ownerGeneralId: z.string().nullable(),

  /** 触发条件描述,例如"施放天雷时""战斗开始前 3 回合" */
  triggerCondition: z.string(),

  /** 效果描述,例如"天雷伤害 +20%,且必定暴击" */
  effect: z.string(),

  /** 来源,例如"张角专属装备附带""通用掉率" */
  source: z.string(),

  /** 特性分类 */
  category: TraitCategorySchema,
});
export type Trait = z.infer<typeof TraitSchema>;

// ---------------------------------------------------------------------------
// 8.6 Item — 装备 / 物品(MVP 弱化,保留 schema)
// ---------------------------------------------------------------------------

/** 装备附带的特性条目(指向 Trait.id) */
export const ItemTraitEntrySchema = z.object({
  traitId: z.string().min(1),
  value: z.number().optional(),
});
export type ItemTraitEntry = z.infer<typeof ItemTraitEntrySchema>;

export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),

  /** MVP 阶段固定为 "装备" */
  category: z.literal('装备'),

  quality: QualitySchema,
  slot: ItemSlotSchema,

  /** 基础属性加成,例如 { 统率: 15, 智力: 10 } */
  baseStats: z.record(z.string(), z.number()),

  /** 附带的特性(每件装备 0-3 条) */
  traits: z.array(ItemTraitEntrySchema),

  /** 来源,例如"锻造 / 副本掉率" */
  source: z.string(),

  /** 可佩戴此装备的武将 ID 列表(空数组 = 无限制) */
  compatibleGeneralIds: z.array(z.string()),
});
export type Item = z.infer<typeof ItemSchema>;

// ---------------------------------------------------------------------------
// 8.7 Patch — 版本特性
// ---------------------------------------------------------------------------

export const PatchSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),

  /** ISO 日期,例如 "2026-05-10" */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),

  /** 调整类型,例如"武将调整""赛季机制""新机制" */
  type: z.string(),

  /** 摘要 */
  summary: z.string(),

  /** 详细说明(可空:摘要已经够用时不必写) */
  details: z.string(),

  /** 受影响的实体 ID 列表(武将/战法 ID) */
  affectedIds: z.array(z.string()),
});
export type Patch = z.infer<typeof PatchSchema>;

// ---------------------------------------------------------------------------
// 8.8 SimConfig — 模拟交战配置(单对象,不是数组)
// ---------------------------------------------------------------------------

export const SimConfigSchema = z.object({
  /** 蒙特卡洛迭代次数 */
  iterations: z.number().int().positive(),

  /** 各 subType 战法的默认发动概率 */
  triggerRate: z.object({
    主动: z.number().min(0).max(1),
    被动: z.number().min(0).max(1),
    突击: z.number().min(0).max(1),
    指挥: z.number().min(0).max(1),
  }),

  /** 兵种克制系数表(键形如 "骑-盾" / "盾-骑" / "same") */
  troopCounter: z.record(z.string(), z.number().positive()),

  /** 同阵营 3 人加成 */
  campBonus: z.number().positive(),
});
export type SimConfig = z.infer<typeof SimConfigSchema>;

// ---------------------------------------------------------------------------
// Array schemas(用于加载 .json 时整体校验)
// ---------------------------------------------------------------------------

export const GeneralsFileSchema = z.array(GeneralSchema);
export const SkillsFileSchema = z.array(SkillSchema);
export const TacticsFileSchema = z.array(TacticsSchema);
export const LineupsFileSchema = z.array(LineupSchema);
export const TraitsFileSchema = z.array(TraitSchema);
export const ItemsFileSchema = z.array(ItemSchema);
export const PatchesFileSchema = z.array(PatchSchema);
