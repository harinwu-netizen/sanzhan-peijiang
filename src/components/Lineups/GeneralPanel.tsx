/**
 * F4 推荐阵容 — 详情页"武将卡片"(server component)
 *
 * 3 个武将各一张:
 *  - 头像(首字符 + 阵营色)
 *  - 名字
 *  - 4 维属性横条
 *  - 红度
 *  - 链接到 /generals/[id]
 */
import Link from "next/link";
import type { General, Lineup, SkillSubType } from "@/lib/data/schemas";
import { CAMP_BG, CAMP_BORDER, CAMP_COLOR } from "@/components/Generals/constants";
import { GeneralAvatar } from "./GeneralAvatar";
import { StatsBars } from "@/components/Generals/StatsBars";

export interface GeneralPanelProps {
  general: General;
  /** 阵容给该武将配置的红度(lineup.generalRedLevels[id]) */
  redLevel: number;
  /** 在阵容里是不是主将(skills.main 里出现就是主将) */
  isMain: boolean;
}

export function GeneralPanel({ general, redLevel, isMain }: GeneralPanelProps) {
  return (
    <Link
      href={`/generals/${general.id}`}
      className={`group block rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md ${
        isMain
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-line/70"
      }`}
    >
      {/* 阵营色条 + 名字 + 红度 */}
      <div
        className={`-mx-4 -mt-4 mb-3 h-1.5 rounded-t-xl ${CAMP_BORDER[general.camp]} bg-current opacity-80`}
        aria-hidden
      />
      <div className="flex items-center gap-3">
        <GeneralAvatar general={general} name={general.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-serif text-lg font-semibold text-ink group-hover:text-primary">
              {general.name}
            </h3>
            {isMain && (
              <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bg-cream">
                主将
              </span>
            )}
            {redLevel > 0 && (
              <span
                className="rounded-md bg-accent-red/15 px-1.5 py-0.5 text-[11px] font-medium text-accent-red"
                title={`红度 ${redLevel}`}
              >
                {"★".repeat(redLevel)}
                <span className="ml-1 text-accent-red/80">红{redLevel}</span>
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
            <span
              className={`rounded px-1.5 py-0.5 ${CAMP_BG[general.camp]} ${CAMP_COLOR[general.camp]}`}
            >
              {general.camp}
            </span>
            <span>{general.quality}</span>
            <span className="text-ink-soft/60">·</span>
            <span>四维 →</span>
          </div>
        </div>
      </div>
      {/* 4 维属性 */}
      <div className="mt-3">
        <StatsBars stats={general.stats} />
      </div>
    </Link>
  );
}

export interface SkillAssignmentGridProps {
  lineup: Lineup;
  /** 由父级解析好的 skillMap(id → Skill) */
  skillMap: Map<string, { id: string; name: string; subType: SkillSubType }>;
  /** 由父级解析好的 generalMap(id → General) */
  generalMap: Map<string, { id: string; name: string }>;
}

/** 战法分配区:主将的 1 主 + 2 副,副将的 2 个战法 */
export function SkillAssignmentGrid({
  lineup,
  skillMap,
  generalMap,
}: SkillAssignmentGridProps) {
  // 主将:在 skills.main 里出现的 ID
  const mainGeneralId = Object.keys(lineup.skills.main)[0];
  const mainGeneral = mainGeneralId ? generalMap.get(mainGeneralId) : null;
  const mainSkills = mainGeneralId ? lineup.skills.main[mainGeneralId] : [];

  // 副将:skills.vice 的所有 key
  const viceGeneralIds = Object.keys(lineup.skills.vice);

  return (
    <div className="space-y-4">
      {/* 主将战法 */}
      <div className="rounded-lg border border-primary/30 bg-card p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
          <span>主将战法</span>
          {mainGeneral && (
            <span className="text-ink-soft">
              · {mainGeneral.name} ({mainGeneralId})
            </span>
          )}
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {mainSkills.map((skillId, i) => {
            const skill = skillMap.get(skillId);
            return (
              <li key={`${skillId}-${i}`}>
                <SkillChip
                  skill={skill ?? { id: skillId, name: skillId, subType: "主动" }}
                  role={i === 0 ? "主" : "副"}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* 副将战法 */}
      {viceGeneralIds.map((gid) => {
        const g = generalMap.get(gid);
        const skills = lineup.skills.vice[gid];
        return (
          <div
            key={gid}
            className="rounded-lg border border-line/60 bg-card p-3"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
              <span>副将战法</span>
              {g && (
                <span className="text-ink-soft">
                  · {g.name} ({gid})
                </span>
              )}
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {skills.map((skillId, i) => {
                const skill = skillMap.get(skillId);
                return (
                  <li key={`${skillId}-${i}`}>
                    <SkillChip
                      skill={
                        skill ?? { id: skillId, name: skillId, subType: "主动" }
                      }
                      role="副"
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function SkillChip({
  skill,
  role,
}: {
  skill: { id: string; name: string; subType: SkillSubType };
  role: "主" | "副";
}) {
  return (
    <Link
      href={`/skills/${skill.id}`}
      className="group flex items-center justify-between gap-2 rounded-md border border-line/60 bg-bg-cream/40 px-3 py-2 transition-all hover:border-primary/60 hover:bg-card"
    >
      <div className="min-w-0">
        <p className="truncate font-serif text-sm font-medium text-ink group-hover:text-primary">
          {skill.name}
        </p>
        <p className="text-[10px] text-ink-soft/70">ID: {skill.id}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span
          className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${
            role === "主"
              ? "bg-primary text-bg-cream"
              : "bg-stone-200 text-stone-700"
          }`}
        >
          {role}
        </span>
        <span className="text-[10px] text-ink-soft/70">{skill.subType}</span>
      </div>
    </Link>
  );
}
