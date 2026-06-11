/**
 * F1 武将图鉴 — 详情页属性横条
 *
 * 4 维属性(武力 / 智力 / 统率 / 速度)横向条形图:
 *   - 数字 + 标签
 *   - 进度条(0~200 范围,根据 0~200 满分映射)
 *   - 颜色:武力 红 / 智力 紫 / 统率 蓝 / 速度 绿
 */
import type { GeneralStats } from '@/lib/data/schemas';

export interface StatsBarsProps {
  stats: GeneralStats;
}

interface StatConfig {
  key: keyof GeneralStats;
  label: string;
  /** 横条颜色(text + bar) */
  bar: string;
  bg: string;
}

const STATS_CONFIG: StatConfig[] = [
  { key: '武力', label: '武力', bar: 'bg-red-500', bg: 'bg-red-100' },
  { key: '智力', label: '智力', bar: 'bg-purple-500', bg: 'bg-purple-100' },
  { key: '统率', label: '统率', bar: 'bg-sky-500', bg: 'bg-sky-100' },
  { key: '速度', label: '速度', bar: 'bg-emerald-500', bg: 'bg-emerald-100' },
];

/** 通用游戏满分 = 200(武将最高属一般在 200 以内,超出时按比例夹紧) */
const MAX_STAT = 200;

export function StatsBars({ stats }: StatsBarsProps) {
  return (
    <div
      aria-label="四维属性"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {STATS_CONFIG.map((cfg) => {
        const value = stats[cfg.key];
        const pct = Math.max(0, Math.min(100, (value / MAX_STAT) * 100));
        return (
          <div
            key={cfg.key}
            className="rounded-md border border-line/60 bg-bg-cream/40 p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                {cfg.label}
              </span>
              <span className="font-serif text-xl font-semibold text-ink">
                {value}
              </span>
            </div>
            <div
              className={`mt-2 h-2 w-full overflow-hidden rounded-full ${cfg.bg}`}
              role="progressbar"
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={MAX_STAT}
            >
              <div
                className={`h-full rounded-full transition-all ${cfg.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}