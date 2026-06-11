/**
 * F1 武将图鉴 — 兵种适性色块(详情页)
 *
 * 显示 5 个兵种(骑/盾/弓/枪/器)各自的 S/A/B/C 适性,
 * 用色块(绿/蓝/黄/灰)+ 大字号表示。
 */
import type { General } from '@/lib/data/schemas';
import { APTITUDE_BG, TROOP_TYPES } from './constants';

export interface AptitudeGridProps {
  general: Pick<General, 'cavalry' | 'shield' | 'archer' | 'spear' | 'siege'>;
}

export function AptitudeGrid({ general }: AptitudeGridProps) {
  return (
    <ul
      aria-label="兵种适性"
      className="grid grid-cols-5 gap-2 sm:gap-3"
    >
      {TROOP_TYPES.map((t) => {
        const grade = general[t.key];
        return (
          <li
            key={t.key}
            className="flex flex-col items-center gap-1 rounded-md border border-line/60 bg-bg-cream/40 p-2 sm:p-3"
          >
            <span className="text-xs text-ink-soft">{t.label}</span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-md text-lg font-semibold sm:h-10 sm:w-10 ${APTITUDE_BG[grade]}`}
              aria-label={`${t.label} 适性 ${grade}`}
            >
              {grade}
            </span>
          </li>
        );
      })}
    </ul>
  );
}