import Link from "next/link";
import type { General, Trait } from "@/lib/data/schemas";
import {
  CategoryBadge,
  OwnershipBadge,
  categoryAccentClass,
} from "./TraitBadges";

/**
 * 解析"拥有该特技的武将名",用于卡片副标题 / 详情页。
 * 1) 若 trait 自身指定了 ownerGeneralId 且能查到,优先用 trait 的 owner
 * 2) 否则看 source 字段里是否带"X 专属装备附带"字样,提取 X
 * 3) 否则返回 null
 */
export function resolveOwnerName(
  trait: Trait,
  generals: General[],
): { name: string; general: General | null } | null {
  if (trait.ownerGeneralId) {
    const g = generals.find((x) => x.id === trait.ownerGeneralId);
    if (g) return { name: g.name, general: g };
  }
  const m = trait.source.match(/^(.+?)专属装备附带/);
  if (m) return { name: m[1], general: null };
  return null;
}

/**
 * 特技列表卡片。
 *
 * 布局:
 *  - 顶部色条(按 category 上色,左侧 4px)
 *  - 特技名(大字 serif)
 *  - category 徽章 + 专属/通用徽章
 *  - 效果描述(前 30 字,line-clamp-2 兜底)
 *  - 触发条件(短)
 *  - 来源(从 source 字段)
 *  - 关联武将(若有,带链接)
 *
 * 整卡可点击 → /traits/[id]
 */
export function TraitCard({
  trait,
  ownerGeneral,
}: {
  trait: Trait;
  ownerGeneral: General | undefined;
}) {
  const isUnique = trait.ownerGeneralId !== null;

  return (
    <Link
      href={`/traits/${trait.id}`}
      className={`group block h-full rounded-lg border border-line/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary border-l-4 ${categoryAccentClass(trait.category)}`}
    >
      <div className="flex h-full flex-col p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-base font-semibold text-ink group-hover:text-primary sm:text-lg">
            {trait.name}
          </h3>
          <span
            aria-hidden
            className="text-ink-soft/60 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-red"
          >
            →
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <CategoryBadge category={trait.category} size="sm" />
          <OwnershipBadge isUnique={isUnique} size="sm" />
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-soft">
          {trait.effect}
        </p>

        <dl className="mt-3 grid grid-cols-1 gap-1 text-[11px] text-ink-soft">
          <div>
            <dt className="text-ink-soft/70">触发</dt>
            <dd className="mt-0.5 text-ink">{trait.triggerCondition}</dd>
          </div>
          <div>
            <dt className="text-ink-soft/70">来源</dt>
            <dd className="mt-0.5 truncate text-ink">{trait.source}</dd>
          </div>
          {ownerGeneral && (
            <div>
              <dt className="text-ink-soft/70">专属武将</dt>
              <dd className="mt-0.5 text-ink">
                {ownerGeneral.name}
                <span className="ml-1 text-ink-soft/70">
                  · {ownerGeneral.camp} · {ownerGeneral.quality}
                </span>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Link>
  );
}
