import Link from "next/link";
import type { TraitCategory } from "@/lib/data/schemas";

/**
 * 特技库 · 筛选条。
 *
 * 纯 server component,无 client JS。
 *  - 6 个 category Tab(全部 + 5 类)用 <Link> 切换 ?category=...
 *  - 通用/专属筛选 + 搜索框放进 <form method="GET">。
 *  - 提交后整页刷新,Next.js 把 GET 表单字段作为 searchParams 传给当前 page。
 */

type CategoryFilter = "全部" | TraitCategory;
const CATEGORY_TABS: ReadonlyArray<{ value: CategoryFilter; label: string }> = [
  { value: "全部", label: "全部" },
  { value: "攻击", label: "攻击" },
  { value: "防御", label: "防御" },
  { value: "谋略", label: "谋略" },
  { value: "速度", label: "速度" },
  { value: "特殊", label: "特殊" },
];

type OwnershipFilter = "全部" | "通用" | "专属";
const OWNERSHIP_OPTIONS: ReadonlyArray<{ value: OwnershipFilter; label: string }> = [
  { value: "全部", label: "全部" },
  { value: "通用", label: "通用" },
  { value: "专属", label: "专属" },
];

/**
 * 构造一个保留当前状态、只覆盖指定 key 的 searchParams 字符串。
 * 用于 Tab / 通用-专属切换的 Link href。
 */
function buildHref(
  current: { category?: string; isUnique?: string; q?: string },
  override: Partial<{ category: string; isUnique: string; q: string }>,
): string {
  const merged = {
    category:
      override.category !== undefined ? override.category : current.category ?? "",
    isUnique:
      override.isUnique !== undefined ? override.isUnique : current.isUnique ?? "",
    q: override.q !== undefined ? override.q : current.q ?? "",
  };
  const params = new URLSearchParams();
  if (merged.category) params.set("category", merged.category);
  if (merged.isUnique) params.set("isUnique", merged.isUnique);
  if (merged.q) params.set("q", merged.q);
  const qs = params.toString();
  return qs ? `/traits?${qs}` : "/traits";
}

export function TraitsFilterBar({
  currentCategory,
  currentIsUnique,
  currentQ,
  totalCount,
}: {
  currentCategory: CategoryFilter;
  currentIsUnique: OwnershipFilter;
  currentQ: string;
  totalCount: number;
}) {
  const current = {
    category: currentCategory === "全部" ? "" : currentCategory,
    isUnique: currentIsUnique === "全部" ? "" : currentIsUnique,
    q: currentQ,
  };

  return (
    <div className="space-y-4">
      {/* 6 个 category Tab */}
      <nav aria-label="特技分类" className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => {
          const active = currentCategory === tab.value;
          const href =
            tab.value === "全部"
              ? buildHref(current, { category: "" })
              : buildHref(current, { category: tab.value });
          return (
            <Link
              key={tab.value}
              href={href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-bg-cream shadow-sm"
                  : "border-line/70 bg-card text-ink-soft hover:border-primary/60 hover:text-primary"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* 通用/专属 + 搜索 (GET form → 当前 page) */}
      <form
        method="GET"
        action="/traits"
        className="flex flex-wrap items-end gap-3"
      >
        {/* 保留当前 category 在 form 里 — 避免搜索/通用-专属切换丢 Tab */}
        {current.category && (
          <input type="hidden" name="category" value={current.category} />
        )}

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          <span>通用 / 专属</span>
          <select
            name="isUnique"
            defaultValue={currentIsUnique}
            className="rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
          >
            {OWNERSHIP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-ink-soft">
          <span>按特技名搜索</span>
          <input
            type="search"
            name="q"
            defaultValue={currentQ}
            placeholder="例如:龙胆 / 暴击"
            className="rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-primary focus:outline-none"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-bg-cream transition-colors hover:bg-primary/90"
          >
            应用筛选
          </button>
          {(current.category || current.isUnique || current.q) && (
            <Link
              href="/traits"
              className="rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-primary/60 hover:text-primary"
            >
              重置
            </Link>
          )}
        </div>

        <span className="ml-auto text-xs text-ink-soft">
          共 {totalCount} 个特技
        </span>
      </form>
    </div>
  );
}
