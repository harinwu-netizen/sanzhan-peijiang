/**
 * F7 模拟交战 — 结果展示页(server component)
 *
 * 加载 lineups + simConfig,传给 client 组件渲染。
 * (与 F3 sandbox page 同模式)
 *
 * BattleResultClient 内部用了 useSearchParams() 读 URL 查询参数
 * (lineupA / lineupB / opponents / mode),Next.js 16 要求
 * "use client" + useSearchParams 必须包在 <Suspense> 里才能 SSG。
 * 这里用 <Suspense fallback={loading}> 兜底。
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { loadLineups, loadSimConfig } from "@/lib/data/loader";
import { BattleResultClient } from "@/components/Battle/BattleResultClient";

export const metadata: Metadata = {
  title: "模拟结果 · 三战配将助手",
  description: "模拟交战结果:胜率、5 档结果、兵损比、双方分输出/治疗统计。",
};

export default function BattleResultPage() {
  const lineups = loadLineups();
  const simConfig = loadSimConfig();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="font-serif text-2xl font-semibold text-primary">模拟结果</h1>
          <p className="mt-3 text-sm text-ink-soft">加载中...</p>
        </div>
      }
    >
      <BattleResultClient lineups={lineups} simConfig={simConfig} />
    </Suspense>
  );
}
