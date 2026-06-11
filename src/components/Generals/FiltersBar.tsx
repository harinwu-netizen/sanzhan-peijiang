/**
 * F1 武将图鉴 — 筛选区(server component)
 *
 * 实现 4 个 URL 搜索参数:
 *   - camp   阵营(魏/蜀/吴/群)
 *   - aptitude 兵种适性(骑 S / 盾 S / 弓 S / 枪 S / 器 S)
 *   - sp     是否 SP(SP / 非 SP)
 *   - quality 品质(橙 / 紫 / 蓝)
 *   - sort   排序(quality=品质 / name=武将名)
 *
 * 由于是 server component,筛选交互无法跑 onClick — 必须用 <form> + <button>
 * 把当前选中状态发到 URL searchParams,提交后 Next.js 重新渲染 server component。
 * 这是 Next.js 官方推荐的"不用 client component"实现方式,SSR 友好且 SEO 友好。
 */
import Link from 'next/link';
import type { Camp, Quality, Aptitude } from '@/lib/data/schemas';
import {
  ALL_CAMPS,
  ALL_QUALITIES,
  TROOP_TYPES,
  type TroopKey,
} from './constants';

// ---------------------------------------------------------------------------
// 入参
// ---------------------------------------------------------------------------

export interface FiltersValue {
  camp: Camp | null;
  troopKey: TroopKey | null;
  /** 仅在用户选了具体兵种时,该字段才有意义 */
  sp: boolean | null;
  quality: Quality | null;
  sort: 'quality' | 'name';
}

export interface FiltersBarProps {
  /** 当前 URL 解析出来的筛选状态 */
  value: FiltersValue;
}

// ---------------------------------------------------------------------------
// 表单序列化辅助
// ---------------------------------------------------------------------------

/** 把当前筛选对象(去除空值)拼成 URL query 字符串,用于"切换其它选项" */
function serializeQuery(
  base: FiltersValue,
  patch: Partial<FiltersValue>,
): string {
  const merged: FiltersValue = { ...base, ...patch };
  const params = new URLSearchParams();
  if (merged.camp) params.set('camp', merged.camp);
  if (merged.troopKey) {
    params.set('aptitude', merged.troopKey);
    params.set('aptGrade', 'S');
  }
  if (merged.sp !== null) params.set('sp', merged.sp ? 'true' : 'false');
  if (merged.quality) params.set('quality', merged.quality);
  if (merged.sort && merged.sort !== 'quality') params.set('sort', merged.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// 子组件:单选按钮组(server-friendly,纯 <a> 链接)
// ---------------------------------------------------------------------------

interface PillRowProps<T extends string> {
  label: string;
  current: T | null;
  /** 选项:label 显示 / value 实际值 / title hover */
  options: ReadonlyArray<{ value: T; label: string; title?: string }>;
  /** 拼一个 href 给"全部"按钮 */
  buildHref: (next: T | null) => string;
}

/** 水平排列的可点击按钮组(纯 <a>,不需要 client JS) */
function PillRow<T extends string>({
  label,
  current,
  options,
  buildHref,
}: PillRowProps<T>) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-soft sm:w-16">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {/* 全部按钮(清空该筛选) */}
        <Link
          href={buildHref(null)}
          aria-pressed={current === null}
          className={
            current === null
              ? 'rounded-md bg-primary px-3 py-1 text-xs font-medium text-bg-cream shadow-sm'
              : 'rounded-md border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary'
          }
        >
          全部
        </Link>
        {options.map((opt) => {
          const active = current === opt.value;
          return (
            <Link
              key={opt.value}
              href={buildHref(opt.value)}
              title={opt.title}
              aria-pressed={active}
              className={
                active
                  ? 'rounded-md bg-primary px-3 py-1 text-xs font-medium text-bg-cream shadow-sm'
                  : 'rounded-md border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary'
              }
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export function FiltersBar({ value }: FiltersBarProps) {
  // 4 组单选,每组各自的 buildHref(在 base 上覆盖一个字段)
  const campHref = (next: Camp | null) =>
    `/generals${serializeQuery(value, { camp: next })}`;
  const troopHref = (next: TroopKey | null) =>
    `/generals${serializeQuery(value, { troopKey: next })}`;
  const spHref = (next: boolean | null) =>
    `/generals${serializeQuery(value, { sp: next })}`;
  const qualityHref = (next: Quality | null) =>
    `/generals${serializeQuery(value, { quality: next })}`;
  const sortHref = (next: 'quality' | 'name') =>
    `/generals${serializeQuery(value, { sort: next })}`;

  // 兵种筛选:每个兵种对应"该兵种 S 适性"单选项
  const troopOptions = TROOP_TYPES.map((t) => ({
    value: t.key,
    label: `${t.label} S`,
    title: `只显示兵种适性「${t.label}」为 S 的武将`,
  }));

  // 品质单选项
  const qualityOptions = ALL_QUALITIES.map((q) => ({
    value: q,
    label: q,
  }));

  // SP 单选项(注意 '全部' 已经在 PillRow 渲染)
  const spOptions = [
    { value: 'true', label: 'SP 武将', title: '只显示 SP 武将' },
    { value: 'false', label: '非 SP', title: '只显示非 SP 武将' },
  ] as const;

  return (
    <section
      aria-label="筛选"
      className="rounded-lg border border-line/70 bg-card/80 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3">
        {/* 阵营 */}
        <PillRow
          label="阵营"
          current={value.camp}
          options={ALL_CAMPS.map((c) => ({ value: c, label: c }))}
          buildHref={(next) => campHref(next as Camp | null)}
        />

        {/* 兵种适性 */}
        <PillRow
          label="兵种适性"
          current={value.troopKey}
          options={troopOptions}
          buildHref={(next) => troopHref(next as TroopKey | null)}
        />

        {/* SP / 非 SP */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-soft sm:w-16">
            SP
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/generals${serializeQuery(value, { sp: null })}`}
              aria-pressed={value.sp === null}
              className={
                value.sp === null
                  ? 'rounded-md bg-primary px-3 py-1 text-xs font-medium text-bg-cream shadow-sm'
                  : 'rounded-md border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary'
              }
            >
              全部
            </Link>
            {spOptions.map((opt) => {
              const active =
                (opt.value === 'true' && value.sp === true) ||
                (opt.value === 'false' && value.sp === false);
              const nextBool = opt.value === 'true' ? true : false;
              return (
                <Link
                  key={opt.value}
                  href={`/generals${serializeQuery(value, { sp: nextBool })}`}
                  title={opt.title}
                  aria-pressed={active}
                  className={
                    active
                      ? 'rounded-md bg-primary px-3 py-1 text-xs font-medium text-bg-cream shadow-sm'
                      : 'rounded-md border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary'
                  }
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 品质 */}
        <PillRow
          label="品质"
          current={value.quality}
          options={qualityOptions}
          buildHref={(next) => qualityHref(next as Quality | null)}
        />

        {/* 排序 — 单独一行,与筛选视觉上分开 */}
        <div className="mt-1 flex flex-col gap-2 border-t border-line/60 pt-3 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-soft sm:w-16">
            排序
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={sortHref('quality')}
              aria-pressed={value.sort === 'quality'}
              className={
                value.sort === 'quality'
                  ? 'rounded-md bg-accent-red px-3 py-1 text-xs font-medium text-bg-cream shadow-sm'
                  : 'rounded-md border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary'
              }
            >
              品质(默认)
            </Link>
            <Link
              href={sortHref('name')}
              aria-pressed={value.sort === 'name'}
              className={
                value.sort === 'name'
                  ? 'rounded-md bg-accent-red px-3 py-1 text-xs font-medium text-bg-cream shadow-sm'
                  : 'rounded-md border border-line bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary'
              }
            >
              武将名
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}