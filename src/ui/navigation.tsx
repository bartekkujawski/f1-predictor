"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavigationLink = { href: string; label: string };

// A section owns every path below its own, e.g. a Round page belongs to the Calendar.
// Home ("/") would own every path, so it is current only on itself.
const isCurrent = (href: string, pathname: string | null): boolean =>
  href === "/" ? pathname === "/" : pathname === href || (pathname?.startsWith(`${href}/`) ?? false);

// The links themselves, with the current section marked for screen readers and for styling.
const NavigationLinks = ({
  links,
  listClassName,
  itemClassName,
  linkClassName,
}: {
  links: NavigationLink[];
  listClassName: string;
  itemClassName?: string;
  linkClassName: string;
}) => {
  const pathname = usePathname();
  return (
    <ul className={listClassName}>
      {links.map(({ href, label }) => (
        <li key={href} className={itemClassName}>
          <Link href={href} aria-current={isCurrent(href, pathname) ? "page" : undefined} className={linkClassName}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
};

// Fixed to the bottom of a narrow screen, within reach of a thumb. Hidden on wide screens,
// where HeaderNavigation shows the same links.
export const BottomNavigation = ({ links }: { links: NavigationLink[] }) => (
  <nav aria-label="Main" className="fixed inset-x-0 bottom-0 border-t border-border bg-surface md:hidden">
    <NavigationLinks
      links={links}
      listClassName="mx-auto flex max-w-160"
      itemClassName="flex-1"
      linkClassName="block border-t-2 border-transparent py-3 text-center text-sm text-text-muted hover:no-underline aria-[current=page]:border-accent aria-[current=page]:font-semibold aria-[current=page]:text-text"
    />
  </nav>
);

export const HeaderNavigation = ({ links }: { links: NavigationLink[] }) => (
  <nav aria-label="Main" className="hidden md:block">
    <NavigationLinks
      links={links}
      listClassName="flex gap-6"
      linkClassName="border-b-2 border-transparent py-1 text-text-muted hover:text-text hover:no-underline aria-[current=page]:border-accent aria-[current=page]:font-semibold aria-[current=page]:text-text"
    />
  </nav>
);
