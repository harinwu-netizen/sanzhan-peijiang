/**
 * Loader 单元测试。
 *
 * 两个目标(PRD §data-schema 任务验收):
 *  1. 加载空数据(空数组)能通过校验
 *  2. 加载故意写错的数据(缺字段)能抛错
 *
 * 注意:这些测试依赖 vitest(`pnpm test`)。
 * vitest 会在 ci-docs 任务里装,届时直接 `pnpm test` 就能跑。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  GeneralSchema,
  SkillSchema,
  LineupSchema,
  TraitSchema,
  ItemSchema,
  PatchSchema,
  SimConfigSchema,
  TacticsSchema,
} from './schemas';
import {
  loadGenerals,
  loadSkills,
  loadLineups,
  loadTraits,
  loadItems,
  loadPatches,
  loadTactics,
  loadSimConfig,
  clearLoaderCache,
} from './loader';

describe('Zod schemas — happy path', () => {
  it('GeneralSchema accepts a minimal valid general', () => {
    const result = GeneralSchema.safeParse({
      id: 'zhuge_liang',
      name: '诸葛亮',
      camp: '蜀',
      quality: '橙',
      stats: { 武力: 78, 智力: 156, 统率: 96, 速度: 48 },
      cavalry: 'S',
      shield: 'A',
      archer: 'S',
      spear: 'A',
      siege: 'C',
      trait: '主动',
      selfSkillId: 'qixing',
      inheritSkillId: 'kongcheng',
      redLevel: 0,
      learnableFormationSkillIds: ['wufeng_zheng'],
      tacticsOptions: { major: ['tactic_001'], minor: ['tactic_101'] },
      equippableTraitCount: 1,
    });
    expect(result.success).toBe(true);
  });

  it('SkillSchema rejects unknown subType', () => {
    const result = SkillSchema.safeParse({
      id: 'bogus',
      name: 'bogus',
      subType: '未知类型',
      quality: '橙',
      description: '',
      source: '',
      sourceType: '通用',
      carrierIds: [],
      triggerRate: null,
      multiTarget: false,
      startRound: 1,
    });
    expect(result.success).toBe(false);
  });

  it('SimConfigSchema accepts the canonical config', () => {
    const result = SimConfigSchema.safeParse({
      iterations: 1000,
      triggerRate: { 主动: 0.35, 被动: 1.0, 突击: 0.35, 指挥: 1.0 },
      troopCounter: { same: 1.0 },
      campBonus: 1.1,
    });
    expect(result.success).toBe(true);
  });
});

describe('Zod schemas — error cases', () => {
  it('GeneralSchema rejects when required field is missing', () => {
    const result = GeneralSchema.safeParse({
      id: 'zhuge_liang',
      // name 故意缺失
      camp: '蜀',
      quality: '橙',
    });
    expect(result.success).toBe(false);
  });

  it('LineupSchema rejects when ratings.total is out of range', () => {
    const result = LineupSchema.safeParse({
      id: 'wufeng_test',
      name: '测试阵容',
      tier: 'T1',
      tags: [],
      generalIds: ['a', 'b', 'c'],
      generalRedLevels: { a: 0, b: 0, c: 0 },
      formationSkillId: null,
      troop: 'spear',
      skills: { main: { a: ['s1', 's2', 's3'] }, vice: { b: ['s4', 's5'], c: ['s6', 's7'] } },
      tactics: {
        major: ['t1', 't2', 't3'],
        minor: ['t4', 't5', 't6'],
      },
      equippedTraitIds: [],
      description: '',
      counters: [],
      counteredBy: [],
      ratings: {
        output: 50,
        recover: 50,
        multihit: 50,
        rhythm: 50,
        coverage: 50,
        stability: 50,
        total: 999, // 超出 0-100
      },
      tierByScore: 'T1',
    });
    expect(result.success).toBe(false);
  });

  it('PatchSchema rejects bad date format', () => {
    const result = PatchSchema.safeParse({
      id: 'p1',
      version: 'v1.0',
      date: '2026/05/10', // 错:不是 YYYY-MM-DD
      type: '武将调整',
      summary: '',
      details: '',
      affectedIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('TraitSchema allows null ownerGeneralId (通用特性)', () => {
    const result = TraitSchema.safeParse({
      id: 't_crit',
      name: '暴击强化',
      ownerGeneralId: null,
      triggerCondition: '普攻时',
      effect: '暴击 +10%',
      source: '通用',
      category: '攻击',
    });
    expect(result.success).toBe(true);
  });
});

describe('Loader — empty data (defaults to [])', () => {
  beforeEach(() => {
    clearLoaderCache();
  });

  it('loadGenerals() returns [] when data/generals.json is empty', () => {
    const result = loadGenerals();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('loadSkills() returns [] when data/skills.json is empty', () => {
    expect(loadSkills()).toEqual([]);
  });

  it('loadLineups() returns [] when data/lineups.json is empty', () => {
    expect(loadLineups()).toEqual([]);
  });

  it('loadTraits() returns [] when data/traits.json is empty', () => {
    expect(loadTraits()).toEqual([]);
  });

  it('loadItems() returns [] when data/items.json is empty', () => {
    expect(loadItems()).toEqual([]);
  });

  it('loadPatches() returns [] when data/patches.json is empty', () => {
    expect(loadPatches()).toEqual([]);
  });

  it('loadTactics() returns [] when data/tactics.json is empty', () => {
    expect(loadTactics()).toEqual([]);
  });

  it('loadSimConfig() returns canonical config from data/sim-config.json', () => {
    const cfg = loadSimConfig();
    expect(cfg.iterations).toBe(1000);
    expect(cfg.triggerRate.主动).toBe(0.35);
    expect(cfg.campBonus).toBe(1.1);
  });
});

describe('Loader — invalid data throws', () => {
  // 准备一个临时 data 目录,里面写故意有错的文件
  let tmpDataDir: string;

  beforeEach(() => {
    clearLoaderCache();
    tmpDataDir = mkdtempSync(join(tmpdir(), 'loader-test-'));
    process.env.DATA_DIR = tmpDataDir;
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(tmpDataDir, { recursive: true, force: true });
  });

  it('throws when generals.json has a record missing required field', () => {
    writeFileSync(
      join(tmpDataDir, 'generals.json'),
      JSON.stringify([
        {
          id: 'broken',
          // name 缺失
          camp: '蜀',
          quality: '橙',
        },
      ]),
      'utf-8',
    );
    expect(() => loadGenerals()).toThrow(/generals\.json 校验失败/);
  });

  it('throws when skills.json is not valid JSON', () => {
    writeFileSync(join(tmpDataDir, 'skills.json'), '{not json', 'utf-8');
    expect(() => loadSkills()).toThrow(/不是合法 JSON/);
  });

  it('throws when sim-config.json is missing required field', () => {
    writeFileSync(
      join(tmpDataDir, 'sim-config.json'),
      JSON.stringify({ iterations: 1000 }),
      'utf-8',
    );
    expect(() => loadSimConfig()).toThrow(/sim-config\.json 校验失败/);
  });
});

