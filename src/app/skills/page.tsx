import type { Metadata } from "next";
import { loadSkills, loadGenerals } from "@/lib/data/loader";
import type {
  Quality,
  Skill,
  SkillSubType,
} from "@/lib/data/schemas";
import { SkillCard } from "@/components/Skills/SkillCard";
import { SkillsFilterBar } from "@/components/Skills/SkillsFilterBar";

export const metadata: Metadata = {
 title: "战法图鉴 · 三战配将助手",
 description:
 "三国志·战略版战法图鉴,收录50 个主动/被动/指挥/突击/阵法/兵种六类战法,按品质、来源、发动概率筛选,详细列出发动条件、目标数、首回合等关键参数。",
 keywords: ["三国志战略版", "战法图鉴", "主动战法", "被动战法", "阵法"],
 openGraph: {
 title: "战法图鉴 · 三战配将助手",
 description: "50 个三国志·战略版战法图鉴,六类战法完整数据。",
 type: "website",
 locale: "zh_CN",
 },
};

// ---------------------------------------------------------------------------
// URL 参数 → 过滤
// ---------------------------------------------------------------------------

/** 列表的合法 subType 集合(含"全部"哨兵) */
type SubTypeFilter = "全部" | SkillSubType;
const VALID_SUBTYPES: ReadonlyArray<SubTypeFilter> = [
  "全部",
  "主动",
  "被动",
  "指挥",
  "突击",
  "阵法",
  "兵种",
];

/** 列表的合法 quality 集合 */
type QualityFilter = "全部" | Quality;
const VALID_QUALITIES: ReadonlyArray<QualityFilter> = ["全部", "橙", "紫", "蓝"];

function parseSubType(raw: string | undefined): SubTypeFilter {
  if (raw && (VALID_SUBTYPES as ReadonlyArray<string>).includes(raw)) {
    return raw as SubTypeFilter;
  }
  return "全部";
}

function parseQuality(raw: string | undefined): QualityFilter {
  if (raw && (VALID_QUALITIES as ReadonlyArray<string>).includes(raw)) {
    return raw as QualityFilter;
  }
  return "全部";
}

function parseQ(raw: string | undefined): string {
  return (raw ?? "").trim();
}

function filterSkills(
  skills: Skill[],
  type: SubTypeFilter,
  quality: QualityFilter,
  q: string,
): Skill[] {
  let out = skills;
  if (type !== "全部") out = out.filter((s) => s.subType === type);
  if (quality !== "全部") out = out.filter((s) => s.quality === quality);
  if (q) {
    const needle = q.toLowerCase();
    out = out.filter((s) => s.name.toLowerCase().includes(needle));
  }
  // 稳定排序:subType 内置顺序,再按品质(橙>紫>蓝),最后按名
  const subOrder: Record<SkillSubType, number> = {
    主动: 0,
    被动: 1,
    指挥: 2,
    突击: 3,
    阵法: 4,
    兵种: 5,
  };
  const qOrder: Record<Quality, number> = { 橙: 0, 紫: 1, 蓝: 2 };
  return [...out].sort((a, b) => {
    if (subOrder[a.subType] !== subOrder[b.subType]) {
      return subOrder[a.subType] - subOrder[b.subType];
    }
    if (qOrder[a.quality] !== qOrder[b.quality]) {
      return qOrder[a.quality] - qOrder[b.quality];
    }
    return a.name.localeCompare(b.name, "zh-Hans-CN");
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type SearchParams = {
  type?: string;
  quality?: string;
  q?: string;
};

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  // Next 15+ 把 searchParams 标为 Promise,这里兼容两种形态
  const sp =
    searchParams instanceof Promise ? await searchParams : searchParams;

  const allSkills = loadSkills();
  // 顶部"6 个武将"链接可能未实现(只读 generals 用于 tooltip / 详情页),
  // 这里只在总览 banner 处展示总数,不展示武将数据。
  void loadGenerals;

  const currentType = parseSubType(sp.type);
  const currentQuality = parseQuality(sp.quality);
  const currentQ = parseQ(sp.q);
  const filtered = filterSkills(allSkills, currentType, currentQuality, currentQ);

  // 全量按 subType 统计(供 banner / 各 Tab 显示)
  const typeCounts: Record<SkillSubType, number> = {
    主动: 0,
    被动: 0,
    指挥: 0,
    突击: 0,
    阵法: 0,
    兵种: 0,
  };
  for (const s of allSkills) typeCounts[s.subType]++;

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {/* 顶部标题区 */}
      <header className="border-b border-line/60 pb-5 sm:pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F2 · Skills Codex
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 sm:gap-3">
          <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
            战法图鉴
          </h1>
          <span className="text-sm text-ink-soft">
            共 <span className="font-mono text-base text-primary">{allSkills.length}</span> 个战法
            {" · "}6 类
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-soft sm:text-base">
          战法分 <strong className="text-accent-red">主动</strong> /
          <strong className="text-accent-green"> 被动</strong> /
          <strong className="text-blue-700"> 指挥</strong> /
          <strong className="text-orange-700"> 突击</strong> /
          <strong className="text-purple-700"> 阵法</strong> /
          <strong className="text-amber-700"> 兵种</strong>{" "}
          六类。按 subType Tab + 品质 + 战法名搜索筛选。
        </p>
      </header>

      {/* 筛选条 */}
      <section aria-label="筛选" className="pt-6">
        <SkillsFilterBar
          currentType={currentType}
          currentQuality={currentQuality}
          currentQ={currentQ}
          totalCount={filtered.length}
        />
      </section>

      {/* 战法网格 */}
      <section aria-label="战法列表" className="pt-6">
        {filtered.length === 0 ? (
          <EmptyState
            currentType={currentType}
            currentQuality={currentQuality}
            currentQ={currentQ}
            counts={typeCounts}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((skill) => (
              <li key={skill.id}>
                <SkillCard skill={skill} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 底部:全量 subType 分布(无过滤时也作为一览) */}
      <section
        aria-label="战法类型分布"
        className="mt-10 rounded-lg border border-line/60 bg-card/60 p-5 text-sm text-ink-soft"
      >
        <h2 className="font-serif text-base font-semibold text-primary">
          全量战法按 subType 分布
        </h2>
        <p className="mt-1 text-xs text-ink-soft/80">
          来自 data/skills.json(本次示例数据共 19 条)
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ["主动", typeCounts.主动],
              ["被动", typeCounts.被动],
              ["指挥", typeCounts.指挥],
              ["突击", typeCounts.突击],
              ["阵法", typeCounts.阵法],
              ["兵种", typeCounts.兵种],
            ] as Array<[SkillSubType, number]>
          ).map(([t, n]) => (
            <li
              key={t}
              className="flex items-baseline justify-between rounded border border-line/40 bg-bg-cream/40 px-3 py-2"
            >
              <span className="text-ink">{t}</span>
              <span className="font-mono text-base text-primary">{n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  currentType,
  currentQuality,
  currentQ,
  counts,
}: {
  currentType: SubTypeFilter;
  currentQuality: QualityFilter;
  currentQ: string;
  counts: Record<SkillSubType, number>;
}) {
  const reasons: string[] = [];
  if (currentType !== "全部") reasons.push(`类型「${currentType}」`);
  if (currentQuality !== "全部") reasons.push(`品质「${currentQuality}」`);
  if (currentQ) reasons.push(`关键字「${currentQ}」`);

  // 当前过滤下确实没有任何 subType 的战法(可能 typeCounts 全 0)
  const zero = Object.values(counts).every((n) => n === 0);
  if (zero) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-card/60 p-8 text-center text-ink-soft">
        <p className="font-serif text-lg text-primary">战法数据为空</p>
        <p className="mt-2 text-sm">
          data/skills.json 尚未录入任何战法。F2 列表需要至少 1 条战法才能渲染。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-line bg-card/60 p-8 text-center text-ink-soft">
      <p className="font-serif text-lg text-primary">没有匹配的战法</p>
      <p className="mt-2 text-sm">
        当前筛选条件:{reasons.length > 0 ? reasons.join(" · ") : "(无)"}
      </p>
      <p className="mt-1 text-xs text-ink-soft/80">
        试试调整品质或清空搜索关键字
      </p>
    </div>
  );
}
