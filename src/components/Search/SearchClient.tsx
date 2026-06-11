'use client';

/**
 * F5 全站搜索 · 客户端搜索组件。
 *
 * 行为:
 *  - 接收 server component 加载好的三类数据(generals / skills / lineups)
 *  - 在 client 端用 fuse.js 各自建索引,实时对用户输入做模糊匹配
 *  - 200ms 去抖;URL ?q= 双向同步(分享 / 刷新可恢复)
 *  - 结果按实体类型分三组,每组最多展示 5 条,多于 5 条时显示"查看全部"
 *
 * SSR 注意: Fuse.js 只能在 client 端 import。我们用一个 `mounted` 标记
 * 把"是否已经 hydrate 完成"和"是否已经运行过一次搜索"分开,避免首屏
 * 服务端渲染结果列表导致 hydration mismatch(SSR 阶段始终渲染空状态)。
 */
import Fuse from 'fuse.js';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { General, Skill, Lineup } from '@/types/data';
import { SearchBox } from './SearchBox';
import { ResultGroup } from './ResultGroup';
import { GeneralCard, SkillCard, LineupCard } from './Cards';
import { SEARCH_LIMITS } from './types';

export interface SearchClientProps {
  /** Initial value, usually the ?q= searchParam from the URL. */
  initialQuery: string;
  generals: General[];
  skills: Skill[];
  lineups: Lineup[];
}

// ---------------------------------------------------------------------------
// Fuse 配置
// ---------------------------------------------------------------------------

const FUSE_OPTIONS = {
  /** 阈值越小越严格(0 = 完全匹配,1 = 啥都中)。中文字段 0.3 体感较合适。 */
  threshold: 0.3,
  /** 长字段允许一定比例的拼写误差。 */
  distance: 100,
  /** 包含子串也算命中(对中文短词友好)。 */
  ignoreLocation: true,
  /** 关闭大小写敏感(中文字段影响小,留着便宜)。 */
  isCaseSensitive: false,
  minMatchCharLength: 1,
} as const;

const GENERAL_KEYS = ['name', 'camp', 'selfSkillId'] as const;
const SKILL_KEYS = ['name', 'description', 'source'] as const;
const LINEUP_KEYS = ['name', 'description', 'generalIds'] as const;

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export function SearchClient({
  initialQuery,
  generals,
  skills,
  lineups,
}: SearchClientProps) {
  /** 输入框当前值(用户每次按键都更新)。 */
  const [query, setQuery] = useState(initialQuery);
  /** 去抖后的值,实际拿去 Fuse 搜索。 */
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  /**
   * 是否已 hydrate 到 client(避免 SSR 跑 Fuse 引发 hydration mismatch)。
   *
   * 用 useSyncExternalStore 而不是 useState + useEffect 是因为:
   *   - useState 在 effect 里 setMounted(true) 会触发 react-hooks/set-state-in-effect 告警
   *   - useSyncExternalStore 的设计就允许"挂载检测"这种 client/server 不一致场景:
   *     第三个参数(server snapshot) 在 SSR 时返回 false,client 时返回 true,
   *     不会触发额外的 effect 循环
   */
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  // 去抖:把 query 延迟 200ms 同步到 debouncedQuery
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_LIMITS.debounceMs);
    return () => window.clearTimeout(t);
  }, [query]);

  // 同步 URL: ?q=<debouncedQuery>(用 replaceState,不会触发 Next.js 重新渲染)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (debouncedQuery.trim()) {
      url.searchParams.set('q', debouncedQuery.trim());
    } else {
      url.searchParams.delete('q');
    }
    // 避免无意义 history 噪音:值未变就不动
    if (window.location.search !== url.search) {
      window.history.replaceState({}, '', url.toString());
    }
  }, [debouncedQuery]);

  // Fuse 索引(数据不变就只建一次)
  const fuseGenerals = useMemo(
    () => new Fuse(generals, { ...FUSE_OPTIONS, keys: [...GENERAL_KEYS] }),
    [generals],
  );
  const fuseSkills = useMemo(
    () => new Fuse(skills, { ...FUSE_OPTIONS, keys: [...SKILL_KEYS] }),
    [skills],
  );
  const fuseLineups = useMemo(
    () => new Fuse(lineups, { ...FUSE_OPTIONS, keys: [...LINEUP_KEYS] }),
    [lineups],
  );

  // 实际搜索
  const trimmed = debouncedQuery.trim();
  const generalResults = useMemo<General[]>(() => {
    if (!mounted || !trimmed) return [];
    return fuseGenerals.search(trimmed).map((r) => r.item);
  }, [mounted, trimmed, fuseGenerals]);

  const skillResults = useMemo<Skill[]>(() => {
    if (!mounted || !trimmed) return [];
    return fuseSkills.search(trimmed).map((r) => r.item);
  }, [mounted, trimmed, fuseSkills]);

  const lineupResults = useMemo<Lineup[]>(() => {
    if (!mounted || !trimmed) return [];
    return fuseLineups.search(trimmed).map((r) => r.item);
  }, [mounted, trimmed, fuseLineups]);

  const totalCount =
    generalResults.length + skillResults.length + lineupResults.length;

  const perGroup = SEARCH_LIMITS.perGroup;
  const showEmptyHint = !query.trim() || !mounted;

  return (
    <div className="space-y-6">
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="试试搜 '诸葛亮'、'太平道法'、'武峰阵'"
        resultCount={showEmptyHint ? null : totalCount}
      />

      {showEmptyHint ? (
        <EmptyState />
      ) : totalCount === 0 ? (
        <NoResults query={trimmed} />
      ) : (
        <div className="space-y-6">
          <ResultGroup
            title="武将"
            total={generalResults.length}
            visibleCount={perGroup}
            viewAllHref={`/generals?q=${encodeURIComponent(trimmed)}`}
            emptyHint="无匹配武将"
          >
            {generalResults.slice(0, perGroup).map((g) => (
              <li key={g.id}>
                <GeneralCard general={g} />
              </li>
            ))}
          </ResultGroup>

          <ResultGroup
            title="战法"
            total={skillResults.length}
            visibleCount={perGroup}
            viewAllHref={`/skills?q=${encodeURIComponent(trimmed)}`}
            emptyHint="无匹配战法"
          >
            {skillResults.slice(0, perGroup).map((s) => (
              <li key={s.id}>
                <SkillCard skill={s} />
              </li>
            ))}
          </ResultGroup>

          <ResultGroup
            title="阵容"
            total={lineupResults.length}
            visibleCount={perGroup}
            viewAllHref={`/lineups?q=${encodeURIComponent(trimmed)}`}
            emptyHint="无匹配阵容"
          >
            {lineupResults.slice(0, perGroup).map((l) => (
              <li key={l.id}>
                <LineupCard lineup={l} />
              </li>
            ))}
          </ResultGroup>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 空态 & 无结果
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-card/60 p-6">
      <p className="text-sm text-ink-soft">
        试试搜 <button
          type="button"
          className="mx-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary hover:bg-primary/20"
          onClick={() => {
            // 通过自定义事件让 SearchBox 知道要更新值(简化:只是示例提示)
            if (typeof document !== 'undefined') {
              const input = document.querySelector<HTMLInputElement>(
                'input[type="search"]',
              );
              if (input) {
                input.focus();
              }
            }
          }}
        >诸葛亮</button>、<span className="font-mono text-primary">太平道法</span>、<span className="font-mono text-primary">武峰阵</span> 等关键词。
      </p>
      <p className="mt-2 text-xs text-ink-soft/80">
        搜索范围覆盖武将名 / 阵营 / 自带战法,战法名 / 描述 / 来源,以及阵容名 / 描述 / 武将组合。
      </p>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-card/60 p-6">
      <p className="text-sm text-ink-soft">
        未找到 <span className="mx-1 font-mono text-primary">{query}</span> 相关结果。
      </p>
      <p className="mt-2 text-xs text-ink-soft/80">
        试试用更短的关键词(例如只搜姓氏「诸葛」或战法分类「阵法」)。
      </p>
    </div>
  );
}

export default SearchClient;
