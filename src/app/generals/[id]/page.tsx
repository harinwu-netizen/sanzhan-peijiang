/**
 * F1 武将图鉴 — 详情页(server component)
 *
 * 显示:
 *   - 武将名(超大)、阵营、品质、是否 SP
 *   - 4 维属性(武力/智力/统率/速度,横条 + 数字)
 *   - 兵种适性(5 色块)
 *   - 自带战法 + 传承战法(卡片,链接到 /skills/[id])
 *   - 可学阵法战法(从 learnableFormationSkillIds 列出,subType=阵法)
 *   - 兵书选项(major + minor)
 *   - 特技(equippableTraitCount 占位)
 *   - "返回列表"按钮
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadGenerals, loadSkills, loadTactics } from '@/lib/data/loader';
import type {
  General,
  Skill,
  Tactics,
} from '@/lib/data/schemas';
import { StatsBars } from '@/components/Generals/StatsBars';
import { AptitudeGrid } from '@/components/Generals/AptitudeGrid';
import { SkillCard } from '@/components/Generals/SkillCard';
import {
  CAMP_BG,
  CAMP_COLOR,
  CAMP_BORDER,
  QUALITY_BADGE,
  QUALITY_LABEL,
  SP_LABEL,
} from '@/components/Generals/constants';

interface PageProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Metadata(动态 title)
// ---------------------------------------------------------------------------

export async function generateMetadata({
 params,
}: PageProps): Promise<Metadata> {
 const { id } = await params;
 const general = loadGenerals().find((g) => g.id === id);
 if (!general) {
 return {
 title: '未找到武将 - 三战配将助手',
 description: '该武将ID在数据库中未找到,请返回武将图鉴。',
 };
 }
 const spTag = general.isSP ? ' SP' : '';
 return {
 title: `${general.name} - 三战配将助手`,
 description: `${general.name}(${general.camp}${spTag}·${general.quality}):三国志·战略版武将四维属性、兵种适性、自带/传承战法、可学阵法与可选兵书完整数据。`,
 keywords: [
 '三国志战略版',
 `${general.name}`,
 `${general.camp}`,
 `${general.isSP ? 'SP武将' : '武将'}`,
 '武将配将',
 ],
 openGraph: {
 title: `${general.name} - 三战配将助手`,
 description: `${general.name} · ${general.camp} · ${general.quality} 四维属性、兵种适性、传承战法、可学阵法完整数据。`,
 type: 'article',
 locale: 'zh_CN',
 },
  };
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export default async function GeneralDetailPage({ params }: PageProps) {
  const { id } = await params;

  const allGenerals = loadGenerals();
  const general = allGenerals.find((g) => g.id === id);
  if (!general) notFound();

  // 一次性加载战法 + 兵书索引(ID -> entity),避免 N+1
  const skillMap = new Map<string, Skill>();
  for (const s of loadSkills()) skillMap.set(s.id, s);
  const tacticMap = new Map<string, Tactics>();
  for (const t of loadTactics()) tacticMap.set(t.id, t);

  // 解析该武将相关的战法
  const selfSkill = skillMap.get(general.selfSkillId) ?? null;
  const inheritSkill = general.inheritSkillId
    ? skillMap.get(general.inheritSkillId) ?? null
    : null;
  const formationSkills = general.learnableFormationSkillIds
    .map((id) => skillMap.get(id))
    .filter((s): s is Skill => Boolean(s));

  // 兵书选项(大 + 小)
  const majorTactics = general.tacticsOptions.major
    .map((id) => tacticMap.get(id))
    .filter((t): t is Tactics => Boolean(t));
  const minorTactics = general.tacticsOptions.minor
    .map((id) => tacticMap.get(id))
    .filter((t): t is Tactics => Boolean(t));

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {/* 面包屑 */}
      <nav
        aria-label="面包屑"
        className="text-sm text-ink-soft"
      >
        <Link href="/" className="hover:text-primary hover:underline">
          首页
        </Link>
        <span className="mx-2 text-ink-soft/60">/</span>
        <Link href="/generals" className="hover:text-primary hover:underline">
          武将图鉴
        </Link>
        <span className="mx-2 text-ink-soft/60">/</span>
        <span className="text-ink">{general.name}</span>
      </nav>

      {/* 顶部 — 武将名 + 阵营 + 品质 + SP */}
      <section
        aria-label="基础信息"
        className="mt-4 overflow-hidden rounded-xl border border-line/70 bg-card shadow-sm"
      >
        {/* 阵营色条 */}
        <div className={`h-2 w-full ${CAMP_BORDER[general.camp]} bg-current opacity-80`} aria-hidden />
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 ${CAMP_BORDER[general.camp]} bg-bg-cream font-serif text-3xl font-semibold ${CAMP_COLOR[general.camp]}`}
                aria-hidden
              >
                {general.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
                    {general.name}
                  </h1>
                  {general.isSP && (
                    <span className="rounded-md bg-accent-red px-2 py-0.5 text-xs font-semibold tracking-wider text-bg-cream shadow-sm">
                      {SP_LABEL}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${CAMP_BG[general.camp]} ${CAMP_COLOR[general.camp]}`}
                  >
                    {general.camp}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${QUALITY_BADGE[general.quality]}`}
                    title={QUALITY_LABEL[general.quality]}
                  >
                    {general.quality}·{general.quality === '橙' ? '传说' : general.quality === '紫' ? '史诗' : '稀有'}
                  </span>
                  {general.redLevel > 0 && (
                    <span className="rounded-md bg-accent-red/15 px-2 py-0.5 text-xs font-medium text-accent-red">
                      红度 {general.redLevel}
                    </span>
                  )}
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    ID:{general.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 维属性 */}
      <section className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
          四维属性
        </h2>
        <StatsBars stats={general.stats} />
      </section>

      {/* 兵种适性 */}
      <section className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
          兵种适性
        </h2>
        <AptitudeGrid general={general} />
      </section>

      {/* 自带战法 + 传承战法 */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
            自带战法
          </h2>
          <SkillCard skill={selfSkill} emphasis />
        </div>
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
            传承战法
          </h2>
          <SkillCard skill={inheritSkill} />
        </div>
      </section>

      {/* 可学阵法 */}
      <section className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
          可学阵法战法
        </h2>
        {formationSkills.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-bg-cream/40 p-3 text-sm text-ink-soft">
            <span className="italic">暂无可学阵法</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {formationSkills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        )}
      </section>

      {/* 兵书选项 */}
      <section className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
          兵书选项
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 大兵书 */}
          <div className="rounded-md border border-line/60 bg-card p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
              大兵书({majorTactics.length})
            </p>
            {majorTactics.length === 0 ? (
              <p className="text-sm text-ink-soft italic">未配置</p>
            ) : (
              <ul className="space-y-1.5">
                {majorTactics.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-sm bg-bg-cream/50 px-2 py-1.5"
                  >
                    <span className="font-serif text-sm font-medium text-ink">
                      {t.name}
                    </span>
                    <span className="text-[11px] text-ink-soft">
                      {t.category}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* 小兵书 */}
          <div className="rounded-md border border-line/60 bg-card p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
              小兵书({minorTactics.length})
            </p>
            {minorTactics.length === 0 ? (
              <p className="text-sm text-ink-soft italic">未配置</p>
            ) : (
              <ul className="space-y-1.5">
                {minorTactics.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-sm bg-bg-cream/50 px-2 py-1.5"
                  >
                    <span className="font-serif text-sm font-medium text-ink">
                      {t.name}
                    </span>
                    <span className="text-[11px] text-ink-soft">
                      {t.category}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* 特技占位 */}
      <section className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-primary">
          可装备特技
        </h2>
        <div className="rounded-md border border-dashed border-line bg-card/60 p-4 text-sm text-ink-soft">
          <p>
            <span className="font-medium text-ink">
              {general.equippableTraitCount}
            </span>{' '}
            个可装备特技槽位
          </p>
          <p className="mt-1 text-xs text-ink-soft/80">
            (特技数据请参考 F8 特技库模块 — 待 F8 任务完成后,此处会渲染该武将可装备的具体特技列表)
          </p>
        </div>
      </section>

      {/* 返回列表 */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-6 text-sm">
        <Link
          href="/generals"
          className="rounded-md bg-primary px-4 py-2 font-medium text-bg-cream shadow-sm transition-colors hover:bg-primary/90"
        >
          ← 返回列表
        </Link>
        <Link
          href={`/sandbox?general=${general.id}`}
          className="rounded-md border border-accent-red/60 bg-accent-red/10 px-4 py-2 font-medium text-accent-red transition-colors hover:bg-accent-red hover:text-bg-cream"
        >
          放入配将器
        </Link>
      </div>
    </div>
  );
}