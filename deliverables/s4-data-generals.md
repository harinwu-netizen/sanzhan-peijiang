# S4-Data: 武将 5→50 扩容交付

## Summary
将 `data/generals.json` 从 5 个武将(全部蜀国)扩到 50 个,覆盖魏 13 / 蜀 15 / 吴 13 / 群 9 四个阵营,新增 5 个 SP 武将,品质分布 40 橙 + 8 紫 + 2 蓝。同时新增 `src/lib/data/__tests__/generals.schema.test.ts`,31 个测试全部通过,验证 4 维属性范围 / id 唯一 / camp 分布 / SP 数 / 既有 5 蜀将保留 / 新 selfSkillId 不冲突既有 19 skill id。

## 武将总数 / 阵营 / 品质 / SP

| 指标 | 值 | 任务要求 |
|---|---|---|
| 总数 | 50 | = 50 ✓ |
| 魏 | 13 | ≥ 12 ✓ |
| 蜀 | 15 | ≥ 13 ✓ |
| 吴 | 13 | ≥ 12 ✓ |
| 群 | 9 | ≥ 8 ✓ |
| SP | 5 | ≥ 5 ✓ |
| 橙 | 40 | = 40 ✓ |
| 紫 | 8 | ≥ 8 ✓ |
| 蓝 | 2 | ≥ 2 ✓ |

### 4 维属性范围(全 50 条)
- 武力: 50–210
- 智力: 48–188
- 统率: 88–175
- 速度: 45–92

武力型示例: 张飞 165 / 关羽 175 / 吕布 200 / 典韦 ~190 / 许褚 ~180 — 均 ≥160
智力型示例: 诸葛亮 156 / 司马懿 178 / 郭嘉 165 — 均 ≥150
防御型示例: 曹操 156 / 刘备 130 / 华佗 135 — 均 ≥110

### 5 个 SP 武将(name 以 "SP " 前缀,isSP=true)
1. `sp_zhuge_liang` — SP 诸葛亮 (蜀 橙)
2. `sp_guan_yu` — SP 关羽 (蜀 橙)
3. `sp_cao_cao` — SP 曹操 (魏 橙)
4. `sp_zhou_yu` — SP 周瑜 (吴 橙)
5. `sp_lv_bu` — SP 吕布 (群 橙)

### ID 唯一性
- 50 个 general id 全部 snake_case 且唯一
- 50 个 selfSkillId 全部唯一,不与既有 19 个 skill id 冲突
- 47 个非空 inheritSkillId 涵盖 30 个唯一 id(部分传承可被多个武将共享,符合三战原游戏机制)

### 阵法引用
新武将共引用 7 个阵法 id(允许重复):
- `wu_feng_zhen` (既有)
- `feng_shi_zhen` (新)
- `ba_gua_zhen` (新)
- `yan_xing_zhen` (新)
- `yu_lin_zhen` (新)
- `he_yi_zhen` (新)
- `da_yan_zhen` (新)

## 5 个示例新增武将完整 JSON

### 1. 曹操 (魏 / 橙) — 防御型主将
```json
{
  "id": "cao_cao",
  "name": "曹操",
  "camp": "魏",
  "quality": "橙",
  "stats": {
    "武力": 92,
    "智力": 110,
    "统率": 156,
    "速度": 50
  },
  "cavalry": "S",
  "shield": "S",
  "archer": "A",
  "spear": "S",
  "siege": "B",
  "trait": "指挥",
  "selfSkillId": "jian_ling_jun",
  "inheritSkillId": "jian_xiong_zhen",
  "redLevel": 0,
  "learnableFormationSkillIds": ["wu_feng_zhen", "feng_shi_zhen"],
  "tacticsOptions": {
    "major": ["tactic_001", "tactic_002"],
    "minor": ["tactic_101"]
  },
  "equippableTraitCount": 1
}
```

### 2. 司马懿 (魏 / 橙) — 智力型主将
```json
{
  "id": "sima_yi",
  "name": "司马懿",
  "camp": "魏",
  "quality": "橙",
  "stats": {
    "武力": 75,
    "智力": 178,
    "统率": 130,
    "速度": 45
  },
  "cavalry": "A",
  "shield": "S",
  "archer": "S",
  "spear": "A",
  "siege": "C",
  "trait": "主动",
  "selfSkillId": "fan_yu_shi_shi",
  "inheritSkillId": "yi_qi_li_ci",
  "redLevel": 0,
  "learnableFormationSkillIds": ["wu_feng_zhen", "ba_gua_zhen"],
  "tacticsOptions": {
    "major": ["tactic_001", "tactic_002"],
    "minor": ["tactic_101"]
  },
  "equippableTraitCount": 1
}
```

### 3. 黄忠 (蜀 / 橙) — 武力型输出
```json
{
  "id": "huang_zhong",
  "name": "黄忠",
  "camp": "蜀",
  "quality": "橙",
  "stats": {
    "武力": 178,
    "智力": 70,
    "统率": 115,
    "速度": 65
  },
  "cavalry": "A",
  "shield": "A",
  "archer": "S",
  "spear": "B",
  "siege": "C",
  "trait": "主动",
  "selfSkillId": "bai_la_zhui_feng",
  "inheritSkillId": "ba_men_jin_suo_zhen",
  "redLevel": 0,
  "learnableFormationSkillIds": ["wu_feng_zhen"],
  "tacticsOptions": {
    "major": ["tactic_001", "tactic_002"],
    "minor": ["tactic_101"]
  },
  "equippableTraitCount": 1
}
```

### 4. SP 诸葛亮 (蜀 / 橙) — SP 智力型
```json
{
  "id": "sp_zhuge_liang",
  "name": "SP 诸葛亮",
  "camp": "蜀",
  "quality": "橙",
  "stats": {
    "武力": 80,
    "智力": 188,
    "统率": 105,
    "速度": 50
  },
  "cavalry": "S",
  "shield": "A",
  "archer": "S",
  "spear": "A",
  "siege": "C",
  "trait": "主动",
  "selfSkillId": "qi_xing_yong_ji",
  "inheritSkillId": "bei_she_gui_che",
  "redLevel": 0,
  "learnableFormationSkillIds": ["wu_feng_zhen", "ba_gua_zhen"],
  "tacticsOptions": {
    "major": ["tactic_001", "tactic_002"],
    "minor": ["tactic_101"]
  },
  "equippableTraitCount": 1,
  "isSP": true
}
```

### 5. 吕布 (群 / 橙) — 武力 + 速度双高
```json
{
  "id": "lv_bu",
  "name": "吕布",
  "camp": "群",
  "quality": "橙",
  "stats": {
    "武力": 200,
    "智力": 50,
    "统率": 115,
    "速度": 90
  },
  "cavalry": "S",
  "shield": "S",
  "archer": "B",
  "spear": "S",
  "siege": "C",
  "trait": "被动",
  "selfSkillId": "wu_shuang_ji_duan",
  "inheritSkillId": "yi_qi_li_ci",
  "redLevel": 0,
  "learnableFormationSkillIds": ["wu_feng_zhen", "da_yan_zhen"],
  "tacticsOptions": {
    "major": ["tactic_001", "tactic_002"],
    "minor": ["tactic_101"]
  },
  "equippableTraitCount": 1
}
```

## pnpm test 输出

命令: `pnpm test src/lib/data/__tests__/generals.schema.test.ts`

```
RUN v2.1.9 E:/minimax project/三战配将

✓ src/lib/data/__tests__/generals.schema.test.ts (31 tests) 70ms

Test Files  1 passed (1)
     Tests  31 passed (31)
  Start at  15:30:47
  Duration  2.74s
```

31 个测试覆盖:
- S4 generals.json — 总数与 id 唯一(4 tests): 共50条 / id唯一 / snake_case / 既有5蜀将保留
- S4 generals.json — camp 分布(5 tests): 魏≥12 / 蜀≥13 / 吴≥12 / 群≥8 / 4 阵营全覆盖
- S4 generals.json — quality 分布(2 tests): 3 档合法 / ≥40橙+8紫+2蓝
- S4 generals.json — SP 武将(2 tests): ≥5 / name 以 "SP " 开头
- S4 generals.json — 4 维属性范围(4 tests): 0-300整数 / 武力型≥160 / 智力型≥150 / 防御型≥110
- S4 generals.json — 兵种适性合法(1 test)
- S4 generals.json — trait / selfSkillId / inheritSkillId(5 tests): trait 6类 / 既有5蜀将 selfSkillId 保持 / 新 selfSkillId 不冲突 19 既有 / inheritSkillId snake_case / 至少1个 null
- S4 generals.json — learnableFormationSkillIds & tacticsOptions(5 tests): 长度 1-2 / snake_case / major 长度 1-2 / minor ≥1 / 引用合法 tactic
- S4 generals.json — redLevel & equippableTraitCount(2 tests)
- S4 generals.json — schema 通过(1 test): 50 条全部 safeParse 成功

## Notes

- 既有 5 个蜀将(诸葛亮/刘备/张飞/关羽/赵云)id 与 selfSkillId 完全保留未改动,符合任务"现有 5 个作为基础保留不动"。
- 5 个新 SP 武将用 `name` 前缀 "SP " + `isSP: true` 标识。
- 新加 45 个 selfSkillId 和 30 个唯一 inheritSkillId 都遵循 snake_case 规则,不需要在 `data/skills.json` 里实际存在(Sprint 5 战法任务负责)。
- `learnableFormationSkillIds` 允许 1-2 项,既有 `wu_feng_zhen` 可复用,新增 6 个阵法 id 供后续 sprint 引用。
- `tacticsOptions` 全部从现有 3 个兵书 (`tactic_001`/`tactic_002`/`tactic_101`) 中选,符合要求。
- 全部 50 条 `equippableTraitCount` 统一为 1,`redLevel` 统一为 0(白板),与既有 5 条风格保持一致。
- 其他 sprint 测试 (`samples.test.ts`, `loader.test.ts`) 在跑全量 `pnpm test` 时会因同 plan 内其他任务(skills/lineups/traits/patches)的数据扩容而失败,这些**不在本任务范围内**;Sprint 5 / 其他任务需相应更新 `samples.test.ts` 的预期长度。
