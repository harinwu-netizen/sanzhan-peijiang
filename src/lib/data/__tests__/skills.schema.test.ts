/**
 * S4-Data skills.json schema validation test.
 *
 * 目标:
 *  1. data/skills.json 一共 50 条,且全部通过 SkillSchema
 *  2. id 唯一
 *  3. subType 分布满足 S4 任务要求(主动 15-18 / 被动 8-10 / 指挥 5-7
 *     / 突击 4-6 / 阵法 5-7 / 兵种 5-7,共 50)
 *  4. triggerRate 范围合理:主动 0.25-0.50,突击 0.30-0.45,
 *     被动/指挥/阵法/兵种 必须为 null 或 1.0
 *  5. startRound ∈ [1, 8](由 schema 强校验)
 *  6. multiTarget 字段:主动/突击 一半 true 一半 false;
 *     被动/指挥/阵法/兵种 全部 false(范围效果)
 *  7. sourceType 必须为 '自带'|'传承'|'拆解'|'通用'
 *
 * 依赖 `pnpm test`(vitest)。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SkillSchema, SkillsFileSchema, type Skill, type SkillSubType } from '../schemas';

let skills: Skill[] = [];

/**
 * 既有 19 个战法 id 列表(S4 之前已存在,本任务保留不动)。
 * 用于校验"未删改既有数据"。
 */
const EXISTING_SKILL_IDS: readonly string[] = [
  'qi_xing_zhen',
  'ren_de_zai_shi',
  'wan_ren_zhi_di',
  'wei_zhen_hua_xia',
  'long_dan',
  'kong_cheng_ji',
  'yi_xin_zhao_yong',
  'chen_mu_heng_mao',
  'heng_sao_qian_jun',
  'tai_ping_dao_fa',
  'gua_gu_liao_du',
  'yi_qi_li_ci',
  'po_zhen_cui_jian',
  'huo_chi_yuan_liao',
  'shi_bie_san_ri',
  'jie_li_zuo_mou',
  'bing_feng',
  'wu_feng_zhen',
  'xi_liang_tie_qi',
];

/**
 * S4 本次新增的 31 个战法 id 列表。
 * 用于区分"新规则"与"既有 19 个保留不动"的判定边界。
 */
const NEW_SKILL_IDS: readonly string[] = [
  // 主动 7
  'bei_she_gui_che',
  'chen_sha_jue_shui',
  'yong_wu_tong_shen',
  'xing_ji_jun_lve',
  'shi_zhi_bu_yi',
  'yong_guan_san_jun',
  'yi_li_ju_shou',
  // 被动 6
  'yi_dan_zhong_xin',
  'xue_jian_xuan_yuan',
  'xiao_yong_wu_pi',
  'gui_shen_mo_ce',
  'jian_ti_qiang_shen',
  'xu_shi_dai_fa',
  // 指挥 3
  'ba_men_jin_suo_zhen',
  'zheng_zhuang_dai_fa',
  'shi_zheng_xian_fu',
  // 突击 3
  'bao_lian_si_fang',
  'duan_bing_xiang_jie',
  'qie_zhen_duo_shuai',
  // 阵法 6
  'feng_shi_zhen',
  'he_yi_zhen',
  'yu_lin_zhen',
  'ba_gua_zhen',
  'yan_xing_zhen',
  'da_yan_zhen',
  // 兵种 6
  'da_ji_shi',
  'fei_xiong_jun',
  'bai_ma_yi_cong',
  'wu_dang_fei_jun',
  'teng_jia_bing',
  'hu_bao_qi',
];

beforeAll(() => {
  // 直接读仓库根 data/skills.json(避开 loader 缓存,确保本测试对文件本身负责)
  const filePath = resolve(process.cwd(), 'data', 'skills.json');
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  // 用 SkillsFileSchema 整体校验一次,失败会抛
  skills = SkillsFileSchema.parse(parsed);
});

describe('S4 skills.json — 总数与 id 唯一', () => {
  it('共 50 条战法', () => {
    expect(skills).toHaveLength(50);
  });

  it('id 唯一', () => {
    const ids = skills.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('id 全部 snake_case(只含 [a-z0-9_] 且非空)', () => {
    const re = /^[a-z0-9_]+$/;
    for (const s of skills) {
      expect(s.id, `id=${s.id}`).toMatch(re);
    }
  });

  it('新增 31 个战法 id 全部出现在数据中,且与既有 19 个不冲突', () => {
    expect(NEW_SKILL_IDS).toHaveLength(31);
    const ids = new Set(skills.map((s) => s.id));
    for (const id of NEW_SKILL_IDS) {
      expect(ids.has(id), `missing new id: ${id}`).toBe(true);
    }
    // 新旧不能相交(确保"保留不动"边界)
    const newSet = new Set(NEW_SKILL_IDS);
    const existingSet = new Set(EXISTING_SKILL_IDS);
    const overlap = skills.filter((s) => newSet.has(s.id) && existingSet.has(s.id));
    expect(overlap, `overlap: ${overlap.map((s) => s.id).join(',')}`).toHaveLength(0);
  });
});

describe('S4 skills.json — subType 分布', () => {
  const expectedRange: Record<SkillSubType, [number, number]> = {
    主动: [15, 18],
    被动: [8, 10],
    指挥: [5, 7],
    突击: [4, 6],
    阵法: [5, 7],
    兵种: [5, 7],
  };

  const subTypes: SkillSubType[] = ['主动', '被动', '指挥', '突击', '阵法', '兵种'];

  for (const t of subTypes) {
    it(`${t} 数量在 [${expectedRange[t][0]}, ${expectedRange[t][1]}] 范围内`, () => {
      const count = skills.filter((s) => s.subType === t).length;
      expect(count).toBeGreaterThanOrEqual(expectedRange[t][0]);
      expect(count).toBeLessThanOrEqual(expectedRange[t][1]);
    });
  }

  it('6 个 subType 全部覆盖', () => {
    const present = new Set(skills.map((s) => s.subType));
    expect(present).toEqual(new Set(subTypes));
  });
});

describe('S4 skills.json — triggerRate 范围', () => {
  it('主动战法 triggerRate ∈ [0.25, 0.50]', () => {
    for (const s of skills.filter((x) => x.subType === '主动')) {
      expect(s.triggerRate, `${s.id}.triggerRate`).not.toBeNull();
      expect(s.triggerRate, `${s.id}.triggerRate`).toBeGreaterThanOrEqual(0.25);
      expect(s.triggerRate, `${s.id}.triggerRate`).toBeLessThanOrEqual(0.5);
    }
  });

  it('突击战法 triggerRate ∈ [0.30, 0.45]', () => {
    for (const s of skills.filter((x) => x.subType === '突击')) {
      expect(s.triggerRate, `${s.id}.triggerRate`).not.toBeNull();
      expect(s.triggerRate, `${s.id}.triggerRate`).toBeGreaterThanOrEqual(0.3);
      expect(s.triggerRate, `${s.id}.triggerRate`).toBeLessThanOrEqual(0.45);
    }
  });

  it('被动 / 指挥 / 阵法 / 兵种 triggerRate 为 null 或 1.0', () => {
    const passive = (['被动', '指挥', '阵法', '兵种'] as const);
    for (const t of passive) {
      for (const s of skills.filter((x) => x.subType === t)) {
        const r = s.triggerRate;
        const ok = r === null || r === 1.0;
        expect(ok, `${s.id}(${t}).triggerRate=${r}`).toBe(true);
      }
    }
  });
});

describe('S4 skills.json — startRound & schema 通过', () => {
  it('所有记录都通过 SkillSchema(逐条 safeParse)', () => {
    for (const s of skills) {
      const result = SkillSchema.safeParse(s);
      expect(result.success, `id=${s.id}`).toBe(true);
    }
  });

  it('startRound ∈ [1, 8](schema 强校验)', () => {
    for (const s of skills) {
      expect(s.startRound, `${s.id}.startRound`).toBeGreaterThanOrEqual(1);
      expect(s.startRound, `${s.id}.startRound`).toBeLessThanOrEqual(8);
    }
  });

  it('description 长度 10-150 字', () => {
    for (const s of skills) {
      const len = s.description.length;
      expect(len, `${s.id}.description.length=${len}`).toBeGreaterThanOrEqual(10);
      expect(len, `${s.id}.description.length=${len}`).toBeLessThanOrEqual(150);
    }
  });
});

describe('S4 skills.json — multiTarget 字段', () => {
  it('主动 战法:multiTarget true/false 数量差 ≤ 2(大体一半)', () => {
    const list = skills.filter((s) => s.subType === '主动');
    const trues = list.filter((s) => s.multiTarget).length;
    const falses = list.length - trues;
    expect(Math.abs(trues - falses)).toBeLessThanOrEqual(2);
  });

  it('突击 战法:multiTarget true/false 数量差 ≤ 2(大体一半)', () => {
    const list = skills.filter((s) => s.subType === '突击');
    const trues = list.filter((s) => s.multiTarget).length;
    const falses = list.length - trues;
    expect(Math.abs(trues - falses)).toBeLessThanOrEqual(2);
  });

  it('被动 / 指挥 / 阵法 / 兵种 multiTarget 全部 false(范围效果)', () => {
    // 任务明确"被动/指挥/阵法/兵种:false(范围效果)"。
    // 但既有 19 个战法保留不动,其中 ren_de_zai_shi(指挥) multiTarget=true 是历史数据。
    // 本断言只校验本次新增的 31 条均符合规则。
    const passive = (['被动', '指挥', '阵法', '兵种'] as const);
    const newIds = new Set(NEW_SKILL_IDS);
    for (const t of passive) {
      const list = skills.filter((s) => s.subType === t && newIds.has(s.id));
      for (const s of list) {
        expect(s.multiTarget, `${s.id}(${t}).multiTarget`).toBe(false);
      }
    }
  });
});

describe('S4 skills.json — source & sourceType', () => {
  const validSourceType = new Set(['自带', '传承', '拆解', '通用']);

  it('sourceType ∈ {自带, 传承, 拆解, 通用}', () => {
    for (const s of skills) {
      expect(validSourceType.has(s.sourceType), `${s.id}.sourceType=${s.sourceType}`).toBe(true);
    }
  });

  it('source 字段非空', () => {
    for (const s of skills) {
      expect(s.source, `${s.id}.source`).not.toBe('');
    }
  });

  it('通用 战法 (sourceType=通用) carrierIds 至少包含一个武将 id 或为 []', () => {
    // 通用战法通常 carrierIds=[] 或者列了少量武将,本任务允许 [] 或 ['*']
    // 这里只检查 carrierIds 是 array 且元素非空
    for (const s of skills.filter((x) => x.sourceType === '通用')) {
      expect(Array.isArray(s.carrierIds)).toBe(true);
      for (const cid of s.carrierIds) {
        expect(typeof cid).toBe('string');
        expect(cid.length).toBeGreaterThan(0);
      }
    }
  });
});
