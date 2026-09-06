"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VocauraLogo } from "@/components/vocaura-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Menu, X } from "lucide-react";

interface AppHeaderProps {
  userEmail?: string;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "Progress" },
  { href: "/mistakes", label: "Mistakes" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({ userEmail }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu whenever navigation occurs
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <VocauraLogo />
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${
                    active
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground font-medium"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          {userEmail && (
            <div className="hidden sm:flex items-center text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border/50">
              {userEmail}
            </div>
          )}
          <div className="hidden md:block">
            <LogoutButton />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/80 bg-background/95 backdrop-blur-md px-6 py-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    active
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {userEmail && (
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {userEmail}
              </span>
              <LogoutButton />
            </div>
          )}
        </div>
      )}
    </header>
  );
}
