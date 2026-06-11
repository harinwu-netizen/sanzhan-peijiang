/**
 * lineups.json — schema 校验 + 6 维评分一致性。
 *
 * 验证:
 *  1. data/lineups.json 里 15 条记录全部通过 LineupSchema
 *  2. 6 维评分 (output/recover/multihit/rhythm/coverage/stability) 都在 0-100
 *  3. ratings.total 与 6 维均值的差 ≤ 2
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
