/**
 * F1 武将图鉴 — 武将卡片(列表页)
 *
 * 卡片显示:
 *   - 武将名(大字)
 *   - 阵营色标(左侧色条 + 阵营字)
 *   - 品质徽章(右上)
 *   - SP 标记(如有,SP 角标)
 *   - 5 个兵种适性色块(底部小色块,可选)
 *
 * 整张卡可点击 → /generals/[id]
 */
import Link from 'next/link';
import type { General } from '@/lib/data/schemas';
import {
  CAMP_BORDER,
  CAMP_BG,
  CAMP_COLOR,
  QUALITY_BADGE,
  QUALITY_LABEL,
  SP_LABEL,
  TROOP_TYPES,
  APTITUDE_BG,
} from './constants';

export interface GeneralCardProps {
  general: General;
}

export function GeneralCard({ general }: GeneralCardProps) {
  const isSP = general.isSP === true;

  return (
    <Link
      href={`/generals/${general.id}`}
      aria-label={`查看 ${general.name} 详情`}
      className={
        'group relative flex h-full flex-col rounded-lg border bg-card p-3 shadow-sm transition-all sm:p-4 ' +
        'hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 ' +
        'focus-visible:outline-offset-2 focus-visible:outline-primary ' +
        'border-line/70 hover:border-primary/60'
      }
    >
      {/* SP 角标 */}
      {isSP && (
        <span
          aria-label="SP 武将"
          className="absolute right-2 top-2 rounded-md bg-accent-red px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-bg-cream shadow-sm"
        >
          {SP_LABEL}
        </span>
      )}

      {/* 阵营色条 + 武将名 */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span
          aria-hidden
          className={`mt-1 h-10 w-1.5 shrink-0 rounded-full border ${CAMP_BORDER[general.camp]}`}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-base font-semibold text-ink group-hover:text-primary sm:text-lg lg:text-xl">
            {general.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${CAMP_BG[general.camp]} ${CAMP_COLOR[general.camp]}`}
            >
              {general.camp}
            </span>
            <span
              className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${QUALITY_BADGE[general.quality]}`}
              title={QUALITY_LABEL[general.quality]}
            >
              {general.quality}
            </span>
          </div>
        </div>
      </div>

      {/* 兵种适性色块(底部)— 5 个一排 */}
      <div className="mt-3 flex gap-1 sm:mt-4">
        {TROOP_TYPES.map((t) => {
          const grade = general[t.key];
          return (
            <span
              key={t.key}
              aria-label={`兵种 ${t.label} 适性 ${grade}`}
              title={`${t.label}: ${grade}`}
              className={`flex h-6 w-7 items-center justify-center rounded-sm text-[11px] font-semibold ${APTITUDE_BG[grade]}`}
            >
              {t.label}
            </span>
          );
        })}
      </div>

      {/* 自带战法类型 */}
      <p className="mt-3 text-xs text-ink-soft">
        自带战法:{' '}
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
          {general.trait}
        </span>
      </p>
    </Link>
  );
}