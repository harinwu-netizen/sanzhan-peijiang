/**
 * Data loaders for 三战配将.
 *
 * 这些函数从仓库根目录的 data/*.json 加载数据,
 * 并用 src/lib/data/schemas.ts 中的 Zod schema 做运行时校验。
 *
 * 加载结果是经过类型校验的纯数组(或单对象 SimConfig),
 * 可以安全地在 server components / API routes / 脚本里使用。
 *
 * ⚠️ 此模块依赖 `fs`,**不能**在 client component 里直接 import。
 *   在 client 里需要数据时,请通过 server component 拉取再传 props,
 *   或走 /api/* 路由。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { z } from 'zod';
import {
  GeneralsFileSchema,
  SkillsFileSchema,
  TacticsFileSchema,
  LineupsFileSchema,
  TraitsFileSchema,
  ItemsFileSchema,
  PatchesFileSchema,
  SimConfigSchema,
  type General,
  type Skill,
  type Tactics,
  type Lineup,
  type Trait,
  type Item,
  type Patch,
  type SimConfig,
} from './schemas';

// ---------------------------------------------------------------------------
// 路径解析
// ---------------------------------------------------------------------------

/**
 * data/ 目录的绝对路径。
 *
 * - 默认走 process.cwd() + 'data'(Next.js 的 dev/build 都在仓库根跑,够用)
 * - 允许通过环境变量 DATA_DIR 覆盖(单测 / 脚本里很有用)
 * - 解析为绝对路径,避免 cwd 变化时找不到
 */
function resolveDataDir(): string {
  const envDir = process.env.DATA_DIR;
  if (envDir) {
    return resolve(envDir);
  }
  return resolve(process.cwd(), 'data');
}

// ---------------------------------------------------------------------------
// 通用校验器
// ---------------------------------------------------------------------------

/**
 * 读取并校验一个 JSON 文件。
 *
 * @param fileName 例如 'generals.json'
 * @param schema 用来校验解析结果的 Zod schema(必须是 array schema 或 object schema)
 * @param fallback 当文件不存在时返回的默认值(默认空数组)
 */
export function loadAndValidate<T>(
  fileName: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  const filePath = join(resolveDataDir(), fileName);

  if (!existsSync(filePath)) {
    // 第一次跑 / data 还没就绪:返回 fallback 而不是炸
    // (loader 函数语义是"给我一个能用的值",不是"必须存在")
    return fallback;
  }

  const raw = readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `[loader] ${fileName} 不是合法 JSON: ${(e as Error).message}`,
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`[loader] ${fileName} 校验失败:\n${issues}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// 8 个加载函数
// ---------------------------------------------------------------------------

let generalsCache: General[] | null = null;
let skillsCache: Skill[] | null = null;
let tacticsCache: Tactics[] | null = null;
let lineupsCache: Lineup[] | null = null;
let traitsCache: Trait[] | null = null;
let itemsCache: Item[] | null = null;
let patchesCache: Patch[] | null = null;
let simConfigCache: SimConfig | null = null;

/** 重置缓存(单测 / 热重载时用) */
export function clearLoaderCache(): void {
  generalsCache = null;
  skillsCache = null;
  tacticsCache = null;
  lineupsCache = null;
  traitsCache = null;
  itemsCache = null;
  patchesCache = null;
  simConfigCache = null;
}

/** 8.1 武将(generals.json — 数组) */
export function loadGenerals(): General[] {
  if (generalsCache === null) {
    generalsCache = loadAndValidate<General[]>(
      'generals.json',
      GeneralsFileSchema,
      [],
    );
  }
  return generalsCache;
}

/** 8.2 战法(skills.json — 数组) */
export function loadSkills(): Skill[] {
  if (skillsCache === null) {
    skillsCache = loadAndValidate<Skill[]>(
      'skills.json',
      SkillsFileSchema,
      [],
    );
  }
  return skillsCache;
}

/** 8.3 兵书(tactics.json — 数组) */
export function loadTactics(): Tactics[] {
  if (tacticsCache === null) {
    tacticsCache = loadAndValidate<Tactics[]>(
      'tactics.json',
      TacticsFileSchema,
      [],
    );
  }
  return tacticsCache;
}

/** 8.4 阵容(lineups.json — 数组) */
export function loadLineups(): Lineup[] {
  if (lineupsCache === null) {
    lineupsCache = loadAndValidate<Lineup[]>(
      'lineups.json',
      LineupsFileSchema,
      [],
    );
    // v6 兼容性:LineupSchema 把 formationSkillId 保留为 deprecated optional,
    // 数据迁移期间如果发现任一 lineup 还带这个字段,只 warn 一次,提示
    // 作者把阵法下沉到主将战法槽 0(skills.main[generalIds[0]][0])。
    warnDeprecatedFormationSkillId(lineupsCache);
  }
  return lineupsCache;
}

/** 检测 v6 deprecated 字段 formationSkillId,只在第一次发现时 warn 一次 */
let warnedFormationSkillId = false;
function warnDeprecatedFormationSkillId(lineups: Lineup[]): void {
  if (warnedFormationSkillId) return;
  const offenders = lineups.filter(
    (l) => l.formationSkillId != null && l.formationSkillId !== '',
  );
  if (offenders.length === 0) return;
  warnedFormationSkillId = true;
  const ids = offenders.map((l) => l.id).join(', ');
  // eslint-disable-next-line no-console
  console.warn(
    `[loader] lineups.json 中 ${offenders.length} 条阵容仍使用 deprecated 字段 formationSkillId ` +
      `(id: ${ids})。请把阵法下沉到 skills.main[generalIds[0]][0],并删除 formationSkillId。`,
  );
}

/** 8.5 特技(traits.json — 数组) */
export function loadTraits(): Trait[] {
  if (traitsCache === null) {
    traitsCache = loadAndValidate<Trait[]>(
      'traits.json',
      TraitsFileSchema,
      [],
    );
  }
  return traitsCache;
}

/** 8.6 装备(items.json — 数组,MVP 弱化) */
export function loadItems(): Item[] {
  if (itemsCache === null) {
    itemsCache = loadAndValidate<Item[]>(
      'items.json',
      ItemsFileSchema,
      [],
    );
  }
  return itemsCache;
}

/** 8.7 版本特性(patches.json — 数组) */
export function loadPatches(): Patch[] {
  if (patchesCache === null) {
    patchesCache = loadAndValidate<Patch[]>(
      'patches.json',
      PatchesFileSchema,
      [],
    );
  }
  return patchesCache;
}

/** 8.8 模拟配置(sim-config.json — 单对象) */
export function loadSimConfig(): SimConfig {
  if (simConfigCache === null) {
    // 单对象没有"空 fallback"的合理默认:文件不存在就抛错更直观
    simConfigCache = loadAndValidate<SimConfig>(
      'sim-config.json',
      SimConfigSchema,
      // 兜底:给一个最简可用值,让首次 build 不挂
      {
        iterations: 1000,
        triggerRate: { 主动: 0.35, 被动: 1.0, 突击: 0.35, 指挥: 1.0 },
        troopCounter: { same: 1.0 },
        campBonus: 1.0,
      },
    );
  }
  return simConfigCache;
}
