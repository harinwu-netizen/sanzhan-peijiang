import type { Metadata } from "next";
import { loadTraits, loadGenerals } from "@/lib/data/loader";
import type { Trait, TraitCategory } from "@/lib/data/schemas";
import { TraitCard } from "@/components/Traits/TraitCard";
import { TraitsFilterBar } from "@/components/Traits/TraitsFilterBar";

export const metadata: Metadata = {
 title: "特技库 · 三战配将助手",
 description:
 "三国志·战略版装备附带的特性数据查询,按分类(攻击/防御/谋略/速度/特殊)、通用/专属、特技名筛选,详细列出触发条件、效果描述与关联武将。",
 keywords: ["三国志战略版", "特技库", "装备特性", "专属特技", "通用特技"],
 openGraph: {
 title: "特技库 · 三战配将助手",
 description: "三国志·战略版装备特性图鉴,5 大分类 +通用/专属筛选。",
 type: "website",
 locale: "zh_CN",
 },
};

// ---------------------------------------------------------------------------
// URL 参数 → 过滤
// ---------------------------------------------------------------------------

type CategoryFilter = "全部" | TraitCategory;
const VALID_CATEGORIES: ReadonlyArray<CategoryFilter> = [
  "全部",
  "攻击",
  "防御",
  "谋略",
  "速度",
  "特殊",
];

type OwnershipFilter = "全部" | "通用" | "专属";
const VALID_OWNERSHIPS: ReadonlyArray<OwnershipFilter> = ["全部", "通用", "专属"];

function parseCategory(raw: string | undefined): CategoryFilter {
  if (raw && (VALID_CATEGORIES as ReadonlyArray<string>).includes(raw)) {
    return raw as CategoryFilter;
  }
  return "全部";
}

/** isUnique=true 视为"专属",isUnique=false 视为"通用" */
function parseOwnership(raw: string | undefined): OwnershipFilter {
  if (raw === "true") return "专属";
  if (raw === "false") return "通用";
  if (raw && (VALID_OWNERSHIPS as ReadonlyArray<string>).includes(raw)) {
    return raw as OwnershipFilter;
  }
  return "全部";
}

function parseQ(raw: string | undefined): string {
  return (raw ?? "").trim();
}

function filterTraits(
  traits: Trait[],
  category: CategoryFilter,
  ownership: OwnershipFilter,
  q: string,
): Trait[] {
  let out = traits;
  if (category !== "全部") out = out.filter((t) => t.category === category);
  if (ownership !== "全部") {
    if (ownership === "专属") {
      out = out.filter((t) => t.ownerGeneralId !== null);
    } else {
      out = out.filter((t) => t.ownerGeneralId === null);
    }
  }
  if (q) {
    const needle = q.toLowerCase();
    out = out.filter((t) => t.name.toLowerCase().includes(needle));
  }
  // 稳定排序:category 内置顺序,再按 (专属优先),最后按名
  const catOrder: Record<TraitCategory, number> = {
    攻击: 0,
    防御: 1,
    谋略: 2,
    速度: 3,
    特殊: 4,
  };
  return [...out].sort((a, b) => {
    if (catOrder[a.category] !== catOrder[b.category]) {
      return catOrder[a.category] - catOrder[b.category];
    }
    const aUni = a.ownerGeneralId !== null ? 0 : 1;
    const bUni = b.ownerGeneralId !== null ? 0 : 1;
    if (aUni !== bUni) return aUni - bUni;
    return a.name.localeCompare(b.name, "zh-Hans-CN");
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type SearchParams = {
  category?: string;
  isUnique?: string;
  q?: string;
};

export default async function TraitsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  // Next 15+ 把 searchParams 标为 Promise,兼容两种形态
  const sp =
    searchParams instanceof Promise ? await searchParams : searchParams;

  const allTraits = loadTraits();
  const generals = loadGenerals();

  const currentCategory = parseCategory(sp.category);
  const currentOwnership = parseOwnership(sp.isUnique);
  const currentQ = parseQ(sp.q);
  const filtered = filterTraits(
    allTraits,
    currentCategory,
    currentOwnership,
    currentQ,
  );

  // 全量按 category 统计
  const catCounts: Record<TraitCategory, number> = {
    攻击: 0,
    防御: 0,
    谋略: 0,
    速度: 0,
    特殊: 0,
  };
  for (const t of allTraits) catCounts[t.category]++;

  // 关联武将查找表
  const generalById = new Map(generals.map((g) => [g.id, g]));

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {/* 顶部标题区 */}
      <header className="border-b border-line/60 pb-5 sm:pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F8 · Traits Codex
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 sm:gap-3">
          <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
            特技库
          </h1>
          <span className="text-sm text-ink-soft">
            共{" "}
            <span className="font-mono text-base text-primary">
              {allTraits.length}
            </span>{" "}
            个特技
            {" · "}5 类
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft sm:text-base">
          装备附带的特性分{" "}
          <strong className="text-accent-red">攻击</strong> /{" "}
          <strong className="text-accent-green">防御</strong> /{" "}
          <strong className="text-amber-700">谋略</strong> /{" "}
          <strong className="text-blue-700">速度</strong> /{" "}
          <strong className="text-purple-700">特殊</strong>{" "}
          五类。按 category Tab + 通用/专属 + 特技名搜索筛选。
        </p>
      </header>

      {/* 筛选条 */}
      <section aria-label="筛选" className="pt-6">
        <TraitsFilterBar
          currentCategory={currentCategory}
          currentIsUnique={currentOwnership}
          currentQ={currentQ}
          totalCount={filtered.length}
        />
      </section>

      {/* 特技网格 */}
      <section aria-label="特技列表" className="pt-6">
        {filtered.length === 0 ? (
          <EmptyState
            currentCategory={currentCategory}
            currentOwnership={currentOwnership}
            currentQ={currentQ}
            counts={catCounts}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((trait) => {
              const owner = trait.ownerGeneralId
                ? generalById.get(trait.ownerGeneralId)
                : undefined;
              return (
                <li key={trait.id}>
                  <TraitCard trait={trait} ownerGeneral={owner} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 底部:全量 category 分布 */}
      <section
        aria-label="特技分类分布"
        className="mt-10 rounded-lg border border-line/60 bg-card/60 p-5 text-sm text-ink-soft"
      >
        <h2 className="font-serif text-base font-semibold text-primary">
          全量特技按 category 分布
        </h2>
        <p className="mt-1 text-xs text-ink-soft/80">
          来自 data/traits.json(本次示例数据共 {allTraits.length} 条)
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              ["攻击", catCounts.攻击],
              ["防御", catCounts.防御],
              ["谋略", catCounts.谋略],
              ["速度", catCounts.速度],
              ["特殊", catCounts.特殊],
            ] as Array<[TraitCategory, number]>
          ).map(([c, n]) => (
            <li
              key={c}
              className="flex items-baseline justify-between rounded border border-line/40 bg-bg-cream/40 px-3 py-2"
            >
              <span className="text-ink">{c}</span>
              <span className="font-mono text-base text-primary">{n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  currentCategory,
  currentOwnership,
  currentQ,
  counts,
}: {
  currentCategory: CategoryFilter;
  currentOwnership: OwnershipFilter;
  currentQ: string;
  counts: Record<TraitCategory, number>;
}) {
  const reasons: string[] = [];
  if (currentCategory !== "全部") reasons.push(`分类「${currentCategory}」`);
  if (currentOwnership !== "全部")
    reasons.push(`通用/专属「${currentOwnership}」`);
  if (currentQ) reasons.push(`关键字「${currentQ}」`);

  // 当前过滤下确实没有任何 category 的特技
  const zero = Object.values(counts).every((n) => n === 0);
  if (zero) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-card/60 p-8 text-center text-ink-soft">
        <p className="font-serif text-lg text-primary">特技数据为空</p>
        <p className="mt-2 text-sm">
          data/traits.json 尚未录入任何特技。F8 列表需要至少 1 条特技才能渲染。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-line bg-card/60 p-8 text-center text-ink-soft">
      <p className="font-serif text-lg text-primary">没有匹配的特技</p>
      <p className="mt-2 text-sm">
        当前筛选条件:{reasons.length > 0 ? reasons.join(" · ") : "(无)"}
      </p>
      <p className="mt-1 text-xs text-ink-soft/80">
        试试调整通用/专属或清空搜索关键字
      </p>
    </div>
  );
}

