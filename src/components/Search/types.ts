/**
 * Shared types for the F5 全站搜索 feature.
 *
 * The Search page is split into:
 *   - page.tsx             (server component, loads data)
 *   - SearchClient.tsx     (client component, owns state + Fuse indices)
 *   - SearchBox.tsx        (client component, debounced controlled input)
 *   - ResultGroup.tsx      (presentational, one section per entity type)
 *   - Cards.tsx            (presentational, one card variant per entity type)
 *   - types.ts             (this file, shared between all of the above)
 *
 * We re-export the data entity types from the central types module so all
 * files use a single source of truth (Zod-derived).
 */
import type { General, Skill, Lineup } from '@/types/data';

export type { General, Skill, Lineup };

/** Payload the server passes to the client search component. */
export interface SearchData {
  generals: General[];
  skills: Skill[];
  lineups: Lineup[];
}

/** Per-entity result list returned to ResultGroup. */
export type GeneralResults = General[];
export type SkillResults = Skill[];
export type LineupResults = Lineup[];

/** Common tuning knobs — exported so future tasks (server search) can reuse. */
export const SEARCH_LIMITS = {
  /** Debounce window in ms before the query is committed to Fuse. */
  debounceMs: 200,
  /** Max rows shown per group before the "view all" link kicks in. */
  perGroup: 5,
} as const;
