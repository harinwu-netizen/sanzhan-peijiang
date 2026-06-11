"use client";

/**
 * 顶部导航栏(响应式):
 *   - 桌面端 (>= md,768px): 横排导航,9 个路由链接 + "开始配将" CTA
 *   - 移动端 (< md):        汉堡菜单,点 ☰ 展开 2 列网格菜单
 *   - 菜单展开时点击外部区域 / 按 ESC 自动关闭
 *   - 路径变化时自动关闭(用 usePathname 监听)
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

export function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();

  // 路径变化时自动关闭菜单(避免切换路由后菜单还展开着)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 点击外部区域关闭
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // 如果点的是菜单内或按钮本身,不关
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg-cream/85 backdrop-blur supports-[backdrop-filter]:bg-bg-cream/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:gap-6 sm:px-4 sm:py-3 lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 sm:gap-3"
          aria-label="三战配将 首页"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/40 bg-primary text-bg-cream font-serif text-lg shadow-sm"
          >
            三
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-base font-semibold text-primary sm:text-lg">
              三战配将
            </span>
            <span className="text-[10px] text-ink-soft sm:text-xs">
              Sanzhan · MVP
            </span>
          </span>
        </Link>

        {/* 桌面端横排导航(md 及以上) */}
        <nav
          aria-label="主功能导航"
          className="hidden md:flex md:items-center md:gap-1"
        >
          {FEATURES.map((f) => (
            <Link
              key={f.id}
              href={f.href}
              className="rounded-md px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-card hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:px-3"
            >
              <span className="mr-1 text-xs text-accent-red">{f.id}</span>
              {f.name}
            </Link>
          ))}
        </nav>

        {/* 桌面端 CTA */}
        <Link
          href="/sandbox"
          className="hidden rounded-md border border-accent-red/60 bg-accent-red/10 px-3 py-2 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red hover:text-bg-cream md:inline-block"
        >
          开始配将 →
        </Link>

        {/* 移动端汉堡按钮(md 以下显示) */}
        <button
          ref={buttonRef}
          type="button"
          aria-label={open ? "关闭菜单" : "打开菜单"}
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line/70 bg-card text-ink-soft transition-colors hover:border-primary/60 hover:text-primary md:hidden"
        >
          {/* 简单的 ☰ / ✕ 切换,避免引入图标库 */}
          <span aria-hidden className="text-lg leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {/* 移动端展开菜单(md 以下;桌面端永远不显示) */}
      {open && (
        <div
          ref={menuRef}
          id="mobile-nav-menu"
          className="border-t border-line/60 bg-card/95 backdrop-blur md:hidden"
        >
          <ul className="grid grid-cols-2 gap-1 px-3 py-3">
            {FEATURES.map((f) => (
              <li key={f.id}>
                <Link
                  href={f.href}
                  className="flex min-h-[2.75rem] items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-bg-cream hover:text-primary"
                >
                  <span className="text-xs text-accent-red">{f.id}</span>
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line/60 px-3 pb-3 pt-2">
            <Link
              href="/sandbox"
              className="flex min-h-[2.75rem] items-center justify-center rounded-md border border-accent-red/60 bg-accent-red/10 px-3 py-2 text-sm font-medium text-accent-red"
            >
              开始配将 →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
