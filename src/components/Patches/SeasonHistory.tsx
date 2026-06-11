/**
 * F9 版本特性 — 赛季历史(server component)
 *
 * 列 S1/S2/S3/PK 赛季的简介。属于相对稳定的事实性信息,
 * MVP 阶段 hard-code 在组件里,不进 data/。
 *
 * 排序:从最早 S1 到最新 PK(玩家期望从老看到新)。
 */
export interface SeasonEntry {
  /** 赛季编号(显示用) */
  season: string;
  /** 赛季中文名 */
  name: string;
  /** 1-2 句简介 */
  summary: string;
  /** 1-3 个关键词标签 */
  tags: string[];
}

const SEASONS: ReadonlyArray<SeasonEntry> = [
  {
    season: "S1",
    name: "群雄逐鹿",
    summary:
      "《三国志·战略版》首个正式赛季,确立了大地图、同盟作战、资源州推进的核心玩法,武将红度与战法等级首次影响实战。",
    tags: ["起步", "群雄割据", "经典剧本"],
  },
  {
    season: "S2",
    name: "金戈铁马",
    summary:
      "在 S1 基础上加入「金珠」交易与军屯系统,资源州争夺白热化;桃园盾、五虎枪等蜀国阵容首次成为 T0 标杆。",
    tags: ["金珠交易", "军屯", "桃园盾"],
  },
  {
    season: "S3",
    name: "三战之王",
    summary:
      "新增「世家」与「军功」玩法,同盟协作维度更深;魏盾、吴弓、群弓三足鼎立,玩家首次面对跨阵营组合的克制难题。",
    tags: ["世家", "军功", "魏盾"],
  },
  {
    season: "PK 赛季",
    name: "兴平烽火",
    summary:
      "当前赛季。回归群雄割据剧本,所有玩家共享大地图,同盟重新跑马圈地;新增「烽火台」玩法,7 天结算一次,占据烽火台的同盟全队资源 +5%。",
    tags: ["群雄割据", "烽火台", "当前赛季"],
  },
];

export interface SeasonHistoryProps {
  /** 当前赛季的标记 — 默认 "PK 赛季" */
  currentSeason?: string;
}

export function SeasonHistory({
  currentSeason = "PK 赛季",
}: SeasonHistoryProps) {
  return (
    <ol
      aria-label="赛季历史"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {SEASONS.map((s) => {
        const isCurrent = s.season === currentSeason;
        return (
          <li
            key={s.season}
            className={
              "relative rounded-lg border bg-card/80 p-4 shadow-sm transition-colors " +
              (isCurrent
                ? "border-accent-red/60 ring-1 ring-accent-red/30"
                : "border-line/60 hover:border-primary/40")
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-wider text-ink-soft">
                {s.season}
              </span>
              {isCurrent && (
                <span className="rounded bg-accent-red px-2 py-0.5 text-[10px] font-semibold tracking-wider text-bg-cream">
                  CURRENT
                </span>
              )}
            </div>
            <h3 className="mt-2 font-serif text-lg font-semibold text-primary">
              {s.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{s.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-bg-cream/60 px-2 py-0.5 text-[11px] text-ink-soft"
                >
                  {t}
                </span>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
