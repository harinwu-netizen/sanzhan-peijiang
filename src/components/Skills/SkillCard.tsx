import Link from "next/link";
import type { Skill } from "@/lib/data/schemas";
import {
  QualityBadge,
  SubTypeBadge,
  subTypeAccentClass,
} from "./Badges";

/**
 * 战法列表卡片。
 *
 * 布局:
 *  - 顶部色条(按 subType 上色,左侧 3px)
 *  - 战法名(大字,serif)
 *  - subType 徽章 + 品质徽章
 *  - 发动概率(仅主动/突击有)
 *  - 目标数(单体/群体)
 *  - 底部:来源
 *
 * 整卡可点击 → /skills/[id]
 */
export function SkillCard({ skill }: { skill: Skill }) {
  const triggerText =
    skill.triggerRate === null
      ? "—"
      : `${Math.round(skill.triggerRate * 100)}%`;
  const targetText = skill.multiTarget ? "群体" : "单体";

  return (
    <Link
      href={`/skills/${skill.id}`}
      className={`group block h-full rounded-lg border border-line/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary border-l-4 ${subTypeAccentClass(skill.subType)}`}
    >
      <div className="flex h-full flex-col p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-base font-semibold text-ink group-hover:text-primary sm:text-lg">
            {skill.name}
          </h3>
          <span
            aria-hidden
            className="text-ink-soft/60 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-red"
          >
            →
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <SubTypeBadge subType={skill.subType} size="sm" />
          <QualityBadge quality={skill.quality} size="sm" />
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-soft">
          {skill.description}
        </p>

        <dl className="mt-auto grid grid-cols-3 gap-2 pt-4 text-[11px] text-ink-soft">
          <div>
            <dt className="text-ink-soft/70">发动</dt>
            <dd className="mt-0.5 font-mono text-sm text-ink">{triggerText}</dd>
          </div>
          <div>
            <dt className="text-ink-soft/70">目标</dt>
            <dd className="mt-0.5 font-mono text-sm text-ink">{targetText}</dd>
          </div>
          <div>
            <dt className="text-ink-soft/70">首回合</dt>
            <dd className="mt-0.5 font-mono text-sm text-ink">
              R{skill.startRound}
            </dd>
          </div>
        </dl>

        <p className="mt-3 truncate text-xs text-ink-soft/80">
          来源:<span className="text-ink-soft">{skill.source}</span>
        </p>
      </div>
    </Link>
  );
}
