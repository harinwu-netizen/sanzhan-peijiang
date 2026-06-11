/**
 * F1 武将图鉴 — 战法小卡(详情页)
 *
 * 用于显示:
 *   - 自带战法
 *   - 传承战法
 *   - 可学阵法战法
 *
 * 显示:战法名 + subType 徽章 + description
 * 如果 skillId 在 skillMap 里(详情页 server 端已经注入),
 * 战法名用 <Link> 包裹,链接到 /skills/[id];否则显示纯文本。
 */
import Link from 'next/link';
import type { Skill } from '@/lib/data/schemas';

export interface SkillCardProps {
  /** skill 数据,可能为 null(没有该战法时) */
  skill: Skill | null;
  /** 是否高亮"主推荐" */
  emphasis?: boolean;
}

/** 6 类战法 subType 的配色 */
const SUBTYPE_BADGE: Record<string, string> = {
  主动: 'bg-red-100 text-red-700',
  被动: 'bg-amber-100 text-amber-700',
  指挥: 'bg-sky-100 text-sky-700',
  突击: 'bg-orange-100 text-orange-700',
  阵法: 'bg-purple-100 text-purple-700',
  兵种: 'bg-emerald-100 text-emerald-700',
};

export function SkillCard({ skill, emphasis }: SkillCardProps) {
  // 没有战法数据(loader 找不到对应 ID)
  if (!skill) {
    return (
      <div className="rounded-md border border-dashed border-line bg-bg-cream/40 p-3 text-sm text-ink-soft">
        <span className="italic">暂未录入</span>
      </div>
    );
  }

  const subTypeClass =
    SUBTYPE_BADGE[skill.subType] ?? 'bg-stone-100 text-stone-700';

  return (
    <article
      className={
        'rounded-md border bg-card p-3 shadow-sm transition-all hover:border-primary/60 hover:shadow ' +
        (emphasis ? 'border-primary/40 ring-1 ring-primary/20' : 'border-line/60')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/skills/${skill.id}`}
          className="truncate font-serif text-base font-semibold text-ink hover:text-primary hover:underline sm:text-lg"
        >
          {skill.name}
        </Link>
        <span
          className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${subTypeClass}`}
        >
          {skill.subType}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-soft sm:text-sm">
        {skill.description}
      </p>
      {skill.source && (
        <p className="mt-2 text-[11px] text-ink-soft/80">
          来源:{skill.source}
        </p>
      )}
    </article>
  );
}