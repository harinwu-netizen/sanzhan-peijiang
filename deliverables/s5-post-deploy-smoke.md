# S5 — 部署后 Smoke Test 交付物

## 这份文档是什么

S5 阶段产出物:**部署后用户自检清单**。

适用于:用户完成 Vercel 部署(账户是用户自己的)后,按这份清单逐阶段点击验证。
详细版在 [`docs/post-deploy-checklist.md`](../docs/post-deploy-checklist.md),本文是它的快速摘要 + 关键 URL 速查。

---

## ⚠️ 执行人说明

**这份清单必须由用户本人执行,不是 worker 代为执行。**

原因:
1. 部署在用户 Vercel 账号下,worker 没有 production 环境的写权限/部署密钥
2. 域名、Dashboard、Analytics、Search Console 都在用户账号里
3. 真机扫码测试需要用户的手机

worker 的职责是**把清单写清楚、写全**,用户拿着清单点一遍就行。

---

## 8 个阶段(60–90 分钟)

| 阶段 | 名称 | 关键动作 | 通过标准 |
|---|---|---|---|
| 1 | 部署成功确认 | 访问首页 / 看 Build Log | 200 + 无 error + Region hkg1 |
| 2 | 8 个核心路由 | 逐个点开 `/generals` `/skills` 等 | 8 个全 200,数据正确加载 |
| 3 | 详情页抽样 | `/generals/zhuge_liang` 等 3+10 个 | 抽样 100% 200 |
| 4 | SEO 验证 | sitemap.xml / robots.txt / 提交百度 Google | sitemap 含 124 URL,搜索引擎已收录 |
| 5 | 性能与监控 | Lighthouse 桌面 + 移动 + Vercel Analytics | 性能 > 70,SEO > 90,最佳实践 > 80 |
| 6 | 移动端体验 | 真机扫码 + DevTools 375px 模拟 | 汉堡菜单、sandbox、battle 图表正常 |
| 7 | 异常处理 | 不存在 ID / 并发 5 tab / 慢网络 | 404 行为正确,无崩溃 |
| 8 | 正式开放 | 短链 + 微信群/贴吧 + 监控 1h | 用户开始访问,日志无 5xx |

---

## 关键 8 个核心路由 URL

部署后用户必点的 8 个 URL(把 `<domain>` 替换成实际 Vercel 域名):

```
1. https://<domain>/                      首页
2. https://<domain>/generals              50 武将列表
3. https://<domain>/skills                50 战法列表(6 subType Tab)
4. https://<domain>/lineups               15 阵容列表
5. https://<domain>/sandbox               配将模拟器
6. https://<domain>/battle                模拟交战入口
7. https://<domain>/traits                5 特技列表
8. https://<domain>/search                全站搜索(试试搜"诸葛")
```

### 必看的 3 个示例详情页

```
9. https://<domain>/generals/zhuge_liang  诸葛亮详情
10. https://<domain>/skills/qi_xing_zhen  战法详情
11. https://<domain>/lineups/shu_qiang    蜀枪阵容详情
```

### 4 个必查的 SEO / 系统路由

```
12. https://<domain>/sitemap.xml          应该有 124 个 URL
13. https://<domain>/robots.txt           应有 Sitemap 指向
14. https://<domain>/generals/non_exist   应返回 404
15. https://<domain>/lineups/non_exist    应返回 404
```

---

## 详细文档在哪里

完整 8 阶段 + FAQ + 验证脚本:见 `docs/post-deploy-checklist.md`(约 350 行)。

---

## 验收口径

执行完所有阶段后,用户应能在 1 小时内确认:
- ✅ 站点主流程跑通(列表 → 详情 → 模拟器 → 搜索)
- ✅ 性能 / SEO 基线达标
- ✅ 移动端体验正常
- ✅ 异常行为符合预期
- ✅ 已正式开放,玩家群/贴吧已经知道

如果某项失败,详见 `docs/post-deploy-checklist.md` 的 FAQ(Q1–Q8)。

---

**S5 阶段完成。** 等用户跑完冒烟后,本项目即可视为 S5–S6(Smoke + 上线)全部交付。
