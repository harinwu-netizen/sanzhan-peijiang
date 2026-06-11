/**
 * F4 推荐阵容 — 折线图(8 回合输出趋势)
 *
 * "use client" 组件,echarts 渲染。
 *
 * MVP 简化:
 *  - X 轴 1-8 回合
 *  - Y 轴 0-Ymax 累计/每回合 输出
 *  - 3 条线对应 3 个武将(由 caller 传 labels + data)
 *  - 一条粗线表示全队总输出
 */
"use client";

import ReactECharts from "echarts-for-react";

export interface LineSeries {
  /** 系列名(武将名或"全队") */
  name: string;
  /** 8 个数据点(对应回合 1-8) */
  data: number[];
  /** 是否加粗(全队输出线) */
  emphasis?: boolean;
  /** 配色 */
  color?: string;
}

export interface LineupLineChartProps {
  series: LineSeries[];
  height?: number;
  ymax?: number;
}

const DEFAULT_COLORS = [
  "#c84141", // 红
  "#5a8a5a", // 绿
  "#2f6fb0", // 蓝
  "#d4a72c", // 黄
  "#7a4ea0", // 紫
  "#e07b2a", // 橙
];

export function LineupLineChart({
  series,
  height = 320,
  ymax,
}: LineupLineChartProps) {
  // 计算 y 轴上限:数据最大值 * 1.1,最小 1000
  const dataMax = series.reduce(
    (acc, s) => Math.max(acc, ...s.data),
    0,
  );
  const computedMax = ymax ?? Math.max(1000, Math.ceil((dataMax * 1.15) / 500) * 500);

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(42,42,42,0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff", fontSize: 12 },
      axisPointer: { type: "line", lineStyle: { color: "#c4b896" } },
    },
    legend: {
      data: series.map((s) => s.name),
      bottom: 0,
      textStyle: { color: "#5a5a5a", fontSize: 12 },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: {
      left: 50,
      right: 16,
      top: 24,
      bottom: 48,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      name: "回合",
      nameLocation: "end",
      nameTextStyle: { color: "#5a5a5a", fontSize: 12 },
      boundaryGap: false,
      data: ["1", "2", "3", "4", "5", "6", "7", "8"],
      axisLine: { lineStyle: { color: "#c4b896" } },
      axisLabel: { color: "#5a5a5a", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      name: "输出",
      max: computedMax,
      axisLine: { lineStyle: { color: "#c4b896" } },
      splitLine: { lineStyle: { color: "#c4b89660" } },
      axisLabel: { color: "#5a5a5a", fontSize: 12 },
    },
    series: series.map((s, i) => ({
      name: s.name,
      type: "line",
      data: s.data,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: {
        color: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        width: s.emphasis ? 4 : 2,
      },
      itemStyle: {
        color: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      },
      emphasis: { focus: "series" },
    })),
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
