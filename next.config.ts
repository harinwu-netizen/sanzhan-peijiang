import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack 在 CJK 路径下做 byte-boundary 切片时可能 panic,
  // 显式指定 root 到本项目目录让 panic 不再发生。
  // 整个项目位于 "E:\minimax project\三战配将" 下(包含 CJK),
  // 必须用 path.resolve 解析,不能直接写字面量。
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
