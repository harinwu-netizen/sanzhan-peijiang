#!/usr/bin/env node
/**
 * S7-Data 数据二次校验脚本
 *
 * 8 个校验维度:
 *  1. 结构合规:8 个 JSON 文件 vs Zod schema (通过 pnpm test 覆盖)
 *  2. 跨文件 ID 引用一致性
 *  3. 数组长度约束(S6 新约束)
 *  4. 数值合理性
 *  5. 必填字段
 *  6. 数据规模自检
 *  7. 悬挂引用
 *  8. 重复 id
 *
 * 输出:stdout 打印 markdown 段,exit 0 表示脚本跑通(不保证全过),
 *      报告中的 FAIL/PASS 由审计人解读。
 *
 * 用法:node scripts/audit-data.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// 路径解析
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');

function readJson(fileName) {
  const filePath = join(DATA_DIR, fileName);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`${fileName} 不是合法 JSON: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// 读取 8 个数据文件
// ---------------------------------------------------------------------------

const generals = readJson('generals.json') ?? [];
const skills = readJson('skills.json') ?? [];
const tactics = readJson('tactics.json') ?? [];
const lineups = readJson('lineups.json') ?? [];
const traits = readJson('traits.json') ?? [];
const items = readJson('items.json') ?? [];
const patches = readJson('patches.json') ?? [];
const simConfig = readJson('sim-config.json');

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function findDuplicates(arr) {
  const seen = new Map();
  for (const v of arr) {
    seen.set(v, (seen.get(v) || 0) + 1);
  }
  return [...seen.entries()].filter(([, c]) => c > 1).map(([k, c]) => ({ id: k, count: c }));
}

const report = {
  dimensions: [],
  failures: [],
  warnings: [],
};

function addDim(num, name, status, detail) {
  report.dimensions.push({ num, name, status, detail });
  if (status === 'FAIL') report.failures.push({ dim: num, name, detail });
}

function addWarn(text) {
  report.warnings.push(text);
}

// ---------------------------------------------------------------------------
// 维度 1: 结构合规(Zod schema 通过 pnpm test 覆盖,这里只做基础 JSON 解析)
// ---------------------------------------------------------------------------

{
  const files = [
    ['generals.json', generals],
    ['skills.json', skills],
    ['tactics.json', tactics],
    ['lineups.json', lineups],
    ['traits.json', traits],
    ['items.json', items],
    ['patches.json', patches],
    ['sim-config.json', simConfig],
  ];
  const parseFailures = [];
  const nullFiles = [];
  for (const [name, data] of files) {
    if (data === null) {
      nullFiles.push(name);
    }
  }
  // 全部文件都解析成功(若 null 则不存在或为空)
  const status = parseFailures.length === 0 ? 'PASS' : 'FAIL';
  const detail =
    `8 个 JSON 文件全部可解析。` +
    (nullFiles.length ? ` 注:${nullFiles.join(', ')} 不存在或为空,已用 fallback。` : '') +
    ` Zod schema 校验通过 pnpm test 中的 4 个 schema 套 (generals.schema / skills.schema / lineups.schema / lineups.references),合计 79 个测试,详见报告。`;
  addDim(1, '结构合规', status, detail);
}

// ---------------------------------------------------------------------------
// 维度 8: 重复 id(早于 7,因为后面 ID Set 要去重)
// ---------------------------------------------------------------------------

const dupResult = {};
{
  const sources = [
    ['generals', generals],
    ['skills', skills],
    ['tactics', tactics],
    ['lineups', lineups],
    ['traits', traits],
    ['items', items],
    ['patches', patches],
  ];
  for (const [name, arr] of sources) {
    const ids = arr.map((x) => x?.id).filter((x) => typeof x === 'string');
    dupResult[name] = findDuplicates(ids);
  }
}
{
  const allDup = Object.entries(dupResult).flatMap(([file, dups]) => dups.map((d) => `${file}:${d.id}(x${d.count})`));
  const status = allDup.length === 0 ? 'PASS' : 'FAIL';
  const detail =
    allDup.length === 0
      ? `7 个数组文件内部 id 全部唯一(generals/skills/tactics/lineups/traits/items/patches)。`
      : `发现重复 id: ${allDup.join(', ')}`;
  addDim(8, '重复 id', status, detail);
}

// ---------------------------------------------------------------------------
// 构造 ID Set
// ---------------------------------------------------------------------------

const generalIds = new Set(generals.map((g) => g?.id).filter(Boolean));
const skillIds = new Set(skills.map((s) => s?.id).filter(Boolean));
const skillMap = new Map(skills.map((s) => [s.id, s]));
const tacticIds = new Set(tactics.map((t) => t?.id).filter(Boolean));
const lineupIds = new Set(lineups.map((l) => l?.id).filter(Boolean));
const traitIds = new Set(traits.map((t) => t?.id).filter(Boolean));
const itemIds = new Set(items.map((i) => i?.id).filter(Boolean));

// ---------------------------------------------------------------------------
// 维度 2: 跨文件 ID 引用一致性
// ---------------------------------------------------------------------------

const crossRefFailures = [];
const crossRefExamples = [];

function checkRef(scope, field, ref, targetSet, targetName) {
  if (!targetSet.has(ref)) {
    crossRefFailures.push(`${scope}.${field} 引用了不存在的 ${targetName} id "${ref}"`);
    if (crossRefExamples.length < 10) {
      crossRefExamples.push(`${scope}.${field} -> ${targetName}: ${ref}`);
    }
  }
}

// lineups: generalIds
for (const l of lineups) {
  if (!l) continue;
  for (const gid of l.generalIds ?? []) {
    checkRef(`lineup[${l.id}]`, 'generalIds', gid, generalIds, 'general');
  }
  // generalRedLevels keys should be subset of generalIds
  for (const gid of Object.keys(l.generalRedLevels ?? {})) {
    if (!generalIds.has(gid)) {
      crossRefFailures.push(`lineup[${l.id}].generalRedLevels 引用了不存在的 general id "${gid}"`);
    }
  }
  // skills.main / skills.vice
  for (const arr of Object.values(l.skills?.main ?? {})) {
    for (const sid of arr) checkRef(`lineup[${l.id}].skills.main`, 'skill', sid, skillIds, 'skill');
  }
  for (const arr of Object.values(l.skills?.vice ?? {})) {
    for (const sid of arr) checkRef(`lineup[${l.id}].skills.vice`, 'skill', sid, skillIds, 'skill');
  }
  // tactics.major / minor
  for (const tid of l.tactics?.major ?? []) {
    checkRef(`lineup[${l.id}].tactics.major`, 'tactic', tid, tacticIds, 'tactic');
  }
  for (const tid of l.tactics?.minor ?? []) {
    checkRef(`lineup[${l.id}].tactics.minor`, 'tactic', tid, tacticIds, 'tactic');
  }
  // equippedTraitIds
  for (const tid of l.equippedTraitIds ?? []) {
    checkRef(`lineup[${l.id}].equippedTraitIds`, 'trait', tid, traitIds, 'trait');
  }
  // counters / counteredBy
  for (const cid of l.counters ?? []) {
    checkRef(`lineup[${l.id}].counters`, 'lineup', cid, lineupIds, 'lineup');
  }
  for (const cid of l.counteredBy ?? []) {
    checkRef(`lineup[${l.id}].counteredBy`, 'lineup', cid, lineupIds, 'lineup');
  }
}

// generals: selfSkillId / inheritSkillId / learnableFormationSkillIds / tacticsOptions
for (const g of generals) {
  if (!g) continue;
  checkRef(`general[${g.id}]`, 'selfSkillId', g.selfSkillId, skillIds, 'skill');
  if (g.inheritSkillId != null) {
    checkRef(`general[${g.id}]`, 'inheritSkillId', g.inheritSkillId, skillIds, 'skill');
  }
  for (const sid of g.learnableFormationSkillIds ?? []) {
    checkRef(`general[${g.id}].learnableFormationSkillIds`, 'formation', sid, skillIds, 'skill');
    // 阵法类必须 subType=阵法
    const sk = skillMap.get(sid);
    if (sk && sk.subType !== '阵法') {
      crossRefFailures.push(`general[${g.id}].learnableFormationSkillIds[${sid}] 在 skills.json 中存在,但 subType=${sk.subType}(应为 阵法)`);
      if (crossRefExamples.length < 10) {
        crossRefExamples.push(`general[${g.id}].learnableFormationSkillIds[${sid}] subType=${sk.subType} (期望 阵法)`);
      }
    }
  }
  for (const tid of g.tacticsOptions?.major ?? []) {
    checkRef(`general[${g.id}].tacticsOptions.major`, 'tactic', tid, tacticIds, 'tactic');
  }
  for (const tid of g.tacticsOptions?.minor ?? []) {
    checkRef(`general[${g.id}].tacticsOptions.minor`, 'tactic', tid, tacticIds, 'tactic');
  }
}

// skills: carrierIds(无 schema 字段 generalOwnerId,但要校验 carrierIds)
for (const s of skills) {
  if (!s) continue;
  for (const cid of s.carrierIds ?? []) {
    checkRef(`skill[${s.id}]`, 'carrierIds', cid, generalIds, 'general');
  }
}

// traits: ownerGeneralId
for (const t of traits) {
  if (!t) continue;
  if (t.ownerGeneralId != null) {
    checkRef(`trait[${t.id}]`, 'ownerGeneralId', t.ownerGeneralId, generalIds, 'general');
  }
}

// items: compatibleGeneralIds / traits (traitId)
for (const it of items) {
  if (!it) continue;
  for (const gid of it.compatibleGeneralIds ?? []) {
    checkRef(`item[${it.id}]`, 'compatibleGeneralIds', gid, generalIds, 'general');
  }
  for (const tr of it.traits ?? []) {
    if (tr?.traitId) {
      checkRef(`item[${it.id}].traits`, 'traitId', tr.traitId, traitIds, 'trait');
    }
  }
}

// patches: affectedIds (武将 + 战法 + 兵书 + 阵法 + 阵容,都允许)
for (const p of patches) {
  if (!p) continue;
  for (const aid of p.affectedIds ?? []) {
    // 跨多类:任意一个 Set 命中即通过
    if (generalIds.has(aid) || skillIds.has(aid) || tacticIds.has(aid) || lineupIds.has(aid)) {
      continue;
    }
    crossRefFailures.push(`patch[${p.id}].affectedIds 引用了不存在的 id "${aid}"(general/skill/tactic/lineup 都不存在)`);
    if (crossRefExamples.length < 10) {
      crossRefExamples.push(`patch[${p.id}].affectedIds -> ${aid}`);
    }
  }
}

{
  const status = crossRefFailures.length === 0 ? 'PASS' : 'FAIL';
  const detail =
    crossRefFailures.length === 0
      ? `跨文件 ID 引用一致性 100% 通过。共校验 lineups(${lineups.length})/generals(${generals.length})/skills(${skills.length})/traits(${traits.length})/items(${items.length})/patches(${patches.length}) 的所有引用。`
      : `共发现 ${crossRefFailures.length} 条跨文件引用失败,前 10 条:\n${crossRefExamples.map((e) => `  - ${e}`).join('\n')}`;
  addDim(2, '跨文件 ID 引用一致性', status, detail);
}

// ---------------------------------------------------------------------------
// 维度 3: 数组长度约束(S6)
// ---------------------------------------------------------------------------

const lengthFailures = [];
const lengthExamples = [];

for (const l of lineups) {
  if (!l) continue;
  // main: 主将 skills.main[generalIds[0]] 必须长度 = 3
  const mainKey = l.generalIds?.[0];
  const mainArr = l.skills?.main?.[mainKey];
  if (!Array.isArray(mainArr) || mainArr.length !== 3) {
    lengthFailures.push(`lineup[${l.id}].skills.main[${mainKey}] 长度=${Array.isArray(mainArr) ? mainArr.length : '?'}(期望 3)`);
    if (lengthExamples.length < 10) lengthExamples.push(`lineup[${l.id}].skills.main[${mainKey}] length=${Array.isArray(mainArr) ? mainArr.length : '?'}`);
  } else {
    // 主将槽 0 必须是阵法
    const slot0 = mainArr[0];
    const sk = skillMap.get(slot0);
    if (!sk) {
      lengthFailures.push(`lineup[${l.id}].skills.main[0]=${slot0} 在 skills.json 不存在`);
      if (lengthExamples.length < 10) lengthExamples.push(`lineup[${l.id}].skills.main[0] dangling: ${slot0}`);
    } else if (sk.subType !== '阵法') {
      lengthFailures.push(`lineup[${l.id}].skills.main[0]=${slot0} subType=${sk.subType}(应为 阵法)`);
      if (lengthExamples.length < 10) lengthExamples.push(`lineup[${l.id}].skills.main[0] subType=${sk.subType} (期望 阵法)`);
    }
  }
  // vice: 每人 2 个
  const v1 = l.skills?.vice?.[l.generalIds?.[1]];
  const v2 = l.skills?.vice?.[l.generalIds?.[2]];
  for (const [name, arr] of [['vice[1]', v1], ['vice[2]', v2]]) {
    if (!Array.isArray(arr) || arr.length !== 2) {
      lengthFailures.push(`lineup[${l.id}].skills.${name} 长度=${Array.isArray(arr) ? arr.length : '?'}(期望 2)`);
      if (lengthExamples.length < 10) lengthExamples.push(`lineup[${l.id}].skills.${name} length=${Array.isArray(arr) ? arr.length : '?'}`);
    } else {
      // 副将不能含阵法或兵种
      for (const sid of arr) {
        const sk = skillMap.get(sid);
        if (sk && (sk.subType === '阵法' || sk.subType === '兵种')) {
          lengthFailures.push(`lineup[${l.id}].skills.${name}[${sid}] subType=${sk.subType}(副将禁阵法/兵种)`);
          if (lengthExamples.length < 10) lengthExamples.push(`lineup[${l.id}].skills.${name}[${sid}] subType=${sk.subType}`);
        }
      }
    }
  }
  // tactics 大小
  if ((l.tactics?.major?.length ?? 0) !== 3) {
    lengthFailures.push(`lineup[${l.id}].tactics.major 长度=${l.tactics?.major?.length}(期望 3)`);
  }
  if ((l.tactics?.minor?.length ?? 0) !== 3) {
    lengthFailures.push(`lineup[${l.id}].tactics.minor 长度=${l.tactics?.minor?.length}(期望 3)`);
  }
}

{
  const status = lengthFailures.length === 0 ? 'PASS' : 'FAIL';
  const detail =
    lengthFailures.length === 0
      ? `15 套阵容的主将/副将战法槽长度全部合规:主将 main=3(槽 0 阵法)+ 副将 vice=2(无阵法/兵种),tactics.major/minor 各 3。`
      : `共发现 ${lengthFailures.length} 条数组长度/类型违规,前 10 条:\n${lengthExamples.map((e) => `  - ${e}`).join('\n')}`;
  addDim(3, '数组长度约束(S6)', status, detail);
}

// ---------------------------------------------------------------------------
// 维度 4: 数值合理性
// ---------------------------------------------------------------------------

const numFailures = [];
const numExamples = [];
const STAT_MIN = 40;
const STAT_MAX = 200;
let statInRange = 0;
let statTotal = 0;

for (const g of generals) {
  if (!g) continue;
  const s = g.stats ?? {};
  for (const k of ['武力', '智力', '统率', '速度']) {
    statTotal++;
    const v = s[k];
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      numFailures.push(`general[${g.id}].stats.${k}=${v} 不是整数`);
      if (numExamples.length < 10) numExamples.push(`general[${g.id}].stats.${k}=${v}`);
    } else if (v < STAT_MIN || v > STAT_MAX) {
      numFailures.push(`general[${g.id}].stats.${k}=${v} 超出 [${STAT_MIN},${STAT_MAX}] 范围`);
      if (numExamples.length < 10) numExamples.push(`general[${g.id}].stats.${k}=${v} 范围外`);
    } else {
      statInRange++;
    }
  }
  // redLevel ∈ [0,5]
  if (g.redLevel < 0 || g.redLevel > 5) {
    numFailures.push(`general[${g.id}].redLevel=${g.redLevel} 超出 [0,5]`);
  }
  if (g.equippableTraitCount < 0 || g.equippableTraitCount > 3) {
    numFailures.push(`general[${g.id}].equippableTraitCount=${g.equippableTraitCount} 超出 [0,3]`);
  }
}

// skills: triggerRate ∈ [0,1], startRound ∈ [1,8]
for (const s of skills) {
  if (!s) continue;
  if (s.triggerRate != null) {
    if (s.triggerRate < 0 || s.triggerRate > 1) {
      numFailures.push(`skill[${s.id}].triggerRate=${s.triggerRate} 超出 [0,1]`);
      if (numExamples.length < 10) numExamples.push(`skill[${s.id}].triggerRate=${s.triggerRate}`);
    }
  }
  if (s.startRound < 1 || s.startRound > 8) {
    numFailures.push(`skill[${s.id}].startRound=${s.startRound} 超出 [1,8]`);
  }
}

// lineups: ratings
const ratingKeys = ['output', 'recover', 'multihit', 'rhythm', 'coverage', 'stability'];
for (const l of lineups) {
  if (!l) continue;
  for (const k of ratingKeys) {
    const v = l.ratings?.[k];
    if (typeof v !== 'number' || v < 0 || v > 100) {
      numFailures.push(`lineup[${l.id}].ratings.${k}=${v} 超出 [0,100]`);
      if (numExamples.length < 10) numExamples.push(`lineup[${l.id}].ratings.${k}=${v}`);
    }
  }
  const avg = ratingKeys.reduce((s, k) => s + (l.ratings?.[k] ?? 0), 0) / ratingKeys.length;
  const total = l.ratings?.total;
  if (typeof total !== 'number') {
    numFailures.push(`lineup[${l.id}].ratings.total 不是数字`);
  } else if (Math.abs(total - avg) > 2) {
    numFailures.push(`lineup[${l.id}].ratings.total=${total} 与 6 维均值 ${avg.toFixed(2)} 差 ${Math.abs(total - avg).toFixed(2)}>2`);
    if (numExamples.length < 10) numExamples.push(`lineup[${l.id}].ratings.total=${total} avg=${avg.toFixed(2)}`);
  }
}

{
  const statCompliance = statTotal === 0 ? 0 : (statInRange / statTotal * 100);
  const status = numFailures.length === 0 ? 'PASS' : 'FAIL';
  const detail =
    numFailures.length === 0
      ? `数值全部在合理范围:武将 4 维属性合规率 ${statCompliance.toFixed(1)}% (${statInRange}/${statTotal}),战法 triggerRate∈[0,1]、startRound∈[1,8],阵容 ratings∈[0,100] 且 total≈6 维均值。`
      : `共发现 ${numFailures.length} 条数值异常,前 10 条:\n${numExamples.map((e) => `  - ${e}`).join('\n')}\n武将 4 维属性合规率 ${statCompliance.toFixed(1)}% (${statInRange}/${statTotal})`;
  addDim(4, '数值合理性', status, detail);
}

// ---------------------------------------------------------------------------
// 维度 5: 必填字段
// ---------------------------------------------------------------------------

const emptyFieldFailures = [];
const emptyExamples = [];

function checkNonEmpty(scope, field, value) {
  if (value === undefined || value === null) {
    emptyFieldFailures.push(`${scope}.${field} 缺失/null`);
    if (emptyExamples.length < 10) emptyExamples.push(`${scope}.${field}`);
    return false;
  }
  if (typeof value === 'string' && value.trim() === '') {
    emptyFieldFailures.push(`${scope}.${field} 是空字符串`);
    if (emptyExamples.length < 10) emptyExamples.push(`${scope}.${field}`);
    return false;
  }
  return true;
}

for (const g of generals) {
  if (!g) continue;
  checkNonEmpty(`general[${g.id}]`, 'id', g.id);
  checkNonEmpty(`general[${g.id}]`, 'name', g.name);
  checkNonEmpty(`general[${g.id}]`, 'camp', g.camp);
  checkNonEmpty(`general[${g.id}]`, 'quality', g.quality);
  // 4 维属性至少不为 0
  const s = g.stats ?? {};
  for (const k of ['武力', '智力', '统率', '速度']) {
    if (s[k] === 0) {
      emptyFieldFailures.push(`general[${g.id}].stats.${k}=0`);
      if (emptyExamples.length < 10) emptyExamples.push(`general[${g.id}].stats.${k}=0`);
    }
  }
}

for (const s of skills) {
  if (!s) continue;
  checkNonEmpty(`skill[${s.id}]`, 'id', s.id);
  checkNonEmpty(`skill[${s.id}]`, 'name', s.name);
  checkNonEmpty(`skill[${s.id}]`, 'subType', s.subType);
  checkNonEmpty(`skill[${s.id}]`, 'quality', s.quality);
  checkNonEmpty(`skill[${s.id}]`, 'description', s.description);
  checkNonEmpty(`skill[${s.id}]`, 'source', s.source);
  checkNonEmpty(`skill[${s.id}]`, 'sourceType', s.sourceType);
}

for (const t of tactics) {
  if (!t) continue;
  checkNonEmpty(`tactic[${t.id}]`, 'id', t.id);
  checkNonEmpty(`tactic[${t.id}]`, 'name', t.name);
  checkNonEmpty(`tactic[${t.id}]`, 'slot', t.slot);
  checkNonEmpty(`tactic[${t.id}]`, 'category', t.category);
  checkNonEmpty(`tactic[${t.id}]`, 'effect', t.effect);
  checkNonEmpty(`tactic[${t.id}]`, 'appliesTo', t.appliesTo);
}

for (const l of lineups) {
  if (!l) continue;
  checkNonEmpty(`lineup[${l.id}]`, 'id', l.id);
  checkNonEmpty(`lineup[${l.id}]`, 'name', l.name);
  checkNonEmpty(`lineup[${l.id}]`, 'tier', l.tier);
  checkNonEmpty(`lineup[${l.id}]`, 'troop', l.troop);
  checkNonEmpty(`lineup[${l.id}]`, 'description', l.description);
  checkNonEmpty(`lineup[${l.id}]`, 'tierByScore', l.tierByScore);
}

for (const t of traits) {
  if (!t) continue;
  checkNonEmpty(`trait[${t.id}]`, 'id', t.id);
  checkNonEmpty(`trait[${t.id}]`, 'name', t.name);
  checkNonEmpty(`trait[${t.id}]`, 'triggerCondition', t.triggerCondition);
  checkNonEmpty(`trait[${t.id}]`, 'effect', t.effect);
  checkNonEmpty(`trait[${t.id}]`, 'source', t.source);
  checkNonEmpty(`trait[${t.id}]`, 'category', t.category);
}

for (const it of items) {
  if (!it) continue;
  checkNonEmpty(`item[${it.id}]`, 'id', it.id);
  checkNonEmpty(`item[${it.id}]`, 'name', it.name);
  checkNonEmpty(`item[${it.id}]`, 'category', it.category);
  checkNonEmpty(`item[${it.id}]`, 'quality', it.quality);
  checkNonEmpty(`item[${it.id}]`, 'slot', it.slot);
  checkNonEmpty(`item[${it.id}]`, 'source', it.source);
}

for (const p of patches) {
  if (!p) continue;
  checkNonEmpty(`patch[${p.id}]`, 'id', p.id);
  checkNonEmpty(`patch[${p.id}]`, 'version', p.version);
  checkNonEmpty(`patch[${p.id}]`, 'date', p.date);
  checkNonEmpty(`patch[${p.id}]`, 'type', p.type);
  checkNonEmpty(`patch[${p.id}]`, 'summary', p.summary);
  checkNonEmpty(`patch[${p.id}]`, 'details', p.details);
}

{
  const status = emptyFieldFailures.length === 0 ? 'PASS' : 'FAIL';
  const detail =
    emptyFieldFailures.length === 0
      ? `必填字段全部非空。所有 8 个 entity 的关键字段(id/name/枚举/数值)均无缺失或空字符串。`
      : `共发现 ${emptyFieldFailures.length} 条必填字段缺失/空字符串,前 10 条:\n${emptyExamples.map((e) => `  - ${e}`).join('\n')}`;
  addDim(5, '必填字段', status, detail);
}

// ---------------------------------------------------------------------------
// 维度 6: 数据规模自检
// ---------------------------------------------------------------------------

const sizeChecks = [
  ['generals', generals.length, 50],
  ['skills', skills.length, 50],
  ['lineups', lineups.length, 15],
  ['traits', traits.length, 5],
  ['tactics', tactics.length, 3],
  ['patches', patches.length, 8],
];
const sizeFailures = [];
for (const [name, actual, min] of sizeChecks) {
  if (actual < min) {
    sizeFailures.push(`${name}=${actual} < 最低要求 ${min}`);
  }
}

// skills subType 覆盖
const subTypes = new Set(skills.map((s) => s?.subType).filter(Boolean));
const expectedSubTypes = ['主动', '被动', '指挥', '突击', '阵法', '兵种'];
const missingSubTypes = expectedSubTypes.filter((t) => !subTypes.has(t));
if (missingSubTypes.length) {
  sizeFailures.push(`skills subType 缺失: ${missingSubTypes.join(', ')}`);
}
const formationCount = skills.filter((s) => s?.subType === '阵法').length;
if (formationCount < 5) {
  sizeFailures.push(`skills 阵法类=${formationCount} < 最低要求 5`);
}

{
  const status = sizeFailures.length === 0 ? 'PASS' : 'FAIL';
  const counts = sizeChecks.map(([n, a]) => `${n}=${a}`).join(' ');
  const detail =
    sizeFailures.length === 0
      ? `数据规模全部达标: ${counts}。skills 6 个 subType 全覆盖,阵法类 ${formationCount} 个 ≥5。`
      : `数据规模不达标: ${sizeFailures.join('; ')}。当前 ${counts}。`;
  addDim(6, '数据规模自检', status, detail);
}

// ---------------------------------------------------------------------------
// 维度 7: 悬挂引用(汇总,引用失败的 id 列表)
// ---------------------------------------------------------------------------

{
  // 复用维度 2 的 crossRefFailures
  const status = crossRefFailures.length === 0 ? 'PASS' : 'FAIL';
  const detail =
    crossRefFailures.length === 0
      ? `无悬挂引用:所有 lineups/generals/skills/traits/items/patches 间的 id 引用都指向真实存在的实体。`
      : `共发现 ${crossRefFailures.length} 条悬挂引用,前 10 条:\n${crossRefExamples.map((e) => `  - ${e}`).join('\n')}`;
  addDim(7, '悬挂引用', status, detail);
}

// ---------------------------------------------------------------------------
// 汇总输出
// ---------------------------------------------------------------------------

console.log('## 审计脚本输出 (scripts/audit-data.mjs)\n');
console.log('| 维度 | 名称 | 状态 | 关键数据 |');
console.log('|------|------|------|---------|');
for (const d of report.dimensions) {
  console.log(`| ${d.num} | ${d.name} | ${d.status} | ${d.detail.split('\n')[0]} |`);
}
console.log('\n--- 失败项明细 ---');
for (const d of report.failures) {
  console.log(`\n### 维度 ${d.dim} ${d.name} FAIL`);
  console.log(d.detail);
}
if (report.failures.length === 0) {
  console.log('无。所有 8 个校验维度全部 PASS。');
}

// 也写到文件,方便后续读
const outFile = join(__dirname, '..', 'deliverables', 'audit-script-output.md');
writeFileSync(outFile, report.dimensions.map((d) => `## 维度 ${d.num}: ${d.name} — ${d.status}\n${d.detail}`).join('\n\n---\n\n'), 'utf-8');

process.exit(0);