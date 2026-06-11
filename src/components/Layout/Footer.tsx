import Link from "next/link";

/**
 * 页脚(响应式):
 *   - 移动端 (< sm):  整列堆叠,信息 + 链接都各占一行
 *   - 桌面端 (>= sm): 左侧说明,右侧横排链接
 *
 * 标题字号也按断点缩放,符合 12px → 14px 渐进。
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line/60 bg-primary text-bg-cream">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-5 text-sm sm:px-4 sm:py-6 md:flex-row md:items-center md:justify-between lg:px-6">
        <div className="flex flex-col gap-1">
          <p className="font-serif text-sm sm:text-base">
            三战配将助手 · 三国志·战略版 配将工具
          </p>
          <p className="text-[11px] text-bg-cream/70 sm:text-xs">
            本站为玩家自制工具,所有游戏数据与图片版权归《三国志·战略版》官方所有。
          </p>
        </div>
        <nav
          aria-label="页脚导航"
          className="flex flex-col gap-2 text-xs text-bg-cream/80 sm:flex-row sm:items-center sm:gap-x-4 sm:gap-y-2 sm:text-xs"
        >
          <Link
            href="/patches"
            className="min-h-[2.5rem] inline-flex items-center hover:text-bg-cream"
          >
            版本特性
          </Link>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[2.5rem] inline-flex items-center hover:text-bg-cream"
          >
            沪ICP备 待填 0000 号
          </a>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <span className="min-h-[2.5rem] inline-flex items-center">
            © {year} Sanzhan Peijiang
          </span>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
