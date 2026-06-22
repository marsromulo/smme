import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Eye,
  FileWarning,
  Filter,
  GraduationCap,
  Landmark,
  Search,
  UploadCloud,
  UsersRound,
  Wrench,
} from "lucide-react";
import { getPlatformSession } from "@/lib/platform/auth";

const summaryCards = [
  {
    icon: ClipboardList,
    value: "12",
    label: "Total Services",
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

const notifications = [
  {
    icon: AlertTriangle,
    title: "Your document for Application for Remedial/Advancement Classes",
    text: "was returned for resubmission.",
    time: "2h ago",
    tone: "red",
  },
  {
    icon: Clock3,
    title: "Senior High School Permit Applications",
    text: "is now under review.",
    time: "1d ago",
    tone: "gold",
  },
  {
    icon: CheckCircle2,
    title: "Government Permit to Operate",
    text: "has been approved.",
    time: "3d ago",
    tone: "green",
  },
  {
    icon: ClipboardList,
    title: "New announcement: Division Memo No. 245, s. 2025",
    text: "",
    time: "3d ago",
    tone: "blue",
  },
];

const timeline = [
  {
    title: "Government Permit to Operate",
    text: "Approved on May 5, 2025",
    status: "Approved",
    tone: "green",
  },
  {
    title: "School Calendar Submission",
    text: "Approved on May 1, 2025",
    status: "Approved",
    tone: "green",
  },
  {
    title: "Senior High School Permit Applications",
    text: "Under review since May 10, 2025",
    status: "Under Review",
    tone: "gold",
  },
  {
    title: "TOSFI Applications",
    text: "In progress since May 8, 2025",
    status: "In Progress",
    tone: "blue",
  },
  {
    title: "Application for Remedial/Advancement Classes",
    text: "Returned on May 7, 2025",
    status: "Returned",
    tone: "red",
  },
];

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");
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
    href: "/platform/applications",
    icon: ClipboardList,
    title: "Application Review Queue",
    text: "Track submitted applications, documents, and evaluator actions.",
  },
];

function AdminDashboard() {
  return (
    <main className="platform-page">
      <section className="platform-admin-hero">
        <div>
          <span className="platform-kicker">Admin workspace</span>
          <h1>Manage schools, services, and application reviews.</h1>
          <p>
            Configure service requirements, approve school registrations, and monitor
            submitted applications across the division.
          </p>
        </div>
        <Link className="platform-btn primary" href="/platform/services">
          <Wrench aria-hidden="true" size={18} />
          Service Maintenance
        </Link>
      </section>

      <section className="platform-stat-grid contact" aria-label="Admin statistics">
        {adminStats.map((stat) => (
          <article className={`platform-stat contact ${stat.tone}`} key={stat.label}>
            <span className="platform-stat-icon">
              <ClipboardList aria-hidden="true" size={30} />
            </span>
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

function SchoolDashboard() {
  return (
    <main className="platform-page platform-contact-dashboard">
      <section className="platform-welcome-banner">
        <div>
          <h1>Welcome back, Maria!</h1>
          <p>Track your school&apos;s applications, document submissions, and approval progress in one place.</p>
        </div>
      </section>

      <section className="platform-stat-grid contact" aria-label="Platform statistics">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className={`platform-stat contact ${card.tone}`} key={card.label}>
              <span className="platform-stat-icon">
                <Icon aria-hidden="true" size={30} />
              </span>
              <div>
                <strong>{card.value}</strong>
                <p>{card.label}</p>
              </div>
              <Link href="/platform/applications">
                {card.action}
                <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="platform-dashboard-grid">
        <article className="platform-section platform-tracker-card">
          <div className="platform-section-head tracker">
            <h2>My Services Tracker</h2>
            <div className="platform-tracker-tools">
              <label className="platform-mini-search">
                <span className="sr-only">Search services</span>
                <input type="search" placeholder="Search services..." />
                <Search aria-hidden="true" size={18} />
              </label>
              <button type="button">
                <Filter aria-hidden="true" size={17} />
                Filter
              </button>
              <Link className="platform-btn primary" href="/platform/applications">
                + New Submission
              </Link>
            </div>
          </div>

          <div className="platform-services-table">
            <div className="platform-services-header">
              <span>Service</span>
              <span>Progress</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <div className="platform-service-row" key={service.title}>
                  <div className="platform-service-name">
                    <span className={`platform-service-icon ${service.tone}`}>
                      <Icon aria-hidden="true" size={22} />
                    </span>
                    <div>
                      <strong>{service.title}</strong>
                      <small>Submitted: {service.submitted}</small>
                    </div>
                  </div>
                  <div className="platform-service-progress">
                    <div>
                      <span style={{ width: `${service.progress}%` }} />
                    </div>
                    <b>{service.progress}%</b>
                  </div>
                  <span className={`platform-pill ${statusClass(service.status)}`}>
                    {service.status === "Approved" ? (
                      <Check aria-hidden="true" size={14} />
                    ) : service.status === "Returned for Resubmission" ? (
                      <AlertTriangle aria-hidden="true" size={14} />
                    ) : (
                      <Clock3 aria-hidden="true" size={14} />
                    )}
                    {service.status}
                  </span>
                  <div className="platform-service-actions">
                    <Link href="/platform/documents/sjh-permit-2026">
                      {service.status === "Returned for Resubmission" ? (
                        <UploadCloud aria-hidden="true" size={16} />
                      ) : (
                        <Eye aria-hidden="true" size={16} />
                      )}
                      {service.status === "Returned for Resubmission" ? "Upload" : "View"}
                    </Link>
                    <button type="button" aria-label={`Open ${service.title} menu`}>
                      <ChevronDown aria-hidden="true" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="platform-pagination">
            <span>Showing 1 to 5 of 12 services</span>
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
              <Link href="/platform/applications">View all</Link>
            </div>
            <div className="platform-notification-list">
              {notifications.map((item) => {
                const Icon = item.icon;

                return (
                  <div className="platform-notification-item" key={item.title}>
                    <span className={item.tone}>
                      <Icon aria-hidden="true" size={17} />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      {item.text ? <p>{item.text}</p> : null}
                    </div>
                    <time>{item.time}</time>
                  </div>
                );
              })}
            </div>
            <Link className="platform-side-link" href="/platform/applications">
              Go to Notifications <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </section>

          <section className="platform-section platform-compact-panel">
            <div className="platform-panel-title">
              <h2>Submission Timeline</h2>
              <Link href="/platform/applications">View all</Link>
            </div>
            <div className="platform-contact-timeline">
              {timeline.map((item) => (
                <div className={item.tone} key={item.title}>
                  <span />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                  <em className={`platform-pill ${statusClass(item.status)}`}>{item.status}</em>
                </div>
              ))}
            </div>
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

  return <SchoolDashboard />;
}
