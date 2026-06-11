/**
 * F5 全站搜索 · 页面入口。
 *
 * 这里是 server component:
 *   1. 在服务端用 data loader 加载三类数据(generals / skills / lineups)
 *   2. 读取 URL ?q= 作为初始搜索关键词
 *   3. 把数据和初始关键词作为 props 传给 client 搜索组件 <SearchClient/>
 *
 * 整个页面采用 App Router 默认流式渲染:服务端先输出壳子 + 搜索框,客户端
 * hydrate 后再跑 Fuse.js 实时搜索,避免 SSR 跑客户端库的副作用。
 */
import type { Metadata } from 'next';
import { loadGenerals, loadSkills, loadLineups } from '@/lib/data/loader';
import { SearchClient } from '@/components/Search';

export const metadata: Metadata = {
 title: '全站搜索 · 三战配将助手',
 description:
 '三国志·战略版一站式跨实体搜索:输入武将、战法、阵容、特技、兵书关键字,Fuse.js模糊匹配直达对应详情页,50 +50 +15+ 数据全覆盖。',
 keywords: ['三国志战略版', '全站搜索', 'Fuse搜索', '武将搜索', '战法搜索'],
 openGraph: {
 title: '全站搜索 · 三战配将助手',
 description: '三国志·战略版一站式跨实体搜索,武将/战法/阵容/特技/兵书全覆盖。',
 type: 'website',
 locale: 'zh_CN',
 },
};

/**
 * 必须让 Next.js 把这个页面当 dynamic 处理:
 *   - 我们读 `searchParams.q` 来恢复初始搜索关键词
 *   - 客户端 Fuse 索引是真正干活的,但 SSR 必须先拿到 `q` 才能回填到 input 的 value
 *   - `force-static` 会让 searchParams 在请求时永远是 {} —— URL ?q= 失效
 *
 * 因此这里显式声明 dynamic = 'force-dynamic'。
 */
export const dynamic = 'force-dynamic';

interface SearchPageProps {
  /** Next.js 15+ 把 searchParams 异步化,需要 await。 */
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const initialQuery = (params?.q ?? '').toString();

  // 三份数据。loader 内置缓存 + 校验,可放心在 SSR 里调用。
  const generals = loadGenerals();
  const skills = loadSkills();
  const lineups = loadLineups();

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <header className="mb-6 sm:mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F5 · Site Search
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-primary sm:mt-3 sm:text-3xl lg:text-4xl">
          全站搜索
        </h1>
        <p className="mt-3 text-base text-ink-soft">
          一站式搜武将、战法、阵容,直达对应详情页。
          <span className="ml-1 text-ink-soft/80">
            数据规模:武将 {generals.length} · 战法 {skills.length} · 阵容{' '}
            {lineups.length}
          </span>
        </p>
      </header>

      <SearchClient
        initialQuery={initialQuery}
        generals={generals}
        skills={skills}
        lineups={lineups}
      />
    </div>
  );
}
