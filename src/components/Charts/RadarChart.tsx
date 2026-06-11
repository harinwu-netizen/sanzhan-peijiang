/**
 * F4 推荐阵容 — 6 维雷达图(echarts-for-react)
 *
 * "use client" 组件,因为 echarts 只能在 client 渲染。
 *
 * 入参:
 *  - ratings: 6 维评分(0-100),schema 里的 LineupRatings 子集
 *  - size:    画布尺寸(宽高,px)
 *  - showLabels: 是否在外圈显示数值
 */
"use client";

import ReactECharts from "echarts-for-react";
import { RATING_AXES, type SixDimensionalRatings } from "@/components/Lineups/constants";

export interface RadarChartProps {
  /** 6 维评分(可只传前 6 个,total 不参与雷达图) */
  ratings: SixDimensionalRatings;
  /** 画布尺寸 */
  height?: number;
  /** 阵容名(用于顶部 legend 文本,可省略) */
  name?: string;
}

export function RatingsRadarChart({
  ratings,
  height = 360,
  name = "阵容",
}: RadarChartProps) {
  // 数据按 RATING_AXES 顺序排列,echarts 会按 indicator 同序映射
  const indicator = RATING_AXES.map((a) => ({
    name: a.label,
    max: 100,
  }));
  const values = RATING_AXES.map((a) => ratings[a.key]);

  // 用主色(output 红)作为雷达填充色,匹配横条配色
  const accent = RATING_AXES[0].color;
  const accentBg = `${accent}55`; // 33% 透明度
  const accentLine = accent;

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(42,42,42,0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 12 },
      formatter: (params: { value: number[]; name?: string }) => {
        if (!params.value) return "";
        const lines = params.value.map(
          (v, i) => `${RATING_AXES[i].label}: ${v}`,
        );
        return lines.join("<br/>");
      },
    },
    legend: {
      data: [name],
      bottom: 0,
      textStyle: { color: "#5a5a5a", fontSize: 12 },
      itemWidth: 12,
      itemHeight: 12,
    },
    radar: {
      indicator,
      shape: "polygon",
      splitNumber: 4,
      center: ["50%", "48%"],
      radius: "65%",
      axisName: {
        color: "#3a4a3a",
        fontSize: 13,
        fontWeight: 600,
      },
      splitArea: {
        areaStyle: {
          color: ["#f5efd830", "#f5efd850", "#f5efd830", "#f5efd850"],
        },
      },
      axisLine: { lineStyle: { color: "#c4b896" } },
      splitLine: { lineStyle: { color: "#c4b896" } },
    },
    series: [
      {
        name,
        type: "radar",
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { color: accentLine, width: 2 },
        itemStyle: { color: accentLine },
        areaStyle: { color: accentBg },
        data: [
          {
            value: values,
            name,
          },
        ],
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ height, width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}
