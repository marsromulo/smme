"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardCheck,
  FileBadge,
  Home,
  LayoutDashboard,
  UserCheck,
  Wrench,
} from "lucide-react";
import type { PlatformRole } from "@/lib/platform/auth";

const navItems = [
  { href: "/platform", label: "Dashboard", icon: Home, badge: undefined },
  { href: "/platform/schools", label: "Schools", icon: Building2, badge: undefined, adminOnly: true },
  { href: "/platform/registrations", label: "Registrations", icon: UserCheck, badge: undefined, adminOnly: true },
  { href: "/platform/services", label: "Services", icon: Wrench, badge: undefined, adminOnly: true },
  { href: "/platform/submissions", label: "Submissions", icon: ClipboardCheck, badge: undefined, adminOnly: true },
  { href: "/platform/applications", label: "Applications", icon: BriefcaseBusiness, badge: undefined, schoolOnly: true },
  { href: "/platform/submissions", label: "My Submissions", icon: FileBadge, badge: undefined, schoolOnly: true },
  { href: "/platform/applications", label: "Notifications", icon: Bell, badge: undefined, neverActive: true },
];

export function PlatformWorkspaceShell({
  children,
  email,
  name,
  role,
  userId,
}: Readonly<{
  children: React.ReactNode;
  email: string | null;
  name: string | null;
  role: PlatformRole;
  userId: string | null;
}>) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const [notificationCount, setNotificationCount] = useState<number | null>(null);
  const notificationBadge = (notificationCount ?? 0) > 0 ? String(notificationCount) : undefined;
  const notificationHref = isAdmin ? "/platform/applications" : "/platform";
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }

    if (item.schoolOnly && isAdmin) {
      return false;
    }

    return true;
  });
  const displayName = name ?? (isAdmin ? "Admin User" : "School Contact");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isCurrent = true;

    queueMicrotask(async () => {
      try {
        const response = await fetch("/api/platform/notifications/count");
        const result = (await response.json()) as { count?: number };

        if (isCurrent && response.ok) {
          setNotificationCount(result.count ?? 0);
        }
      } catch {
        if (isCurrent) {
          setNotificationCount(null);
        }
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [pathname, userId]);

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
            const isActive =
              item.neverActive
                ? false
                : item.href === "/platform"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                className={isActive ? "active" : undefined}
                href={item.href}
                key={`${item.label}-${item.href}`}
              >
                <Icon aria-hidden="true" size={19} />
                <span>{item.label}</span>
                {item.badge === "chevron" ? (
                  <ChevronDown className="platform-nav-chevron" aria-hidden="true" size={17} />
                ) : item.label === "Notifications" && notificationBadge ? (
                  <b>{notificationBadge}</b>
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
            <Link className="platform-notification-link" href={notificationHref} aria-label="Notifications">
              <Bell aria-hidden="true" size={22} />
              {notificationBadge ? <span>{notificationBadge}</span> : null}
            </Link>
            <Link className="platform-user" href="/platform/login">
              <span>{initials || (isAdmin ? "AD" : "SC")}</span>
              <strong>{displayName}</strong>
              <small>{isAdmin ? "Administrator" : email ?? "School Contact"}</small>
              <ChevronDown aria-hidden="true" size={16} />
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
