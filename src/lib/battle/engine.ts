/**
 * F7 模拟交战 — 简化蒙特卡洛战斗引擎(纯函数,可在 client / server 跑)
 *
 * 设计目标(PRD §F7 + 数据维护手册 §8):
 *   - 不追求真实伤害公式,MVP 级别抽象
 *   - 算法骨架:
 *     * 出手顺序按武将速度
 *     * 主动战法 35% 触发 / 被动 100% / 突击 35% / 指挥 100%(来自 SimConfig)
 *     * 伤害 ≈ 攻方武力/智力 - 防方统率,再乘系数
 *     * 兵种克制 ±20%(来自 sim-config.troopCounter)
 *     * 阵法加成 + 同阵营加成
 *   - 跑 N 次,统计胜负 + 平均回合数 + 双方分输出/治疗
 *
 * MVP 简化:
 *   - Lineup 自身不带完整 4 维属性(只有 ratings 6 维分),所以本引擎用
 *     `ratings.total` 当作"队伍综合实力"代理,4 维属性从 output/recover/rhythm 推算。
 *   - 不读取 skill/tactic/trait 完整细节(只需触发率 + 基础伤害),避免依赖过多查表。
 *   - 双方都按速度顺序出手(同回合 A 全部先,再 B 全部)。
 *   - 武将初始 HP 固定 10000,20 回合后未分胜负算平局。
 *
 * ⚠️ 此文件**只**依赖 src/lib/data/schemas 的类型,**不**读 fs,
 *    不依赖 React / Next.js API,可在浏览器直接运行。
 */
import type { Lineup, SimConfig, TroopType } from "@/lib/data/schemas";

// ---------------------------------------------------------------------------
// 公开类型
// ---------------------------------------------------------------------------

/** 战斗内一个武将的快照(简化版) */
export interface BattleGeneral {
  id: string;
  name: string;
  camp: "魏" | "蜀" | "吴" | "群";
  stats: { 武力: number; 智力: number; 统率: number; 速度: number };
  troop: TroopType | null;
}

/** 战斗内一个阵容的快照 */
export interface BattleLineup {
  id: string;
  name: string;
  generals: BattleGeneral[];
  formation: boolean; // 是否带阵法
  troop: TroopType | null;
}

/** simulate() 的输出 */
export interface SimulateResult {
  /** A 队胜场 */
  winnerA: number;
  /** B 队胜场 */
  winnerB: number;
  /** 平局场(双方都没死完) */
  draw: number;
  /** A 队胜场的平均回合数(只看 A 赢的局) */
  avgRoundsA: number;
  /** B 队胜场的平均回合数 */
  avgRoundsB: number;
  /** A 队 3 武将场均输出 */
  avgDamageByGeneral: { generalName: string; value: number }[];
  /** A 队 3 武将场均治疗 */
  avgHealingByGeneral: { generalName: string; value: number }[];
  /** B 队 3 武将场均输出 */
  avgDamageByGeneralB: { generalName: string; value: number }[];
  /** B 队 3 武将场均治疗 */
  avgHealingByGeneralB: { generalName: string; value: number }[];
  /** A 队场均总伤亡(简化:跟胜负+回合数挂钩) */
  avgCasualtiesA: number;
  /** B 队场均总伤亡 */
  avgCasualtiesB: number;
  /** 实际跑的迭代次数 */
  iterations: number;
  /** 跑 N 次的耗时(ms) */
  elapsedMs: number;
}

// ---------------------------------------------------------------------------
// 5 档胜率分级(用于结果展示页)
// ---------------------------------------------------------------------------

export type WinGrade = "大优" | "优" | "平" | "劣" | "败";

/** 单场胜率 → 5 档分级 */
export function gradeWinRate(winRateA: number): WinGrade {
  if (winRateA > 0.75) return "大优";
  if (winRateA >= 0.6) return "优";
  if (winRateA >= 0.45) return "平";
  if (winRateA >= 0.25) return "劣";
  return "败";
}

export const GRADE_ORDER: WinGrade[] = ["大优", "优", "平", "劣", "败"];

export const GRADE_COLOR: Record<WinGrade, string> = {
  大优: "text-emerald-700 bg-emerald-50 border-emerald-300",
  优: "text-green-700 bg-green-50 border-green-300",
  平: "text-amber-700 bg-amber-50 border-amber-300",
  劣: "text-orange-700 bg-orange-50 border-orange-300",
  败: "text-red-700 bg-red-50 border-red-300",
};

export const GRADE_DESC: Record<WinGrade, string> = {
  大优: "A 队胜率 > 75%",
  优: "A 队胜率 60% - 75%",
  平: "A 队胜率 45% - 60%",
  劣: "A 队胜率 25% - 45%",
  败: "A 队胜率 < 25%",
};

/** 给定 A 胜率,计算 5 档各占百分比(单场胜率确定时,1 档=100%) */
export function gradeDistribution(winRateA: number): Record<WinGrade, number> {
  return {
    大优: winRateA > 0.75 ? 100 : 0,
    优: winRateA >= 0.6 && winRateA <= 0.75 ? 100 : 0,
    平: winRateA >= 0.45 && winRateA < 0.6 ? 100 : 0,
    劣: winRateA >= 0.25 && winRateA < 0.45 ? 100 : 0,
    败: winRateA < 0.25 ? 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

/** 随机数发生器(允许注入做单测) */
export type Rng = () => number;

const defaultRng: Rng = () => Math.random();

/** 兵种克制系数查表(sim-config.troopCounter 的中文映射) */
const TROOP_LABEL: Record<TroopType, string> = {
  cavalry: "骑",
  shield: "盾",
  archer: "弓",
  spear: "枪",
  siege: "器",
};

function troopKey(attacker: TroopType, defender: TroopType): string {
  if (attacker === defender) return "same";
  return `${TROOP_LABEL[attacker]}-${TROOP_LABEL[defender]}`;
}

/** 找活着的目标(随机) */
function pickAliveTarget(hpArr: number[], rng: Rng): number {
  const alive: number[] = [];
  for (let i = 0; i < hpArr.length; i++) {
    if (hpArr[i] > 0) alive.push(i);
  }
  if (alive.length === 0) return -1;
  return alive[Math.floor(rng() * alive.length)];
}

function allDead(hpArr: number[]): boolean {
  return hpArr.every((h) => h <= 0);
}

function lowestHpIdx(hp: number[]): number {
  let minI = 0;
  let minV = hp[0];
  for (let i = 1; i < hp.length; i++) {
    if (hp[i] < minV) {
      minV = hp[i];
      minI = i;
    }
  }
  return minI;
}

// ---------------------------------------------------------------------------
// Lineup → BattleLineup(简化映射)
// ---------------------------------------------------------------------------

/**
 * 把 Lineup 简化成 BattleLineup:
 *   - 3 个 BattleGeneral 共享一份从 ratings 推算的 4 维
 *   - camp 默认 "蜀"(MVP:lineup 自身没有 camp 字段,只有武将决定)
 *   - 不读 skills/tactics/traits 细节(只决定有没有阵法 → 8% 全队增伤)
 */
export function buildBattleLineup(lineup: Lineup): BattleLineup {
  const ratingTotal = lineup.ratings.total;
  const base = Math.max(40, Math.min(180, 80 + (ratingTotal - 50) * 1.6));
  const speed = Math.max(
    30,
    Math.min(120, 50 + (lineup.ratings.rhythm - 50) * 0.6),
  );
  const wuli = base + (lineup.ratings.output - 50) * 0.6;
  const zhili = base + (lineup.ratings.recover - 50) * 0.4;

  const commonStats = {
    武力: Math.round(wuli),
    智力: Math.round(zhili),
    统率: Math.round(base),
    速度: Math.round(speed),
  };

  const mkGeneral = (i: number): BattleGeneral => ({
    id: `${lineup.id}_g${i}`,
    name: i === 0 ? lineup.name : `${lineup.name}·副${i}`,
    camp: "蜀",
    stats: commonStats,
    troop: lineup.troop,
  });

  return {
    id: lineup.id,
    name: lineup.name,
    generals: [mkGeneral(0), mkGeneral(1), mkGeneral(2)],
    formation: Boolean(lineup.formationSkillId),
    troop: lineup.troop,
  };
}

/** 把 3 个武将拍平成"出手队列"(速度从高到低) */
function buildTurnOrder(lineup: BattleLineup): BattleGeneral[] {
  return [...lineup.generals].sort((a, b) => b.stats.速度 - a.stats.速度);
}

// ---------------------------------------------------------------------------
// 单场模拟
// ---------------------------------------------------------------------------

const INITIAL_HP = 10000;
const MAX_ROUNDS = 20;

/** 0 = 平局, 1 = A 胜, 2 = B 胜 */
function simulateOneBattle(
  a: BattleLineup,
  b: BattleLineup,
  cfg: SimConfig,
  rng: Rng,
): {
  winner: 0 | 1 | 2;
  rounds: number;
  dmgA: number[];
  dmgB: number[];
  healA: number[];
  healB: number[];
} {
  const hpA = a.generals.map(() => INITIAL_HP);
  const hpB = b.generals.map(() => INITIAL_HP);
  const dmgA = [0, 0, 0];
  const dmgB = [0, 0, 0];
  const healA = [0, 0, 0];
  const healB = [0, 0, 0];

  const orderA = buildTurnOrder(a);
  const orderB = buildTurnOrder(b);

  let rounds = 0;
  for (rounds = 1; rounds <= MAX_ROUNDS; rounds++) {
    // A 队先手(按速度)
    for (const ag of orderA) {
      if (allDead(hpB)) break;
      const ai = a.generals.indexOf(ag);
      if (hpA[ai] <= 0) continue;
      const ti = pickAliveTarget(hpB, rng);
      if (ti < 0) break;
      attackOnce(ag, b.generals[ti], a, b, cfg, hpA, hpB, dmgA, healA, "A", rng);
    }
    if (allDead(hpB)) break;
    for (const bg of orderB) {
      if (allDead(hpA)) break;
      const bi = b.generals.indexOf(bg);
      if (hpB[bi] <= 0) continue;
      const ti = pickAliveTarget(hpA, rng);
      if (ti < 0) break;
      attackOnce(bg, a.generals[ti], b, a, cfg, hpB, hpA, dmgB, healB, "B", rng);
    }
    if (allDead(hpA) || allDead(hpB)) break;
  }

  const aDead = allDead(hpA);
  const bDead = allDead(hpB);
  let winner: 0 | 1 | 2 = 0;
  if (aDead && bDead) winner = 0;
  else if (bDead) winner = 1;
  else if (aDead) winner = 2;

  return { winner, rounds, dmgA, dmgB, healA, healB };
}

/**
 * 一次"出手":包括普攻 + 战法加成 + 可能治疗。
 *
 * hpA/hpB 是 in-place 改的(对调引用即可切换 A/B 视角)。
 * dmgArr / healArr 也是 in-place 累加。
 */
function attackOnce(
  attacker: BattleGeneral,
  defender: BattleGeneral,
  attackLineup: BattleLineup,
  defendLineup: BattleLineup,
  cfg: SimConfig,
  ownHp: number[],
  enemyHp: number[],
  dmgArr: number[],
  healArr: number[],
  _side: "A" | "B", // 调试用,目前未分
  rng: Rng,
): void {
  const atkIdx = attackLineup.generals.indexOf(attacker);
  const defIdx = defendLineup.generals.indexOf(defender);
  if (atkIdx < 0 || defIdx < 0) return;

  // 兵种克制
  let troopMult = 1.0;
  if (attackLineup.troop && defendLineup.troop) {
    troopMult = cfg.troopCounter[troopKey(attackLineup.troop, defendLineup.troop)] ?? 1.0;
  }

  // 阵法加成(简化:有阵法给 +8%)
  const formationMult = attackLineup.formation ? 1.08 : 1.0;

  const coef = troopMult * formationMult;

  // 物理攻击(武力差)
  const physDiff = Math.max(0, attacker.stats.武力 - defender.stats.统率);
  const physDmg = Math.round(physDiff * 0.6 * coef);

  // 谋略攻击(智力差)
  const intDiff = Math.max(0, attacker.stats.智力 - defender.stats.统率);
  const intDmg = Math.round(intDiff * 0.5 * coef);

  // 战法加成 — 用 sim-config 的基础触发率(每个武将视作"带一个自身 subType 的战法")
  // MVP 简化:不再读 Skill 表,直接用 SimConfig.triggerRate
  const activeRate = cfg.triggerRate.主动;
  const passiveRate = cfg.triggerRate.被动;
  const strikeRate = cfg.triggerRate.突击;
  const commandRate = cfg.triggerRate.指挥;
  // 假设每个武将带 1 主动 + 1 被动 + 1 突击 + 1 指挥(目录里的标配)
  let skillBonus = 0;
  if (rng() < activeRate) skillBonus += 350 * coef;
  if (rng() < passiveRate) skillBonus += 250 * coef;
  if (rng() < strikeRate) skillBonus += 300 * coef;
  if (rng() < commandRate) skillBonus += 200 * coef;

  // 总输出
  const totalDmg = Math.max(1, physDmg + intDmg + Math.round(skillBonus));

  // 治疗:指挥 / 被动命中时给一点(基于智力)
  let heal = 0;
  if (rng() < commandRate) heal += Math.round(attacker.stats.智力 * 0.4 * cfg.campBonus);
  if (rng() < passiveRate) heal += Math.round(attacker.stats.智力 * 0.3 * cfg.campBonus);

  // 应用
  enemyHp[defIdx] = Math.max(0, enemyHp[defIdx] - totalDmg);
  dmgArr[atkIdx] += totalDmg;
  if (heal > 0) {
    const healTarget = lowestHpIdx(ownHp);
    ownHp[healTarget] = Math.min(INITIAL_HP, ownHp[healTarget] + heal);
    healArr[atkIdx] += heal;
  }
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

export interface SimulateInput {
  lineupA: Lineup;
  lineupB: Lineup;
  iterations: number;
  simConfig: SimConfig;
  /** 可选注入(单测用) */
  rng?: Rng;
  /** 可选进度回调(每 ~10% 报一次) */
  onProgress?: (done: number, total: number) => void;
}

/**
 * 跑 N 次模拟,返回聚合结果。
 *
 * 异常 / 缺数据时返回"全平局"的安全结果,不抛错(防止 UI 崩)。
 */
export function simulate(input: SimulateInput): SimulateResult {
  const {
    lineupA,
    lineupB,
    iterations,
    simConfig,
    rng = defaultRng,
    onProgress,
  } = input;
  const start = now();

  // 缺数据兜底
  if (
    !lineupA?.generalIds ||
    lineupA.generalIds.length !== 3 ||
    !lineupB?.generalIds ||
    lineupB.generalIds.length !== 3 ||
    iterations <= 0
  ) {
    return emptyResult(Math.max(0, iterations), now() - start);
  }

  const a = buildBattleLineup(lineupA);
  const b = buildBattleLineup(lineupB);

  let winnerA = 0;
  let winnerB = 0;
  let draw = 0;
  let roundsSumA = 0;
  let roundsSumB = 0;
  const dmgA = [0, 0, 0];
  const dmgB = [0, 0, 0];
  const healA = [0, 0, 0];
  const healB = [0, 0, 0];

  const progressTick = Math.max(1, Math.floor(iterations / 10));
  for (let i = 0; i < iterations; i++) {
    const r = simulateOneBattle(a, b, simConfig, rng);
    if (r.winner === 1) {
      winnerA++;
      roundsSumA += r.rounds;
    } else if (r.winner === 2) {
      winnerB++;
      roundsSumB += r.rounds;
    } else {
      draw++;
    }
    for (let j = 0; j < 3; j++) {
      dmgA[j] += r.dmgA[j];
      dmgB[j] += r.dmgB[j];
      healA[j] += r.healA[j];
      healB[j] += r.healB[j];
    }
    if (onProgress && (i + 1) % progressTick === 0) {
      onProgress(i + 1, iterations);
    }
  }

  const iters = iterations;
  // 兵损比简化:跟胜负 + 平均回合挂钩
  // 胜场 = 短局,败场 = 拉满 20 回合
  // A 队视角:胜场平均死少(每场死 ~1200),败场死多(每场死 ~5800)
  // 整体期望 = winRateA * 1200 + (1 - winRateA) * 5800 + 0.5 * 1500 (平局中位)
  const winRateA = winnerA / iters;
  const winRateB = winnerB / iters;
  const drawRate = draw / iters;
  const avgCasualtiesA = Math.round(
    winRateA * 1200 + (1 - winRateA - drawRate) * 5800 + drawRate * 3000,
  );
  const avgCasualtiesB = Math.round(
    winRateB * 1200 + (1 - winRateA - drawRate) * 5800 + drawRate * 3000,
  );

  return {
    winnerA,
    winnerB,
    draw,
    avgRoundsA: winnerA > 0 ? Number((roundsSumA / winnerA).toFixed(1)) : 0,
    avgRoundsB: winnerB > 0 ? Number((roundsSumB / winnerB).toFixed(1)) : 0,
    avgDamageByGeneral: a.generals.map((g, i) => ({
      generalName: g.name,
      value: Math.round(dmgA[i] / iters),
    })),
    avgHealingByGeneral: a.generals.map((g, i) => ({
      generalName: g.name,
      value: Math.round(healA[i] / iters),
    })),
    avgDamageByGeneralB: b.generals.map((g, i) => ({
      generalName: g.name,
      value: Math.round(dmgB[i] / iters),
    })),
    avgHealingByGeneralB: b.generals.map((g, i) => ({
      generalName: g.name,
      value: Math.round(healB[i] / iters),
    })),
    avgCasualtiesA,
    avgCasualtiesB,
    iterations: iters,
    elapsedMs: Math.round(now() - start),
  };
}

function now(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function emptyResult(iterations: number, elapsedMs: number): SimulateResult {
  return {
    winnerA: 0,
    winnerB: 0,
    draw: iterations,
    avgRoundsA: 0,
    avgRoundsB: 0,
    avgDamageByGeneral: [],
    avgHealingByGeneral: [],
    avgDamageByGeneralB: [],
    avgHealingByGeneralB: [],
    avgCasualtiesA: 0,
    avgCasualtiesB: 0,
    iterations,
    elapsedMs,
  };
}
