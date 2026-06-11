/**
 * F4 推荐阵容 — 评价页(server component → 委托给 client)
 *
 * server 端负责:解析 URL → 加载阵容 + 武将 → 注入到 <EvaluateClient>
 * client 端负责:echarts 渲染 + mock 数据生成
 */
import { notFound } from "next/navigation";
import {
  loadGenerals,
  loadLineups,
} from "@/lib/data/loader";
import { EvaluateClient } from "./EvaluateClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LineupEvaluatePage({ params }: PageProps) {
  const { id } = await params;

  const allLineups = loadLineups();
  const lineup = allLineups.find((l) => l.id === id);
  if (!lineup) notFound();

  const generals = loadGenerals();
  const generalMap = new Map(generals.map((g) => [g.id, g]));

  // 按 lineup.generalIds 顺序取 3 武将(若缺失则 notFound)
  const lineupGenerals = lineup.generalIds.map((gid) => {
    const g = generalMap.get(gid);
    if (!g) {
      // 找不到武将数据 → 整页 notFound(数据完整性问题)
      throw new Error(
        `[lineup evaluate] 阵容 ${lineup.id} 引用了不存在的武将 ${gid}`,
      );
    }
    return g;
  });

  return <EvaluateClient lineup={lineup} generals={lineupGenerals} />;
}
