import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  FileWarning,
  XCircle,
} from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  formatSubmissionDate,
  formatSubmissionStatus,
  getSubmissionList,
  type SubmissionListItem,
} from "@/app/platform/submissions-data";

const summaryCards = [
  {
    icon: ClipboardList,
    value: "12",
    label: "Applied Service",
    action: "View all services",
    tone: "blue",
  },
  {
    icon: CheckCircle2,
    value: "6",
    label: "Approved Services",
    action: "View approved",
    tone: "green",
  },
  {
    icon: Clock3,
    value: "4",
    label: "Pending Services",
    action: "View pending",
    tone: "gold",
  },
  {
    icon: FileWarning,
    value: "2",
    label: "Documents for Resubmission",
    action: "View resubmissions",
    tone: "red",
  },
];

type SchoolNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  link_href: string | null;
};

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function schoolNotificationTone(type: string) {
  if (type.includes("approved")) {
    return "green";
  }

  if (type.includes("pending")) {
    return "gold";
  }

  if (type.includes("rejected")) {
    return "red";
  }

  return "blue";
}

function SchoolNotificationIcon({ type }: { type: string }) {
  if (type.includes("approved")) {
    return <CheckCircle2 aria-hidden="true" size={17} />;
  }

  if (type.includes("pending")) {
    return <Clock3 aria-hidden="true" size={17} />;
  }

  if (type.includes("rejected")) {
    return <XCircle aria-hidden="true" size={17} />;
  }

  return <ClipboardList aria-hidden="true" size={17} />;
}

async function getSchoolNotifications(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("school_notifications")
    .select("id, type, title, body, created_at, link_href")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    if (error.message.includes("schema cache") && error.message.includes("school_notifications")) {
      return [];
    }

    console.error("Unable to load school notifications:", error.message);
    return [];
  }

  return (data ?? []) as SchoolNotification[];
}

const adminActions = [
  {
    href: "/platform/submissions",
    icon: ClipboardList,
    title: "Submissions",
    text: "Track submitted applications, documents, and evaluator actions.",
  },
  {
    href: "/platform/registrations",
    icon: Building2,
    title: "Registrations",
    text: "Approve, reject, and monitor school account requests.",
  },
  {
    href: "/platform/notifications",
    icon: Bell,
    title: "Notifications",
    text: "Open admin alerts and review platform activity updates.",
  },
];

type AdminServicePreview = {
  applicantCount: number;
  id: string;
  name: string;
  status: string;
};

type AdminStat = {
  href: string;
  label: string;
  tone: string;
  value: string;
};

function exactCount(count: number | null) {
  return String(count ?? 0);
}

async function getAdminStats(): Promise<AdminStat[]> {
  const supabase = createSupabaseAdminClient();
  const [
    registeredSchools,
    pendingRegistrations,
    openApplications,
    unassignedDocuments,
  ] = await Promise.all([
    supabase
      .from("schools")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("school_registration_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "pending"]),
    supabase
      .from("service_applications")
      .select("school_user_id, service_id")
      .in("status", ["new", "in_progress"]),
    supabase
      .from("service_application_files")
      .select("id", { count: "exact", head: true })
      .eq("upload_status", "uploaded")
      .neq("review_status", "invalid")
      .is("service_required_document_id", null),
  ]);

  for (const [label, result] of [
    ["registered schools", registeredSchools],
    ["pending registrations", pendingRegistrations],
    ["open applications", openApplications],
    ["unassigned documents", unassignedDocuments],
  ] as const) {
    if (result.error) {
      console.error(`Unable to load ${label} dashboard count:`, result.error.message);
    }
  }

  return [
    {
      href: "/platform/schools",
      label: "Registered schools",
      value: exactCount(registeredSchools.count),
      tone: "blue",
    },
    {
      href: "/platform/registrations",
      label: "Pending registrations",
      value: exactCount(pendingRegistrations.count),
      tone: "gold",
    },
    {
      href: "/platform/submissions",
      label: "Open applications",
      value: String(
        new Set(
          ((openApplications.data ?? []) as Array<{ school_user_id: string; service_id: string }>).map(
            (application) => `${application.school_user_id}:${application.service_id}`,
          ),
        ).size,
      ),
      tone: "green",
    },
    {
      href: "/platform/submissions",
      label: "Unassigned Documents",
      value: exactCount(unassignedDocuments.count),
      tone: "red",
    },
  ];
}

async function getAdminServicePreview() {
  const supabase = createSupabaseAdminClient();
  const { data: servicesData, error: servicesError } = await supabase
    .from("services")
    .select("id, name, status, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (servicesError) {
    console.error("Unable to load dashboard services:", servicesError.message);
    return [];
  }

  const serviceRows = (servicesData ?? []) as Array<{
    id: string;
    name: string;
    status: string;
  }>;
  const serviceIds = serviceRows.map((service) => service.id);
  const { data: applicationsData, error: applicationsError } = await supabase
    .from("service_applications")
    .select("service_id, school_user_id")
    .in("service_id", serviceIds.length > 0 ? serviceIds : ["00000000-0000-0000-0000-000000000000"]);

  if (applicationsError) {
    console.error("Unable to load dashboard service applicants:", applicationsError.message);
  }

  const applicantsByServiceId = new Map<string, Set<string>>();

  for (const application of (applicationsData ?? []) as Array<{ school_user_id: string; service_id: string }>) {
    const applicants = applicantsByServiceId.get(application.service_id) ?? new Set<string>();
    applicants.add(application.school_user_id);
    applicantsByServiceId.set(application.service_id, applicants);
  }

  return serviceRows.map((service) => ({
    applicantCount: applicantsByServiceId.get(service.id)?.size ?? 0,
    id: service.id,
    name: service.name,
    status: service.status,
  }));
}

function AdminDashboard({
  stats,
  services,
}: {
  stats: AdminStat[];
  services: AdminServicePreview[];
}) {
  return (
    <main className="platform-page">
      <section className="platform-stat-grid contact admin" aria-label="Admin statistics">
        {stats.map((stat) => (
          <article className={`platform-stat contact ${stat.tone}`} key={stat.label}>
            <div>
              <strong>{stat.value}</strong>
              <p>{stat.label}</p>
            </div>
            <Link href={stat.href}>
              View records
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </article>
        ))}
      </section>

      <section className="platform-admin-action-grid">
        {adminActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link className="platform-admin-action-card" href={action.href} key={action.title}>
              <span>
                <Icon aria-hidden="true" size={25} />
              </span>
              <div>
                <strong>{action.title}</strong>
                <p>{action.text}</p>
              </div>
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          );
        })}
      </section>

      <section className="platform-section">
        <div className="platform-section-head">
          <div>
            <span className="platform-kicker">Service setup</span>
            <h2>SMME Services</h2>
          </div>
        </div>
        {services.length === 0 ? (
          <p className="platform-empty-state">No configured services yet.</p>
        ) : (
          <div className="platform-admin-service-preview">
            {services.map((service) => (
              <div key={service.id}>
                <p>
                  <strong>{service.name}</strong>
                  <em>
                    {service.applicantCount} applicant{service.applicantCount === 1 ? "" : "s"}
                  </em>
                </p>
                <span>{service.status === "active" ? "Active service" : "Inactive service"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SchoolDashboard({
  notifications,
  submissions,
}: {
  notifications: SchoolNotification[];
  submissions: SubmissionListItem[];
}) {
  return (
    <main className="platform-page platform-contact-dashboard">
      <section className="platform-stat-grid contact no-icons" aria-label="Platform statistics">
        {summaryCards.map((card) => (
          <article className={`platform-stat contact ${card.tone}`} key={card.label}>
            <div>
              <strong>{card.value}</strong>
              <p>{card.label}</p>
            </div>
            <Link href="/platform/applications">
              {card.action}
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </article>
        ))}
      </section>

      <section className="platform-dashboard-grid">
        <article className="platform-section platform-tracker-card">
          <div className="platform-section-head tracker">
            <h2>Recent Submission</h2>
          </div>

          <div className="platform-services-table">
            <div className="platform-services-header">
              <span>Service</span>
              <span>Files</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {submissions.length === 0 ? (
              <p className="platform-empty-state">No recent submissions yet.</p>
            ) : (
              submissions.slice(0, 5).map((submission) => (
                <div className="platform-service-row" key={submission.id}>
                  <div className="platform-service-name">
                    <span className="platform-service-icon blue">
                      <ClipboardList aria-hidden="true" size={22} />
                    </span>
                    <div>
                      <strong>{submission.serviceName}</strong>
                      <small>Last submitted: {formatSubmissionDate(submission.submittedAt)}</small>
                    </div>
                  </div>
                  <span>
                    {submission.fileCount}
                  </span>
                  <span className={`platform-pill ${statusClass(formatSubmissionStatus(submission.status))}`}>
                    {submission.status === "approved" ? (
                      <Check aria-hidden="true" size={14} />
                    ) : submission.status === "rejected" ? (
                      <AlertTriangle aria-hidden="true" size={14} />
                    ) : (
                      <Clock3 aria-hidden="true" size={14} />
                    )}
                    {formatSubmissionStatus(submission.status)}
                  </span>
                  <div className="platform-service-actions">
                    <Link href={`/platform/submissions/${submission.id}`}>
                      <Eye aria-hidden="true" size={16} />
                      View
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="platform-pagination">
            <span>
              Showing {Math.min(submissions.length, 5)} of {submissions.length} submissions
            </span>
            <div>
              <button type="button">‹</button>
              <button className="active" type="button">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">›</button>
            </div>
          </div>
        </article>

        <aside className="platform-dashboard-side">
          <section className="platform-section platform-compact-panel">
            <div className="platform-panel-title">
              <h2>Recent Notifications</h2>
              <Link href="/platform/notifications">View all</Link>
            </div>
            <div className="platform-notification-list">
              {notifications.length === 0 ? (
                <p className="platform-empty-state">No recent notifications.</p>
              ) : (
                notifications.map((item) => (
                  <a
                    className="platform-notification-item"
                    href={`/api/platform/notifications/${item.id}/open`}
                    key={item.id}
                  >
                    <span className={schoolNotificationTone(item.type)}>
                      <SchoolNotificationIcon type={item.type} />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </div>
                    <time>{formatNotificationDate(item.created_at)}</time>
                  </a>
                ))
              )}
            </div>
            <Link className="platform-side-link" href="/platform/notifications">
              Go to Notifications <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}

export default async function PlatformDashboardPage() {
  const session = await getPlatformSession();

  if (session.role === "admin") {
    const [stats, services] = await Promise.all([getAdminStats(), getAdminServicePreview()]);
    return <AdminDashboard stats={stats} services={services} />;
  }

  const notifications = session.userId ? await getSchoolNotifications(session.userId) : [];
  const submissions = await getSubmissionList(session);

  return <SchoolDashboard notifications={notifications} submissions={submissions} />;
}
