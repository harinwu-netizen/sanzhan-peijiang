/**
 * F3 配将模拟器 — 小组件工具
 */

/** 拼接 className,过滤 falsy 值。比 clsx 小,够用即可。 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
