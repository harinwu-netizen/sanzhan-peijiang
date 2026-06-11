/**
 * F9 版本特性 — 列表页(server component)
 *
 * 玩家搜索"哪个版本加强/削弱了武将"的入口页。SEO 长尾内容。
 *
 * 三大区块(自上而下):
 *   1. 当前赛季机制  — CurrentSeasonIntro,从 data/patches.json 最新一条赛季机制解析
 *   2. 近 6 个月调整记录 — PatchTimeline + TypeFilterBar 联动筛选
 *   3. 赛季历史  — SeasonHistory,S1/S2/S3/PK 硬编码
 *
 * 全部 SSR,纯 server component,零 client JS — 百度收录友好。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { loadPatches } from "@/lib/data/loader";
import { CurrentSeasonIntro } from "@/components/Patches/CurrentSeasonIntro";
import { PatchTimeline } from "@/components/Patches/PatchTimeline";
import { SeasonHistory } from "@/components/Patches/SeasonHistory";
import {
  TypeFilterBar,
  parseTypeFilter,
  type TypeFilter,
} from "@/components/Patches/TypeFilterBar";

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
 title: "版本特性 · 三战配将助手",
 description:
 "三国志战略版版本调整武将战法一站收录 — 当前 PK赛季机制、近6 个月武将/战法/阵法调整记录、S1~PK赛季历史,玩家查询「哪个版本加强了张飞」「横扫千军削弱了没」的首选工具。",
 keywords: [
 "三国志战略版",
 "版本特性",
 "PK赛季",
 "武将调整",
 "战法调整",
 "阵法调整",
 ],
 openGraph: {
 title: "版本特性 · 三战配将助手",
 description: "三国志·战略版版本调整 +武将 /战法 /阵法改动记录一站收录。",
 type: "website",
 locale: "zh_CN",
 },
};

// ---------------------------------------------------------------------------
// Next.js 15+ page props
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function one(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

// ---------------------------------------------------------------------------
// 时间窗口 / 筛选
// ---------------------------------------------------------------------------

/** 计算「近 6 个月」的截止日期(相对今日) */
function sixMonthsAgoISO(): string {
  const now = new Date();
  // 6 个月前 = now - 180 天
  const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const y = cutoff.getFullYear();
  const m = String(cutoff.getMonth() + 1).padStart(2, "0");
  const d = String(cutoff.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 把 TypeFilter 映射到 data/patches.json 里的 type 字段判断函数。
 *
 * - "全部"   → 全部
 * - "武将"   → type === "武将调整"
 * - "战法"   → type === "战法调整"
 * - "赛季"   → type === "赛季机制"
 * - "阵法"   → type === "阵法调整" 或 "新阵法"
 */
function matchesTypeFilter(rawType: string, filter: TypeFilter): boolean {
  if (filter === "全部") return true;
  if (filter === "武将") return rawType === "武将调整";
  if (filter === "战法") return rawType === "战法调整";
  if (filter === "赛季") return rawType === "赛季机制";
  if (filter === "阵法") {
    return rawType === "阵法调整" || rawType === "新阵法";
  }
  return true;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PatchesPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const currentFilter = parseTypeFilter(one(raw.type));

  const all = loadPatches();

  // 1) 近 6 个月窗口(对原始全集,不受筛选影响)
  const cutoff = sixMonthsAgoISO();
  const recentAll = all.filter((p) => p.date >= cutoff);

  // 2) 应用筛选
  const recentFiltered = recentAll
    .filter((p) => matchesTypeFilter(p.type, currentFilter))
    // 排序:date desc(同一天内 version 升序兜底,稳定)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.version.localeCompare(b.version, "zh-Hans-CN");
    });

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {/* 标题区 */}
      <header className="border-b border-line/60 pb-5 sm:pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F9 · Patches
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 sm:gap-3">
          <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
            版本特性
          </h1>
          <p className="text-sm text-ink-soft">
            共 <span className="font-mono text-base text-primary">{all.length}</span> 条调整记录
            {" · "}
            <span className="font-mono text-base text-primary">
              {recentAll.length}
            </span>{" "}
            条近 6 个月内
          </p>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft sm:text-base">
          玩家查询三国志战略版「哪个版本加强了哪个武将 / 削弱了哪个战法」
          的入口页。当前赛季机制、近 6 个月武将 / 战法 / 阵法调整记录、
          S1 ~ PK 赛季历史一站收录,SEO 长尾内容。
        </p>
      </header>

      {/* 区块 1:当前赛季机制 */}
      <section aria-label="当前赛季机制" className="pt-6 sm:pt-8">
        <h2 className="sr-only">当前赛季机制</h2>
        <CurrentSeasonIntro patches={all} />
      </section>

      {/* 区块 2:近 6 个月调整记录 + 筛选 */}
      <section aria-label="近 6 个月调整记录" className="pt-8 sm:pt-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-4 sm:gap-3">
          <h2 className="font-serif text-xl font-semibold text-primary sm:text-2xl">
            近 6 个月调整记录
          </h2>
          <span className="text-xs text-ink-soft">
            截止 {cutoff} 起
            {currentFilter !== "全部" && (
              <span className="ml-2 rounded bg-accent-red/15 px-2 py-0.5 text-[11px] text-accent-red">
                已筛选:{currentFilter}
              </span>
            )}
          </span>
        </div>
        <TypeFilterBar current={currentFilter} total={recentAll.length} />
        <div className="mt-6">
          <PatchTimeline patches={recentFiltered} />
        </div>
      </section>

      {/* 区块 3:赛季历史 */}
      <section aria-label="赛季历史" className="mt-10 border-t border-line/60 pt-6 sm:mt-12 sm:pt-8">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary sm:mb-4 sm:text-2xl">
          赛季历史
        </h2>
        <SeasonHistory currentSeason="PK 赛季" />
      </section>

      {/* 底部回首页 */}
      <div className="mt-10 border-t border-line/60 pt-6 text-sm">
        <Link href="/" className="text-accent-red hover:underline">
          ← 返回首页
        </Link>
        <span className="mx-2 text-ink-soft/60">/</span>
        <span className="text-ink-soft">版本特性</span>
      </div>
    </div>
  );
}
