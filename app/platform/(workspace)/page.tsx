import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  FileWarning,
  GraduationCap,
  Landmark,
  UsersRound,
  Wrench,
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

const services = [
  {
    icon: Landmark,
    title: "Government Permit to Operate",
    submitted: "May 2, 2025",
    progress: 100,
    status: "Approved",
    tone: "blue",
  },
  {
    icon: CalendarDays,
    title: "School Calendar Submission",
    submitted: "Apr 28, 2025",
    progress: 100,
    status: "Approved",
    tone: "green",
  },
  {
    icon: GraduationCap,
    title: "Senior High School Permit Applications",
    submitted: "May 10, 2025",
    progress: 60,
    status: "Under Review",
    tone: "gold",
  },
  {
    icon: ClipboardList,
    title: "TOSFI Applications",
    submitted: "May 8, 2025",
    progress: 35,
    status: "In Progress",
    tone: "violet",
  },
  {
    icon: UsersRound,
    title: "Application for Remedial/Advancement Classes",
    submitted: "May 6, 2025",
    progress: 20,
    status: "Returned for Resubmission",
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

const adminStats = [
  { label: "Registered schools", value: "24", tone: "blue" },
  { label: "Pending registrations", value: "5", tone: "gold" },
  { label: "Open applications", value: "18", tone: "green" },
  { label: "Returned documents", value: "6", tone: "red" },
];

const adminActions = [
  {
    href: "/platform/registrations",
    icon: Building2,
    title: "Review School Registrations",
    text: "Approve, reject, and monitor school account requests.",
  },
  {
    href: "/platform/services",
    icon: Wrench,
    title: "Maintain Services",
    text: "Create application services and manage required document checklists.",
  },
  {
    href: "/platform/submissions",
    icon: ClipboardList,
    title: "Application Review Queue",
    text: "Track submitted applications, documents, and evaluator actions.",
  },
];

function AdminDashboard() {
  return (
    <main className="platform-page">
      <section className="platform-stat-grid contact admin" aria-label="Admin statistics">
        {adminStats.map((stat) => (
          <article className={`platform-stat contact ${stat.tone}`} key={stat.label}>
            <div>
              <strong>{stat.value}</strong>
              <p>{stat.label}</p>
            </div>
            <Link href={stat.label.includes("registrations") ? "/platform/registrations" : "/platform/applications"}>
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
            <h2>Initial Application Services</h2>
          </div>
          <Link href="/platform/services">Open maintenance</Link>
        </div>
        <div className="platform-admin-service-preview">
          {services.slice(0, 5).map((service) => (
            <div key={service.title}>
              <strong>{service.title}</strong>
              <span>Requirements checklist ready for maintenance</span>
            </div>
          ))}
        </div>
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
    return <AdminDashboard />;
  }

  const notifications = session.userId ? await getSchoolNotifications(session.userId) : [];
  const submissions = await getSubmissionList(session);

  return <SchoolDashboard notifications={notifications} submissions={submissions} />;
}
