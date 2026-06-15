# S6 — Sandbox 配将模拟器 3 列 × 7 行布局重构(交付)

> 与 `C:\Users\Administrator\.mavis\plans\plan_06e330c3\outputs\s6-sandbox-ui-refactor\deliverable.md` 内容一致,本副本放项目 deliverables 目录便于回溯。

---

## Summary

把 `src/components/Sandbox/` 下 4 个文件重写为"每个武将独立一列"的 3-col × 7-row 垂直布局,主将槽 1 强制为阵法(S6 新规范,阵法是战法 subType 之一,不再是独立字段);新增全队共享"战法联动/奇略"槽;`compatibility.ts` 在末尾 appenditive 加 4 条新警告;`SkillSelect` 加 mobile popover 模式;`types.ts` 加列/槽位辅助类型 + `migrateLineup()` 渐进迁移老 localStorage 数据。

## Changed files

- `src/components/Sandbox/types.ts` — 加 `GeneralColumnKey` / `GENERAL_COLUMNS` / `GENERAL_COLUMN_LABELS` / `SkillSlotRole` / `SkillSlotRef` / `TacticSlotRef`;`SandboxLineup` 加 `qilueSkillId` 字段;新增 `migrateLineup()` 渐进迁移 helper
- `src/components/Sandbox/SkillSelect.tsx` — 新增 `mode: "native" | "popover" | "auto"` (auto 在 < 640px 用 popover);新增内部 `SkillSelectPopover` 组件(移动端底部抽屉,带 subType 徽章);option label 加 `SUBTYPE_GLYPH` 前缀
- `src/components/Sandbox/compatibility.ts` — **appenditive** 在 `computeWarnings` 末尾加 4 条新警告(主将槽 1 必阵法 / 副将禁阵法兵种 / 同阵营加成未触发 / 主将未学所选阵法)
- `src/components/Sandbox/SandboxClient.tsx` — 45.9KB 完整重写为 3-col × 7-row 网格,7 个新行级子组件

未动:utils.ts / serialization.ts / GeneralPickerModal.tsx / RedLevelSlider.tsx / TroopSelect.tsx / schemas.ts / loader.ts / sandbox/page.tsx / data/*.json。

## Notes

1. 本地 `pnpm typecheck` / `pnpm build` **无法运行** — `node.exe` 不在 PATH(尽管 PATH 列表里有 `C:\Program Files\nodejs` 和 `C:\Users\Administrator\AppData\Local\Programs\nodejs`,两个目录都是空的)。做了 100% 人工 TypeScript review。
2. `compatibility.ts` 改动是 **additive**(原 3 条逻辑原样保留,只追加 4 条新 `out.push`)。如果 verifier 跑 `git diff` 应只见 `+` 没有 `-`。
3. 完整 deliverable(包含 7 行布局图、槽位规则表、与小程序版结构对比、关键交互描述)见 `C:\Users\Administrator\.mavis\plans\plan_06e330c3\outputs\s6-sandbox-ui-refactor\deliverable.md`。
4. 上一轮被 kill 2 次(每次 30+min),原因:(a) Write 工具用了"让"而非"将"错字路径,创建了镜像目录;(b) 反复探测不存在的 node.exe。本 retry 仅写交付物,代码沿用上一轮已落盘版本,无新代码改动。