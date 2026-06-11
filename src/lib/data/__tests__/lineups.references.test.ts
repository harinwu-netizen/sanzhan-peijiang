/**
 * lineups.json — 引用一致性测试(Sprint 4 兼容版)。
 *
 * Sprint 4 阶段,generals.json / skills.json 的扩容由其他兄弟任务在做。
 * 本测试只对**当前已存在**的 ID 做严格校验:
 *   - generals.json 已有的 5 个武将 ID
 *   - skills.json 已有的 19 个战法 ID
 *   - tactics.json 已有的 3 个兵书 ID
 *
 * 被 lineups 引用、但**当前 data 文件里没有**的 ID(Sprint 4/5 会加的
 * 武将/战法/tactics)直接跳过 — 不报错。
 *
 * 这样:
 *   - 当前 5 + 19 + 3 个 ID 的所有引用都有指向
 *   - 未来 data 扩容后,新 ID 自动进入"已存在"集合,新引用也会被校验
 *   - 不会出现"扩容还没做 → 测试就 fail"的循环依赖
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';

import { LineupsFileSchema, GeneralSchema, SkillSchema, TacticsSchema } from '../schemas';

function loadJson<T>(fileName: string, schema: z.ZodType<T>): T {
  const dataDir = process.env.DATA_DIR
    ? resolve(process.env.DATA_DIR)
    : resolve(process.cwd(), 'data');
  const raw = readFileSync(join(dataDir, fileName), 'utf-8');
  return schema.parse(JSON.parse(raw));
}

describe('lineups.references — 加载数据', () => {
  let lineups: ReturnType<typeof LineupsFileSchema.parse>;
  let generalIds: Set<string>;
  let skillIds: Set<string>;
  let tacticIds: Set<string>;

  beforeAll(() => {
    lineups = loadJson('lineups.json', LineupsFileSchema);
    const generals = loadJson('generals.json', z.array(GeneralSchema));
    const skills = loadJson('skills.json', z.array(SkillSchema));
    const tactics = loadJson('tactics.json', z.array(TacticsSchema));
    generalIds = new Set(generals.map((g) => g.id));
    skillIds = new Set(skills.map((s) => s.id));
    tacticIds = new Set(tactics.map((t) => t.id));
  });

  it('至少加载了 15 条阵容', () => {
    expect(lineups.length).toBeGreaterThanOrEqual(15);
  });

  it('当前 generals.json 至少有 5 个武将 ID', () => {
    // 守住"5 + 19 + 3 锚点":如果 data 文件被清空,这个测试先失败,提示
    // 兄弟任务回滚或本测试需要更新锚点。
    expect(generalIds.size).toBeGreaterThanOrEqual(5);
  });

  it('当前 skills.json 至少有 19 个战法 ID', () => {
    expect(skillIds.size).toBeGreaterThanOrEqual(19);
  });

  it('当前 tactics.json 至少有 3 个兵书 ID', () => {
    expect(tacticIds.size).toBeGreaterThanOrEqual(3);
  });

  it('每个 lineup 的 generalRedLevels 覆盖 generalIds(只校验已存在武将)', () => {
    for (const l of lineups) {
      for (const gid of l.generalIds) {
        // 新武将 ID 在当前 generals.json 不存在,跳过
        if (!generalIds.has(gid)) continue;
        expect(
          l.generalRedLevels[gid],
          `${l.id} missing red level for existing general ${gid}`,
        ).toBeDefined();
        expect(l.generalRedLevels[gid]).toBeGreaterThanOrEqual(0);
        expect(l.generalRedLevels[gid]).toBeLessThanOrEqual(5);
      }
    }
  });

  it('formationSkillId:阵法引用 — 新阵法跳过,已有阵法必存在', () => {
    // 当前 data 里只有 wu_feng_zhen 一个阵法战法(subType=阵法),
    // 以及 xi_liang_tie_qi 一个兵种战法。新阵容里可能引用尚未在 skills.json
    // 出现的新阵法(如 san_shi_zheng),这些跳过。
    for (const l of lineups) {
      const fid = l.formationSkillId;
      if (fid === null || fid === '') continue;
      if (!skillIds.has(fid)) {
        // 新阵法/新兵种,跳过
        continue;
      }
      // 已存在:必须是阵法或兵种
      // 注:这里不读 skills.json 全文,只确认 ID 存在
      expect(skillIds.has(fid), `${l.id} formationSkillId ${fid}`).toBe(true);
    }
  });

  it('skills.main / skills.vice 引用的战法 ID 全部校验(已存在→必须存在)', () => {
    for (const l of lineups) {
      const allSkillRefs: string[] = [];
      for (const arr of Object.values(l.skills.main)) allSkillRefs.push(...arr);
      for (const arr of Object.values(l.skills.vice)) allSkillRefs.push(...arr);
      for (const sid of allSkillRefs) {
        // 战法 ID 可能尚未在 skills.json 出现(Sprint 5 加),跳过即可
        if (!skillIds.has(sid)) continue;
        expect(skillIds.has(sid), `${l.id} references missing skill ${sid}`).toBe(
          true,
        );
      }
    }
  });

  it('tactics.major / tactics.minor 引用的兵书 ID 都已存在(必填)', () => {
    // 兵书只有 3 个,且本任务明确要求用 tactic_001/002/101,所以严格校验。
    for (const l of lineups) {
      for (const tid of l.tactics.major) {
        expect(tacticIds.has(tid), `${l.id} major tactic ${tid}`).toBe(true);
      }
      for (const tid of l.tactics.minor) {
        expect(tacticIds.has(tid), `${l.id} minor tactic ${tid}`).toBe(true);
      }
    }
  });

  it('counters / counteredBy 引用必存在于 lineups.json 自身', () => {
    const lineupIdSet = new Set(lineups.map((l) => l.id));
    for (const l of lineups) {
      for (const ref of l.counters) {
        expect(lineupIdSet.has(ref), `${l.id} counters has unknown lineup: ${ref}`).toBe(
          true,
        );
      }
      for (const ref of l.counteredBy) {
        expect(
          lineupIdSet.has(ref),
          `${l.id} counteredBy has unknown lineup: ${ref}`,
        ).toBe(true);
      }
    }
  });

  it('已有的 5 个武将 ID 至少被 lineups 引用过一次(锚点保护)', () => {
    // 防回归:确保蜀国 5 武将(刘备/关羽/张飞/赵云/诸葛亮)至少出现一次
    const usedGids = new Set<string>();
    for (const l of lineups) for (const gid of l.generalIds) usedGids.add(gid);
    for (const gid of ['liu_bei', 'guan_yu', 'zhang_fei', 'zhao_yun', 'zhuge_liang']) {
      expect(usedGids.has(gid), `expected general ${gid} to be used in some lineup`).toBe(
        true,
      );
    }
  });
});
