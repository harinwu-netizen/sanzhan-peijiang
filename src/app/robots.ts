/**
 * src/app/robots.ts — Next.js App Router dynamic robots.txt
 *
 * Next.js13.3+ 内置支持 src/app/robots.ts,build 时自动产出 /robots.txt。
 *
 *策略:
 * -允许所有主流爬虫
 * -禁止爬取 /api/(本项目当前无 api路由,但留口子防止未来误暴露内部端点)
 * -指向 sitemap.xml 帮助爬虫发现全部页面
 *
 * ⚠️ 占位 baseUrl 与 sitemap.ts 同源,部署到正式域名后必须统一改。
 */
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://sanzhan-peijiang.vercel.app';

export default function robots(): MetadataRoute.Robots {
 return {
 rules: [
 {
 userAgent: '*',
 allow: '/',
 disallow: ['/api/'],
 },
 //主流搜索引擎显式声明(可选,但利于 SEO工具识别)
 { userAgent: 'Googlebot', allow: '/', disallow: ['/api/'] },
 { userAgent: 'Bingbot', allow: '/', disallow: ['/api/'] },
 { userAgent: 'Baiduspider', allow: '/', disallow: ['/api/'] },
 ],
 sitemap: `${BASE_URL}/sitemap.xml`,
 host: BASE_URL,
 };
}
