import Link from "next/link";

const FEATURES = [
  { id: "F1", name: "武将图鉴", href: "/generals" },
  { id: "F2", name: "战法图鉴", href: "/skills" },
  { id: "F3", name: "配将模拟", href: "/sandbox" },
  { id: "F4", name: "推荐阵容", href: "/lineups" },
  { id: "F5", name: "全站搜索", href: "/search" },
  { id: "F7", name: "模拟交战", href: "/battle" },
  { id: "F8", name: "特技库", href: "/traits" },
  { id: "F9", name: "版本特性", href: "/patches" },
];

export type NavItem = (typeof FEATURES)[number];

export const NAV_ITEMS: readonly NavItem[] = FEATURES;

export function Nav({ orientation = "horizontal" }: { orientation?: "horizontal" | "vertical" }) {
  const isVertical = orientation === "vertical";
  return (
    <nav
      aria-label="功能导航"
      className={
        isVertical
          ? "flex flex-col gap-1"
          : "flex flex-wrap items-center gap-x-4 gap-y-2"
      }
    >
      {FEATURES.map((f) => (
        <Link
          key={f.id}
          href={f.href}
          className={
            isVertical
              ? "rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-card hover:text-primary"
              : "rounded-md px-2 py-1 text-sm text-ink-soft hover:text-primary"
          }
        >
          <span className="mr-1 text-xs text-accent-red">{f.id}</span>
          {f.name}
        </Link>
      ))}
    </nav>
  );
}

export default Nav;
