# 部署后 Smoke Test 检查清单

> 适用范围:`三战配将` Next.js 14 静态导出 + Vercel 部署
> 文档目的:用户在 Vercel 完成部署后,按本清单逐阶段验证站点可用性、数据完整性与性能基线。
> 执行人:**用户本人**(部署在用户 Vercel 账号下,worker 无法代为验证)
> 预计耗时:8 个阶段合计约 60–90 分钟

---

## 0. 准备工作(开始前 5 分钟)

| # | 项 | 操作 | 通过标准 |
|---|---|---|---|
| 0.1 | 拿到 Vercel 域名 | Vercel Dashboard → Project → Domains | 形如 `https://sanzhan-xxx.vercel.app` 或自定义域名 |
| 0.2 | 准备浏览器 | Chrome / Edge 最新版,开 DevTools(F12) | 桌面 + 移动模拟都能用 |
| 0.3 | 准备真机 | 一台手机(iOS 或 Android),能扫码 | 用于阶段 6 移动端实测 |
| 0.4 | 准备账号 | 百度站长平台 + Google Search Console 账号 | 阶段 4 提交 sitemap |
| 0.5 | 准备短链 | 短链生成器(https://sina.lt/ 或自己域名) | 阶段 8 发群用 |

> 本文中 `<domain>` 全部替换为 `0.1` 拿到的实际域名。

---

## 阶段 1:部署成功确认(部署完成 5 分钟内)

> 目标:确认 Vercel 编译没炸,域名解析到生产环境。

- [ ] **1.1 访问首页**
  - 操作:浏览器打开 `https://<domain>/`
  - 期望:HTTP 200,首屏能看到网站 H1(类似「三国志·战略版配将库」之类),无空白
  - 失败:404/500 → 看阶段 7 异常处理;白屏 → 看 Vercel Build Log
- [ ] **1.2 Vercel Build Log 无 error**
  - 操作:Vercel Dashboard → 最新一次 Deployment → Build Logs
  - 期望:日志末尾显示 `Compiled successfully` 或 `Build completed`,无红色 error
  - 警告(`Warning`)允许,但 `Error` 必须为 0
- [ ] **1.3 部署状态为 Ready**
  - 操作:Deployment 卡片顶部状态指示灯
  - 期望:绿色 ✓ `Ready`(不是 Building / Error / Queued)
- [ ] **1.4 Region 确认**
  - 操作:Vercel Dashboard → Project → Settings → Functions → Region
  - 期望:**默认 hkg1(香港)** 或 `hnd1`(东京);如果变成 `iad1`(美东)说明环境变量没带,需要回查
- [ ] **1.5 部署 ID 留档**
  - 操作:复制 Deployment 页面顶部的 `dpl_xxx` 标识
  - 用于:回滚(`Promote to Production` 时选该 ID)

---

## 阶段 2:8 个核心路由(部署完成 30 分钟内)

> 目标:每个主路由都能打开,核心数据正确加载。
> 每个路由 2–3 分钟,共 8 个。

| # | 路由 | 期望看到 | 通过标准 |
|---|---|---|---|
| 2.1 | `/generals` | 50 个武将卡片 | 卡片总数 = 50(右下角统计或肉眼对一遍蜀/魏/吴/群),可点击过滤栏(国家/赛季) |
| 2.2 | `/skills` | 50 个战法卡片 + 6 个 subType Tab | Tab 选项包含:全部 / 主动 / 被动 / 指挥 / 突击 / 阵法 / 内政(共 6 个子类型 + 全部),切换 Tab 数字会变 |
| 2.3 | `/lineups` | 15 套阵容(可点进详情) | 列表显示 15 张阵容卡,每张卡能点进去看详情(跳转 `/lineups/<id>`) |
| 2.4 | `/sandbox` | 配将模拟器 | 能选 3 个武将(例如 蜀:刘/张/关)→ 选 2 个战法 → 点「保存」→ 浏览器控制台输入 `localStorage` 看到保存的阵容 JSON |
| 2.5 | `/battle` | 模拟交战入口 | 页面有选将/选阵容的 UI,能选两方阵容进入交战 |
| 2.6 | `/traits` | 5 个特技卡片 | 显示 5 张特技卡(对应 `data/traits.json` 里的 5 条),能点进详情 |
| 2.7 | `/patches` | 版本特性页 | 列出若干版本(按时间倒序),点开能看版本内容 |
| 2.8 | `/search` | 搜索 "诸葛" | 在搜索框输入「诸葛」,结果区出现「诸葛亮」武将 + 含「诸葛」的战法/阵容 |

**验证脚本(可选用):**
```bash
# 8 个核心路由的快速可达性
for path in / /generals /skills /lineups /sandbox /battle /traits /patches /search; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://<domain>$path")
  echo "$path -> $code"
done
# 期望全部 200
```

---

## 阶段 3:详情页抽样(50+50+15=115 个详情页)

> 目标:动态路由 `[id]` 全部能解析,无 404、无数据缺失。
> 重点验证 3 个示例,再随机抽 10 个兜底。

### 3.1 三个示例详情页(必看)

| # | 路由 | 期望看到 |
|---|---|---|
| 3.1.1 | `/generals/zhuge_liang` | 诸葛亮详情:头像、属性六维图、战法列表、阵容搭配建议 |
| 3.1.2 | `/skills/qi_xing_zhen` | 战法详情:名称、品质、类型(主动/被动)、发动概率、效果描述 |
| 3.1.3 | `/lineups/shu_qiang` | 蜀枪阵容详情:3 个武将 + 战法 + 评分 + 强度曲线(柱状图/雷达图) |

### 3.2 武将详情抽样(随机 5 个)

- 从 `data/generals.json` 随机挑 5 个 id(避开 3.1.1 用过的 zhuge_liang)
- 建议覆盖:魏、吴、群、其他蜀将各 1-2 个
- 操作:打开 `/generals/<id>`,看是否有完整属性和战法

### 3.3 战法详情抽样(随机 5 个)

- 从 `data/skills.json` 随机挑 5 个 id
- 建议覆盖:主动 / 被动 / 指挥 / 突击 / 阵法 / 内政 各 1 个(确认 6 个 subType 都正常)

### 3.4 阵容详情抽样(随机 5 个)

- 从 `data/lineups.json` 随机挑 5 个 id
- 建议覆盖:蜀枪、魏盾、吴弓、群骑、混合(藤甲/锦帆)等不同类型

### 3.5 自动化兜底(可选用)

```bash
# 从 data JSON 抽所有 id,逐个访问
node -e "
const fs = require('fs');
const ids = ['generals','skills','lineups'].flatMap(t => {
  const data = JSON.parse(fs.readFileSync('data/' + t + '.json', 'utf8'));
  return data.map(d => t + '/' + d.id);
});
console.log(ids.join('\n'));
" > urls.txt

# 然后用 curl 跑一遍,期望全部 200
while read url; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://<domain>/$url")
  echo "$url -> $code"
done < urls.txt
```

> 通过标准:抽样详情页 100% 200,无 500。允许个位数 404(数据源问题),但应 < 1%。

---

## 阶段 4:SEO 验证(部署完成 1 小时内)

> 目标:站点能被搜索引擎正常抓取。

- [ ] **4.1 `/sitemap.xml` 有效**
  - 操作:访问 `https://<domain>/sitemap.xml`
  - 期望:返回 `application/xml` 类型的 XML 文档,包含约 124 个 URL
    - 静态路由(首页/列表页)~9 个
    - 武将详情 50 个
    - 战法详情 50 个
    - 阵容详情 15 个
    - 合计 124 个
- [ ] **4.2 `/robots.txt` 正常**
  - 操作:访问 `https://<domain>/robots.txt`
  - 期望:包含 `User-Agent: *` + `Sitemap: https://<domain>/sitemap.xml`
- [ ] **4.3 百度站长平台提交**
  - 入口:https://ziyuan.baidu.com/
  - 操作:添加站点 → 验证(HTML 标签 / DNS / 文件验证)→ 链接提交 → 提交 sitemap URL
  - 期望:状态显示「验证成功」+ sitemap 抓取成功
- [ ] **4.4 Google Search Console 提交**
  - 入口:https://search.google.com/search-console/
  - 操作:添加资源(URL 前缀)→ 验证 → 站点地图 → 提交 `sitemap.xml`
  - 期望:状态「已收到」+ 几天后「已处理」,无错误
- [ ] **4.5 元数据抽查**
  - 操作:打开任意详情页 → View Source → 找 `<title>` 和 `<meta name="description">`
  - 期望:title 含实体名(如「诸葛亮 - 三战配将」),description 一句话描述
- [ ] **4.6 Open Graph 抽查**
  - 操作:View Source → 找 `<meta property="og:...">`
  - 期望:至少 og:title / og:description / og:image 三项齐全(便于分享到微信/QQ 卡片展示)

---

## 阶段 5:性能与监控(部署完成 1 小时内)

> 目标:核心 Web Vitals 达到基线,监控开启。

- [ ] **5.1 Vercel Analytics 开启**
  - 操作:Vercel Dashboard → Project → Analytics → Enable
  - 期望:Analytics tab 显示「Enabled」,首日数据开始累计
- [ ] **5.2 Lighthouse 桌面跑分**
  - 操作:Chrome DevTools → Lighthouse 面板 → 模式选「Desktop」→ 勾选 Performance / SEO / Best Practices → 点击 Analyze
  - 期望:
    - Performance > 70
    - SEO > 90
    - Best Practices > 80
- [ ] **5.3 Lighthouse 移动跑分(375px)**
  - 操作:DevTools → 切到移动模拟(iPhone SE / 375×667)→ 重跑 Lighthouse
  - 期望:同上三档(移动端 Performance 阈值可放宽到 60+)
- [ ] **5.4 Core Web Vitals 抽样**
  - 关注指标(DevTools → Performance Insights):
    - LCP(Largest Contentful Paint)< 2.5s
    - FID/INP < 200ms
    - CLS < 0.1
- [ ] **5.5 Vercel Speed Insights 接入**
  - 操作:Vercel Dashboard → Speed Insights → Enable
  - 期望:真实用户数据开始回传(部署 24h 后看数据)
- [ ] **5.6 错误监控(可选)**
  - 如已接入 Sentry / LogRocket,确认 Vercel 部署后能收到首条事件
  - 如未接入,跳到阶段 7 关注 Vercel Runtime Logs

---

## 阶段 6:移动端真实体验(20 分钟)

> 目标:真机 + DevTools 模拟双线验证。

- [ ] **6.1 真机扫码访问**
  - 操作:Vercel Dashboard → Deployment 卡片左上角有 QR code(或者用短链)→ 手机扫码
  - 期望:页面在手机浏览器(Safari / Chrome / 微信内置)正常显示
- [ ] **6.2 首页汉堡菜单**
  - 操作:手机上点左上角汉堡按钮 ☰
  - 期望:菜单展开,8 个主入口(武将/战法/阵容/模拟器/交战/特技/版本/搜索)都能点
- [ ] **6.3 配将模拟器选将**
  - 操作:手机上 `/sandbox` → 点选 3 个武将 → 选战法 → 保存
  - 期望:点击区域够大(>= 44px),无错位;保存后刷新页面,localStorage 还在
- [ ] **6.4 模拟交战结果页**
  - 操作:`/battle` → 选两方阵容 → 交战 → 跳到结果页
  - 期望:结果页的柱状图/雷达图能正常渲染(无空白、无溢出屏幕)
- [ ] **6.5 横竖屏切换**
  - 操作:详情页(如 `/generals/zhuge_liang`)→ 旋转手机
  - 期望:布局自适应,无内容被截断
- [ ] **6.6 微信内打开(可选)**
  - 操作:把短链发到微信群 → 长按链接 → 看到卡片预览(og:image / og:title 生效)
  - 期望:卡片有标题 + 缩略图 + 描述

---

## 阶段 7:异常处理与压力(15 分钟)

> 目标:边界 case 行为符合预期,无明显崩溃。

- [ ] **7.1 武将不存在的 ID**
  - 操作:访问 `https://<domain>/generals/non_exist_id_xxx`
  - 期望:返回 404 页面(Next.js 默认 not-found UI 或自定义)
- [ ] **7.2 战法不存在的 ID**
  - 操作:访问 `https://<domain>/skills/non_exist_id_xxx`
  - 期望:404
- [ ] **7.3 阵容不存在的 ID**
  - 操作:访问 `https://<domain>/lineups/non_exist_id_xxx`
  - 期望:404
- [ ] **7.4 特技不存在的 ID**
  - 操作:访问 `https://<domain>/traits/non_exist_id_xxx`
  - 期望:404
- [ ] **7.5 根路径尾斜杠**
  - 操作:访问 `https://<domain>/generals/`(带尾斜杠)和 `https://<domain>/generals`(不带)
  - 期望:两种写法都能 200(或统一 301/308 到一个,无 404)
- [ ] **7.6 大小写敏感性**
  - 操作:访问 `https://<domain>/Generals`(大写 G)
  - 期望:404(Next.js 默认大小写敏感,这是正确行为)
- [ ] **7.7 并发负载**
  - 操作:同时开 5 个 tab,每个 tab 跑 `/sandbox` 选将保存
  - 期望:无崩溃,5 个 tab 互不干扰,localStorage 各自独立
- [ ] **7.8 慢网络模拟**
  - 操作:DevTools → Network → Throttling 选「Slow 3G」→ 访问 `/lineups`
  - 期望:列表能正常出来,Loading 状态可接受(< 10s)
- [ ] **7.9 Vercel Runtime Logs 检查**
  - 操作:Vercel Dashboard → Project → Logs → Runtime Logs
  - 期望:无 5xx 错误,无大量 4xx(除了 7.1-7.4 的预期 404)

---

## 阶段 8:正式开放(全过 → 30 分钟)

> 前 7 阶段全部通过后,进入正式发布。

- [ ] **8.1 短链生成**
  - 操作:用 https://sina.lt/ 或自有短域名服务把 `https://<domain>/` 转成短链
  - 记录:把短链记到备忘录
- [ ] **8.2 自媒体渠道分发**(全选或挑重点)
  - 微信群(三战玩家群、亲友群)
  - QQ 群(同好群)
  - 百度贴吧(`三国志战略版`吧)
  - NGA / 贴吧 / TapTap 论坛
  - 微博 / 小红书(可选)
- [ ] **8.3 短链附上来源说明**(建议)
  - 群发文案模板:
    > 三战配将工具上线了!50 武将 + 50 战法 + 15 阵容,支持配将模拟和模拟交战。
    > 链接:https://<short-url>
    > 欢迎提 bug 和建议~
- [ ] **8.4 监控 1 小时**
  - 操作:盯着 Vercel Dashboard → Logs / Analytics
  - 关注:访问量、错误率、Top 路由、Core Web Vitals 实时值
- [ ] **8.5 收集用户反馈**
  - 建一个微信群 / 飞书群,接收玩家反馈
  - 收到 bug 截图 → 写 issue → 走热修流程
- [ ] **8.6 备份部署信息**
  - 记录到备忘录:
    - Vercel 项目地址
    - 部署 ID
    - 域名
    - 提交到百度 / Google 的时间

---

## 常见问题 FAQ

### Q1:部署失败 / Build 报错,怎么办?
**A:**
1. Vercel Dashboard → 最新 Deployment → Build Log
2. 找到红色 `Error` 那一行,通常是:
   - `Module not found` → 依赖没装,本地 `pnpm install` 再推
   - `Type error` → `pnpm tsc --noEmit` 本地先过
   - `Out of memory` → Vercel 免费版 1GB 内存不够,升级 Pro 或拆分构建
3. 修复后 `git push` 触发重新部署

### Q2:路由 404,可能是什么原因?
**A:**
- **路径拼写错**:Next.js App Router 大小写敏感,`/Generals` 404,必须 `/generals`
- **尾斜杠不一致**:Vercel 默认 `trailingSlash: false`,`/generals/` 可能跳 308
- **动态路由 ID 不存在**:7.1-7.4 的情况,正常 404
- **数据未加载**:`data/<file>.json` 路径不对,看阶段 7 异常处理

### Q3:页面打开但数据不显示(空列表)
**A:**
1. 打开浏览器 DevTools → Console,看红色错误
2. 常见原因:
   - `data/*.json` 文件没被 build 包含 → 检查 `next.config.js` 的 `output: 'export'` 配置
   - JSON 解析错误 → 访问 `https://<domain>/data/generals.json` 看返回内容
   - 客户端 loader 路径不对 → 检查 `@/lib/data/loader.ts` 的相对路径
3. 紧急回滚:Vercel Dashboard → Deployments → 选上一个 Ready 版本 → `Promote to Production`

### Q4:性能差,Lighthouse 分数不达标
**A:**
1. **Vercel Edge Cache 开启**:
   - Settings → Functions → 找到 ISR/SSR 配置,加 `Cache-Control: public, s-maxage=3600`
2. **图片优化**:
   - 用 `next/image` 替代 `<img>`,自动 WebP / 懒加载
3. **代码分割**:
   - 大组件用 `dynamic(() => import(...), { ssr: false })`
4. **字体优化**:
   - 用 `next/font` 替代 Google Fonts `<link>`,避免阻塞渲染
5. **第三方脚本**:
   - 百度统计 / Google Analytics 改成 `defer` 或 `async`

### Q5:移动端样式错乱
**A:**
1. 确认 viewport meta 标签存在:`<meta name="viewport" content="width=device-width, initial-scale=1">`
2. DevTools → 移动模拟 → 排查 375px / 768px / 1024px 三个断点
3. 检查是否用了 `px` 而非 `rem` 导致字号过大

### Q6:Vercel 部署免费额度用完了?
**A:**
- Hobby Plan:100 GB 带宽/月,无限部署次数
- 超额会停服,不会自动扣费
- 升级 Pro($20/月)可获得 1 TB 带宽
- 应急:把图片/静态资源迁到 Cloudflare R2(免费 10GB 存储 + 出口流量)

### Q7:用户报告 500 错误,怎么排查?
**A:**
1. Vercel Dashboard → Logs → Runtime Logs
2. 过滤 `error` / `5xx`
3. 看 stack trace,定位到具体文件和行号
4. 本地 `pnpm dev` 复现,修复后 `git push`

### Q8:怎么回滚到上一个版本?
**A:**
1. Vercel Dashboard → Deployments
2. 找到上一个 `Ready` 状态的部署
3. 右上角 `⋯` → `Promote to Production`
4. 几秒钟内域名切到旧版本(零停机)

---

## 附录 A:验证脚本汇总

> 以下脚本本地可跑,用于部署后 5 分钟快速冒烟。

```bash
# 1. 所有静态路由可达性
ROUTES=(
  "/"
  "/generals"
  "/skills"
  "/lineups"
  "/sandbox"
  "/battle"
  "/traits"
  "/patches"
  "/search"
)
for r in "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://<domain>$r")
  echo "$r -> $code"
done

# 2. sitemap URL 数量
curl -s "https://<domain>/sitemap.xml" | grep -c "<url>"

# 3. robots.txt 存在
curl -s -o /dev/null -w "%{http_code}\n" "https://<domain>/robots.txt"

# 4. 抽样详情页
DETAIL_IDS=(
  "generals/zhuge_liang"
  "skills/qi_xing_zhen"
  "lineups/shu_qiang"
)
for id in "${DETAIL_IDS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://<domain>/$id")
  echo "/$id -> $code"
done

# 5. 异常 ID 404 行为
curl -s -o /dev/null -w "%{http_code}\n" "https://<domain>/generals/non_exist_id_xxx"
curl -s -o /dev/null -w "%{http_code}\n" "https://<domain>/skills/non_exist_id_xxx"
curl -s -o /dev/null -w "%{http_code}\n" "https://<domain>/lineups/non_exist_id_xxx"
```

---

## 附录 B:检查清单总览(快速勾选)

```
阶段 1:部署成功确认         □ □ □ □ □
阶段 2:8 个核心路由         □ □ □ □ □ □ □ □
阶段 3:详情页抽样           □ □ □ □
阶段 4:SEO 验证             □ □ □ □ □ □
阶段 5:性能与监控           □ □ □ □ □ □
阶段 6:移动端体验           □ □ □ □ □ □
阶段 7:异常处理             □ □ □ □ □ □ □ □ □
阶段 8:正式开放             □ □ □ □ □ □

全部勾完 = 部署上线完成 🎉
```

---

**最后更新**:2026-06-10
**文档维护**:项目交付后,如新增路由/数据,记得更新本文档。
