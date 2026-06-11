/**
 * F9 版本特性 — 调整记录时间线(server component)
 *
 * 用 CSS 简单实现"竖线 + 圆点节点"的时间线,
 * 每条记录:日期 + 类型徽章 + 标题 + 详细描述 + (可选)受影响实体链接。
 *
 * 排序在调用方完成,这里只负责渲染。
 */
import Link from "next/link";
import type { Patch } from "@/lib/data/schemas";
import { loadGenerals, loadSkills } from "@/lib/data/loader";
import { TypeBadge } from "./TypeBadge";

// ---------------------------------------------------------------------------
// 受影响实体 ID → 名称映射(避免 N+1,在父组件预计算后传进来)
// ---------------------------------------------------------------------------

export interface AffectedEntity {
  id: string;
  name: string;
  href: string;
}

export interface PatchTimelineProps {
  patches: Patch[];
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 把 YYYY-MM-DD 切成 { y, m, d } 三个两位数字段,渲染时间线用 */
function splitDate(iso: string): { y: string; m: string; d: string } {
  const [y = "????", m = "??", d = "??"] = iso.split("-");
  return { y, m, d };
}

/**
 * 根据 affectedIds 解析可链接的实体。
 *
 * - 优先去 generals 索引里查(武将名 → /generals/[id])
 * - 其次查 skills 索引(战法名 → /skills/[id])
 * - 都查不到(比如阵法)就跳过 — 反正 MVP 阶段阵法没有详情页
 */
function resolveAffected(ids: string[]): AffectedEntity[] {
  if (ids.length === 0) return [];
  const generalMap = new Map<string, string>();
  for (const g of loadGenerals()) generalMap.set(g.id, g.name);
  const skillMap = new Map<string, string>();
  for (const s of loadSkills()) skillMap.set(s.id, s.name);

  const out: AffectedEntity[] = [];
  for (const id of ids) {
    const gName = generalMap.get(id);
    if (gName) {
      out.push({ id, name: gName, href: `/generals/${id}` });
      continue;
    }
    const sName = skillMap.get(id);
    if (sName) {
      out.push({ id, name: sName, href: `/skills/${id}` });
      continue;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export function PatchTimeline({ patches }: PatchTimelineProps) {
  if (patches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-card/60 p-8 text-center text-sm text-ink-soft">
        <p className="font-serif text-base text-ink">暂无符合条件的调整记录</p>
        <p className="mt-1">试试切换上方的类型筛选,或查看「全部」。</p>
      </div>
    );
  }

  return (
    <ol
      aria-label="近 6 个月调整记录"
      // 移动端:左侧时间线窄一些 + 卡片 padding 减小
      className="relative ml-3 border-l-2 border-line/60 sm:ml-6"
    >
      {patches.map((p) => {
        const { y, m, d } = splitDate(p.date);
        const affected = resolveAffected(p.affectedIds);
        return (
          <li key={p.id} className="relative mb-6 pl-5 sm:mb-8 sm:pl-10">
            {/* 时间线节点 — 圆点 + 中心小圆点 */}
            <span
              aria-hidden
              className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-line bg-card sm:-left-[13px] sm:h-5 sm:w-5"
            >
              <span className="block h-1.5 w-1.5 rounded-full bg-primary" />
            </span>

            {/* 卡片 */}
            <article className="rounded-lg border border-line/60 bg-card/90 p-3 shadow-sm transition-colors hover:border-primary/40 sm:p-5">
              <header className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                {/* 日期块 — 大字小字混合,左对齐 */}
                <time
                  dateTime={p.date}
                  className="inline-flex items-baseline gap-1 rounded bg-bg-cream/60 px-2 py-1 font-mono"
                  aria-label={`发布日期 ${p.date}`}
                >
                  <span className="text-base font-semibold text-primary">
                    {d}
                  </span>
                  <span className="text-[11px] text-ink-soft">{m} 月</span>
                  <span className="text-[10px] text-ink-soft/70">{y}</span>
                </time>
                <TypeBadge type={p.type} />
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {p.version}
                </span>
              </header>

              <h3 className="mt-3 font-serif text-lg font-semibold leading-snug text-ink">
                {p.summary}
              </h3>
              <p className="mt-2 text-sm leading-7 text-ink-soft">
                {p.details}
              </p>

              {affected.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-ink-soft/80">
                    涉及:
                  </span>
                  {affected.map((a) => (
                    <Link
                      key={a.id}
                      href={a.href}
                      className="rounded border border-line bg-bg-cream/60 px-2 py-0.5 text-[11px] text-primary transition-colors hover:border-primary hover:bg-primary/10"
                    >
                      {a.name}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
