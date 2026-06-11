/**
 * One result group in the search results page.
 *
 * Renders a heading + a card list, and a "view all" link when the matched
 * count exceeds the per-group cap. The list is passed in pre-sliced by the
 * parent so this component stays purely presentational.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface ResultGroupProps {
  title: string;
  total: number;
  visibleCount: number;
  viewAllHref: string;
  emptyHint?: string;
  children: ReactNode;
}

export function ResultGroup({
  title,
  total,
  visibleCount,
  viewAllHref,
  emptyHint,
  children,
}: ResultGroupProps) {
  const more = total > visibleCount;
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-line/60 bg-bg-cream/40 p-4 sm:p-5"
    >
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-primary">
          {title}
          <span className="ml-2 text-sm font-normal text-ink-soft">
            ({total})
          </span>
        </h2>
        {more && (
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-accent-red hover:underline"
          >
            查看全部 {total} 条 →
          </Link>
        )}
      </header>

      {total === 0 ? (
        <p className="text-sm text-ink-soft">{emptyHint ?? '无匹配'}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          {children}
        </ul>
      )}
    </section>
  );
}

export default ResultGroup;
