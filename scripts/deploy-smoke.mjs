#!/usr/bin/env node
/**
 * scripts/deploy-smoke.mjs — 远程部署冒烟验证脚本
 *
 * 用途:对线上 https://sanzhan-peijiang.vercel.app 跑一次端到端的可达性 / SEO /
 *     异常 case 验证,覆盖 docs/post-deploy-checklist.md 的阶段 1-7 可远程跑的部分。
 *
 * 用法:
 *   node scripts/deploy-smoke.mjs [--domain <url>] [--out-dir <path>] [--concurrency <n>]
 *
 * 默认值:
 *   --domain      https://sanzhan-peijiang.vercel.app
 *   --out-dir     ./deploy-smoke-results/<ISO timestamp>
 *   --concurrency 8
 *
 * 退出码:
 *   0  — 脚本完整跑完(无论结果好坏,数据已采集)
 *   1  — 脚本自身异常(参数错 / 读 JSON 失败 / 网络层 SDK 异常)
 *
 * 设计:
 *   - 用 Node 内置 fetch,curl 不一致的情况下也能跑;
 *   - 把 11 个主路由 + 115 详情页 + 4 异常路由 + 大小写 / 尾斜杠 case 的结果
 *     全部输出到 out-dir 下的 .jsonl + .csv + .md 三份报告;
 *   - 输出三列表(url × http_code × 用时 ms);
 *   - DNS 解析结果会一并记录(若 host 解析到非 Vercel IP,立即提示);
 *   - 如果 host 不可达,脚本仍会跑完采集,把"全部 timeout"的事实写入报告。
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import dns from 'node:dns/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');

// ---------------------------------------------------------------------------
// 参数解析
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    domain: 'https://sanzhan-peijiang.vercel.app',
    outDir: null,
    concurrency: 8,
    timeoutMs: 15000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--domain') out.domain = argv[++i];
    else if (a === '--out-dir') out.outDir = argv[++i];
    else if (a === '--concurrency') out.concurrency = parseInt(argv[++i], 10);
    else if (a === '--timeout-ms') out.timeoutMs = parseInt(argv[++i], 10);
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node scripts/deploy-smoke.mjs [--domain <url>] [--out-dir <path>] [--concurrency <n>] [--timeout-ms <ms>]');
      process.exit(0);
    }
  }
  if (!out.outDir) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    out.outDir = join(PROJECT_ROOT, 'deploy-smoke-results', stamp);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 数据加载 — 从 data/*.json 抽 id
// ---------------------------------------------------------------------------

async function loadIds(fileName) {
  const filePath = join(DATA_DIR, fileName);
  if (!existsSync(filePath)) return [];
  const raw = await readFile(filePath, 'utf-8');
  const arr = JSON.parse(raw);
  return arr.map((d) => d.id).filter(Boolean);
}

// ---------------------------------------------------------------------------
// 单 URL 探测 — 仅 HEAD 以减少流量
// ---------------------------------------------------------------------------

async function probeOne(url, { timeoutMs = 30000 } = {}) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET', // 部分 Vercel 静态页 HEAD 返回 405; 用 GET 取状态码,内容丢弃
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'deploy-smoke/1.0 (+https://sanzhan-peijiang.vercel.app)' },
    });
    // 丢弃 body
    try { await res.arrayBuffer(); } catch { /* ignore */ }
    const ms = Math.round(performance.now() - start);
    return {
      url,
      status: res.status,
      ok: res.ok,
      redirected: res.status >= 300 && res.status < 400,
      location: res.headers.get('location'),
      contentType: res.headers.get('content-type'),
      ms,
      error: null,
    };
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    return {
      url,
      status: 0,
      ok: false,
      redirected: false,
      location: null,
      contentType: null,
      ms,
      error: e.name === 'AbortError' ? `timeout(${timeoutMs}ms)` : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

// 简易并发池
async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function pump() {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  }
  const pumps = Array.from({ length: Math.min(concurrency, items.length) }, pump);
  await Promise.all(pumps);
  return results;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.domain.replace(/\/$/, '');

  console.log(`[deploy-smoke] domain: ${base}`);
  console.log(`[deploy-smoke] outDir : ${args.outDir}`);
  await mkdir(args.outDir, { recursive: true });

  // ---- 1) DNS 解析探测
  const host = new URL(base).hostname;
  let dnsInfo = { host, addresses: [], error: null };
  try {
    const a = await dns.resolve4(host).catch((e) => { throw e; });
    dnsInfo.addresses = a;
  } catch (e) {
    dnsInfo.error = e.message;
  }
  try {
    const aaaa = await dns.resolve6(host);
    dnsInfo.addresses.push(...aaaa.map((x) => `v6:${x}`));
  } catch { /* no AAAA, fine */ }

  console.log(`[deploy-smoke] DNS ${host} -> ${JSON.stringify(dnsInfo.addresses)} ${dnsInfo.error ?? ''}`);

  // ---- 2) 主路由 + sitemap/robots = 11
  const coreRoutes = [
    '/',
    '/generals',
    '/skills',
    '/lineups',
    '/sandbox',
    '/battle',
    '/traits',
    '/patches',
    '/search',
    '/sitemap.xml',
    '/robots.txt',
  ];
  const coreUrls = coreRoutes.map((p) => `${base}${p}`);

  // ---- 3) 详情页 = 50 + 50 + 15 = 115
  const generalsIds = await loadIds('generals.json');
  const skillsIds = await loadIds('skills.json');
  const lineupsIds = await loadIds('lineups.json');
  console.log(`[deploy-smoke] ids: generals=${generalsIds.length} skills=${skillsIds.length} lineups=${lineupsIds.length}`);

  const detailUrls = [
    ...generalsIds.map((id) => `${base}/generals/${id}`),
    ...skillsIds.map((id) => `${base}/skills/${id}`),
    ...lineupsIds.map((id) => `${base}/lineups/${id}`),
  ];

  // ---- 4) 异常 case = 4 个不存在 id + 大小写 / 尾斜杠
  const anomalyUrls = [
    `${base}/generals/non_exist_id_xxx`,
    `${base}/skills/non_exist_id_xxx`,
    `${base}/lineups/non_exist_id_xxx`,
    `${base}/traits/non_exist_id_xxx`,
    `${base}/Generals`,
    `${base}/generals/`,
    `${base}/skills/`,
  ];

  // ---- 5) 慢网络模拟:留作参数; 这次默认快速,客户端不模拟
  const allUrls = [...coreUrls, ...detailUrls, ...anomalyUrls];
  console.log(`[deploy-smoke] total URLs to probe: ${allUrls.length} (core=${coreUrls.length} detail=${detailUrls.length} anomaly=${anomalyUrls.length})`);

  const probeStart = performance.now();
  const results = await runPool(allUrls, (u) => probeOne(u, { timeoutMs: args.timeoutMs }), args.concurrency);
  const probeMs = Math.round(performance.now() - probeStart);
  console.log(`[deploy-smoke] probed ${results.length} URLs in ${probeMs}ms`);

  // ---- 6) 取首页 HTML 抓 <title> + viewport meta
  let homeHtml = null;
  try {
    const res = await fetch(`${base}/`, { headers: { 'user-agent': 'deploy-smoke/1.0' } });
    homeHtml = await res.text();
  } catch (e) {
    homeHtml = `<error>${e.message}</error>`;
  }
  const homeTitle = (() => {
    const m = homeHtml.match(/<title>([\s\S]*?)<\/title>/i);
    return m ? m[1].trim() : null;
  })();
  const homeViewport = (() => {
    const m = homeHtml.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
    return m ? m[0] : null;
  })();
  const homeOgTitle = (() => {
    const m = homeHtml.match(/<meta[^>]*property=["']og:title["'][^>]*>/i);
    return m ? m[0] : null;
  })();
  const homeOgDesc = (() => {
    const m = homeHtml.match(/<meta[^>]*property=["']og:description["'][^>]*>/i);
    return m ? m[0] : null;
  })();
  const homeMetaDesc = (() => {
    const m = homeHtml.match(/<meta[^>]*name=["']description["'][^>]*>/i);
    return m ? m[0] : null;
  })();

  // ---- 7) sitemap.xml + robots.txt 抓取
  let sitemapXml = null;
  let robotsTxt = null;
  try {
    const r = await fetch(`${base}/sitemap.xml`);
    sitemapXml = await r.text();
  } catch (e) {
    sitemapXml = `<error>${e.message}</error>`;
  }
  try {
    const r = await fetch(`${base}/robots.txt`);
    robotsTxt = await r.text();
  } catch (e) {
    robotsTxt = `<error>${e.message}</error>`;
  }
  const sitemapUrlCount = (() => {
    if (!sitemapXml || sitemapXml.startsWith('<')) return 0;
    const matches = sitemapXml.match(/<url>/g);
    return matches ? matches.length : 0;
  })();
  const robotsHasSitemap = robotsTxt ? /Sitemap:\s*\S+/i.test(robotsTxt) : false;

  // ---- 8) 写 .jsonl
  const jsonl = results.map((r) => JSON.stringify(r)).join('\n') + '\n';
  await writeFile(join(args.outDir, 'results.jsonl'), jsonl);

  // ---- 9) 写 .csv (url × http_code × ms × error)
  const csv = [
    'url,http_code,ms,redirected,location,content_type,error',
    ...results.map((r) =>
      [
        JSON.stringify(r.url),
        r.status,
        r.ms,
        r.redirected ? 1 : 0,
        JSON.stringify(r.location ?? ''),
        JSON.stringify(r.contentType ?? ''),
        JSON.stringify(r.error ?? ''),
      ].join(','),
    ),
  ].join('\n');
  await writeFile(join(args.outDir, 'results.csv'), csv);

  // ---- 10) 写 .md 摘要
  const summary = summarize({
    base,
    coreUrls,
    detailUrls,
    anomalyUrls,
    results,
    dnsInfo,
    homeTitle,
    homeViewport,
    homeOgTitle,
    homeOgDesc,
    homeMetaDesc,
    sitemapUrlCount,
    sitemapXml,
    robotsTxt,
    robotsHasSitemap,
    probeMs,
    outDir: args.outDir,
  });
  await writeFile(join(args.outDir, 'summary.md'), summary);

  console.log(`[deploy-smoke] DONE — wrote results.jsonl / results.csv / summary.md to ${args.outDir}`);
}

// ---------------------------------------------------------------------------
// Markdown 摘要生成
// ---------------------------------------------------------------------------

function summarize(ctx) {
  const { results } = ctx;
  const counts = {
    total: results.length,
    ok200: results.filter((r) => r.status === 200).length,
    redirect3xx: results.filter((r) => r.status >= 300 && r.status < 400).length,
    notFound404: results.filter((r) => r.status === 404).length,
    server5xx: results.filter((r) => r.status >= 500 && r.status < 600).length,
    networkFail: results.filter((r) => r.status === 0).length,
  };
  const avgMs = results.length ? Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length) : 0;

  const lines = [];
  lines.push(`# 部署冒烟结果摘要 — ${ctx.base}`);
  lines.push('');
  lines.push(`- 生成时间:${new Date().toISOString()}`);
  lines.push(`- 探测 URL 总数:${counts.total}`);
  lines.push(`- 用时:${ctx.probeMs}ms`);
  lines.push(`- 平均响应:${avgMs}ms`);
  lines.push('');
  lines.push('## DNS 解析');
  lines.push('');
  if (ctx.dnsInfo.addresses.length) {
    lines.push(`- ${ctx.dnsInfo.host} → ${ctx.dnsInfo.addresses.join(', ')}`);
  } else {
    lines.push(`- ⚠️ DNS 解析失败:${ctx.dnsInfo.error ?? 'unknown'}`);
  }
  lines.push('');
  lines.push('## HTTP 状态聚合');
  lines.push('');
  lines.push('| 状态 | 数量 | 占比 |');
  lines.push('|---|---:|---:|');
  lines.push(`| 200 OK | ${counts.ok200} | ${pct(counts.ok200, counts.total)} |`);
  lines.push(`| 3xx 重定向 | ${counts.redirect3xx} | ${pct(counts.redirect3xx, counts.total)} |`);
  lines.push(`| 404 | ${counts.notFound404} | ${pct(counts.notFound404, counts.total)} |`);
  lines.push(`| 5xx | ${counts.server5xx} | ${pct(counts.server5xx, counts.total)} |`);
  lines.push(`| 网络失败/超时 | ${counts.networkFail} | ${pct(counts.networkFail, counts.total)} |`);
  lines.push('');
  lines.push('## 主路由探测结果');
  lines.push('');
  lines.push('| URL | HTTP | 用时 (ms) |');
  lines.push('|---|---:|---:|');
  for (const r of results.filter((r) => ctx.coreUrls.includes(r.url))) {
    lines.push(`| \`${r.url}\` | ${r.status} | ${r.ms} |`);
  }
  lines.push('');
  lines.push('## 详情页(115 个)结果摘要');
  lines.push('');
  const detailFail = results.filter((r) => ctx.detailUrls.includes(r.url) && r.status !== 200);
  if (detailFail.length === 0) {
    lines.push(`- 全部 ${ctx.detailUrls.length} 个详情页 200 OK。`);
  } else {
    lines.push(`- 共 ${ctx.detailUrls.length} 个详情页,失败 ${detailFail.length} 个(< 1% = ${Math.round((detailFail.length / ctx.detailUrls.length) * 1000) / 10}%):`);
    lines.push('');
    lines.push('| URL | HTTP | 用时 |');
    lines.push('|---|---:|---:|');
    for (const r of detailFail) lines.push(`| \`${r.url}\` | ${r.status} | ${r.ms} |`);
  }
  lines.push('');
  lines.push('## 异常 case');
  lines.push('');
  lines.push('| URL | 期望 | 实际 HTTP | 用时 |');
  lines.push('|---|---|---:|---:|');
  const expected = {
    '/generals/non_exist_id_xxx': '404',
    '/skills/non_exist_id_xxx': '404',
    '/lineups/non_exist_id_xxx': '404',
    '/traits/non_exist_id_xxx': '404',
    '/Generals': '404',
    '/generals/': '200 或 308',
    '/skills/': '200 或 308',
  };
  for (const u of ctx.anomalyUrls) {
    const r = results.find((x) => x.url === u);
    if (!r) continue;
    const expect = expected[u.replace(ctx.base, '')] ?? '?';
    lines.push(`| \`${u}\` | ${expect} | ${r.status} | ${r.ms} |`);
  }
  lines.push('');
  lines.push('## SEO');
  lines.push('');
  lines.push(`- sitemap.xml <url> 数量:**${ctx.sitemapUrlCount}**(预期 124)`);
  lines.push(`- robots.txt 含 Sitemap 行:**${ctx.robotsHasSitemap ? '✅' : '❌'}**`);
  lines.push(`- 首页 <title>:**${ctx.homeTitle ?? '(空)'}'**`);
  lines.push(`- 首页 <meta name="description">:**${ctx.homeMetaDesc ? '✅' : '❌'}**`);
  lines.push(`- 首页 viewport meta:**${ctx.homeViewport ? '✅' : '❌'}**`);
  lines.push(`- 首页 og:title:**${ctx.homeOgTitle ? '✅' : '❌'}**`);
  lines.push(`- 首页 og:description:**${ctx.homeOgDesc ? '✅' : '❌'}**`);
  if (ctx.sitemapXml && !ctx.sitemapXml.startsWith('<')) {
    lines.push('');
    lines.push('### sitemap.xml 全文(前 2 KB)');
    lines.push('');
    lines.push('```xml');
    lines.push(ctx.sitemapXml.slice(0, 2048));
    lines.push('```');
  }
  if (ctx.robotsTxt && !ctx.robotsTxt.startsWith('<')) {
    lines.push('');
    lines.push('### robots.txt 全文');
    lines.push('');
    lines.push('```');
    lines.push(ctx.robotsTxt);
    lines.push('```');
  }
  lines.push('');
  return lines.join('\n');
}

function pct(n, d) {
  if (!d) return '0%';
  return `${(n / d * 100).toFixed(1)}%`;
}

main().catch((e) => {
  console.error('[deploy-smoke] FATAL:', e);
  process.exit(1);
});