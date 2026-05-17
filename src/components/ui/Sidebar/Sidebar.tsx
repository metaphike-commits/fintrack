"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarProps {
  items: SidebarNavItem[];
  logo?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({ items, logo, footer, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn("flex flex-col w-56 h-full shrink-0", className)}
      style={{
        background: "rgba(3,3,12,0.98)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo area */}
      {logo && (
        <div
          className="px-4 py-4 shrink-0"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {logo}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 overflow-hidden",
                    active
                      ? "text-white font-medium"
                      : "text-ink-ghost hover:text-ink-soft"
                  )}
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(90deg, rgba(139,92,246,0.16) 0%, rgba(139,92,246,0.04) 100%)",
                          border: "1px solid rgba(139,92,246,0.20)",
                        }
                      : {
                          border: "1px solid transparent",
                        }
                  }
                >
                  {/* Active left bar */}
                  {active && (
                    <div
                      className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                      style={{
                        background:
                          "linear-gradient(180deg, #8b5cf6, #7c3aed)",
                        boxShadow: "0 0 8px rgba(139,92,246,0.6)",
                      }}
                    />
                  )}

                  {/* Hover background */}
                  {!active && (
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    />
                  )}

                  <span
                    className="shrink-0 relative z-10 transition-all duration-200"
                    style={{
                      color: active ? "#8b5cf6" : undefined,
                      filter: active
                        ? "drop-shadow(0 0 6px rgba(139,92,246,0.6))"
                        : undefined,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="relative z-10 tracking-[0.01em]">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer slot */}
      {footer && (
        <div
          className="px-2 py-3 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {footer}
        </div>
      )}
    </aside>
  );
}
