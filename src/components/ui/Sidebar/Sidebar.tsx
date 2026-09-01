"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type SidebarNavItem =
  | { href: string; label: string; icon: React.ReactNode; divider?: never }
  | { divider: true; href?: never; label?: never; icon?: never };

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
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        transition: "background-color 280ms ease, border-color 280ms ease",
      }}
    >
      {logo && (
        <div className="px-4 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          {logo}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {items.map((item, i) => {
            if (item.divider) {
              return (
                <li key={`div-${i}`} style={{ padding: "4px 8px" }}>
                  <div style={{ height: 1, background: "var(--border)" }} />
                </li>
              );
            }
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 overflow-hidden",
                    active ? "font-medium" : ""
                  )}
                  style={{
                    color:      active ? "var(--ink)" : "var(--ink-ghost)",
                    background: active
                      ? "linear-gradient(90deg, var(--accent-soft) 0%, transparent 100%)"
                      : "transparent",
                    border: active
                      ? "1px solid var(--border-accent)"
                      : "1px solid transparent",
                  }}
                >
                  {/* Active left bar */}
                  {active && (
                    <div
                      className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                      style={{
                        background: "linear-gradient(180deg, var(--accent) 0%, var(--accent-hover) 100%)",
                        boxShadow: "0 0 8px var(--accent-glow)",
                      }}
                    />
                  )}

                  {/* Hover bg */}
                  {!active && (
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: "var(--accent-soft)" }}
                    />
                  )}

                  <span
                    className="shrink-0 relative z-10 transition-all duration-200"
                    style={{
                      color:   active ? "var(--accent)" : undefined,
                      filter:  active ? "drop-shadow(0 0 6px var(--accent-glow))" : undefined,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="relative z-10 tracking-[0.01em]">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {footer && (
        <div className="px-2 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          {footer}
        </div>
      )}
    </aside>
  );
}
