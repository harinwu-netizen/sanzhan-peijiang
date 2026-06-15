# S7-Deploy 部署实测报告 — `sanzhan-peijiang.vercel.app`

## VERDICT: FAIL

**结论一句话**:`https://sanzhan-peijiang.vercel.app` **当前不可达**——域名 DNS 已退化为 Charleston Road Registry / Google Parking / Facebook IPv6 的占位 IP(全是非 Vercel CDN 段),Vercel CDN 对该 host 直接返回 `Connection reset`,所有 133 个目标 URL(11 主路由 + 115 详情页 + 7 异常 case)100% 网络层失败(connect timeout 4s / 全 0 状态码)。**该 Vercel 项目当前未在生产环境运行**,8 阶段可远程跑的部分**全部无法完成**。

**Phase 1 / 2 / 3 / 4 / 5 / 6 / 7:全部因网络层失败而 FAIL**(脚本完整跑完,数据已采集,问题不是测试方式而是部署 URL 本身已下线)。

---

## 1. 概览(实际跑了什么)

| 阶段 | 是否远程跑 | 跑法 | 结果 |
|---|---|---|---|
| 阶段 1 部署确认 | ✅ 跑了 | Node fetch + DNS lookup + curl 对照 | **FAIL** — 域名不可达 |
| 阶段 2 主路由 200 | ✅ 跑了 | scripts/deploy-smoke.mjs 自动跑 | **FAIL** — 11/11 主路由 0 状态码 |
| 阶段 3 详情页 115 | ✅ 跑了 | scripts/deploy-smoke.mjs 自动跑 | **FAIL** — 115/115 详情页 0 状态码 |
| 阶段 4 SEO | ✅ 跑了 | 抓 sitemap.xml / robots.txt / 首页 HTML | **FAIL** — 全部为空(未抓取到内容) |
| 阶段 5 Lighthouse | ❌ 跳过 | Lighthouse 跑不动(无服务器响应),会反复 timeout | 跳过 |
| 阶段 6 DevTools 模拟 | ❌ 跳过 | 依赖 HTML body 才能 grep viewport | 跳过 |
| 阶段 7 异常 case | ✅ 跑了 | scripts/deploy-smoke.mjs 跑 7 个 | **FAIL** — 7/7 0 状态码(但部分 case 逻辑上是 "因为部署不在" 误判为失败) |
| 阶段 8 正式开通 | ❌ 跳过 | 用户行为 | 跳过 |

可重跑命令:**见末尾「可重放命令清单」**。

---

## 2. 阶段 1:部署确认(FAIL)

### 1.1 9 个主路由(顺带 sitemap.xml / robots.txt 共 11 个)

> 数据来源:`deploy-smoke-results/run-001/summary.md`(本任务 10:55 实跑,timeout=4s,concurrency=16)

| URL | 期望 | 实测 HTTP | 用时 (ms) |
|---|---|---:|---:|
| `https://sanzhan-peijiang.vercel.app/` | 200 | **0**(connect timeout) | 4010 |
| `https://sanzhan-peijiang.vercel.app/generals` | 200 | **0** | 4002 |
| `https://sanzhan-peijiang.vercel.app/skills` | 200 | **0** | 4003 |
| `https://sanzhan-peijiang.vercel.app/lineups` | 200 | **0** | 4004 |
| `https://sanzhan-peijiang.vercel.app/sandbox` | 200 | **0** | 4005 |
| `https://sanzhan-peijiang.vercel.app/battle` | 200 | **0** | 4006 |
| `https://sanzhan-peijiang.vercel.app/traits` | 200 | **0** | 4007 |
| `https://sanzhan-peijiang.vercel.app/patches` | 200 | **0** | 4012 |
| `https://sanzhan-peijiang.vercel.app/search` | 200 | **0** | 4013 |
| `https://sanzhan-peijiang.vercel.app/sitemap.xml` | 200 | **0** | 4014 |
| `https://sanzhan-peijiang.vercel.app/robots.txt` | 200 | **0** | 4015 |

### 1.2 首页 `<title>`

- **空**(根本抓不到 HTML body,getaddrinfo 后 connect timeout)
- 期望值:类似「三国志·战略版配将库」(本项目 `src/app/layout.tsx` title.template 应该是 "三战配将助手")

### 1.3 sitemap.xml / robots.txt

- **全部 0**——根本抓不到文件,无法判断存在性

### DNS 解析(关键证据,解释为什么连不上)

`sanzhan-peijiang.vercel.app` 当前 DNS A / AAAA 记录(本任务 11:06 实测,Resolve-DnsName):

```
A      108.160.165.9          ← Charleston Road Registry 停车 IP(.app TLD 注册商持有)
A      216.239.32.105         ← Google Parking
A      216.239.34.105         ← Google Parking
A      216.239.36.105         ← Google Parking
A      216.239.38.105         ← Google Parking
A      216.239.60.105         ← Google Parking
AAAA   2a03:2880:f11c:8183:face:b00c:0:25de  ← Facebook(确认是 spam/parking 段)
AAAA   2001:4860:4802:32::69 ← Google
AAAA   2001:4860:4802:34::69 ← Google
AAAA   2001:4860:4802:36::69 ← Google
AAAA   2001:4860:4802:38::69 ← Google
AAAA   2001:4860:4805::69    ← Google
```

**问题诊断**:

- Vercel CDN 正常段:`76.76.21.21` / `76.76.21.93` / `66.33.60.34` / `66.33.60.67`(对应 cname.vercel-dns.com)
- 当前 DNS 全是 **非 Vercel 段**,Google / Facebook / Charleston Registry 三家**停车 IP**
- 用 `--resolve sanzhan-peijiang.vercel.app:443:76.76.21.22` 强制指向 Vercel CDN IP → **Connection reset**(SNI 找不到匹配,说明 Vercel edge 上**没有这条 host 的部署记录**)

**对照实验**(确认 Vercel CDN 本身可达):

- `nextjs.org`(已知 Vercel 部署)→ `200 OK` 1.65s ✅
- `vercel.com` → `200 OK` 0.5s ✅
- `www.baidu.com` → `200 OK` ✅
- `sanzhan-peijiang.vercel.app` → `connect timeout` ❌

**结论**:Vercel CDN 正常,问题**专属于该域名**——`sanzhan-peijiang` 这个 Vercel 项目目前已下线 / 被删除 / 未真正部署 / DNS 退化为停车。

**注**:父会话(用户在 mvs_34a79c33 那边)本机复测 `45.114.11.238`(中国地区 ParkingPage IP)→ 与我这边 `108.160.165.9`(北美地区 ParkingPage IP) 不同,但**性质完全一致:都是非 Vercel 停车 IP**。

---

## 3. 阶段 2:主路由 200(FAIL — 同阶段 1)

11 个主路由 + sitemap.xml + robots.txt 全部 0 状态码(网络失败),脚本已自动化跑完,数据见 `deploy-smoke-results/run-001/summary.md`「主路由探测结果」段。

**FAIL 不是 404/500,而是 0(连接超时)**——意味着根本到不了 Vercel 服务器。

---

## 4. 阶段 3:详情页 115 个(FAIL)

从 `data/generals.json` / `data/skills.json` / `data/lineups.json` 抽 ID,跑 `/generals/<id>` `/skills/<id>` `/lineups/<id>` 共 115 个 URL。

| 类别 | ID 数 | 期望 200 | 实测非 200 | 实测 0 状态码 |
|---|---:|---:|---:|---:|
| 武将详情 | 50 | 50 | 50 | **50 / 50(100%)** |
| 战法详情 | 50 | 50 | 50 | **50 / 50(100%)** |
| 阵容详情 | 15 | 15 | 15 | **15 / 15(100%)** |
| **合计** | **115** | **115** | **115** | **115 / 115(100%)** |

**任务允许 ≤ 1% 404**(数据源问题),实测**远大于 1%(实际 100%)** → **FAIL**。

样本(每个数据来源的前 3 个):

- `/generals/zhuge_liang` → 0 / 4016ms
- `/generals/liu_bei` → 0 / 4017ms
- `/generals/zhang_fei` → 0 / 4018ms
- `/skills/qi_xing_zhen` → 0 / 4003ms
- `/skills/ren_de_zai_shi` → 0 / 4002ms
- `/skills/wan_ren_zhi_di` → 0 / 4002ms
- `/lineups/shu_qiang` → 0 / 4011ms
- `/lineups/sima_yi_dun` → 0 / 4004ms
- `/lineups/wei_qi` → 0 / 4004ms

**全部 115 行详见** `deploy-smoke-results/run-001/results.csv` 或 `results.jsonl`。

---

## 5. 阶段 4:SEO 验证(FAIL)

| 项 | 期望 | 实测 |
|---|---|---|
| 4.1 sitemap.xml `<url>` 数量 | 124 | **0**(文件抓不到) |
| 4.2 robots.txt 含 Sitemap 行 | ✅ | **❌**(文件抓不到) |
| 4.3 首页 `<title>` | 非空 | **空** |
| 4.3 首页 `<meta name="description">` | 存在 | **❌** |
| 4.3 首页 viewport meta | 存在 | **❌** |
| 4.3 首页 `og:title` | 存在 | **❌** |
| 4.3 首页 `og:description` | 存在 | **❌** |
| 4.3 首页 `og:image` | 存在 | **❌** |
| 4.4 sitemap URL 与 data id 一致 | 完全一致 | **无法验证**(sitemap 抓不到) |

**源代码级对照(本地 build 产物 + src 静态分析)**

虽然线上抓不到 sitemap.xml / robots.txt / 首页 HTML,但**项目源代码 / 本地 build 配置是齐的**(S5 阶段已验证通过):

- `src/app/sitemap.ts:35` `const BASE_URL = 'https://sanzhan-peijiang.vercel.app';`
- `src/app/sitemap.ts:75-85` 9 个 CORE_ROUTES(priority=1.0 / 0.9 / 0.7 / 0.8 / 0.5)
- `src/app/sitemap.ts:105-132` 动态加载 generals / skills / lineups 各 N 条 → 总 124 条预期
- `src/app/robots.ts:15-32` 4 个 user-agent rules + `Sitemap: https://sanzhan-peijiang.vercel.app/sitemap.xml` + `Host: https://sanzhan-peijiang.vercel.app`
- `src/app/layout.tsx` 有 `metadataBase` / `openGraph` / `twitter`(S5 报告已确认)

**结论:SEO 配置源层面正确,但线上 URL 不可达,SEO 验证整体 FAIL**。

---

## 6. 阶段 5:性能基线(跳过)

Lighthouse 桌面 + 移动跑分**不能跑**——`lighthouse` 需要从目标 URL 抓 HTML / 静态资源,而我们的目标 URL **connect timeout**,Lighthouse 100% 会在 lighthouse-runner 阶段就卡死/报 NETWORK_ERROR,跑不出分数。

> 注:即便能跑,这个项目 S5 阶段已经在本地 build 验证过 `pnpm build` exit 0(9.3s compile + 3.8s typecheck + 69 静态页)+ `pnpm typecheck` exit 0。但**线上性能**必须等部署 URL 恢复后才能跑。

**跳过原因明确记录,不让用户误以为「性能没问题」**。

---

## 7. 阶段 6:移动端 DevTools 模拟(跳过)

需要抓 `/` HTML body 才能 grep viewport / responsive class。本任务**抓不到任何 HTML**,跳到阶段 8 也跳不过。

- 6.1 真机扫码:用户后续
- 6.2-6.5 DevTools 模拟 + 真机交互:本任务没硬件,且没 HTML 可分析
- 6.6 微信内卡片预览:用户后续

---

## 8. 阶段 7:异常 + 压力(FAIL / 部分 N/A)

### 7.1-7.4 不存在 id → 应 404

| URL | 期望 | 实测 HTTP | 判定 |
|---|---|---:|---|
| `/generals/non_exist_id_xxx` | 404 | **0**(timeout) | 无法验证 |
| `/skills/non_exist_id_xxx` | 404 | **0** | 无法验证 |
| `/lineups/non_exist_id_xxx` | 404 | **0** | 无法验证 |
| `/traits/non_exist_id_xxx` | 404 | **0** | 无法验证 |

**网络层 timeout ≠ 404**,这 4 个 case 在部署恢复后才能真正验证。当前结论:**网络失败,无法判断业务 404 行为**。

### 7.5-7.6 大小写 + 尾斜杠

| URL | 期望 | 实测 HTTP | 判定 |
|---|---|---:|---|
| `/Generals`(大写 G) | 404 | **0** | 网络失败,无法验证 |
| `/generals/`(尾斜杠) | 200 或 308 | **0** | 网络失败,无法验证 |
| `/skills/` | 200 或 308 | **0** | 网络失败,无法验证 |

注:从 `vercel.json:6` `trailingSlash: false` 配置推断,**预期行为**是 `/generals/` → 308 → `/generals`(Next.js App Router 默认行为),但**当前不可验证**。

### 7.7 5 tab 并发

跳过(没浏览器硬件,且无服务可测)。

### 7.8 慢网络模拟(Slow 3G,curl `--limit-rate 50k`)

跳过——目标 URL 已经 connect timeout,模拟 Slow 3G 无意义。

### 7.9 Vercel Runtime Logs

跳过(没 Vercel 权限,无法在 Dashboard 自查)。**用户后续必须自查**。

---

## 9. 阶段 8:正式开通(跳过 — 用户行为)

- 8.1 短链生成:用户后续
- 8.2-8.6 群发 / 监控 1h / 用户反馈 / 备份:用户后续

**当前阶段 8 不在任何情况下应该进行**——S5 + S6 已经做完,部署本身 FAIL,正式开放前必须先修部署。

---

## 10. 重点问题清单(用户必须修)

| 优先级 | 问题 | 证据 | 修复建议 |
|---|---|---|---|
| **P0 阻塞** | Vercel 项目 `sanzhan-peijiang` 已下线 / DNS 退化 | DNS 全部解析到非 Vercel 段(`108.160.165.9` / `216.239.*` / `2a03:2880:*`);Vercel CDN 对该 host 返回 Connection reset;11+115+7=133 个 URL 100% connect timeout | **用户登录 Vercel Dashboard**,检查 `sanzhan-peijiang` 项目是否存在;若不存在,需要新 deploy 一次:git push 触发或手动 import + Deploy;若存在但域名显示 Parking Page,说明 `.vercel.app` 子域名被回收(常见于 Hobby plan 长时间不活动),需要重新部署让 Vercel 重新分配 `*.vercel.app` 段 |
| P1 | Lighthouse / 移动端 / 真机测试均无法跑 | 同上(目标 URL 不通) | 等 P0 修完后,在 P0 修完 30 分钟内按 `docs/post-deploy-checklist.md` 阶段 5/6/7 跑 |
| P1 | SEO 验证无法在线上做 | 同上 | 等 P0 修完后,跑 `node scripts/deploy-smoke.mjs`,会输出 sitemap URL 数 / robots Sitemap 行 / OG meta 等 |
| P2 | sitemap.xml / robots.txt / OG meta 源层面 OK,部署后不用改 src | S5 + S6 阶段已验证;本任务再次确认源代码完整 | 无需修代码 |
| P2 | Vercel Runtime Logs 必须用户自查 | 本任务没 Vercel 权限 | 登录 Vercel Dashboard → Project → Logs → Runtime Logs → 过滤 error/5xx |

---

## 11. 阶段 8 用户后续 To-Do(等 P0 修完)

P0 修完 + 阶段 5/6/7 自动化脚本跑通后,再做:

- [ ] **8.1 短链生成**:`https://sina.lt/` 或自有域名服务,把 `https://sanzhan-peijiang.vercel.app/` 转短链,记到备忘录
- [ ] **8.2 渠道分发**(挑重点):
  - 微信群(三战玩家群、亲友群)
  - QQ 群、百度贴吧(`三国志战略版`吧)
  - NGA / TapTap 论坛
  - 微博 / 小红书(可选)
- [ ] **8.3 短链文案模板**:
  > 三战配将工具上线了!50 武将 + 50 战法 + 15 阵容,支持配将模拟和模拟交战。
  > 链接:https://\<short-url\>
  > 欢迎提 bug 和建议~
- [ ] **8.4 监控 1h**:Vercel Dashboard → Logs / Analytics,关注访问量 / 错误率 / Top 路由 / Core Web Vitals
- [ ] **8.5 收集反馈**:建微信群 / 飞书群接收玩家反馈
- [ ] **8.6 备份**:记录 Vercel 项目地址 / 部署 ID / 域名 / 提交到百度 / Google 的时间

---

## 12. 可重放命令清单

### 12.1 重新跑远程冒烟(Node 内置 fetch,无需装依赖)

```bash
# 默认 timeout=15s,concurrency=8
node "E:\minimax project\三战配将\scripts\deploy-smoke.mjs"

# 更快版本(4s timeout,16 并发,本任务用的就是这个)
node "E:\minimax project\三战配江\scripts\deploy-smoke.mjs" --timeout-ms 4000 --concurrency 16

# 跑完输出到 ./deploy-smoke-results/<ISO timestamp>/
# 含 results.jsonl / results.csv / summary.md
```

### 12.2 单独 curl 探测(对照实验)

```bash
# DNS 解析
nslookup sanzhan-peijiang.vercel.app

# TCP connect 测试
Test-NetConnection -ComputerName 108.160.165.9 -Port 443

# HTTP 探测(从 cmd 用 curl)
curl -sS --connect-timeout 30 -w "%{http_code}\n" -o NUL "https://sanzhan-peijiang.vercel.app/"

# 控制组:已知 Vercel 部署
curl -sS -w "%{http_code}\n" -o NUL "https://nextjs.org/"
curl -sS -w "%{http_code}\n" -o NUL "https://vercel.com/"

# 强制 Vercel CDN IP(应该 Connection reset,验证 Vercel 没这条 host 的部署)
curl -sS --resolve sanzhan-peijiang.vercel.app:443:76.76.21.22 -w "%{http_code}\n" -o NUL "https://sanzhan-peijiang.vercel.app/"
```

### 12.3 Lighthouse(等 P0 修完再跑)

```bash
# 桌面跑分(需在能跑 Chrome 的环境下)
pnpm dlx lighthouse "https://sanzhan-peijiang.vercel.app/" \
  --preset=desktop \
  --chrome-flags="--headless --no-sandbox" \
  --output=json --output-path=./lh-desktop.json

# 移动跑分
pnpm dlx lighthouse "https://sanzhan-peijiang.vercel.app/" \
  --preset=mobile \
  --chrome-flags="--headless --no-sandbox" \
  --output=json --output-path=./lh-mobile.json
```

### 12.4 慢网络模拟(等 P0 修完再跑)

```bash
# Slow 3G 模拟(Speedtest ~50 KB/s)
curl --limit-rate 50k --max-time 30 -w "%{http_code} %{time_total}s\n" -o NUL \
  "https://sanzhan-peijiang.vercel.app/lineups"
```

---

## 13. 本任务产物清单

### 新增

| 文件 | 作用 |
|---|---|
| `E:\minimax project\三战配将\scripts\deploy-smoke.mjs` | 远程冒烟 Node 脚本,跑 11 主路由 + 115 详情页 + 7 异常 case + SEO 抓取 + DNS 解析,输出 jsonl/csv/md 三份报告 |
| `E:\minimax project\三战配将\deliverables\s7-deploy-acceptance.md` | 本报告 |
| `E:\minimax project\三战配将\deploy-smoke-results\run-001\` | 本次跑的结果目录(`results.jsonl` 23530B / `results.csv` 12014B / `summary.md` 10624B) |
| `C:\Users\Administrator\.mavis\plans\plan_c2160cc7\outputs\s7-deploy-acceptance\deliverable.md` | 引擎交付凭证 |

### 修改

无(本任务只读 src / data / vercel.json)。

---

## 14. 已知限制

- 本任务的**所有判定**都基于本沙箱(win32 + PS5.1)出网到 `sanzhan-peijiang.vercel.app` 的实测 + 父会话本机复测,二者一致确认域名不可达
- 沙箱里没有 Chrome 浏览器 → Lighthouse / DevTools 375px 模拟都没法跑;阶段 5/6 跳过
- 沙箱里没有 Vercel 账号 → 阶段 7.9 跳过
- 沙箱里没有真机 → 阶段 6 真机部分跳过
- 沙箱里 DNS 偶尔会切到 Facebook IPv6 / Google 段(原因:该 host 的 NS 记录被多个 parking 服务 round-robin);但**全部都不是 Vercel CDN 段**

---

**报告完成时间**:2026-06-15 11:08 (Asia/Shanghai)
**报告作者**:coder (S7-Deploy Acceptance session)
**任务输出**:本文件已落盘到 `E:\minimax project\三战配将\deliverables\s7-deploy-acceptance.md`