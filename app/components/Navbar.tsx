"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sans, serif } from "../fonts";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/board", label: "Board" },
];

// Sky tokens from app/landing/sky/sky.css, inlined because they're scoped to .sky-page there.
const ink = "text-[#1f2747] dark:text-[#eef0fb]";
const inkSoft = "text-[#454d6e] dark:text-[#c4c8e6]";
const focus = "outline-hidden focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-[#2f4fa8] dark:focus-visible:outline-[#f2c6d4]";

export default function Navbar() {
  const path = usePathname();
  return (
    <header className={[serif.variable, sans.variable, "pointer-events-none sticky top-0 z-50 px-4 pt-3 font-(family-name:--font-sky-sans) sm:px-6"].join(" ")}>
      <nav
        aria-label="Main"
        className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border border-white/90 bg-white/[0.74] py-2 pl-5 pr-2 shadow-[0_1px_2px_rgba(60,70,120,0.05),0_18px_48px_-18px_rgba(90,100,160,0.28)] backdrop-blur-md dark:border-[rgba(160,170,230,0.18)] dark:bg-[rgba(30,36,78,0.72)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_18px_48px_-18px_rgba(0,0,0,0.6)]"
      >
        <Link
          href="/"
          className={["rounded-sm font-(family-name:--font-sky-serif) text-2xl font-medium leading-none tracking-[-0.01em]", ink, focus].join(" ")}
        >
          Imaginar
        </Link>

        <ul className="flex items-center gap-1 text-sm font-medium">
          {LINKS.map(({ href, label }) => {
            const current = path === href || (href !== "/" && path.startsWith(`${href}/`));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={[
                    "block rounded-full px-4 py-2 transition-colors duration-300",
                    current
                      ? "bg-[#2f4fa8] text-white dark:bg-[#c9d4ff] dark:text-[#141a3d]"
                      : [inkSoft, "hover:bg-[#2f4fa8]/10 dark:hover:bg-white/10"].join(" "),
                    focus,
                  ].join(" ")}
                >
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="hidden sm:block">
            <a
              href="https://github.com/Chimbay/daytona-hackathon"
              className={["block rounded-full px-4 py-2 transition-colors duration-300 hover:bg-[#2f4fa8]/10 dark:hover:bg-white/10", inkSoft, focus].join(" ")}
            >
              GitHub
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
