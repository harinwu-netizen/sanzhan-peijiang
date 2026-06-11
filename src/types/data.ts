/**
 * TypeScript types for 三战配将 data entities.
 *
 * 这些类型全部由 src/lib/data/schemas.ts 中的 Zod schema 推导而来
 * (z.infer<typeof Schema>),**不**在此处手写,以避免双重维护。
 *
 * 引用方式:
 *   import type { General, Skill, Lineup } from '@/types/data';
 *
 * 如果业务代码需要的是 zod 解析后的"已校验"对象,请直接用这里的类型;
 * 如果需要运行时校验,请用 src/lib/data/schemas.ts 中的 Schema.parse。
 */
export type {
  // 共享 enum
  Camp,
  Quality,
  Aptitude,
  SkillSubType,
  SkillSourceType,
  TacticsSlot,
  LineupTier,
  TroopType,
  TraitCategory,
  ItemSlot,
  // 8.1
  GeneralStats,
  General,
  // 8.2
  Skill,
  // 8.3
  Tactics,
  // 8.4
  LineupRatings,
  Lineup,
  // 8.5
  Trait,
  // 8.6
  ItemTraitEntry,
  Item,
  // 8.7
  Patch,
  // 8.8
  SimConfig,
} from '@/lib/data/schemas';
