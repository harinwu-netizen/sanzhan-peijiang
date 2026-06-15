/**
 * lineups.json — schema 校验 + 6 维评分一致性。
 *
 * v6 起阵法已下沉为主将战法槽 0(skills.main[generalIds[0]][0]),
 * 因此除了原有约束外还要:
 *  - 主将 skills.main 严格 3 个
 *  - 槽 0 必须指向一个阵法战法(由 lineups.references.test.ts 跨表校验)
 *  - 顶层不应再有 formationSkillId 字段(S6 删字段)
 *
 * 验证:
 *  1. data/lineups.json 里 15 条记录全部通过 LineupSchema
 *  2. 6 维评分 (output/recover/multihit/rhythm/coverage/stability) 都在 0-100
 *  3. ratings.total 与 6 维均值的差 ≤ 2
 *  4. 主将 skills.main 长度 = 3,且槽 0 非空(阵法槽)
 *  5. 顶层不应再带 formationSkillId 字段(迁移完成)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LineupSchema, LineupsFileSchema } from '../schemas';

function loadLineupsFile(): unknown {
  const dataDir = process.env.DATA_DIR
    ? resolve(process.env.DATA_DIR)
    : resolve(process.cwd(), 'data');
  const raw = readFileSync(join(dataDir, 'lineups.json'), 'utf-8');
  return JSON.parse(raw);
}

const lineups = LineupsFileSchema.parse(loadLineupsFile());

const SIX_DIM_KEYS = [
  'output',
  'recover',
  'multihit',
  'rhythm',
  'coverage',
  'stability',
] as const;

describe('lineups.json — schema 校验', () => {
  it('应当有 15 条阵容', () => {
    expect(lineups).toHaveLength(15);
  });

  it('id 唯一', () => {
    const ids = lineups.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每条都通过 LineupSchema 单独校验(冗余检查)', () => {
    for (const l of lineups) {
      const result = LineupSchema.safeParse(l);
      expect(result.success, `lineup ${l.id} failed schema`).toBe(true);
    }
  });

  it('每条 generalIds 长度 = 3', () => {
    for (const l of lineups) {
      expect(l.generalIds, `${l.id} generalIds length`).toHaveLength(3);
    }
  });

  it('主将 = generalIds[0](即 main 字典的 key 必须是主将)', () => {
    for (const l of lineups) {
      const mainKeys = Object.keys(l.skills.main);
      expect(mainKeys, `${l.id} main keys`).toEqual([l.generalIds[0]]);
      expect(l.skills.main[l.generalIds[0]]).toHaveLength(3);
    }
  });

  it('副将 = generalIds[1] 和 generalIds[2](每人 2 个战法)', () => {
    for (const l of lineups) {
      const viceKeys = Object.keys(l.skills.vice);
      expect(viceKeys, `${l.id} vice keys`).toEqual([
        l.generalIds[1],
        l.generalIds[2],
      ]);
      expect(l.skills.vice[l.generalIds[1]]).toHaveLength(2);
      expect(l.skills.vice[l.generalIds[2]]).toHaveLength(2);
    }
  });

  it('tactics.major 和 tactics.minor 各 3 个', () => {
    for (const l of lineups) {
      expect(l.tactics.major, `${l.id} major length`).toHaveLength(3);
      expect(l.tactics.minor, `${l.id} minor length`).toHaveLength(3);
    }
  });

  // v6 新增:阵法已下沉,顶层 formationSkillId 不应再出现
  it('v6: 顶层不应再带 formationSkillId 字段', () => {
    for (const l of lineups) {
      const raw = l as unknown as Record<string, unknown>;
      expect(
        raw['formationSkillId'],
        `${l.id} 仍含 formationSkillId,请迁移到 skills.main[generalIds[0]][0]`,
      ).toBeUndefined();
    }
  });

  // v6 新增:主将战法槽 0 必须存在且非空(阵法槽)
  it('v6: 主将战法槽 0(阵法槽)非空字符串', () => {
    for (const l of lineups) {
      const mainId = l.generalIds[0];
      const mainSkills = l.skills.main[mainId];
      expect(mainSkills, `${l.id} main skills missing`).toBeDefined();
      const slot0 = mainSkills?.[0];
      expect(slot0, `${l.id} main[0] 必须有值`).toBeTruthy();
      expect(typeof slot0).toBe('string');
      expect(slot0!.length, `${l.id} main[0] 应为非空 ID`).toBeGreaterThan(0);
    }
  });

  // v6 新增:主将战法槽 0 必须引用 skills.json 里 subType=阵法 的战法
  it('v6: 主将战法槽 0 在 skills.json 里存在且 subType=阵法', () => {
    const skillsRaw = readFileSync(
      join(
        process.env.DATA_DIR
          ? resolve(process.env.DATA_DIR)
          : resolve(process.cwd(), 'data'),
        'skills.json',
      ),
      'utf-8',
    );
    const skills = JSON.parse(skillsRaw) as Array<{
      id: string;
      subType: string;
    }>;
    const formationSet = new Set(
      skills.filter((s) => s.subType === '阵法').map((s) => s.id),
    );
    for (const l of lineups) {
      const slot0 = l.skills.main[l.generalIds[0]]?.[0];
      expect(slot0, `${l.id} main[0]`).toBeTruthy();
      // 这里只校验"如果该 ID 已在 skills.json,则 subType 必须是阵法";
      // 没在 skills.json 的新阵法(后续会加)跳过 strict 校验,留给 lineups.references.test.ts
      if (skills.some((s) => s.id === slot0)) {
        expect(
          formationSet.has(slot0!),
          `${l.id} main[0]=${slot0} 不是阵法战法(subType 应为'阵法')`,
        ).toBe(true);
      }
    }
  });
});

describe('lineups.json — 6 维评分', () => {
  it('6 维评分都在 0-100 区间', () => {
    for (const l of lineups) {
      for (const k of SIX_DIM_KEYS) {
        const v = l.ratings[k];
        expect(v, `${l.id} ratings.${k}`).toBeGreaterThanOrEqual(0);
        expect(v, `${l.id} ratings.${k}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('ratings.total 与 6 维均值的差 ≤ 2', () => {
    for (const l of lineups) {
      const avg =
        SIX_DIM_KEYS.reduce((s, k) => s + l.ratings[k], 0) / SIX_DIM_KEYS.length;
      const diff = Math.abs(l.ratings.total - avg);
      expect(
        diff,
        `${l.id} total=${l.ratings.total} avg=${avg.toFixed(2)} diff=${diff.toFixed(2)}`,
      ).toBeLessThanOrEqual(2);
    }
  });
});

describe('lineups.json — counters / counteredBy 一致性', () => {
  const idSet = new Set(lineups.map((l) => l.id));

  it('每个 lineup 的 counters 引用的 id 都在 lineups.json 内', () => {
    for (const l of lineups) {
      for (const ref of l.counters) {
        expect(idSet.has(ref), `${l.id} counters has unknown id: ${ref}`).toBe(
          true,
        );
      }
    }
  });

  it('每个 lineup 的 counteredBy 引用的 id 都在 lineups.json 内', () => {
    for (const l of lineups) {
      for (const ref of l.counteredBy) {
        expect(
          idSet.has(ref),
          `${l.id} counteredBy has unknown id: ${ref}`,
        ).toBe(true);
      }
    }
  });

  it('counters 至少 1 个,counteredBy 至少 1 个', () => {
    for (const l of lineups) {
      expect(l.counters.length, `${l.id} counters length`).toBeGreaterThanOrEqual(1);
      expect(l.counteredBy.length, `${l.id} counteredBy length`).toBeGreaterThanOrEqual(1);
    }
  });
});
