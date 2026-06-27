"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services & Applications" },
  { href: "/documents", label: "Issuances & Documents" },
  { href: "/news", label: "News & Updates" },
  { href: "/contact", label: "Contact Us" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>Department of Education - Cordillera Administrative Region</span>
          <nav aria-label="Agency links">
            <a href="#">DepEd PH</a>
            <a href="#">DepEd CAR</a>
            <Link href="/contact">Contact Us</Link>
          </nav>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" onClick={() => setIsOpen(false)}>
            <Image
              src="/assets/logos/sdobc-smme-logo-cutout.png"
              alt="SMME logo"
              width={118}
              height={118}
              priority
            />
            <span>
              <strong>Schools Division of Baguio City</strong>
              <small>
                School Governance and Operations Division
                <br />
                School Management, Monitoring, and Evaluation Unit
              </small>
            </span>
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-label="Open menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
          >
            <span className="menu-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <nav className={`main-nav ${isOpen ? "open" : ""}`} aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className={pathname === item.href ? "active" : undefined}
                href={item.href}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <button className="search-btn" type="button" aria-label="Search">
              <Image src="/assets/icons/search.svg" alt="" width={28} height={28} />
            </button>
          </nav>
        </div>
      </header>
    </>
  );
}
