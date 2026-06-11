/**
 * F4 推荐阵容 — 武将头像(暂时用名字首字符圆圈)
 *
 * MVP 阶段:不依赖任何外部图片资源,直接用名字首字符 + 阵营底色做头像。
 * 后续 F4 polish 阶段可以替换为真实立绘(只改这一个组件即可)。
 */
import type { Camp, General } from "@/lib/data/schemas";
import { CAMP_BG, CAMP_BORDER, CAMP_COLOR } from "@/components/Generals/constants";

export interface GeneralAvatarProps {
  /** 武将名(优先) */
  name: string;
  /** 武将(可选,如果传了就用 general.camp 决定配色) */
  general?: General | null;
  /** 强制指定阵营(否则用 general.camp) */
  camp?: Camp;
  /** 头像大小 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 是否加红色描边(高亮主将) */
  highlight?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<GeneralAvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-14 w-14 text-xl",
};

export function GeneralAvatar({
  name,
  general,
  camp,
  size = "sm",
  highlight = false,
  className = "",
}: GeneralAvatarProps) {
  const resolvedCamp: Camp | undefined = camp ?? general?.camp;
  const ring = resolvedCamp
    ? `${CAMP_BG[resolvedCamp]} ${CAMP_COLOR[resolvedCamp]} ${CAMP_BORDER[resolvedCamp]}`
    : "bg-card text-ink-soft border-line";

  const char = name.slice(0, 1);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 font-serif font-semibold ${SIZE_CLASS[size]} ${ring} ${
        highlight ? "ring-2 ring-accent-red ring-offset-1 ring-offset-bg-cream" : ""
      } ${className}`}
      title={name}
      aria-label={name}
    >
      {char}
    </span>
  );
}
