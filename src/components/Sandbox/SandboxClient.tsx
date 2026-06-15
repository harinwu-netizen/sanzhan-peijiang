"use client";

/**
 * F3 配将模拟器 — 主交互组件(S6 UI 重构版)
 *
 * 布局:3 列(主将 / 副将 1 / 副将 2)× 7 行,每个武将独立一列,视线垂直。
 *
 * 列(3 列):
 *   - 主将(main)
 *   - 副将 1(vice1)
 *   - 副将 2(vice2)
 *
 * 行(7 行):
 *   1. 武将卡头部(头像占位 + 阵营 + 品质 + 4 维属性 + 5 兵种适性 + 红度)
 *   2. 自带战法(只读 display)
 *   3. 装配战法(主将 3 个 / 副将 2 个;**主将槽 1 必为阵法**)
 *   4. 大兵书(1 个 / 将)
 *   5. 小兵书(2 个 / 将,本任务 schema 暂只暴露 1 个,见下)
 *   6. 特技(1 个 / 将,本任务 schema 暂只暴露 1 个)
 *   7. 全队共享(兵种 + 战法联动/奇略)— 横跨 3 列
 *
 * S6 schema 变更摘要:
 *   - SandboxLineup.qilueSkillId 新增(全队"战法联动 / 奇略")
 *   - SandboxLineup.formationSkillId 保留(deprecated),migrateLineup 在
 *     加载时把旧值投影到 mainSkillIds[0]
 *   - serialization.ts / utils.ts / 已有 compatibility.ts 函数未改;
 *     仅在 computeWarnings 末尾 appenditive 4 条新规则(主将槽 1 必阵法 / 副将禁阵法兵种 / 同阵营加成未触发 / 主将未学所选阵法)
 *
 * 已知差异 vs spec:
 *   - spec 写"小兵书 2 个 / 将",但本任务 schema 字段仍为单槽(与序列化兼容)。
 *     UI 在副将列为小兵书预留两个标签位,但数据只写到 minorTacticIds[i](i=0/1/2)。
 *   - spec 写"特技 1 个 / 将",但现有 SandboxGeneralSlot.traitIds 是 string[]
 *     (0-2 个)。UI 仅展示/编辑第一个,数据不动。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  General,
  Skill,
  SkillSubType,
  Tactics,
  Trait,
  Lineup,
  TroopType,
} from "@/lib/data/schemas";
import {
  defaultLineupSet,
  emptyLineup,
  makeLineupId,
  migrateLineup,
  GENERAL_COLUMNS,
  GENERAL_COLUMN_LABELS,
  type GeneralColumnKey,
  type SandboxGeneralSlot,
  type SandboxLineup,
  type SandboxLineupSet,
} from "./types";
import {
  saveToStorage,
  loadFromStorage,
  buildShareUrl,
  decodeLineupFromUrlParam,
} from "./serialization";
import {
  computeCampBonus,
  computeTroopBonus,
  computeWarnings,
  type CompatWarning,
} from "./compatibility";
import { GeneralPickerModal } from "./GeneralPickerModal";
import { SkillSelect } from "./SkillSelect";
import { TroopSelect } from "./TroopSelect";
import { RedLevelSlider } from "./RedLevelSlider";
import {
  QualityBadge,
  SubTypeBadge,
} from "@/components/Skills/Badges";
import {
  CAMP_BG,
  CAMP_COLOR,
  CAMP_BORDER,
  APTITUDE_BG,
  TROOP_TYPES,
} from "@/components/Generals/constants";
import { cn } from "./utils";

export interface SandboxClientProps {
  generals: General[];
  skills: Skill[];
  tactics: Tactics[];
  traits: Trait[];
  lineups: Lineup[];
}

/**
 * 每个武将列的战法配置(S6):
 *  - main (3 槽):槽 0 = 阵法(必)/ 槽 1,2 = 其他(任意)
 *  - vice1 (2 槽):任意,但不能是阵法/兵种
 *  - vice2 (2 槽):同上
 */
interface ColumnSkillConfig {
  count: number;
  /** 第 0 个槽的角色标签(主将=阵法 / 副将=战法 1) */
  firstLabel: string;
  /** 槽位 subType 约束(主将槽 0 仅阵法,其他任意) */
  subTypeFilterAt: Array<SkillSubType | "any">;
}

const COLUMN_SKILL_CONFIG: Record<GeneralColumnKey, ColumnSkillConfig> = {
  main: {
    count: 3,
    firstLabel: "阵法(主将槽 1)",
    // 槽 0 仅阵法;槽 1,2 任意(主动/被动/指挥/突击/阵法/兵种 都可以)
    subTypeFilterAt: ["阵法", "any", "any"],
  },
  vice1: {
    count: 2,
    firstLabel: "战法 1",
    // 副将 1/2 任意(但不能用阵法/兵种)— UI 层面做提示,compatibility.ts 报错
    subTypeFilterAt: ["any", "any"],
  },
  vice2: {
    count: 2,
    firstLabel: "战法 1",
    subTypeFilterAt: ["any", "any"],
  },
};

/** 把 column + index 映射到 SandboxLineup 上对应的战法数组 */
function getSkillArrayKey(
  column: GeneralColumnKey,
): "mainSkillIds" | "vice1SkillIds" | "vice2SkillIds" {
  switch (column) {
    case "main":
      return "mainSkillIds";
    case "vice1":
      return "vice1SkillIds";
    case "vice2":
      return "vice2SkillIds";
  }
}

export function SandboxClient({
  generals,
  skills,
  tactics,
  traits,
  lineups,
}: SandboxClientProps) {
  // 队伍集状态(单源)
  const [lineupSet, setLineupSet] = useState<SandboxLineupSet>(() =>
    defaultLineupSet(),
  );
  // 是否已 hydrate 完(避免 SSR / client 初始状态不一致)
  const [hydrated, setHydrated] = useState(false);
  // 武将选择 modal 的目标列
  const [pickerColumn, setPickerColumn] = useState<GeneralColumnKey | null>(
    null,
  );
  // 复制 / 分享反馈
  const [toast, setToast] = useState<string | null>(null);

  // 当前激活的 lineup
  const activeLineup = useMemo(
    () =>
      lineupSet.lineups.find((l) => l.id === lineupSet.activeId) ??
      lineupSet.lineups[0],
    [lineupSet],
  );

  // 计算加成与兼容性
  const campBonus = useMemo(
    () => computeCampBonus(activeLineup, generals),
    [activeLineup, generals],
  );
  const troopBonus = useMemo(
    () => computeTroopBonus(activeLineup, generals, skills),
    [activeLineup, generals, skills],
  );
  const warnings = useMemo(
    () => computeWarnings(activeLineup, generals, skills),
    [activeLineup, generals, skills],
  );

  // -------------------------------------------------------------------------
  // hydrate:挂载时尝试从 URL 恢复,然后从 localStorage 恢复
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. URL ?d= 优先(分享短链)
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    if (d) {
      const decoded = decodeLineupFromUrlParam(d);
      if (decoded) {
        const migrated = migrateLineup(decoded) ?? decoded;
        setLineupSet({ lineups: [migrated], activeId: migrated.id });
        setHydrated(true);
        return;
      }
    }

    // 2. localStorage(走 migrateLineup 补齐 S6 新字段)
    const fromStorage = loadFromStorage();
    if (fromStorage && fromStorage.lineups.length > 0) {
      const migrated: SandboxLineupSet = {
        lineups: fromStorage.lineups
          .map((l) => migrateLineup(l) ?? l)
          .filter((l): l is SandboxLineup => l !== null),
        activeId: fromStorage.activeId,
      };
      if (migrated.lineups.length > 0) {
        setLineupSet(migrated);
      }
    }
    setHydrated(true);
  }, []);

  // -------------------------------------------------------------------------
  // 持久化(localStorage)— 每次状态变化时写入
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(lineupSet);
  }, [lineupSet, hydrated]);

  // -------------------------------------------------------------------------
  // 顶层 update 函数:对当前激活队伍做局部 patch
  // -------------------------------------------------------------------------
  const updateActive = useCallback(
    (patch: Partial<SandboxLineup>) => {
      setLineupSet((prev) => {
        const next = prev.lineups.map((l) =>
          l.id === prev.activeId ? { ...l, ...patch } : l,
        );
        return { ...prev, lineups: next };
      });
    },
    [],
  );

  const updateSlot = useCallback(
    (column: GeneralColumnKey, patch: Partial<SandboxGeneralSlot>) => {
      setLineupSet((prev) => {
        const next = prev.lineups.map((l) =>
          l.id === prev.activeId
            ? { ...l, [column]: { ...l[column], ...patch } }
            : l,
        );
        return { ...prev, lineups: next };
      });
    },
    [],
  );

  // 战法数组 patch(per column)
  const updateSkillAt = useCallback(
    (column: GeneralColumnKey, idx: number, value: string | null) => {
      const key = getSkillArrayKey(column);
      setLineupSet((prev) => {
        const next = prev.lineups.map((l) => {
          if (l.id !== prev.activeId) return l;
          const arr = [...l[key]] as Array<string | null>;
          arr[idx] = value;
          return { ...l, [key]: arr } as SandboxLineup;
        });
        return { ...prev, lineups: next };
      });
    },
    [],
  );

  // 兵书 patch(major/minor)
  const updateTacticAt = useCallback(
    (
      key: "majorTacticIds" | "minorTacticIds",
      idx: number,
      value: string | null,
    ) => {
      setLineupSet((prev) => {
        const next = prev.lineups.map((l) => {
          if (l.id !== prev.activeId) return l;
          const arr = [...l[key]] as Array<string | null>;
          arr[idx] = value;
          return { ...l, [key]: arr } as SandboxLineup;
        });
        return { ...prev, lineups: next };
      });
    },
    [],
  );

  // -------------------------------------------------------------------------
  // 多队伍操作
  // -------------------------------------------------------------------------
  const switchLineup = useCallback((id: string) => {
    setLineupSet((prev) => ({ ...prev, activeId: id }));
  }, []);

  const newLineup = useCallback(() => {
    setLineupSet((prev) => {
      const n = emptyLineup(`队伍 ${prev.lineups.length + 1}`);
      return { lineups: [...prev.lineups, n], activeId: n.id };
    });
  }, []);

  const copyLineup = useCallback(() => {
    setLineupSet((prev) => {
      const cur = prev.lineups.find((l) => l.id === prev.activeId);
      if (!cur) return prev;
      const copy: SandboxLineup = {
        ...cur,
        id: makeLineupId(),
        name: `${cur.name} (副本)`,
      };
      copy.mainSkillIds = [...cur.mainSkillIds] as typeof cur.mainSkillIds;
      copy.vice1SkillIds = [...cur.vice1SkillIds] as typeof cur.vice1SkillIds;
      copy.vice2SkillIds = [...cur.vice2SkillIds] as typeof cur.vice2SkillIds;
      copy.majorTacticIds = [...cur.majorTacticIds] as typeof cur.majorTacticIds;
      copy.minorTacticIds = [...cur.minorTacticIds] as typeof cur.minorTacticIds;
      copy.main = { ...cur.main, traitIds: [...cur.main.traitIds] };
      copy.vice1 = { ...cur.vice1, traitIds: [...cur.vice1.traitIds] };
      copy.vice2 = { ...cur.vice2, traitIds: [...cur.vice2.traitIds] };
      return { lineups: [...prev.lineups, copy], activeId: copy.id };
    });
  }, []);

  const removeLineup = useCallback(
    (id: string) => {
      setLineupSet((prev) => {
        if (prev.lineups.length <= 1) return prev;
        const next = prev.lineups.filter((l) => l.id !== id);
        const activeId = prev.activeId === id ? next[0].id : prev.activeId;
        return { lineups: next, activeId };
      });
    },
    [],
  );

  const renameLineup = useCallback((id: string, name: string) => {
    setLineupSet((prev) => {
      const next = prev.lineups.map((l) =>
        l.id === id ? { ...l, name } : l,
      );
      return { ...prev, lineups: next };
    });
  }, []);

  // -------------------------------------------------------------------------
  // 分享
  // -------------------------------------------------------------------------
  const handleShare = useCallback(async () => {
    const url = buildShareUrl(activeLineup);
    if (!url) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setToast("已复制分享链接到剪贴板");
      } else {
        window.prompt("复制以下分享链接:", url);
        setToast("已生成分享链接");
      }
    } catch {
      window.prompt("复制以下分享链接:", url);
      setToast("已生成分享链接");
    }
    window.setTimeout(() => setToast(null), 2000);
  }, [activeLineup]);

  // -------------------------------------------------------------------------
  // 已存在的"匹配阵容"(用于"查看评价")
  // -------------------------------------------------------------------------
  const matchingLineup = useMemo(() => {
    const ids = [activeLineup.main, activeLineup.vice1, activeLineup.vice2]
      .map((s) => s.generalId)
      .filter((x): x is string => x !== null)
      .sort();
    if (ids.length !== 3) return null;
    return lineups.find((l) => {
      const sorted = [...l.generalIds].sort();
      return (
        sorted.length === ids.length && sorted.every((v, i) => v === ids[i])
      );
    });
  }, [activeLineup, lineups]);

  const handleEvaluate = useCallback(() => {
    if (matchingLineup) {
      window.location.href = `/lineups/${matchingLineup.id}/evaluate`;
    } else {
      setToast("暂未生成评价,先试试推荐阵容");
      window.setTimeout(() => setToast(null), 2000);
    }
  }, [matchingLineup]);

  // -------------------------------------------------------------------------
  // 查表
  // -------------------------------------------------------------------------
  const generalById = useMemo(
    () => new Map(generals.map((g) => [g.id, g])),
    [generals],
  );
  const skillById = useMemo(
    () => new Map(skills.map((s) => [s.id, s])),
    [skills],
  );
  const tacticById = useMemo(
    () => new Map(tactics.map((t) => [t.id, t])),
    [tactics],
  );
  const traitById = useMemo(
    () => new Map(traits.map((t) => [t.id, t])),
    [traits],
  );

  // 战法冲突(整队共 7 个战法槽):统计重复
  const usedSkillIds = useMemo(() => {
    const arr = [
      activeLineup.mainSkillIds,
      activeLineup.vice1SkillIds,
      activeLineup.vice2SkillIds,
    ]
      .flat()
      .filter((x): x is string => x !== null);
    return new Set(arr);
  }, [activeLineup]);

  // 已选武将的 ID(供 picker 排除)
  const pickedGeneralIds = useMemo(
    () =>
      [activeLineup.main, activeLineup.vice1, activeLineup.vice2]
        .map((s) => s.generalId)
        .filter((x): x is string => x !== null),
    [activeLineup],
  );

  // 阵法战法候选(主将槽 1 用)
  const formationOptions = useMemo(
    () => skills.filter((s) => s.subType === "阵法"),
    [skills],
  );

  // 当前主将可学的阵法(更窄的筛选,避免选了自己学不了的)
  const mainLearnableFormations = useMemo(() => {
    const main = activeLineup.main.generalId
      ? generalById.get(activeLineup.main.generalId)
      : null;
    if (!main) return formationOptions; // 主将还没选 → 全阵法可选
    return formationOptions.filter((s) =>
      main.learnableFormationSkillIds.includes(s.id),
    );
  }, [activeLineup.main.generalId, generalById, formationOptions]);

  // 副将可装备的特质(general.equippableTraitCount)→ 仅展示候选
  const traitsForGeneral = useCallback(
    (generalId: string | null): Trait[] => {
      if (!generalId) return traits;
      const g = generalById.get(generalId);
      if (!g) return traits;
      // MVP:不做"是否解锁"过滤(数据层无 unlocked 字段),只按全表展示
      return traits;
    },
    [generalById, traits],
  );

  // -------------------------------------------------------------------------
  // render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-6 lg:px-6">
      <header className="border-b border-line/60 pb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-red sm:text-sm">
          F3 · Sandbox
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-primary sm:text-3xl">
          配将模拟器
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          选 3 个武将,装 7 个战法(<span className="font-medium text-accent-red">主将槽 1 必为阵法</span>),
          配兵书与特技,实时查看阵营 / 兵种加成与兼容性提示。
        </p>
      </header>

      {/* 队伍切换栏 */}
      <LineupTabs
        lineups={lineupSet.lineups}
        activeId={lineupSet.activeId}
        onSwitch={switchLineup}
        onNew={newLineup}
        onCopy={copyLineup}
        onRemove={removeLineup}
        onRename={renameLineup}
      />

      {/* ============================================================== */}
      {/* 主网格:3 列 × 7 行                                              */}
      {/*   col: 1fr 1fr 1fr | 行高:min-content                            */}
      {/*   行 1: 武将卡(头像/名/属/适性/红度)                            */}
      {/*   行 2: 自带战法(只读)                                          */}
      {/*   行 3: 装配战法(主 3 / 副 2,主 0 必阵法)                       */}
      {/*   行 4: 大兵书 1 个                                              */}
      {/*   行 5: 小兵书 2 个                                              */}
      {/*   行 6: 特技 1 个                                                */}
      {/*   行 7: 全队共享(兵种 + 奇略)— 横跨 3 列                       */}
      {/* ============================================================== */}
      <div
        className={cn(
          "mt-4 grid grid-cols-3 gap-2 sm:gap-3",
          // 移动端横向滚动(3 列在 375px 下太窄),桌面端正常 3 列
          "overflow-x-auto",
        )}
      >
        {/* ============ 行 1: 武将卡 ============ */}
        {GENERAL_COLUMNS.map((col) => {
          const slot = activeLineup[col];
          const g = slot.generalId ? generalById.get(slot.generalId) : null;
          return (
            <GeneralColumnHeader
              key={`row1-${col}`}
              column={col}
              general={g ?? null}
              redLevel={slot.redLevel}
              onOpenPicker={() => setPickerColumn(col)}
              onClear={() =>
                updateSlot(col, {
                  generalId: null,
                  traitIds: [],
                  redLevel: 0,
                })
              }
              onRedLevel={(v) => updateSlot(col, { redLevel: v })}
            />
          );
        })}

        {/* ============ 行 2: 自带战法(只读) ============ */}
        {GENERAL_COLUMNS.map((col) => {
          const slot = activeLineup[col];
          const g = slot.generalId ? generalById.get(slot.generalId) : null;
          const selfSkill = g ? skillById.get(g.selfSkillId) : null;
          return (
            <SelfSkillRow
              key={`row2-${col}`}
              column={col}
              generalName={g?.name ?? null}
              selfSkill={selfSkill ?? null}
            />
          );
        })}

        {/* ============ 行 3: 装配战法 ============ */}
        {GENERAL_COLUMNS.map((col) => (
          <SkillsRow
            key={`row3-${col}`}
            column={col}
            config={COLUMN_SKILL_CONFIG[col]}
            lineup={activeLineup}
            allSkills={skills}
            skillById={skillById}
            formationLearnableOptions={mainLearnableFormations}
            usedSkillIds={usedSkillIds}
            onChange={(idx, val) => updateSkillAt(col, idx, val)}
          />
        ))}

        {/* ============ 行 4: 大兵书 1 个 ============ */}
        {GENERAL_COLUMNS.map((col) => {
          const idx = GENERAL_COLUMNS.indexOf(col);
          const tid = activeLineup.majorTacticIds[idx] ?? null;
          const t = tid ? tacticById.get(tid) : null;
          return (
            <TacticSlotCell
              key={`row4-${col}`}
              column={col}
              label="大兵书"
              hint="(1 个)"
              subLabel={t?.name ?? "未选"}
              category={t?.category ?? null}
              value={tid}
              options={tactics.filter((tac) => tac.slot === "major")}
              onChange={(id) => updateTacticAt("majorTacticIds", idx, id)}
              tacticById={tacticById}
              emptyPh="未选大兵书"
            />
          );
        })}

        {/* ============ 行 5: 小兵书 2 个 ============ */}
        {/*
          spec 说"小兵书 2 个 / 将",但 schema 字段 single(对应 1 个 / 将)。
          渲染策略:每列展示 1 个小兵书槽(直接对应 schema),另用一段灰字
          说明"预留 2 个槽位(当前仅暴露 1 个,以兼容既有 localStorage 数据)"。
          不写第 2 个槽位,避免数据不一致。
        */}
        {GENERAL_COLUMNS.map((col) => {
          const idx = GENERAL_COLUMNS.indexOf(col);
          const tid = activeLineup.minorTacticIds[idx] ?? null;
          const t = tid ? tacticById.get(tid) : null;
          return (
            <div
              key={`row5-${col}`}
              className="col-span-3 sm:col-span-1"
            >
              <TacticSlotCell
                column={col}
                label="小兵书"
                hint="(2 个 · 当前 1 个槽)"
                subLabel={t?.name ?? "未选"}
                category={t?.category ?? null}
                value={tid}
                options={tactics.filter((tac) => tac.slot === "minor")}
                onChange={(id) => updateTacticAt("minorTacticIds", idx, id)}
                tacticById={tacticById}
                emptyPh="未选小兵书"
              />
            </div>
          );
        })}

        {/* ============ 行 6: 特技 1 个 ============ */}
        {/*
          spec 说"特技 1 个 / 将",但 schema 字段是 string[](0-2)。
          渲染策略:每列只展示第 1 个特技(若有),并支持替换或清空。
        */}
        {GENERAL_COLUMNS.map((col) => {
          const slot = activeLineup[col];
          const traitId = slot.traitIds[0] ?? null;
          const tr = traitId ? traitById.get(traitId) : null;
          const g = slot.generalId ? generalById.get(slot.generalId) : null;
          return (
            <div key={`row6-${col}`} className="col-span-3 sm:col-span-1">
              <TraitSlotCell
                column={col}
                label="特技"
                hint={
                  g
                    ? `(上限 ${g.equippableTraitCount})`
                    : "(选武将后生效)"
                }
                traitId={traitId}
                trait={tr}
                options={traitsForGeneral(slot.generalId)}
                onChange={(id) =>
                  updateSlot(col, { traitIds: id ? [id] : [] })
                }
              />
            </div>
          );
        })}

        {/* ============ 行 7: 全队共享(兵种 + 奇略)— 横跨 3 列 ============ */}
        <SharedRow
          troop={activeLineup.troop}
          onTroop={(t) => updateActive({ troop: t })}
          qilueId={activeLineup.qilueSkillId}
          qilueSkill={activeLineup.qilueSkillId
            ? skillById.get(activeLineup.qilueSkillId) ?? null
            : null}
          onQilue={(id) => updateActive({ qilueSkillId: id })}
          qilueOptions={skills.filter(
            (s) =>
              // 奇略 = 类主动技能 → 主动 / 阵法 / 兵种(其它 4 类也行,但优先主动)
              s.subType === "主动" ||
              s.subType === "阵法" ||
              s.subType === "兵种",
          )}
          qilueOptionsUsed={activeLineup.qilueSkillId
            ? new Set([activeLineup.qilueSkillId])
            : usedSkillIds}
          campBonus={campBonus}
          troopBonus={troopBonus}
        />
      </div>

      {/* ============================================================== */}
      {/* 兼容性提示 + 操作(横跨整宽)                                    */}
      {/* ============================================================== */}
      <section
        aria-label="兼容性与操作"
        className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3"
      >
        <div
          aria-label="兼容性提示"
          className="rounded-lg border border-line/70 bg-card/60 p-3 sm:p-4 lg:col-span-2"
        >
          <h2 className="font-serif text-base font-semibold text-primary">
            兼容性提示
          </h2>
          <WarningsList warnings={warnings} />
        </div>
        <div
          aria-label="操作"
          className="rounded-lg border border-line/70 bg-card/60 p-3 sm:p-4"
        >
          <h2 className="font-serif text-base font-semibold text-primary">
            操作
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="rounded-md border border-accent-red/60 bg-accent-red/10 px-3 py-2 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red hover:text-bg-cream"
            >
              分享(复制短链)
            </button>
            <button
              type="button"
              onClick={handleEvaluate}
              className="rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-bg-cream"
            >
              {matchingLineup
                ? `查看评价(${matchingLineup.name})`
                : "查看评价(暂无匹配阵容)"}
            </button>
            <a
              href="/battle"
              className="rounded-md border border-line bg-card px-3 py-2 text-center text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-bg-cream"
            >
              模拟对战 →
            </a>
          </div>
        </div>
      </section>

      {/* === 武将选择 modal === */}
      <GeneralPickerModal
        open={pickerColumn !== null}
        onClose={() => setPickerColumn(null)}
        onSelect={(g) => {
          if (pickerColumn) {
            updateSlot(pickerColumn, {
              generalId: g.id,
              redLevel: activeLineup[pickerColumn].redLevel,
              traitIds: activeLineup[pickerColumn].traitIds,
            });
          }
          setPickerColumn(null);
        }}
        generals={generals}
        excludeIds={pickedGeneralIds.filter(
          (id) => id !== activeLineup[pickerColumn ?? "main"]?.generalId,
        )}
        title={
          pickerColumn
            ? `选择${GENERAL_COLUMN_LABELS[pickerColumn]}`
            : "选择武将"
        }
      />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-primary/40 bg-bg-cream px-4 py-2 text-sm text-primary shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// 行级子组件
// ===========================================================================

/** 行 1:武将卡(头像占位 + 名 + 4 维 + 5 适性 + 红度) */
function GeneralColumnHeader({
  column,
  general,
  redLevel,
  onOpenPicker,
  onClear,
  onRedLevel,
}: {
  column: GeneralColumnKey;
  general: General | null;
  redLevel: number;
  onOpenPicker: () => void;
  onClear: () => void;
  onRedLevel: (v: number) => void;
}) {
  return (
    <div
      className={cn(
        "col-span-3 flex flex-col gap-2 rounded-lg border border-line/70 bg-card p-3 sm:col-span-1",
        column === "main"
          ? "border-accent-red/40"
          : "border-line/70",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium",
            column === "main"
              ? "bg-accent-red/15 text-accent-red"
              : "bg-primary/10 text-primary",
          )}
        >
          {GENERAL_COLUMN_LABELS[column]}
        </span>
        {general && (
          <button
            type="button"
            onClick={onClear}
            className="rounded p-1 text-xs text-ink-soft hover:bg-card hover:text-accent-red"
            aria-label="清空该列"
            title="清空该列"
          >
            ✕
          </button>
        )}
      </div>

      {general ? (
        <>
          {/* 武将卡头部:头像占位 + 阵营色条 + 名 + 品质 */}
          <div className="flex items-center gap-2">
            {/* 头像占位(无具体角色头像,仅显示首字 + 阵营色)— 不引入新依赖 */}
            <div
              aria-hidden
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-md border text-lg font-semibold",
                CAMP_BORDER[general.camp],
                "bg-bg-cream text-primary",
              )}
            >
              {general.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-base font-semibold text-ink">
                {general.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${CAMP_BG[general.camp]} ${CAMP_COLOR[general.camp]}`}
                >
                  {general.camp}
                </span>
                <QualityBadge quality={general.quality} size="sm" />
                {general.isSP === true && (
                  <span className="rounded-sm bg-accent-red px-1.5 py-0.5 text-[10px] font-semibold text-bg-cream">
                    SP
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4 维属性:武 / 智 / 统 / 速 */}
          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
            <StatBlock label="武" value={general.stats.武力} color="bg-red-100 text-red-700" />
            <StatBlock label="智" value={general.stats.智力} color="bg-purple-100 text-purple-700" />
            <StatBlock label="统" value={general.stats.统率} color="bg-sky-100 text-sky-700" />
            <StatBlock label="速" value={general.stats.速度} color="bg-emerald-100 text-emerald-700" />
          </div>

          {/* 兵种适性 5 个:骑 / 盾 / 弓 / 枪 / 器 */}
          <div className="flex gap-1">
            {TROOP_TYPES.map((t) => {
              const grade = general[t.key];
              return (
                <span
                  key={t.key}
                  title={`${t.label} 适性 ${grade}`}
                  className={cn(
                    "flex h-6 w-7 items-center justify-center rounded-sm text-[11px] font-semibold",
                    APTITUDE_BG[grade],
                  )}
                >
                  {t.label}
                </span>
              );
            })}
          </div>

          {/* 红度 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-ink-soft">红度</span>
            <RedLevelSlider
              value={redLevel}
              onChange={onRedLevel}
              label={general.name}
            />
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onOpenPicker}
          className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line bg-bg-cream/30 text-xs text-ink-soft hover:border-primary/60 hover:text-primary"
        >
          <span className="text-xl text-ink-soft/60">+</span>
          <span>选择{GENERAL_COLUMN_LABELS[column]}</span>
        </button>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={cn("rounded px-1 py-0.5", color)}>
      <div className="text-[9px] opacity-70">{label}</div>
      <div className="font-mono text-[11px] font-semibold leading-tight">
        {value}
      </div>
    </div>
  );
}

/** 行 2:自带战法(只读) */
function SelfSkillRow({
  column,
  generalName,
  selfSkill,
}: {
  column: GeneralColumnKey;
  generalName: string | null;
  selfSkill: Skill | null;
}) {
  // 副将列在该行的"自带战法"是空的(武将自带战法属于该武将自身,但 spec 副将行没列出自带战法槽)
  if (column !== "main") {
    return (
      <div className="col-span-3 hidden sm:col-span-1 sm:block" aria-hidden />
    );
  }
  return (
    <div
      className="col-span-3 rounded-md border border-line/60 bg-bg-cream/40 p-2 sm:col-span-1"
      aria-label="主将自带战法"
    >
      <p className="mb-1 text-[10px] text-ink-soft/80">主将自带战法(只读)</p>
      {generalName && selfSkill ? (
        <div className="flex items-center gap-1.5">
          <SubTypeBadge subType={selfSkill.subType} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
            {selfSkill.name}
          </span>
        </div>
      ) : (
        <p className="text-[11px] text-ink-soft">
          {generalName ? "—" : "选武将后显示"}
        </p>
      )}
    </div>
  );
}

/** 行 3:装配战法(主将 3 / 副将 2)— 主将槽 0 必阵法 */
function SkillsRow({
  column,
  config,
  lineup,
  allSkills,
  skillById,
  formationLearnableOptions,
  usedSkillIds,
  onChange,
}: {
  column: GeneralColumnKey;
  config: ColumnSkillConfig;
  lineup: SandboxLineup;
  allSkills: Skill[];
  skillById: Map<string, Skill>;
  formationLearnableOptions: Skill[];
  usedSkillIds: Set<string>;
  onChange: (idx: number, val: string | null) => void;
}) {
  const key = getSkillArrayKey(column);
  const ids = lineup[key];
  return (
    <div
      className="col-span-3 flex flex-col gap-1.5 rounded-md border border-line/60 bg-bg-cream/40 p-2 sm:col-span-1"
      aria-label={`${GENERAL_COLUMN_LABELS[column]}装配战法`}
    >
      <p className="mb-1 flex items-baseline justify-between text-[10px] text-ink-soft/80">
        <span>装配战法</span>
        <span className="text-[10px] text-ink-soft/60">
          {column === "main" ? "槽 1 必阵法" : "不可阵法/兵种"}
        </span>
      </p>
      {Array.from({ length: config.count }).map((_, i) => {
        const sid = ids[i] ?? null;
        const skill = sid ? skillById.get(sid) : null;
        const isFormationSlot = column === "main" && i === 0;
        // 候选集合:
        //  - 主将槽 0:仅阵法(可选范围 = 主将可学的阵法 ∩ 全部阵法)
        //  - 其他:任意 skill(由 SkillSelect 内部可选过滤)
        const options = isFormationSlot
          ? formationLearnableOptions
          : allSkills;
        // 排除同队已用战法(本槽除外)
        const exclude = Array.from(usedSkillIds).filter((x) => x !== sid);
        // 副将槽过滤:不能用阵法/兵种 — 在 SkillSelect 中没法做"不能用 subType",
        // 这里通过过滤 options 来达到
        let filteredOptions: Skill[] = options;
        if (!isFormationSlot && column !== "main") {
          filteredOptions = (options as Skill[]).filter(
            (s) => s.subType !== "阵法" && s.subType !== "兵种",
          );
        }
        // 副将槽过滤:主将槽 1/2 不能是阵法/兵种(也排除)
        if (column === "main" && i > 0) {
          filteredOptions = (options as Skill[]).filter(
            (s) => s.subType !== "阵法" && s.subType !== "兵种",
          );
        }
        const slotRole: "formation" | "other" = isFormationSlot
          ? "formation"
          : "other";
        return (
          <div key={i} className="flex flex-col gap-0.5">
            <label className="flex items-baseline justify-between text-[10px] text-ink-soft/80">
              <span>
                {i === 0
                  ? config.firstLabel
                  : i === 1
                    ? "战法 2"
                    : "战法 3"}
              </span>
              {isFormationSlot && (
                <span className="text-[9px] font-medium uppercase tracking-wider text-accent-red">
                  formation
                </span>
              )}
            </label>
            <SkillSelect
              kind="skill"
              value={sid}
              onChange={(id) => onChange(i, id)}
              options={filteredOptions}
              placeholder={
                slotRole === "formation" ? "必选阵法战法…" : "选择战法…"
              }
              excludeIds={exclude}
              popoverTitle={`选择${GENERAL_COLUMN_LABELS[column]}战法 ${i + 1}`}
            />
            {skill && (
              <div className="flex items-center gap-1 px-0.5">
                <SubTypeBadge subType={skill.subType} size="sm" />
                <QualityBadge quality={skill.quality} size="sm" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 行 4/5 通用:兵书单元格 */
function TacticSlotCell({
  column: _column,
  label,
  hint,
  subLabel,
  category,
  value,
  options,
  onChange,
  tacticById: _tacticById,
  emptyPh,
}: {
  column: GeneralColumnKey;
  label: string;
  hint: string;
  subLabel: string;
  category: string | null;
  value: string | null;
  options: Tactics[];
  onChange: (id: string | null) => void;
  tacticById: Map<string, Tactics>;
  emptyPh: string;
}) {
  return (
    <div
      className="col-span-3 flex flex-col gap-1 rounded-md border border-line/60 bg-bg-cream/40 p-2 sm:col-span-1"
      aria-label={`${label}槽`}
    >
      <div className="flex items-baseline justify-between text-[10px] text-ink-soft/80">
        <span>{label}</span>
        <span className="text-[10px] text-ink-soft/60">{hint}</span>
      </div>
      <SkillSelect
        kind="tactic"
        value={value}
        onChange={onChange}
        options={options}
        placeholder={emptyPh}
        popoverTitle={`选择${label}`}
      />
      <div className="flex items-center gap-1 px-0.5 text-[10px] text-ink-soft">
        <span className="truncate">{subLabel}</span>
        {category && (
          <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] text-primary">
            {category}
          </span>
        )}
      </div>
    </div>
  );
}

/** 行 6:特技单元格(每列 1 个) */
function TraitSlotCell({
  column: _column,
  label,
  hint,
  traitId,
  trait,
  options,
  onChange,
}: {
  column: GeneralColumnKey;
  label: string;
  hint: string;
  traitId: string | null;
  trait: Trait | null;
  options: Trait[];
  onChange: (id: string | null) => void;
}) {
  return (
    <div
      className="col-span-3 flex flex-col gap-1 rounded-md border border-line/60 bg-bg-cream/40 p-2 sm:col-span-1"
      aria-label={`${label}槽`}
    >
      <div className="flex items-baseline justify-between text-[10px] text-ink-soft/80">
        <span>{label}</span>
        <span className="text-[10px] text-ink-soft/60">{hint}</span>
      </div>
      <SkillSelect
        kind="trait"
        value={traitId}
        onChange={onChange}
        options={options}
        placeholder="未选特技"
        popoverTitle={`选择${label}`}
      />
      {trait && (
        <div className="flex items-center gap-1 px-0.5 text-[10px] text-ink-soft">
          <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] text-amber-800">
            {trait.category}
          </span>
          <span className="truncate">{trait.name}</span>
        </div>
      )}
    </div>
  );
}

/** 行 7:全队共享(兵种 + 奇略)— 横跨 3 列 */
function SharedRow({
  troop,
  onTroop,
  qilueId,
  qilueSkill,
  onQilue,
  qilueOptions,
  qilueOptionsUsed,
  campBonus,
  troopBonus,
}: {
  troop: TroopType | null;
  onTroop: (t: TroopType | null) => void;
  qilueId: string | null;
  qilueSkill: Skill | null;
  onQilue: (id: string | null) => void;
  qilueOptions: Skill[];
  qilueOptionsUsed: Set<string>;
  campBonus: ReturnType<typeof computeCampBonus>;
  troopBonus: ReturnType<typeof computeTroopBonus>;
}) {
  return (
    <div
      className="col-span-3 mt-2 grid grid-cols-1 gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 sm:grid-cols-3"
      aria-label="全队共享"
    >
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium uppercase tracking-wider text-primary">
          兵种(主将决定)
        </label>
        <TroopSelect value={troop} onChange={onTroop} />
        <p className="text-[10px] text-ink-soft">
          {troopBonus.troopKey
            ? `${troopBonus.text}`
            : "未选兵种"}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium uppercase tracking-wider text-primary">
          战法联动 / 奇略
        </label>
        <SkillSelect
          kind="skill"
          value={qilueId}
          onChange={onQilue}
          options={qilueOptions}
          placeholder="未选奇略"
          excludeIds={Array.from(qilueOptionsUsed).filter((x) => x !== qilueId)}
          popoverTitle="选择战法联动 / 奇略"
        />
        {qilueSkill && (
          <div className="flex items-center gap-1 px-0.5 text-[10px] text-ink-soft">
            <SubTypeBadge subType={qilueSkill.subType} size="sm" />
            <span className="truncate">{qilueSkill.name}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium uppercase tracking-wider text-primary">
          阵营 / 兵种加成
        </label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line/60 bg-bg-cream/60 px-2 py-1.5 text-[11px]">
          <span className="text-ink-soft">阵营:</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-medium",
              campBonus.camp
                ? "bg-accent-red/15 text-accent-red"
                : "bg-line/40 text-ink-soft",
            )}
          >
            {campBonus.text}
          </span>
          <span className="ml-1 text-ink-soft">兵种:</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-medium",
              troopBonus.troopKey
                ? "bg-amber-100 text-amber-800"
                : "bg-line/40 text-ink-soft",
            )}
          >
            {troopBonus.text}
          </span>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// 通用子组件
// ===========================================================================

function LineupTabs({
  lineups,
  activeId,
  onSwitch,
  onNew,
  onCopy,
  onRemove,
  onRename,
}: {
  lineups: SandboxLineup[];
  activeId: string;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onCopy: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="队伍切换"
      className="mt-4 flex flex-wrap items-center gap-2 border-b border-line/60 pb-3"
    >
      {lineups.map((l) => {
        const active = l.id === activeId;
        return (
          <div key={l.id} className="flex items-center gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSwitch(l.id)}
              onDoubleClick={() => {
                const next = window.prompt("重命名队伍", l.name);
                if (next && next.trim()) onRename(l.id, next.trim());
              }}
              title="双击重命名"
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-bg-cream"
                  : "border-line bg-card text-ink-soft hover:border-primary/60 hover:text-primary",
              )}
            >
              {l.name}
            </button>
            {lineups.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(l.id)}
                className="rounded p-1 text-xs text-ink-soft hover:bg-card hover:text-accent-red"
                aria-label={`删除 ${l.name}`}
                title="删除队伍"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        className="rounded-md border border-dashed border-line bg-transparent px-3 py-1.5 text-sm text-ink-soft hover:border-primary/60 hover:text-primary"
      >
        + 新建
      </button>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink-soft hover:border-primary/60 hover:text-primary"
      >
        复制当前
      </button>
    </div>
  );
}

function WarningsList({ warnings }: { warnings: CompatWarning[] }) {
  if (warnings.length === 0) {
    return (
      <p className="mt-2 rounded-md border border-line/60 bg-bg-cream/40 px-3 py-2 text-sm text-ink-soft">
        ✓ 当前配置无冲突
      </p>
    );
  }
  return (
    <ul className="mt-2 space-y-1.5 text-sm">
      {warnings.map((w, i) => (
        <li
          key={i}
          className={cn(
            "rounded-md border px-3 py-1.5",
            w.level === "error"
              ? "border-accent-red/50 bg-accent-red/10 text-accent-red"
              : w.level === "warn"
                ? "border-amber-400/50 bg-amber-50 text-amber-800"
                : "border-line bg-bg-cream/40 text-ink-soft",
          )}
        >
          <span className="mr-1 font-mono text-xs">
            {w.level === "error" ? "✕" : w.level === "warn" ? "⚠" : "ℹ"}
          </span>
          {w.text}
        </li>
      ))}
    </ul>
  );
}