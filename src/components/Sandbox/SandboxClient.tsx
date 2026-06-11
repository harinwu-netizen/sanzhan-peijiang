"use client";

/**
 * F3 配将模拟器 — 主交互组件
 *
 * 职责:
 *   - 维护 SandboxLineupSet 状态(多队伍 + 当前激活)
 *   - localStorage 持久化(单向写入)
 *   - URL ?d= 恢复(挂载时尝试)
 *   - 把 lineup state 渲染为:队伍切换 / 武将位 / 战法 / 阵法 / 兵种 / 兵书 / 特技 / 红度 / 兼容性提示
 *
 * 数据:server component 传下来的 generals / skills / tactics / traits / lineups
 *
 * 关键设计:
 *   - 顶层就是一个大 useReducer 风格的 setState(setLineupSet),所有写操作收敛
 *   - 子组件通过 props 接收当前 lineup 状态 + onUpdate 回调,无 Redux
 *   - 兼容性提示与加成用 useMemo 实时算
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  General,
  Skill,
  Tactics,
  Trait,
  Lineup,
  TroopType,
} from "@/lib/data/schemas";
import {
  defaultLineupSet,
  emptyLineup,
  makeLineupId,
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
import { TroopSelect, ALL_TROOPS } from "./TroopSelect";
import { RedLevelSlider } from "./RedLevelSlider";
import { QualityBadge, SubTypeBadge } from "@/components/Skills/Badges";
import { CAMP_BG, CAMP_COLOR, CAMP_BORDER } from "@/components/Generals/constants";
import { cn } from "./utils";

export interface SandboxClientProps {
  generals: General[];
  skills: Skill[];
  tactics: Tactics[];
  traits: Trait[];
  lineups: Lineup[];
}

// 槽位标签
const SLOT_LABELS = ["主将", "副将 1", "副将 2"] as const;
type SlotKey = "main" | "vice1" | "vice2";
const SLOT_KEYS: SlotKey[] = ["main", "vice1", "vice2"];

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
  // 武将选择 modal 的目标槽位
  const [pickerSlot, setPickerSlot] = useState<SlotKey | null>(null);
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
        setLineupSet({ lineups: [decoded], activeId: decoded.id });
        setHydrated(true);
        return;
      }
    }

    // 2. localStorage
    const fromStorage = loadFromStorage();
    if (fromStorage && fromStorage.lineups.length > 0) {
      setLineupSet(fromStorage);
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
    (slot: SlotKey, patch: Partial<SandboxGeneralSlot>) => {
      setLineupSet((prev) => {
        const next = prev.lineups.map((l) =>
          l.id === prev.activeId ? { ...l, [slot]: { ...l[slot], ...patch } } : l,
        );
        return { ...prev, lineups: next };
      });
    },
    [],
  );

  // 战法数组(固定长度)patch
  const updateSkillArray = useCallback(
    <K extends "mainSkillIds" | "vice1SkillIds" | "vice2SkillIds">(
      key: K,
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

  const updateTacticArray = useCallback(
    <K extends "majorTacticIds" | "minorTacticIds">(
      key: K,
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
      // 数组深拷贝(否则两份共享引用)
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
        if (prev.lineups.length <= 1) return prev; // 至少保留 1 个
        const next = prev.lineups.filter((l) => l.id !== id);
        const activeId =
          prev.activeId === id ? next[0].id : prev.activeId;
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
        // 兜底:打开 prompt
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
  // 武将已选项 → 名字查表
  // -------------------------------------------------------------------------
  const generalById = useMemo(
    () => new Map(generals.map((g) => [g.id, g])),
    [generals],
  );
  const skillById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const tacticById = useMemo(
    () => new Map(tactics.map((t) => [t.id, t])),
    [tactics],
  );
  const traitById = useMemo(() => new Map(traits.map((t) => [t.id, t])), [traits]);

  // 战法冲突:同队 6 个战法槽 + 主将 3,统计重复
  const usedSkillIds = useMemo(() => {
    const arr = [
      ...activeLineup.mainSkillIds,
      ...activeLineup.vice1SkillIds,
      ...activeLineup.vice2SkillIds,
    ].filter((x): x is string => x !== null);
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

  // 选阵法时:只列武将可学的阵法战法(否则 picker 里一片空)
  const formationOptions = useMemo(
    () => skills.filter((s) => s.subType === "阵法"),
    [skills],
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
          选 3 个武将,装 6 个战法,挑 1 个阵法 + 1 个兵种,加 6 个兵书 + 0-6 个特技。
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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        {/* === 武将区(3 个槽位) === */}
        <section
          aria-label="武将区"
          className="rounded-lg border border-line/70 bg-card/60 p-3 sm:p-4 lg:col-span-2"
        >
          <h2 className="font-serif text-base font-semibold text-primary">
            武将
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SLOT_KEYS.map((slot, i) => (
              <GeneralSlotCard
                key={slot}
                slotKey={slot}
                slot={activeLineup[slot]}
                slotIndex={i}
                generalById={generalById}
                onOpenPicker={() => setPickerSlot(slot)}
                onClear={() =>
                  updateSlot(slot, { generalId: null, traitIds: [], redLevel: 0 })
                }
                onRedLevel={(v) => updateSlot(slot, { redLevel: v })}
              />
            ))}
          </div>

          {/* 兵种 + 阵法 + 加成行 */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="兵种(可空)">
              <TroopSelect
                value={activeLineup.troop}
                onChange={(t: TroopType | null) => updateActive({ troop: t })}
              />
            </Field>
            <Field label="阵法(主将必须能学)">
              <SkillSelect
                kind="skill"
                value={activeLineup.formationSkillId}
                onChange={(id) => updateActive({ formationSkillId: id })}
                options={formationOptions}
                filterSubType="阵法"
                placeholder="未选"
              />
            </Field>
          </div>

          {/* 加成行 */}
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-line/60 bg-bg-cream/40 px-3 py-2 text-sm">
            <span className="text-ink-soft">阵营加成:</span>
            <span
              className={cn(
                "rounded px-2 py-0.5 font-medium",
                campBonus.camp
                  ? "bg-accent-red/15 text-accent-red"
                  : "bg-line/40 text-ink-soft",
              )}
            >
              {campBonus.text}
            </span>
            <span className="ml-2 text-ink-soft">兵种加成:</span>
            <span
              className={cn(
                "rounded px-2 py-0.5 font-medium",
                troopBonus.troopKey
                  ? "bg-amber-100 text-amber-800"
                  : "bg-line/40 text-ink-soft",
              )}
            >
              {troopBonus.text}
            </span>
          </div>
        </section>

        {/* === 加成 + 兼容性提示 + 操作 === */}
        <section
          aria-label="操作与提示"
          className="rounded-lg border border-line/70 bg-card/60 p-3 sm:p-4"
        >
          <h2 className="font-serif text-base font-semibold text-primary">
            兼容性提示
          </h2>
          <WarningsList warnings={warnings} />

          <h2 className="mt-5 font-serif text-base font-semibold text-primary">
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
        </section>
      </div>

      {/* === 战法区 === */}
      <section
        aria-label="战法区"
        className="mt-3 rounded-lg border border-line/70 bg-card/60 p-3 sm:mt-4 sm:p-4"
      >
        <h2 className="font-serif text-base font-semibold text-primary">
          战法(主 + 2 副 / 副将各 2 个)
        </h2>

        {/* 主将战法(主将 + 副将1 + 副将2) — 1 行 3 个 */}
        <div className="mt-3">
          <p className="mb-2 text-xs text-ink-soft">主将战法</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {activeLineup.mainSkillIds.map((sid, i) => (
              <SkillSlot
                key={`main-${i}`}
                index={i}
                label={
                  i === 0
                    ? "主将位"
                    : i === 1
                      ? "副将 1 位"
                      : "副将 2 位"
                }
                value={sid}
                onChange={(id) => updateSkillArray("mainSkillIds", i, id)}
                skillById={skillById}
                excludeIds={Array.from(usedSkillIds).filter((x) => x !== sid)}
                options={skills}
              />
            ))}
          </div>
        </div>

        {/* 副将战法(每个副将 2 个) — 2 行,每行 2 个 */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-ink-soft">副将 1 战法</p>
            <div className="grid grid-cols-2 gap-3">
              {activeLineup.vice1SkillIds.map((sid, i) => (
                <SkillSlot
                  key={`v1-${i}`}
                  index={i}
                  label={`#${i + 1}`}
                  value={sid}
                  onChange={(id) => updateSkillArray("vice1SkillIds", i, id)}
                  skillById={skillById}
                  excludeIds={Array.from(usedSkillIds).filter((x) => x !== sid)}
                  options={skills}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-ink-soft">副将 2 战法</p>
            <div className="grid grid-cols-2 gap-3">
              {activeLineup.vice2SkillIds.map((sid, i) => (
                <SkillSlot
                  key={`v2-${i}`}
                  index={i}
                  label={`#${i + 1}`}
                  value={sid}
                  onChange={(id) => updateSkillArray("vice2SkillIds", i, id)}
                  skillById={skillById}
                  excludeIds={Array.from(usedSkillIds).filter((x) => x !== sid)}
                  options={skills}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === 装备品区(兵书 + 特技) === */}
      <section
        aria-label="兵书与特技"
        className="mt-3 rounded-lg border border-line/70 bg-card/60 p-3 sm:mt-4 sm:p-4"
      >
        <h2 className="font-serif text-base font-semibold text-primary">
          兵书(3 大 + 3 小,按武将顺序)
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-ink-soft">大兵书</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {activeLineup.majorTacticIds.map((tid, i) => (
                <div key={`maj-${i}`}>
                  <p className="mb-1 text-[10px] text-ink-soft/80">
                    {SLOT_LABELS[i]}
                  </p>
                  <SkillSelect
                    kind="tactic"
                    value={tid}
                    onChange={(id) => updateTacticArray("majorTacticIds", i, id)}
                    options={tactics.filter((t) => t.slot === "major")}
                    placeholder="大[ ]"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-ink-soft">小兵书</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {activeLineup.minorTacticIds.map((tid, i) => (
                <div key={`min-${i}`}>
                  <p className="mb-1 text-[10px] text-ink-soft/80">
                    {SLOT_LABELS[i]}
                  </p>
                  <SkillSelect
                    kind="tactic"
                    value={tid}
                    onChange={(id) => updateTacticArray("minorTacticIds", i, id)}
                    options={tactics.filter((t) => t.slot === "minor")}
                    placeholder="小[ ]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 特技 */}
        <h2 className="mt-5 font-serif text-base font-semibold text-primary">
          特技(0-2 / 武将)
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SLOT_KEYS.map((slot) => (
            <TraitSlot
              key={slot}
              label={SLOT_LABELS[SLOT_KEYS.indexOf(slot)]}
              traitIds={activeLineup[slot].traitIds}
              max={generals.find((g) => g.id === activeLineup[slot].generalId)
                ?.equippableTraitCount ?? 0}
              traits={traits}
              onChange={(ids) => updateSlot(slot, { traitIds: ids })}
            />
          ))}
        </div>
      </section>

      {/* === 武将选择 modal === */}
      <GeneralPickerModal
        open={pickerSlot !== null}
        onClose={() => setPickerSlot(null)}
        onSelect={(g) => {
          if (pickerSlot) {
            updateSlot(pickerSlot, {
              generalId: g.id,
              redLevel: activeLineup[pickerSlot].redLevel,
              traitIds: activeLineup[pickerSlot].traitIds,
            });
          }
          setPickerSlot(null);
        }}
        generals={generals}
        excludeIds={pickedGeneralIds.filter(
          (id) => id !== activeLineup[pickerSlot ?? "main"]?.generalId,
        )}
        title={
          pickerSlot
            ? `选择${SLOT_LABELS[SLOT_KEYS.indexOf(pickerSlot)]}`
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function GeneralSlotCard({
  slotKey,
  slot,
  slotIndex,
  generalById,
  onOpenPicker,
  onClear,
  onRedLevel,
}: {
  slotKey: SlotKey;
  slot: SandboxGeneralSlot;
  slotIndex: number;
  generalById: Map<string, General>;
  onOpenPicker: () => void;
  onClear: () => void;
  onRedLevel: (v: number) => void;
}) {
  const g = slot.generalId ? generalById.get(slot.generalId) : null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line/70 bg-card p-3">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium",
            slotIndex === 0
              ? "bg-accent-red/15 text-accent-red"
              : "bg-primary/10 text-primary",
          )}
        >
          {SLOT_LABELS[slotIndex]}
        </span>
        {g && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-ink-soft hover:text-accent-red"
            aria-label="清空该槽"
            title="清空该槽"
          >
            ✕
          </button>
        )}
      </div>

      {g ? (
        <>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-8 w-1.5 shrink-0 rounded-full border ${CAMP_BORDER[g.camp]}`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-serif text-base font-semibold",
                  "text-ink",
                )}
              >
                {g.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${CAMP_BG[g.camp]} ${CAMP_COLOR[g.camp]}`}
                >
                  {g.camp}
                </span>
                <QualityBadge quality={g.quality} size="sm" />
              </div>
            </div>
          </div>
          <div className="text-[10px] text-ink-soft/80">
            武力 {g.stats.武力} · 智力 {g.stats.智力} · 统率 {g.stats.统率} ·
            速度 {g.stats.速度}
          </div>
          <div className="flex items-center justify-between text-[10px] text-ink-soft">
            <span>红度</span>
            <RedLevelSlider
              value={slot.redLevel}
              onChange={onRedLevel}
              label={g.name}
            />
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onOpenPicker}
          className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-soft hover:border-primary/60 hover:text-primary"
        >
          + 选择{SLOT_LABELS[slotIndex]}
        </button>
      )}
    </div>
  );
}

function SkillSlot({
  index,
  label,
  value,
  onChange,
  skillById,
  excludeIds,
  options,
}: {
  index: number;
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  skillById: Map<string, Skill>;
  excludeIds: string[];
  options: Skill[];
}) {
  const s = value ? skillById.get(value) : null;
  return (
    <div className="rounded-md border border-line/60 bg-bg-cream/40 p-2">
      <p className="mb-1 text-[10px] text-ink-soft/80">{label}</p>
      <SkillSelect
        kind="skill"
        value={value}
        onChange={onChange}
        options={options}
        placeholder="选择战法…"
        excludeIds={excludeIds}
      />
      {s && (
        <div className="mt-1.5 flex items-center gap-1">
          <SubTypeBadge subType={s.subType} size="sm" />
          <QualityBadge quality={s.quality} size="sm" />
        </div>
      )}
    </div>
  );
}

function TraitSlot({
  label,
  traitIds,
  max,
  traits,
  onChange,
}: {
  label: string;
  traitIds: string[];
  max: number;
  traits: Trait[];
  onChange: (ids: string[]) => void;
}) {
  const canAdd = traitIds.length < max;
  return (
    <div className="rounded-md border border-line/60 bg-bg-cream/40 p-2">
      <p className="mb-1 text-[10px] text-ink-soft/80">
        {label} <span className="text-ink-soft/60">(上限 {max})</span>
      </p>
      <div className="space-y-1.5">
        {traitIds.map((tid, i) => (
          <div key={i} className="flex items-center gap-1">
            <select
              value={tid}
              onChange={(e) => {
                const next = [...traitIds];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 rounded border border-line bg-card px-2 py-1 text-xs outline-none focus:border-primary"
            >
              {traits.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} [{t.category}]
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange(traitIds.filter((_, j) => j !== i))}
              className="rounded p-1 text-xs text-ink-soft hover:text-accent-red"
              aria-label="移除特技"
            >
              ✕
            </button>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => onChange([...traitIds, ""])}
            className="w-full rounded border border-dashed border-line py-1 text-xs text-ink-soft hover:border-primary/60 hover:text-primary"
          >
            + 加一个
          </button>
        )}
      </div>
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
