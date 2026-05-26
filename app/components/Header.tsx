"use client";

import Link from "next/link";
import { type MouseEvent, useState } from "react";

const navItems = [
  { label: "მთავარი", href: "/" },
  { label: "სერვისები", href: "/#services" },
  { label: "ჩვენ შესახებ", href: "/about" },
  { label: "გალერეა", href: "/gallery" },
  { label: "კონტაქტი", href: "/#contact" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleNavClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    closeMenu();

    if (!href.startsWith("/#") || window.location.pathname !== "/") {
      return;
    }

    event.preventDefault();

    window.setTimeout(() => {
      const target = document.getElementById(href.slice(2));
      if (!target) return;

      const headerHeight =
        document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;

      window.history.pushState(null, "", href.replace("/", ""));
      window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }, 180);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#d5ddd0]/80 bg-[#f7f8f5]/94 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/"
            onClick={closeMenu}
            className="flex min-w-0 items-center gap-3 text-[#151716]"
            aria-label="ფრჩხილის სტუდიის მთავარი გვერდი"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#151716] bg-[#151716] text-[11px] font-black text-white">
              N
            </span>
            <span className="truncate text-sm font-black uppercase">
              NAIL STUDIO
            </span>
          </Link>

          <nav
            className="font-caps hidden items-center gap-5 text-[11px] font-bold uppercase text-[#586256] lg:flex xl:gap-7"
            aria-label="მთავარი ნავიგაცია"
          >
            {navItems.map((item) => (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.href)}
                className="transition-colors hover:text-[#151716]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/#services"
              onClick={(event) => handleNavClick(event, "/#services")}
              className="font-caps hidden border border-[#151716] bg-[#151716] px-4 py-3 text-[10px] font-black uppercase text-white transition-colors hover:bg-[#2f3430] sm:block"
            >
              დაჯავშნა
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="font-caps border border-[#151716] px-3 py-2 text-[10px] font-black uppercase text-[#151716] lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? "დახურვა" : "მენიუ"}
            </button>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${
            menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-[#dfe6d8] py-3">
              <nav
                className="font-caps grid gap-1 text-[12px] font-black uppercase text-[#151716]"
                aria-label="მობილური ნავიგაცია"
              >
                {navItems.map((item) => (
                  <Link
                    key={`${item.label}-${item.href}-mobile`}
                    href={item.href}
                    onClick={(event) => handleNavClick(event, item.href)}
                    className="border-b border-[#dfe6d8] px-1 py-3"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/#services"
                  onClick={(event) => handleNavClick(event, "/#services")}
                  className="mt-2 bg-[#151716] px-4 py-3 text-center text-white"
                >
                  დაჯავშნა
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
