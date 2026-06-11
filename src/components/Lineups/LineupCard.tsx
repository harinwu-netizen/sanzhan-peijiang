/**
 * F4 推荐阵容 — 列表卡片(server component)
 *
 * 布局:
 *  ┌─────────────────────────────┐
 *  │ 蜀枪   T1  打架·PVP         │  ← 名字 + tier + tags
 *  │ ⓐ ⓑ ⓒ                       │  ← 3 武将头像(首字符 + 阵营色)
 *  │ 评分 62.5                    │  ← 综合分(大数字)
 *  │                             │
 *  │ 克制:蜀弓    被克:群弓        │  ← 克制关系(单行)
 *  └─────────────────────────────┘
 *
 * 整卡可点击 → /lineups/[id](最外层 <Link>)
 */
import Link from "next/link";
import type { General, Lineup } from "@/lib/data/schemas";
import { TIER_STYLES, tagStyleClass, TROOP_LABELS } from "./constants";
import { GeneralAvatar } from "./GeneralAvatar";

export interface LineupCardProps {
  lineup: Lineup;
  /** 由父级解析好的 3 个武将(name + camp 用) */
  generals: General[];
}

export function LineupCard({ lineup, generals }: LineupCardProps) {
  const tier = TIER_STYLES[lineup.tier];
  const troopLabel = TROOP_LABELS[lineup.troop];

  return (
    <Link
      href={`/lineups/${lineup.id}`}
      className="group flex h-full flex-col gap-3 rounded-xl border border-line/70 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-4"
    >
      {/* 顶部:tier 徽章 + 标签(右上角) */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg font-semibold text-ink group-hover:text-primary sm:text-xl">
            {lineup.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-ink-soft/80">
            {troopLabel.full} · 强度 {tier.label} · {tier.description}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wider shadow-sm ${tier.badge}`}
          title={tier.description}
        >
          {tier.label}
        </span>
      </div>

      {/* 中部:3 武将头像 + 阵容 ID */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {generals.map((g, i) => (
            <GeneralAvatar
              key={g.id}
              general={g}
              name={g.name}
              size="md"
              highlight={i === 0}
            />
          ))}
        </div>
        <div className="ml-1 flex flex-col">
          <span className="text-[11px] text-ink-soft/80">阵容 ID</span>
          <span className="font-mono text-[11px] text-ink-soft">
            {lineup.id}
          </span>
        </div>
      </div>

      {/* 综合分 */}
      <div className="flex items-baseline justify-between rounded-md border border-line/50 bg-bg-cream/40 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
          综合分
        </span>
        <span className="font-mono text-2xl font-semibold text-primary">
          {lineup.ratings.total.toFixed(1)}
        </span>
      </div>

      {/* 标签(可换行) */}
      {lineup.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {lineup.tags.map((tag, i) => (
            <span
              key={tag}
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${tagStyleClass(tag, i)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 克制关系(单行) */}
      <div className="mt-auto space-y-1 border-t border-line/50 pt-2 text-[11px] text-ink-soft">
        {lineup.counters.length > 0 && (
          <p>
            <span className="text-accent-green">克制</span>:{" "}
            <span className="text-ink">{lineup.counters.join("、")}</span>
          </p>
        )}
        {lineup.counteredBy.length > 0 && (
          <p>
            <span className="text-accent-red">被克</span>:{" "}
            <span className="text-ink">{lineup.counteredBy.join("、")}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
