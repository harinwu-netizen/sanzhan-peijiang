/**
 * F4 推荐阵容 — 评价页(client component)
 *
 * 三张卡片:
 *  1. 阵容分析:综合分 + 6 维横条 + 6 维雷达图
 *  2. 输出分析:全队场均输出 + 三武将贡献 + 8 回合折线图
 *  3. 对阵表:对常见强队的胜率(MVP 简化版)
 *
 * 数据通过 props 从 server 端 page.tsx 注入。
 * 这里只关心渲染 + 假数据(因为 MVP 阶段没有真实模拟数据)。
 */
"use client";

import Link from "next/link";
import type { General, Lineup } from "@/lib/data/schemas";
import { RatingBars } from "@/components/Lineups/RatingBars";
import { RatingsRadarChart } from "@/components/Charts/RadarChart";
import { LineupLineChart } from "@/components/Charts/LineChart";
import {
  TIER_STYLES,
  tagStyleClass,
  TROOP_LABELS,
  type SixDimensionalRatings,
} from "@/components/Lineups/constants";
import { GeneralAvatar } from "@/components/Lineups/GeneralAvatar";

export interface EvaluateClientProps {
  lineup: Lineup;
  /** 由 server 端解析好的 3 武将(顺序与 lineup.generalIds 一致) */
  generals: General[];
}

// ---------------------------------------------------------------------------
// MVP 假数据生成工具(确定性,基于 ID 哈希)
// ---------------------------------------------------------------------------

/** 简单的字符串哈希,用于"确定性伪随机" */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** 0-1 之间的"伪随机"(基于 seed) */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// 对阵表(常见强队)MVP 数据
// ---------------------------------------------------------------------------

interface CounterRow {
  name: string;
  /** 50 ± 25 浮动,用 lineup.id 哈希固定 */
  winRate: number;
  /** 优势(克制)还是劣势(被克) */
  type: "advantage" | "disadvantage";
  /** 模拟的兵损比,比如 1.0 = 互换,1.3 = 我方多损失 30% */
  casualtyRatio: number;
  /** 备注一行 */
  note: string;
}

const COUNTER_POOL: Array<{
  name: string;
  type: "advantage" | "disadvantage";
  note: string;
}> = [
  { name: "群弓", type: "disadvantage", note: "群弓多段谋略伤害压制我方前排" },
  { name: "蜀枪", type: "advantage", note: "同阵营枪兵内战,主将治疗优势" },
  { name: "太尉盾", type: "disadvantage", note: "太尉盾减伤强,我方多穿收益低" },
  { name: "皇马枪", type: "advantage", note: "皇马枪输出高但回复弱,被我方压制" },
  { name: "富贵骑", type: "disadvantage", note: "富贵骑多段伤害 + 先手,克制我方节奏" },
  { name: "吴弓", type: "advantage", note: "吴弓脆皮,我方多穿收益高" },
  { name: "魏盾", type: "advantage", note: "魏盾速度慢,我方先手优势" },
  { name: "三势阵", type: "disadvantage", note: "三势阵主动发动率高,我方顶不住" },
];

/** 选 6 个,按 lineup.id 哈希取 3 advantage + 3 disadvantage */
function pickCounters(lineupId: string): CounterRow[] {
  const seed = hashStr(lineupId);
  const adv = COUNTER_POOL.filter((c) => c.type === "advantage");
  const dis = COUNTER_POOL.filter((c) => c.type === "disadvantage");

  // 简单洗牌:基于 seed 选下标
  const pick = <T,>(arr: T[], n: number, offset: number): T[] => {
    const out: T[] = [];
    for (let i = 0; i < arr.length && out.length < n; i++) {
      const idx = (offset + i * 3 + i * i) % arr.length;
      const item = arr[idx];
      if (item && !out.includes(item)) out.push(item);
    }
    return out;
  };

  const advPicked = pick(adv, 3, seed % 7);
  const disPicked = pick(dis, 3, (seed >> 3) % 7);

  return [...advPicked, ...disPicked].map((c, i) => {
    const r = seededRandom(seed + i * 17);
    const base = c.type === "advantage" ? 55 : 45;
    const winRate = Math.round(base + (r - 0.5) * 30);
    const casualty = c.type === "advantage" ? 0.8 + r * 0.3 : 1.1 + r * 0.4;
    return {
      name: c.name,
      type: c.type,
      winRate,
      casualtyRatio: Math.round(casualty * 100) / 100,
      note: c.note,
    };
  });
}

// ---------------------------------------------------------------------------
// 8 回合折线图(MVP 假数据)
// ---------------------------------------------------------------------------

function genRoundData(
  ratings: SixDimensionalRatings,
  generals: General[],
  lineupId: string,
): { total: number[]; perGeneral: Array<{ name: string; data: number[]; color: string }> } {
  // 总输出:rounds 1-8 累计
  // ratings.output (0-100) * 200 = 平均每回合输出
  const seed = hashStr(lineupId);
  const avgPerRound = ratings.output * 200;

  // 全队总输出(每回合汇总)
  const total: number[] = [];
  let acc = 0;
  for (let r = 1; r <= 8; r++) {
    const rRate = ratings.rhythm / 100; // 节奏(0-1)
    // 越前越低,中段峰值(假设 r=3~5 为主)
    const peak = Math.max(0, 1 - Math.abs(r - 4) / 4);
    const growth = 0.6 + 0.4 * (r / 8);
    const variance = 0.85 + seededRandom(seed + r) * 0.3;
    const value = avgPerRound * (0.5 + 0.5 * peak) * growth * (0.6 + 0.4 * rRate) * variance;
    acc += value;
    total.push(Math.round(value));
  }

  // 三武将分输出贡献(根据武力/智力 + output 比例)
  // MVP 简化:每个武将一个权重,根据武力+智力
  const weights = generals.map((g) => {
    const s = g.stats.武力 + g.stats.智力 + g.stats.统率 * 0.3;
    return s;
  });
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  const colors = ["#c84141", "#5a8a5a", "#2f6fb0"];

  const perGeneral = generals.map((g, i) => {
    const share = weights[i] / wSum;
    const data = total.map((t, r) => {
      const rRate = ratings.rhythm / 100;
      const peak = Math.max(0, 1 - Math.abs(r + 1 - 4) / 4);
      const v = t * share * (0.7 + 0.3 * peak) * (0.6 + 0.4 * rRate) * (0.85 + seededRandom(seed + r * 7 + i * 31) * 0.3);
      return Math.round(v);
    });
    return {
      name: g.name,
      data,
      color: colors[i % colors.length],
    };
  });

  return { total, perGeneral };
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export function EvaluateClient({ lineup, generals }: EvaluateClientProps) {
  const tier = TIER_STYLES[lineup.tier];
  const troopLabel = TROOP_LABELS[lineup.troop];
  const ratings6 = {
    output: lineup.ratings.output,
    recover: lineup.ratings.recover,
    multihit: lineup.ratings.multihit,
    rhythm: lineup.ratings.rhythm,
    coverage: lineup.ratings.coverage,
    stability: lineup.ratings.stability,
  };
  const counters = pickCounters(lineup.id);
  const lineData = genRoundData(ratings6, generals, lineup.id);
  const totalOutput = lineData.total.reduce((a, b) => a + b, 0);
  const totalOutputFmt = totalOutput.toLocaleString("zh-CN");
  const teamAvg = Math.round(totalOutput / 8).toLocaleString("zh-CN");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 面包屑 */}
      <nav aria-label="面包屑" className="text-sm text-ink-soft">
        <Link href="/" className="hover:text-primary hover:underline">
          首页
        </Link>
        <span className="mx-2 text-ink-soft/60">/</span>
        <Link href="/lineups" className="hover:text-primary hover:underline">
          推荐阵容
        </Link>
        <span className="mx-2 text-ink-soft/60">/</span>
        <Link
          href={`/lineups/${lineup.id}`}
          className="hover:text-primary hover:underline"
        >
          {lineup.name}
        </Link>
        <span className="mx-2 text-ink-soft/60">/</span>
        <span className="text-ink">评价</span>
      </nav>

      {/* 顶部标题 */}
      <header className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-line/60 pb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-accent-red">
            F4 · Lineup Evaluation
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-primary sm:text-4xl">
            {lineup.name} · 评价
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 font-semibold ${tier.badge}`}
            >
              {tier.label}
            </span>
            <span>· {troopLabel.full}</span>
            {lineup.tags.map((tag, i) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${tagStyleClass(tag, i)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-primary/30 bg-bg-cream/60 px-6 py-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
            综合分
          </p>
          <p className="mt-0.5 font-mono text-4xl font-semibold leading-none text-primary">
            {lineup.ratings.total.toFixed(1)}
          </p>
          <p className="mt-1 text-[10px] text-ink-soft/80">
            tier-by-score: {lineup.tierByScore}
          </p>
        </div>
      </header>

      {/* 卡片 1:阵容分析 */}
      <section
        aria-label="阵容分析"
        className="mt-6 rounded-xl border border-line/70 bg-card p-5 shadow-sm"
      >
        <h2 className="mb-1 font-serif text-xl font-semibold text-primary">
          阵容分析
        </h2>
        <p className="text-xs text-ink-soft">
          6 维评分 · 输出 / 回复 / 多穿 / 节奏 / 打击面 / 稳定
        </p>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 左:6 维横条 */}
          <div>
            <RatingBars ratings={ratings6} />
          </div>
          {/* 右:6 维雷达图 */}
          <div>
            <RatingsRadarChart
              ratings={ratings6}
              name={lineup.name}
              height={360}
            />
          </div>
        </div>
      </section>

      {/* 卡片 2:输出分析 */}
      <section
        aria-label="输出分析"
        className="mt-6 rounded-xl border border-line/70 bg-card p-5 shadow-sm"
      >
        <h2 className="mb-1 font-serif text-xl font-semibold text-primary">
          输出分析
        </h2>
        <p className="text-xs text-ink-soft">
          全队场均总输出 + 三武将贡献(MVP 估算,基于 ratings.output × 200 / 回合)
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-accent-red/30 bg-red-50/40 p-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-accent-red">
              全队场均输出
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold text-accent-red">
              {teamAvg}
            </p>
            <p className="mt-1 text-[10px] text-ink-soft">每回合伤害估算</p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-bg-cream/40 p-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
              8 回合总输出
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold text-primary">
              {totalOutputFmt}
            </p>
            <p className="mt-1 text-[10px] text-ink-soft">累计伤害</p>
          </div>
          <div className="rounded-lg border border-accent-green/30 bg-emerald-50/40 p-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-accent-green">
              回复能力
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold text-accent-green">
              {lineup.ratings.recover}
            </p>
            <p className="mt-1 text-[10px] text-ink-soft">ratings.recover</p>
          </div>
        </div>

        {/* 三武将分输出贡献 */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {lineData.perGeneral.map((g) => {
            const sum = g.data.reduce((a, b) => a + b, 0);
            const share = Math.round((sum / totalOutput) * 100);
            return (
              <div
                key={g.name}
                className="rounded-md border border-line/60 bg-bg-cream/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <GeneralAvatar name={g.name} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{g.name}</p>
                    <p className="text-[10px] text-ink-soft">输出贡献</p>
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-lg font-semibold text-ink">
                    {sum.toLocaleString("zh-CN")}
                  </span>
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: g.color }}
                  >
                    {share}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${share}%`,
                      backgroundColor: g.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 8 回合折线图 */}
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
            8 回合输出趋势
          </h3>
          <div className="rounded-lg border border-line/60 bg-bg-cream/40 p-3">
            <LineupLineChart
              height={320}
              series={[
                {
                  name: "全队",
                  data: lineData.total,
                  emphasis: true,
                  color: "#c84141",
                },
                ...lineData.perGeneral.map((g) => ({
                  name: g.name,
                  data: g.data,
                  color: g.color,
                })),
              ]}
            />
          </div>
        </div>
      </section>

      {/* 卡片 3:对阵表 */}
      <section
        aria-label="对阵表"
        className="mt-6 rounded-xl border border-line/70 bg-card p-5 shadow-sm"
      >
        <h2 className="mb-1 font-serif text-xl font-semibold text-primary">
          对常见强队的胜率
        </h2>
        <p className="text-xs text-ink-soft">
          MVP 简化版,胜率用 ratings 推算 ± 25 的 mock 值(确定性,基于 lineup.id)
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {counters.map((c) => {
            const isAdv = c.type === "advantage";
            return (
              <div
                key={c.name}
                className={`rounded-lg border p-3 ${
                  isAdv
                    ? "border-accent-green/40 bg-emerald-50/40"
                    : "border-accent-red/40 bg-red-50/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-serif text-base font-semibold text-ink">
                    {c.name}
                  </p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      isAdv
                        ? "bg-accent-green/15 text-accent-green"
                        : "bg-accent-red/15 text-accent-red"
                    }`}
                  >
                    {isAdv ? "克制" : "被克"}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    className={`font-mono text-2xl font-semibold ${
                      c.winRate >= 50
                        ? "text-accent-green"
                        : "text-accent-red"
                    }`}
                  >
                    {c.winRate}%
                  </span>
                  <span className="text-[11px] text-ink-soft">
                    兵损比 {c.casualtyRatio.toFixed(2)}
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200"
                  role="progressbar"
                  aria-valuenow={c.winRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.winRate}%`,
                      backgroundColor:
                        c.winRate >= 50 ? "#5a8a5a" : "#c84141",
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-ink-soft">{c.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 底部按钮 */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-6 text-sm">
        <Link
          href={`/lineups/${lineup.id}`}
          className="rounded-md border border-line bg-card px-4 py-2 font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary"
        >
          ← 返回详情
        </Link>
        <Link
          href={`/sandbox?lineup=${lineup.id}`}
          className="rounded-md border border-accent-red/60 bg-accent-red/10 px-4 py-2 font-medium text-accent-red transition-colors hover:bg-accent-red hover:text-bg-cream"
        >
          载入到配将器
        </Link>
      </div>
    </div>
  );
}
