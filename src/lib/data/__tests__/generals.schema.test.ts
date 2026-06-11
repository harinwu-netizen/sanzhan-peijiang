/**
 * S4-Data generals.json schema validation test.
 *
 *目标:
 *1. data/generals.json 一共50 条,且全部通过 GeneralSchema
 *2. id唯一
 *3. camp分布满足 S4任务要求(魏 ≥12,蜀 ≥13, 吴 ≥12,群 ≥8)
 *4. SP武将数量 ≥5
 *5. quality分布合理(有橙/紫/蓝3档)
 *6.4维属性范围合理(0-300整数,且武力型 /智力型 /防御型比例符合预期)
 *7.既有5 个蜀将(诸葛亮/刘备/张飞/关羽/赵云)id 必须保留
 *8. 新武将 selfSkillId 必须为新加的(不与既有19 个 skill id冲突)
 * (xiaoqiao/liu_ba/yu_ji 等武将允许 inheritSkillId = null)
 *
 *依赖 `pnpm test`(vitest)。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GeneralSchema, GeneralsFileSchema, type General } from '../schemas';

let generals: General[] = [];

/**
 *既有5 个蜀将 id列表(S4之前已存在,本任务保留不动)。
 */
const EXISTING_GENERAL_IDS: readonly string[] = [
 'zhuge_liang',
 'liu_bei',
 'zhang_fei',
 'guan_yu',
 'zhao_yun',
];

/**
 *既有19 个战法 id(S4-Data skills任务之前的19 个)。
 * 新武将的 selfSkillId 不应该与之冲突。
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

beforeAll(() => {
 // 直接读仓库根 data/generals.json(避开 loader缓存)
 const filePath = resolve(process.cwd(), 'data', 'generals.json');
 const raw = readFileSync(filePath, 'utf-8');
 const parsed = JSON.parse(raw);
 // 用 GeneralsFileSchema整体校验一次,失败会抛
 generals = GeneralsFileSchema.parse(parsed);
});

describe('S4 generals.json — 总数与 id唯一', () => {
 it('共50 条武将', () => {
 expect(generals).toHaveLength(50);
 });

 it('id唯一', () => {
 const ids = generals.map((g) => g.id);
 const unique = new Set(ids);
 expect(unique.size).toBe(ids.length);
 });

 it('id全部 snake_case(只含 [a-z0-9_] 且非空)', () => {
 const re = /^[a-z0-9_]+$/;
 for (const g of generals) {
 expect(g.id, `id=${g.id}`).toMatch(re);
 }
 });

 it('既有5 个蜀将 id全部保留', () => {
 const ids = new Set(generals.map((g) => g.id));
 for (const id of EXISTING_GENERAL_IDS) {
 expect(ids.has(id), `missing existing id: ${id}`).toBe(true);
 }
 });
});

describe('S4 generals.json — camp分布', () => {
 it('魏 ≥12', () => {
 const count = generals.filter((g) => g.camp === '魏').length;
 expect(count).toBeGreaterThanOrEqual(12);
 });

 it('蜀 ≥13', () => {
 const count = generals.filter((g) => g.camp === '蜀').length;
 expect(count).toBeGreaterThanOrEqual(13);
 });

 it('吴 ≥12', () => {
 const count = generals.filter((g) => g.camp === '吴').length;
 expect(count).toBeGreaterThanOrEqual(12);
 });

 it('群 ≥8', () => {
 const count = generals.filter((g) => g.camp === '群').length;
 expect(count).toBeGreaterThanOrEqual(8);
 });

 it('4 个 camp全部覆盖', () => {
 const present = new Set(generals.map((g) => g.camp));
 expect(present).toEqual(new Set(['魏', '蜀', '吴', '群']));
 });
});

describe('S4 generals.json — quality分布', () => {
 it('quality ∈ {橙,紫,蓝}', () => {
 const valid = new Set(['橙', '紫', '蓝']);
 for (const g of generals) {
 expect(valid.has(g.quality), `${g.id}.quality=${g.quality}`).toBe(true);
 }
 });

 it('至少包含40橙 +8紫 +2蓝', () => {
 const counts = {橙:0,紫:0,蓝:0 };
 for (const g of generals) counts[g.quality]++;
 expect(counts['橙']).toBeGreaterThanOrEqual(40);
 expect(counts['紫']).toBeGreaterThanOrEqual(8);
 expect(counts['蓝']).toBeGreaterThanOrEqual(2);
 });
});

describe('S4 generals.json — SP武将', () => {
 it('SP武将数 ≥5', () => {
 const sp = generals.filter((g) => g.isSP === true);
 expect(sp.length).toBeGreaterThanOrEqual(5);
 });

 it('SP武将的 name 以 "SP "开头', () => {
 const sp = generals.filter((g) => g.isSP === true);
 expect(sp.length).toBeGreaterThanOrEqual(5);
 for (const g of sp) {
 expect(g.name.startsWith('SP '), `${g.id}.name=${g.name}`).toBe(true);
 }
 });
});

describe('S4 generals.json —4维属性范围', () => {
 it('4维属性均为0-300 的整数', () => {
 for (const g of generals) {
 for (const k of ['武力', '智力', '统率', '速度'] as const) {
 const v = g.stats[k];
 expect(Number.isInteger(v), `${g.id}.stats.${k}=${v}`).toBe(true);
 expect(v, `${g.id}.stats.${k}=${v}`).toBeGreaterThanOrEqual(0);
 expect(v, `${g.id}.stats.${k}=${v}`).toBeLessThanOrEqual(300);
 }
 }
 });

 it('武力型武将示例:张飞 /关羽 /吕布 /典韦 / 许褚武力 ≥160', () => {
 const ids = ['zhang_fei', 'guan_yu', 'lv_bu', 'dian_wei', 'xu_chu'];
 for (const id of ids) {
 const g = generals.find((x) => x.id === id);
 expect(g, `missing ${id}`).toBeDefined();
 expect(g!.stats['武力'], `${id}.武力`).toBeGreaterThanOrEqual(160);
 }
 });

 it('智力型武将示例:诸葛亮 /司马懿 / 郭嘉智力 ≥150', () => {
 const ids = ['zhuge_liang', 'sima_yi', 'guo_jia'];
 for (const id of ids) {
 const g = generals.find((x) => x.id === id);
 expect(g, `missing ${id}`).toBeDefined();
 expect(g!.stats['智力'], `${id}.智力`).toBeGreaterThanOrEqual(150);
 }
 });

 it('防御型武将示例:曹操 / 刘备 / 华佗统率 ≥110', () => {
 const ids = ['cao_cao', 'liu_bei', 'hua_tuo'];
 for (const id of ids) {
 const g = generals.find((x) => x.id === id);
 expect(g, `missing ${id}`).toBeDefined();
 expect(g!.stats['统率'], `${id}.统率`).toBeGreaterThanOrEqual(110);
 }
 });
});

describe('S4 generals.json —兵种适性合法', () => {
 it('5 个兵种适性 ∈ {S, A, B, C}', () => {
 const valid = new Set(['S', 'A', 'B', 'C']);
 const keys = ['cavalry', 'shield', 'archer', 'spear', 'siege'] as const;
 for (const g of generals) {
 for (const k of keys) {
 expect(valid.has(g[k]), `${g.id}.${k}=${g[k]}`).toBe(true);
 }
 }
 });
});

describe('S4 generals.json — trait / selfSkillId / inheritSkillId', () => {
 it('trait ∈6 类', () => {
 const valid = new Set(['主动', '被动', '指挥', '突击', '阵法', '兵种']);
 for (const g of generals) {
 expect(valid.has(g.trait), `${g.id}.trait=${g.trait}`).toBe(true);
 }
 });

 it('既有5 个蜀将的 selfSkillId 必须仍然为既有 skill id', () => {
 const existing5Ids = new Set(EXISTING_GENERAL_IDS);
 const existingSkillIds = new Set(EXISTING_SKILL_IDS);
 for (const g of generals) {
 if (existing5Ids.has(g.id)) {
 expect(
 existingSkillIds.has(g.selfSkillId),
 `${g.id}.selfSkillId=${g.selfSkillId} not in EXISTING_SKILL_IDS`
 ).toBe(true);
 }
 }
 });

 it('新武将(非既有5 个)的 selfSkillId 不应与既有19 个 skill id冲突', () => {
 //任务要求:新武将的 selfSkillId必须是新加的。
 const existing5Ids = new Set(EXISTING_GENERAL_IDS);
 const existingSkillIds = new Set(EXISTING_SKILL_IDS);
 const newSelfIds = generals
 .filter((g) => !existing5Ids.has(g.id))
 .map((g) => g.selfSkillId);
 const uniqueNew = new Set(newSelfIds);
 // unique selfSkillId across new generals
 expect(uniqueNew.size).toBe(newSelfIds.length);
 // none of new selfSkillId should be in EXISTING_SKILL_IDS
 for (const id of newSelfIds) {
 expect(
 existingSkillIds.has(id) === false,
 `new selfSkillId ${id} collides with EXISTING skill id`
 ).toBe(true);
 }
 // all new selfSkillId must be snake_case
 const re = /^[a-z0-9_]+$/;
 for (const id of newSelfIds) {
 expect(id).toMatch(re);
 }
 });

 it('inheritSkillId 要么是 snake_case字符串要么是 null', () => {
 const re = /^[a-z0-9_]+$/;
 for (const g of generals) {
 const v = g.inheritSkillId;
 if (v === null) continue;
 expect(typeof v).toBe('string');
 expect(v.length).toBeGreaterThan(0);
 expect(v).toMatch(re);
 }
 });

 it('inheritSkillId至少有一个 null(模拟"没传承"的武将)', () => {
 const nullCount = generals.filter((g) => g.inheritSkillId === null).length;
 expect(nullCount).toBeGreaterThanOrEqual(1);
 });
});

describe('S4 generals.json — learnableFormationSkillIds & tacticsOptions', () => {
 it('learnableFormationSkillIds长度 ∈ [1,2]', () => {
 for (const g of generals) {
 const n = g.learnableFormationSkillIds.length;
 expect(n, `${g.id}.learnableFormationSkillIds.length=${n}`).toBeGreaterThanOrEqual(1);
 expect(n, `${g.id}.learnableFormationSkillIds.length=${n}`).toBeLessThanOrEqual(2);
 }
 });

 it('learnableFormationSkillIds 中所有 id 都是 snake_case字符串', () => {
 const re = /^[a-z0-9_]+$/;
 for (const g of generals) {
 for (const id of g.learnableFormationSkillIds) {
 expect(id).toMatch(re);
 }
 }
 });

 it('tacticsOptions.major长度 ∈ [1,2]', () => {
 for (const g of generals) {
 const n = g.tacticsOptions.major.length;
 expect(n, `${g.id}.tacticsOptions.major.length=${n}`).toBeGreaterThanOrEqual(1);
 expect(n, `${g.id}.tacticsOptions.major.length=${n}`).toBeLessThanOrEqual(2);
 }
 });

 it('tacticsOptions.minor长度 ≥1', () => {
 for (const g of generals) {
 const n = g.tacticsOptions.minor.length;
 expect(n, `${g.id}.tacticsOptions.minor.length=${n}`).toBeGreaterThanOrEqual(1);
 }
 });

 it('tacticsOptions引用现有 tactic ids', () => {
 const validTactics = new Set(['tactic_001', 'tactic_002', 'tactic_101']);
 for (const g of generals) {
 for (const t of [...g.tacticsOptions.major, ...g.tacticsOptions.minor]) {
 expect(validTactics.has(t), `${g.id} tactic=${t} not in valid set`).toBe(true);
 }
 }
 });
});

describe('S4 generals.json — redLevel & equippableTraitCount', () => {
 it('redLevel ∈ [0,5]', () => {
 for (const g of generals) {
 expect(g.redLevel, `${g.id}.redLevel=${g.redLevel}`).toBeGreaterThanOrEqual(0);
 expect(g.redLevel, `${g.id}.redLevel=${g.redLevel}`).toBeLessThanOrEqual(5);
 }
 });

 it('equippableTraitCount ∈ [0,3]', () => {
 for (const g of generals) {
 expect(g.equippableTraitCount, `${g.id}.equippableTraitCount=${g.equippableTraitCount}`).toBeGreaterThanOrEqual(0);
 expect(g.equippableTraitCount, `${g.id}.equippableTraitCount=${g.equippableTraitCount}`).toBeLessThanOrEqual(3);
 }
 });
});

describe('S4 generals.json — schema 通过', () => {
 it('所有记录都通过 GeneralSchema(逐条 safeParse)', () => {
 for (const g of generals) {
 const result = GeneralSchema.safeParse(g);
 expect(result.success, `id=${g.id}`).toBe(true);
 }
 });
});
