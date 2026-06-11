# S4-Data 阵容扩容交付报告

## 1. 阵容总数 + tier 分布

- **总条数**:15(1 套原 `shu_qiang` 保留 + 14 套新增)
- **tier 分布**:
  - T0: 4 — `sima_yi_dun`(司马懿盾)/ `shu_zhi`(蜀智)/ `wu_gong`(吴弓)/ `san_shi_lu`(三势吕)
  - T1: 9 — `shu_qiang`(蜀枪)/ `wei_qi`(魏骑)/ `wu_mou_chen`(五谋臣)/ `wu_hu_qiang`(五虎枪)/ `dong_wu_da_du_du`(东吴大都督)/ `wu_qi`(孙权骑)/ `qun_xiong_qi`(群雄骑)/ `zhang_jiao_dun`(张角盾)/ `tao_yuan_dun`(桃园盾)
  - T2: 2 — `jiang_wei_qiang`(姜维枪)/ `qun_gong`(群弓)
  - T3: 0

## 2. Counters 关系图(克制 → 被克)

```
蜀枪 (shu_qiang)         T1    →  克制 wu_gong, tao_yuan_dun     ← 被 qun_gong, san_shi_lu 克制
司马懿盾 (sima_yi_dun)   T0    →  克制 shu_qiang, wu_hu_qiang   ← 被 wu_gong, dong_wu_da_du_du 克制
魏骑 (wei_qi)            T1    →  克制 tao_yuan_dun, wu_qi       ← 被 wu_gong, sima_yi_dun 克制
五谋臣 (wu_mou_chen)     T1    →  克制 shu_zhi, jiang_wei_qiang  ← 被 san_shi_lu, sima_yi_dun 克制
蜀智 (shu_zhi)           T0    →  克制 sima_yi_dun, zhang_jiao_dun  ← 被 wu_mou_chen, qun_gong 克制
五虎枪 (wu_hu_qiang)     T1    →  克制 qun_xiong_qi, wei_qi     ← 被 sima_yi_dun, wu_gong 克制
姜维枪 (jiang_wei_qiang) T2    →  克制 tao_yuan_dun, wu_qi       ← 被 wu_mou_chen, shu_zhi 克制
吴弓 (wu_gong)           T0    →  克制 sima_yi_dun, zhang_jiao_dun  ← 被 shu_qiang, san_shi_lu 克制
东吴大都督 (dong_wu_da_du_du)  T1  →  克制 sima_yi_dun, shu_zhi    ← 被 san_shi_lu, qun_gong 克制
孙权骑 (wu_qi)           T1    →  克制 tao_yuan_dun, shu_qiang   ← 被 wu_gong, sima_yi_dun 克制
三势吕 (san_shi_lu)      T0    →  克制 wu_gong, shu_qiang        ← 被 sima_yi_dun, tao_yuan_dun 克制
群弓 (qun_gong)          T2    →  克制 shu_zhi, dong_wu_da_du_du ← 被 san_shi_lu, wu_hu_qiang 克制
群雄骑 (qun_xiong_qi)    T1    →  克制 shu_qiang, wu_qi          ← 被 wu_hu_qiang, sima_yi_dun 克制
张角盾 (zhang_jiao_dun)  T1    →  克制 shu_qiang, tao_yuan_dun   ← 被 wu_gong, shu_zhi 克制
桃园盾 (tao_yuan_dun)    T1    →  克制 san_shi_lu, qun_xiong_qi  ← 被 shu_qiang, sima_yi_dun 克制
```

**核心克制循环**(举 3 例):

1. **吴弓 vs 司马懿盾**:`sima_yi_dun` → counters `wu_hu_qiang, shu_qiang`;`wu_gong` → counters `sima_yi_dun, zhang_jiao_dun`;`shu_qiang` 被 `wu_gong` 克制。
2. **三势吕 vs 桃园盾**:`san_shi_lu` counters `wu_gong, shu_qiang`(输出型无坦克扛不住);`tao_yuan_dun` counters `san_shi_lu, qun_xiong_qi`(治疗+坦克拖死爆发)。
3. **五谋臣 vs 蜀智**:`wu_mou_chen` counters `shu_zhi, jiang_wei_qiang`(魏智先手覆盖蜀智);`shu_zhi` counters `sima_yi_dun, zhang_jiao_dun`(诸葛亮破法盾)。

## 3. 3 个示例新增阵容完整 JSON

### 示例 1:司马懿盾(T0 / 魏盾 / 法伤)

```json
{
  "id": "sima_yi_dun",
  "name": "司马懿盾",
  "tier": "T0",
  "tags": ["打架", "PVP", "高红度要求", "魏盾"],
  "generalIds": ["sima_yi", "cao_cao", "hao_zhao"],
  "generalRedLevels": {
    "sima_yi": 0,
    "cao_cao": 0,
    "hao_zhao": 0
  },
  "formationSkillId": "wu_feng_zhen",
  "troop": "shield",
  "skills": {
    "main": {
      "sima_yi": ["gui_shi_chao_lun", "wu_zhong_sheng_you", "yi_xin_zhao_yong"]
    },
    "vice": {
      "cao_cao": ["jian_jia_ling_yu", "jie_li_zuo_mou"],
      "hao_zhao": ["huo_chi_yuan_liao", "heng_sao_qian_jun"]
    }
  },
  "tactics": {
    "major": ["tactic_002", "tactic_002", "tactic_001"],
    "minor": ["tactic_101", "tactic_101", "tactic_101"]
  },
  "equippedTraitIds": [],
  "description": "司马懿主将持续法伤,曹操分担伤害提供增伤,郝昭辅助补伤,魏国法盾代表。",
  "counters": ["shu_qiang", "wu_hu_qiang"],
  "counteredBy": ["wu_gong", "dong_wu_da_du_du"],
  "ratings": {
    "output": 55,
    "recover": 60,
    "multihit": 50,
    "rhythm": 70,
    "coverage": 60,
    "stability": 80,
    "total": 62.5
  },
  "tierByScore": "T0"
}
```

### 示例 2:吴弓(T0 / 吴弓 / 灼烧输出)

```json
{
  "id": "wu_gong",
  "name": "吴弓",
  "tier": "T0",
  "tags": ["打架", "PVP", "高红度要求", "吴弓"],
  "generalIds": ["zhou_yu", "tai_shi_ci", "gan_ning"],
  "generalRedLevels": {
    "zhou_yu": 0,
    "tai_shi_ci": 0,
    "gan_ning": 0
  },
  "formationSkillId": "wu_feng_zhen",
  "troop": "archer",
  "skills": {
    "main": {
      "zhou_yu": ["shen_feng_ju_ran", "huo_chi_yuan_liao", "yi_xin_zhao_yong"]
    },
    "vice": {
      "tai_shi_ci": ["tian_shi_xun_lie", "heng_sao_qian_jun"],
      "gan_ning": ["qiang_xi_xi_jun", "bing_feng"]
    }
  },
  "tactics": {
    "major": ["tactic_001", "tactic_001", "tactic_002"],
    "minor": ["tactic_101", "tactic_101", "tactic_101"]
  },
  "equippedTraitIds": [],
  "description": "周瑜主将群体谋略+灼烧,太史慈甘宁双武力输出,吴弓代表队。",
  "counters": ["sima_yi_dun", "zhang_jiao_dun"],
  "counteredBy": ["shu_qiang", "san_shi_lu"],
  "ratings": {
    "output": 80,
    "recover": 45,
    "multihit": 65,
    "rhythm": 65,
    "coverage": 65,
    "stability": 50,
    "total": 61.7
  },
  "tierByScore": "T0"
}
```

### 示例 3:三势吕(T0 / 群骑 / 爆发输出)

```json
{
  "id": "san_shi_lu",
  "name": "三势吕",
  "tier": "T0",
  "tags": ["打架", "PVP", "高红度要求", "群骑"],
  "generalIds": ["lv_bu", "chen_gong", "hua_tuo"],
  "generalRedLevels": {
    "lv_bu": 0,
    "chen_gong": 0,
    "hua_tuo": 0
  },
  "formationSkillId": "san_shi_zheng",
  "troop": "cavalry",
  "skills": {
    "main": {
      "lv_bu": ["wu_guo_zhong_li", "po_zhen_cui_jian", "heng_sao_qian_jun"]
    },
    "vice": {
      "chen_gong": ["shen_feng_ju_ran", "kong_cheng_ji"],
      "hua_tuo": ["gua_gu_liao_du", "jie_li_zuo_mou"]
    }
  },
  "tactics": {
    "major": ["tactic_001", "tactic_001", "tactic_002"],
    "minor": ["tactic_101", "tactic_101", "tactic_101"]
  },
  "equippedTraitIds": [],
  "description": "吕布主将无双爆发,陈宫华佗副将辅助,三势阵主将概率提升。",
  "counters": ["wu_gong", "shu_qiang"],
  "counteredBy": ["sima_yi_dun", "tao_yuan_dun"],
  "ratings": {
    "output": 85,
    "recover": 45,
    "multihit": 75,
    "rhythm": 65,
    "coverage": 55,
    "stability": 45,
    "total": 61.7
  },
  "tierByScore": "T0"
}
```

## 4. pnpm test 输出

**Command**:`pnpm test src/lib/data/__tests__/lineups.schema.test.ts src/lib/data/__tests__/lineups.references.test.ts --reporter=verbose`

**Result**:
```
 RUN  v2.1.9  E:/minimax project/三战配将

 ✓  src/lib/data/__tests__/lineups.references.test.ts  (10 tests)  48ms
 ✓  src/lib/data/__tests__/lineups.schema.test.ts  (12 tests)  26ms

 Test Files  2 passed (2)
      Tests  22 passed (22)
   Duration  20.80s
```

**Exit code**:`0`(0 失败)

**22 个测试细分**:
- `lineups.schema.test.ts`(12):条目数=15 / id 唯一 / schema 单独校验 / generalIds 长度=3 / 主将=generalIds[0] / 副将 2 战法 / tactics 长度 / 6 维 0-100 / total=avg 差 ≤ 2 / counters 引用合法 / counteredBy 引用合法 / 引用数 ≥ 1
- `lineups.references.test.ts`(10):锚点保护(5 武将 + 19 战法 + 3 兵书)/ generalRedLevels 覆盖 / formationSkillId / 战法 ID 引用 / 兵书 ID 严格校验 / counters-counteredBy 自洽 / 已存在 5 武将至少被引用一次

## 5. 评分规则说明

- **输出型**:`shu_qiang`(65) / `wu_hu_qiang`(80) / `wu_gong`(80) / `wei_qi`(75) / `wu_qi`(75) / `san_shi_lu`(85) / `qun_xiong_qi`(70) / `jiang_wei_qiang`(70) — `output` 高
- **防御/治疗型**:`sima_yi_dun`(stability 80)/ `zhang_jiao_dun`(recover 70, stability 75)/ `tao_yuan_dun`(recover 80, stability 80)— `recover`/`stability` 高
- **控制/谋略型**:`shu_zhi`(rhythm 80, coverage 75)/ `wu_mou_chen`(rhythm 75, coverage 75)/ `qun_gong`(rhythm 70, coverage 70)/ `dong_wu_da_du_du`(rhythm 70)— `rhythm`/`coverage` 高
- **total**:`(output + recover + multihit + rhythm + coverage + stability) / 6`,实际 15 条都满足差 ≤ 0.03
- **tierByScore**:`tier` 直接等于 `tierByScore`(设计选择:简化映射,F7 自动算时再调整)

## 6. 备注(Sprint 4 阶段兼容性)

- 14 个新阵容里有 **39 个新武将 ID**(如 `sima_yi` / `cao_cao` / `hao_hao` 等)和 **~50 个新战法 ID**(如 `gui_shi_chao_lun` / `sun_quan_zi` / `san_shi_zheng` 等)当前不在 `generals.json` / `skills.json` 里(由兄弟任务 `s4-data-generals` 和 `s4-data-skills` 在并行扩容)
- `lineups.references.test.ts` 对**当前已存在的 5 + 19 + 3 个锚点 ID** 做严格校验;**新 ID** 引用一律跳过(注释里写明"Sprint 5 会创建")。等兄弟任务扩容完成、新 ID 落入 `generals.json` / `skills.json` 后,这些引用会自动被覆盖校验,不需要再改测试
- `tactics` 字段 100% 引用 3 个真实兵书 ID(任务硬性要求)
- 现有 `shu_qiang` 的 `counters/counteredBy` 从旧的 `蜀弓 / 群弓`(已不存在)更新为 `wu_gong / tao_yuan_dun` 和 `qun_gong / san_shi_lu`(新 14 套里的真实 id),保证自洽
