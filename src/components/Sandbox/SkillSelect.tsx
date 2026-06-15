"use client";

/**
 * F3 配将模拟器 — 战法 / 阵法 / 兵种 / 兵书 / 特技 下拉
 *
 * 一个轻量的 <select> 包装:
 *  - 顶部 placeholder 行
 *  - 每个 option 显示:名字 + subType 徽章(只对 skill 类型有意义)
 *
 * S6 重构后:
 *  - 标签 / 描述里加上 subType 的视觉标识(主动 = 红/被动 = 绿/阵法 = 紫/...)
 *    原生 <select> 无法做彩色 option,但**已选项**的标签可以拼 emoji 前缀
 *    或在外部 caller 用所选 skill 的 SubTypeBadge 渲染
 *  - 增加 popover 模式(<select> 太大,移动端用半屏 drawer 选更顺手)
 *    - mode="native" — 用原生 <select>(桌面端默认)
 *    - mode="popover" — 用 dialog + list(移动端默认)
 *
 * 不引入新依赖:popover 用 <dialog>/absolute + 简单的 max-h + overflow。
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  Skill,
  Tactics,
  Trait,
  SkillSubType,
  TroopType,
} from "@/lib/data/schemas";
import { SubTypeBadge } from "@/components/Skills/Badges";
import { cn } from "./utils";

export type SelectableKind = "skill" | "tactic" | "trait" | "troop";

/** 选择器模式(S6 新增) */
export type SkillSelectMode = "native" | "popover" | "auto";

/** subType 短前缀(用于 select 的 option label,一眼分辨) */
const SUBTYPE_GLYPH: Record<SkillSubType, string> = {
  主动: "◆",
  被动: "◇",
  指挥: "◎",
  突击: "▶",
  阵法: "阵",
  兵种: "兵",
};

export interface SkillSelectProps {
  kind: SelectableKind;
  value: string | null;
  onChange: (id: string | null) => void;
  options:
    | Skill[]
    | Tactics[]
    | Trait[]
    | { value: TroopType; label: string }[];
  /** skill 类型时按 subType 过滤(主动/被动/指挥/突击/阵法/兵种) */
  filterSubType?: SkillSubType;
  /** 占位文字 */
  placeholder: string;
  /** 整行 className */
  className?: string;
  /** 哪些 ID 应该被排除(已被同队武将携带的战法) */
  excludeIds?: string[];
  /**
   * S6:选择器模式
   * - native:原生 <select>(桌面端)
   * - popover:用 dialog + list(移动端底部抽屉)
   * - auto(默认):viewport < 640 用 popover,否则 native
   */
  mode?: SkillSelectMode;
  /** popover 模式的标题(显示在抽屉顶部) */
  popoverTitle?: string;
}

export function SkillSelect({
  kind,
  value,
  onChange,
  options,
  filterSubType,
  placeholder,
  className,
  excludeIds = [],
  mode = "auto",
  popoverTitle,
}: SkillSelectProps) {
  // 过滤(只有 skill 类型有 subType 过滤)
  const filtered = (() => {
    if (kind !== "skill" || !filterSubType) return options;
    return (options as Skill[]).filter((s) => s.subType === filterSubType);
  })();

  // 检查 value 是否在 filtered 内(避免传了不存在的 id)
  const validValue =
    value !== null && filtered.some((o) => getId(o) === value)
      ? value
      : null;

  // mode 解析:auto → 视口宽度 < 640 用 popover
  const [resolvedMode, setResolvedMode] = useState<"native" | "popover">(
    "native",
  );
  useEffect(() => {
    if (mode !== "auto") {
      setResolvedMode(mode);
      return;
    }
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setResolvedMode(mq.matches ? "popover" : "native");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [mode]);

  if (resolvedMode === "popover") {
    return (
      <SkillSelectPopover
        kind={kind}
        value={validValue}
        onChange={onChange}
        filtered={filtered}
        placeholder={placeholder}
        excludeIds={excludeIds}
        className={className}
        title={popoverTitle}
      />
    );
  }

  return (
    <select
      value={validValue ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className={
        // 16px 防止 iOS 自动放大,min-h-[2.75rem] 满足 44x44 触摸目标
        "w-full min-h-[2.75rem] rounded-md border border-line bg-card px-2 py-1.5 text-base text-ink outline-none focus:border-primary sm:text-sm " +
        (className ?? "")
      }
    >
      <option value="">{placeholder}</option>
      {filtered.map((o) => {
        const id = getId(o);
        const isExcluded = excludeIds.includes(id) && id !== value;
        return (
          <option key={id} value={id} disabled={isExcluded}>
            {labelOf(o)}
            {isExcluded ? " (已被同队携带)" : ""}
          </option>
        );
      })}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Popover 模式 — 移动端底部抽屉
// ---------------------------------------------------------------------------

function SkillSelectPopover({
  kind,
  value,
  onChange,
  filtered,
  placeholder,
  excludeIds,
  className,
  title,
}: {
  kind: SelectableKind;
  value: string | null;
  onChange: (id: string | null) => void;
  filtered:
    | Skill[]
    | Tactics[]
    | Trait[]
    | { value: TroopType; label: string }[];
  placeholder: string;
  excludeIds: string[];
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerId = useId();

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 打开时锁定 body 滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const selected = useMemo(() => {
    for (const o of filtered) {
      if (getId(o) === value) return o;
    }
    return null;
  }, [filtered, value]);

  return (
    <>
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full min-h-[2.75rem] items-center justify-between gap-2 rounded-md border border-line bg-card px-3 py-1.5 text-left text-base text-ink outline-none focus:border-primary sm:text-sm",
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? labelOf(selected) : (
            <span className="text-ink-soft">{placeholder}</span>
          )}
        </span>
        <span aria-hidden className="text-ink-soft">▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title ?? "选择"}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          {/* 遮罩 */}
          <button
            type="button"
            aria-label="关闭"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          />
          {/* 抽屉卡片 */}
          <div
            ref={dialogRef}
            className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-xl border border-line bg-bg-cream shadow-2xl sm:mx-4 sm:max-h-[80vh] sm:rounded-xl"
          >
            <header className="flex items-center justify-between border-b border-line/60 px-4 py-3">
              <h2 className="font-serif text-base font-semibold text-primary">
                {title ?? "选择"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-md text-sm text-ink-soft hover:bg-card hover:text-ink"
                aria-label="关闭"
              >
                ✕
              </button>
            </header>
            <ul className="max-h-[70vh] flex-1 space-y-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
              {/* "清空" 选项 */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border border-dashed border-line bg-card px-3 py-2.5 text-left text-sm transition-colors",
                    "hover:border-primary/60 hover:text-primary active:scale-[0.99]",
                    value === null && "border-primary/60 bg-primary/5 text-primary",
                  )}
                >
                  <span className="text-ink-soft">{placeholder}</span>
                  {value === null && (
                    <span aria-hidden className="text-primary">
                      ✓
                    </span>
                  )}
                </button>
              </li>
              {filtered.map((o) => {
                const id = getId(o);
                const isExcluded = excludeIds.includes(id) && id !== value;
                const active = id === value;
                const subType =
                  kind === "skill"
                    ? (o as Skill).subType
                    : null;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={isExcluded}
                      onClick={() => {
                        if (isExcluded) return;
                        onChange(id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2.5 text-left text-sm transition-colors active:scale-[0.99]",
                        active
                          ? "border-primary/70 bg-primary/10"
                          : "border-line/70 hover:border-primary/60 hover:bg-bg-cream/60",
                        isExcluded && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {subType && <SubTypeBadge subType={subType} size="sm" />}
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">
                        {labelOf(o)}
                      </span>
                      {isExcluded && (
                        <span className="text-[10px] text-ink-soft">
                          已被同队携带
                        </span>
                      )}
                      {active && !isExcluded && (
                        <span aria-hidden className="text-primary">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function getId(o: unknown): string {
  // Skill / Tactics / Trait 都有 id:string
  // troop 选项的 id 我们用 value
  if (o && typeof o === "object" && "id" in (o as Record<string, unknown>)) {
    return (o as { id: string }).id;
  }
  if (o && typeof o === "object" && "value" in (o as Record<string, unknown>)) {
    return (o as { value: string }).value;
  }
  return "";
}

function labelOf(o: unknown): string {
  if (
    o &&
    typeof o === "object" &&
    "subType" in (o as Record<string, unknown>)
  ) {
    const s = o as Skill;
    // S6:option label 加 subType 前缀,玩家一眼看出类型
    return `${SUBTYPE_GLYPH[s.subType]} ${s.name} [${s.subType}]`;
  }
  if (
    o &&
    typeof o === "object" &&
    "slot" in (o as Record<string, unknown>)
  ) {
    const t = o as Tactics;
    return `${t.name} [${t.slot === "major" ? "大" : "小"}]`;
  }
  if (
    o &&
    typeof o === "object" &&
    "category" in (o as Record<string, unknown>) &&
    "triggerCondition" in (o as Record<string, unknown>)
  ) {
    const t = o as Trait;
    return `${t.name} [${t.category}]`;
  }
  if (o && typeof o === "object" && "label" in (o as Record<string, unknown>)) {
    return (o as { label: string }).label;
  }
  return "";
}

// 重导出 SubTypeBadge 以便 Sandbox 主组件里其他场景也能用
export { SubTypeBadge };