/**
 * F4 推荐阵容 — 列表页(server component)
 *
 * 能力:
 *  - 4 维筛选(阵营 / 强度 / 关键字 / 排序)
 *  - 响应式 1/2/3 列卡片网格
 *  - 共 X 套阵容 总数
 *  - 空筛选结果有友好提示
 *
 * 数据源:
 *  - loadLineups(): 阵容列表
 *  - loadGenerals(): 用于在卡片里渲染 3 武将头像 + 聚合"阵营"筛选项
 *
 * 阵营筛选用"阵容内任一武将属于该阵营"作为判定(可能多阵营混编时不剔除)。
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  loadGenerals,
  loadLineups,
} from "@/lib/data/loader";
import type {
  Camp,
  General,
  Lineup,
  LineupTier,
} from "@/lib/data/schemas";
import { parseCamp } from "@/components/Generals/constants";
import { LineupCard } from "@/components/Lineups/LineupCard";
import {
  LineupFilterBar,
  type LineupFiltersValue,
} from "@/components/Lineups/LineupFilterBar";
import type { SortKey } from "@/components/Lineups/constants";

export const metadata: Metadata = {
 title: "推荐阵容 · 三战配将助手",
 description:
 "三国志·战略版玩家圈高强度阵容库,收录15套按 T0/T1/T2/T3 分级的推荐阵容,综合分来自6维评分(输出/回复/多穿/节奏/打击面/稳定),支持阵营、标签、关键字筛选。",
 keywords: ["三国志战略版", "推荐阵容", "阵容库", "T0阵容", "开荒阵容"],
 openGraph: {
 title: "推荐阵容 · 三战配将助手",
 description: "15套三国志·战略版高强度推荐阵容,T0/T1/T2/T3 分级 + 综合分排序。",
 type: "website",
 locale: "zh_CN",
 },
};

// ---------------------------------------------------------------------------
// URL 参数解析
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function one(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseTier(v: string | undefined): LineupTier | "全部" | null {
  if (!v) return null;
  if (v === "T0" || v === "T1" || v === "T2" || v === "T3") return v;
  return null;
}

function parseSort(v: string | undefined): SortKey {
  return v === "heat" ? "heat" : "score";
}

// ---------------------------------------------------------------------------
// 过滤 + 排序
// ---------------------------------------------------------------------------

interface FilterInput {
  camp: Camp | null;
  tier: LineupTier | "全部" | null;
  sort: SortKey;
  q: string;
}

function filterLineups(
  lineups: Lineup[],
  generals: General[],
  f: FilterInput,
): Lineup[] {
  // 武将 ID → General
  const generalMap = new Map(generals.map((g) => [g.id, g]));

  let out = lineups;

  // 阵营(阵容内任一武将属于该阵营即保留)
  if (f.camp) {
    out = out.filter((l) =>
      l.generalIds.some((id) => generalMap.get(id)?.camp === f.camp),
    );
  }

  // 强度
  if (f.tier && f.tier !== "全部") {
    out = out.filter((l) => l.tier === f.tier);
  }

  // 关键字(阵容名 / 描述 / 标签)
  if (f.q) {
    const needle = f.q.toLowerCase();
    out = out.filter((l) => {
      if (l.name.toLowerCase().includes(needle)) return true;
      if (l.description.toLowerCase().includes(needle)) return true;
      if (l.tags.some((t) => t.toLowerCase().includes(needle))) return true;
      return false;
    });
  }

  // 排序
  if (f.sort === "score") {
    out = [...out].sort((a, b) => b.ratings.total - a.ratings.total);
  } else {
    // "heat" — MVP 用 (tier 优先级 + 综合分) 当作热度代理
    const tierWeight: Record<LineupTier, number> = {
      T0: 4,
      T1: 3,
      T2: 2,
      T3: 1,
    };
    out = [...out].sort((a, b) => {
      const tw = tierWeight[b.tier] - tierWeight[a.tier];
      if (tw !== 0) return tw;
      return b.ratings.total - a.ratings.total;
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export default async function LineupsListPage({ searchParams }: PageProps) {
  const raw = await searchParams;

  const filters: FilterInput = {
    camp: parseCamp(one(raw.camp)),
    tier: parseTier(one(raw.tier)) ?? null,
    sort: parseSort(one(raw.sort)),
    q: (one(raw.q) ?? "").trim(),
  };

  const allLineups = loadLineups();
  const allGenerals = loadGenerals();
  const generalMap = new Map(allGenerals.map((g) => [g.id, g]));
  const filtered = filterLineups(allLineups, allGenerals, filters);

  const barValue: LineupFiltersValue = {
    camp: filters.camp,
    tier: filters.tier,
    sort: filters.sort,
    q: filters.q,
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {/* 标题区 */}
      <header className="border-b border-line/60 pb-5 sm:pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F4 · Lineups
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 sm:gap-3">
          <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
            推荐阵容
          </h1>
          <p className="text-sm text-ink-soft">
            共{" "}
            <span className="font-semibold text-primary">
              {filtered.length}
            </span>{" "}
            套阵容
            {filtered.length !== allLineups.length && (
              <span className="ml-1 text-ink-soft/80">
                (已筛选,原始 {allLineups.length} 套)
              </span>
            )}
          </p>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft sm:text-base">
          玩家圈强度评级 <strong className="text-accent-red">T0</strong> /{" "}
          <strong className="text-orange-600">T1</strong> /{" "}
          <strong className="text-amber-600">T2</strong> /{" "}
          <strong className="text-stone-600">T3</strong>{" "}
          四档,综合分来自 6 维评分(输出/回复/多穿/节奏/打击面/稳定)。
          点击卡片查看武将 / 战法 / 兵书 / 兵种 / 克制关系,点{" "}
          <strong>查看评价</strong> 看雷达图 + 输出分析。
        </p>
      </header>

      {/* 筛选区 */}
      <section aria-label="筛选" className="mt-6">
        <LineupFilterBar value={barValue} totalCount={filtered.length} />
      </section>

      {/* 列表区 */}
      <section aria-label="阵容列表" className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-card/60 p-8 text-center">
            <p className="font-serif text-lg text-ink">无匹配阵容</p>
            <p className="mt-2 text-sm text-ink-soft">
              试试调整筛选条件,或
              <Link
                href="/lineups"
                className="ml-1 text-accent-red hover:underline"
              >
                清空筛选
              </Link>
              。
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {filtered.map((l) => {
              const generals = l.generalIds
                .map((id) => generalMap.get(id))
                .filter((g): g is General => Boolean(g));
              return (
                <li key={l.id}>
                  <LineupCard lineup={l} generals={generals} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 底部回首页 */}
      <div className="mt-10 border-t border-line/60 pt-6 text-sm">
        <Link href="/" className="text-accent-red hover:underline">
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}
