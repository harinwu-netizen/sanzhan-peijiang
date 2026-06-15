#!/usr/bin/env node
/**
 * S7-Data 详细失败分类 — 给报告用
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = __dirname;
const DATA_DIR = join(PROJECT_ROOT, '..', 'data');

function readJson(fileName) {
  const filePath = join(DATA_DIR, fileName);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

const generals = readJson('generals.json') ?? [];
const skills = readJson('skills.json') ?? [];
const tactics = readJson('tactics.json') ?? [];
const lineups = readJson('lineups.json') ?? [];
const traits = readJson('traits.json') ?? [];

const generalIds = new Set(generals.map((g) => g?.id));
const skillIds = new Set(skills.map((s) => s?.id));
const skillMap = new Map(skills.map((s) => [s.id, s]));

// --- 悬挂引用按目标分类 ---
const danglingByTarget = { general: new Map(), skill: new Map(), tactic: new Map(), lineup: new Map(), trait: new Map() };
function recordDangling(target, scope, ref) {
  const m = danglingByTarget[target];
  if (!m.has(ref)) m.set(ref, []);
  m.get(ref).push(scope);
}

for (const l of lineups) {
  if (!l) continue;
  for (const gid of l.generalIds ?? []) {
    if (!generalIds.has(gid)) recordDangling('general', `lineup[${l.id}].generalIds`, gid);
  }
  for (const arr of Object.values(l.skills?.main ?? {})) {
    for (const sid of arr) {
      if (!skillIds.has(sid)) recordDangling('skill', `lineup[${l.id}].skills.main`, sid);
    }
  }
  for (const arr of Object.values(l.skills?.vice ?? {})) {
    for (const sid of arr) {
      if (!skillIds.has(sid)) recordDangling('skill', `lineup[${l.id}].skills.vice`, sid);
    }
  }
  for (const cid of l.counters ?? []) {
    if (!new Set(lineups.map((x) => x.id)).has(cid)) recordDangling('lineup', `lineup[${l.id}].counters`, cid);
  }
  for (const cid of l.counteredBy ?? []) {
    if (!new Set(lineups.map((x) => x.id)).has(cid)) recordDangling('lineup', `lineup[${l.id}].counteredBy`, cid);
  }
}

for (const g of generals) {
  if (!g) continue;
  if (!skillIds.has(g.selfSkillId)) recordDangling('skill', `general[${g.id}].selfSkillId`, g.selfSkillId);
  if (g.inheritSkillId != null && !skillIds.has(g.inheritSkillId)) recordDangling('skill', `general[${g.id}].inheritSkillId`, g.inheritSkillId);
  for (const sid of g.learnableFormationSkillIds ?? []) {
    if (!skillIds.has(sid)) recordDangling('skill', `general[${g.id}].learnableFormationSkillIds`, sid);
  }
}

for (const s of skills) {
  if (!s) continue;
  for (const cid of s.carrierIds ?? []) {
    if (!generalIds.has(cid)) recordDangling('general', `skill[${s.id}].carrierIds`, cid);
  }
}

console.log('## 悬挂引用按目标分类\n');
for (const [target, m] of Object.entries(danglingByTarget)) {
  if (m.size === 0) continue;
  console.log(`### 目标=${target} (${m.size} 个悬挂 id,${[...m.values()].reduce((s, arr) => s + arr.length, 0)} 处引用)\n`);
  for (const [id, scopes] of m) {
    console.log(`- ${id} (引用 ${scopes.length} 处: ${scopes.slice(0, 3).join(', ')}${scopes.length > 3 ? '...' : ''})`);
  }
  console.log('');
}

// --- 4 维属性超范围统计 ---
console.log('\n## 武将 4 维属性超 [40,110] 范围统计\n');
const STAT_MIN = 40;
const STAT_MAX = 110;
const outliers = [];
for (const g of generals) {
  if (!g) continue;
  const s = g.stats ?? {};
  for (const k of ['武力', '智力', '统率', '速度']) {
    const v = s[k];
    if (typeof v === 'number' && (v < STAT_MIN || v > STAT_MAX)) {
      outliers.push({ id: g.id, name: g.name, k, v });
    }
  }
}
console.log(`共 ${outliers.length} 条超范围(武将 ${generals.length} 人 × 4 维 = ${generals.length * 4} 个值,合规率 ${((generals.length * 4 - outliers.length) / (generals.length * 4) * 100).toFixed(1)}%)\n`);
// 按 max 排序前 20
outliers.sort((a, b) => b.v - a.v);
console.log('超范围值分布:');
const above = outliers.filter((x) => x.v > STAT_MAX).length;
const below = outliers.filter((x) => x.v < STAT_MIN).length;
console.log(`- 超出上限 [>110]: ${above} 条`);
console.log(`- 低于下限 [<40]: ${below} 条`);
console.log(`\n超范围 Top 30 (按值降序):`);
console.log('| 武将 | 维度 | 值 |');
console.log('|------|------|------|');
for (const o of outliers.slice(0, 30)) {
  console.log(`| ${o.name}(${o.id}) | ${o.k} | ${o.v} |`);
}

// --- 缺失 id (lineup 引用了不存在的) — 算 lineup 内部 ---
console.log('\n## lineup counters/counteredBy 缺失目标\n');
const lineupIdSet = new Set(lineups.map((l) => l.id));
const counterMissing = [];
for (const l of lineups) {
  for (const cid of l.counters ?? []) if (!lineupIdSet.has(cid)) counterMissing.push({ lineup: l.id, field: 'counters', missing: cid });
  for (const cid of l.counteredBy ?? []) if (!lineupIdSet.has(cid)) counterMissing.push({ lineup: l.id, field: 'counteredBy', missing: cid });
}
console.log(`共 ${counterMissing.length} 条缺失`);
for (const m of counterMissing.slice(0, 20)) console.log(`- ${m.lineup}.${m.field} -> ${m.missing}`);