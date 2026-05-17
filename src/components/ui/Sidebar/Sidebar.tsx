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
      className={cn(
        "flex flex-col w-56 h-full bg-surface-elevated border-r border-border shrink-0",
        className
      )}
    >
      {/* Logo area */}
      {logo && (
        <div className="px-4 py-4 border-b border-border shrink-0">{logo}</div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-100",
                    active
                      ? "bg-accent-soft text-accent font-medium"
                      : "text-ink-soft hover:bg-surface-overlay hover:text-ink"
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 transition-colors",
                      active ? "text-accent" : "text-ink-ghost"
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer slot */}
      {footer && (
        <div className="px-2 py-3 border-t border-border shrink-0">{footer}</div>
      )}
    </aside>
  );
}
