"use client";

/**
 * F3 配将模拟器 — 选武将 Modal
 *
 * 用于点 [主将] / [副将1] / [副将2] 时弹出。
 * 支持搜索 + 阵营筛选 + 品质筛选。点击武将触发 onSelect 后由父组件关闭弹窗。
 *
 * 不用 DaisyUI(项目未安装),手撸一个紧凑的 Dialog:
 *  - 背景遮罩 + 居中卡片
 *  - 顶部搜索框 + 阵营 chips
 *  - 5 个武将卡片(我们的数据当前只有 5 个蜀将)
 *  - 点 ESC 或点遮罩关闭
 */
import { useEffect, useMemo, useState } from "react";
import type { General, Camp, Quality } from "@/lib/data/schemas";
import { QualityBadge } from "@/components/Skills/Badges";
import {
  CAMP_BG,
  CAMP_COLOR,
  CAMP_BORDER,
  ALL_CAMPS,
  ALL_QUALITIES,
  QUALITY_BADGE,
} from "@/components/Generals/constants";

export interface GeneralPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (general: General) => void;
  generals: General[];
  /** 用于排除已被同队另一槽选中的武将(主将 + 副将 1/2 = 2 个 ID) */
  excludeIds: string[];
  /** 弹窗标题(如"选择主将") */
  title: string;
}

export function GeneralPickerModal({
  open,
  onClose,
  onSelect,
  generals,
  excludeIds,
  title,
}: GeneralPickerModalProps) {
  const [query, setQuery] = useState("");
  const [camp, setCamp] = useState<Camp | "all">("all");
  const [quality, setQuality] = useState<Quality | "all">("all");

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 打开时锁定 body 滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 关闭时清搜索
  useEffect(() => {
    if (!open) {
      setQuery("");
      setCamp("all");
      setQuality("all");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return generals.filter((g) => {
      if (excludeIds.includes(g.id)) return false;
      if (camp !== "all" && g.camp !== camp) return false;
      if (quality !== "all" && g.quality !== quality) return false;
      if (q) {
        const hay = `${g.name} ${g.camp}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [generals, query, camp, quality, excludeIds]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      {/* 遮罩 */}
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
      />

      {/* 卡片 — 移动端:从底部弹起全屏;桌面端:居中 max-w-3xl */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-xl border border-line bg-bg-cream shadow-2xl sm:max-h-[85vh] sm:mx-4 sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line/60 px-4 py-3 sm:px-5">
          <h2 className="font-serif text-base font-semibold text-primary sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-sm text-ink-soft hover:bg-card hover:text-ink"
            aria-label="关闭"
          >
            ✕
          </button>
        </header>

        <div className="border-b border-line/60 px-4 py-3 sm:px-5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索武将名 / 阵营"
            className="w-full rounded-md border border-line bg-card px-3 py-2 text-base outline-none focus:border-primary sm:text-sm"
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-ink-soft">阵营:</span>
            <FilterChip
              active={camp === "all"}
              onClick={() => setCamp("all")}
              label="全部"
            />
            {ALL_CAMPS.map((c) => (
              <FilterChip
                key={c}
                active={camp === c}
                onClick={() => setCamp(c)}
                label={c}
                accentClass={CAMP_BG[c] + " " + CAMP_COLOR[c]}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-ink-soft">品质:</span>
            <FilterChip
              active={quality === "all"}
              onClick={() => setQuality("all")}
              label="全部"
            />
            {ALL_QUALITIES.map((q) => (
              <FilterChip
                key={q}
                active={quality === q}
                onClick={() => setQuality(q)}
                label={q}
                accentClass={QUALITY_BADGE[q]}
              />
            ))}
          </div>
        </div>

        <ul className="max-h-[60vh] flex-1 space-y-2 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {filtered.length === 0 ? (
            <li className="rounded border border-dashed border-line bg-card/60 p-6 text-center text-sm text-ink-soft">
              无匹配武将
            </li>
          ) : (
            filtered.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onSelect(g)}
                  className="group flex w-full items-center gap-4 rounded-lg border border-line/70 bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span
                    aria-hidden
                    className={`h-12 w-1.5 shrink-0 rounded-full border ${CAMP_BORDER[g.camp]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${CAMP_BG[g.camp]} ${CAMP_COLOR[g.camp]}`}
                      >
                        {g.camp}
                      </span>
                      <span className="font-serif text-base font-semibold text-ink group-hover:text-primary">
                        {g.name}
                      </span>
                      <QualityBadge quality={g.quality} size="sm" />
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      武 {g.stats.武力} · 智 {g.stats.智力} · 统 {g.stats.统率} ·
                      速 {g.stats.速度}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-soft/80">
                      兵种:骑 {g.cavalry} / 盾 {g.shield} / 弓 {g.archer} / 枪{" "}
                      {g.spear} / 器 {g.siege}
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  accentClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accentClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary text-bg-cream"
          : "border-line bg-card text-ink-soft hover:border-primary/60 " +
            (accentClass ?? ""))
      }
    >
      {label}
    </button>
  );
}
