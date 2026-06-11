import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSkills, loadGenerals } from "@/lib/data/loader";
import type { General, Skill, SkillSourceType } from "@/lib/data/schemas";
import {
  QualityBadge,
  SubTypeBadge,
  subTypeAccentClass,
} from "@/components/Skills/Badges";

// ---------------------------------------------------------------------------
// Static params + metadata
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  const skills = loadSkills();
  return skills.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
 params,
}: {
 params: Promise<{ id: string }> | { id: string };
}): Promise<Metadata> {
 const { id } = params instanceof Promise ? await params : params;
 const skill = loadSkills().find((s) => s.id === id);
 if (!skill) {
 return {
 title: "未找到战法 - 三战配将助手",
 description: "该战法ID在数据库中未找到,请返回战法图鉴。",
 };
 }
 return {
 title: `${skill.name} -战法图鉴 · 三战配将助手`,
 description: `${skill.name}(${skill.subType} · ${skill.quality} · ${skill.sourceType}):三国志·战略版战法发动条件、目标数、首回合等关键参数详解。`,
 keywords: [
 "三国志战略版",
 `${skill.name}`,
 `${skill.subType}战法`,
 `${skill.sourceType}战法`,
 "战法图鉴",
 ],
 openGraph: {
 title: `${skill.name} - 三战配将助手`,
 description: `${skill.name} · ${skill.subType} · ${skill.quality}战法数据。`,
 type: "article",
 locale: "zh_CN",
 },
  };
}

// ---------------------------------------------------------------------------
// Source type 标签 / 配色
// ---------------------------------------------------------------------------

const SOURCE_TYPE_STYLES: Record<SkillSourceType, string> = {
  自带: "bg-accent-red/15 text-accent-red border-accent-red/30",
  传承: "bg-accent-green/15 text-accent-green border-accent-green/30",
  拆解: "bg-amber-100 text-amber-800 border-amber-400",
  通用: "bg-blue-100 text-blue-800 border-blue-300",
};

const SOURCE_TYPE_DESC: Record<SkillSourceType, string> = {
  自带: "武将天生携带,无法卸下",
  传承: "武将退役/觉醒后可传承给其他武将",
  拆解: "通过拆解特定武将获得",
  通用: "任何武将都能学,无限制",
};

// ---------------------------------------------------------------------------
// 详情页主体
// ---------------------------------------------------------------------------

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = params instanceof Promise ? await params : params;
  const skills = loadSkills();
  const generals = loadGenerals();

  const skill = skills.find((s) => s.id === id);
  if (!skill) notFound();

  // carrierIds 解析成 General 列表(可能为空,如"太平道法"carrierIds=[])
  const carriers: General[] = skill.carrierIds
    .map((cid) => generals.find((g) => g.id === cid))
    .filter((g): g is General => Boolean(g));

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <Breadcrumbs skillName={skill.name} />

      {/* 顶部 hero */}
      <header
        className={`mt-4 rounded-lg border border-line/60 bg-card p-4 shadow-sm border-l-4 sm:p-6 ${subTypeAccentClass(skill.subType)}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-red">
              F2 · 战法详情
            </p>
            <h1 className="mt-2 font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
              {skill.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SubTypeBadge subType={skill.subType} size="lg" />
              <QualityBadge quality={skill.quality} size="lg" />
              <span
                title={SOURCE_TYPE_DESC[skill.sourceType]}
                className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-medium ${SOURCE_TYPE_STYLES[skill.sourceType]}`}
              >
                {skill.sourceType}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              ID:<code className="font-mono text-xs">{skill.id}</code>
            </p>
          </div>

          <Link
            href="/skills"
            className="self-start rounded-md border border-line bg-bg-cream px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-primary/60 hover:text-primary"
          >
            ← 返回战法图鉴
          </Link>
        </div>
      </header>

      {/* 效果描述 */}
      <section aria-label="战法描述" className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-primary">效果描述</h2>
        <p className="mt-2 rounded-lg border border-line/60 bg-card/60 p-4 text-sm leading-7 text-ink">
          {skill.description}
        </p>
      </section>

      {/* 关键参数(发动概率 / 是否多目标 / 首回合) */}
      <section aria-label="关键参数" className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-primary">关键参数</h2>
        <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ParamCard
            label="发动概率"
            value={
              skill.triggerRate === null
                ? "—"
                : `${Math.round(skill.triggerRate * 100)}%`
            }
            hint={
              skill.triggerRate === null
                ? "被动/指挥/阵法/兵种 通常固定触发"
                : "每次行动按此概率判定是否发动"
            }
          />
          <ParamCard
            label="是否多目标"
            value={skill.multiTarget ? "群体" : "单体"}
            hint={
              skill.multiTarget
                ? "可同时影响多个目标,适合群攻体系"
                : "仅作用于单个目标,适合点杀"
            }
          />
          <ParamCard
            label="首次发动回合"
            value={`第 ${skill.startRound} 回合`}
            hint="战斗开始后最早可能触发的回合"
          />
        </dl>
      </section>

      {/* 来源 */}
      <section aria-label="来源" className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-primary">来源</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line/60 bg-card/60 p-4 text-sm text-ink">
          <span>{skill.source}</span>
          <span className="text-ink-soft/60">·</span>
          <span className="text-ink-soft">{SOURCE_TYPE_DESC[skill.sourceType]}</span>
        </div>
      </section>

      {/* 适用武将 */}
      <section aria-label="适用武将" className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-primary">
          适用武将
          <span className="ml-2 text-sm font-normal text-ink-soft">
            ({carriers.length} 位)
          </span>
        </h2>
        <div className="mt-2 rounded-lg border border-line/60 bg-card/60 p-4">
          {carriers.length === 0 ? (
            <p className="text-sm text-ink-soft">
              {skill.sourceType === "通用"
                ? "通用战法 — 任何武将都能学习,不受 carrierIds 列表限制。"
                : "暂无 carrierIds 引用 — 暂未关联具体武将,通常表示该战法尚未拆解/传承或来源不明。"}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {carriers.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/generals/${g.id}`}
                    className="flex min-h-[2.75rem] flex-col justify-center rounded border border-line/40 bg-bg-cream/40 px-3 py-2 text-sm transition-colors hover:border-primary/60 hover:bg-card hover:text-primary"
                  >
                    <span className="font-serif text-base font-semibold text-ink">
                      {g.name}
                    </span>
                    <span className="mt-0.5 text-xs text-ink-soft">
                      {g.camp} · {g.quality} · {g.trait}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-10">
        <Link
          href="/skills"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-bg-cream shadow-sm transition-colors hover:bg-primary/90"
        >
          ← 返回战法图鉴
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
      <dd className="mt-1 font-serif text-2xl font-semibold text-primary">
        {value}
      </dd>
      <p className="mt-1 text-[11px] leading-5 text-ink-soft/80">{hint}</p>
    </div>
  );
}

function Breadcrumbs({ skillName }: { skillName: string }) {
  return (
    <nav
      aria-label="面包屑"
      className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft"
    >
      <Link href="/" className="hover:text-primary">
        首页
      </Link>
      <span className="text-ink-soft/40">/</span>
      <Link href="/skills" className="hover:text-primary">
        战法图鉴
      </Link>
      <span className="text-ink-soft/40">/</span>
      <span className="text-ink">{skillName}</span>
    </nav>
  );
}
