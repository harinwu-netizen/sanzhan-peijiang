# 三战配将助手(暂定)

> 为《三国志·战略版》玩家提供的武将查询、战法查询、配将模拟、阵容推荐 Web工具。

![开发中](https://img.shields.io/badge/status-MVP%20开发中-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8-orange)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fsanzhan-peijiang&project-name=sanzhan-peijiang&repository-name=sanzhan-peijiang)
![在线预览](https://img.shields.io/badge/在线预览-sanzhan--peijiang.vercel.app-blue)

##截图

> 🚧 **开发中** — MVP阶段暂未提供截图,待 F1/F2/F3/F4完成后补上。

| 首页 |武将图鉴 |配将模拟器 |
| --- | --- | --- |
| (开发中) | (开发中) | (开发中) |

## 功能列表

|编号 | 功能 |路由 |状态 |
| --- | --- | --- | --- |
| **F1** |武将图鉴 | [`/generals`](/generals) | P0 开发中 |
| **F2** |战法图鉴 | [`/skills`](/skills) | P0 开发中 |
| **F3** |配将模拟器 | [`/sandbox`](/sandbox) | P0 开发中 |
| **F4** | 推荐阵容库 | [`/lineups`](/lineups) | P0 开发中 |
| **F5** | 全站搜索 | [`/search`](/search) | P0 开发中 |
| **F6** |移动端适配 | (全站响应式) | P0 开发中 |
| **F7** |模拟交战 | [`/battle`](/battle) | P0 开发中 |
| **F8** | 特技库 | [`/traits`](/traits) | P0 开发中 |
| **F9** | 版本特性 | [`/patches`](/patches) | P1 开发中 |

## 技术栈

- **前端框架** [Next.js16+](https://nextjs.org/)(App Router)
- **语言** [TypeScript](https://www.typescriptlang.org/)5.x(严格模式)
- **样式** [Tailwind CSS](https://tailwindcss.com/)4.x + 自定义三战配色
- **数据可视化** [Apache ECharts](https://echarts.apache.org/)(雷达图、折线图)
- **数据校验** [Zod](https://zod.dev/)(运行时 schema校验)
- **测试** [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)
- **代码规范** ESLint(`next/core-web-vitals` + `@typescript-eslint/recommended`) + Prettier
- **部署** [Vercel](https://vercel.com/)(首选,Region hkg1 香港)
- **包管理** pnpm

##快速开始

### 环境要求

- **Node.js** ≥20(推荐 LTS,本仓库 CI 使用 Node20)
- **pnpm** ≥8(`npm i -g pnpm` 或使用 corepack)
- **Git**(开发与提交需要)

### 本地开发

```bash
#1.克隆仓库
git clone https://github.com/your-username/sanzhan-peijiang.git
cd sanzhan-peijiang

#2. 安装依赖
pnpm install

#3.启动开发服务器(默认 http://localhost:3000)
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)即可看到首页。

### 生产构建

```bash
#编译 + 类型检查
pnpm build

#启动生产服务器(本地预览)
pnpm start
```

##脚本命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` |启动 Next.js 开发服务器(热更新,默认3000端口) |
| `pnpm build` | 生产构建(类型检查 +编译) |
| `pnpm start` |启动生产服务器(需要先 `build`) |
| `pnpm lint` | 运行 ESLint(`next/core-web-vitals` + TS规则) |
| `pnpm lint:fix` | ESLint 自动修复可修复的问题 |
| `pnpm format` | 用 Prettier格式化整个仓库 |
| `pnpm format:check` | 检查代码是否已被 Prettier格式化(不改) |
| `pnpm typecheck` | 仅运行 `tsc --noEmit`(不做构建) |
| `pnpm test` |跑 Vitest单元测试(单次) |
| `pnpm test:watch` | Vitest监听模式(开发时用) |
| `pnpm test:ui` |启动 Vitest 可视化 UI |

##目录结构

```
三战配将/
├── .github/
│ └── workflows/
│ └── ci.yml # CI:lint + format-check + typecheck + test
├── data/ #静态游戏数据(JSON,作为 v1 数据源)
│ ├── generals.json #武将
│ ├── skills.json #战法
│ ├── tactics.json #兵书
│ ├── lineups.json # 推荐阵容
│ ├── traits.json # 特技
│ ├── items.json #装备(MVP弱化,仅留 schema)
│ ├── patches.json # 版本特性
│ └── sim-config.json #模拟交战系数
├── docs/ #文档
│ ├── 数据维护手册.md #怎么录入/更新数据
│ └── deployment-guide.md # Vercel 一键部署指南
├── public/ #静态资源(图标、剪影等)
├── src/
│ ├── app/ # Next.js App Router
│ │ ├── layout.tsx # 全局布局(Header + Footer + metadata)
│ │ ├── page.tsx # 首页(9 个功能入口)
│ │ ├── sitemap.ts # Next.js 内置 sitemap.xml(124 个 URL)
│ │ ├── robots.ts # Next.js 内置 robots.txt
│ │ ├── generals/page.tsx # F1武将图鉴
│ │ ├── skills/page.tsx # F2战法图鉴
│ │ ├── sandbox/page.tsx # F3配将模拟器
│ │ ├── lineups/page.tsx # F4 推荐阵容
│ │ ├── search/page.tsx # F5 全站搜索
│ │ ├── battle/page.tsx # F7模拟交战
│ │ ├── traits/page.tsx # F8 特技库
│ │ └── patches/page.tsx # F9 版本特性
│ ├── components/ #通用组件
│ │ └── Layout/
│ │ ├── Header.tsx
│ │ └── Footer.tsx
│ ├── lib/ #业务工具/数据层
│ │ └── data/ # 见下方
│ └── types/ # TypeScript 类型
│ └── data.ts #8 大实体类型(General / Skill / ...)
├── vercel.json # Vercel部署配置(framework + region + cache)
├── .vercelignore #部署时排除本地调试文件
├── .eslintrc.json # ESLint 配置(本项目用 eslint.config.mjs,flat config)
├── .prettierrc # Prettier 配置
├── .prettierignore # Prettier忽略
├── .gitignore
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts # Vitest 配置
├── vitest.setup.ts # Vitest 全局 setup(jsdom)
├── LICENSE
└── README.md # 本文件
```

## 数据模型概览

8 大核心实体,详细字段定义见 [`src/types/data.ts`](./src/types/data.ts) 和 `PRD-MVP.md §8`:

- **General(武将)** — 属性、兵种适性、自带/传承战法、红度、可学阵法、可选兵书
- **Skill(战法)** —6 类(主动/被动/指挥/突击/阵法/兵种)、发动概率、目标数、起始回合
- **Tactics(兵书)** — 大/小兵书、类型、效果、作用对象
- **Lineup(阵容)** —3武将 +阵法 +战法 +兵书 + 特技 +6维评分
- **Trait(特技)** —装备附带的特性(专属/通用)
- **Item(装备)** — MVP阶段弱化,只保留 schema
- **Patch(版本特性)** — 版本号、类型、影响武将列表
- **SimConfig(模拟配置)** —模拟交战系数表

##贡献指南

我们欢迎所有形式的贡献 —修 bug、补数据、写文档、提建议。

###提 PR流程

1. **Fork** 本仓库到你的 GitHub账号
2. 从 `main`切一个新分支,命名建议:`feat/xxx` / `fix/xxx` / `docs/xxx` / `data/xxx`
 ```bash
 git checkout -b feat/your-feature-name
 ```
3. 在分支上完成改动。本地先跑一遍检查:
 ```bash
 pnpm lint
 pnpm format:check
 pnpm typecheck
 pnpm test
 ```
全部通过后再提交。
4.提交时写清楚改动原因(参考 commit message规范)
5.推到你 fork 的仓库,然后在 GitHub 上开 **Pull Request** 到本仓库的 `main` 分支
6. CI 会自动跑 lint / format-check / typecheck / test,全部通过才会被合入
7. 等 review,有反馈就改,合并后会自动部署到预览环境

### 数据贡献

如果你想帮我们录入/校对武将、战法、阵容数据,请阅读 `docs/数据维护手册.md`,里面有字段说明、ID命名规范和提交流程。

### Commit Message规范(建议)

- `feat: 新增 F3配将模拟器战法联动提示`
- `fix:修复战法搜索结果丢失传承将的 bug`
- `docs: 更新数据维护手册,加特技分类章节`
- `data:录入张角、于吉、左慈3 个武将`
- `chore:升级 Next.js 到14.2.x`
- `refactor:提取 data loader公共逻辑`
- `test:补 lineups.json引用一致性测试`

### Code Style

-遵循仓库根目录的 ESLint 和 Prettier 配置
-提交前 `pnpm format` 一遍
- 不写实际业务逻辑的 console(会被 lint warn)
- TypeScript严格模式,不允许 `any`逃逸(必要时用 `unknown` + 类型守卫)

##路线图

|阶段 | 时间 | 内容 |
| --- | --- | --- |
| **P0准备周** | 第1 周 | 数据准备 + 技术选型 +团队到位 |
| **Sprint1** | 第2-3 周 | F1武将图鉴 + F2战法图鉴 + F5搜索 |
| **Sprint2** | 第4 周 | F3配将模拟器(核心) |
| **Sprint3** | 第5-6 周 | F7模拟交战 +模拟引擎 |
| **Sprint4** | 第6-7 周 | F4阵容评价 + F8 特技库 + F9 版本特性 |
| **Sprint5** | 第7-8 周 |移动端适配 +部署上线 + 内测 |

##部署

**在线预览(占位):** <https://sanzhan-peijiang.vercel.app>

### 一键部署到 Vercel

点击顶部 **"Deploy with Vercel"**按钮即可一键部署(零命令行):

1. 用 GitHub账号登录 Vercel
2.选 fork / clone 的 `sanzhan-peijiang`仓库
3. 默认配置(Next.js16 + Region hkg1 香港 +零环境变量)即可
4. 等约1-2 分钟,部署完成后拿到 `*.vercel.app` 公网域名

###详细部署指南

详见 [`docs/deployment-guide.md`](./docs/deployment-guide.md),包含:

- Vercel 注册流程(GitHub登录)
-域名选择(默认 `sanzhan-peijiang.vercel.app` 或自定义)
- Region 选择(`hkg1` 香港,适合大陆玩家)
- 环境变量说明(当前无敏感数据)
- GitHub集成自动部署规则
-部署后 smoke test清单(9 个核心路由 + sitemap.xml + robots.txt)
-阿里云 /腾讯云的备选部署方案
- 中国大陆域名 ICP备案说明

> ⚠️ **域名占位提醒**:`src/app/layout.tsx`、`src/app/sitemap.ts`、`src/app/robots.ts`三个文件中的 `BASE_URL` 当前硬编码为 `https://sanzhan-peijiang.vercel.app`。如果绑定了自定义域名或改了 Vercel Project Name,必须同步修改这三个文件的占位。

###简版流程

1. 把仓库推到 GitHub
2. 在 Vercel导入仓库,选 Next.js框架(框架预设自动识别)
3.等待首次部署完成(默认 Region `hkg1`,首次 build约1-2 分钟)
4. 配置自定义域名(可选,需 ICP备案)
5. 在百度站长平台 / Bing Webmaster提交 `https://你的域名/sitemap.xml`

##许可

本项目以 MIT许可发布(详见 `LICENSE` 文件)。

##免责声明

> ⚠️ **本站为玩家自制工具,与网易官方无关**。
>
> 本站所有数据来源于公开资料整理,可能滞后或存在错误。
> **以游戏内实际数据为准**。
>
> 本站不提供账号代充、破解、外挂等服务。
> 本站未使用官方武将立绘,UI配图均为剪影或自制素材,如涉及版权问题请联系删除。

---

**《三国志·战略版》** 是网易雷火工作室开发的策略手游,本项目是粉丝自制的辅助工具,与官方无任何关联。
