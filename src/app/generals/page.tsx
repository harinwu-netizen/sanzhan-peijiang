/**
 * F1 武将图鉴 — 列表页(server component)
 *
 * 能力:
 *   - 4 维筛选(阵营 / 兵种 S 适性 / SP / 品质)+ 1 维排序
 *   - 响应式 1/2/3/4 列卡片网格
 *   - "共 X 位武将" 总数
 *   - 空筛选结果有友好提示
 *
 * URL searchParams 是筛选的"唯一真相源",纯 SSR,无需 client 组件。
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { loadGenerals } from '@/lib/data/loader';
import { FiltersBar } from '@/components/Generals/FiltersBar';
import { GeneralCard } from '@/components/Generals/GeneralCard';
import {
  parseCamp,
  parseQuality,
  parseTroopKey,
  parseBool,
  type TroopKey,
} from '@/components/Generals/constants';
import type { General } from '@/lib/data/schemas';

export const metadata: Metadata = {
 title: '武将图鉴 · 三战配将助手',
 description:
 '三国志·战略版武将数据查询工具,收录50 名蜀/魏/吴/群雄武将的四维属性、兵种适性、自带/传承战法与可学阵法,支持按阵营、兵种 S适性、SP、品质多维筛选,玩家配将必备。',
 keywords: ['三国志战略版', '武将图鉴', '武将属性', '武将配将', '蜀魏吴群雄'],
 openGraph: {
 title: '武将图鉴 · 三战配将助手',
 description: '50 名三国志·战略版武将数据,四维属性 /兵种适性 / 自带传承战法一站查询。',
 type: 'website',
 locale: 'zh_CN',
 },
};

// ---------------------------------------------------------------------------
// Next.js 15+ page props:searchParams 是 Promise
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** 把字符串 | 字符串[] 统一收成单值 */
function one(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function GeneralsListPage({ searchParams }: PageProps) {
  const raw = await searchParams;

  // 解析 URL 参数(非法值降级为 null)
  const camp = parseCamp(one(raw.camp));
  const troopKey = parseTroopKey(one(raw.aptitude));
  const sp = parseBool(one(raw.sp));
  const quality = parseQuality(one(raw.quality));
  const sortRaw = one(raw.sort);
  const sort: 'quality' | 'name' =
    sortRaw === 'name' ? 'name' : 'quality';

  // 加载并筛选
  const all = loadGenerals();
  const filtered = filterGenerals(all, { camp, troopKey, sp, quality });
  const sorted = sortGenerals(filtered, sort);

  const filtersValue = { camp, troopKey, sp, quality, sort };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {/* 标题区 */}
      <header className="border-b border-line/60 pb-5 sm:pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F1 · Generals Codex
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 sm:gap-3">
          <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
            武将图鉴
          </h1>
          <p className="text-sm text-ink-soft">
            共 <span className="font-semibold text-primary">{sorted.length}</span> 位武将
            {sorted.length !== all.length && (
              <span className="ml-1 text-ink-soft/80">
                (已筛选,原始 {all.length} 位)
              </span>
            )}
          </p>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft sm:text-base">
          按阵营、兵种 S 适性、SP、品质筛选武将。点击卡片查看四维属性、兵种适性、自带/传承战法与可学阵法。
        </p>
      </header>

      {/* 筛选区 */}
      <div className="mt-6">
        <FiltersBar value={filtersValue} />
      </div>

      {/* 列表区 */}
      <section aria-label="武将列表" className="mt-6">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-card/60 p-8 text-center">
            <p className="font-serif text-lg text-ink">无匹配武将</p>
            <p className="mt-2 text-sm text-ink-soft">
              试试调整筛选条件,或
              <Link href="/generals" className="ml-1 text-accent-red hover:underline">
                清空筛选
              </Link>
              。
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((g) => (
              <li key={g.id}>
                <GeneralCard general={g} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 底部回首页 */}
      <div className="mt-10 border-t border-line/60 pt-6 text-sm">
        <Link href="/" className="text-accent-red hover:underline">
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 筛选 / 排序(纯函数,可被将来 vitest 复用)
// ---------------------------------------------------------------------------

interface FilterArgs {
  camp: ReturnType<typeof parseCamp>;
  troopKey: TroopKey | null;
  sp: boolean | null;
  quality: ReturnType<typeof parseQuality>;
}

function filterGenerals(
  list: General[],
  args: FilterArgs,
): General[] {
  return list.filter((g) => {
    if (args.camp && g.camp !== args.camp) return false;
    if (args.quality && g.quality !== args.quality) return false;
    if (args.troopKey && g[args.troopKey] !== 'S') return false;
    if (args.sp !== null) {
      const gIsSP = g.isSP === true;
      if (args.sp !== gIsSP) return false;
    }
    return true;
  });
}

const QUALITY_ORDER: Record<string, number> = { 橙: 0, 紫: 1, 蓝: 2 };

function sortGenerals(
  list: General[],
  sort: 'quality' | 'name',
): General[] {
  const copy = [...list];
  if (sort === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  } else {
    // 默认:品质优先(橙 > 紫 > 蓝),同品质按 name 升序
    copy.sort((a, b) => {
      const oa = QUALITY_ORDER[a.quality] ?? 99;
      const ob = QUALITY_ORDER[b.quality] ?? 99;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
  }
  return copy;
}