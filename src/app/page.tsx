import Link from "next/link";
import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// 首页 metadata(SEO)
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "三战配将助手 · 三国志·战略版配将工具",
  description:
    "为《三国志·战略版》玩家提供武将图鉴、战法图鉴、配将模拟、阵容推荐、模拟交战、特技库、版本特性与全站搜索的一站式 Web工具。覆盖50 名武将、50 个战法、15套推荐阵容。",
  keywords: [
    "三国志·战略版",
    "三战配将",
    "配将工具",
    "武将图鉴",
    "战法图鉴",
    "阵容推荐",
  ],
};

// ---------------------------------------------------------------------------
// 9 个功能入口卡片(8 个原路由 +1 个 home 总览入口)
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    id: "F1",
    code: "GENERALS",
    name: "武将图鉴",
    href: "/generals",
    desc: "查询蜀/魏/吴/群雄武将属性、兵种适性、传承战法、可用兵书。",
  },
  {
    id: "F2",
    code: "SKILLS",
    name: "战法图鉴",
    href: "/skills",
    desc: "主动/被动/指挥/突击/阵法/兵种 六类战法完整数据。",
  },
  {
    id: "F3",
    code: "SANDBOX",
    name: "配将模拟",
    href: "/sandbox",
    desc: "拖拽武将、装备战法与兵书,实时查看阵容评分。",
  },
  {
    id: "F4",
    code: "LINEUPS",
    name: "推荐阵容",
    href: "/lineups",
    desc: "T0 ~ T2 分级阵容,按打架/开荒/克制等标签筛选。",
  },
  {
    id: "F5",
    code: "SEARCH",
    name: "全站搜索",
    href: "/search",
    desc: "一站式跨实体搜索:武将、战法、阵容、特技、兵书。",
  },
  {
    id: "F7",
    code: "BATTLE",
    name: "模拟交战",
    href: "/battle",
    desc: "两端阵容对战模拟,逐回合输出伤害/治疗/控制。",
  },
  {
    id: "F8",
    code: "TRAITS",
    name: "特技库",
    href: "/traits",
    desc: "按武将、来源、类别筛选特技及触发条件。",
  },
  {
    id: "F9",
    code: "PATCHES",
    name: "版本特性",
    href: "/patches",
    desc: "S1 ~ S15 版本更新日志 + 新增/调整武将战法汇总。",
  },
  {
    id: "F6",
    code: "HOME",
    name: "本站概览",
    href: "/",
    desc: "回到首页,了解项目背景、数据规模与功能矩阵。",
  },
] as const;

export default function Home() {
  return (
    // 移动端响应式(S5):
    //   - 容器 padding: px-3 (mobile) → sm:px-4 → lg:px-6
    //   - 上下间距: py-8 (mobile) → sm:py-10 → lg:py-16
    <div className="mx-auto max-w-7xl px-3 py-8 sm:px-4 sm:py-10 lg:px-6 lg:py-16">
      {/* Hero 区 */}
      <section className="border-b border-line/60 pb-8 sm:pb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          三国志·战略版 ·玩家辅助工具
        </p>
        {/* 移动端 2xl → 桌面 5xl 渐进 */}
        <h1 className="mt-2 font-serif text-2xl font-semibold text-primary sm:mt-3 sm:text-3xl md:text-4xl lg:text-5xl">
          三战配将助手
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-soft sm:mt-4 sm:text-base sm:leading-7 lg:text-lg">
          为《三国志·战略版》玩家提供
          <strong>武将查询、战法查询、配将模拟、阵容推荐、模拟交战、特技库、版本特性</strong>
          等能力的 Web工具 —— 数据驱动,本地优先,后续可扩展为 PWA。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
          <span>50 名武将</span>
          <span className="text-line">·</span>
          <span>50 个战法</span>
          <span className="text-line">·</span>
          <span>15套推荐阵容</span>
          <span className="text-line">·</span>
          <span>8 大功能模块</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3">
          <Link
            href="/sandbox"
            className="min-h-[2.75rem] rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-bg-cream shadow-sm transition-all active:scale-95 hover:bg-primary/90 sm:px-5"
          >
            立即配将
          </Link>
          <Link
            href="/lineups"
            className="min-h-[2.75rem] rounded-md border border-line bg-card px-4 py-2.5 text-sm font-medium text-primary transition-all active:scale-95 hover:border-primary hover:bg-bg-cream sm:px-5"
          >
            查看阵容
          </Link>
        </div>
      </section>

      {/* 9 个功能入口卡片 — 移动端 1 列 → sm 2 列 → lg 3 列 */}
      <section aria-labelledby="features-heading" className="pt-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2
            id="features-heading"
            className="font-serif text-xl font-semibold text-primary sm:text-2xl lg:text-3xl"
          >
            功能入口
          </h2>
          <span className="text-xs text-ink-soft">共 {FEATURES.length} 个模块</span>
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.id}>
              <Link
                href={f.href}
                className="group flex h-full flex-col rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-sm bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                    {f.id} · {f.code}
                  </span>
                  <span
                    aria-hidden
                    className="text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-accent-red"
                  >
                    →
                  </span>
                </div>
                <h3 className="mt-2.5 font-serif text-base font-semibold text-ink sm:mt-3 sm:text-lg">
                  {f.name}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">
                  {f.desc}
                </p>
                <p className="mt-auto pt-3 text-xs text-ink-soft/80 sm:pt-4">
                  路径:{f.href}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="项目状态"
        className="mt-8 rounded-lg border border-dashed border-line bg-card/60 p-4 text-sm text-ink-soft sm:mt-12 sm:p-5"
      >
        <p>
          <span className="mr-2 inline-block rounded bg-accent-green/15 px-2 py-0.5 text-xs text-accent-green">
            LIVE
          </span>
          当前已部署 MVP,8 个功能路由全部可用。本站为玩家自制工具,与网易官方无关。
        </p>
      </section>
    </div>
  );
}
