import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTraits, loadGenerals } from "@/lib/data/loader";
import type { General, Trait } from "@/lib/data/schemas";
import {
  CategoryBadge,
  OwnershipBadge,
  categoryAccentClass,
} from "@/components/Traits/TraitBadges";

// ---------------------------------------------------------------------------
// Static params + metadata
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  const traits = loadTraits();
  return traits.map((t) => ({ id: t.id }));
}

export async function generateMetadata({
 params,
}: {
 params: Promise<{ id: string }> | { id: string };
}): Promise<Metadata> {
 const { id } = params instanceof Promise ? await params : params;
 const trait = loadTraits().find((t) => t.id === id);
 if (!trait) {
 return {
 title: "未找到特技 - 三战配将助手",
 description: "该特技ID在数据库中未找到,请返回特技库。",
 };
 }
 return {
 title: `${trait.name} - 特技库 · 三战配将助手`,
 description: `${trait.name}(${trait.category}${trait.ownerGeneralId ? ' ·专属' : ' ·通用'}):三国志·战略版装备附带的特性数据,触发条件 +效果描述 +关联武将。`,
 keywords: [
 "三国志战略版",
 `${trait.name}`,
 `${trait.category}特技`,
 "装备特性",
 "特技库",
 ],
 openGraph: {
 title: `${trait.name} - 三战配将助手`,
 description: `${trait.name} · ${trait.category}特性数据。`,
 type: "article",
 locale: "zh_CN",
 },
 };
}

// ---------------------------------------------------------------------------
// 详情页主体
// ---------------------------------------------------------------------------

export default async function TraitDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = params instanceof Promise ? await params : params;
  const traits = loadTraits();
  const generals = loadGenerals();

  const trait = traits.find((t) => t.id === id);
  if (!trait) notFound();

  const isUnique = trait.ownerGeneralId !== null;
  const ownerGeneral: General | undefined = isUnique
    ? generals.find((g) => g.id === trait.ownerGeneralId)
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <Breadcrumbs traitName={trait.name} />

      {/* 顶部 hero */}
      <header
        className={`mt-4 rounded-lg border border-line/60 bg-card p-4 shadow-sm border-l-4 sm:p-6 ${categoryAccentClass(trait.category)}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-red">
              F8 · 特技详情
            </p>
            <h1 className="mt-2 font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
              {trait.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CategoryBadge category={trait.category} size="lg" />
              <OwnershipBadge isUnique={isUnique} size="md" />
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              ID:<code className="font-mono text-xs">{trait.id}</code>
            </p>
          </div>

          <Link
            href="/traits"
            className="self-start rounded-md border border-line bg-bg-cream px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-primary/60 hover:text-primary"
          >
            ← 返回特技库
          </Link>
        </div>
      </header>

      {/* 效果描述 */}
      <section aria-label="效果描述" className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-primary">
          效果描述
        </h2>
        <p className="mt-2 rounded-lg border border-line/60 bg-card/60 p-4 text-sm leading-7 text-ink">
          {trait.effect}
        </p>
      </section>

      {/* 关键参数(触发条件 + 来源) */}
      <section aria-label="关键参数" className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-primary">
          关键参数
        </h2>
        <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ParamCard
            label="触发条件"
            value={trait.triggerCondition}
            hint="该特性在何种战斗节点生效"
          />
          <ParamCard
            label="来源"
            value={trait.source}
            hint={
              isUnique
                ? "该特性由专属装备附带"
                : "通用掉率 / 通用装备附带"
            }
          />
        </dl>
      </section>

      {/* 关联武将 */}
      <section aria-label="关联武将" className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-primary">
          关联武将
          <span className="ml-2 text-sm font-normal text-ink-soft">
            {isUnique ? "(专属)" : "(通用 — 任何武将可装备)"}
          </span>
        </h2>
        <div className="mt-2 rounded-lg border border-line/60 bg-card/60 p-4">
          {isUnique ? (
            ownerGeneral ? (
              <Link
                href={`/generals/${ownerGeneral.id}`}
                className="flex items-center justify-between rounded border border-line/40 bg-bg-cream/40 px-4 py-3 transition-colors hover:border-primary/60 hover:bg-card hover:text-primary"
              >
                <div className="flex flex-col">
                  <span className="font-serif text-lg font-semibold text-ink">
                    {ownerGeneral.name}
                  </span>
                  <span className="mt-0.5 text-xs text-ink-soft">
                    {ownerGeneral.camp} · {ownerGeneral.quality} ·{" "}
                    {ownerGeneral.trait} · 四维
                    武力{ownerGeneral.stats.武力}/
                    智力{ownerGeneral.stats.智力}/
                    统率{ownerGeneral.stats.统率}/
                    速度{ownerGeneral.stats.速度}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="text-xl text-ink-soft/60 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-red"
                >
                  →
                </span>
              </Link>
            ) : (
              <p className="text-sm text-ink-soft">
                该特技专属武将 ID 为{" "}
                <code className="font-mono text-xs">{trait.ownerGeneralId}</code>
                ,但在 data/generals.json 中未找到匹配记录。
              </p>
            )
          ) : (
            <p className="text-sm text-ink-soft">
              通用特技 — 不专属特定武将,任何武将装备对应装备后即可触发。
            </p>
          )}
        </div>
      </section>

      {/* 通用 vs 专属 解释 */}
      <section aria-label="通用/专属说明" className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-primary">
          通用 / 专属
        </h2>
        <div className="mt-2 rounded-lg border border-line/60 bg-card/60 p-4 text-sm text-ink-soft">
          {isUnique ? (
            <p>
              本特性为<strong className="text-purple-700"> 专属特技 </strong>,
              仅在{" "}
              <strong>
                {ownerGeneral?.name ?? trait.ownerGeneralId}
              </strong>{" "}
              装备对应装备时触发,其他武将无法激活。
            </p>
          ) : (
            <p>
              本特性为<strong className="text-stone-700"> 通用特技 </strong>,
              不绑定特定武将,任何武将装备附带该特性的装备后都能生效。
            </p>
          )}
        </div>
      </section>

      <div className="mt-10">
        <Link
          href="/traits"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-bg-cream shadow-sm transition-colors hover:bg-primary/90"
        >
          ← 返回特技库
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 小件
// ---------------------------------------------------------------------------

function ParamCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-line/60 bg-card/60 p-4">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-1 font-serif text-base font-semibold text-ink">
        {value}
      </dd>
      <p className="mt-1 text-[11px] leading-5 text-ink-soft/80">{hint}</p>
    </div>
  );
}

function Breadcrumbs({ traitName }: { traitName: string }) {
  return (
    <nav
      aria-label="面包屑"
      className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft"
    >
      <Link href="/" className="hover:text-primary">
        首页
      </Link>
      <span className="text-ink-soft/40">/</span>
      <Link href="/traits" className="hover:text-primary">
        特技库
      </Link>
      <span className="text-ink-soft/40">/</span>
      <span className="text-ink">{traitName}</span>
    </nav>
  );
}
