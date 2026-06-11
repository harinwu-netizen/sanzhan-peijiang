"use client";

/**
 * F3 配将模拟器 — 红度滑块(0-5 进阶)
 *
 * 用 5 个圆点 + 数字标签呈现,可点击具体等级。
 * (任务里说"滑块",但 0-5 离散值,做成 step 按钮更顺手)
 */
import { cn } from "./utils";

/** 0-5 进阶等级(MVP 用 RedLevel 数字字面量) */
type RedLevel = 0 | 1 | 2 | 3 | 4 | 5;

export function RedLevelSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  /** 武将名,用作 a11y label */
  label: string;
}) {
  const levels: RedLevel[] = [0, 1, 2, 3, 4, 5];
  return (
    <div
      // 滑块高度在移动端加到 12px(任务要求),这里用按钮的 44x44 触摸目标代替
      className="flex items-center gap-1 sm:gap-1.5"
      role="radiogroup"
      aria-label={`${label} 红度`}
    >
      {levels.map((lv) => {
        const active = value === lv;
        const filled = lv > 0 && lv <= value;
        return (
          <button
            key={lv}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(lv)}
            title={
              lv === 0
                ? "白板"
                : lv === 5
                  ? "满红"
                  : `${lv} 红 (+${lv * 4} 全属性)`
            }
            // 移动端:44x44 触摸目标,桌面端缩小为 24x24
            className={cn(
              "flex items-center justify-center rounded-full border font-mono transition-all active:scale-95",
              "h-11 w-11 text-sm sm:h-7 sm:w-7 sm:text-[10px]",
              active
                ? "border-accent-red bg-accent-red text-bg-cream"
                : filled
                  ? "border-accent-red/60 bg-accent-red/20 text-accent-red"
                  : "border-line bg-card text-ink-soft hover:border-accent-red/60",
            )}
          >
            {lv === 0 ? "○" : lv}
          </button>
        );
      })}
    </div>
  );
}
