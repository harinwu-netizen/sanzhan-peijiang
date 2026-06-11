import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Layout/Header";
import { Footer } from "@/components/Layout/Footer";

// ---------------------------------------------------------------------------
// 全站 metadata
// ---------------------------------------------------------------------------
//
// metadataBase:所有相对 URL 的解析基准,OG image、canonical 等元数据
//都会基于这个 URL拼接绝对地址。占位为 Vercel 默认域名,部署到
// 自定义域名后必须改(README 有提醒)。
//
// openGraph + twitter:分享到微博 / X /朋友圈时显示的卡片信息,
//解决"无 metadataBase警告" +改善社交媒体分享体验。
//
// 占位与 src/app/sitemap.ts / robots.ts 一致(同源)。
// ---------------------------------------------------------------------------

const SITE_URL = "https://sanzhan-peijiang.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "三战配将助手 · 三国志·战略版配将工具",
    template: "%s · 三战配将助手",
  },
  description:
    "为《三国志·战略版》玩家提供武将图鉴、战法图鉴、配将模拟、阵容推荐、模拟交战、特技库、版本特性与全站搜索的 Web工具。",
  keywords: [
    "三国志·战略版",
    "三战配将",
    "武将图鉴",
    "战法图鉴",
    "阵容推荐",
    "配将模拟",
    "模拟交战",
  ],
  authors: [{ name: "三战配将助手" }],
  creator: "三战配将助手",
  openGraph: {
    title: "三战配将助手 · 三国志·战略版配将工具",
    description:
      "武将图鉴、战法图鉴、配将模拟、阵容推荐、模拟交战 — 一站式《三国志·战略版》玩家辅助工具。",
    type: "website",
    locale: "zh_CN",
    siteName: "三战配将助手",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "三战配将助手 · 三国志·战略版配将工具",
    description:
      "武将图鉴、战法图鉴、配将模拟、阵容推荐、模拟交战 — 一站式《三国志·战略版》玩家辅助工具。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * 移动端响应式 — 显式声明 viewport(S5):
 *   - width=device-width:  视口 = 设备宽度(关键,避免 980px 默认桌面布局)
 *   - initialScale=1:      不放大/缩小
 *   - maximumScale=5:      允许用户放大到 5x(可访问性,iOS 默认 5x)
 *   - themeColor:          iOS Safari / Android Chrome 顶栏色(与 bg-cream 同色)
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#e8e0c8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
