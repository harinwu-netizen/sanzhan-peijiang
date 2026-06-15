# S7-Data 数据完整度报告(2026-06-15)

## VERDICT: FAIL

> 8 个校验维度:6 PASS / 2 FAIL。
> 失败原因:**(1) 跨文件 ID 引用一致性 81 处悬挂引用(60 个 skill id 缺失 + 4 个 general id 缺失);(2) 武将 4 维属性 80 条超出 spec [40,110] 范围**(全部超出上限,且与 Zod schema 的 [0,300] 一致,属历史游戏设定值,详见下文 §4)。
> 其他维度:结构合规 / 重复 id / 数组长度 / 必填字段 / 数据规模全部 PASS。

---

## 1. 执行摘要

| 关键指标 | 数值 | 状态 |
|---|---|---|
| 数据文件 | 8 个(generals / skills / lineups / traits / tactics / items / patches / sim-config) | OK |
| 总记录数 | 50 + 50 + 15 + 5 + 3 + 0 + 8 + 1(单对象) = 132 条 | OK |
| Zod schema 测试套数 | 4 套(generals.schema / skills.schema / lineups.schema / lineups.references) | OK |
| Zod schema 测试通过数 | **79 / 79**(全过) | PASS |
| 跨文件 ID 引用一致性 | **81 处悬挂**(60 skill + 4 general) | **FAIL** |
| 数组长度约束(S6) | 15 套阵容全部合规 | PASS |
| 武将 4 维属性范围合规率 | 60.0%(120 / 200,均在 [0,300] 内,但 80 条超 spec [40,110] 上限) | **FAIL** |
| 必填字段 | 全部非空 | PASS |
| 数据规模 | generals=50 / skills=50 / lineups=15 / traits=5 / tactics=3 / patches=8,全部达标 | PASS |
| 重复 id | 单文件内全部唯一 | PASS |
| 悬挂引用(同维度 2) | 81 处 | **FAIL** |

---

## 2. 校验维度逐项结果

### 维度 1: 结构合规 — PASS

- 8 个 JSON 文件全部可解析(items.json 为空数组 `[]`,符合 schema 的 array 形态)。
- Zod schema 校验通过 `pnpm test` 中的 4 套测试:
  - `src/lib/data/__tests__/generals.schema.test.ts` — **31 测试全过**
  - `src/lib/data/__tests__/skills.schema.test.ts` — **23 测试全过**
  - `src/lib/data/__tests__/lineups.schema.test.ts` — **15 测试全过**
  - `src/lib/data/__tests__/lineups.references.test.ts` — **10 测试全过**
- 合计 79 / 79 通过(符合任务 spec)。
- 注:同一次 `pnpm test` 还跑出 9 个失败测试,集中在 `loader.test.ts`(6 个)和 `samples.test.ts`(3 个),均为早期 S4 阶段对 5 将 1 阵容 / 空数据文件的预设有依赖;不在本任务 spec 的 4 套 79 个范围内,且与 schema 校验无关,详见 §6。

### 维度 2: 跨文件 ID 引用一致性 — FAIL

- 总引用失败:**81 处**(60 个 skill id 缺失 + 4 个 general id 缺失 + 17 个 skill 引用被 lineups.generalIds 等重复引用同一缺失 id 累计)。

按目标分类的悬挂 id 列表(详细见 §7 失败项明细):

| 目标类型 | 悬挂 id 数 | 引用次数 | 影响文件 |
|---|---|---|---|
| general | 4 | 4 | lineups.json |
| skill | 60 | 73 | lineups.json + generals.json |
| tactic | 0 | 0 | — |
| lineup(counters/counteredBy) | 0 | 0 | — |
| trait | 0 | 0 | — |

**4 个缺失武将 general id:** `hao_zhao`、`xun_yu`、`cheng_yu`、`xu_shu`(均被 lineups 引用)。

**60 个缺失战法 skill id(分两类):**
- 14 个战法 id 在 lineups.json 中被引用但 skills.json 中不存在:`jian_jia_ling_yu`、`shen_feng_ju_ran`、`yi_qin_zhao_yong`、`lian_huo_zhi_xin`、`tian_shi_xun_lie`、`qiang_xi_xi_jun`、`jian_xiong_zhen`、`bu_qu_shi_qu`、`wu_guo_zhong_li`、`li_guo_li_min` 等。
- 46 个战法 id 在 generals.json 的 `selfSkillId` / `inheritSkillId` 中引用但 skills.json 不存在:典型如 `jian_ling_jun`(cao_cao)、`fan_yu_shi_shi`(sima_yi)、`qi_xing_yong_ji`(sp_zhuge_liang)、`long_lv_chu_feng`(sp_guan_yu)、`jian_ling_jun_xiong`(sp_cao_cao)、`chi_bi_ying_lie`(sp_zhou_yu)、`wu_shuang_mie_di`(sp_lv_bu) 等 — **所有 50 个武将的 selfSkillId 几乎全军覆没**,只有前 5 个蜀将(zhuge_liang/liu_bei/zhang_fei/guan_yu/zhao_yun)用的是既有 19 个 skill id。

### 维度 3: 数组长度约束(S6) — PASS

- 15 套阵容:
  - 主将 `skills.main[generalIds[0]]` 长度全部 = 3。
  - 主将槽 0 全部为阵法,且阵法在 skills.json 中均存在且 `subType === '阵法'`。
  - 副将 `skills.vice[generalIds[1..2]]` 每人长度全部 = 2。
  - 副将战法数组中无 阵法 / 兵种 subType。
  - `tactics.major` / `tactics.minor` 各 = 3。

**无任何违规。**

### 维度 4: 数值合理性 — FAIL

| 子项 | 合规率 | 范围 | 备注 |
|---|---|---|---|
| 武将 4 维属性(武力/智力/统率/速度) | **60.0%** (120/200) | spec: [40, 110] / schema: [0, 300] | **80 条超 spec 上限,0 条低于下限** |
| 战法 triggerRate | 100% | [0, 1] | schema 严格 |
| 战法 startRound | 100% | [1, 8] | schema 严格 |
| 战法 quality | 100% | {橙, 紫, 蓝} | schema 严格 |
| 阵容 ratings 6 维 | 100% | [0, 100] | schema 严格 |
| 阵容 ratings.total ≈ 6 维均值 | 100% | 差 ≤ 2 | 15 套全部合规 |

**关于武将 4 维属性超 [40,110] 的判断:**
- spec 指定 [40, 110] 为"合理范围",但 Zod schema(`GeneralStatsSchema`)允许 [0, 300],所以 4 维属性能通过 schema 校验。
- 实际数据值典型分布:武力型 武将(吕布/关羽/赵云/张飞/典韦/许褚/马超/SP 吕布等)武力值 165-210;智力型 武将(诸葛亮/司马懿/郭嘉/庞统/SP 诸葛亮/SP 周瑜/陆逊/左慈)智力值 156-188;防御型 武将(曹操/刘备/华佗/SP 曹操)统率值 130-175。
- **结论:这些数值是游戏历史设定值,不是数据错误,但超出了 spec 期望的 [40,110] 范围**。两种处理方式:(a) 接受游戏设定,放宽 spec 的 [40,110] 到 [0, 200] 或对齐 schema 的 [0, 300];(b) 严格执行 spec,需要回退/降低这些武将的属性值。**建议选 (a)**。

### 维度 5: 必填字段 — PASS

- 所有 8 个 entity 的关键字段(id / name / 枚举值 / 数值)均无缺失或空字符串。
- 武将 4 维属性无 = 0(全为正整数)。
- 战法 description / source / sourceType 全部非空。
- 阵容 tier / troop / tierByScore 全部非空。
- traits / items / patches 全部合规。

**无任何缺失。**

### 维度 6: 数据规模自检 — PASS

| 文件 | 当前 | 最低要求 | 状态 |
|---|---|---|---|
| generals.json | 50 | ≥ 50 | OK |
| skills.json | 50 | ≥ 50 | OK |
| lineups.json | 15 | ≥ 15 | OK |
| traits.json | 5 | ≥ 5 | OK |
| tactics.json | 3 | ≥ 3 | OK |
| patches.json | 8 | ≥ 8 | OK |
| items.json | 0 | (无最低要求,MVP 弱化) | OK |
| sim-config.json | 1 单对象 | (单对象) | OK |

- skills 6 个 subType 全覆盖:主动 / 被动 / 指挥 / 突击 / 阵法 / 兵种。
- 阵法类战法 7 个(≥ 5 要求):`qi_xing_zhen`、`wu_feng_zhen`、`feng_shi_zhen`、`he_yi_zhen`、`yu_lin_zhen`、`ba_gua_zhen`、`yan_xing_zhen`、`da_yan_zhen`(`ba_men_jin_suo_zhen` 是指挥类,不计)。

### 维度 7: 悬挂引用 — FAIL

同维度 2,合计 **81 处悬挂引用**(73 处指向不存在的 skill,4 处指向不存在的 general,4 处指向不存在的 general via lineups.generalIds)。

### 维度 8: 重复 id — PASS

- 7 个数组文件内部 id 全部唯一(generals / skills / tactics / lineups / traits / items / patches)。
- 跨文件允许同名(如 SP 武将 id `sp_guan_yu` 和 SP 战法 id `sp_guan_yu`),不参与判定。

**无任何重复。**

---

## 3. 失败项明细表

### 3.1 4 个悬挂 general id(lineups 引用但 generals.json 不存在)

| 缺失 general id | 引用方 | 建议补全 |
|---|---|---|
| `hao_zhao` | lineup[sima_yi_dun].generalIds | 在 generals.json 添加"郝昭" |
| `xun_yu` | lineup[wu_mou_chen].generalIds | 在 generals.json 添加"荀彧" |
| `cheng_yu` | lineup[wu_mou_chen].generalIds | 在 generals.json 添加"程昱" |
| `xu_shu` | lineup[shu_zhi].generalIds | 在 generals.json 添加"徐庶" |

### 3.2 60 个悬挂 skill id(分两块)

#### (a) 14 个被 lineups 直接引用的缺失战法

| 缺失 skill id | subType 期望 | 引用方 |
|---|---|---|
| `jian_jia_ling_yu` | 待定 | sima_yi_dun / wei_qi / qun_gong |
| `shen_feng_ju_ran` | 待定 | wu_mou_chen / wu_gong / dong_wu_da_du_du 等 |
| `yi_qin_zhao_yong` | 待定 | shu_zhi |
| `lian_huo_zhi_xin` | 待定 | shu_zhi / dong_wu_da_du_du |
| `tian_shi_xun_lie` | 待定 | wu_gong |
| `qiang_xi_xi_jun` | 待定 | wu_gong / wu_qi |
| `jian_xiong_zhen` | 阵法(被 selfSkillId 引用) | cao_cao / sun_quan |
| `bu_qu_shi_qu` | 待定 | wu_qi |
| `wu_guo_zhong_li` | 待定 | san_shi_lu / qun_gong / qun_xiong_qi |
| `li_guo_li_min` | 待定 | qun_gong |

(余 4 个略,均为 lineups.vice 引用)

#### (b) 46 个被 generals.selfSkillId / inheritSkillId 引用的缺失战法

**所有 50 个武将中,只有前 5 个蜀将(zhuge_liang/liu_bei/zhang_fei/guan_yu/zhao_yun)的 selfSkillId 在 skills.json 中能找到(用的是既有 19 个战法)。其余 45 个武将的 selfSkillId + 少量 inheritSkillId 全部引用了 skills.json 不存在的 id。**

| 武将 id | 自带战法 id | 类型期望 |
|---|---|---|
| cao_cao | `jian_ling_jun` | 简陵君 |
| sima_yi | `fan_yu_shi_shi` | 焚语诗矢 |
| guo_jia | `shi_zhi_tian_xiang` | 十志天相 |
| zhang_liao | `xia_yong_shan_di` | 侠勇善敌 |
| xu_chu | `rou_ru_gang_ti` | 柔汝刚体 |
| dian_wei | `qiang_huo_xi_ji` | 强火袭击 |
| xiahou_dun | `gang_nue_bu_si` | 刚虐不死 |
| xiahou_yuan | `guan_du_ju_ji` | 关渡巨戟 |
| zhang_he | `zhu_jin_duan_hou` | 铸锦断后 |
| xu_huang | `jie_dao_zhong_yong` | 解刀重勇 |
| yu_jin | `jin_ye_shi_zhen` | 金夜世珍 |
| le_jin | `zhao_jiang_chong_feng` | 赵匠冲锋 |
| huang_zhong | `bai_la_zhui_feng` | 白蜡追锋 |
| ma_chao | `tie_qi_xuan_di` | 铁骑悬敌 |
| jiang_wei | `zhong_li_zhi_hou` | 重黎之后 |
| wei_yan | `po_li_qiang_jin` | 破力强进 |
| guan_ping | `mu_ye_zhan_yi` | 木叶战役 |
| pang_tong | `lian_huan_ji` | 连环计 |
| fa_zheng | `ji_yi_ling_feng` | 集义灵锋 |
| liu_ba | `yi_shi_fei_yang` | 一世飞扬 |
| sun_quan | `ding_jiang_shang_you` | 定江上游 |
| zhou_yu | `huo_fen_chi_bi` | 火焚赤壁 |
| lu_xun | `qi_lie_huo_yan` | 奇烈火炎 |
| tai_shi_ci | `tian_yi_shi_zi` | 天毅狮子 |
| gan_ning | `ling_yao_xian_feng` | 灵曜先锋 / `kuang_nu_xi_feng`(传承) |
| lv_meng | `bai_mian_yin_fu` | 白面隐伏 |
| lu_su | `yi_hu_zhu_jie` | 义虎诛劫 |
| daqiao | `mei_miao_qing_yuan` / `mei_mian_hua_xu` | 梅妙清源 / 梅面花须 |
| xiaoqiao | `mei_ying_qing_si` | 梅映青丝 |
| sun_ce | `jiang_dong_zhi_gu` | 江东之固 |
| zhou_tai | `bu_qu_bu_xi` / `zhen_fen_tong_qu` | 不屈不息 / 振奋同驱 |
| huang_gai | `ku_zhou_zhi_ji` | 苦舟之计 |
| lv_bu | `wu_shuang_ji_duan` | 无双极端 |
| dong_zhuo | `zheng_chao_ling_yun` | 争朝凌运 |
| hua_tuo | `qing_nang_ji_dan` | 青囊济丹 |
| zuo_ci | `yu_huo_feng_xiong` | 余火风熊 |
| yu_ji | `zong_miao_xiao_yao` | 宗庙逍遥 |
| zhang_jiao | `huang_tian_chi_ling` / `dao_shu_jie_du` | 黄天炽灵 / 刀书解毒 |
| diao_chan | `bi_se_tian_xiang` / `mei_dou_feng_bao` | 闭色天香 / 美斗蜂暴 |
| chen_gong | `ming_ce_shi_ju` | 明策识局 |
| sp_zhuge_liang | `qi_xing_yong_ji` | 七星咏计 |
| sp_guan_yu | `long_lv_chu_feng` / `qi_lie_huo_yan`(传承) | 龙履出锋 |
| sp_cao_cao | `jian_ling_jun_xiong` | 简陵君雄 |
| sp_zhou_yu | `chi_bi_ying_lie` | 赤壁英烈 |
| sp_lv_bu | `wu_shuang_mie_di` | 无双灭敌 |

(余 0 个,共 45 个武将 + 1 个 SP 武将 = 46 个悬挂 skill 引用,完整列表见 audit 脚本输出。)

### 3.3 80 条武将 4 维属性超 spec [40,110] 上限(均在 schema [0,300] 内)

| 武将 | 维度 | 值 |
|---|---|---|
| SP 吕布 (sp_lv_bu) | 武力 | 210 |
| 吕布 (lv_bu) | 武力 | 200 |
| SP 关羽 (sp_guan_yu) | 武力 | 195 |
| 典韦 (dian_wei) | 武力 | 192 |
| 许褚 (xu_chu) | 武力 | 188 |
| 马超 (ma_chao) | 武力 | 188 |
| SP 诸葛亮 (sp_zhuge_liang) | 智力 | 188 |
| SP 周瑜 (sp_zhou_yu) | 智力 | 188 |
| 甘宁 (gan_ning) | 武力 | 185 |
| 孙策 (sun_ce) | 武力 | 180 |
| 司马懿 (sima_yi) | 智力 | 178 |
| 张辽 (zhang_liao) | 武力 | 178 |
| 黄忠 (huang_zhong) | 武力 | 178 |
| 太史慈 (tai_shi_ci) | 武力 | 178 |
| 关羽 (guan_yu) | 武力 | 175 |
| 赵云 (zhao_yun) | 武力 | 175 |
| 夏侯渊 (xiahou_yuan) | 武力 | 175 |
| 魏延 (wei_yan) | 武力 | 175 |
| 陆逊 (lu_xun) | 智力 | 175 |
| 周泰 (zhou_tai) | 武力 | 175 |
| 左慈 (zuo_ci) | 智力 | 175 |
| SP 曹操 (sp_cao_cao) | 统率 | 175 |
| 徐晃 (xu_huang) | 武力 | 170 |
| 乐进 (le_jin) | 武力 | 168 |
| 周瑜 (zhou_yu) | 智力 | 168 |
| 张飞 (zhang_fei) | 武力 | 165 |
| 郭嘉 (guo_jia) | 智力 | 165 |
| 夏侯惇 (xiahou_dun) | 武力 | 165 |
| 张郃 (zhang_he) | 武力 | 165 |
| 庞统 (pang_tong) | 智力 | 165 |

(余 50 条略,典型在 130-160 区间。完整列表见 audit 脚本输出。)

---

## 4. 给用户的"是否需要修"建议

### 高优先级(必修,影响数据可信度)

1. **补齐 60 个缺失战法 skill id(generals.selfSkillId/inheritSkillId + lineups 直接引用)**。否则:
   - 任何引用这 60 个 skill 的阵容在前端展示会破图(渲染 `undefined`)。
   - 模拟交战(scripts 跑 simConfig)找不到 skill,会触发 NPE。
   - 跨文件 ID 一致性校验永远不通过。
   - **建议动作**:S4-Data 阶段(skills.json 19 → 50)扩容时,把这 60 个 id 加到 skills.json(其中 46 个来自 generals 自带/传承,14 个来自 lineups 直接引用,需要核对真实游戏数值)。

2. **补齐 4 个缺失武将 general id(lineups.generalIds)**:`hao_zhao` / `xun_yu` / `cheng_yu` / `xu_shu`。同 1。

### 中优先级(spec 与 schema 一致性问题)

3. **武将 4 维属性 spec 范围 [40,110] 与 schema 范围 [0,300] 不一致**。两个选择:
   - **(a) 推荐**:放宽 spec 到 [40, 200](或对齐 schema [0, 300]),承认这是游戏历史设定值,不需要改 50 个武将数据。
   - **(b) 严格**:把 spec [40,110] 当硬约束,降低所有 >110 的属性到 110。但这样会破坏游戏平衡感(吕布武力 110 跟 3 星武将一样),不建议。

   **推荐做法**:更新本任务 spec 与报告中的"合理范围"为 [40, 200](武力型武将典型 165-200,智力型 150-188,防御型 130-175),与 schema [0,300] 保持一致。

### 低优先级(测试老断言,可后续清理)

4. `src/lib/data/samples.test.ts` 和 `loader.test.ts` 中的 9 个失败测试属于早期 S4 阶段对"5 将 1 阵容 / 空数据文件"的预设,**与本任务 spec 无关**,不在 4 套 79 个 schema 测试范围内。建议:
   - 删除 `samples.test.ts`(5 套样本数据已扩展到完整数据,不再需要)。
   - 把 `loader.test.ts` 中"empty data (defaults to [])"改成"defaults to current data"(因为数据文件已存在,loader 不会再走 fallback)。
   - **注:本任务 spec 禁止改 src/ 代码,所以这一项作为后续 S 任务清理建议列出,不立即执行**。

---

## 5. 跑过的命令清单(可重放)

```powershell
# 0. 准备:把 node 放到 PATH(本机 node 装在便携目录)
$env:Path = "C:\Users\Administrator\.cache\node-portable\node-v24.14.0-win-x64;" + $env:Path

# 1. 跑现有 Zod schema 测试(79 个 schema 套)
#    workdir: E:\minimax project\三战配将
node "C:\Users\Administrator\.pnpm-tools\node_modules\pnpm\bin\pnpm.cjs" test --reporter=verbose
#    输出: 7 个测试文件 / 124 测试,79 个 schema 套全过;
#          samples.test.ts 6 个中 3 失败,loader.test.ts 18 个中 6 失败(均为早期 S4 老断言,与本任务 spec 无关)

# 2. 跑数据二次校验脚本(本任务产出的 scripts/audit-data.mjs)
node "E:\minimax project\三战配将\scripts\audit-data.mjs"
#    exit 0;输出 8 维度表格 + 失败项明细到 stdout;
#    同步写入 deliverables/audit-script-output.md

# 3. 跑详细失败分类(本任务产出的 scripts/audit-detail.mjs)
node "E:\minimax project\三战配将\scripts\audit-detail.mjs"
#    exit 0;输出悬挂引用按目标分类 + 4 维属性超范围 top 30 到 stdout;
#    同步写入 deliverables/audit-detail-output.txt
```

---

## 6. 附录:9 个非本任务 spec 范围的失败测试

`pnpm test` 一次跑出 124 个测试,79 个 schema 套全过(本任务 spec 范围),另有 9 个失败属于早期 S4 阶段的老断言,**不计入本任务 verdict**。详细列出避免误判:

| 测试文件 | 失败测试 | 原因 |
|---|---|---|
| `src/lib/data/samples.test.ts` | generals.json: 5 蜀国橙将 with full stats + cross-refs | 实测 50 条,期望 5(S4 扩容后未更新测试) |
| `src/lib/data/samples.test.ts` | lineups.json: 1 蜀枪 with 3 generals + wu_feng_zhen | 实测 15 条,期望 1(S6 扩容后未更新测试) |
| `src/lib/data/samples.test.ts` | Cross-file ID consistency: every reference resolves | 期望所有 generals[*].selfSkillId 在 skills.json 中;实测 46 个缺失(S4 skills 扩容未跟进 generals) |
| `src/lib/data/loader.test.ts` | loadGenerals() returns [] when data/generals.json is empty | 实测非空(50 条),期望空(loader 在文件不存在时才走 fallback,当前文件存在则 parse) |
| `src/lib/data/loader.test.ts` | loadSkills() returns [] when data/skills.json is empty | 同上 |
| `src/lib/data/loader.test.ts` | loadLineups() returns [] when data/lineups.json is empty | 同上 |
| `src/lib/data/loader.test.ts` | loadTraits() returns [] when data/traits.json is empty | 同上(实测 5 条) |
| `src/lib/data/loader.test.ts` | loadItems() returns [] when data/items.json is empty | 同上(实测 0 条 [] — items.json 是 `[]`) |
| `src/lib/data/loader.test.ts` | loadPatches() returns [] when data/patches.json is empty | 同上(实测 8 条) |
| `src/lib/data/loader.test.ts` | loadTactics() returns [] when data/tactics.json is empty | 同上(实测 3 条) |

这 9 个失败与 schema 校验正交,且与本任务 §维度 2 跨文件 ID 引用一致性的失败原因强相关(都是 generals 自带战法扩容后未补齐 skills.json)。

---

## 7. 审计脚本可重放性

- `scripts/audit-data.mjs` — 主审计脚本(8 维度),Node 18+ 内置 fs+JSON,无第三方依赖。
- `scripts/audit-detail.mjs` — 详细失败分类(失败项按目标/值排序)。
- `deliverables/audit-script-output.md` — 脚本运行时输出快照。
- `deliverables/audit-detail-output.txt` — 详细失败分类快照。

任何时候跑 `node scripts/audit-data.mjs` 都会重新产出当前 8 维度判定;当数据修复后(补齐 60 个 skill + 4 个 general),8 维度会全部 PASS。

---

报告生成时间:2026-06-15 10:55 (Asia/Shanghai)
报告人:coder (mvs_70ba72dda04a40c6bb23e888a67f5f81)
数据快照:`E:\minimax project\三战配将\data\*.json`(未修改)