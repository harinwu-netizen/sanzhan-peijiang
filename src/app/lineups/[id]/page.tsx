/**
 * F4 推荐阵容 — 详情页(server component)
 *
 * 显示:
 *  - 阵容名(超大)+ tier 大徽章 + 标签 + 综合分
 *  - 3 武将卡片(头像 + 名 + 4 维属性 + 红度)
 *  - 战法 6 个(主将 1 主 + 2 副,副将各 2 个;按主/副分组 + subType 徽章,链接到 /skills/[id])
 *  - 阵法(显示名称,链接到 /skills/[id])
 *  - 兵种
 *  - 兵书(大 3 + 小 3,按武将顺序对应)
 *  - 特技(从 equippedTraitIds)
 *  - 适用场景 / 克制关系(从 description / counters / counteredBy)
 *  - "查看评价"按钮 → /lineups/[id]/evaluate
 *  - "返回列表"按钮
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadGenerals,
  loadLineups,
  loadSkills,
  loadTactics,
  loadTraits,
} from "@/lib/data/loader";
import type {
  General,
  Lineup,
  Skill,
  SkillSubType,
  Tactics,
  Trait,
} from "@/lib/data/schemas";
import { TIER_STYLES, TROOP_LABELS, tagStyleClass } from "@/components/Lineups/constants";
import {
  GeneralPanel,
  SkillAssignmentGrid,
} from "@/components/Lineups/GeneralPanel";
import { GeneralAvatar } from "@/components/Lineups/GeneralAvatar";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Metadata(动态 title)
// ---------------------------------------------------------------------------

export async function generateMetadata({
 params,
}: PageProps): Promise<Metadata> {
 const { id } = await params;
 const lineup = loadLineups().find((l) => l.id === id);
 if (!lineup) {
 return {
 title: '未找到阵容 - 三战配将助手',
 description: '该阵容ID在数据库中未找到,请返回阵容列表。',
 };
 }
 return {
 title: `${lineup.name} - 推荐阵容 · 三战配将助手`,
 description: `${lineup.name} ·强度 ${lineup.tier} · 综合分 ${lineup.ratings.total.toFixed(1)} ·标签 ${lineup.tags.join('、')} · 三国志·战略版推荐阵容详情。`,
 keywords: [
 '三国志战略版',
 `${lineup.name}`,
 `${lineup.tier}阵容`,
 '推荐阵容',
 '阵容配将',
 ],
 openGraph: {
 title: `${lineup.name} - 三战配将助手`,
 description: `${lineup.name} · ${lineup.tier} · 综合分 ${lineup.ratings.total.toFixed(1)}阵容详情。`,
 type: 'article',
 locale: 'zh_CN',
 },
  };
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export default async function LineupDetailPage({ params }: PageProps) {
  const { id } = await params;

  const allLineups = loadLineups();
  const lineup = allLineups.find((l) => l.id === id);
  if (!lineup) notFound();

  // 一次性加载索引,避免 N+1
  const generals = loadGenerals();
  const generalMap = new Map(generals.map((g) => [g.id, g]));

  const skillMap = new Map<string, Skill>();
  for (const s of loadSkills()) skillMap.set(s.id, s);

  const tacticMap = new Map<string, Tactics>();
  for (const t of loadTactics()) tacticMap.set(t.id, t);

  const traitMap = new Map<string, Trait>();
  for (const t of loadTraits()) traitMap.set(t.id, t);

  // 阵容关联的 3 武将(按 lineup.generalIds 顺序)
  const lineupGenerals: General[] = lineup.generalIds
    .map((gid) => generalMap.get(gid))
    .filter((g): g is General => Boolean(g));

  // 主将 id
  const mainGeneralId = Object.keys(lineup.skills.main)[0];
  const mainGeneral = mainGeneralId ? generalMap.get(mainGeneralId) : null;

  // 阵法战法
  const formationSkill = lineup.formationSkillId
    ? skillMap.get(lineup.formationSkillId) ?? null
    : null;

  // 兵书(major/minor 按武将顺序对应)
  const majorTactics: Array<{ tactic: Tactics; general: General | undefined }> = [];
  lineup.tactics.major.forEach((tid, i) => {
    const t = tacticMap.get(tid);
    if (t) {
      majorTactics.push({ tactic: t, general: lineupGenerals[i] });
    }
  });

  const minorTactics: Array<{ tactic: Tactics; general: General | undefined }> = [];
  lineup.tactics.minor.forEach((tid, i) => {
    const t = tacticMap.get(tid);
    if (t) {
      minorTactics.push({ tactic: t, general: lineupGenerals[i] });
    }
  });

  // 特技
  const equippedTraits = lineup.equippedTraitIds
    .map((tid) => traitMap.get(tid))
    .filter((t): t is Trait => Boolean(t));

  // 简化数据(供 SkillAssignmentGrid 用)
  const slimSkillMap = new Map<
    string,
    { id: string; name: string; subType: SkillSubType }
  >();
  for (const s of skillMap.values()) {
    slimSkillMap.set(s.id, { id: s.id, name: s.name, subType: s.subType });
  }
  const slimGeneralMap = new Map<string, { id: string; name: string }>();
  for (const g of lineupGenerals) {
    slimGeneralMap.set(g.id, { id: g.id, name: g.name });
  }

  const tier = TIER_STYLES[lineup.tier];
  const troopLabel = TROOP_LABELS[lineup.troop];

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
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
        <span className="text-ink">{lineup.name}</span>
      </nav>

      {/* 顶部:阵容名 + tier + 标签 + 综合分 */}
      <section
        aria-label="阵容信息"
        className="mt-4 overflow-hidden rounded-xl border border-line/70 bg-card shadow-sm"
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
                  {lineup.name}
                </h1>
                <span
                  className={`inline-flex shrink-0 items-center rounded-md border px-3 py-1 text-sm font-bold tracking-wider shadow-sm ${tier.badge}`}
                  title={tier.description}
                >
                  {tier.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                {troopLabel.full} · {tier.description}
              </p>
              {/* 标签 */}
              {lineup.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lineup.tags.map((tag, i) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${tagStyleClass(tag, i)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 综合分(右侧大字) */}
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
          </div>
        </div>
      </section>

      {/* 武将 3 张 */}
      <section className="mt-6" aria-label="武将">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
          阵容武将
        </h2>
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {lineupGenerals.map((g) => (
            <li key={g.id}>
              <GeneralPanel
                general={g}
                redLevel={lineup.generalRedLevels[g.id] ?? 0}
                isMain={g.id === mainGeneralId}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 战法分配(主 + 副) */}
      <section className="mt-6" aria-label="战法分配">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
          战法分配(共 6 个)
        </h2>
        <SkillAssignmentGrid
          lineup={lineup}
          skillMap={slimSkillMap}
          generalMap={slimGeneralMap}
        />
      </section>

      {/* 阵法 + 兵种 + 兵书 + 特技 — 4 列布局 */}
      <section
        className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
        aria-label="阵法/兵种/兵书/特技"
      >
        {/* 阵法 */}
        <div className="rounded-lg border border-line/60 bg-card p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
            阵法战法
          </h3>
          {formationSkill ? (
            <Link
              href={`/skills/${formationSkill.id}`}
              className="group flex items-center justify-between gap-2 rounded-md border border-line/60 bg-bg-cream/40 px-3 py-2 transition-all hover:border-primary/60 hover:bg-card"
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-base font-semibold text-ink group-hover:text-primary">
                  {formationSkill.name}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  {formationSkill.description}
                </p>
              </div>
              <span className="shrink-0 rounded-sm bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                {formationSkill.subType}
              </span>
            </Link>
          ) : (
            <p className="text-sm text-ink-soft italic">未配置阵法</p>
          )}
        </div>

        {/* 兵种 */}
        <div className="rounded-lg border border-line/60 bg-card p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
            兵种
          </h3>
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-semibold text-primary">
              {troopLabel.full}
            </span>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
              {troopLabel.short}
            </span>
            <span className="font-mono text-[11px] text-ink-soft">
              {lineup.troop}
            </span>
          </div>
          {/* 3 武将的兵种适性(S 优先高亮) */}
          {lineupGenerals.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {lineupGenerals.map((g) => {
                const apt = g[lineup.troop];
                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-2 text-[11px] text-ink-soft"
                  >
                    <GeneralAvatar
                      general={g}
                      name={g.name}
                      size="xs"
                    />
                    <span className="min-w-[2.5rem] text-ink">{g.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        apt === "S"
                          ? "bg-emerald-500 text-white"
                          : apt === "A"
                            ? "bg-sky-500 text-white"
                            : apt === "B"
                              ? "bg-amber-400 text-ink"
                              : "bg-stone-300 text-ink"
                      }`}
                    >
                      {apt}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 兵书(major + minor 按武将顺序) */}
      <section
        className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
        aria-label="兵书"
      >
        <div className="rounded-lg border border-line/60 bg-card p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-soft">
            大兵书({majorTactics.length})
          </h3>
          {majorTactics.length === 0 ? (
            <p className="text-sm text-ink-soft italic">未配置</p>
          ) : (
            <ul className="space-y-2">
              {majorTactics.map((m, i) => (
                <li
                  key={`${m.tactic.id}-${i}`}
                  className="flex items-start gap-2 rounded-md border border-line/40 bg-bg-cream/40 p-2"
                >
                  <GeneralAvatar
                    general={m.general ?? null}
                    name={m.general?.name ?? "?"}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm font-semibold text-ink">
                      {m.tactic.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-soft">
                      {m.tactic.effect}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-soft/70">
                      {m.tactic.category} · 作用于 {m.tactic.appliesTo}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-line/60 bg-card p-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-soft">
            小兵书({minorTactics.length})
          </h3>
          {minorTactics.length === 0 ? (
            <p className="text-sm text-ink-soft italic">未配置</p>
          ) : (
            <ul className="space-y-2">
              {minorTactics.map((m, i) => (
                <li
                  key={`${m.tactic.id}-${i}`}
                  className="flex items-start gap-2 rounded-md border border-line/40 bg-bg-cream/40 p-2"
                >
                  <GeneralAvatar
                    general={m.general ?? null}
                    name={m.general?.name ?? "?"}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm font-semibold text-ink">
                      {m.tactic.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-soft">
                      {m.tactic.effect}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-soft/70">
                      {m.tactic.category} · 作用于 {m.tactic.appliesTo}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 特技 */}
      <section className="mt-6" aria-label="特技">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
          装备特技
        </h2>
        {equippedTraits.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-card/60 p-4 text-sm text-ink-soft">
            <span className="italic">暂未装备特技</span>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {equippedTraits.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-line/60 bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-serif text-base font-semibold text-ink">
                    {t.name}
                  </p>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                      t.category === "攻击"
                        ? "bg-red-100 text-red-700 border-red-300"
                        : t.category === "防御"
                          ? "bg-sky-100 text-sky-700 border-sky-300"
                          : t.category === "谋略"
                            ? "bg-purple-100 text-purple-700 border-purple-300"
                            : t.category === "速度"
                              ? "bg-amber-100 text-amber-700 border-amber-300"
                              : "bg-stone-100 text-stone-700 border-stone-300"
                    }`}
                  >
                    {t.category}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-soft">
                  触发:{t.triggerCondition}
                </p>
                <p className="mt-1 text-sm text-ink">{t.effect}</p>
                <p className="mt-1 text-[10px] text-ink-soft/70">
                  来源:{t.source}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 适用场景 / 克制关系 */}
      <section
        className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
        aria-label="适用场景"
      >
        <div className="rounded-lg border border-line/60 bg-card p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
            阵容说明
          </h3>
          <p className="text-sm leading-6 text-ink">{lineup.description}</p>
        </div>
        <div className="rounded-lg border border-line/60 bg-card p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
            克制关系
          </h3>
          <p className="text-sm">
            <span className="text-accent-green">克制</span>:{" "}
            {lineup.counters.length > 0 ? (
              lineup.counters.map((c) => (
                <span
                  key={c}
                  className="mr-1.5 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800"
                >
                  {c}
                </span>
              ))
            ) : (
              <span className="text-ink-soft">—</span>
            )}
          </p>
          <p className="mt-2 text-sm">
            <span className="text-accent-red">被克</span>:{" "}
            {lineup.counteredBy.length > 0 ? (
              lineup.counteredBy.map((c) => (
                <span
                  key={c}
                  className="mr-1.5 inline-block rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-800"
                >
                  {c}
                </span>
              ))
            ) : (
              <span className="text-ink-soft">—</span>
            )}
          </p>
        </div>
      </section>

      {/* 底部按钮 */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-6 text-sm">
        <Link
          href="/lineups"
          className="rounded-md border border-line bg-card px-4 py-2 font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary"
        >
          ← 返回列表
        </Link>
        <Link
          href={`/lineups/${lineup.id}/evaluate`}
          className="rounded-md bg-primary px-5 py-2 font-medium text-bg-cream shadow-sm transition-colors hover:bg-primary/90"
        >
          查看评价 →
        </Link>
      </div>
    </div>
  );
}
