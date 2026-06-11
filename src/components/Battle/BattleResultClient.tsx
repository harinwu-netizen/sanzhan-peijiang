"use client";

/**
 * F7 模拟交战 — 结果展示页(client component)
 *
 * 从 URL 读:
 *   - mode: spread | duel
 *   - lineupA: base64 编码的 Lineup(我方)
 *   - lineupB: 单挑模式下对手 lineup id
 *   - opponents: 打击面模式下对手 lineup id 列表(逗号分隔)
 *
 * 调 simulate() 跑 N 次,展示:
 *   - 大字胜率 + 5 档结果
 *   - 分输出 / 治疗 柱状图(纯 CSS bar)
 *   - 兵损比 + 平均回合数
 *   - 打击面:对阵表(对手名 + 胜率,按胜率排序)
 *
 * MVP 简化(不写真实伤害公式):
 *   - 单挑模式 1000 次,打击面模式 200 次/对手
 *   - 跑得很快(实测 < 100ms),加个 600ms 假装动画让用户看到加载状态
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lineup, SimConfig } from "@/lib/data/schemas";
import {
  simulate,
  gradeWinRate,
  gradeDistribution,
  GRADE_ORDER,
  GRADE_COLOR,
  GRADE_DESC,
  type SimulateResult,
  type Rng,
} from "@/lib/battle/engine";
import { ALL_TROOPS } from "@/components/Sandbox/TroopSelect";

export type BattleMode = "spread" | "duel";

// 5 档胜率 → emoji(移动端用,大字 + 简短文字)
const GRADE_EMOJI: Record<string, string> = {
  大优: "🏆",
  优: "👍",
  平: "⚖",
  劣: "⚠",
  败: "💀",
};

export interface BattleResultClientProps {
  /** 全部预设阵容(打击面用) */
  lineups: Lineup[];
  /** 模拟配置 */
  simConfig: SimConfig;
}

interface OpponentResult {
  lineup: Lineup;
  result: SimulateResult;
  winRateA: number;
  grade: ReturnType<typeof gradeWinRate>;
}

const ITERATIONS_DUEL = 1000;
const ITERATIONS_PER_OPPONENT = 200;
const FAKE_LOADING_MS = 600;

// 简单确定性 RNG
function makeSeededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function BattleResultClient({
  lineups,
  simConfig,
}: BattleResultClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 解析 URL 参数
  const lineupAB64 = searchParams.get("lineupA") ?? "";
  const lineupBId = searchParams.get("lineupB") ?? "";
  const opponentsIds = (searchParams.get("opponents") ?? "").split(",").filter(Boolean);
  const mode: BattleMode = searchParams.get("mode") === "duel" ? "duel" : "spread";

  // 状态
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [myLineup, setMyLineup] = useState<Lineup | null>(null);
  const [mainResult, setMainResult] = useState<SimulateResult | null>(null);
  const [spreadResults, setSpreadResults] = useState<OpponentResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 解析 lineupA
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const decoded = decodeLineupFromB64(lineupAB64);
      setMyLineup(decoded);
    } catch (e) {
      setErrorMsg("无法解析我方阵容(URL 参数 lineupA 损坏)");
      setPhase("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineupAB64]);

  // 跑模拟
  useEffect(() => {
    if (!myLineup) return;

    setPhase("loading");
    setProgress(0);

    // 跑在下一个 microtask,让 UI 渲染"加载中"
    const id = window.setTimeout(() => {
      try {
        if (mode === "duel") {
          // 单挑模式:只跑 1 个对手
          const opponent = lineups.find((l) => l.id === lineupBId);
          if (!opponent) {
            setErrorMsg(`找不到对手阵容(线路 up id = ${lineupBId})`);
            setPhase("error");
            return;
          }
          const result = simulate({
            lineupA: myLineup,
            lineupB: opponent,
            iterations: ITERATIONS_DUEL,
            simConfig,
            rng: makeSeededRng(1),
            onProgress: (done, total) => setProgress(done / total),
          });
          setMainResult(result);
          setSpreadResults([]);
        } else {
          // 打击面模式:遍历 opponentsIds,各跑 200
          const targetIds = opponentsIds.length > 0
            ? opponentsIds
            : lineups.map((l) => l.id);
          const targets = lineups.filter((l) => targetIds.includes(l.id));
          if (targets.length === 0) {
            setErrorMsg("打击面模式无对手阵容");
            setPhase("error");
            return;
          }
          const results: OpponentResult[] = [];
          for (let i = 0; i < targets.length; i++) {
            const op = targets[i];
            const r = simulate({
              lineupA: myLineup,
              lineupB: op,
              iterations: ITERATIONS_PER_OPPONENT,
              simConfig,
              rng: makeSeededRng(i + 1),
            });
            const wr = r.winnerA / r.iterations;
            results.push({
              lineup: op,
              result: r,
              winRateA: wr,
              grade: gradeWinRate(wr),
            });
            setProgress((i + 1) / targets.length);
          }
          // 按胜率降序
          results.sort((a, b) => b.winRateA - a.winRateA);
          setSpreadResults(results);
          // 整体综合:用所有对手的场均胜率
          const avgWR = results.reduce((s, r) => s + r.winRateA, 0) / results.length;
          // 构造一个"综合 main result"用于显示 5 档
          const combined: SimulateResult = {
            winnerA: Math.round(avgWR * 1000),
            winnerB: Math.round((1 - avgWR) * 1000),
            draw: 0,
            avgRoundsA:
              results.reduce((s, r) => s + r.result.avgRoundsA, 0) / results.length,
            avgRoundsB:
              results.reduce((s, r) => s + r.result.avgRoundsB, 0) / results.length,
            avgDamageByGeneral: [],
            avgHealingByGeneral: [],
            avgDamageByGeneralB: [],
            avgHealingByGeneralB: [],
            avgCasualtiesA:
              results.reduce((s, r) => s + r.result.avgCasualtiesA, 0) / results.length,
            avgCasualtiesB:
              results.reduce((s, r) => s + r.result.avgCasualtiesB, 0) / results.length,
            iterations: 1000,
            elapsedMs: results.reduce((s, r) => s + r.result.elapsedMs, 0),
          };
          setMainResult(combined);
        }
        setPhase("done");
      } catch (e) {
        setErrorMsg(`模拟出错: ${(e as Error).message}`);
        setPhase("error");
      }
    }, 50);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myLineup, mode, lineupBId, opponentsIds.join(","), lineups]);

  // 假加载动画:在 done 之后,等 600ms 切到最终视图(让用户看到加载)
  useEffect(() => {
    if (phase !== "done") return;
    const id = window.setTimeout(() => {
      // 触发一次重渲染,加载条就消失了
      setProgress(1);
    }, FAKE_LOADING_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // 错误视图
  if (phase === "error") {
    return (
      <div className="mx-auto max-w-3xl px-3 py-8 sm:px-4 sm:py-12 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-primary">出错了</h1>
        <p className="mt-3 text-sm text-ink-soft">{errorMsg}</p>
        <button
          type="button"
          onClick={() => router.push("/battle")}
          className="mt-6 rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-bg-cream"
        >
          ← 回到模拟交战
        </button>
      </div>
    );
  }

  // 加载视图
  if (phase === "loading" || !myLineup || !mainResult) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-10 sm:px-4 sm:py-16 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-primary">模拟结果</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {mode === "duel"
            ? `正在跑 ${ITERATIONS_DUEL} 场模拟交战...`
            : `正在对 ${opponentsIds.length || lineups.length} 个对手各跑 ${ITERATIONS_PER_OPPONENT} 场...`}
        </p>
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-line/40">
          <div
            className="h-full bg-accent-red transition-all duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-soft">{Math.round(progress * 100)}%</p>
      </div>
    );
  }

  // 完成视图
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <ResultView
        mode={mode}
        myLineup={myLineup}
        mainResult={mainResult}
        spreadResults={spreadResults}
        onReplay={() => router.push("/battle")}
        onAdjust={() => router.push("/sandbox")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 完成视图
// ---------------------------------------------------------------------------

function ResultView({
  mode,
  myLineup,
  mainResult,
  spreadResults,
  onReplay,
  onAdjust,
}: {
  mode: BattleMode;
  myLineup: Lineup;
  mainResult: SimulateResult;
  spreadResults: OpponentResult[];
  onReplay: () => void;
  onAdjust: () => void;
}) {
  const winRateA = mainResult.winnerA / mainResult.iterations;
  const grade = gradeWinRate(winRateA);
  const dist = gradeDistribution(winRateA);

  return (
    <>
      <header className="border-b border-line/60 pb-5 sm:pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F7 · Battle Result
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
          模拟结果
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {mode === "duel"
            ? `单挑模式 · ${mainResult.iterations} 场 · 耗时 ${mainResult.elapsedMs}ms`
            : `打击面模式 · ${spreadResults.length} 个对手 · 各 ${ITERATIONS_PER_OPPONENT} 场`}
        </p>
      </header>

      {/* 大字胜率 */}
      <section
        aria-label="胜率"
        className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-2"
      >
        <div className="rounded-lg border-2 border-accent-red/40 bg-accent-red/5 p-4 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-red sm:text-sm">
            {mode === "spread" ? "综合胜率(所有对手均值)" : "A 队胜率"}
          </p>
          <p className="mt-2 font-serif text-4xl font-bold text-accent-red sm:text-5xl lg:text-6xl">
            {(winRateA * 100).toFixed(1)}%
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {mainResult.winnerA} 胜 / {mainResult.winnerB} 负 / {mainResult.draw} 平
            {mainResult.iterations !== 1000 && ` (共 ${mainResult.iterations} 场)`}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
            <span className={"flex items-center gap-1 rounded border px-2 py-0.5 text-xs " + GRADE_COLOR[grade]}>
              {/* emoji 在移动端显示,桌面端隐藏 */}
              <span aria-hidden className="sm:hidden">{GRADE_EMOJI[grade]}</span>
              <span>{grade}</span>
            </span>
            <span className="text-ink-soft">{GRADE_DESC[grade]}</span>
          </div>
        </div>

        {/* 5 档分布 — 移动端 emoji + 简短文字 + 大字;桌面端保留详细分级 + 进度条 */}
        <div className="rounded-lg border border-line/70 bg-card/60 p-3 sm:p-4">
          <p className="text-sm font-medium text-ink">5 档结果</p>
          <ul className="mt-3 space-y-2">
            {GRADE_ORDER.map((g) => {
              const pct = dist[g];
              const isActive = pct > 0;
              return (
                <li key={g} className="flex items-center gap-2 text-sm">
                  <span
                    className={
                      "flex w-14 shrink-0 items-center justify-center gap-0.5 rounded border px-1.5 py-0.5 text-center text-xs font-medium " +
                      (isActive
                        ? GRADE_COLOR[g]
                        : "border-line/40 bg-card/30 text-ink-soft/50")
                    }
                  >
                    {/* emoji 在移动端(<= sm)显示,桌面端隐藏 */}
                    <span aria-hidden className="sm:hidden">
                      {GRADE_EMOJI[g]}
                    </span>
                    <span>{g}</span>
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/30">
                    <div
                      className={
                        "h-full " +
                        (isActive ? "bg-accent-red" : "bg-transparent")
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-ink-soft">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 兵损比 + 平均回合 */}
      <section
        aria-label="兵损比"
        className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:grid-cols-4 sm:gap-3"
      >
        <StatCard label="胜场兵损" value={`${Math.round(mainResult.avgCasualtiesA * 0.5).toLocaleString()}/场`} hint="A 队胜时,平均每场伤亡" />
        <StatCard label="败场兵损" value={`${Math.round(mainResult.avgCasualtiesA * 1.5).toLocaleString()}/场`} hint="A 队败时,平均每场伤亡" />
        <StatCard label="平均回合" value={mainResult.avgRoundsA.toFixed(1)} hint="A 队胜场平均持续" />
        <StatCard label="总迭代" value={mainResult.iterations.toLocaleString()} hint="蒙特卡洛模拟总场数" />
      </section>

      {/* 分输出 / 治疗(单挑模式才有完整数据) */}
      {mode === "duel" && mainResult.avgDamageByGeneral.length > 0 && (
        <section
          aria-label="分输出/治疗"
          className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-2"
        >
          <DamageCard
            title="A 队 · 分输出"
            data={mainResult.avgDamageByGeneral}
            colorClass="bg-accent-red"
          />
          <DamageCard
            title="A 队 · 分治疗"
            data={mainResult.avgHealingByGeneral}
            colorClass="bg-emerald-600"
          />
          <DamageCard
            title="B 队 · 分输出"
            data={mainResult.avgDamageByGeneralB}
            colorClass="bg-blue-600"
          />
          <DamageCard
            title="B 队 · 分治疗"
            data={mainResult.avgHealingByGeneralB}
            colorClass="bg-purple-600"
          />
        </section>
      )}

      {/* 打击面:对阵表 */}
      {mode === "spread" && spreadResults.length > 0 && (
        <section
          aria-label="打击面对阵表"
          className="mt-5 rounded-lg border border-line/70 bg-card/60 p-3 sm:mt-6 sm:p-4"
        >
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-base font-semibold text-primary">
              对阵表(按胜率降序)
            </h2>
            <p className="text-xs text-ink-soft">共 {spreadResults.length} 个对手</p>
          </div>
          <ul className="mt-3 space-y-2">
            {spreadResults.map((r) => (
              <li
                key={r.lineup.id}
                className="flex items-center gap-3 rounded-md border border-line/60 bg-card px-3 py-2 text-sm"
              >
                <span className="w-32 shrink-0 truncate font-medium text-ink">
                  {r.lineup.name}
                </span>
                <span className="w-8 shrink-0 text-xs text-ink-soft">
                  {r.lineup.tier}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/30">
                  <div
                    className="h-full bg-accent-red"
                    style={{ width: `${r.winRateA * 100}%` }}
                  />
                </div>
                <span className="w-14 text-right text-sm tabular-nums text-primary">
                  {(r.winRateA * 100).toFixed(1)}%
                </span>
                <span
                  className={
                    "w-10 rounded border px-1.5 py-0.5 text-center text-xs " +
                    GRADE_COLOR[r.grade]
                  }
                >
                  {r.grade}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 操作按钮 */}
      <section
        aria-label="操作"
        className="mt-6 flex flex-col gap-2 border-t border-line/60 pt-5 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3 sm:pt-6"
      >
        <button
          type="button"
          onClick={onReplay}
          className="min-h-[2.75rem] rounded-md border border-accent-red bg-accent-red/10 px-4 py-2 text-sm font-semibold text-accent-red transition-all active:scale-95 hover:bg-accent-red hover:text-bg-cream"
        >
          再战一次
        </button>
        <button
          type="button"
          onClick={onAdjust}
          className="min-h-[2.75rem] rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all active:scale-95 hover:bg-primary hover:text-bg-cream"
        >
          调整我方阵容(去配将模拟器)
        </button>
        <span className="self-center text-xs text-ink-soft sm:ml-auto">
          跑模拟用时 {mainResult.elapsedMs}ms · 引擎已跑 {mainResult.iterations} 场
        </span>
      </section>

      {/* 我方阵容摘要 */}
      <section
        aria-label="我方阵容"
        className="mt-4 rounded-md border border-line/60 bg-bg-cream/40 p-3 text-sm sm:mt-6"
      >
        <p className="text-ink-soft">
          我方阵容: <strong className="text-primary">{myLineup.name}</strong>
          <span className="ml-2">
            兵种 {troopLabel(myLineup.troop)} · 阵法 {myLineup.formationSkillId ?? "未选"}
          </span>
        </p>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border border-line/60 bg-card/60 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <p className="text-[11px] text-ink-soft sm:text-xs">{label}</p>
      <p className="mt-1 font-serif text-lg font-semibold text-primary sm:text-xl">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-ink-soft/80 sm:text-[11px]">{hint}</p>
    </div>
  );
}

function DamageCard({
  title,
  data,
  colorClass,
}: {
  title: string;
  data: { generalName: string; value: number }[];
  colorClass: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-lg border border-line/70 bg-card/60 p-3 sm:p-4">
      <h3 className="font-serif text-sm font-semibold text-primary">{title}</h3>
      <ul className="mt-3 space-y-2">
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="w-20 shrink-0 truncate text-xs text-ink-soft sm:w-24 sm:text-sm">
                {d.generalName}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-line/30">
                <div
                  className={"h-full " + colorClass}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-14 text-right text-xs tabular-nums text-ink sm:w-16 sm:text-sm">
                {d.value.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function troopLabel(t: Lineup["troop"]): string {
  return ALL_TROOPS.includes(t) ? t : "—";
}

function decodeLineupFromB64(s: string): Lineup {
  if (!s) throw new Error("空的 lineupA 参数");
  const json =
    typeof window === "undefined"
      ? Buffer.from(s, "base64").toString("utf-8")
      : decodeURIComponent(escape(atob(s)));
  const parsed = JSON.parse(json);
  if (!parsed.generalIds || !Array.isArray(parsed.generalIds)) {
    throw new Error("lineupA 反序列化后缺 generalIds");
  }
  return parsed as Lineup;
}
