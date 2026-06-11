"use client";

/**
 * F7 模拟交战 — 入口页主组件(client component)
 *
 * 模式:
 *   - 打击面(默认):遍历 lineups.json 全部阵容作为对手,各跑 N 场,综合得分
 *   - 单挑:玩家手动选一个对手阵容
 *
 * 我方阵容选择:
 *   - 3 个武将下拉
 *   - 阵法、兵种下拉
 *   - "开始模拟"按钮 → 跳到 /battle/result?lineupA=...&lineupB=...&mode=...
 *
 * MVP 简化(参考 PRD):
 *   - "模拟交战"页本身不要求 100% 还原配将模拟器,只让玩家:
 *     (a) 选 3 武将
 *     (b) 选阵法、兵种
 *     (c) 直接开始模拟
 *   - 6 个战法 / 6 个兵书 / 特技在 MVP 暂不强制选(简化入口),只显示
 *     "我方队伍"概要 + "基准对手"提示
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  General,
  Skill,
  Tactics,
  Trait,
  Lineup,
  TroopType,
} from "@/lib/data/schemas";
import { TroopSelect } from "@/components/Sandbox/TroopSelect";
import { SkillSelect } from "@/components/Sandbox/SkillSelect";
import { CAMP_COLOR } from "@/components/Generals/constants";

export type BattleMode = "spread" | "duel";

export interface BattleEntryClientProps {
  generals: General[];
  skills: Skill[];
  tactics: Tactics[];
  traits: Trait[];
  lineups: Lineup[];
}

export function BattleEntryClient({
  generals,
  lineups,
  skills,
}: BattleEntryClientProps) {
  const router = useRouter();

  // 模式选择(默认"打击面")
  const [mode, setMode] = useState<BattleMode>("spread");

  // 挂载时读 ?mode= URL 参数(避免 useSearchParams 的 Suspense 要求)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const m = sp.get("mode");
    if (m === "duel" || m === "spread") {
      setMode(m);
    }
  }, []);

  // 我方阵容(3 武将 + 阵法 + 兵种)
  const [mainId, setMainId] = useState<string>(generals[0]?.id ?? "");
  const [vice1Id, setVice1Id] = useState<string>(generals[1]?.id ?? "");
  const [vice2Id, setVice2Id] = useState<string>(generals[2]?.id ?? "");
  const [formationId, setFormationId] = useState<string | null>(null);
  const [troop, setTroop] = useState<TroopType | null>(null);

  // 单挑模式下的对手选择
  const [opponentLineupId, setOpponentLineupId] = useState<string>(
    lineups[0]?.id ?? "",
  );

  const generalMap = useMemo(
    () => new Map(generals.map((g) => [g.id, g])),
    [generals],
  );

  const formationOptions = useMemo(
    () => skills.filter((s) => s.subType === "阵法"),
    [skills],
  );

  const selectedGenerals = useMemo(
    () =>
      [mainId, vice1Id, vice2Id]
        .map((id) => generalMap.get(id))
        .filter((g): g is General => Boolean(g)),
    [mainId, vice1Id, vice2Id, generalMap],
  );

  const allGeneralsValid =
    selectedGenerals.length === 3 &&
    new Set(selectedGenerals.map((g) => g.id)).size === 3;

  const canStart = allGeneralsValid && (mode === "spread" || opponentLineupId);

  // 点击"开始模拟" → 构造一个 Lineup 对象,再跳到 result 页
  function handleStart() {
    if (!canStart) return;

    // 构造我方 Lineup(草稿)— 战法 / 兵书 / 特技 在 MVP 留空,只填武将
    const draftMyLineup: Lineup = {
      id: "draft_my",
      name: "我方阵容",
      tier: "T1",
      tags: ["用户配置"],
      generalIds: [mainId, vice1Id, vice2Id],
      generalRedLevels: { [mainId]: 0, [vice1Id]: 0, [vice2Id]: 0 },
      formationSkillId: formationId,
      troop: troop ?? "spear",
      skills: {
        main: { [mainId]: ["", "", ""] },
        vice: {
          [vice1Id]: ["", ""],
          [vice2Id]: ["", ""],
        },
      },
      tactics: {
        major: ["tactic_001", "tactic_001", "tactic_001"],
        minor: ["tactic_101", "tactic_101", "tactic_101"],
      },
      equippedTraitIds: [],
      description: "用户在模拟交战页配置的草稿阵容",
      counters: [],
      counteredBy: [],
      // 用我方 3 武将的 6 维评分均值(粗估)
      ratings: deriveRatings(selectedGenerals),
      tierByScore: "T1",
    };

    // 打击面模式:对手 = 全部 lineups.json(传 lineupsBIds=id1,id2,...)
    // 单挑模式:对手 = 选中的那一套
    const params = new URLSearchParams();
    params.set("mode", mode);
    // 我方阵容传 base64 编码,result 页反序列化
    params.set("lineupA", encodeLineup(draftMyLineup));

    if (mode === "spread") {
      // 全部对手
      params.set("opponents", lineups.map((l) => l.id).join(","));
    } else {
      params.set("lineupB", opponentLineupId);
    }

    router.push(`/battle/result?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {/* 标题区 */}
      <header className="border-b border-line/60 pb-5 sm:pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F7 · Battle Sim
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
          模拟交战
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft sm:text-base">
          选 3 个武将 + 1 个阵法 + 1 个兵种,跟对手阵容跑 N 场模拟交战,
          输出胜率、5 档结果、兵损比与分输出/治疗。
          {lineups.length > 0 && (
            <>
              {" "}
              当前数据有 <strong className="text-primary">{lineups.length}</strong>{" "}
              套预设阵容(打击面模式会对每套各跑{" "}
              <strong className="text-primary">200</strong> 场)。
            </>
          )}
        </p>
      </header>

      {/* 步骤式流程(移动端:纵向单列步骤;桌面端:并排) */}
      {/* 步骤 1: 模式选择 */}
      <section
        aria-label="步骤 1 — 选择模式"
        className="mt-5 rounded-lg border border-line/70 bg-card/60 p-3 sm:mt-6 sm:p-4"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-bg-cream"
          >
            1
          </span>
          <h2 className="font-serif text-base font-semibold text-primary sm:text-lg">
            选择模式
          </h2>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ModeRadio
            value="spread"
            current={mode}
            onChange={setMode}
            title="打击面"
            desc="自动遍历全部预设阵容,出对阵表"
            default
          />
          <ModeRadio
            value="duel"
            current={mode}
            onChange={setMode}
            title="单挑"
            desc="手动选 1 个对手阵容,出 1000 场胜率"
          />
        </div>
      </section>

      {/* 步骤 2: 我方阵容选择 */}
      <section
        aria-label="步骤 2 — 选择我方阵容"
        className="mt-4 rounded-lg border border-line/70 bg-card/60 p-3 sm:mt-6 sm:p-4"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-bg-cream"
          >
            2
          </span>
          <h2 className="font-serif text-base font-semibold text-primary sm:text-lg">
            选择我方阵容
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <GeneralSlot
            label="主将"
            value={mainId}
            generals={generals}
            excludeIds={[vice1Id, vice2Id]}
            onChange={setMainId}
            generalMap={generalMap}
          />
          <GeneralSlot
            label="副将 1"
            value={vice1Id}
            generals={generals}
            excludeIds={[mainId, vice2Id]}
            onChange={setVice1Id}
            generalMap={generalMap}
          />
          <GeneralSlot
            label="副将 2"
            value={vice2Id}
            generals={generals}
            excludeIds={[mainId, vice1Id]}
            onChange={setVice2Id}
            generalMap={generalMap}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="阵法(可选)">
            <SkillSelect
              kind="skill"
              value={formationId}
              onChange={setFormationId}
              options={formationOptions}
              filterSubType="阵法"
              placeholder="未选"
            />
          </Field>
          <Field label="兵种(可选)">
            <TroopSelect value={troop} onChange={setTroop} />
          </Field>
        </div>
      </section>

      {/* 步骤 3: 对手阵容(单挑模式才有,打击面自动) */}
      {mode === "duel" && (
        <section
          aria-label="步骤 3 — 选择对手"
          className="mt-4 rounded-lg border border-line/70 bg-card/60 p-3 sm:mt-6 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-bg-cream"
            >
              3
            </span>
            <h2 className="font-serif text-base font-semibold text-primary sm:text-lg">
              选择对手阵容
            </h2>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            从推荐阵容库选 1 套作为对手,跑 1000 场。
          </p>
          <div className="mt-3">
            {lineups.length === 0 ? (
              <p className="text-sm text-ink-soft">暂无可选阵容</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lineups.map((l) => {
                  const isSel = opponentLineupId === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setOpponentLineupId(l.id)}
                      className={
                        "min-h-[2.75rem] rounded-md border px-3 py-2 text-left text-sm transition-all active:scale-[0.98] " +
                        (isSel
                          ? "border-accent-red bg-accent-red/10 text-accent-red"
                          : "border-line bg-card hover:border-primary hover:bg-bg-cream")
                      }
                    >
                      <div className="font-medium">{l.name}</div>
                      <div className="mt-0.5 text-xs text-ink-soft">
                        {l.tier} · 强度分 {l.ratings.total.toFixed(1)} · 3 武将
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 打击面模式对阵表预览(相当于步骤 3 的"自动对手") */}
      {mode === "spread" && lineups.length > 0 && (
        <section
          aria-label="步骤 3 — 自动对手列表"
          className="mt-4 rounded-lg border border-line/70 bg-card/60 p-3 sm:mt-6 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-bg-cream"
            >
              3
            </span>
            <h2 className="font-serif text-base font-semibold text-primary sm:text-lg">
              自动对手列表
            </h2>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            打击面模式将对以下 <strong>{lineups.length}</strong> 套阵容各跑 200 场:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {lineups.map((l) => (
              <li
                key={l.id}
                className="rounded-md border border-line bg-card px-2.5 py-1 text-sm"
              >
                {l.name} <span className="text-ink-soft">({l.tier})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 步骤 4: 开始战斗 */}
      <section
        aria-label="步骤 4 — 开始战斗"
        className="mt-4 rounded-lg border border-line/70 bg-card/60 p-3 sm:mt-6 sm:p-4"
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-bg-cream"
          >
            4
          </span>
          <h2 className="font-serif text-base font-semibold text-primary sm:text-lg">
            开始战斗
          </h2>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className={
              "min-h-[2.75rem] rounded-md border px-5 py-2.5 text-base font-semibold transition-all active:scale-95 sm:text-sm " +
              (canStart
                ? "border-accent-red bg-accent-red text-bg-cream hover:bg-accent-red/90"
                : "cursor-not-allowed border-line bg-card text-ink-soft")
            }
          >
            ▶ 开始模拟
          </button>
          {!allGeneralsValid && (
            <span className="text-sm text-ink-soft">
              请选满 3 个不同武将
            </span>
          )}
          {mode === "duel" && !opponentLineupId && (
            <span className="text-sm text-ink-soft">请选一个对手阵容</span>
          )}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function ModeRadio({
  value,
  current,
  onChange,
  title,
  desc,
  default: isDefault,
}: {
  value: BattleMode;
  current: BattleMode;
  onChange: (v: BattleMode) => void;
  title: string;
  desc: string;
  default?: boolean;
}) {
  const isSel = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={
        // min-h-[2.75rem] 满足 44px 触摸目标;active:scale-95 按下反馈
        "min-h-[2.75rem] flex-1 rounded-md border px-4 py-2.5 text-left transition-all active:scale-[0.98] " +
        (isSel
          ? "border-accent-red bg-accent-red/10"
          : "border-line bg-card hover:border-primary")
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "font-medium " + (isSel ? "text-accent-red" : "text-primary")
          }
        >
          {title}
        </span>
        {isDefault && (
          <span className="rounded bg-line/50 px-1.5 py-0.5 text-[10px] text-ink-soft">
            默认
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-soft">{desc}</p>
    </button>
  );
}

function GeneralSlot({
  label,
  value,
  generals,
  excludeIds,
  onChange,
  generalMap,
}: {
  label: string;
  value: string;
  generals: General[];
  excludeIds: string[];
  onChange: (id: string) => void;
  generalMap: Map<string, General>;
}) {
  const selected = generalMap.get(value);
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // 16px 防 iOS 自动放大,min-h-[2.75rem] 满足 44px 触摸目标
        className="mt-1 w-full min-h-[2.75rem] rounded-md border border-line bg-card px-2 py-1.5 text-base text-ink outline-none focus:border-primary sm:text-sm"
      >
        <option value="">未选</option>
        {generals.map((g) => {
          const excluded = excludeIds.includes(g.id);
          return (
            <option key={g.id} value={g.id} disabled={excluded}>
              {g.name} [{g.camp}] {excluded ? "(已被选)" : ""}
            </option>
          );
        })}
      </select>
      {selected && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
          <span className={"font-medium " + CAMP_COLOR[selected.camp]}>
            {selected.name}
          </span>
          <span>· 武力 {selected.stats.武力} 智力 {selected.stats.智力}</span>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 工具:派生我方阵容的 6 维评分(用于引擎内部 ratings 字段)
// ---------------------------------------------------------------------------

function deriveRatings(generals: General[]): Lineup["ratings"] {
  if (generals.length === 0) {
    return { output: 50, recover: 50, multihit: 50, rhythm: 50, coverage: 50, stability: 50, total: 50 };
  }
  const avg = (sel: (g: General) => number) =>
    generals.reduce((s, g) => s + sel(g), 0) / generals.length;
  const wuli = avg((g) => g.stats.武力);
  const zhili = avg((g) => g.stats.智力);
  const tongShuai = avg((g) => g.stats.统率);
  const sudu = avg((g) => g.stats.速度);

  // 把 4 维标准化到 0-100(基于常见值 50-200)
  const norm = (v: number, lo: number, hi: number) => {
    const t = (v - lo) / (hi - lo);
    return Math.max(0, Math.min(100, t * 100));
  };

  const output = norm(wuli, 50, 200);
  const recover = norm(zhili, 50, 200);
  const multihit = norm((wuli + zhili) / 2, 50, 200);
  const rhythm = norm(sudu, 30, 100);
  const coverage = norm((wuli + zhili + tongShuai) / 3, 50, 200);
  const stability = norm(tongShuai, 50, 200);
  const total =
    (output + recover + multihit + rhythm + coverage + stability) / 6;

  return {
    output: round1(output),
    recover: round1(recover),
    multihit: round1(multihit),
    rhythm: round1(rhythm),
    coverage: round1(coverage),
    stability: round1(stability),
    total: round1(total),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// 工具:Lineup → 紧凑 URL-safe 字符串(供 result 页反序列化)
// ---------------------------------------------------------------------------

function encodeLineup(l: Lineup): string {
  const json = JSON.stringify(l);
  // 用 btoa + encodeURIComponent 防止中文报错
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(json)));
}
