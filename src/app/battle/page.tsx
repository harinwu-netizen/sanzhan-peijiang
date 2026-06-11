/**
 * F7 模拟交战 — 入口页(server component)
 *
 * 加载 5 类数据 + 阵容,传给 client 组件。
 * (与 F3 sandbox page 同模式)
 */
import type { Metadata } from "next";
import {
  loadGenerals,
  loadSkills,
  loadTactics,
  loadTraits,
  loadLineups,
} from "@/lib/data/loader";
import { BattleEntryClient } from "@/components/Battle/BattleEntryClient";

export const metadata: Metadata = {
 title: "模拟交战 · 三战配将助手",
 description:
 "三国志·战略版阵容对战模拟器,选3武将 +阵法 +兵种跑简化蒙特卡洛模拟,输出胜率、5档结果分布与兵损比。支持打击面(自动遍历全部预设阵容)和单挑(手动选对手)两种模式。",
 keywords: ["三国志战略版", "模拟交战", "蒙特卡洛", "胜率", "打击面"],
 openGraph: {
 title: "模拟交战 · 三战配将助手",
 description: "三国志·战略版阵容对战模拟器,胜率 +5档结果 +兵损比。",
 type: "website",
 locale: "zh_CN",
 },
};

export default function BattlePage() {
  const generals = loadGenerals();
  const skills = loadSkills();
  const tactics = loadTactics();
  const traits = loadTraits();
  const lineups = loadLineups();

  return (
    <BattleEntryClient
      generals={generals}
      skills={skills}
      tactics={tactics}
      traits={traits}
      lineups={lineups}
    />
  );
}
