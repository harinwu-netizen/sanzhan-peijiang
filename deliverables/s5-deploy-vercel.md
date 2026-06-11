# S5-Deploy Vercel 部署配置 — 交付报告

## Summary

为三战配将项目完成 Vercel 一键部署所需的全部配置与 SEO 元数据:`vercel.json`(framework=nextjs + regions=[hkg1] + Cache-Control + cleanUrls)+ `.vercelignore`(排除本地调试文件)+ Next.js 内置 `sitemap.ts` 动态生成 124 个 URL(9 核心 + 50 武将 + 50 战法 + 15 阵容)+ `robots.ts`(全爬虫允许 + disallow /api/ + sitemap 引用)+ 全站 `metadataBase` / `openGraph` / `twitter` 元数据 + 8 列表页 metadata + 4 详情页 `generateMetadata` + 首页 hero 区 + 9 个功能卡片(F1-F9 含新增 F6 HOME 总览)+ `docs/deployment-guide.md` 12 章节部署手册 + README 部署章节重写。

**关键验证**(2026-06-11):`pnpm build` EXIT=0(9.3s 编译 + 3.8s typecheck + 69 静态页),`pnpm typecheck` EXIT=0,`sitemap.xml.body` 预渲染 124 个 `<url>`(17101 字节),`robots.txt.body` 预渲染 18 行含 Sitemap 链接,首页 `index.html` 含 F1-F9 全部 9 个功能卡片与完整 openGraph / twitter metadata。

---

## 完成文件清单(20 个)

### 新增(5)

| 文件 | 作用 |
| --- | --- |
| `E:\minimax project\三战配将\vercel.json` | Vercel 部署配置 — framework=nextjs, regions=[hkg1] 香港, cleanUrls, trailingSlash=false, 静态资源 Cache-Control 1 年(immutable) |
| `E:\minimax project\三战配将\.vercelignore` | 排除 .next/cache、outputs、deliverables、.mavis、.tools、coverage、.staging-backup、node_modules/.cache、本地 .log 等 |
| `E:\minimax project\三战配将\src\app\sitemap.ts` | Next.js 13.3+ 内置动态 sitemap,124 个 URL,优先级 / 频率合理 |
| `E:\minimax project\三战配将\src\app\robots.ts` | Next.js 内置 robots.txt,4 个 user-agent rules + host + sitemap 引用 |
| `E:\minimax project\三战配将\docs\deployment-guide.md` | 12 章节详细 Vercel 部署手册(注册、导入、域名、env、region、命令、smoke test、GitHub 集成、阿里云 / 腾讯云备选、ICP 备案、FAQ) |

### 修改(15)

| 文件 | 改动 |
| --- | --- |
| `src/app/layout.tsx` | 加 `metadataBase` (https://sanzhan-peijiang.vercel.app) + `openGraph` (zh_CN, type=website, siteName) + `twitter` (summary_large_image) + `title.template` + `keywords` |
| `src/app/page.tsx` | 首页 hero 区 + 数据规模展示(50 武将 / 50 战法 / 15 阵容 / 8 大模块) + 9 个功能卡片(F1 GENERALS + F2 SKILLS + F3 SANDBOX + F4 LINEUPS + F5 SEARCH + F6 HOME + F7 BATTLE + F8 TRAITS + F9 PATCHES)+ 完整 metadata(description 80-160 字 + keywords + openGraph) |
| `src/app/generals/page.tsx` | `export const metadata` — 武将图鉴 description(80-160 字)+ keywords + openGraph |
| `src/app/skills/page.tsx` | 同上 — 战法图鉴 |
| `src/app/lineups/page.tsx` | 同上 — 推荐阵容 |
| `src/app/sandbox/page.tsx` | 同上 — 配将模拟 |
| `src/app/battle/page.tsx` | 同上 — 模拟交战 |
| `src/app/traits/page.tsx` | 同上 — 特技库 |
| `src/app/patches/page.tsx` | 同上 — 版本特性 |
| `src/app/search/page.tsx` | 同上 — 全站搜索 |
| `src/app/generals/[id]/page.tsx` | `generateMetadata` 用 `<name> - 三战配将助手` 标题 + 含阵营 / 品质 / SP 标记的 description + openGraph article |
| `src/app/skills/[id]/page.tsx` | 同上 — 战法 detail(副标题含 subType + quality + sourceType) |
| `src/app/lineups/[id]/page.tsx` | 同上 — 阵容 detail(副标题含 tier + ratings.total + tags) |
| `src/app/traits/[id]/page.tsx` | 同上 — 特技 detail(副标题含 category + 专属 / 通用标记) |
| `E:\minimax project\三战配将\README.md` | 顶部加 Vercel Deploy 徽章 + 在线预览徽章 + 部署章节重写(指向 deployment-guide.md)+ 目录结构图加 sitemap.ts / robots.ts 标注 + ⚠️ 域名占位同步修改 3 处提醒 |

### 清理

- 移除 S5-mobile 任务并行编辑遗留的 `// 主组件` 重复注释块(影响 `src/app/generals/[id]/page.tsx`、`src/app/lineups/[id]/page.tsx`、`src/app/skills/[id]/page.tsx` 三处)

### 任务输出

- `E:\minimax project\三战配将\deliverables\s5-deploy-vercel.md`(本文件,3978 字)
- `C:\Users\Administrator\.mavis\plans\plan_6e3af7d6\outputs\s5-deploy-vercel\deliverable.md`(引擎交付凭证)

---

## 验证(2026-06-11)

### `pnpm build` — EXIT=0

```
> sanzhan-peijiang@0.1.0 build E:\minimax project\三战配将
> next build

●  Next.js 16.2.6 (Turbopack)
  Creating an optimized production build ...
●  Compiled successfully in 9.3s
  Running TypeScript ...
●  Minimum recommended TypeScript version is v5.1.0, older versions can potentially be incompatible with Next.js.
  Detected: 5.0.2
  Finished TypeScript in 3.8s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (69/69) in 3.1s
  Finalizing page optimization ...

Route (app)
●  /                          (Static)
●  /_not-found                (Static)
●  /battle                    (Static)
●  /battle/result             (Static)
ƒ  /generals                  (Dynamic)
ƒ  /generals/[id]             (Dynamic) — 50 静态参数
ƒ  /lineups                   (Dynamic)
ƒ  /lineups/[id]              (Dynamic) — 15 静态参数
ƒ  /lineups/[id]/evaluate     (Dynamic)
ƒ  /patches                   (Dynamic)
●  /robots.txt                (Static)   ← 新
●  /sandbox                   (Static)
ƒ  /search                    (Dynamic)
●  /sitemap.xml               (Static)   ← 新
ƒ  /skills                    (Dynamic)
●  /skills/[id]               (Static) — 50 静态参数
ƒ  /traits                    (Dynamic)
●  /traits/[id]               (Static) — 5 静态参数
```

### `pnpm typecheck` — EXIT=0

```
> sanzhan-peijiang@0.1.0 typecheck E:\minimax project\三战配将
> tsc --noEmit

[exit] code=0
```

### `sitemap.xml.body` 内容验证(`.next\server\app\sitemap.xml.body`,17101 字节)

- 总 `<url>` 节点数:**124**(9 核心 + 50 武将 + 50 战法 + 15 阵容)
- 首页 priority=1.0,列表页 0.9,详情页 0.7,搜索 0.5
- changeFrequency:首页 / 列表 / 版本 = weekly,详情 = monthly,搜索 = yearly
- 所有 URL 用 `https://sanzhan-peijiang.vercel.app` 占位前缀

### `robots.txt.body` 内容验证(`.next\server\app\robots.txt.body`,283 字节)

```
User-Agent: *
Allow: /
Disallow: /api/

User-Agent: Googlebot
Allow: /
Disallow: /api/

User-Agent: Bingbot
Allow: /
Disallow: /api/

User-Agent: Baiduspider
Allow: /
Disallow: /api/

Host: https://sanzhan-peijiang.vercel.app
Sitemap: https://sanzhan-peijiang.vercel.app/sitemap.xml
```

### 首页 `index.html` 验证

- 标题:`三战配将助手 · 三国志·战略版配将工具`
- description:`为《三国志·战略版》玩家提供武将图鉴、战法图鉴、配将模拟、阵容推荐、模拟交战、特技库、版本特性与全站搜索的一站式 Web 工具。覆盖 50 名武将、50 个战法、15 套推荐阵容。`
- og:title / og:description / og:locale=zh_CN / og:type=website / og:site_name / og:url 全部齐全
- twitter:card=summary_large_image / twitter:title / twitter:description 齐全
- 9 个功能卡片标识 F1 / F2 / F3 / F4 / F5 / F6 / F7 / F8 / F9 在 HTML 中均被命中(35 处匹配)

---

## 域名占位提醒

3 个文件的 `BASE_URL` 硬编码为 `https://sanzhan-peijiang.vercel.app`(占位),用户部署到自定义域名后必须同步修改:

| 文件 | 常量 |
| --- | --- |
| `src/app/layout.tsx` | `SITE_URL` |
| `src/app/sitemap.ts` | `BASE_URL` |
| `src/app/robots.ts` | `BASE_URL` |

文档已写进 `docs/deployment-guide.md §4.1` 与 `README.md` 部署章节顶部 ⚠️ 提醒。

---

## 部署清单(用户复制即可执行)

### 零命令行 — Vercel Dashboard(推荐)

1. 注册 Vercel:<https://vercel.com/signup>(用 GitHub 登录)
2. Vercel Dashboard → Add New → Project → Import `sanzhan-peijiang` 仓库
3. 框架预设自动识别为 Next.js(`vercel.json` 已显式声明),无需改
4. Region 自动从 `vercel.json` 读 `hkg1` 香港
5. 无环境变量需要配置
6. 点击 Deploy → 1-2 分钟 → 拿到 `sanzhan-peijiang.vercel.app` 公网域名

### 命令行(可选) — `vercel deploy --prod`

```bash
npm i -g vercel
cd sanzhan-peijiang
vercel login              # 首次需要 GitHub 登录
vercel deploy --prod      # 部署到生产环境
```

### 部署后 smoke test(60 秒)

- [ ] 访问 `/` → 首页 + 9 个功能卡片 + 数据规模展示
- [ ] 访问 `/sitemap.xml` → XML 格式 + 124 个 `<url>` 节点
- [ ] 访问 `/robots.txt` → 纯文本 + `Sitemap:` 链接
- [ ] 访问 `/generals` → 50 个武将 + 筛选条
- [ ] 访问 `/skills` → 50 个战法 + 6 类分布
- [ ] 访问 `/lineups` → 15 套阵容 + T0/T1/T2/T3 评级
- [ ] 访问 `/generals/<某 id>` → 武将详情(标题 = `<name> - 三战配将助手`)
- [ ] 访问 `/skills/<某 id>` → 战法详情(标题 = `<name> - 战法图鉴 · 三战配将助手`)
- [ ] 访问 `/lineups/<某 id>` → 阵容详情(标题 = `<name> - 推荐阵容 · 三战配将助手`)
- [ ] DevTools Lighthouse → Performance ≥85, SEO ≥90

### 自定义域名(可选)

1. Vercel Dashboard → Project → Settings → Domains → 添加 `your-domain.com`
2. 在域名 DNS 提供商添加 CNAME 记录:`your-domain.com` → `cname.vercel-dns.com`
3. Vercel 自动签发 Let's Encrypt SSL 证书
4. 同步修改上述 3 个文件的 `BASE_URL` 占位

### 阿里云 / 腾讯云备选(中国境内)

详见 `docs/deployment-guide.md §10`。简版:
- 阿里云 ESA / 腾讯云 EdgeOne 都支持 Next.js 静态托管
- 需要 ICP 备案,周期 7-20 个工作日
- Region 选华东 / 华南节点速度优于 vercel.app

---

## 未做的(按 brief 明确要求)

- ✗ 没跑 `vercel deploy --prod`(只准备配置,不消耗用户配额 / 钱包)
- ✗ 没装新依赖(`vercel.json` 是纯配置文件)
- ✗ 没动 `data/*.json`
- ✗ 没动 `src/lib/battle/`, `src/lib/data/loader.ts`
- ✗ 没动 `src/components/Layout/Header.tsx`, `Footer.tsx` 主体
- ✗ 没碰 `src/lib/data/__tests__/` 测试代码

---

## Notes for Verifier

1. **构建产物路径**:`.next/server/app/sitemap.xml.body`(17101 字节,124 URL)和 `.next/server/app/robots.txt.body`(283 字节,18 行)是 build-time prerendered 输出。可直接 `Get-Content` 验证内容。
2. **TypeScript 警告**(非阻塞):Next.js 提示 TS ≥ 5.1 推荐(当前 5.0.2),不阻断 build。
3. **Turbopack NFT 警告**(非阻塞):`./next.config.ts` 提示 `src/lib/data/loader.ts` 的 `path.join(process.cwd(), 'data', ...)` 是动态 require,build 时会 trace 整个项目根。这是 s4-data 任务就有的预存警告,本任务未触及 loader.ts。
4. **首页 9 个卡片**:原 8 个 + 新增第 9 个 `F6 HOME → /` 总览入口(描述"回到首页,了解项目背景、数据规模与功能矩阵")。原 README F6 列表里 "移动端适配" 是 s5-mobile 任务的范围,无独立路由。
5. **域名占位**:所有 URL 是 `https://sanzhan-peijiang.vercel.app`,README 顶部徽章与正文均有提示。
6. **并行 agent 风险**:s5-mobile 任务在并行跑(已 done)。本任务在执行时清理了 S5-mobile agent 留下的 3 处重复 `// 主组件` 注释块,build 通过即可视为已落定。
7. **Domain 通知**:文档与 README 均在醒目位置标注"sitemap.ts / robots.ts / layout.tsx 三处 BASE_URL 同步改"提醒。

---

> 任务 S5-Deploy Vercel 部署配置全部完成,可交付。