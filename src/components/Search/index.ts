/**
 * F5 全站搜索 · 公共组件 barrel。
 *
 * 外部引用统一从 '@/components/Search' 拿:
 *   import { SearchClient } from '@/components/Search';
 */
export { SearchClient } from './SearchClient';
export { SearchBox } from './SearchBox';
export { ResultGroup } from './ResultGroup';
export { GeneralCard, SkillCard, LineupCard } from './Cards';
export type {
  SearchClientProps,
} from './SearchClient';
export type {
  SearchBoxProps,
} from './SearchBox';
export type {
  ResultGroupProps,
} from './ResultGroup';
export type {
  SearchData,
  GeneralResults,
  SkillResults,
  LineupResults,
} from './types';
export { SEARCH_LIMITS } from './types';
