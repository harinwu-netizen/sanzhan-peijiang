'use client';

/**
 * Search input box.
 *
 * Controlled component: the parent (SearchClient) owns the value state and
 * applies debounce + URL sync. We keep the box dumb so it can be reused or
 * tested in isolation.
 */
import { useId } from 'react';

export interface SearchBoxProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Total result count rendered next to the input for feedback. */
  resultCount?: number | null;
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  resultCount,
}: SearchBoxProps) {
  const inputId = useId();
  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-ink-soft"
      >
        搜索关键词
      </label>
      <div className="relative mt-2">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-soft/70"
        >
          {/* magnifier glyph */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M9 3a6 6 0 104.472 10.03l3.249 3.248a1 1 0 001.414-1.414l-3.248-3.249A6 6 0 009 3zm-4 6a4 4 0 118 0 4 4 0 01-8 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <input
          id={inputId}
          type="search"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="全站搜索关键词"
          className="block w-full rounded-lg border border-line bg-card py-3 pl-10 pr-4 font-serif text-lg text-ink shadow-sm transition-colors placeholder:font-sans placeholder:text-base placeholder:text-ink-soft/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="清空搜索"
            className="absolute inset-y-0 right-2 my-auto h-7 rounded-md px-2 text-xs text-ink-soft transition-colors hover:bg-bg-cream/60 hover:text-primary"
          >
            清空
          </button>
        )}
      </div>
      {typeof resultCount === 'number' && (
        <p className="mt-2 text-xs text-ink-soft" aria-live="polite">
          共 {resultCount} 条结果
        </p>
      )}
    </div>
  );
}

export default SearchBox;
