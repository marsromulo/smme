"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  CircleUserRound,
  FileBadge,
  Home,
  LayoutDashboard,
} from "lucide-react";

type PlatformRole = "admin" | "school";

function getStoredRole(): PlatformRole {
  if (typeof window === "undefined") {
    return "school";
  }

  return window.localStorage.getItem("smme-platform-role") === "admin" ? "admin" : "school";
}

function subscribeToRole(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

const navItems = [
  { href: "/platform", label: "Dashboard", icon: Home, badge: undefined },
  { href: "/platform/schools", label: "Schools", icon: Building2, badge: undefined, adminOnly: true },
  { href: "/platform/applications", label: "Services", icon: BriefcaseBusiness, badge: "chevron" },
  { href: "/platform/documents/sjh-permit-2026", label: "Submissions", icon: FileBadge, badge: "chevron" },
  { href: "/platform/applications", label: "Notifications", icon: Bell, badge: "4" },
  { href: "/platform/schools/saint-joseph-high-school", label: "Profile", icon: CircleUserRound, badge: "chevron" },
];

export default function PlatformWorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = useSyncExternalStore(subscribeToRole, getStoredRole, () => "school");
  const isAdmin = role === "admin";
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar" aria-label="Platform navigation">
        <Link className="platform-brand" href="/platform">
          <Image
            src="/assets/logos/sdobc-smme-logo.png"
            alt="SMME logo"
            width={68}
            height={68}
            priority
          />
          <span>
            <small>Schools Division of</small>
            <strong>Baguio City</strong>
            <b>SMME Platform</b>
          </span>
        </Link>
        <span className="platform-sidebar-rule" aria-hidden="true" />
        <nav className="platform-nav">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link href={item.href} key={`${item.label}-${item.href}`}>
                <Icon aria-hidden="true" size={19} />
                <span>{item.label}</span>
                {item.badge === "chevron" ? (
                  <ChevronDown className="platform-nav-chevron" aria-hidden="true" size={17} />
                ) : item.badge ? (
                  <b>{item.badge}</b>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="platform-sidebar-card">
          <strong>Tayo ang Baguio</strong>
          <p>Integrity · Excellence · Service</p>
        </div>
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div className="platform-title-lockup">
            <span>
              <LayoutDashboard aria-hidden="true" size={21} />
            </span>
            <strong>{isAdmin ? "Admin Dashboard" : "School Contact Dashboard"}</strong>
          </div>
          <div className="platform-topbar-actions">
            <Link
              className="platform-school-switcher"
              href={isAdmin ? "/platform/schools" : "/platform/schools/saint-joseph-high-school"}
            >
              <span className="platform-school-logo">
                <Image
                  src="/assets/logos/sdobc-smme-logo.png"
                  alt=""
                  width={42}
                  height={42}
                />
              </span>
              <span>
                <strong>{isAdmin ? "Schools Division Admin" : "Baguio City National High School"}</strong>
                <small>{isAdmin ? "Administrator Access" : "School ID: 300123"}</small>
              </span>
              <ChevronDown aria-hidden="true" size={16} />
            </Link>
            <Link className="platform-notification-link" href="/platform/applications" aria-label="Notifications">
              <Bell aria-hidden="true" size={22} />
              <span>4</span>
            </Link>
            <Link className="platform-user" href="/platform/login">
              <span>{isAdmin ? "AD" : "MS"}</span>
              <strong>{isAdmin ? "Admin User" : "Maria Santos"}</strong>
              <small>{isAdmin ? "Administrator" : "School Contact"}</small>
              <ChevronDown aria-hidden="true" size={16} />
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
