import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { useBootstrap } from "@/store/bootstrap";
import { cx } from "@/lib/format";

/**
 * ADMIN SHELL
 *
 * The panel now uses the same design system as the public site (paper, hairline
 * rules, one accent) instead of a second, unrelated visual language. The
 * sidebar is grouped by task so nothing is buried, and on mobile it becomes a
 * real drawer rather than a squeezed column.
 */

const GROUPS: Array<{
  title: string;
  items: Array<{ to: string; label: string; end?: boolean; hint?: string }>;
}> = [
  {
    title: "محتوا",
    items: [
      { to: "/admin-panel", label: "داشبورد", end: true },
      { to: "/admin-panel/artworks", label: "آثار" },
      { to: "/admin-panel/pages", label: "صفحه‌ساز" },
      { to: "/admin-panel/media", label: "کتابخانه‌ی رسانه" },
      { to: "/admin-panel/messages", label: "پیام‌ها" },
    ],
  },
  {
    title: "برند و ساختار",
    items: [
      { to: "/admin-panel/branding", label: "برند و تنطیمات سایت" },
      { to: "/admin-panel/navigation", label: "منوها و شبکه‌ها" },
      {
        to: "/admin-panel/themes",
        label: "تنطیم طراحی",
        hint: "فقط مدیر",
      },
    ],
  },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { site } = useBootstrap();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // The drawer must never survive a navigation.
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="space-y-8" aria-label="منوی مدیریت">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="eyebrow">{group.title}</p>
          <ul className="mt-3 space-y-1">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      "flex items-center justify-between gap-2 px-3 py-2 text-[0.9rem] transition-colors duration-fast",
                      isActive
                        ? "bg-surface2 text-ink"
                        : "text-muted hover:text-ink",
                    )
                  }
                >
                  <span>{item.label}</span>
                  {item.hint ? (
                    <span className="t-caption">{item.hint}</span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-bg text-ink lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden border-e border-line bg-surface p-7 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <Link to="/" className="font-display text-lg">
          {site?.site_name || "پنل مدیریت"}
        </Link>
        <p className="t-caption mt-1">مدیریت محتوا</p>
        <div className="mt-9">{nav}</div>
        <div className="hairline mt-10 pt-6">
          <p className="t-caption">{user?.username}</p>
          <button
            type="button"
            className="t-caption mt-3 text-accent"
            onClick={() => void logout()}
          >
            <span className="link-u">خروج از حساب</span>
          </button>
        </div>
      </aside>

      {/* Drawer (mobile) */}
      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="منوی مدیریت"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay)]"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 w-[min(84vw,320px)] overflow-y-auto bg-surface p-7">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg">
                {site?.site_name || "پنل مدیریت"}
              </span>
              <button
                type="button"
                className="h-11 w-11 text-2xl leading-none"
                onClick={() => setOpen(false)}
                aria-label="بستن منو"
              >
                ×
              </button>
            </div>
            <div className="mt-8">{nav}</div>
            <button
              type="button"
              className="t-caption mt-10 text-accent"
              onClick={() => void logout()}
            >
              <span className="link-u">خروج از حساب</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-bg/90 px-5 py-3 backdrop-blur-[10px] lg:px-9">
          <button
            type="button"
            className="t-caption h-11 px-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="باز کردن منوی مدیریت"
          >
            ≡ منو
          </button>
          <Link to="/" className="t-caption ms-auto" target="_blank">
            <span className="link-u">مشاهده‌ی سایت ↗</span>
          </Link>
        </div>
        <main className="flex-1 px-5 py-8 lg:px-9 lg:py-12">{children}</main>
      </div>
    </div>
  );
}

/** Page header used by every admin screen so titles never drift. */
export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="t-h2">{title}</h1>
        {subtitle ? (
          <p className="t-small mt-2 text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** A titled block — the only container shape used inside the panel. */
export function AdminPanel({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="card mb-8 p-6 lg:p-8">
      {title ? (
        <header className="mb-6">
          <h2 className="t-h3">{title}</h2>
          {description ? (
            <p className="t-small mt-2 text-muted">{description}</p>
          ) : null}
        </header>
      ) : null}
      {children}
      {footer ? <div className="hairline mt-7 pt-5">{footer}</div> : null}
    </section>
  );
}
