/**
 * F4 推荐阵容 — 6 维评分横条(server component)
 *
 * 用于评价页卡片 1 的左侧。每条带专属颜色 + 0-100 分数。
 * 数据必须与雷达图一致(同一个 ratings 对象)。
 */
import { RATING_AXES, type SixDimensionalRatings } from "./constants";

export interface RatingBarsProps {
  ratings: SixDimensionalRatings;
}

export function RatingBars({ ratings }: RatingBarsProps) {
  return (
    <ul
      aria-label="6 维评分"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {RATING_AXES.map((axis) => {
        const value = ratings[axis.key];
        const pct = Math.max(0, Math.min(100, value));
        return (
          <li
            key={axis.key}
            className="rounded-md border border-line/60 bg-bg-cream/40 p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: axis.color }}
              >
                {axis.label}
              </span>
              <span className="font-mono text-lg font-semibold text-ink">
                {value}
              </span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: axis.bg }}
              role="progressbar"
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: axis.color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
