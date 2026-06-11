# Deliverable — data-schema

> 项目内联版本,详细版本见:
> `C:\Users\Administrator\.mavis\plans\plan_a0d0d96c\outputs\data-schema\deliverable.md`

## Summary

为三战配将项目建立了完整的数据层基础设施:8 个实体的 TypeScript 类型(用 `z.infer` 从 Zod schema 推导,无重复定义)+ 8 个 Zod schemas + 8 个带运行时校验的文件加载函数 + Vitest 单元测试。`tsc --noEmit` 0 错误,18/18 测试通过。

## Changed files

### 创建(数据层源文件 + 测试)
- `src/lib/data/schemas.ts` — 8 个实体 Zod schemas + 10 个共享 enum + 7 个 array 校验 schema
- `src/lib/data/loader.ts` — 通用 `loadAndValidate<T>()` + 8 个加载函数(loadGenerals/Skills/Lineups/Traits/Items/Patches/Tactics/SimConfig) + `clearLoaderCache()`
- `src/lib/data/loader.test.ts` — Vitest 单元测试(18 个用例)
- `src/types/data.ts` — 8 个实体类型 + 共享 enum 类型,全部用 `export type` 从 schema 推导

### 创建(8 个空数据文件)
- `data/generals.json` — `[]`
- `data/skills.json` — `[]`
- `data/tactics.json` — `[]`
- `data/lineups.json` — `[]`
- `data/traits.json` — `[]`
- `data/items.json` — `[]`
- `data/patches.json` — `[]`
- `data/sim-config.json` — PRD §8.8 默认单对象(iterations=1000、triggerRate、troopCounter、campBonus)

### 修改
- `package.json` — `dependencies` 加上 `"zod": "^3.23.8"`

## 验证结果

| 检查项 | 结果 |
|--------|------|
| `pnpm tsc --noEmit` | ✅ 0 错误(exit 0) |
| `pnpm test` (Vitest 18 用例) | ✅ 18/18 通过 |
| 8 个类型导出 (`General/Skill/Tactics/Lineup/Trait/Item/Patch/SimConfig`) | ✅ |
| 8 个 Zod schema 导出 | ✅ |
| 8 个加载函数 | ✅ |
| 8 个 JSON 文件存在(7 空数组 + 1 单对象) | ✅ |

## 关键设计

1. **schema 是单一可信源** — types 用 `z.infer` 推导,改字段只改一处
2. **safeParse 优于 parse** — 错误信息含字段路径,可读性好
3. **loadAndValidate 通用化** — 用 `z.ZodType<T>` 泛型约束
4. **空文件不炸** — 文件不存在时返回 fallback `[]`,校验失败才抛错
5. **`DATA_DIR` 环境变量** — 单测里可指向临时目录验证错误路径
6. **module-level 缓存** — 8 个加载函数单例缓存,`clearLoaderCache()` 重置

## Notes for verifier

- 详细版本和验证脚本见 `C:\Users\Administrator\.mavis\plans\plan_a0d0d96c\outputs\data-schema\deliverable.md`
- 严格工作边界:我只写 `src/types/`、`src/lib/data/`、`data/` 和 `package.json` 的 dependencies 字段
- 机器原本无 node/pnpm,我下载 `node-v20.18.0-win-x64` 放在 `.tools/`(本地验证用,不应 commit,建议 `.gitignore` 加 `.tools/`)
- 实际安装 zod 走 `pnpm add zod`(已在 package.json 里写好,依赖锁文件由后续 session 写入)
- 如果 `pnpm build` 报别的文件 type error,**那不是我的范围**(scaffold/ci-docs 各自负责)
