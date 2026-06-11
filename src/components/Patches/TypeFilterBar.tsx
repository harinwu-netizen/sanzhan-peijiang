/**
 * F9 版本特性 — 类型筛选条(server component)
 *
 * 4 个 type 选项 + "全部" 按钮:全部 / 武将 / 战法 / 赛季机制 / 新阵法
 * (类型集合根据 data/patches.json 实际出现的 type 字段收敛)
 *
 * 复用 F1 FiltersBar 的"PillRow 风格" — 用 <Link> + URL searchParams 拼新的 URL,
 * Next.js 重新渲染 server component,SSR 友好且 SEO 友好。
 */
import Link from "next/link";

// ---------------------------------------------------------------------------
// 类型选项
// ---------------------------------------------------------------------------

/** 列表类型筛选的合法值(含"全部"哨兵) */
export type TypeFilter = "全部" | "武将" | "战法" | "赛季" | "阵法";

/** 5 个筛选项的元数据 */
const TYPE_OPTIONS: ReadonlyArray<{ value: TypeFilter; label: string }> = [
  { value: "全部", label: "全部" },
  { value: "武将", label: "武将调整" },
  { value: "战法", label: "战法调整" },
  { value: "赛季", label: "赛季机制" },
  { value: "阵法", label: "阵法 / 新机制" },
];

/** URL value → TypeFilter(白名单校验) */
export function parseTypeFilter(raw: string | undefined): TypeFilter {
  if (!raw) return "全部";
  if (
    raw === "全部" ||
    raw === "武将" ||
    raw === "战法" ||
    raw === "赛季" ||
    raw === "阵法"
  ) {
    return raw as TypeFilter;
  }
  return "全部";
}

/** 把当前 typeFilter 拼成 /patches?type=xxx */
function buildHref(current: TypeFilter, next: TypeFilter): string {
  // 选"全部" → 清空 query
  if (next === "全部") {
    return "/patches";
  }
  // 其它 → 保留 type 参数
  const params = new URLSearchParams();
  params.set("type", next);
  return `/patches?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export interface TypeFilterBarProps {
  /** 当前激活的类型筛选 */
  current: TypeFilter;
  /** 命中数量(在"全部"标签上展示总数,旁标) */
  total: number;
}

export function TypeFilterBar({ current, total }: TypeFilterBarProps) {
  return (
    <section
      aria-label="类型筛选"
      className="rounded-lg border border-line/70 bg-card/80 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-soft sm:w-16">
          类型
        </span>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTIONS.map((opt) => {
            const active = current === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildHref(current, opt.value)}
                aria-pressed={active}
                className={
                  active
                    ? "rounded-md bg-primary px-3 py-1 text-xs font-medium text-bg-cream shadow-sm"
                    : "rounded-md border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary"
                }
              >
                {opt.label}
                {opt.value === "全部" && (
                  <span className="ml-1 text-[10px] opacity-80">
                    ({total})
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
