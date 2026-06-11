/**
 * Sample data validation test (one-off, not part of the loader.test.ts suite).
 *
 * Verifies that all 5 sample data files load successfully through the
 * Zod schemas (i.e., no schema-level validation errors).
 */
import { describe, it, expect } from 'vitest';
import {
  loadGenerals,
  loadSkills,
  loadTactics,
  loadLineups,
  loadTraits,
  loadSimConfig,
  clearLoaderCache,
} from './loader';

describe('Sample data — Zod schema pass-through', () => {
  // Make sure no cached state from earlier tests
  clearLoaderCache();

  it('generals.json: 5 蜀国橙将 with full stats + cross-refs', () => {
    const data = loadGenerals();
    expect(data).toHaveLength(5);
    const ids = data.map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'zhuge_liang',
        'liu_bei',
        'zhang_fei',
        'guan_yu',
        'zhao_yun',
      ]),
    );
    // All 蜀
    expect(data.every((g) => g.camp === '蜀')).toBe(true);
    // All 橙
    expect(data.every((g) => g.quality === '橙')).toBe(true);
    // All have wu_feng_zhen in learnable
    expect(
      data.every((g) => g.learnableFormationSkillIds.includes('wu_feng_zhen')),
    ).toBe(true);
    // All equippableTraitCount = 1
    expect(data.every((g) => g.equippableTraitCount === 1)).toBe(true);
    // Stats within 30-200
    data.forEach((g) => {
      expect(g.stats.武力).toBeGreaterThanOrEqual(30);
      expect(g.stats.武力).toBeLessThanOrEqual(200);
      expect(g.stats.智力).toBeGreaterThanOrEqual(30);
      expect(g.stats.智力).toBeLessThanOrEqual(200);
      expect(g.stats.统率).toBeGreaterThanOrEqual(30);
      expect(g.stats.统率).toBeLessThanOrEqual(200);
      expect(g.stats.速度).toBeGreaterThanOrEqual(30);
      expect(g.stats.速度).toBeLessThanOrEqual(200);
    });
  });

  it('skills.json: covers all 6 subTypes with 19 entries', () => {
    const data = loadSkills();
    // 5 self + 4 inherit + 10 sample = 19
    expect(data.length).toBeGreaterThanOrEqual(15);
    const subTypes = new Set(data.map((s) => s.subType));
    expect(subTypes).toEqual(
      new Set(['主动', '被动', '指挥', '突击', '阵法', '兵种']),
    );
    // All 5 generals' self/inherit skills exist
    const ids = new Set(data.map((s) => s.id));
    [
      'qi_xing_zhen',
      'ren_de_zai_shi',
      'wan_ren_zhi_di',
      'wei_zhen_hua_xia',
      'long_dan',
      'kong_cheng_ji',
      'yi_xin_zhao_yong',
      'chen_mu_heng_mao',
      'heng_sao_qian_jun',
      'wu_feng_zhen',
    ].forEach((id) => expect(ids.has(id)).toBe(true));
    // wu_feng_zhen must be 阵法
    const wfz = data.find((s) => s.id === 'wu_feng_zhen');
    expect(wfz?.subType).toBe('阵法');
    // 主动/突击 have 0.35, others null
    data.forEach((s) => {
      if (s.subType === '主动' || s.subType === '突击') {
        expect(s.triggerRate).toBe(0.35);
      } else {
        expect(s.triggerRate).toBeNull();
      }
    });
  });

  it('tactics.json: 3 entries (2 major + 1 minor)', () => {
    const data = loadTactics();
    expect(data).toHaveLength(3);
    expect(data.filter((t) => t.slot === 'major')).toHaveLength(2);
    expect(data.filter((t) => t.slot === 'minor')).toHaveLength(1);
  });

  it('lineups.json: 1 蜀枪 with 3 generals + wu_feng_zhen', () => {
    const data = loadLineups();
    expect(data).toHaveLength(1);
    const lineup = data[0];
    expect(lineup.id).toBe('shu_qiang');
    expect(lineup.troop).toBe('spear');
    expect(lineup.formationSkillId).toBe('wu_feng_zhen');
    expect(lineup.generalIds).toEqual(['liu_bei', 'zhang_fei', 'guan_yu']);
    // generalRedLevels key set = generalIds
    expect(Object.keys(lineup.generalRedLevels).sort()).toEqual(
      lineup.generalIds.slice().sort(),
    );
    // ratings.total = (65+70+60+55+60+65)/6 = 62.5
    expect(lineup.ratings.total).toBeCloseTo(62.5, 1);
    // tierByScore = T1 (total >= 45)
    expect(lineup.tierByScore).toBe('T1');
  });

  it('traits.json: 5 entries (1 赵云专属 + 4 通用)', () => {
    const data = loadTraits();
    expect(data).toHaveLength(5);
    // 1 专属
    const exclusive = data.filter((t) => t.ownerGeneralId !== null);
    expect(exclusive).toHaveLength(1);
    expect(exclusive[0].ownerGeneralId).toBe('zhao_yun');
    // 4 通用
    const generic = data.filter((t) => t.ownerGeneralId === null);
    expect(generic).toHaveLength(4);
    // category 分布(任务指定:赵云专属=攻击,4 通用=攻击/防御/谋略/速度)
    const categories = new Set(data.map((t) => t.category));
    expect(categories).toEqual(new Set(['攻击', '防御', '谋略', '速度']));
  });

  it('Cross-file ID consistency: every reference resolves', () => {
    const generals = loadGenerals();
    const skills = loadSkills();
    const tactics = loadTactics();
    const traits = loadTraits();

    const generalIds = new Set(generals.map((g) => g.id));
    const skillIds = new Set(skills.map((s) => s.id));
    const tacticIds = new Set(tactics.map((t) => t.id));
    const traitIds = new Set(traits.map((t) => t.id));

    // General → Skill
    generals.forEach((g) => {
      expect(skillIds.has(g.selfSkillId)).toBe(true);
      if (g.inheritSkillId) expect(skillIds.has(g.inheritSkillId)).toBe(true);
      g.learnableFormationSkillIds.forEach((id) => {
        expect(skillIds.has(id)).toBe(true);
        const sk = skills.find((s) => s.id === id);
        expect(sk?.subType).toBe('阵法');
      });
    });

    // Trait.ownerGeneralId → General
    traits.forEach((t) => {
      if (t.ownerGeneralId) {
        expect(generalIds.has(t.ownerGeneralId)).toBe(true);
      }
    });

    // Lineup refs
    loadLineups().forEach((l) => {
      l.generalIds.forEach((id) => expect(generalIds.has(id)).toBe(true));
      if (l.formationSkillId) {
        expect(skillIds.has(l.formationSkillId)).toBe(true);
        const sk = skills.find((s) => s.id === l.formationSkillId);
        expect(sk?.subType).toBe('阵法');
      }
      Object.values(l.skills.main)
        .flat()
        .forEach((id) => expect(skillIds.has(id)).toBe(true));
      Object.values(l.skills.vice)
        .flat()
        .forEach((id) => expect(skillIds.has(id)).toBe(true));
      l.tactics.major.forEach((id) => expect(tacticIds.has(id)).toBe(true));
      l.tactics.minor.forEach((id) => expect(tacticIds.has(id)).toBe(true));
      l.equippedTraitIds.forEach((id) => expect(traitIds.has(id)).toBe(true));
    });
  });
});
