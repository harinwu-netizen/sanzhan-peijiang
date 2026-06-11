/**
 * F4 推荐阵容 — 筛选条(server component,纯 <a> + GET form,无 client JS)
 *
 * 维度:
 *  - camp    阵营(魏/蜀/吴/群,从阵容 3 武将的 camp 聚合 — 详见 page.tsx)
 *  - tier    强度(T0/T1/T2/T3)
 *  - sort    排序(score=综合分 desc / heat=热度)
 *  - q       关键字(匹配阵容名 / 描述)
 *
 * 阵营筛选用 GET form 的 <select>;tier 用 5 个 <a> tab;sort 用 2 个 <a> tab。
 * 这样不引入 client component,SSR 友好。
 */
import Link from "next/link";
import type { Camp, LineupTier } from "@/lib/data/schemas";
import { ALL_CAMPS } from "@/components/Generals/constants";
import { ALL_TIERS, SORT_OPTIONS, type SortKey } from "./constants";

// ---------------------------------------------------------------------------
// 入参
// ---------------------------------------------------------------------------

export interface LineupFiltersValue {
  camp: Camp | null;
  tier: LineupTier | "全部" | null;
  sort: SortKey;
  q: string;
}

export interface LineupFilterBarProps {
  value: LineupFiltersValue;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// URL 拼接工具
// ---------------------------------------------------------------------------

function serializeQuery(
  base: LineupFiltersValue,
  patch: Partial<LineupFiltersValue>,
): string {
  const merged: LineupFiltersValue = { ...base, ...patch };
  const params = new URLSearchParams();
  if (merged.camp) params.set("camp", merged.camp);
  if (merged.tier && merged.tier !== "全部") params.set("tier", merged.tier);
  if (merged.sort && merged.sort !== "score") params.set("sort", merged.sort);
  if (merged.q) params.set("q", merged.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function tabHref(
  base: LineupFiltersValue,
  patch: Partial<LineupFiltersValue>,
): string {
  const qs = serializeQuery(base, patch);
  return qs ? `/lineups${qs}` : "/lineups";
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

function PillLink({
  href,
  active,
  children,
  title,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={active}
      title={title}
      className={
        active
          ? "rounded-md bg-primary px-3 py-1 text-xs font-medium text-bg-cream shadow-sm"
          : "rounded-md border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary"
      }
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export function LineupFilterBar({ value, totalCount }: LineupFilterBarProps) {
  return (
    <div className="space-y-4">
      {/* 阵营 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-soft sm:w-16">
          阵营
        </span>
        <div className="flex flex-wrap gap-1.5">
          <PillLink href={tabHref(value, { camp: null })} active={value.camp === null}>
            全部
          </PillLink>
          {ALL_CAMPS.map((c) => (
            <PillLink
              key={c}
              href={tabHref(value, { camp: c })}
              active={value.camp === c}
            >
              {c}
            </PillLink>
          ))}
        </div>
      </div>

      {/* 强度 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-soft sm:w-16">
          强度
        </span>
        <div className="flex flex-wrap gap-1.5">
          <PillLink href={tabHref(value, { tier: null })} active={value.tier === null || value.tier === "全部"}>
            全部
          </PillLink>
          {ALL_TIERS.map((t) => (
            <PillLink
              key={t}
              href={tabHref(value, { tier: t })}
              active={value.tier === t}
            >
              {t}
            </PillLink>
          ))}
        </div>
      </div>

      {/* 排序 + 关键字(form) */}
      <form
        method="GET"
        action="/lineups"
        className="flex flex-wrap items-end gap-3"
      >
        {/* 保留当前 camp / tier */}
        {value.camp && <input type="hidden" name="camp" value={value.camp} />}
        {value.tier && value.tier !== "全部" && (
          <input type="hidden" name="tier" value={value.tier} />
        )}

        <div className="flex flex-col gap-1 text-xs text-ink-soft">
          <span>排序</span>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <PillLink
                key={opt.value}
                href={tabHref(value, { sort: opt.value })}
                active={value.sort === opt.value}
              >
                {opt.label}
              </PillLink>
            ))}
          </div>
        </div>

        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-ink-soft">
          <span>关键字(阵容名 / 描述)</span>
          <input
            type="search"
            name="q"
            defaultValue={value.q}
            placeholder="例如:蜀枪 / 群弓 / 枪"
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
          {(value.camp || value.tier || value.q || value.sort !== "score") && (
            <Link
              href="/lineups"
              className="rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-primary hover:text-primary"
            >
              重置
            </Link>
          )}
        </div>

        <span className="ml-auto text-xs text-ink-soft">
          共 {totalCount} 套阵容
        </span>
      </form>
    </div>
  );
}
