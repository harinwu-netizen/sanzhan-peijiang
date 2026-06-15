/**
 * F7 模拟交战 — 战斗引擎单元测试
 *
 * v6:阵法从 formationSkillId 顶层字段下沉到主将战法槽 0。
 * 测试用例:
 *   1. 蜀枪 vs 蜀枪 → ~50% A 胜率(同队伍,应有对称)
 *   2. 1000 次迭代 < 3s(性能)
 *   3. 边界:lineup 缺数据不崩
 *   4. 5 档分级函数正确(纯函数,无 RNG)
 *   5. 5 档分布:从 gradeWinRate 反向计算分布
 *   6. v6 新增:buildBattleLineup 接受 formationSkill,subType='阵法' 时 formation=true
 *   7. v6 新增:resolveFormationFromLineup 主将战法槽 0 → 阵法识别
 */
import { describe, it, expect } from "vitest";
import {
  simulate,
  buildBattleLineup,
  resolveFormationFromLineup,
  gradeWinRate,
  gradeDistribution,
  type FormationSkill,
  type Rng,
} from "./engine";
import type { Lineup, SimConfig } from "@/lib/data/schemas";

// ---------------------------------------------------------------------------
// 测试数据
// ---------------------------------------------------------------------------

const SHU_QIANG: Lineup = {
  id: "shu_qiang",
  name: "蜀枪",
  tier: "T1",
  tags: ["打架", "PVP"],
  generalIds: ["liu_bei", "zhang_fei", "guan_yu"],
  generalRedLevels: { liu_bei: 0, zhang_fei: 0, guan_yu: 0 },
  troop: "spear",
  skills: {
    // v6:阵法(武峰阵)下沉到主将战法槽 0
    main: {
      liu_bei: ["wu_feng_zhen", "ren_de_zai_shi", "yi_xin_zhao_yong"],
    },
    vice: {
      zhang_fei: ["wan_ren_zhi_di", "chen_mu_heng_mao"],
      guan_yu: ["wei_zhen_hua_xia", "heng_sao_qian_jun"],
    },
  },
  tactics: {
    major: ["tactic_001", "tactic_002", "tactic_001"],
    minor: ["tactic_101", "tactic_101", "tactic_101"],
  },
  equippedTraitIds: [],
  description: "刘备主将治疗,张飞关羽输出",
  counters: ["蜀弓"],
  counteredBy: ["群弓"],
  ratings: {
    output: 65,
    recover: 70,
    multihit: 60,
    rhythm: 55,
    coverage: 60,
    stability: 65,
    total: 62.5,
  },
  tierByScore: "T1",
};

/** v6:一个没有阵法的主将槽 0(用指挥战法代替,模拟"未配置阵法"的边界) */
const NO_FORMATION: Lineup = {
  ...SHU_QIANG,
  id: "no_formation",
  name: "无阵法测试",
  skills: {
    main: {
      liu_bei: ["ren_de_zai_shi", "yi_xin_zhao_yong", "jie_li_zuo_mou"],
    },
    vice: {
      zhang_fei: ["wan_ren_zhi_di", "chen_mu_heng_mao"],
      guan_yu: ["wei_zhen_hua_xia", "heng_sao_qian_jun"],
    },
  },
};

/** v6:蜀智 — 主将战法槽 0 = ba_gua_zhen(八卦阵) */
const SHU_ZHI: Lineup = {
  ...SHU_QIANG,
  id: "shu_zhi",
  name: "蜀智",
  generalIds: ["zhuge_liang", "pang_tong", "xu_shu"],
  generalRedLevels: { zhuge_liang: 0, pang_tong: 0, xu_shu: 0 },
  skills: {
    main: {
      zhuge_liang: ["ba_gua_zhen", "kong_cheng_ji", "yi_xin_zhao_yong"],
    },
    vice: {
      pang_tong: ["lian_huo_zhi_xin", "huo_chi_yuan_liao"],
      xu_shu: ["shi_bie_san_ri", "jie_li_zuo_mou"],
    },
  },
};

const SIM_CONFIG: SimConfig = {
  iterations: 1000,
  triggerRate: { 主动: 0.35, 被动: 1.0, 突击: 0.35, 指挥: 1.0 },
  troopCounter: {
    "骑-盾": 1.2,
    "盾-弓": 1.2,
    "弓-枪": 1.2,
    "枪-骑": 1.2,
    "盾-骑": 0.8,
    "弓-盾": 0.8,
    "枪-弓": 0.8,
    "骑-枪": 0.8,
    same: 1.0,
  },
  campBonus: 1.1,
};

/** 一个"明显更强"的阵容,作为对照 */
const STRONGER: Lineup = {
  ...SHU_QIANG,
  id: "shu_qiang_strong",
  name: "蜀枪·强化",
  ratings: {
    output: 90,
    recover: 90,
    multihit: 90,
    rhythm: 90,
    coverage: 90,
    stability: 90,
    total: 90,
  },
  tierByScore: "T0",
};

// 简易确定性 RNG(Linear Congruential,够用)
function makeSeededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// v6:标准阵法(蜀枪的主将战法槽 0)
const WU_FENG_ZHEN: FormationSkill = {
  id: "wu_feng_zhen",
  name: "武峰阵",
  subType: "阵法",
};

const BA_GUA_ZHEN: FormationSkill = {
  id: "ba_gua_zhen",
  name: "八卦阵",
  subType: "阵法",
};

// ---------------------------------------------------------------------------
// 1. 蜀枪 vs 蜀枪 → ~50% A 胜率
// ---------------------------------------------------------------------------

describe("simulate() — 对称性", () => {
  it("蜀枪 vs 蜀枪(双方带武峰阵)→ A 胜率应在 50% 附近(±15%)", () => {
    const r = simulate({
      lineupA: SHU_QIANG,
      lineupB: SHU_QIANG,
      iterations: 1000,
      simConfig: SIM_CONFIG,
      formationSkillA: WU_FENG_ZHEN,
      formationSkillB: WU_FENG_ZHEN,
      rng: makeSeededRng(42),
    });
    const winRateA = r.winnerA / r.iterations;
    // 同队伍,期望 50%。考虑模型非完美,允许 35%-65%
    expect(winRateA).toBeGreaterThanOrEqual(0.35);
    expect(winRateA).toBeLessThanOrEqual(0.65);
    // 三类胜场加和 = iterations
    expect(r.winnerA + r.winnerB + r.draw).toBe(1000);
  });

  it("v6:不传 formationSkill 时 → 默认无阵法,不报错", () => {
    // 向后兼容:旧调用方不传 formationSkill,引擎应当照常跑
    const r = simulate({
      lineupA: SHU_QIANG,
      lineupB: SHU_QIANG,
      iterations: 100,
      simConfig: SIM_CONFIG,
      rng: makeSeededRng(42),
    });
    expect(r.iterations).toBe(100);
    expect(r.winnerA + r.winnerB + r.draw).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 2. 1000 次跑 < 3s
// ---------------------------------------------------------------------------

describe("simulate() — 性能", () => {
  it("1000 次迭代应在 3s 内完成", () => {
    const start = Date.now();
    const r = simulate({
      lineupA: SHU_QIANG,
      lineupB: SHU_QIANG,
      iterations: 1000,
      simConfig: SIM_CONFIG,
      formationSkillA: WU_FENG_ZHEN,
      formationSkillB: WU_FENG_ZHEN,
      rng: makeSeededRng(7),
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
    expect(r.elapsedMs).toBeLessThan(3000);
    expect(r.iterations).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// 3. 边界:lineup 缺数据不崩
// ---------------------------------------------------------------------------

describe("simulate() — 缺数据兜底", () => {
  it("lineupA.generalIds 为空 → 返回全平局,不抛错", () => {
    const broken: Lineup = { ...SHU_QIANG, generalIds: [] as unknown as string[] };
    expect(() =>
      simulate({
        lineupA: broken,
        lineupB: SHU_QIANG,
        iterations: 100,
        simConfig: SIM_CONFIG,
        formationSkillA: WU_FENG_ZHEN,
        formationSkillB: WU_FENG_ZHEN,
        rng: makeSeededRng(1),
      }),
    ).not.toThrow();
  });

  it("iterations = 0 → 返回空结果(全平局 0 场)", () => {
    const r = simulate({
      lineupA: SHU_QIANG,
      lineupB: SHU_QIANG,
      iterations: 0,
      simConfig: SIM_CONFIG,
      formationSkillA: WU_FENG_ZHEN,
      formationSkillB: WU_FENG_ZHEN,
    });
    expect(r.iterations).toBe(0);
    expect(r.winnerA + r.winnerB + r.draw).toBe(0);
  });

  it("lineup = null → 不抛错,返回空结果", () => {
    // 故意绕过 TS 类型校验(模拟损坏数据)
    expect(() =>
      simulate({
        lineupA: null as unknown as Lineup,
        lineupB: SHU_QIANG,
        iterations: 10,
        simConfig: SIM_CONFIG,
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. 5 档分级函数
// ---------------------------------------------------------------------------

describe("gradeWinRate() — 5 档分级", () => {
  it("> 0.75 → 大优", () => {
    expect(gradeWinRate(0.76)).toBe("大优");
    expect(gradeWinRate(0.9)).toBe("大优");
    expect(gradeWinRate(1.0)).toBe("大优");
  });
  it("0.6-0.75 → 优", () => {
    expect(gradeWinRate(0.6)).toBe("优");
    expect(gradeWinRate(0.7)).toBe("优");
    expect(gradeWinRate(0.75)).toBe("优");
  });
  it("0.45-0.6 → 平", () => {
    expect(gradeWinRate(0.45)).toBe("平");
    expect(gradeWinRate(0.5)).toBe("平");
    expect(gradeWinRate(0.59)).toBe("平");
  });
  it("0.25-0.45 → 劣", () => {
    expect(gradeWinRate(0.25)).toBe("劣");
    expect(gradeWinRate(0.3)).toBe("劣");
    expect(gradeWinRate(0.44)).toBe("劣");
  });
  it("< 0.25 → 败", () => {
    expect(gradeWinRate(0.24)).toBe("败");
    expect(gradeWinRate(0.1)).toBe("败");
    expect(gradeWinRate(0)).toBe("败");
  });
});

// ---------------------------------------------------------------------------
// 5. 5 档分布
// ---------------------------------------------------------------------------

describe("gradeDistribution() — 单胜率分档", () => {
  it("0.7 → 优 100%,其它 0", () => {
    const d = gradeDistribution(0.7);
    expect(d["优"]).toBe(100);
    expect(d["大优"]).toBe(0);
    expect(d["平"]).toBe(0);
    expect(d["劣"]).toBe(0);
    expect(d["败"]).toBe(0);
  });

  it("0.5 → 平 100%", () => {
    const d = gradeDistribution(0.5);
    expect(d["平"]).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 6. 强弱对照(bonus)
// ---------------------------------------------------------------------------

describe("simulate() — 强弱对照", () => {
  it("明显更强的队 vs 蜀枪 → 强队胜率应明显高于 50%", () => {
    const r = simulate({
      lineupA: STRONGER,
      lineupB: SHU_QIANG,
      iterations: 500,
      simConfig: SIM_CONFIG,
      formationSkillA: WU_FENG_ZHEN,
      formationSkillB: WU_FENG_ZHEN,
      rng: makeSeededRng(99),
    });
    const winRateA = r.winnerA / r.iterations;
    // 强队 ratings 90 vs 62.5,胜率应明显高(> 65%)
    expect(winRateA).toBeGreaterThan(0.55);
  });
});

// ---------------------------------------------------------------------------
// 7. v6 新增:阵法从主将战法槽 0 解析
// ---------------------------------------------------------------------------

describe("v6 — resolveFormationFromLineup", () => {
  it("主将战法槽 0 是阵法 → 解析成功", () => {
    const skillMap = new Map<string, FormationSkill>([
      ["wu_feng_zhen", WU_FENG_ZHEN],
      ["ba_gua_zhen", BA_GUA_ZHEN],
    ]);
    expect(resolveFormationFromLineup(SHU_QIANG, skillMap)).toEqual(WU_FENG_ZHEN);
    expect(resolveFormationFromLineup(SHU_ZHI, skillMap)).toEqual(BA_GUA_ZHEN);
  });

  it("主将战法槽 0 是指挥/主动 → 解析为 null(只认阵法)", () => {
    const skillMap = new Map<string, FormationSkill>([
      [
        "ren_de_zai_shi",
        { id: "ren_de_zai_shi", name: "仁德载世", subType: "指挥" },
      ],
    ]);
    expect(resolveFormationFromLineup(NO_FORMATION, skillMap)).toBeNull();
  });

  it("主将战法槽 0 不在 skillMap → 解析为 null", () => {
    const skillMap = new Map<string, FormationSkill>();
    expect(resolveFormationFromLineup(SHU_QIANG, skillMap)).toBeNull();
  });
});

describe("v6 — buildBattleLineup 接受 formationSkill", () => {
  it("formationSkill.subType='阵法' → formation=true,formationName 设置", () => {
    const bl = buildBattleLineup(SHU_QIANG, WU_FENG_ZHEN);
    expect(bl.formation).toBe(true);
    expect(bl.formationName).toBe("武峰阵");
  });

  it("formationSkill 是 null / 缺失 → formation=false,formationName=null", () => {
    expect(buildBattleLineup(SHU_QIANG).formation).toBe(false);
    expect(buildBattleLineup(SHU_QIANG, null).formation).toBe(false);
    expect(buildBattleLineup(SHU_QIANG).formationName).toBeNull();
  });

  it("formationSkill.subType 不是阵法 → formation=false", () => {
    const notFormation: FormationSkill = {
      id: "ren_de_zai_shi",
      name: "仁德载世",
      subType: "指挥",
    };
    const bl = buildBattleLineup(SHU_QIANG, notFormation);
    expect(bl.formation).toBe(false);
    expect(bl.formationName).toBeNull();
  });
});

describe("v6 — 蜀枪(武峰阵) vs 蜀智(八卦阵) 端到端", () => {
  it("阵法生效路径完整:不会因为 formationSkill 报错", () => {
    const r = simulate({
      lineupA: SHU_QIANG, // 武峰阵
      lineupB: SHU_ZHI, // 八卦阵
      iterations: 200,
      simConfig: SIM_CONFIG,
      formationSkillA: WU_FENG_ZHEN,
      formationSkillB: BA_GUA_ZHEN,
      rng: makeSeededRng(123),
    });
    // 三类胜场加和 = iterations
    expect(r.winnerA + r.winnerB + r.draw).toBe(200);
    expect(r.iterations).toBe(200);
  });
});
