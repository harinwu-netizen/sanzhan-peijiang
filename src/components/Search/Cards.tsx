/**
 * Result card variants for the three indexed entity types.
 *
 * Pure presentational components — no client directives. They render an
 * anchor tag (Link) so the result is clickable and the URL fragment can be
 * deep-linked from the server side without JS.
 */
import Link from 'next/link';
import type { General, Skill, Lineup } from '@/types/data';

// ---------------------------------------------------------------------------
// 颜色工具
// ---------------------------------------------------------------------------

/** 阵营 → 配色(右下小色块)。 */
const CAMP_COLORS: Record<General['camp'], string> = {
  魏: 'bg-[#5a7aa5]', // 蓝灰
  蜀: 'bg-[#9c5a3a]', // 赭红
  吴: 'bg-[#5a8a5a]', // 绿
  群: 'bg-[#7a7a7a]', // 灰
};

/** 品质 → 文字色 + 背景色。 */
const QUALITY_BADGE: Record<General['quality'], string> = {
  橙: 'bg-accent-red/15 text-accent-red',
  紫: 'bg-[#7a5a9c]/15 text-[#7a5a9c]',
  蓝: 'bg-[#4a7aa5]/15 text-[#4a7aa5]',
};

/** subType → 徽章色(与 F2 一致)。 */
const SUBTYPE_BADGE: Record<Skill['subType'], string> = {
  主动: 'bg-accent-red/15 text-accent-red',
  被动: 'bg-accent-green/15 text-accent-green',
  指挥: 'bg-[#4a7aa5]/15 text-[#4a7aa5]',
  突击: 'bg-[#c47a3a]/15 text-[#c47a3a]',
  阵法: 'bg-[#7a5a9c]/15 text-[#7a5a9c]',
  兵种: 'bg-[#b59a3a]/20 text-[#8a6a1a]',
};

/** tier → 配色。 */
const TIER_BADGE: Record<Lineup['tier'], string> = {
  T0: 'bg-accent-red/15 text-accent-red',
  T1: 'bg-accent-green/15 text-accent-green',
  T2: 'bg-[#c4a050]/20 text-[#8a6a1a]',
  T3: 'bg-ink-soft/15 text-ink-soft',
};

// ---------------------------------------------------------------------------
// 三种卡片
// ---------------------------------------------------------------------------

export function GeneralCard({ general }: { general: General }) {
  return (
    <Link
      href={`/generals/${general.id}`}
      className="group block rounded-lg border border-line/70 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-semibold text-ink group-hover:text-primary sm:text-lg">
            {general.name}
          </h3>
          <p className="mt-1 text-xs text-ink-soft">
            阵营 <span className="text-ink">{general.camp}</span>
            <span className="mx-1.5 text-ink-soft/50">·</span>
            {general.isSP ? 'SP 武将' : '标准武将'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${CAMP_COLORS[general.camp]}`}
            aria-label={`阵营 ${general.camp}`}
          />
          <span
            className={`rounded-sm px-1.5 py-0.5 font-mono text-xs ${QUALITY_BADGE[general.quality]}`}
          >
            {general.quality}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link
      href={`/skills/${skill.id}`}
      className="group block rounded-lg border border-line/70 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-base font-semibold text-ink group-hover:text-primary sm:text-lg">
            {skill.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
            {skill.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`rounded-sm px-1.5 py-0.5 font-mono text-xs ${SUBTYPE_BADGE[skill.subType]}`}
          >
            {skill.subType}
          </span>
          <span
            className={`rounded-sm px-1.5 py-0.5 font-mono text-xs ${QUALITY_BADGE[skill.quality]}`}
          >
            {skill.quality}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function LineupCard({ lineup }: { lineup: Lineup }) {
  return (
    <Link
      href={`/lineups/${lineup.id}`}
      className="group block rounded-lg border border-line/70 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-base font-semibold text-ink group-hover:text-primary sm:text-lg">
            {lineup.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
            {lineup.description}
          </p>
          {lineup.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {lineup.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`rounded-sm px-1.5 py-0.5 font-mono text-xs ${TIER_BADGE[lineup.tier]}`}
          >
            {lineup.tier}
          </span>
          <span className="text-[10px] text-ink-soft">
            综合 {lineup.ratings.total.toFixed(0)}
          </span>
        </div>
      </div>
    </Link>
  );
}
