/**
 * F9 版本特性 — 当前赛季机制简介(server component)
 *
 * 从 data/patches.json 推断当前赛季(取 type=赛季机制 且 date 最新的一条),
 * 渲染其 summary + details 作为 hero 段落。
 *
 * 找不到时退化为通用占位文案(空数据时 build 不挂)。
 */
import type { Patch } from "@/lib/data/schemas";
import { TypeBadge } from "./TypeBadge";

export interface CurrentSeasonIntroProps {
  patches: Patch[];
}

export function CurrentSeasonIntro({ patches }: CurrentSeasonIntroProps) {
  // 找 type=赛季机制 的最新一条
  const current =
    patches
      .filter((p) => p.type === "赛季机制")
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  if (!current) {
    return (
      <section
        aria-label="当前赛季机制"
        className="rounded-xl border border-line/60 bg-card/80 p-6 shadow-sm"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-accent-green">
          当前赛季机制
        </p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-primary">
          暂无赛季机制数据
        </h2>
        <p className="mt-3 text-sm text-ink-soft">
          data/patches.json 中还没有 type=赛季机制 的记录。MVP
          阶段会先录入占位说明,后续版本维护任务会补全。
        </p>
      </section>
    );
  }

  // 简介段落 — 用 summary 当 h2,details 切分成多段
  const paragraphs = current.details
    .split(/[。\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <section
      aria-label="当前赛季机制"
      className="rounded-xl border border-accent-green/40 bg-gradient-to-br from-card to-bg-cream/40 p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm uppercase tracking-[0.3em] text-accent-green">
          当前赛季机制
        </p>
        <TypeBadge type={current.type} />
        <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {current.version}
        </span>
        <span className="font-mono text-[11px] text-ink-soft">
          {current.date}
        </span>
      </div>
      <h2 className="mt-3 font-serif text-2xl font-semibold leading-snug text-primary sm:text-3xl">
        {current.summary}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-ink-soft sm:text-base">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}。</p>
        ))}
      </div>
    </section>
  );
}
