/**
 * src/app/sitemap.ts — Next.js App Router dynamic sitemap
 *
 * 生成全站 XML sitemap,覆盖:
 * -9 个核心路由(/、/generals、/skills、/lineups、/sandbox、/battle、/traits、/patches、/search)
 * - /generals/[id] 50 个武将详情
 * - /skills/[id] 50 个战法详情
 * - /lineups/[id] 15 个阵容详情
 *
 * 总计:9 +50 +50 +15 =124 个 URL
 *
 * Next.js13.3+ App Router 内置支持 src/app/sitemap.ts,
 * build 时自动产出 /sitemap.xml,无需手写 route handler。
 *
 * ⚠️ 注意:
 * - baseUrl 是占位 https://sanzhan-peijiang.vercel.app,部署到正式域名后必须改。
 * - 数据来源统一走 @/lib/data/loader,服务器端读取,客户端不会执行。
 */
import type { MetadataRoute } from 'next';
import { loadGenerals, loadSkills, loadLineups } from '@/lib/data/loader';

// ---------------------------------------------------------------------------
// 占位 baseUrl — 用户必须改成自己的域名
// ---------------------------------------------------------------------------

/**
 *站点基础 URL。
 *
 * 默认 https://sanzhan-peijiang.vercel.app 是 Vercel 自动分配的默认域名,
 * 用户在 README.md 或部署指南中应被提醒:
 *1. 若绑自定义域名,改成 https://你的域名;
 *2. 若改 Vercel project name,域名会跟着变;
 *3.内部 next.config 或环境变量也可覆盖(但本任务用硬编码以保证 SSG静态性)。
 */
const BASE_URL = 'https://sanzhan-peijiang.vercel.app';

// ---------------------------------------------------------------------------
//工具:组装 URL + changeFrequency + priority 元组
// ---------------------------------------------------------------------------

type Entry = {
 path: string;
 changeFrequency?:
 | 'always'
 | 'hourly'
 | 'daily'
 | 'weekly'
 | 'monthly'
 | 'yearly'
 | 'never';
 priority?: number;
};

/** 把裸 path拼成绝对 URL,统一保留 trailingSlash=false风格 */
function url(path: string): string {
 const cleanPath = path.startsWith('/') ? path : `/${path}`;
 return `${BASE_URL}${cleanPath}`;
}

/** 给单个 entry 生成 sitemap item */
function toSitemapItem(e: Entry): MetadataRoute.Sitemap[number] {
 const item: MetadataRoute.Sitemap[number] = {
 url: url(e.path),
 };
 if (e.changeFrequency) item.changeFrequency = e.changeFrequency;
 if (e.priority !== undefined) item.priority = e.priority;
 return item;
}

// ---------------------------------------------------------------------------
// Sitemap 内容
// ---------------------------------------------------------------------------

/**9 个核心路由 */
const CORE_ROUTES: Entry[] = [
 { path: '/', changeFrequency: 'weekly', priority:1.0 },
 { path: '/generals', changeFrequency: 'weekly', priority:0.9 },
 { path: '/skills', changeFrequency: 'weekly', priority:0.9 },
 { path: '/lineups', changeFrequency: 'weekly', priority:0.9 },
 { path: '/sandbox', changeFrequency: 'monthly', priority:0.7 },
 { path: '/battle', changeFrequency: 'monthly', priority:0.7 },
 { path: '/traits', changeFrequency: 'monthly', priority:0.7 },
 { path: '/patches', changeFrequency: 'weekly', priority:0.8 },
 { path: '/search', changeFrequency: 'yearly', priority:0.5 },
];

/**
 *动态详情页通用条目。
 *
 * changeFrequency=monthly 是因为游戏数据是静态 JSON,但偶尔会被版本更新触发
 *重新部署;priority0.7 让详情页拿到中等权重(高于搜索页,低于列表页)。
 */
const DETAIL_ENTRY: Pick<Entry, 'changeFrequency' | 'priority'> = {
 changeFrequency: 'monthly',
 priority:0.7,
};

export default function sitemap(): MetadataRoute.Sitemap {
 const items: MetadataRoute.Sitemap = [];

 //1)核心路由
 for (const e of CORE_ROUTES) items.push(toSitemapItem(e));

 //2)武将详情(50)
 for (const g of loadGenerals()) {
 items.push(
 toSitemapItem({
 path: `/generals/${g.id}`,
 ...DETAIL_ENTRY,
 }),
 );
 }

 //3)战法详情(50)
 for (const s of loadSkills()) {
 items.push(
 toSitemapItem({
 path: `/skills/${s.id}`,
 ...DETAIL_ENTRY,
 }),
 );
 }

 //4)阵容详情(15)
 for (const l of loadLineups()) {
 items.push(
 toSitemapItem({
 path: `/lineups/${l.id}`,
 ...DETAIL_ENTRY,
 }),
 );
 }

 return items;
}
