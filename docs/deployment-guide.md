# 三战配将助手 ·部署指南

> 一份给非运维背景的开发者阅读的 Vercel部署手册。
>
>读完本文,**你只需要一个 GitHub账号 + 一个浏览器,就能把本站部署到公网**(默认域名 `sanzhan-peijiang.vercel.app`)。

##目录

1. [前置条件](#1-前置条件)
2. [注册 Vercel](#2-注册-vercel)
3. [导入项目](#3-导入项目)
4. [域名选择](#4-域名选择)
5. [环境变量](#5-环境变量)
6. [Region 选择](#6-region-选择)
7. [部署命令](#7-部署命令)
8. [部署后 smoke test清单](#8-部署后-smoke-test-清单)
9. [GitHub集成自动部署](#9-github-集成自动部署)
10. [部署到阿里云 /腾讯云的备选方案](#10-部署到阿里云--腾讯云的备选方案)
11. [备案说明](#11-备案说明)
12. [常见问题 FAQ](#12-常见问题-faq)

---

##1. 前置条件

| 项目 | 要求 |备注 |
| --- | --- | --- |
| Node.js | ≥20 | 本地预览需要,云端构建 Vercel 自动装 |
| pnpm | ≥8 | 本地预览需要,云端构建 Vercel 自动装 |
| Git |任意版本 |推送代码到 GitHub 用 |
| GitHub账号 |任意 |用来登录 Vercel +托管代码 |
| Vercel账号 | 免费注册 | Hobby计划免费,Hobby域名备案后无障碍 |

> ⚠️ **不需要**本地启动 dev 服务、不需要 `vercel deploy` 命令。Vercel 直接拉 GitHub 代码云端 build。

---

##2. 注册 Vercel

1.打开 <https://vercel.com/signup>
2. 选择 **"Continue with GitHub"**(强烈推荐,后续自动部署省事)
3.授权 Vercel访问你的 GitHub(只读即可,不需要写权限)
4. 注册完成后会自动跳转到 Vercel Dashboard

> 💡 如果你没有 GitHub账号,先去 <https://github.com/signup> 注册一个,然后再来注册 Vercel。

---

##3.导入项目

###3.1 通过 Vercel Dashboard导入(零命令行,推荐)

1. 进入 Vercel Dashboard → 点击 **"Add New..."** → **"Project"**
2. 在 **"Import Git Repository"** 下找到 `sanzhan-peijiang`仓库(也可以用 GitLab / Bitbucket)
3. 点击 **"Import"**
4. 在 **"Configure Project"**页面:
 - **Framework Preset**: Vercel 自动识别为 `Next.js`(已通过 `vercel.json`显式声明,无需修改)
 - **Root Directory**: 默认 `./`即可
 - **Build Command**:留空,使用 Vercel 默认 `next build`
 - **Install Command**:留空,使用 Vercel 默认 `pnpm install`(仓库根有 `pnpm-lock.yaml`)
 - **Output Directory**:留空,Next.js 默认 `.next`
 - **Environment Variables**: 本项目无敏感 env,留空即可(详见 [§5](#5-环境变量))
5. 点击 **"Deploy"** →等待约1-2 分钟 →部署成功

###3.2 通过 vercel CLI部署(高级用户)

```bash
#1. 安装 vercel CLI
npm i -g vercel

#2.登录(会弹出浏览器授权)
vercel login

#3. 在项目根目录跑部署
cd "E:\minimax project\三战配将"
vercel deploy --prod

#首次部署会问几个问题:
# - Set up and deploy? → Y
# - Which scope? →选你的账号
# - Link to existing project? → N(首次)
# - Project name? → sanzhan-peijiang(默认就好)
# - In which directory is your code located? → ./
# - Override settings? → N(用 vercel.json)
```

> ⚠️ **不要在没有显式 `--prod` 的情况下跑 `vercel deploy`**,否则会部署到预览环境,拿到的是 `<hash>-sanzhan-peijiang.vercel.app`临时域名。

---

##4.域名选择

部署完成后,你会得到一个 Vercel 自动分配的域名:**`sanzhan-peijiang.vercel.app`**(项目名 + `.vercel.app`)。

|域名类型 |适用场景 |备案要求 |
| --- | --- | --- |
| `*.vercel.app` 默认域名 | MVP / 内测 / 个人项目 | 不需要 |
| 自定义域名(如 `peijiang.cn`) |正式上线 /玩家社区 | 必须 ICP备案(详见 [§11](#11-备案说明)) |

###4.1改项目名 →改默认域名

进入 Vercel Project → **Settings** → **General** → 修改 **Project Name** →域名同步变更。

> ⚠️ 修改项目名后,**必须同步修改 `src/app/layout.tsx`、`src/app/sitemap.ts`、`src/app/robots.ts`三个文件中的 `BASE_URL` 占位**。本次任务占位为 `https://sanzhan-peijiang.vercel.app`。

###4.2绑定自定义域名

进入 Vercel Project → **Settings** → **Domains** → 输入你的域名 → Vercel 会告诉你怎么配 DNS。

| DNS 类型 | 示例记录 |适用 |
| --- | --- | --- |
| A | `76.76.21.21` |根域名 |
| CNAME | `cname.vercel-dns.com` | 子域名(`www`、`app`) |

DNS生效后,Vercel 自动签发免费 SSL证书(Let's Encrypt)。

---

##5. 环境变量

本项目当前 **无任何运行时环境变量**(零敏感数据,数据全在 `data/*.json`)。因此 Vercel Project Settings → Environment Variables留空即可。

###5.1未来扩展占位

如果后续接入了数据库 /第三方 API,**必须**走环境变量,不要硬编码:

|变量名(示例) |用途 |备注 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 数据库 URL | `NEXT_PUBLIC_` 前缀才会暴露给客户端 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥 | **禁止** `NEXT_PUBLIC_` 前缀 |
| `DATA_DIR` | 自定义数据目录 | 见 `src/lib/data/loader.ts` 的 env解析 |

> 💡 Vercel 把 env注入到 build 时和运行时,无需在 `vercel.json`显式声明。修改 env 后 **必须 Redeploy** 才生效。

---

##6. Region 选择

Vercel 默认部署到 `iad1`(美国华盛顿)Edge Region。

本项目面向中国大陆玩家,**强烈推荐改成 `hkg1`(香港)**:

- 中国大陆用户访问延迟 ≈30-80 ms(Vercel Anycast 通过 Cloudflare 香港 PoP)
- 海外用户回退到最近的 Edge Region

设置位置:Vercel Project → **Settings** → **General** → **Region** →选 `Hong Kong (hkg1)`。

> 💡 本项目 `vercel.json` 已硬编码 `"regions": ["hkg1"]`,导入时会自动应用,无需手动改。

---

##7.部署命令

###7.1 一键部署(零命令,推荐)

直接走 [§3.1](#31-通过-vercel-dashboard-导入零命令行推荐) 的 Dashboard流程,完成后 Vercel 自动给出部署 URL。

###7.2 CLI部署

```bash
#预览部署(不绑定生产域名,临时 hash域名)
vercel deploy

# 生产部署
vercel deploy --prod

# 回滚到上一个成功版本
vercel rollback
```

###7.3 Git push 自动部署

配好 GitHub集成后(详见 [§9](#9-github-集成自动部署)):

-推 `main` 分支 → 自动生产部署
-推其它分支 / PR → 自动预览部署(每个 PR独立 hash域名)

---

##8.部署后 smoke test清单

部署完成后,按这个清单逐项验证(用1 分钟):

###8.1必查 — SSR渲染

访问以下路径,确认返回 HTTP200 +渲染中文正常:

| URL |期望 |
| --- | --- |
| `/` | 首页 +9 个功能卡片 +50 /50 /15 数据规模展示 |
| `/generals` |列表 +50 位武将 +筛选条 |
| `/generals/liu_bei` |武将详情 +阵营 /品质 /4维属性 /战法 /兵书 |
| `/skills` |列表 +50 个战法 +6 类分布 |
| `/skills/po_jun` |战法详情 +发动概率 /目标数 /适用武将 |
| `/lineups` |列表 +15套阵容 + T0/T1/T2/T3评级 |
| `/lineups/<某 id>` |阵容详情 +3武将 +6战法 +雷达图入口 |
| `/sandbox` |配将器(客户端组件可交互) |
| `/battle` |模拟交战入口 |
| `/traits` | 特技库 +5 类分类 |
| `/patches` | 版本特性 + 当前赛季机制 + 时间线 |
| `/search` | 全站搜索(输入「赵云」能找到武将) |

###8.2必查 — SEO 元数据

| URL |期望 |
| --- | --- |
| `/sitemap.xml` | XML,根节点 `<urlset xmlns="...">`,包含 **9 个核心路由 +50 +50 +15 =115 个详情页 =124 个 URL** |
| `/robots.txt` |纯文本,包含 `User-Agent: *`、`Disallow: /api/`、`Sitemap: https://你的域名/sitemap.xml` |

###8.3必查 —性能 & SEO

打开浏览器 DevTools → Lighthouse →跑一次 Performance / SEO审计:

- Performance ≥85
- SEO ≥90
- Accessibility ≥90
- Best Practices ≥90

###8.4必查 —链接

- 首页9 个卡片全部能点开,无404
-内部链接(`/generals/<id>` 等)无循环

> ⚠️ 如果有任何一项失败,先去 Vercel Dashboard → **Deployments** → 查看构建日志。

---

##9. GitHub集成自动部署

部署成功的 **前提条件**:Vercel 能从 GitHub拉到代码。

###9.1第一次部署时

按 [§3.1](#31-通过-vercel-dashboard-导入零命令行推荐) 操作时,Vercel 会要求授权访问 GitHub仓库,自动配好 GitHub App。授权完成后:

- Vercel 在 `.github/workflows/` 下注入 `vercel.yml`(可选,本项目不需要)
-仓库 `Settings → Webhooks` 自动添加 Vercel 的 webhook

###9.2后续自动部署规则

默认行为:

| Git 操作 | Vercel 反应 |
| --- | --- |
| Push 到 `main` | 自动生产部署到 `*.vercel.app` |
| Push 到其它分支 | 自动预览部署(URL 含分支名) |
| Open / Update Pull Request | 自动预览部署,PR评论区插入 `View Deployment`按钮 |
| Merge PR |触发新的生产部署 |

###9.3 自定义部署规则

如果想把 `main`以外的分支也走生产部署,或者只在特定目录变更时触发:

进入 Vercel Project → **Settings** → **Git** → 配置 **Ignored Build Step**:

```bash
# 例:只当 src/ 或 data/变更时部署,docs/变更不触发
git diff HEAD^ HEAD --quiet -- src/ data/ package.json && exit0 || exit1
```

---

##10.部署到阿里云 /腾讯云的备选方案

如果出于合规 /备案 /性能考虑,不想用 Vercel,可选国内云:

###10.1阿里云 ESA / 函数计算

```bash
#1. 在项目根创建 Dockerfile(如果用 ESA)
# 或使用 Next.js 自带的 standalone 输出
#2.阿里云 ESA 控制台 → 创建边缘函数 → 上传构建产物
#3.绑定自定义域名(必须先 ICP备案)
```

###10.2腾讯云 Webify / SCF

```bash
#1. Webify 控制台 →导入 GitHub仓库
#2.框架预设选 Next.js
#3.触发自动部署
#4.绑定备案过的域名
```

###10.3 自建 Docker(独立服务器)

```bash
#1. 在项目根创建 Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE3000
CMD ["node", "server.js"]
```

> ⚠️ 本项目 `next.config.ts` 当前没开启 `output: 'standalone'`,需要先加上才能用 Docker 多阶段构建。

###10.4 Vercel vs 国内云对比

|维度 | Vercel |阿里云 /腾讯云 |
| --- | --- | --- |
| 一键部署 | ✅ | ⚠️ 需要配 CDN / 函数计算 |
|域名备案 | ❌ 不需要(vercel.app 子域) | ✅ 必须 |
| 国内访问速度 | ✅(Anycast + Cloudflare) | ✅(同等优) |
| 免费额度 | Hobby计划:100 GB流量 / 月 | 各家不同,通常按量付费 |
| Preview Deployment | ✅自动化 | ❌需手动配 |
| 国内合规 | ⚠️灰色地带(数据出境) | ✅ 完全合规 |

> 💡 **MVP阶段推荐 Vercel**。等正式上线 + 有国内玩家大规模访问时,再考虑迁移到阿里云 ESA + ICP备案域名。

---

##11.备案说明

###11.1 Vercel 默认域名(`.vercel.app`)

**不需要** ICP备案 —— 这是 Vercel 公司在美国注册的子域名,不受中国工信部备案管辖。

但有2 个潜在问题:
1. **国内浏览器偶发警告**(Chrome / Edge 会显示"该网站使用了境外域名")—— 仅是体验问题,不影响访问
2. **微信 /微博分享可能受限** —— 部分平台对未备案域名做限制

###11.2 自定义域名(中国大陆 `.cn` / `.com.cn` 等)

**必须** ICP备案 —— 大致流程:

1.购买中国大陆境内的域名(阿里云 /腾讯云 /华为云)
2.域名实名认证(3 个工作日)
3. 通过主机 ISP(阿里云 /腾讯云)提交 ICP备案(7-20 个工作日)
4.公安备案(备案号下来后,30 天内)

###11.3备案对部署的影响

备案完成后,在 Vercel 自定义域名配 DNS:

-域名 A记录 → Vercel提供的 IP(如 `76.76.21.21`)
- Vercel 自动签发 SSL证书

> ⚠️备案期间,可以用 `sanzhan-peijiang.vercel.app`临时域名提供访问,完全合规。

---

##12.常见问题 FAQ

### Q1:部署后访问报404

**A:** 检查 `vercel.json` 的 `cleanUrls` 是否生效,以及 Next.js路由是否真的有对应文件。本项目所有路由都已用 App Router 文件,不会404。

### Q2: 构建失败:`Cannot find module 'xxx'`

**A:** 检查 `pnpm-lock.yaml` 是否提交,以及 `package.json` 是否完整。本项目已锁定依赖,正常情况不会失败。

### Q3: 数据加载失败:`data/*.json`找不到

**A:** `src/lib/data/loader.ts` 默认走 `process.cwd() + 'data'`。Vercel部署时 cwd 是项目根,会自动找到。如果自定义了 root directory,**必须**设置环境变量 `DATA_DIR`。

### Q4: 中文显示成方框 /乱码

**A:** 检查 `src/app/globals.css` 的 `--font-sans` 是否包含 `Noto Sans CJK SC` / `PingFang SC`。本项目已配置,正常情况不会出问题。

### Q5: sitemap.xml 没有生成

**A:**确认 `src/app/sitemap.ts`存在且 export default 一个函数。Vercel build 后应该自动产出 `/sitemap.xml`。

### Q6: robots.txt 没有生成

**A:** 同 sitemap.ts。确认 `src/app/robots.ts`存在且 export default 一个函数。

### Q7: 如何回滚

**A:** Vercel Dashboard → Deployments →找到上一个成功版本 → 点击菜单 → "Promote to Production"。

### Q8:能否跳过 GitHub,直接拖代码部署?

**A:** Vercel Hobby计划只支持 Git部署。Pro计划支持直接拖 `.tar.gz`。MVP阶段直接走 GitHub即可。

### Q9:部署后打开 DevTools看到 favicon404?

**A:** 本项目 `src/app/favicon.ico` 已存在,如仍404,删除 Vercel缓存后重新部署。

### Q10: Lighthouse性能分低?

**A:** Next.js16 + Turbopack 默认性能较好。如果分数低:
-启用 Vercel Analytics
- 检查图片是否用了 `next/image`
-启用 Vercel Speed Insights

---

## 联系 /反馈

- 项目仓库:见 README.md
-部署问题:查 Vercel官方文档 <https://vercel.com/docs>
- ICP备案问题:联系你的域名注册商客服

> 最后更新:2026-06-10 · 由 s5-deploy-vercel任务产出
