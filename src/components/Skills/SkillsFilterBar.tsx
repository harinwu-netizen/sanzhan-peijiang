import Link from "next/link";
import type { Quality, SkillSubType } from "@/lib/data/schemas";

/**
 * 战法图鉴 · 筛选条。
 *
 * 重要:这是一个**纯 server component**,不需要 client JS。
 *
 * 交互设计:
 *  - 6 个 subType Tab + "全部":用 <Link> 切换 ?type=...
 *  - 品质筛选 + 搜索框:放进 <form method="GET">,提交时整页刷新
 *    (Next.js 会把 GET 表单字段作为 searchParams 传给当前 page)。
 *  - 当前选中的 Tab / 品质 用 button[type=submit] + form 隐式 field 实现。
 *
 * 这样不引入任何 client component,纯 SSR,hydration 0 负担。
 */

const SUBTYPE_TABS: Array<{ value: "全部" | SkillSubType; label: string }> = [
  { value: "全部", label: "全部" },
  { value: "主动", label: "主动" },
  { value: "被动", label: "被动" },
  { value: "指挥", label: "指挥" },
  { value: "突击", label: "突击" },
  { value: "阵法", label: "阵法" },
  { value: "兵种", label: "兵种" },
];

const QUALITY_OPTIONS: Array<{ value: "全部" | Quality; label: string }> = [
  { value: "全部", label: "全部品质" },
  { value: "橙", label: "橙·S" },
  { value: "紫", label: "紫·A" },
  { value: "蓝", label: "蓝·B" },
];

/**
 * 构造一个保留当前状态、只覆盖指定 key 的 searchParams 字符串。
 * 用于 Tab / 品质切换的 Link href。
 */
function buildHref(
  current: { type?: string; quality?: string; q?: string },
  override: Partial<{ type: string; quality: string; q: string }>,
): string {
  const merged = {
    type: override.type !== undefined ? override.type : current.type ?? "",
    quality:
      override.quality !== undefined ? override.quality : current.quality ?? "",
    q: override.q !== undefined ? override.q : current.q ?? "",
  };
  const params = new URLSearchParams();
  if (merged.type) params.set("type", merged.type);
  if (merged.quality) params.set("quality", merged.quality);
  if (merged.q) params.set("q", merged.q);
  const qs = params.toString();
  return qs ? `/skills?${qs}` : "/skills";
}

export function SkillsFilterBar({
  currentType,
  currentQuality,
  currentQ,
  totalCount,
}: {
  currentType: "全部" | SkillSubType;
  currentQuality: "全部" | Quality;
  currentQ: string;
  totalCount: number;
}) {
  const current = {
    type: currentType === "全部" ? "" : currentType,
    quality: currentQuality === "全部" ? "" : currentQuality,
    q: currentQ,
  };

  return (
    <div className="space-y-4">
      {/* 6+1 个 subType Tab */}
      <nav aria-label="战法类型" className="flex flex-wrap gap-2">
        {SUBTYPE_TABS.map((tab) => {
          const active = currentType === tab.value;
          const href =
            tab.value === "全部"
              ? buildHref(current, { type: "" })
              : buildHref(current, { type: tab.value });
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

      {/* 品质 + 搜索 (GET form → 当前 page) */}
      <form
        method="GET"
        action="/skills"
        className="flex flex-wrap items-end gap-3"
      >
        {/* 保留当前 type 在 form 里 — 避免搜索/品质切换丢 Tab */}
        {current.type && (
          <input type="hidden" name="type" value={current.type} />
        )}

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          <span>品质</span>
          <select
            name="quality"
            defaultValue={currentQuality}
            className="rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
          >
            {QUALITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-ink-soft">
          <span>按战法名搜索</span>
          <input
            type="search"
            name="q"
            defaultValue={currentQ}
            placeholder="例如:武峰 / 太平"
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
          {(current.type || current.quality || current.q) && (
            <Link
              href="/skills"
              className="rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-primary/60 hover:text-primary"
            >
              重置
            </Link>
          )}
        </div>

        <span className="ml-auto text-xs text-ink-soft">
          共 {totalCount} 个战法
        </span>
      </form>
    </div>
  );
}
