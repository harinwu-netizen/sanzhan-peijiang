/**
 * F3 配将模拟器 — 入口(server component)
 *
 * 加载 5 类数据(generals/skills/tactics/traits/lineups)并传给 client 组件。
 * SandboxClient 自己处理 localStorage / URL state,server 这里只做数据装配。
 */
import type { Metadata } from "next";
import {
  loadGenerals,
  loadSkills,
  loadTactics,
  loadTraits,
  loadLineups,
} from "@/lib/data/loader";
import { SandboxClient } from "@/components/Sandbox/SandboxClient";

export const metadata: Metadata = {
 title: "配将模拟器 · 三战配将助手",
 description:
 "三国志·战略版在线配将模拟器,拖拽3 名武将、装备6 个战法、配置阵法与兵书,实时查看阵营/兵种加成、兼容性提示与阵容评分,配将过程可视化、可分享。",
 keywords: ["三国志战略版", "配将模拟器", "拖拽配将", "阵容评分"],
 openGraph: {
 title: "配将模拟器 · 三战配将助手",
 description: "三国志·战略版拖拽配将器,3武将 +6战法 +阵法 +兵书一站装配。",
 type: "website",
 locale: "zh_CN",
 },
};

export default function SandboxPage() {
  const generals = loadGenerals();
  const skills = loadSkills();
  const tactics = loadTactics();
  const traits = loadTraits();
  const lineups = loadLineups();

  return (
    <SandboxClient
      generals={generals}
      skills={skills}
      tactics={tactics}
      traits={traits}
      lineups={lineups}
    />
  );
}
